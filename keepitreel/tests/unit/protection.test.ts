import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { assessLink, assessMessage, findDisclosures } from '../../lib/protection-policy';
import { reviewPage, pageScope, readableText, messageContentEligible } from '../../lib/protection-dom';
import { hydrate, protectionDefaults } from '../../lib/model';

const p = { ...protectionDefaults, websites: true, email: true, linkedin: true };
const make = (body: string, url = 'https://news.example.com/a') => new JSDOM(body, { url }).window.document;
const shown = (el: Element) => !el.closest('[hidden],[aria-hidden="true"],[contenteditable="true"],form');
const codes = (url: string, label = '') => assessLink(url, label).findings.map(f => f.code);

describe('link analysis', () => {
  it('compares registrable domains, including private suffixes', () => {
    expect(codes('https://support.example.co.uk/', 'example.co.uk')).not.toContain('destination-mismatch');
    expect(codes('https://evil.co.uk/', 'example.co.uk')).toContain('destination-mismatch');
    expect(codes('https://other.github.io/', 'owner.github.io')).toContain('destination-mismatch');
  });
  it('unwraps known redirects without trusting arbitrary query strings', () => {
    const good = 'https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fpaypal.com%2Fhelp';
    expect(codes(good, 'paypal.com')).not.toContain('destination-mismatch');
    expect(codes('https://evil.test/?url=https://paypal.com/', 'paypal.com')).toContain('destination-mismatch');
    expect(codes('https://www.google.com/url?q=https%3A%2F%2Fevil.test', 'paypal.com')).toContain('destination-mismatch');
  });
  it('flags userinfo and deceptive subdomain placement', () => {
    expect(codes('https://paypal.com@evil.test/')).toContain('embedded-credentials');
    expect(codes('https://paypal.com.login.evil.test/')).toContain('brand-subdomain');
    expect(codes('https://www.paypal.com/')).toEqual([]);
  });
  it('does not equate short, international or numeric addresses with fraud', () => {
    for (const address of ['https://bit.ly/abc', 'https://xn--bcher-kva.de/', 'http://127.0.0.1/']) expect(assessLink(address).findings.every(f => f.level === 'notice')).toBe(true);
  });
  it('ignores application schemes and ordinary link labels', () => {
    expect(codes('mailto:a@example.com', 'a@example.com')).toEqual([]);
    expect(codes('javascript:void(0)', 'Menu')).toEqual([]);
    expect(codes('https://example.com/', 'Read our article')).toEqual([]);
    expect(codes('https://example.com/', 'https://example.org/…')).toEqual([]);
    for (const name of ['README.md', 'package.json', 'index.html', 'eslint.config.mjs', 'yarn.lock']) expect(codes('https://github.com/owner/repo/file', name)).toEqual([]);
  });
});
describe('bounded origin and message evidence', () => {
  it('finds an explicit self-disclosure without certifying it', () => {
    const result = findDisclosures('This article was generated using AI.');
    expect(result).toHaveLength(1); expect(result[0].detail).toContain('not independently verified');
  });
  it.each(['How AI-generated content works', 'This article was not generated using AI.', 'An example: this article was generated using AI.', 'The author says this article was generated using AI.', '“This article was generated using AI.”'])('does not treat discussion or negation as disclosure: %s', text => expect(findDisclosures(text)).toEqual([]));
  it('distinguishes a request from a safety warning', () => {
    expect(assessMessage('Please send your verification code.').map(f => f.code)).toContain('secret-request');
    expect(assessMessage('Never share your verification code.')).toEqual([]);
    expect(assessMessage('Never share passwords. Please send your verification code.')).toHaveLength(1);
  });
  it('flags concrete payment and sender-label mismatches', () => {
    expect(assessMessage('Pay the activation fee. Send gift cards. Guaranteed returns.')).toHaveLength(3);
    expect(assessMessage('Hello', { name: 'support@example.com', email: 'other@example.net' }).map(f => f.code)).toContain('sender-mismatch');
    expect(assessMessage('Hello', { name: 'Example Support', email: 'support@example.com' })).toEqual([]);
  });
  it.each([
    'Your invoice is attached. Please pay by bank transfer by Friday.',
    'Never share your password or verification code. We will not ask you to send gift cards.',
    'Don’t share your recovery phrase. Avoid guaranteed returns.',
    'Our weekly newsletter: the meeting starts at ten. Read our updates online.',
  ])('does not flag ordinary mail or safety advice: %s', text => expect(assessMessage(text)).toEqual([]));
  it('does not let an unrelated negated clause suppress a secret request', () => {
    expect(assessMessage('Do not call us; instead send your verification code.').map(f => f.code)).toContain('secret-request');
    expect(assessMessage('Please s\u200bend your verification code.').map(f => f.code)).toContain('secret-request');
  });
});
describe('privacy and site scopes', () => {
  it('migrates existing settings with private integrations off', () => {
    const migrated = hydrate({ version: 1, settings: { enabled: true } as any });
    expect(migrated.settings.protection).toEqual(protectionDefaults);
  });
  it('website consent does not enable webmail or LinkedIn', () => {
    for (const host of ['mail.google.com', 'outlook.live.com', 'outlook.cloud.microsoft', 'www.linkedin.com']) {
      const url = new URL(`https://${host}/`); expect(pageScope(make(''), url, { ...protectionDefaults, websites: true }).scope).toBe('paused');
    }
  });
  it('skips sensitive forms, known workspaces, and domain exclusions', () => {
    expect(pageScope(make('<input type="password">'), new URL('https://example.com'), p).scope).toBe('paused');
    expect(pageScope(make(''), new URL('https://docs.google.com'), p).scope).toBe('paused');
    expect(pageScope(make(''), new URL('https://news.example.com'), { ...p, excludedDomains: ['example.com'] }).scope).toBe('paused');
    expect(pageScope(make(''), new URL('https://notexample.com'), { ...p, excludedDomains: ['example.com'] }).scope).toBe('web');
  });
  it('does not read form fields, editor text, hidden blocks or quoted replies', () => {
    const doc = make('<article>Hello<input value="secret"><textarea>secret</textarea><div contenteditable="true">secret</div><blockquote>secret</blockquote><div hidden>secret</div><div style="display:none"><p>secret</p></div><clearfeed-message>secret</clearfeed-message></article>');
    expect(readableText(doc.querySelector('article')!, true).text).toBe('Hello');
  });
  it('checks only opened Gmail messages, skips drafts and quoted replies', () => {
    const doc = make('<div>Send gift cards.</div><div class="adn"><span class="gD" email="person@example.com">A person</span><div class="a3s aiL">Please send your verification code.<blockquote>Send gift cards.</blockquote><a href="https://evil.test">paypal.com</a></div></div><div contenteditable="true" class="a3s aiL">Send gift cards.</div>', 'https://mail.google.com/mail/u/0/');
    const result = reviewPage(doc, new URL(doc.URL), p, shown);
    expect(result.messages).toHaveLength(1); expect(result.messages[0].findings.map(f => f.code)).toEqual(['secret-request', 'destination-mismatch']);
    expect(result.checked).toBe(1);
  });
  it('reports unsupported mail layouts without calling them checked', () => {
    const doc = make('<main>Inbox subjects only</main>', 'https://outlook.live.com/mail/');
    const result = reviewPage(doc, new URL(doc.URL), p, shown);
    expect(result.status).toContain('No supported opened message'); expect(result.checked).toBe(0);
  });
  it('preserves inline text while keeping separate paragraphs and line breaks distinct', () => {
    const doc = make('<div class="a3s aiL"><p>Please <strong>send</strong> your <span>verification code</span>.</p><p>Never share passwords.<br>Please send gift cards.</p></div>', 'https://mail.google.com/mail/');
    expect(reviewPage(doc, new URL(doc.URL), p, shown).messages[0].findings.map(f => f.code)).toEqual(['secret-request', 'unusual-payment']);
  });
  it('excludes Outlook quoted siblings and their links after a reply divider', () => {
    for (const nested of [false, true]) {
      const quote = '<p>Please send your password.</p><a href="https://evil.test">paypal.com</a>';
      const doc = make(`<div aria-label="Message body"><p>Thanks, received.</p><div id="divRplyFwdMsg">From: earlier sender</div>${nested ? `<div id="UniqueMessageBody_quoted">${quote}</div>` : quote}</div>`, 'https://outlook.live.com/mail/');
      const result = reviewPage(doc, new URL(doc.URL), p, shown);
      expect(result.messages).toHaveLength(1); expect(result.messages[0].root.getAttribute('aria-label')).toBe('Message body');
      expect(result.messages[0].findings).toEqual([]); expect(result.checked).toBe(0);
      expect(messageContentEligible(doc.querySelector('a')!, result.messages[0].root)).toBe(false);
    }
  });
  it('separates nested Outlook message bodies without merging a conversation', () => {
    const doc = make('<div aria-label="Message content"><div id="UniqueMessageBody_1">Send your password.<div id="divRplyFwdMsg">Quoted</div><div id="UniqueMessageBody_quote">Send gift cards.</div></div><div id="UniqueMessageBody_2">Pay the activation fee.</div></div>', 'https://outlook.office.com/mail/');
    const result = reviewPage(doc, new URL(doc.URL), p, shown);
    expect(result.messages.map(m => m.findings.map(f => f.code))).toEqual([['secret-request'], ['upfront-fee']]);
  });
  it('changes the ephemeral snapshot when the same body node is recycled', () => {
    const doc = make('<div class="adn" data-message-id="1"><span class="gD" email="first@example.com">Person</span><div class="a3s aiL">Send your password.<a href="https://example.com/a">Help</a></div></div>', 'https://mail.google.com/mail/');
    const scan = () => reviewPage(doc, new URL(doc.URL), p, shown).messages[0];
    let before = scan().snapshot;
    for (const [selector, attr, value] of [['.adn', 'data-message-id', '2'], ['.gD', 'email', 'second@example.com'], ['a', 'href', 'https://example.com/b']]) {
      doc.querySelector(selector)!.setAttribute(attr, value);
      const next = scan(); expect(next.snapshot).not.toBe(before); expect(next.findings.map(f => f.code)).toEqual(['secret-request']); before = next.snapshot;
    }
    expect(reviewPage(doc, new URL('https://mail.google.com/mail/#another-message'), p, shown).messages[0].snapshot).not.toBe(before);
  });
  it('does not call an image-only body text checked', () => {
    const doc = make('<div aria-label="Message body"><img alt="Please send your password" src="image.png"></div>', 'https://outlook.live.com/mail/');
    const message = reviewPage(doc, new URL(doc.URL), p, shown).messages[0];
    expect(message.textAvailable).toBe(false); expect(message.findings).toEqual([]);
  });
  it('marks email text over 30000 characters partial and skips non-web links', () => {
    const doc = make(`<div class="a3s aiL">${'x'.repeat(31000)}<a href="mailto:person@example.com">Email</a><a href="https://example.com">Website</a></div>`, 'https://mail.google.com/mail/');
    const result = reviewPage(doc, new URL(doc.URL), p, shown);
    expect(result.messages[0].truncated).toBe(true); expect(result.messages[0].checked).toBe(1); expect(result.truncated).toBe(true);
  });
  it('excludes LinkedIn, including with old integration settings', () => {
    for (const host of ['linkedin.com', 'www.linkedin.com', 'uk.linkedin.com']) {
      const doc = make('<article>Please send your verification code. This article was generated using AI.</article>', 'https://' + host + '/');
      const result = reviewPage(doc, new URL(doc.URL), { ...p, linkedin: true } as any, shown);
      expect(result.scope).toBe('paused'); expect(result.messages).toHaveLength(0); expect(result.checked).toBe(0);
    }
  });
  it('caps long text and excessive links, exposing partial coverage', () => {
    const doc = make(`<article>${'x'.repeat(60000)}</article>${Array.from({ length: 800 }, () => '<a href="https://example.net">Link</a>').join('')}`);
    const result = reviewPage(doc, new URL(doc.URL), p, shown);
    expect(result.truncated).toBe(true); expect(result.checked).toBe(750);
    const mail = make(Array.from({ length: 45 }, () => '<div class="a3s aiL">Hello.</div>').join(''), 'https://mail.google.com/mail/');
    const mailbox = reviewPage(mail, new URL(mail.URL), p, shown);
    expect(mailbox.messages).toHaveLength(40); expect(mailbox.truncated).toBe(true);
  });
});
