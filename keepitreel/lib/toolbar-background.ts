import { browser, type Browser } from 'wxt/browser';
import { mergeWarnings, sanitizeWarningCodes, type ToolbarSummary } from './toolbar-warnings';
import type { State } from './model';
import { excludedHost, mailHosts } from './protection-config';

interface Entry { documentId?: string; feed?: ToolbarSummary; protection?: ToolbarSummary; }
type Records = Record<string, Entry>;
const storageKey = 'toolbarWarnings';
const empty: ToolbarSummary = { codes: [], checked: false };
async function read(): Promise<Records> { return (await browser.storage.session.get(storageKey))[storageKey] as Records || {}; }
async function paint(tabId: number, summary: ToolbarSummary) {
  const red = summary.codes.some(c => c === 'secret' || c === 'prize');
  await Promise.all([
    browser.action.setBadgeText({ tabId, text: summary.codes.length ? String(summary.codes.length) : '' }),
    browser.action.setBadgeBackgroundColor({ tabId, color: red ? '#A33232' : '#E5B844' }),
    browser.action.setBadgeTextColor({ tabId, color: red ? '#FFFFFF' : '#172C21' }),
    browser.action.setTitle({ tabId, title: summary.codes.length ? `KeepItReel · ${summary.codes.length} warning type${summary.codes.length === 1 ? '' : 's'} on this tab` : 'KeepItReel' }),
  ]);
}
export async function receiveToolbar(message: any, sender: Browser.runtime.MessageSender, state: State) {
  const tabId = sender.tab?.id;
  if (tabId === undefined || sender.frameId !== 0 || !sender.url || !['feed', 'protection'].includes(message.source)) return;
  if (sender.documentLifecycle && sender.documentLifecycle !== 'active') return;
  const url = new URL(sender.url);
  if (!/^https?:$/.test(url.protocol) || excludedHost(url.hostname)) return;
  const tab = await browser.tabs.get(tabId);
  if (tab.url && tab.url !== sender.url) return; // A report from the previous navigation.
  const platform = /^(www\.)?youtube\.com$/.test(url.hostname) ? 'youtube' : /^(www\.)?tiktok\.com$/.test(url.hostname) ? 'tiktok' : 'google';
  const enabled = state.settings.enabled && (message.source === 'feed' ? state.settings.platforms[platform] : (mailHosts.includes(url.hostname) ? state.settings.protection.email : state.settings.protection.websites));
  const records = await read();
  const old = records[tabId];
  const entry: Entry = old && old.documentId === sender.documentId ? old : { documentId: sender.documentId };
  entry[message.source as 'feed' | 'protection'] = enabled ? { codes: sanitizeWarningCodes(message.summary?.codes), checked: message.summary?.checked === true } : empty;
  records[tabId] = entry;
  await browser.storage.session.set({ [storageKey]: records });
  await paint(tabId, mergeWarnings(entry.feed, entry.protection));
  return { saved: true };
}
export async function toolbarSummary(tabId: number): Promise<ToolbarSummary> {
  const entry = (await read())[tabId]; return mergeWarnings(entry?.feed, entry?.protection);
}
export async function clearToolbar(tabId?: number) {
  const records = await read();
  if (tabId !== undefined) {
    delete records[tabId]; await browser.storage.session.set({ [storageKey]: records });
    await paint(tabId, empty).catch(() => {});
  } else {
    await browser.storage.session.remove(storageKey);
    const tabs = await browser.tabs.query({});
    await Promise.allSettled(tabs.filter(t => t.id !== undefined).map(t => paint(t.id!, empty)));
  }
}
export async function refreshToolbar(tabId?: number) {
  const tabs = tabId === undefined ? await browser.tabs.query({}) : [{ id: tabId }];
  await Promise.allSettled(tabs.filter(t => t.id !== undefined).map(t => browser.tabs.sendMessage(t.id!, { namespace: 'clearfeed', type: 'toolbarRefresh' }, { frameId: 0 })));
}
