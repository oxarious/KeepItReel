import { getDomain, parse } from 'tldts';

export interface Finding { code: string; title: string; detail: string; level: 'notice' | 'review'; }
export interface LinkAssessment { destination: string; findings: Finding[]; wrapped: boolean; }
export const domainOf = (host: string) => getDomain(host, { allowPrivateDomains: true }) || host.toLowerCase();
export const inDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
const issue = (code: string, title: string, detail: string, level: Finding['level'] = 'review'): Finding => ({ code, title, detail, level });
const shorteners = new Set(['bit.ly', 'tinyurl.com', 't.co', 'lnkd.in', 'ow.ly', 'is.gd', 'buff.ly']);

// Decode only known redirect formats. Never request a destination or follow redirects.
export function unwrapLink(input: URL): { url: URL; wrapped: boolean } {
  let url = input; let wrapped = false;
  for (let i = 0; i < 3; i++) {
    const h = url.hostname.toLowerCase(); let value: string | null = null;
    if ((h === 'www.google.com' || h === 'google.com') && url.pathname === '/url') value = url.searchParams.get('q') || url.searchParams.get('url');
    if (inDomain(h, 'safelinks.protection.outlook.com')) value = url.searchParams.get('url');
    if ((h === 'l.facebook.com' || h === 'lm.facebook.com') && url.pathname === '/l.php') value = url.searchParams.get('u');
    if (!value) break;
    try { const next = new URL(value); if (!['http:', 'https:'].includes(next.protocol)) break; url = next; wrapped = true; } catch { break; }
  }
  return { url, wrapped };
}
function displayedUrl(label: string): URL | undefined {
  const text = label.trim().replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '');
  if (text.length > 300 || /\s/.test(text) || text.includes('…') || text.includes('...')) return;
  // Repository filenames often look like hostnames (README.md, package.json).
  // Only treat these suffixes as addresses when the label explicitly includes a URL scheme.
  if (!/^https?:\/\//i.test(text) && /\.(?:md|json|js|ts|jsx|tsx|css|html?|xml|ya?ml|png|jpe?g|gif|svg|webp|pdf|zip|txt|csv|go|sh|py|rs|sql)$/i.test(text)) return;
  if (!/^(?:https?:\/\/)?(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,}(?:[/:?#]|$)/u.test(text)) return;
  try {
    const url = new URL(/^https?:/i.test(text) ? text : `https://${text}`);
    if (!/^https?:/i.test(text)) {
      const suffix = parse(url.hostname, { allowPrivateDomains: true });
      if (!suffix.isIcann && !suffix.isPrivate) return;
    }
    return url;
  } catch { return; }
}
export function assessLink(href: string, label = '', base = 'https://example.invalid/'): LinkAssessment {
  const findings: Finding[] = [];
  let original: URL;
  try { original = new URL(href, base); } catch { return { destination: '', findings, wrapped: false }; }
  if (!['http:', 'https:'].includes(original.protocol)) return { destination: '', findings, wrapped: false };
  const { url, wrapped } = unwrapLink(original);
  const host = url.hostname.toLowerCase();
  const shown = displayedUrl(label);
  if (shown && domainOf(shown.hostname) !== domainOf(host)) findings.push(issue('destination-mismatch', 'Displayed address differs', `The displayed address is ${shown.hostname}, but the destination is ${host}. Redirects or tracking can also cause this.`));
  if (original.username || original.password || url.username || url.password) findings.push(issue('embedded-credentials', 'Address contains a login prefix', `Text before an @ in the URL is not the website. The destination host is ${host}.`));
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) findings.push(issue('ip-address', 'Numeric destination', `This link uses an IP address (${host}) instead of a website name. This can be legitimate.`, 'notice'));
  if (host.split('.').some(p => p.startsWith('xn--'))) findings.push(issue('international-domain', 'Internationalised domain', `The encoded address is ${host}. International names are valid; check it matches the intended site.`, 'notice'));
  if (url.protocol === 'http:') findings.push(issue('unencrypted', 'Unencrypted destination', `The link uses HTTP. Avoid entering private information unless the site upgrades to HTTPS.`, 'notice'));
  if (shorteners.has(host)) findings.push(issue('short-link', 'Destination is shortened', `The final destination behind ${host} was not followed or checked.`, 'notice'));
  const brandDomains = ['paypal.com', 'microsoft.com', 'google.com', 'apple.com', 'linkedin.com', 'amazon.com'];
  for (const brand of brandDomains) {
    if (!inDomain(host, brand) && host.includes(`${brand}.`)) {
      findings.push(issue('brand-subdomain', 'Brand name inside another domain', `${brand} appears in the address, but the controlling domain is ${domainOf(host)}.`)); break;
    }
  }
  return { destination: host, findings, wrapped };
}

export function assessMessage(text: string, sender?: { name: string; email: string }): Finding[] {
  const findings: Finding[] = [];
  // Use bounded sentences, so a benign warning in one sentence cannot suppress a request in another.
  const sentences = text.slice(0, 30000).normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/[’‘]/g, "'").split(/[.!?;\n]+|\b(?:but|however|instead|men|istället|däremot)\b/i).map(s => s.trim()).filter(Boolean);
  const actionable = sentences.filter(s => !/\b(?:never|do not|don't|won't|will not|not to|avoid|beware|aldrig|inte|undvik|varna|varning)\b/i.test(s));
  if (actionable.some(s => /\b(?:send|share|tell|reply|provide|give)\b.{0,70}\b(?:password|passcode|one[- ]time (?:code|password)|verification code|security code|otp|seed phrase|recovery phrase)\b/i.test(s))) findings.push(issue('secret-request', 'Request for a private code or secret', 'This text asks you to share a password, verification code, or recovery phrase. Verify the request through a channel you already trust.'));
  if (actionable.some(s => /\b(?:buy|purchase|pay|send|transfer)\b.{0,65}\b(?:gift cards?|bitcoin|crypto(?:currency)?|usdt)\b/i.test(s))) findings.push(issue('unusual-payment', 'Unusual payment request', 'A gift-card or cryptocurrency payment is requested. This pattern deserves review; it does not establish fraud.'));
  if (actionable.some(s => /\b(?:pay|send|transfer)\b.{0,50}\b(?:upfront|processing|activation|registration|release|training) fee\b/i.test(s))) findings.push(issue('upfront-fee', 'Upfront fee requested', 'An advance fee is requested. Independently verify the organisation and terms.'));
  if (actionable.some(s => /\b(?:guaranteed|risk[- ]free)\b.{0,35}\b(?:returns?|profits?|income)\b/i.test(s))) findings.push(issue('guaranteed-return', 'Guaranteed earnings claim', 'Guaranteed or risk-free earnings are claimed. Treat this as a reason to investigate.'));
  // Explicit Swedish requests only; negation and clause boundaries above also apply.
  const swedish = (pattern: RegExp) => actionable.some(s => pattern.test(s));
  if (!findings.some(f => f.code === 'secret-request') && swedish(/(?<![\p{L}\p{N}_])(?:skicka|dela|uppge|ange|lämna|svara med|ge oss)(?![\p{L}\p{N}_]).{0,70}(?<![\p{L}\p{N}_])(?:lösenord(?:et)?|engångskod(?:en)?|verifieringskod(?:en)?|säkerhetskod(?:en)?|återställningsfras(?:en)?|återställningskod(?:en)?|bankid[- ]?kod(?:en)?)(?![\p{L}\p{N}_])/iu)) findings.push(issue('secret-request', 'Request for a private code or secret', 'This Swedish text asks you to share a password, verification code, or recovery phrase. Verify the request through a channel you already trust.'));
  if (!findings.some(f => f.code === 'unusual-payment') && swedish(/(?<![\p{L}\p{N}_])(?:köp|betala|skicka|överför)(?![\p{L}\p{N}_]).{0,65}(?<![\p{L}\p{N}_])(?:presentkort|bitcoin|kryptovaluta|krypto|usdt)(?![\p{L}\p{N}_])/iu)) findings.push(issue('unusual-payment', 'Unusual payment request', 'A gift-card or cryptocurrency payment is requested in Swedish. This pattern deserves review; it does not establish fraud.'));
  if (!findings.some(f => f.code === 'upfront-fee') && swedish(/(?<![\p{L}\p{N}_])(?:betala|skicka|överför)(?![\p{L}\p{N}_]).{0,50}(?<![\p{L}\p{N}_])(?:förskottsavgift(?:en)?|aktiveringsavgift(?:en)?|registreringsavgift(?:en)?|handläggningsavgift(?:en)?)(?![\p{L}\p{N}_])/iu)) findings.push(issue('upfront-fee', 'Upfront fee requested', 'An advance fee is requested in Swedish. Independently verify the organisation and terms.'));
  if (sender?.email && sender.name.includes('@')) {
    const address = sender.name.trim().replace(/^<|>$/g, '');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) && address.toLowerCase() !== sender.email.toLowerCase()) findings.push(issue('sender-mismatch', 'Sender label differs from address', `The displayed sender address and the underlying sender address differ. Authentication headers were not verified.`));
  }
  return findings;
}

export function findDisclosures(text: string): Finding[] {
  const findings: Finding[] = [];
  // Self-disclosure only: discussion of AI, writing style, and an absent label are not authorship evidence.
  const pattern = /\b(?:this (?:article|post|text|image|video|content)|the (?:article|post|text|content) (?:above|below))\s+(?:(?:was|is|has been)\s+)?(?:entirely\s+|partly\s+|partially\s+)?(?:generated|written|created|produced)\s+(?:by|with|using)\s+(?:generative\s+AI|artificial intelligence|AI|ChatGPT)\b/i;
  for (const sentence of text.slice(0, 50000).split(/[.!?\n]+/)) {
    if (/\b(?:not|never|example|claim|claims|claimed|quote|says|said|might|could|whether)\b/i.test(sentence) || /["“”]/.test(sentence)) continue;
    const match = sentence.match(pattern);
    if (match) { findings.push(issue('ai-disclosure', 'Page contains an AI self-disclosure', `The page states: “${match[0].slice(0, 200)}”. This statement is not independently verified and may refer to only part of the content.`, 'notice')); break; }
  }
  return findings;
}

export function linksInText(text: string): string[] {
  return [...new Set((text.match(/https?:\/\/[^\s<>"']+/gi) || []).map(s => s.replace(/[),.;!?]+$/, '')))].slice(0, 100);
}
