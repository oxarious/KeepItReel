import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { cacheKey, freshState, hydrate, normalizeCreator, normalizeProtectionDomain, safeUrl, type State, type Platform } from '../lib/model';
import type { Action } from '../lib/store';
import { accessOrigins, syncProtectionScripts } from '../lib/protection-access';
import { sanitizeFeedbackContext } from '../lib/feedback';
import { blockCreator, undoCreator, clearCreatorUndos, type CreatorUndos } from '../lib/creator-undo';
import { receiveToolbar, toolbarSummary, clearToolbar, refreshToolbar } from '../lib/toolbar-background';

export default defineBackground(() => {
  let queue: Promise<unknown> = Promise.resolve();
  const readUndos = async (): Promise<CreatorUndos> => {
    const value = (await browser.storage.session.get('creatorUndo')).creatorUndo;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as CreatorUndos : {};
  };
  browser.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== browser.runtime.id || message?.namespace !== 'clearfeed') return;
    const next = queue.then(async () => {
      if (message.type === 'toolbarReport') {
        const state = hydrate((await browser.storage.local.get('state')).state as Partial<State>);
        return receiveToolbar(message, sender, state);
      }
      if (message.type === 'toolbarGet') {
        if (!sender.url?.startsWith(browser.runtime.getURL('/')) || !Number.isInteger(message.tabId)) return;
        return toolbarSummary(message.tabId);
      }
      if (message.type === 'feedbackDraft') {
        const token = crypto.randomUUID();
        const key = `feedbackDraft:${token}`;
        const pending = Object.entries(await browser.storage.session.get(null)).filter(([k]) => k.startsWith('feedbackDraft:'));
        const expired = pending.sort((a, b) => Number((a[1] as { createdAt?: number })?.createdAt || 0) - Number((b[1] as { createdAt?: number })?.createdAt || 0)).slice(0, Math.max(0, pending.length - 19)).map(([k]) => k);
        if (expired.length) await browser.storage.session.remove(expired);
        await browser.storage.session.set({ [key]: { ...sanitizeFeedbackContext(message.context), createdAt: Date.now() } });
        try { await browser.tabs.create({ url: browser.runtime.getURL('/options.html') + `?feedback=${token}#beta` }); }
        catch (error) { await browser.storage.session.remove(key); throw error; }
        return { opened: true };
      }
      if (message.type === 'protectionAccess') {
        const allowed: Record<string, boolean> = {};
        for (const key of ['websites', 'email'] as const) allowed[key] = await browser.permissions.contains({ origins: accessOrigins[key] });
        return allowed;
      }
      if (message.type === 'openProtection') {
        await browser.tabs.create({ url: browser.runtime.getURL('/options.html') + '#protection' });
        return { opened: true };
      }
      if (message.type === 'draft') {
        const text = typeof message.text === 'string' ? message.text.slice(0, 30000) : '';
        await browser.storage.session.set({ scanDraft: { text } });
        return { saved: true };
      }
      let state = hydrate((await browser.storage.local.get('state')).state as Partial<State> | undefined);
      const a = message as Action;
      switch (a.type) {
        case 'get': return state;
        case 'settings': {
          const p = a.patch;
          for (const key of ['enabled', 'filterLabels', 'spamChecks', 'hideSuspicious', 'autoSkip', 'historyEnabled', 'showPageButton'] as const) if (typeof p[key] === 'boolean') state.settings[key] = p[key]!;
          if (['cover', 'collapse', 'label'].includes(p.mode!)) state.settings.mode = p.mode!;
          if (['system', 'light', 'dark'].includes(p.theme!)) state.settings.theme = p.theme!;
          for (const key of ['youtube', 'tiktok', 'google'] as const) if (typeof p.platforms?.[key] === 'boolean') state.settings.platforms[key] = p.platforms[key];
          if (p.protection) {
            for (const key of ['websites', 'links', 'email'] as const) if (typeof p.protection[key] === 'boolean') state.settings.protection[key] = p.protection[key];
            if (Array.isArray(p.protection.excludedDomains)) state.settings.protection.excludedDomains = [...new Set(p.protection.excludedDomains.slice(0, 300).map(normalizeProtectionDomain))];
          }
          if (!state.settings.historyEnabled) state.history = [];
          break;
        }
        case 'sitePause': {
          if (typeof a.host !== 'string' || typeof a.paused !== 'boolean') throw new Error('Invalid site preference.');
          const host = normalizeProtectionDomain(a.host);
          // Operate on the current saved list, rather than overwriting a stale tab's copy.
          const domains = state.settings.protection.excludedDomains;
          if (a.paused && !domains.includes(host)) {
            if (domains.length >= 300) throw new Error('Your excluded-site list has reached 300 entries.');
            domains.push(host);
          } else if (!a.paused) state.settings.protection.excludedDomains = domains.filter(d => d !== host);
          break;
        }
        case 'creatorBlock': {
          const records = blockCreator(state, await readUndos(), a);
          await browser.storage.session.set({ creatorUndo: records });
          break;
        }
        case 'undoCreator': {
          const records = undoCreator(state, await readUndos(), a.token);
          await browser.storage.session.set({ creatorUndo: records });
          break;
        }
        case 'rule': {
          if (!['youtube', 'tiktok', 'google'].includes(a.rule.platform) || !['block', 'allow'].includes(a.rule.action)) throw new Error('Invalid rule.');
          const key = normalizeCreator(a.rule.platform, a.rule.key);
          state.rules = state.rules.filter(r => !(r.platform === a.rule.platform && r.key === key));
          if (state.rules.length >= 1000) throw new Error('Your list has reached 1,000 entries.');
          state.rules.push({ ...a.rule, key, name: String(a.rule.name).slice(0, 120) });
          await browser.storage.session.set({ creatorUndo: clearCreatorUndos(await readUndos(), a.rule.platform, key) });
          break;
        }
        case 'removeRule': {
          state.rules = state.rules.filter(r => r.platform !== a.platform || r.key !== a.key);
          await browser.storage.session.set({ creatorUndo: clearCreatorUndos(await readUndos(), a.platform, a.key) });
          break;
        }
        case 'record': {
          const i = a.item;
          if (!i || !['youtube', 'tiktok', 'google'].includes(i.platform) || !safeUrl(i.url) || !i.id || i.id.length > 2048) return state;
          const key = cacheKey(i);
          const existing = state.history.find(h => cacheKey(h) === key);
          if (i.evidence?.source === 'platform' && typeof i.evidence.label === 'string') state.evidence[key] = { source: 'platform', label: i.evidence.label.slice(0, 180), observedAt: Date.now() };
          if (!existing || Date.now() - existing.time > 86400000) {
            state.totalFiltered++;
            if (state.settings.historyEnabled) {
              const creator = i.creator ? normalizeCreator(i.platform as Platform, i.creator) : undefined;
              state.history = [{ ...i, creator, title: String(i.title).slice(0, 250), url: i.url.slice(0, 2048), reason: String(a.reason).slice(0, 250), time: Date.now() }, ...state.history.filter(h => cacheKey(h) !== key)].slice(0, 100);
            }
          }
          state.evidence = Object.fromEntries(Object.entries(state.evidence).filter(([, e]) => Date.now() - e.observedAt < 30 * 86400000).sort((a,b) => b[1].observedAt - a[1].observedAt).slice(0, 500));
          break;
        }
        case 'clearHistory': state.history = []; state.totalFiltered = 0; break;
        case 'forgetEvidence': state.evidence = {}; break;
        case 'reset': {
          state = freshState();
          const drafts = Object.keys(await browser.storage.session.get(null)).filter(k => k.startsWith('feedbackDraft:'));
          await browser.storage.session.remove(['scanDraft', 'feedbackDraft', 'creatorUndo', ...drafts]); break;
        }
        default: throw new Error('Unknown action.');
      }
      await browser.storage.local.set({ state });
      if (a.type === 'reset' || a.type === 'sitePause' || (a.type === 'settings' && (a.patch.protection || a.patch.platforms || typeof a.patch.enabled === 'boolean' || typeof a.patch.spamChecks === 'boolean'))) {
        await clearToolbar(); await refreshToolbar();
      }
      // Appearance and feed-display changes do not change site access or scanner registration.
      if (a.type === 'reset' || (a.type === 'settings' && (a.patch.protection || typeof a.patch.enabled === 'boolean'))) await syncProtectionScripts(state.settings.protection, state.settings.enabled);
      return state;
    });
    queue = next.catch(() => undefined);
    return next.catch((e: Error) => ({ error: e.message }));
  });
  const refreshAccess = () => {
    queue = queue.then(async () => {
      const state = hydrate((await browser.storage.local.get('state')).state as State);
      await clearToolbar();
      await syncProtectionScripts(state.settings.protection, state.settings.enabled);
      const tabs = await browser.tabs.query({});
      await Promise.allSettled(tabs.filter(t => t.id !== undefined).map(t => browser.tabs.sendMessage(t.id!, { namespace: 'clearfeed', type: 'accessChanged' })));
      await refreshToolbar();
    }).catch(() => undefined);
  };
  browser.permissions.onAdded.addListener(refreshAccess);
  browser.permissions.onRemoved.addListener(refreshAccess);
  browser.tabs.onRemoved.addListener(tabId => { queue = queue.then(() => clearToolbar(tabId)).catch(() => undefined); });
  browser.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status === 'loading' || change.url) queue = queue.then(() => clearToolbar(tabId)).catch(() => undefined);
    if (change.status === 'complete' || change.url) queue = queue.then(() => refreshToolbar(tabId)).catch(() => undefined);
  });
  browser.runtime.onStartup.addListener(() => { queue = queue.then(async () => { await clearToolbar(); await refreshToolbar(); }).catch(() => undefined); });
  browser.runtime.onStartup.addListener(refreshAccess);
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install' || reason === 'update') {
      const state = hydrate((await browser.storage.local.get('state')).state as State);
      await browser.storage.local.set({ state });
      if (reason === 'install') await browser.tabs.create({ url: browser.runtime.getURL('/options.html') + '#welcome' });
    }
    refreshAccess();
    queue = queue.then(async () => { await clearToolbar(); await refreshToolbar(); }).catch(() => undefined);
  });
});
