import { browser } from 'wxt/browser';
import { readState, subscribe, dispatch } from './store';
import { pageScope, reviewPage, visible, messageContentEligible, type PageReview, type MessageReview } from './protection-dom';
import { assessLink, type Finding } from './protection-policy';
import { applyTheme, darkMediaQuery, shadowThemeCss } from './theme';
import { createReportMark } from './report-mark';
import { loadUiFont } from './ui-font';
import { inboxPreviews, createInboxControls, type InboxPreview } from './inbox-preview';
import { emailIndicator, emailIndicatorCss, mountEmailIndicator } from './email-indicator';
import { toolbarReporter } from './toolbar-reporter';

const css = `
:host{all:initial;font:small/1.5 "KeepItReel Atkinson",system-ui,sans-serif;font-size-adjust:from-font;color:#20372d;color-scheme:light}*{box-sizing:border-box}button{font:inherit;cursor:pointer;border:1px solid #b9cbbd;border-radius:8px;padding:8px 12px;background:#fffef9;color:#234b38}button:hover{background:#eaf0e5}button:focus-visible,a:focus-visible{outline:3px solid #b98524;outline-offset:3px}h2{font:600 1.92308em/1.2 "KeepItReel Atkinson",system-ui,sans-serif;margin:8px 0 12px}p{margin:8px 0;line-height:1.55}.guard-content{display:flex;flex-direction:column;align-items:flex-end}.badge{display:inline-flex;align-items:center;justify-content:center;flex:none;width:56px;min-height:64px;padding:5px 7px;border:1px solid #c5d2bf;border-radius:16px;background:#fffef9;color:#244d39;box-shadow:0 4px 18px #142b2828}.badge:hover{background:#edf2e7}.badge[hidden]{display:none}.badge.warn{border-color:#a98c4c}.badge.is-paused{color:#68786d}.badge-mark{display:block;width:36px;height:48px;pointer-events:none}.panel{width:min(390px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#fffef9;border:1px solid #d3dece;border-radius:13px;padding:20px;box-shadow:0 10px 35px #102c282a;margin-bottom:10px;overflow-wrap:anywhere}.eyebrow{font-size:0.76923em;font-weight:700;letter-spacing:.12em;color:#6c7c61}.muted{font-size:0.92308em;color:#62745f}.item{border-top:1px solid #e5eadf;padding:12px 0}.item strong{display:block}.item p{font-size:0.92308em}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.note{padding:10px 13px;background:#faf3e3;border:1px solid #e7d5a4;border-radius:8px;margin:10px 0}.review-title{font-weight:650}.destination{font-family:ui-monospace,monospace;background:#f0f2e8;padding:8px;border-radius:5px;overflow-wrap:anywhere}a{color:#24533c}.dialog{padding:0;border:0;border-radius:13px;background:transparent;color:inherit;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto}.dialog:modal{overscroll-behavior:contain}.dialog::backdrop{background:#0c201a66;overflow:hidden;overscroll-behavior:contain}.dialog .panel{max-height:calc(100dvh - 32px);margin:0}.dialog h2{font-size:2.07692em}
`;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') { const e = document.createElement(tag); e.textContent = text; if (className) e.className = className; return e; }
function button(text: string, fn: () => void) { const b = el('button', text); b.type = 'button'; b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(); }); return b; }
function renderFinding(f: Finding) { const node = el('div', '', 'item'); node.append(el('strong', f.title), el('p', f.detail)); return node; }


export async function startProtection() {
  loadUiFont();
  let state = await readState();
  const toolbar = toolbarReporter('protection', schedule);
  let access = await browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'protectionAccess' });
  let review: PageReview | undefined; let open = false; let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined; let signature = ''; let previousUrl = location.href;
  let dialog: HTMLDialogElement | undefined;
  let previews: InboxPreview[] = [];
  const inbox = createInboxControls(schedule);
  const notices = new Map<HTMLElement, { host: HTMLElement; signature: string; dispose: () => void }>();
  // Exact bounded snapshots stay in this tab's isolated memory. A recycled message
  // element with different content, sender, links or provider ID cannot inherit dismissal.
  let dismissed = new WeakMap<HTMLElement, string>();
  const guard = document.createElement('clearfeed-guard');
  const media = matchMedia(darkMediaQuery);
  const updateThemes = () => { inbox.theme(state.settings.theme); applyTheme(guard, state.settings.theme); notices.forEach(m => applyTheme(m.host, state.settings.theme)); };
  media.addEventListener('change', updateThemes); updateThemes();
  guard.style.cssText = 'position:fixed!important;bottom:18px!important;right:18px!important;z-index:2147483646!important;display:block!important;';
  const shadow = guard.attachShadow({ mode: 'open' }); const style = el('style', css + shadowThemeCss); shadow.append(style);
  const content = el('div', '', 'guard-content'); shadow.append(content);
  const effective = () => ({ ...state.settings.protection, websites: state.settings.protection.websites && !!access?.websites, email: state.settings.protection.email && !!access?.email });
  const setup = () => { void browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'openProtection' }); };
  const clearNotices = () => { inbox.clear(); previews = []; notices.forEach(m => m.dispose()); notices.clear(); };
  // Keep the controls mounted while scan findings change, so keyboard focus survives.
  const reportPanel = el('section', '', 'panel'); reportPanel.id = 'page-report'; reportPanel.hidden = true;
  reportPanel.setAttribute('aria-label', 'KeepItReel page report');
  const reportBody = el('div');
  const reportActions = el('div', '', 'actions');
  const siteToggle = button('Pause on this site', () => {
    void dispatch({ type: 'sitePause', host: location.hostname, paused: !state.settings.protection.excludedDomains.includes(location.hostname) });
  });
  const visibilityToggle = button('Hide this button', () => { void dispatch({ type: 'settings', patch: { showPageButton: !state.settings.showPageButton } }); });
  reportActions.append(button('Protection settings', setup), siteToggle, visibilityToggle, button('Report a problem', () => { void browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'feedbackDraft', context: { scope: review?.scope, codes: [...previews.flatMap(p => p.findings), ...(review?.origin || []), ...(review?.links.flatMap(l => l.findings) || []), ...(review?.messages.flatMap(m => m.findings) || [])].map(f => f.code) } }); }), button('Close report', () => { open = false; render(); if (!badge.hidden) badge.focus(); }));
  reportPanel.append(reportBody, reportActions);
  const badge = button('', () => { open = !open; render(); if (open) reportActions.querySelector('button')?.focus(); });
  badge.setAttribute('aria-controls', reportPanel.id); badge.append(createReportMark());
  content.append(reportPanel, badge);
  function openReport() { open = true; render(); reportActions.querySelector('button')?.focus(); }
  function render() {
    if (!review) return;
    reportBody.replaceChildren(); reportPanel.hidden = !open;
    badge.hidden = !state.settings.showPageButton;
    const sitePaused = state.settings.protection.excludedDomains.includes(location.hostname);
    siteToggle.textContent = sitePaused ? 'Start on this site' : 'Pause on this site';
    // An inherited exclusion, missing permission, or sensitive-page pause needs settings.
    // Starting an exact site pause never removes a broader private-site exclusion.
    siteToggle.disabled = !sitePaused && review.scope === 'paused';
    siteToggle.title = siteToggle.disabled ? review.status : '';
    visibilityToggle.textContent = state.settings.showPageButton ? 'Hide this button' : 'Show this button';
    const concerns = previews.filter(p => p.findings.length).length + review.links.filter(l => l.findings.some(f => f.level === 'review')).length + review.messages.filter(m => m.findings.some(f => f.level === 'review' && !review!.links.some(l => l.findings.includes(f)))).length;
    if (open) {
      const panel = reportBody;
      panel.append(el('div', 'KEEPITREEL / LOCAL CHECK', 'eyebrow'), el('h2', 'Page report'), el('p', review.status));
      if (review.scope !== 'paused') {
        panel.append(el('p', review.scope === 'web' ? `Origin: ${review.origin.length ? 'self-disclosure found' : 'unknown'}.` : 'AI authorship and account identity: unknown.', 'review-title'));
        panel.append(el('p', `${review.checked} link${review.checked === 1 ? "" : "s"} inspected${review.scope !== 'web' ? ` in ${review.messages.length} opened message(s); ${previews.length} inbox preview(s)` : ''}. These are local pattern checks, not a malware or identity verdict.`, 'muted'));
        review.origin.forEach(f => panel.append(renderFinding(f)));
        if (previews.length) panel.append(el('p', 'Inbox previews check visible row text only. Open an email for a fuller check; grey is not a safety verdict.', 'muted'));
        const findings = [...previews.flatMap(p => p.findings), ...review.messages.flatMap(m => m.findings), ...review.links.flatMap(l => l.findings)];
        [...new Map(findings.map(f => [`${f.code}:${f.detail}`, f])).values()].slice(0, 18).forEach(f => panel.append(renderFinding(f)));
        if (!findings.length) panel.append(el('p', 'No matching link or message risk patterns found. This is not a guarantee of safety.', 'muted'));
        if (review.messages.some(m => !m.textAvailable)) panel.append(el('p', 'Some opened messages have no readable text. Text inside images and attachments was not checked.', 'muted'));
        if (review.truncated) panel.append(el('p', 'Partial check: content exceeded the page limits. Some content was not assessed.', 'muted'));
      }
    }
    const label = review.scope === 'paused' ? 'KeepItReel · paused' : concerns ? `KeepItReel · ${concerns} concern${concerns === 1 ? '' : 's'}` : review.origin.length ? 'KeepItReel · AI disclosure' : 'KeepItReel · page check';
    badge.setAttribute('aria-label', label); badge.title = `${label} — ${open ? 'Close' : 'Open'} page report`;
    badge.className = `badge${concerns ? ' warn' : ''}${review.scope === 'paused' ? ' is-paused' : ''}`; badge.setAttribute('aria-expanded', String(open));
  }
  function run() {
    if (timer) clearTimeout(timer); timer = undefined;
    if (stopped || document.hidden) return;
    if (!state.settings.enabled) { toolbar.publish([], false); review = undefined; guard.remove(); clearNotices(); dismissed = new WeakMap(); closeDialog(); signature = ''; return; }
    review = reviewPage(document, new URL(location.href), effective());
    previews = review.scope === 'email' ? inboxPreviews(document, location.hostname) : [];
    if (state.settings.showPageButton) inbox.update(previews, state.settings.theme, () => state.settings.enabled && effective().email && !state.settings.protection.excludedDomains.some(d => location.hostname === d || location.hostname.endsWith('.' + d)));
    else inbox.clear();
    toolbar.publish([...review.origin, ...review.links.flatMap(l => l.findings), ...review.messages.flatMap(m => m.findings), ...previews.flatMap(p => p.findings)].filter(f => f.level === 'review' || review!.origin.includes(f)).map(f => f.code), review.scope !== 'paused' && (review.scope === 'web' || !!review.messages.length || !!previews.length));
    if (previews.length) review.status = review.messages.length ? 'Visible inbox previews and opened messages' : `${previews.length} inbox preview(s) checked; open an email for a fuller check`;
    if (review.scope !== 'email') dismissed = new WeakMap();
    const sig = JSON.stringify([review.scope, review.status, review.checked, review.truncated, review.origin, review.links.map(l => [l.destination, l.findings]), review.messages.map(m => [m.findings, m.textAvailable]), previews.map(p => p.findings)]);
    if (!guard.isConnected) document.documentElement.append(guard);
    if (sig !== signature) { signature = sig; render(); }
    const present = new Set<HTMLElement>();
    for (const message of state.settings.showPageButton ? review.messages : []) {
      present.add(message.root);
      const isDismissed = dismissed.get(message.root) === message.snapshot;
      if (!isDismissed) dismissed.delete(message.root);
      const key = JSON.stringify([message.snapshot, message.findings, message.checked, message.truncated, isDismissed]);
      const old = notices.get(message.root);
      if (old?.signature === key && old.host.isConnected) {
        if (old.host.nextElementSibling !== message.root) message.root.before(old.host);
        continue;
      }
      old?.dispose();
      const host = document.createElement('clearfeed-message'); const root = host.attachShadow({ mode: 'open' });
      applyTheme(host, state.settings.theme);
      root.append(el('style', css + shadowThemeCss + emailIndicatorCss));
      const flagged = message.findings.some(f => f.level === 'review');
      const indicator = emailIndicator(message, effective().links);
      const note = el('section');
      note.setAttribute('aria-label', 'KeepItReel opened email check');
      note.append(el('h2', isDismissed ? 'KeepItReel · Warning dismissed' : flagged ? 'KeepItReel · Flagged email' : message.findings.length ? 'KeepItReel · Link notes' : message.truncated || !message.textAvailable || !effective().links ? 'KeepItReel · Partial email check' : 'KeepItReel · Opened message checked'));
      note.append(el('p', indicator.label, 'email-severity'));
      const status = el('p', '', 'muted'); status.setAttribute('role', 'status');
      const current = (): MessageReview | undefined => {
        if (!state.settings.enabled || !host.isConnected) return;
        const latest = reviewPage(document, new URL(location.href), effective()).messages.find(m => m.root === message.root);
        if (latest?.snapshot === message.snapshot && JSON.stringify(latest.findings) === JSON.stringify(message.findings)) return latest;
        status.textContent = 'The message changed. Wait for its updated check.'; schedule();
      };
      const toggleDismiss = () => {
        if (!current()) return;
        if (isDismissed) dismissed.delete(message.root); else dismissed.set(message.root, message.snapshot);
        run();
        const updated = notices.get(message.root)?.host.shadowRoot;
        (updated?.querySelector('.email-trigger') as HTMLButtonElement | null)?.click();
        (updated?.querySelector(isDismissed ? '.email-close' : 'button:not(.email-trigger):not(.email-close)') as HTMLElement | null)?.focus();
      };
      if (isDismissed) {
        note.append(el('p', 'For this message in this tab only. Link checks remain active when enabled.', 'muted'), button('Show warning', toggleDismiss));
      } else {
        note.append(el('p', flagged ? 'Review these reasons before acting.' : message.findings.length ? 'These link properties can be legitimate.' : !message.textAvailable ? 'No readable message text found. Text in images and attachments was not checked.' : 'No matching warning patterns found. This does not establish that the email is safe.', 'muted'));
        const details = el('div');
        message.findings.slice(0, 30).forEach(f => details.append(renderFinding(f)));
        if (message.findings.length > 30) details.append(el('p', 'Showing the first 30 findings. More link findings are present.', 'muted'));
        details.append(el('p', effective().links ? `${message.checked} web link${message.checked === 1 ? '' : 's'} inspected without visiting destinations.` : 'Link checks are off. Enable Suspicious link checks in Protection settings to inspect addresses.', 'muted'));
        const coverage = el('details'); coverage.append(el('summary', 'Check limits'), el('p', 'Text checks look for English and Swedish request patterns in supported visible messages. Recognised quoted replies and drafts are excluded. Attachments, authentication headers and AI authorship are not verified.', 'muted'));
        details.append(coverage);
        if (!message.textAvailable) details.append(el('p', 'No readable message text found. Text in images was not checked.', 'muted'));
        if (message.truncated) details.append(el('p', 'Partial check: this message exceeded the text or link limits. Some content was not assessed.', 'muted'));
        if (message.findings.length) {
          const actions = el('div', '', 'actions');
          const report = button('Report incorrect warning', () => {
            const latest = current(); if (!latest) return;
            report.disabled = true; status.textContent = 'Opening feedback…';
            void browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'feedbackDraft', context: { scope: 'email', codes: latest.findings.map(f => f.code) } }).then(result => {
              if (!result?.opened || result.error) throw new Error('Feedback did not open');
              status.textContent = 'Feedback opened in a new tab. Nothing has been sent.';
            }).catch(() => { status.textContent = 'Could not open feedback. Try again or use Feedback in settings.'; }).finally(() => { report.disabled = false; });
          });
          actions.append(report); details.append(actions);
          coverage.append(el('p', 'Reporting copies warning categories only. Review and export the feedback file yourself; no email content is included automatically.', 'muted'));
          note.append(details, button('Dismiss for this message', toggleDismiss));
        } else note.append(details);
      }
      note.append(status);
      const control = mountEmailIndicator(host, note, isDismissed ? `${indicator.label} · warning dismissed` : indicator.label, indicator.tone, current);
      // A sibling notice cannot become part of the message body or a platform action button.
      message.root.before(host); notices.set(message.root, { host, signature: key, dispose: control.dispose });
    }
    notices.forEach((m, root) => { if (!present.has(root) || !root.isConnected) { m.dispose(); notices.delete(root); } });
  }
  function schedule() { if (!timer && !stopped) timer = setTimeout(run, 650); }
  function closeDialog() {
    const current = dialog; dialog = undefined;
    if (current?.open) current.close();
    current?.remove();
  }
  function click(event: MouseEvent) {
    if (!state.settings.enabled || !state.settings.protection.links || event.defaultPrevented || (event.type === 'auxclick' && event.button !== 1)) return;
    const path = event.composedPath();
    // closest() cannot cross a shadow root: inspect the path to exclude our own links.
    if (path.some(n => n instanceof Element && n.matches('clearfeed-guard,clearfeed-message,clearfeed-inbox,clearfeed-panel,clearfeed-undo'))) return;
    const target = path.find(n => n instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
    if (!target || target.closest('clearfeed-guard,clearfeed-message,clearfeed-inbox,clearfeed-panel,clearfeed-undo') || !visible(target)) return;
    const p = effective(); const scope = pageScope(document, new URL(location.href), p).scope;
    if (scope === 'paused' || target.closest('form,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')) return;
    if (scope !== 'web') {
      // Check membership again: SPA navigation may have replaced the last scan's message roots.
      const current = reviewPage(document, new URL(location.href), p);
      if (!current.messages.some(m => m.root.contains(target) && messageContentEligible(target, m.root))) return;
    }
    const result = assessLink(target.href, target.textContent || '', document.baseURI);
    if (!result.findings.some(f => f.level === 'review')) return;
    event.preventDefault(); event.stopImmediatePropagation(); closeDialog();
    // Snapshot the reviewed href; an asynchronous page update cannot replace the destination.
    const href = target.href;
    const overlay = el('dialog', '', 'dialog'); overlay.setAttribute('aria-labelledby', 'link-review-title');
    const heading = el('h2', 'Review this link'); heading.id = 'link-review-title';
    const panel = el('div', '', 'panel'); panel.append(el('div', 'KEEPITREEL / LINK CHECK', 'eyebrow'), heading, el('p', 'Destination host'), el('div', result.destination, 'destination'));
    result.findings.forEach(f => panel.append(renderFinding(f)));
    panel.append(el('p', 'KeepItReel has not visited this link. A warning is a reason to review, not proof of a scam.', 'muted'));
    const actions = el('div', '', 'actions');
    const back = button('Go back', closeDialog); back.autofocus = true;
    const follow = el('a', 'Continue to link'); follow.href = href; follow.target = '_blank'; follow.rel = 'noopener noreferrer'; follow.addEventListener('click', () => closeDialog());
    actions.append(back, follow); panel.append(actions); overlay.append(panel); shadow.append(overlay); dialog = overlay;
    overlay.addEventListener('close', () => { overlay.remove(); if (dialog === overlay) dialog = undefined; });
    overlay.showModal();
  }
  const observer = new MutationObserver(records => {
    if (records.some(r => {
      if ((r.target as Element).closest?.('clearfeed-guard,clearfeed-message,clearfeed-inbox,clearfeed-panel,clearfeed-undo')) return false;
      if (r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].every(n => n instanceof Element && n.matches('clearfeed-guard,clearfeed-message,clearfeed-inbox,clearfeed-panel,clearfeed-undo'))) return false;
      return true;
    })) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href', 'hidden', 'aria-hidden', 'aria-label', 'email', 'name', 'type', 'autocomplete', 'contenteditable', 'role', 'data-message-id', 'data-legacy-message-id', 'data-testid', 'data-convid', 'data-itemid', 'data-legacy-thread-id', 'id', ...(location.hostname === 'mail.google.com' || location.hostname.startsWith('outlook.') ? ['class', 'style'] : [])] });
  const off = subscribe(next => {
    const scopeChanged = state.settings.enabled !== next.settings.enabled || JSON.stringify(state.settings.protection) !== JSON.stringify(next.settings.protection);
    if (state.settings.showPageButton && !next.settings.showPageButton) open = false;
    state = next; updateThemes();
    if (scopeChanged) closeDialog();
    render(); schedule();
  });
  const listener = (message: { namespace?: string; type?: string }) => {
    if (message?.namespace !== 'clearfeed') return;
    if (message.type === 'protectionOpen') { run(); openReport(); return Promise.resolve({ opened: true }); }
    if (message.type === 'protectionStatus') return Promise.resolve({ active: state.settings.enabled && review?.scope !== 'paused', status: state.settings.enabled ? review?.status || 'Starting checks' : 'KeepItReel is paused', checked: review?.checked || 0 });
    if (message.type === 'accessChanged') {
      access = {}; closeDialog(); run();
      void browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'protectionAccess' }).then(a => { access = a; schedule(); });
    }
  };
  browser.runtime.onMessage.addListener(listener);
  document.addEventListener('click', click, true); document.addEventListener('auxclick', click, true);
  document.addEventListener('click', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  const nav = setInterval(() => { if (previousUrl !== location.href) { previousUrl = location.href; closeDialog(); schedule(); } }, 1000);
  run();
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    stopped = true; if (timer) clearTimeout(timer); clearInterval(nav); observer.disconnect(); off();
    toolbar.dispose();
    media.removeEventListener('change', updateThemes);
    browser.runtime.onMessage.removeListener(listener); document.removeEventListener('click', click, true); document.removeEventListener('click', schedule); document.removeEventListener('auxclick', click, true); document.removeEventListener('visibilitychange', schedule);
    guard.remove(); clearNotices();
  }, { once: true });
}
