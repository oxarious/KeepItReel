import { collectors, platformFor, type FeedItem } from './adapters';
import { cacheKey, decision, freshState, type State, type Platform, type PostFlag } from './model';
import { PostFlagger } from './post-flags';
import { dispatch, readState, subscribe } from './store';
import { applyTheme, darkMediaQuery, shadowThemeCss } from './theme';
import { loadUiFont } from './ui-font';
import { createReportMark } from './report-mark';
import { emailIndicatorCss, mountEmailIndicator } from './email-indicator';
import { videoIndicator } from './video-indicator';
import { toolbarReporter } from './toolbar-reporter';
import { expiryFor, expiryLabel, nextRuleExpiry, ruleDurations, ruleIsActive, type RuleDuration } from './filter-rules';

const pageCss = `
[data-cf-filter="cover"] > :not(clearfeed-panel){visibility:hidden!important;pointer-events:none!important}
[data-cf-filter="collapse"] > :not(clearfeed-panel){display:none!important}
[data-cf-filter="collapse"]{min-height:0!important;height:auto!important;max-height:none!important;display:block!important}
clearfeed-panel{display:block!important;visibility:visible!important;pointer-events:auto!important;z-index:20!important}
`;
const shadowCss = `
:host{font:small/1.5 "KeepItReel Atkinson",system-ui,sans-serif!important;font-size-adjust:from-font;color:#243b36!important;box-sizing:border-box!important}
*{box-sizing:border-box}button{font:inherit;cursor:pointer;border:1px solid #c8d7cd;border-radius:7px;background:#fff;color:#23473b;padding:6px 10px;line-height:1.35}button:hover{background:#e5efe7}button:focus-visible{outline:3px solid #d5a641;outline-offset:3px}
.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 0}.bar button{font-size:0.84615em;background:#f4f7f1}.bar .creator-button{display:inline-flex;align-items:center;justify-content:center;width:44px;min-width:44px;height:52px;padding:5px;border-radius:12px;background:#fffef9;box-shadow:0 2px 10px #102c2818}.creator-button svg{display:block;width:30px;height:40px;pointer-events:none}.panel{padding:20px;background:#f3f5ef;border:1px solid #d5dfd2;border-radius:12px;text-align:left;max-width:560px;width:100%;box-shadow:0 4px 20px #0a29100a}.brand{font-size:0.76923em;letter-spacing:.16em;text-transform:uppercase;color:#547362;font-weight:700}.reason{font-size:1.15385em;font-weight:650;margin:9px 0 4px}.detail{font-size:0.92308em;color:#5a6d61;margin:0 0 14px}.actions{display:flex;gap:8px;flex-wrap:wrap}.primary{background:#214e3b;color:#fff;border-color:#214e3b}.primary:hover{background:#31624d}.notice{font-size:0.84615em;color:#6b5741;margin-top:10px}.undo-toast{width:min(360px,calc(100vw - 36px));padding:14px;overflow-wrap:anywhere}.undo-toast p{margin:0 0 10px}
.creator-button{display:inline-flex;align-items:center;justify-content:center;width:44px;min-width:44px;height:52px;padding:5px;border-radius:12px}.bar:empty{display:none}.flag-notice{width:300px;max-width:100%;border:1px solid #c0aa70;border-radius:8px;background:#faf5e8;color:#443919;overflow-wrap:anywhere}.flag-notice summary{cursor:pointer;padding:10px 12px;font-weight:650;line-height:1.4}.flag-notice summary:focus-visible{outline:3px solid #b98524;outline-offset:2px}.flag-body{padding:0 12px 12px;max-height:min(360px,50dvh);overflow:auto;overscroll-behavior:contain}.flag-list{padding-left:18px;margin:12px 0;font-size:.92308em;line-height:1.5}.flag-list li+li{margin-top:12px}.flag-list p{margin:4px 0 0}.flag-body .actions{margin-top:12px}
:host([data-overlay]) .bar{justify-content:flex-end}
.block-duration{font:inherit;color:inherit;background:var(--cf-cover);max-width:100%;padding:6px;border:1px solid currentColor;border-radius:6px}
.block-duration:focus-visible{outline:3px solid #d5a641;outline-offset:3px}
`;
interface Mounted { record: FeedItem; host: HTMLElement; signature: string; originalPosition: string; positionTarget: HTMLElement; dispose?: () => void; }
interface PendingUndo { kind: 'creator'; token: string; owner: string; name: string; revealedKeys: string[]; }
interface PostUndo { kind: 'post'; token: string; key: string; owner: string; previousReveal?: string; }
type ToastUndo = PendingUndo | PostUndo;
const ownerKey = (item: FeedItem['item']) => `${item.platform}:${item.creator || ''}`;

export async function startFeed(demoPlatform?: Platform) {
  const platform = demoPlatform ?? platformFor(location.hostname);
  if (!platform) return;
  loadUiFont();
  let state: State = await readState().catch(() => freshState());
  const toolbar = toolbarReporter('feed', schedule);
  const mounted = new Map<HTMLElement, Mounted>();
  const undoByCreator = new Map<string, PendingUndo>();
  const undoing = new Set<string>();
  const flagger = new PostFlagger();
  const dismissedFlags = new Map<string, string>();
  const hiddenPosts = new Map<string, { token: string; owner: string }>();
  const toast = document.createElement('clearfeed-undo'); toast.dataset.clearfeed = 'true';
  toast.style.cssText = 'position:fixed!important;inset:auto auto 18px 18px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important;max-width:calc(100vw - 36px)!important;z-index:2147483646!important;';
  if (typeof toast.showPopover === 'function') toast.setAttribute('popover', 'manual');
  const toastShadow = toast.attachShadow({ mode: 'open' });
  const toastStyle = document.createElement('style'); toastStyle.textContent = shadowCss + shadowThemeCss; toastShadow.append(toastStyle);
  const toastPanel = document.createElement('div'); toastPanel.className = 'panel undo-toast';
  const toastMessage = document.createElement('p'); toastMessage.id = 'creator-action-message'; toastMessage.setAttribute('role', 'status');
  const toastActions = document.createElement('div'); toastActions.className = 'actions';
  let toastEntry: ToastUndo | undefined;
  const toastUndo = button('Undo', () => { if (toastEntry?.kind === 'creator') void undoBlock(toastEntry); else if (toastEntry) undoPost(toastEntry); }, true);
  toastUndo.setAttribute('aria-describedby', toastMessage.id);
  const toastDismiss = button('Dismiss', dismissToast);
  toastActions.append(toastUndo, toastDismiss); toastPanel.append(toastMessage, toastActions); toastShadow.append(toastPanel);
  const media = matchMedia(darkMediaQuery);
  const updateThemes = () => { mounted.forEach(m => applyTheme(m.host, state.settings.theme)); applyTheme(toast, state.settings.theme); };
  media.addEventListener('change', updateThemes);
  updateThemes();
  const revealed = new Map<string, string>();
  const recorded = new Set<string>();
  const skipped = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let lastSkip = 0;
  const style = document.createElement('style');
  style.dataset.clearfeed = 'true'; style.textContent = pageCss; document.documentElement.append(style);
  function restore(m: Mounted) {
    m.record.root.removeAttribute('data-cf-filter');
    if (m.positionTarget.style.position === 'relative' && m.originalPosition !== 'relative') m.positionTarget.style.position = m.originalPosition;
    m.dispose?.();
    m.host.remove();
  }
  function button(label: string, action: () => void, primary = false) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    if (primary) b.className = 'primary';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); action(); });
    return b;
  }
  function rule(record: FeedItem, action: 'allow' | 'block') {
    if (!record.item.creator) return;
    void dispatch({ type: 'rule', rule: { platform: record.item.platform, key: record.item.creator, name: record.item.creatorName || record.item.creator, action } }).then(next => { state = next; undoByCreator.delete(ownerKey(record.item)); scan(); }).catch(e => showToast((e as Error).message));
  }
  function dismissToast() {
    if (toast.hasAttribute('popover') && toast.matches(':popover-open')) toast.hidePopover();
    toast.remove(); toastEntry = undefined;
  }
  function showToast(message: string, entry?: ToastUndo, focus = false) {
    toastMessage.textContent = message; toastEntry = entry; toastUndo.hidden = !entry; toastUndo.disabled = false;
    if (!toast.isConnected) document.documentElement.append(toast);
    if (toast.hasAttribute('popover') && !toast.matches(':popover-open')) toast.showPopover();
    if (focus) (entry ? toastUndo : toastDismiss).focus();
  }
  async function block(record: FeedItem, control: HTMLButtonElement, duration: RuleDuration = 'permanent') {
    const { item, root } = record;
    if (!item.creator || item.platform === 'google') return;
    // Re-read identity at click time: Shorts and watch players are recycled in place.
    const current = collectors[platform!]().find(r => r.root === root && r.item.id === item.id && r.item.creator === item.creator);
    if (!root.isConnected || !current) { showToast('The video changed. Use the monkey on the current video.'); schedule(); return; }
    control.disabled = true;
    const owner = ownerKey(item);
    const entry: PendingUndo = { kind: 'creator', token: crypto.randomUUID(), owner, name: item.creator, revealedKeys: [...revealed].filter(([, value]) => value === owner).map(([key]) => key) };
    try {
      const expiresAt = expiryFor(duration);
      state = await dispatch({ type: 'creatorBlock', platform: item.platform, key: item.creator, name: item.creatorName || item.creator, token: entry.token, expiresAt });
      undoByCreator.set(owner, entry); entry.revealedKeys.forEach(key => revealed.delete(key));
      scan(); showToast(`Blocked ${entry.name} in KeepItReel. ${expiryLabel(expiresAt)}.`, entry, true);
    } catch (e) { showToast((e as Error).message); }
    finally { control.disabled = false; }
  }
  async function undoBlock(entry: PendingUndo) {
    if (undoing.has(entry.token)) return;
    undoing.add(entry.token);
    toastUndo.disabled = true;
    try {
      state = await dispatch({ type: 'undoCreator', token: entry.token });
      undoByCreator.delete(entry.owner); entry.revealedKeys.forEach(key => revealed.set(key, entry.owner)); scan();
      showToast(`Creator block undone for ${entry.name}.`, undefined, true);
    } catch (e) { undoByCreator.delete(entry.owner); scan(); showToast((e as Error).message); }
    finally { undoing.delete(entry.token); }
  }
  function currentRecord(record: FeedItem) {
    return record.root.isConnected && collectors[platform!]().some(current => current.root === record.root && current.item.id === record.item.id && current.item.creator === record.item.creator);
  }
  function hidePost(record: FeedItem) {
    if (!currentRecord(record)) { showToast('The post changed. Use the controls on the current post.'); schedule(); return; }
    const key = cacheKey(record.item), owner = ownerKey(record.item);
    const entry: PostUndo = { kind: 'post', token: crypto.randomUUID(), key, owner, previousReveal: revealed.get(key) };
    hiddenPosts.set(key, { token: entry.token, owner }); revealed.delete(key);
    while (hiddenPosts.size > 500) hiddenPosts.delete(hiddenPosts.keys().next().value!);
    scan(); showToast('Post hidden in this tab.', entry, true);
  }
  function undoPost(entry: PostUndo) {
    if (hiddenPosts.get(entry.key)?.token !== entry.token) { showToast('Undo is no longer available because this post preference changed.'); return; }
    hiddenPosts.delete(entry.key);
    if (entry.previousReveal !== undefined) revealed.set(entry.key, entry.previousReveal);
    scan(); showToast('Post hide undone.', undefined, true);
  }
  function monkey(record: FeedItem) {
    const control = button('', () => { void block(record, control); }); control.className = 'creator-button';
    const label = `Block creator ${record.item.creator}`; control.setAttribute('aria-label', label); control.title = `${label} in KeepItReel`;
    control.append(createReportMark()); return control;
  }
  function reasons(parent: HTMLElement, flags: PostFlag[]) {
    const list = document.createElement('ul'); list.className = 'flag-list';
    for (const flag of flags) {
      const li = document.createElement('li'), title = document.createElement('strong'), detail = document.createElement('p');
      title.textContent = flag.title; detail.textContent = flag.detail; li.append(title, detail); list.append(li);
    }
    parent.append(list);
  }
  function render(record: FeedItem, spamFlags?: PostFlag[]) {
    const { root, item } = record;
    const key = cacheKey(item);
    const result = decision(item, state, Date.now(), spamFlags, item.platform === 'youtube' ? item.title : record.postText || item.title);
    // User rules and dismissed notices do not erase the evidence shown on request.
    const analysisFlags = decision(item, { ...state, rules: [] }, Date.now(), spamFlags).flags || [];
    const sampledText = (record.postText || item.title).trim();
    const textChecked = state.settings.spamChecks && spamFlags !== undefined && !!sampledText && !['YouTube video', 'YouTube Short'].includes(sampledText);
    const indicator = videoIndicator(analysisFlags, textChecked);
    const blocked = state.rules.some(rule => ruleIsActive(rule) && rule.platform === item.platform && rule.key === item.creator && rule.action === 'block');
    const fingerprint = JSON.stringify([ownerKey(item), result.flags]);
    if (dismissedFlags.get(key) === fingerprint) {
      result.flags = []; if (!blocked && !result.topic) result.filter = false;
    }
    const hiddenPost = hiddenPosts.get(key);
    const manuallyHidden = !!hiddenPost && (hiddenPost.owner === ownerKey(item) || hiddenPost.owner === `${item.platform}:`);
    if (manuallyHidden) { result.filter = true; result.reason = 'Post hidden by you'; }
    const filtering = result.filter && !revealed.has(key);
    const mode = manuallyHidden ? 'cover' : item.short && state.settings.mode === 'collapse' ? 'cover' : state.settings.mode;
    const undo = undoByCreator.get(ownerKey(item));
    const target = !filtering ? record.controlsRoot || root : root;
    const signature = JSON.stringify([key, filtering, mode, result.reason, result.topic, result.flags, analysisFlags, textChecked, record.postText || item.title, item.evidence?.label, state.settings.spamChecks, state.settings.showPageButton, item.creator, item.creatorName, state.settings.autoSkip, undo?.token, record.overlay]);
    const old = mounted.get(root);
    if (old?.signature === signature && old.host.parentElement === target) { old.record = record; return; }
    if (old) { restore(old); mounted.delete(root); }
    if (!filtering && !state.settings.showPageButton) return;
    const host = document.createElement('clearfeed-panel');
    host.toggleAttribute('data-overlay', record.overlay === true);
    applyTheme(host, state.settings.theme);
    host.setAttribute('aria-label', 'KeepItReel controls');
    const shadow = host.attachShadow({ mode: 'open' });
    const css = document.createElement('style'); css.textContent = shadowCss + shadowThemeCss; shadow.append(css);
    const originalPosition = target.style.position;
    const m: Mounted = { record, host, signature, originalPosition, positionTarget: target };
    mounted.set(root, m);
    const addVideoAnalysis = () => {
      const videoCss = document.createElement('style');
      videoCss.textContent = emailIndicatorCss + `:host{margin:0!important}.email-launcher{margin:7px 0}.email-analysis .detail{margin:10px 0}.email-analysis .flag-list{padding-left:18px}:host([data-overlay]) .email-launcher{margin-inline-start:auto}`;
      shadow.append(videoCss);
      const panel = document.createElement('section');
      const heading = document.createElement('h2'); heading.textContent = 'Video analysis';
      const status = document.createElement('p'); status.className = 'email-severity'; status.textContent = indicator.label;
      const scope = document.createElement('p'); scope.className = 'detail';
      scope.textContent = 'Checks use supported platform disclosures and visible titles/captions. Video frames, audio and creator reputation are not analysed. Colours do not certify safety or AI authorship.';
      panel.append(heading, status); reasons(panel, analysisFlags);
      const guidance = document.createElement('p'); guidance.className = 'detail';
      guidance.textContent = analysisFlags.some(f => f.kind === 'spam') ? 'Review these patterns before acting. You can hide this video; blocking the creator is a separate choice, not a verdict on all their content.' : analysisFlags.length ? 'The platform disclosure is the reason for this indicator. AI use alone does not establish spam or poor quality.' : textChecked ? 'No matching patterns were found in the checked text. You can still hide this video or block its creator as a personal preference.' : state.settings.spamChecks ? 'No supported title/caption was checked, or this item is outside the current scan limit.' : 'Spam checks are off. Enable them in Filter settings for text-pattern checks.';
      panel.append(guidance, scope);
      if (dismissedFlags.get(key) === fingerprint) { const note = document.createElement('p'); note.textContent = 'You dismissed the automatic flag. The observed reasons remain available here.'; panel.append(note); }
      const actions = document.createElement('div'); actions.className = 'actions'; panel.append(actions);
      const current = () => {
        const next = collectors[platform!]().find(r => r.root === root);
        if (root.isConnected && next && next.item.id === item.id && next.item.creator === item.creator && (next.postText || next.item.title) === (record.postText || item.title) && next.item.evidence?.label === item.evidence?.label) return true;
        showToast('The video changed. Use the monkey on the current video.'); schedule(); return false;
      };
      const control = mountEmailIndicator(host, panel, indicator.label, indicator.tone, current, 'video');
      panel.setAttribute('aria-label', 'KeepItReel video analysis'); m.dispose = control.dispose;
      for (const event of ['click', 'dblclick', 'pointerdown', 'mousedown', 'mouseup', 'keydown', 'keyup']) host.addEventListener(event, e => e.stopPropagation());
      actions.append(button('Hide video', () => { if (current()) { control.close(); hidePost(record); } }));
      if (item.creator && !blocked) {
        const durationLabel = document.createElement('label');
        durationLabel.textContent = 'Block duration ';
        const durationSelect = document.createElement('select');
        durationSelect.className = 'block-duration';
        for (const choice of ruleDurations) {
          const option = document.createElement('option'); option.value = choice.value; option.textContent = choice.label;
          durationSelect.append(option);
        }
        durationLabel.append(durationSelect); actions.append(durationLabel);
        const creator = button('Block creator', () => { if (current()) { control.close(); void block(record, creator, durationSelect.value as RuleDuration); } });
        creator.setAttribute('aria-label', `Block creator ${item.creator}`); actions.append(creator);
      } else {
        const unavailable = document.createElement('p'); unavailable.className = 'detail'; unavailable.textContent = blocked ? 'This creator is already on your blocklist.' : 'Creator identity is unavailable on this card. You can still hide the video.'; panel.append(unavailable);
      }
      if (undo) actions.append(button('Undo', () => { void undoBlock(undo); }));
      if (revealed.has(key)) actions.append(button('Filter again', () => { if (current()) { revealed.delete(key); scan(); } }));
      if (analysisFlags.length && dismissedFlags.get(key) !== fingerprint) actions.append(button('Dismiss flag', () => {
        if (!current()) return;
        dismissedFlags.set(key, fingerprint);
        while (dismissedFlags.size > 500) dismissedFlags.delete(dismissedFlags.keys().next().value!);
        scan(); showToast('Flag dismissed for this post in this tab.', undefined, true);
      }));
    };
    if (filtering) {
      const panel = document.createElement('div'); panel.className = 'panel';
      const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = 'KeepItReel';
      const reason = document.createElement('div'); reason.className = 'reason'; reason.textContent = result.reason!;
      const detail = document.createElement('p'); detail.className = 'detail';
      detail.textContent = manuallyHidden ? 'This hides only this post in this tab. Your creator rules have not changed.' : blocked ? `You chose to filter ${item.creatorName || item.creator}.` : result.topic ? `Your phrase matched the supported title or caption. ${expiryLabel(result.topic.expiresAt)}. This is a personal filter preference.` : result.evidence ? 'This disclosure may include significant AI editing. It is not a claim that the entire video was generated.' : 'Hidden because you enabled automatic hiding for suspicious posts. Spam patterns do not prove fraud or AI authorship.';
      const actions = document.createElement('div'); actions.className = 'actions';
      actions.append(button(mode === 'label' ? 'Dismiss label' : 'Show once', () => {
        hiddenPosts.delete(key); revealed.set(key, ownerKey(item)); scan();
        // Restoring visibility does not unexpectedly start playback.
      }, true));
      if (item.creator) actions.append(button('Always allow', () => rule(record, 'allow')));
      if (result.topic) {
        const topicId = result.topic.id;
        actions.append(button('Undo topic filter', () => {
          void dispatch({ type: 'removeTopic', id: topicId }).then(next => { state = next; scan(); showToast('Topic filter removed. Other matching rules may still apply.', undefined, true); }).catch(error => showToast((error as Error).message));
        }));
      }
      if (blocked && undo) actions.append(button('Undo', () => { void undoBlock(undo); }));
      if (state.settings.showPageButton && !blocked && item.creator && item.platform !== 'google' && item.platform !== 'youtube') actions.append(monkey(record));
      if (item.short && record.next) actions.append(button('Next video', () => {
        if (!record.next!()) notice.textContent = 'Next video is not available here. Scroll to continue.';
      }));
      const notice = document.createElement('div'); notice.className = 'notice'; notice.setAttribute('role', 'status');
      if (result.evidence && !item.evidence) notice.textContent = 'Based on a disclosure previously observed on this device (up to 30 days).';
      panel.append(brand, reason, detail, actions, notice); shadow.append(panel);
      if (result.flags?.length) reasons(panel, result.flags);
      if (item.platform === 'youtube' && state.settings.showPageButton) addVideoAnalysis();
      if (mode !== 'label') {
        root.setAttribute('data-cf-filter', mode);
        if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
        if (mode === 'cover') host.style.cssText = 'position:absolute!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;overflow:auto!important;background:var(--cf-cover,#f3f5ef)!important;';
        else host.style.cssText = 'position:relative!important;padding:8px!important;';
        root.querySelectorAll('video,audio').forEach(v => (v as HTMLMediaElement).pause());
      }
      if (!demoPlatform && !recorded.has(key)) {
        recorded.add(key);
        void dispatch({ type: 'record', item: { ...item, evidence: result.evidence }, reason: result.reason! }).catch(() => recorded.delete(key));
      }
    } else if (item.platform === 'youtube') {
      addVideoAnalysis();
      if (record.overlay) {
        if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
        host.style.cssText = 'position:absolute!important;top:12px!important;right:12px!important;max-width:calc(100% - 24px)!important;z-index:40!important;display:block!important;';
      }
    } else if (item.creator || result.flags?.length) {
      const bar = document.createElement('div'); bar.className = 'bar';
      if (item.platform === 'google') bar.append(button('Hide this source', () => rule(record, 'block')));
      else if (!blocked && item.creator) bar.append(monkey(record));
      else if (undo) bar.append(button('Undo', () => { void undoBlock(undo); }));
      if (revealed.has(key)) bar.append(button('Filter again', () => { revealed.delete(key); scan(); }));
      shadow.append(bar);
      if (result.flags?.length) {
        const flags = result.flags;
        const disclosure = document.createElement('details'); disclosure.className = 'flag-notice';
        const summary = document.createElement('summary'); summary.textContent = flags.some(flag => flag.kind === 'spam') ? 'Flagged · Possible spam' : 'Flagged · AI disclosure';
        const body = document.createElement('div'); body.className = 'flag-body'; reasons(body, flags);
        const actions = document.createElement('div'); actions.className = 'actions';
        actions.append(button('Hide this post', () => hidePost(record)), button('Dismiss flag', () => {
          if (!currentRecord(record)) { showToast('The post changed. Use the controls on the current post.'); schedule(); return; }
          dismissedFlags.set(key, fingerprint);
          while (dismissedFlags.size > 500) dismissedFlags.delete(dismissedFlags.keys().next().value!);
          scan(); showToast('Flag dismissed for this post in this tab.', undefined, true);
        }));
        body.append(actions); disclosure.append(summary, body);
        // Keep the site's card click handler from treating the disclosure as navigation.
        disclosure.addEventListener('click', event => event.stopPropagation());
        shadow.append(disclosure);
      }
      if (record.overlay) {
        if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
        host.style.cssText = 'position:absolute!important;top:12px!important;right:12px!important;max-width:calc(100% - 24px)!important;z-index:40!important;display:block!important;';
      }
    }
    target.append(host);
  }
  function autoSkip() {
    if (!state.settings.autoSkip || state.settings.mode === 'label' || document.visibilityState !== 'visible' || Date.now() - lastSkip < 1800) return;
    for (const m of mounted.values()) {
      const key = cacheKey(m.record.item);
      if (!m.record.item.short || !m.record.next || !m.record.root.hasAttribute('data-cf-filter') || skipped.has(key)) continue;
      const r = m.record.root.getBoundingClientRect();
      const center = Math.min(innerHeight * .5, 400);
      if (r.height > 100 && r.top < center && r.bottom > center) {
        skipped.add(key); lastSkip = Date.now(); m.record.next(); break;
      }
    }
  }
  function scan() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    clearTimeout(expiryTimer);
    if (stopped) return;
    if (!state.settings.enabled || !state.settings.platforms[platform!]) {
      mounted.forEach(restore); mounted.clear(); flagger.clear(); dismissToast(); toolbar.publish([], false); return;
    }
    const records = collectors[platform!]();
    const alive = new Set(records.map(r => r.root));
    for (const [root, m] of mounted) if (!root.isConnected || !alive.has(root)) { restore(m); mounted.delete(root); }
    if (!state.settings.spamChecks) flagger.clear();
    const flags = state.settings.spamChecks ? flagger.assess(records) : new Map<string, PostFlag[]>();
    toolbar.publish(records.flatMap(record => decision(record.item, { ...state, rules: [] }, Date.now(), flags.get(cacheKey(record.item))).flags || []).map(f => f.code), records.length > 0);
    records.forEach(record => render(record, flags.get(cacheKey(record.item))));
    autoSkip();
    // The worker can sleep. Each open feed refreshes at its next absolute expiry.
    const expiry = nextRuleExpiry([...state.rules, ...state.topicRules]);
    if (expiry !== undefined) expiryTimer = setTimeout(scan, Math.min(Math.max(0, expiry - Date.now()) + 25, 2_147_483_647));
  }
  function schedule() { if (!timer && !stopped) timer = setTimeout(scan, 180); }
  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => {
      const target = m.target instanceof Element ? m.target : m.target.parentElement;
      if (m.type === 'attributes' && m.attributeName === 'class' && !target?.matches('ytd-reel-video-renderer,.ytLockupViewModelHost') && !(target instanceof HTMLElement && mounted.has(target))) return false;
      if (target?.closest('clearfeed-panel, [data-clearfeed]')) return false;
      if (m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].every(n => n instanceof Element && n.matches('clearfeed-panel, [data-clearfeed]'))) return false;
      return true;
    })) schedule();
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href', 'video-id', 'aria-label', 'data-e2e', 'is-active', 'active', 'hidden', 'aria-hidden', 'class'] });
  const unsubscribe = subscribe(s => { state = s; updateThemes(); schedule(); });
  const onPlay = (event: Event) => {
    const media = event.target;
    if (media instanceof HTMLMediaElement && media.closest('[data-cf-filter]')) media.pause();
  };
  document.addEventListener('play', onPlay, true);
  document.addEventListener('yt-navigate-finish', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  scan();
  return () => {
    stopped = true; clearTimeout(timer); clearTimeout(expiryTimer); observer.disconnect(); unsubscribe();
    toolbar.dispose();
    media.removeEventListener('change', updateThemes);
    mounted.forEach(restore); mounted.clear(); flagger.clear(); style.remove(); dismissToast();
    document.removeEventListener('play', onPlay, true);
    document.removeEventListener('yt-navigate-finish', schedule);
    document.removeEventListener('visibilitychange', schedule);
    window.removeEventListener('popstate', schedule); window.removeEventListener('scroll', schedule, true);
  };
}
