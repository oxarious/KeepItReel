import type { MessageReview } from './protection-dom';
import { createReportMark } from './report-mark';

let closeActiveHint: (() => void) | undefined;

// Colours describe observed patterns, not a verdict on the sender or attachment.
export function emailIndicator(message: Pick<MessageReview, 'findings' | 'truncated' | 'textAvailable'>, linksEnabled: boolean) {
  if (message.findings.some(f => f.code === 'secret-request')) return { tone: 'red', label: 'High-risk request found' };
  if (message.findings.some(f => f.level === 'review')) return { tone: 'yellow', label: 'Suspicious patterns found' };
  if (message.truncated || !message.textAvailable || !linksEnabled) return { tone: 'yellow', label: 'Partial email check' };
  if (message.findings.length) return { tone: 'yellow', label: 'Link notes to review' };
  return { tone: 'green', label: 'No warning patterns found' };
}

export const emailIndicatorCss = `
:host{display:block!important;margin:4px 0 8px!important;direction:ltr;text-align:left}
.email-launcher{position:relative;width:44px;height:44px}
.email-trigger{display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border-radius:10px;background:#fffef9;border:1px solid #c5d2bf}
.email-trigger .badge-mark{width:33px;height:44px}
.email-trigger[data-tone="green"]{color:#247044;background:#edf7ee;border-color:#9abca0}
.email-trigger[data-tone="yellow"]{color:#866000;background:#fff7db;border-color:#c5a24c}
.email-trigger[data-tone="red"]{color:#b13434;background:#fff0ed;border-color:#d89c94}
.email-trigger:hover{filter:brightness(.95)}
.email-trigger[aria-expanded="true"]{outline:2px solid currentColor;outline-offset:2px}
.email-hint{position:fixed;inset:auto;margin:0;left:var(--hint-left,12px);top:var(--hint-top,12px);width:max-content;max-width:min(260px,calc(100vw - 24px));padding:6px 10px;background:#20372d;color:#fff;border:1px solid #6f8773;border-radius:6px;font:13px/1.5 "KeepItReel Atkinson",system-ui,sans-serif;text-align:left;white-space:normal;overflow-wrap:anywhere;pointer-events:auto}
.email-hint[hidden]{display:none}
.email-analysis{position:fixed;inset:auto;margin:0;left:var(--email-left,12px);top:var(--email-top,auto);bottom:var(--email-bottom,auto);width:min(360px,calc(100vw - 24px));max-height:var(--email-height,70dvh);overflow:auto;overscroll-behavior:contain;padding:16px;border:1px solid #c5d2bf;border-radius:12px;background:#fffef9;color:#20372d;box-shadow:0 8px 28px #102c282a;font-size:1.07692em;overflow-wrap:anywhere;z-index:2147483647}
.email-analysis[hidden]{display:none}
.email-analysis h2{font-size:1.14286em;line-height:1.4;margin:0 0 4px}
.email-heading{display:flex;align-items:flex-start;gap:12px;justify-content:space-between}
.email-close{flex:none;min-width:44px;min-height:44px;padding:4px 8px}
.email-analysis button{min-height:44px}
.email-analysis>button{margin-top:8px}
.email-analysis .item{padding:8px 0}
.email-analysis .actions{margin-top:8px}
.email-analysis .muted{font-size:.92857em}
.email-analysis summary{cursor:pointer;padding:8px 0;min-height:44px}
.email-analysis summary:focus-visible{outline:3px solid #b98524;outline-offset:2px}
.email-analysis [role="status"]:empty{display:none}
.email-severity{margin:0 0 10px;font-weight:700}
:host([data-theme="dark"]) .email-analysis{background:#18261f;border-color:#45604a;color:#e4eee2;box-shadow:0 8px 28px #0006}
:host([data-theme="dark"]) .email-trigger[data-tone="green"]{color:#a8dfad;background:#193423;border-color:#638e6b}
:host([data-theme="dark"]) .email-trigger[data-tone="yellow"]{color:#f0cc66;background:#342e19;border-color:#9d8445}
:host([data-theme="dark"]) .email-trigger[data-tone="red"]{color:#ffaba5;background:#3b2222;border-color:#b87470}
@media(forced-colors:active){.email-trigger[data-tone]{color:ButtonText;background:ButtonFace;border-color:ButtonText}.email-analysis{border:2px solid CanvasText}}
`;

/** One non-modal report per opened body. No mailbox content is copied into the launcher. */
export function mountEmailIndicator(host: HTMLElement, panel: HTMLElement, label: string, tone: string, current: () => unknown, kind: 'email' | 'video' = 'email') {
  const root = host.shadowRoot!;
  const launcher = document.createElement('div'); launcher.className = 'email-launcher';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'email-trigger';
  trigger.dataset.tone = tone; trigger.setAttribute('aria-label', `KeepItReel · ${label}. Open ${kind} analysis`);
  trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', 'email-analysis');
  trigger.append(createReportMark());
  const hint = document.createElement('span'); hint.className = 'email-hint'; hint.textContent = label; hint.setAttribute('aria-hidden', 'true');
  launcher.append(trigger, hint);
  panel.id = 'email-analysis'; panel.className = 'email-analysis'; panel.setAttribute('aria-label', 'KeepItReel opened email check');
  const nativePopover = 'popover' in HTMLElement.prototype;
  const nativeCommands = 'commandForElement' in HTMLButtonElement.prototype;
  // A high z-index inside a row cannot escape its clipping/stacking context.
  // Popovers promote the hint to the browser's top layer instead.
  if (nativePopover) hint.setAttribute('popover', 'manual');
  else hint.hidden = true; // The accessible button name and click report remain available.
  if (nativePopover) {
    panel.setAttribute('popover', 'auto');
    if (nativeCommands) { trigger.setAttribute('commandfor', panel.id); trigger.setAttribute('command', 'toggle-popover'); }
    else { trigger.setAttribute('popovertarget', panel.id); }
  } else panel.hidden = true;
  let opened = false;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressHint = false;
  const cancelHintTimer = () => { if (hintTimer) clearTimeout(hintTimer); hintTimer = undefined; };
  const hintEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); suppressHint = true; hideHint(); }
  };
  const hintOutside = (e: Event) => {
    if (!e.composedPath().includes(trigger) && !e.composedPath().includes(hint)) hideHint();
  };
  function hideHint() {
    cancelHintTimer();
    if (closeActiveHint === hideHint) closeActiveHint = undefined;
    if (nativePopover && hint.matches(':popover-open')) hint.hidePopover();
    document.removeEventListener('keydown', hintEscape, true);
    document.removeEventListener('pointerdown', hintOutside, true); document.removeEventListener('focusin', hintOutside, true);
    document.removeEventListener('scroll', hideHint, true); window.removeEventListener('resize', hideHint); window.removeEventListener('blur', hideHint);
  }
  function showHint() {
    cancelHintTimer();
    if (!nativePopover || opened || suppressHint || !host.isConnected || !current()) return;
    if (closeActiveHint !== hideHint) closeActiveHint?.();
    closeActiveHint = hideHint;
    if (!hint.matches(':popover-open')) hint.showPopover();
    const anchor = trigger.getBoundingClientRect(), bounds = hint.getBoundingClientRect();
    hint.style.setProperty('--hint-left', `${Math.max(12, Math.min(anchor.right - bounds.width, innerWidth - bounds.width - 12))}px`);
    const top = anchor.top - bounds.height - 8;
    hint.style.setProperty('--hint-top', `${Math.max(12, Math.min(top >= 12 ? top : anchor.bottom + 8, innerHeight - bounds.height - 12))}px`);
    document.addEventListener('keydown', hintEscape, true);
    document.addEventListener('pointerdown', hintOutside, true); document.addEventListener('focusin', hintOutside, true);
    document.addEventListener('scroll', hideHint, true); window.addEventListener('resize', hideHint); window.addEventListener('blur', hideHint);
  }
  const leaveHint = () => {
    cancelHintTimer();
    hintTimer = setTimeout(() => {
      if (!trigger.matches(':hover') && !hint.matches(':hover') && root.activeElement !== trigger) hideHint();
    }, 140);
  };
  trigger.addEventListener('mouseenter', () => { suppressHint = false; showHint(); });
  trigger.addEventListener('focus', () => { suppressHint = false; showHint(); });
  trigger.addEventListener('mouseleave', leaveHint); trigger.addEventListener('blur', leaveHint);
  hint.addEventListener('mouseenter', cancelHintTimer); hint.addEventListener('mouseleave', leaveHint);
  const position = () => {
    const rect = trigger.getBoundingClientRect();
    if (!host.isConnected || rect.bottom < 0 || rect.top > innerHeight || !trigger.getClientRects().length) { close(); return; }
    const above = rect.bottom > innerHeight / 2;
    panel.style.setProperty('--email-left', `${Math.max(12, Math.min(rect.left, innerWidth - Math.min(360, innerWidth - 24) - 12))}px`);
    panel.style.setProperty('--email-top', above ? 'auto' : `${rect.bottom + 8}px`);
    panel.style.setProperty('--email-bottom', above ? `${innerHeight - rect.top + 8}px` : 'auto');
    panel.style.setProperty('--email-height', `${Math.max(80, above ? rect.top - 20 : innerHeight - rect.bottom - 20)}px`);
  };
  const outside = (e: Event) => { if (!e.composedPath().includes(host)) close(); };
  const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(true); } };
  const track = (show: boolean) => {
    opened = show; trigger.setAttribute('aria-expanded', String(show));
    document.removeEventListener('scroll', position, true); window.removeEventListener('resize', position);
    document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape);
    if (show) {
      document.addEventListener('scroll', position, true); window.addEventListener('resize', position);
      if (!nativePopover) { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); }
    }
  };
  function close(focus = false) {
    if (nativePopover && panel.matches(':popover-open')) panel.hidePopover();
    if (!nativePopover) panel.hidden = true;
    track(false); if (focus) trigger.focus();
  }
  const heading = document.createElement('div'); heading.className = 'email-heading';
  const title = panel.firstElementChild; if (title) heading.append(title);
  const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.textContent = 'Close'; closeButton.className = 'email-close'; closeButton.setAttribute('aria-label', `Close ${kind} analysis`);
  closeButton.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); close(true); });
  heading.append(closeButton); panel.prepend(heading);
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    suppressHint = true; hideHint();
    if (!opened && !current()) { e.preventDefault(); return; }
    if (!nativePopover) { panel.hidden = !panel.hidden; track(!panel.hidden); }
    position();
  });
  panel.addEventListener('beforetoggle', event => { if ((event as ToggleEvent).newState === 'open') { hideHint(); position(); } });
  panel.addEventListener('toggle', () => track(nativePopover ? panel.matches(':popover-open') : !panel.hidden));
  root.append(launcher, panel);
  return { dispose: () => { hideHint(); close(); host.remove(); }, trigger, panel, close };
}
