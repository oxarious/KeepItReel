import { assessMessage, type Finding } from './protection-policy';
import { readableText, visible } from './protection-dom';
import { emailIndicatorCss, mountEmailIndicator } from './email-indicator';
import { applyTheme } from './theme';
import type { ThemePreference } from './model';
import { mailHosts } from './protection-config';

export interface InboxPreview {
  root: HTMLElement; mount: HTMLElement; snapshot: string; findings: Finding[];
  tone: 'grey' | 'yellow' | 'red'; label: string;
}
const gmailRows = 'tr.zA';
const outlookRows = '[role="option"][data-convid], [role="option"][data-itemid], [data-testid="message-list-item"]';
const excluded = 'form,[contenteditable]:not([contenteditable="false"]),[role="textbox"],.a3s,[data-testid="message-body"],[id^="UniqueMessageBody"]';
const receivedTime = '[data-testid="received-time"],[data-testid="message-time"],[data-testid="message-date"],[data-testid="timestamp"],time';

/** Read only rendered row text, never aria-label/HTML metadata containing hidden mail. */
export function inboxPreviews(doc: Document, host: string, isVisible = visible): InboxPreview[] {
  const gmail = host === 'mail.google.com';
  if (!mailHosts.includes(host)) return [];
  const selector = gmail ? gmailRows : outlookRows;
  const rows = Array.from(doc.querySelectorAll<HTMLElement>(selector));
  const result: InboxPreview[] = [];
  for (const row of rows) {
    if (result.length >= 100) break;
    if (!isVisible(row) || row.closest(excluded) || row.matches('a,button') || rows.some(other => other !== row && other.contains(row))) continue;
    let mount: HTMLElement | null; let text: string;
    if (gmail) {
      const subject = row.querySelector<HTMLElement>('.bog');
      const snippet = row.querySelector<HTMLElement>('.y2');
      // Gmail may hide this cell on hover. Use it only to recognise the layout;
      // the indicator itself lives in a separate trailing cell.
      mount = row.querySelector<HTMLElement>('td.xW') || row.querySelector<HTMLElement>(receivedTime);
      if (!subject || !mount) continue;
      // Separate fields so a warning in the subject cannot negate a request in the snippet.
      text = [subject, snippet].filter((e): e is HTMLElement => !!e && isVisible(e)).map(e => readableText(e, false).text.slice(0, 1200)).join('\n');
    } else {
      const subject = row.querySelector<HTMLElement>('[data-testid="message-subject"],[data-testid="subject"]');
      const snippet = row.querySelector<HTMLElement>('[data-testid="message-preview"],[data-testid="preview"]');
      // Outlook often renders the date as an ordinary span. A recognised message
      // row is sufficient: use a reserved corner instead of guessing date text.
      mount = row.querySelector<HTMLElement>(receivedTime) || row;
      text = subject ? [subject, snippet].filter((e): e is HTMLElement => !!e && isVisible(e)).map(e => readableText(e, false).text.slice(0, 1200)).join('\n') : readableText(row, false).text.slice(0, 2400);
    }
    // Gmail still requires its known time cell; Outlook can use the row corner.
    if (!mount || (!gmail && !isVisible(mount)) || mount.closest('a,button,[role="button"],form,[contenteditable="true"]')) continue;
    const findings = assessMessage(text);
    const tone = findings.some(f => f.code === 'secret-request') ? 'red' : findings.length ? 'yellow' : 'grey';
    const label = tone === 'red' ? 'High-risk request in preview' : tone === 'yellow' ? 'Suspicious preview' : 'Preview only · no warning patterns found';
    result.push({ root: row, mount, findings, tone, label: text.trim() ? label : 'Preview unavailable',
      snapshot: JSON.stringify([doc.URL, row.id, row.getAttribute('data-convid'), row.getAttribute('data-itemid'), row.getAttribute('data-legacy-thread-id'), text]) });
  }
  return result;
}

const inboxCss = `
:host{display:inline-block!important;position:relative!important;vertical-align:middle!important;margin:0!important;margin-inline-start:5px!important;inline-size:24px!important;block-size:0!important;flex:none!important;align-self:center!important;white-space:normal!important;font:13px/1.5 "KeepItReel Atkinson",system-ui,sans-serif;color:#20372d}
:host([data-gmail-slot]){margin-inline-start:0!important;vertical-align:baseline!important}
:host([data-outlook-corner]){position:absolute!important;inset-inline-end:8px!important;inset-block-end:8px!important;margin:0!important;block-size:24px!important;z-index:2!important}
:host([data-outlook-corner]) .email-launcher{block-size:24px}
:host([data-outlook-corner]) .email-trigger{inset-block-start:0}
*{box-sizing:border-box}button{font:inherit;cursor:pointer;border:1px solid #b9cbbd;border-radius:8px;padding:8px 12px;background:#fffef9;color:#234b38}button:focus-visible,summary:focus-visible{outline:3px solid #b98524;outline-offset:2px}
.email-launcher{inline-size:24px;block-size:0}.email-trigger{position:absolute;inset-block-start:-12px;inset-inline-start:0;width:24px;height:24px;border-radius:5px}.email-trigger .badge-mark{display:block;width:15px;height:20px;pointer-events:none}
.email-trigger[data-tone="grey"]{color:#667169;background:#f4f5f3;border-color:#bbc4bc}
.email-analysis{font:14px/1.5 "KeepItReel Atkinson",system-ui,sans-serif;text-align:left;white-space:normal}.email-analysis p{margin:8px 0}.email-analysis h2{font-size:16px}.email-analysis .item{border-top:1px solid #c5d2bf}.email-analysis .item strong{display:block}.email-analysis .muted{color:#596b59}.email-analysis button{color:#234b38}
:host([data-theme="dark"]) .email-trigger[data-tone="grey"]{color:#c0c9c1;background:#28312c;border-color:#7b8c80}
:host([data-theme="dark"]) .email-analysis .muted{color:#b3c3b4}:host([data-theme="dark"]) .email-analysis button{color:#e4eee2;background:#203326;border-color:#6f8773}
@media(forced-colors:active){.email-trigger[data-tone]{color:ButtonText;background:ButtonFace;border-color:ButtonText}}
`;

export function createInboxControls(schedule: () => void) {
  const controls = new Map<HTMLElement, { host: HTMLElement; mount: HTMLElement; slot?: HTMLElement; snapshot: string; dispose: () => void }>();
  const gmailStyle = document.createElement('style');
  gmailStyle.textContent = `
tr.zA[data-keepitreel-inbox] > td[data-keepitreel-inbox-slot]{width:34px!important;min-width:34px!important;max-width:34px!important;flex:0 0 34px!important;padding:0!important;line-height:0!important;vertical-align:middle!important;text-align:center!important;position:relative!important;z-index:2!important}
tr.zA[data-keepitreel-inbox] .bq4{right:34px!important;inset-inline-end:34px!important}
`;
  const clear = () => { controls.forEach(c => c.dispose()); controls.clear(); gmailStyle.remove(); };
  const theme = (value: ThemePreference) => controls.forEach(c => applyTheme(c.host, value));
  function update(previews: InboxPreview[], value: ThemePreference, enabled: () => boolean) {
    const present = new Set(previews.map(p => p.root));
    for (const preview of previews) {
      const old = controls.get(preview.root);
      if (old?.snapshot === preview.snapshot && old.mount === preview.mount && old.host.isConnected && (old.slot ? old.slot.parentElement === preview.root && old.host.parentElement === old.slot : old.host.parentElement === preview.mount)) continue;
      old?.dispose();
      const host = document.createElement('clearfeed-inbox'); applyTheme(host, value);
      const root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style'); style.textContent = emailIndicatorCss + inboxCss; root.append(style);
      const panel = document.createElement('section');
      const title = document.createElement('h2'); title.textContent = 'Inbox preview check'; panel.append(title);
      const description = document.createElement('p'); description.textContent = `${preview.label}. Open the email for a fuller check.`; panel.append(description);
      for (const finding of preview.findings) {
        const item = document.createElement('div'); item.className = 'item';
        const heading = document.createElement('strong'); heading.textContent = finding.title;
        const detail = document.createElement('p'); detail.textContent = finding.detail; item.append(heading, detail); panel.append(item);
      }
      const scope = document.createElement('p'); scope.className = 'muted';
      scope.textContent = 'Only visible row text was checked for English and Swedish request patterns. The full message, link destinations, attachments and sender identity were not checked. Grey does not mean safe.'; panel.append(scope);
      const current = () => {
        if (!enabled() || !host.isConnected) return false;
        const fresh = inboxPreviews(document, location.hostname).find(p => p.root === preview.root);
        if (fresh?.snapshot === preview.snapshot) return true;
        schedule(); return false;
      };
      const control = mountEmailIndicator(host, panel, preview.label, preview.tone, current);
      control.trigger.setAttribute('aria-label', `KeepItReel · ${preview.label}. Open inbox preview check`);
      panel.setAttribute('aria-label', 'KeepItReel inbox preview check');
      // Native row handlers must not open, select, archive or mark mail read when using our UI.
      for (const event of ['click', 'dblclick', 'pointerdown', 'mousedown', 'mouseup', 'keydown', 'keyup']) host.addEventListener(event, e => e.stopPropagation());
      // Reserve horizontal room only. The absolutely positioned target cannot increase
      // the time line's height; keep the time and icon together at narrow widths.
      const whiteSpace = preview.mount.style.getPropertyValue('white-space');
      const priority = preview.mount.style.getPropertyPriority('white-space');
      const restoredStyles: Array<{ name: string; value: string; priority: string; applied: string }> = [];
      const reserveStyle = (name: string, value: string) => {
        restoredStyles.push({ name, value: preview.root.style.getPropertyValue(name), priority: preview.root.style.getPropertyPriority(name), applied: value });
        preview.root.style.setProperty(name, value, 'important');
      };
      let slot: HTMLElement | undefined;
      if (preview.root.matches('tr.zA')) {
        if (!gmailStyle.isConnected) document.documentElement.append(gmailStyle);
        slot = document.createElement('td'); slot.setAttribute('data-keepitreel-inbox-slot', '');
        preview.root.setAttribute('data-keepitreel-inbox', ''); host.setAttribute('data-gmail-slot', '');
        slot.append(host); preview.root.append(slot);
      } else if (preview.mount === preview.root) {
        host.setAttribute('data-outlook-corner', '');
        const computed = getComputedStyle(preview.root);
        const padding = computed.paddingInlineEnd;
        if (computed.position === 'static') reserveStyle('position', 'relative');
        reserveStyle('box-sizing', 'border-box');
        reserveStyle('padding-inline-end', `${(parseFloat(padding) || 0) + 34}px`);
        preview.root.append(host);
      } else {
        preview.mount.style.setProperty('white-space', 'nowrap', 'important');
        preview.mount.append(host);
      }
      const dispose = () => {
        control.dispose();
        for (const { name, value, priority, applied } of restoredStyles) {
          // Do not undo a newer host-page style change on a recycled row.
          if (preview.root.style.getPropertyValue(name) !== applied || preview.root.style.getPropertyPriority(name) !== 'important') continue;
          if (value) preview.root.style.setProperty(name, value, priority);
          else preview.root.style.removeProperty(name);
        }
        if (slot) { slot.remove(); preview.root.removeAttribute('data-keepitreel-inbox'); }
        else if (preview.mount.style.getPropertyValue('white-space') === 'nowrap' && preview.mount.style.getPropertyPriority('white-space') === 'important') {
          if (whiteSpace) preview.mount.style.setProperty('white-space', whiteSpace, priority);
          else preview.mount.style.removeProperty('white-space');
        }
      };
      controls.set(preview.root, { host, mount: preview.mount, slot, snapshot: preview.snapshot, dispose });
    }
    controls.forEach((c, row) => { if (!row.isConnected || !present.has(row)) { c.dispose(); controls.delete(row); } });
    if (![...controls.values()].some(c => c.slot)) gmailStyle.remove();
  }
  return { update, clear, theme };
}
