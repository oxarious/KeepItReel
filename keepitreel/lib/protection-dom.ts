import type { ProtectionSettings } from './model';
import { assessLink, assessMessage, findDisclosures, inDomain, type Finding, type LinkAssessment } from './protection-policy';
import { mailHosts, excludedHost } from './protection-config';

export interface CheckedLink extends LinkAssessment { element: HTMLAnchorElement; }
export interface MessageReview {
  root: HTMLElement; label: string; findings: Finding[]; checked: number; truncated: boolean; textAvailable: boolean;
  // Transient comparison only. Never send this snapshot to extension storage or feedback.
  snapshot: string;
}
export interface PageReview {
  scope: 'web' | 'email' | 'paused'; status: string; origin: Finding[];
  links: CheckedLink[]; checked: number; messages: MessageReview[]; truncated: boolean;
}
export const isMailHost = (host: string) => mailHosts.includes(host);
const ignored = 'script,style,noscript,template,textarea,input,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],clearfeed-guard,clearfeed-message,clearfeed-inbox,clearfeed-panel,clearfeed-undo,[hidden],[aria-hidden="true"]';
const quoted = 'blockquote,.gmail_quote,.gmail_signature,[id="divRplyFwdMsg"]';
const outlookBodies = '[data-testid="message-body"], [aria-label="Message body"], [aria-label="Message content"], [id^="UniqueMessageBody"]';
function replyDivider(root: Element): Element | null {
  return Array.from(root.querySelectorAll('[id="divRplyFwdMsg"]')).find(divider => {
    const owner = divider.closest(outlookBodies);
    // A conversation wrapper must not apply one child's quote boundary to its siblings.
    return !owner || owner === root || !root.contains(owner);
  }) || null;
}
export function messageContentEligible(element: Element, root: Element, divider = replyDivider(root)): boolean {
  if (element.closest(ignored + ',' + quoted)) return false;
  // Outlook's reply header is often a sibling of the quoted body, not its wrapper.
  return !divider || (!(divider.compareDocumentPosition(element) & 4) && !divider.contains(element));
}
export function visible(el: Element): boolean {
  if (el.closest(ignored)) return false;
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
}
export function readableText(root: Element, message = false): { text: string; truncated: boolean } {
  const walker = root.ownerDocument.createTreeWalker(root, 5); const parts: string[] = [];
  const visibility = new WeakMap<Element, boolean>();
  const hiddenByStyle = (el: Element | null): boolean => {
    if (!el) return false;
    const cached = visibility.get(el); if (cached !== undefined) return cached;
    const style = el.ownerDocument.defaultView?.getComputedStyle(el);
    const hidden = style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' || hiddenByStyle(el.parentElement);
    visibility.set(el, hidden); return hidden;
  };
  const limit = message ? 30000 : 50000;
  const divider = message ? replyDivider(root) : null;
  let node: Node | null; let length = 0; let visited = 0; let previousBlock: Element | null = null;
  while ((node = walker.nextNode()) && visited++ < 6000 && length < limit) {
    if (node.nodeType === 1) {
      const element = node as Element;
      if (element.tagName === 'BR' && !element.closest(ignored) && !hiddenByStyle(element) && (!message || messageContentEligible(element, root, divider))) { parts.push('\n'); length++; }
      continue;
    }
    const parent = node.parentElement;
    if (!parent || parent.closest(ignored) || hiddenByStyle(parent) || (message && !messageContentEligible(parent, root, divider)) || (!message && parent.closest('pre,code,blockquote'))) continue;
    const text = node.textContent?.trim() || '';
    if (text) {
      const block = parent.closest('p,div,li,td,th,section,article,h1,h2,h3,h4,pre');
      // Inline emphasis must not split "send <b>your verification code</b>" into separate sentences.
      const separator = parts.length ? (block === previousBlock ? ' ' : '\n') : '';
      parts.push(separator + text); length += separator.length + text.length; previousBlock = block;
    }
  }
  return { text: parts.join('').slice(0, limit), truncated: length >= limit || visited >= 6000 };
}
export function pageScope(doc: Document, url: URL, p: ProtectionSettings): { scope: PageReview['scope']; status: string } {
  const host = url.hostname;
  if (excludedHost(host)) return { scope: 'paused', status: 'This site is excluded from checks' };
  if (p.excludedDomains.some(d => inDomain(host, d))) return { scope: 'paused', status: 'Excluded by your site preferences' };
  if (isMailHost(host)) return p.email ? { scope: 'email', status: 'Opened messages only' } : { scope: 'paused', status: 'Email checks are off' };
  if (!p.websites) return { scope: 'paused', status: 'Website checks are off' };
  if (['docs.google.com', 'drive.google.com', 'accounts.google.com', 'account.microsoft.com', 'login.microsoftonline.com', 'vault.bitwarden.com'].some(d => inDomain(host, d)) || inDomain(host, '1password.com') || inDomain(host, 'slack.com')) return { scope: 'paused', status: 'Private workspace or account page excluded' };
  if (doc.querySelector('input[type="password"],input[autocomplete^="cc-"],input[autocomplete="one-time-code"]')) return { scope: 'paused', status: 'Password, payment, or code form detected; checks paused' };
  return { scope: 'web', status: 'Local disclosure and link checks' };
}
export function messageRoots(doc: Document, scope: PageReview['scope'], host: string, isVisible = visible): HTMLElement[] {
  let selectors: string;
  if (scope === 'email') selectors = host === 'mail.google.com' ? '.adn .a3s, .a3s.aiL' : outlookBodies;
  else return [];
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>(selectors));
  const roots = [...new Set(candidates)].filter(el => isVisible(el) && !el.closest('[contenteditable]:not([contenteditable="false"]),[role="textbox"],form,' + quoted));
  const unquoted = roots.filter(el => !roots.some(other => other !== el && other.contains(el) && !messageContentEligible(el, other)));
  // Retain one extra root so the caller can report partial coverage accurately.
  return unquoted.filter(el => !unquoted.some(other => other !== el && el.contains(other))).slice(0, 41);
}
export function reviewPage(doc: Document, url: URL, p: ProtectionSettings, isVisible = visible): PageReview {
  const context = pageScope(doc, url, p);
  const result: PageReview = { ...context, origin: [], links: [], checked: 0, messages: [], truncated: false };
  if (context.scope === 'paused') return result;
  const isMessage = context.scope === 'email';
  const foundRoots = isMessage ? messageRoots(doc, context.scope, url.hostname, isVisible) : [doc.body];
  result.truncated = foundRoots.length > 40;
  const roots = foundRoots.slice(0, 40);
  if (isMessage && !roots.length) {
    result.status = 'No supported opened message found; use the local checker for other layouts';
    return result;
  }
  if (context.scope === 'web') {
    const main = doc.querySelector('article') || doc.querySelector('main,[role="main"]') || doc.body;
    const passage = readableText(main);
    result.origin = findDisclosures(passage.text); result.truncated ||= passage.truncated;
  }
  for (const root of roots) {
    const passage = isMessage ? readableText(root, true) : { text: '', truncated: false };
    result.truncated ||= passage.truncated;
    const sender = context.scope === 'email' && url.hostname === 'mail.google.com' ? root.closest('.adn')?.querySelector<HTMLElement>('.gD[email]') : null;
    const senderData = sender ? { name: sender.getAttribute('name') || sender.textContent || '', email: sender.getAttribute('email') || '' } : undefined;
    const messageId = root.closest('[data-message-id],[data-legacy-message-id]');
    const linkSnapshot: string[][] = [];
    const review: MessageReview = { root, label: 'Opened email', checked: 0, truncated: passage.truncated, textAvailable: !!passage.text.trim(), snapshot: '', findings: isMessage ? assessMessage(passage.text, senderData) : [] };
    if (p.links) {
      for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        if (result.checked >= 750) { result.truncated = review.truncated = true; break; }
        if (!isVisible(anchor) || anchor.closest(ignored) || (isMessage && !messageContentEligible(anchor, root))) continue;
        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#')) continue;
        try { if (!['http:', 'https:'].includes(new URL(href, doc.baseURI).protocol)) continue; } catch { continue; }
        result.checked++; review.checked++;
        const label = (anchor.textContent || '').slice(0, 1000);
        if (isMessage) linkSnapshot.push([href.slice(0, 8192), label]);
        const assessed = assessLink(href, label, doc.baseURI);
        if (assessed.findings.length) {
          result.links.push({ ...assessed, element: anchor });
          if (isMessage) review.findings.push(...assessed.findings);
        }
      }
    }
    if (isMessage) {
      review.snapshot = JSON.stringify([url.href, passage.text, senderData, messageId?.getAttribute('data-message-id'), messageId?.getAttribute('data-legacy-message-id'), root.id, linkSnapshot, p.links, review.truncated]);
      result.messages.push(review);
    }
  }
  result.messages.forEach(m => { m.findings = [...new Map(m.findings.map(f => [f.code + ':' + f.detail, f])).values()]; });
  return result;
}
