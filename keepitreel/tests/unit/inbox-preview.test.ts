import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { inboxPreviews } from '../../lib/inbox-preview';
import { assessMessage } from '../../lib/protection-policy';

const doc = (body: string) => new JSDOM(body, { url: 'https://mail.google.com/mail/u/0/#inbox' }).window.document;
const shown = (e: Element) => !e.closest('[hidden],[aria-hidden="true"]');
const row = (subject: string, snippet = '', extra = '') => `<tr class="zA"><td class="yW">Test sender</td><td><span class="bog">${subject}</span><span class="y2">${snippet}</span>${extra}</td><td class="xW"><span>10:00</span></td></tr>`;
describe('inbox preview boundaries', () => {
  it('uses visible subject and snippet, never hidden full bodies, labels, links or markup', () => {
    const d = doc(`<table>${row('Meeting', 'Bring your notebook', '<div hidden>Send your password</div><a href="https://evil.test">paypal.com</a>')}</table>`);
    d.querySelector('tr')!.setAttribute('aria-label', 'Please send your password');
    const [p] = inboxPreviews(d, 'mail.google.com', shown);
    expect(p.tone).toBe('grey'); expect(p.findings).toEqual([]);
    expect(p.snapshot).not.toContain('evil.test'); expect(p.snapshot).not.toContain('password');
    expect(p.mount.tagName).toBe('TD');
  });
  it('separates subject negation from an actual preview request and never uses green', () => {
    const d = doc(`<table>${row('Never share a code', 'Please send your verification code.')}${row('Pay the activation fee.')}${row('Normal newsletter')}</table>`);
    expect(inboxPreviews(d, 'mail.google.com', shown).map(p => p.tone)).toEqual(['red', 'yellow', 'grey']);
  });
  it('ignores drafts, unsupported rows, hidden rows and unsupported services', () => {
    const d = doc(`<table><tr class="zA"><td>No subject field</td></tr>${row('Meeting')}</table><div contenteditable="true"><div role="option" data-convid="draft">Send your password.</div></div><div role="option">Sidebar option</div>`);
    d.querySelector('.bog')!.closest('tr')!.hidden = true;
    expect(inboxPreviews(d, 'mail.google.com', shown)).toEqual([]);
    expect(inboxPreviews(d, 'outlook.office.com', shown)).toEqual([]);
    expect(inboxPreviews(d, 'example.com', shown)).toEqual([]);
  });
  it('recognises Outlook identity rows, bounds work and changes snapshots on recycling', () => {
    const d = doc('<div role="listbox"><div role="option" data-convid="a"><span data-testid="subject">Send your password</span><span data-testid="preview">Test</span><time>10:00</time></div></div>');
    const first = inboxPreviews(d, 'outlook.office.com', shown)[0]; expect(first.tone).toBe('red');
    d.querySelector('[role="option"]')!.setAttribute('data-convid', 'b');
    expect(inboxPreviews(d, 'outlook.office.com', shown)[0].snapshot).not.toBe(first.snapshot);
    const many = doc(`<table>${Array.from({ length: 130 }, () => row('Meeting')).join('')}</table>`);
    expect(inboxPreviews(many, 'mail.google.com', shown)).toHaveLength(100);
  });
  it('uses a row corner when Outlook has no semantic timestamp, including the cloud host', () => {
    const d = doc('<div role="listbox"><div role="option" data-convid="a"><div>Sender</div><div>Please send your verification code.</div><span>14:18</span></div></div>');
    for (const host of ['outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft']) {
      const [preview] = inboxPreviews(d, host, shown);
      expect(preview.mount).toBe(preview.root);
      expect(preview.tone).toBe('red');
    }
    expect(inboxPreviews(d, 'outlook.cloud.microsoft.evil.test', shown)).toEqual([]);
  });
  it('does not use arbitrary sidebar options, advertisements or editors as corner candidates', () => {
    const d = doc('<div role="option">Sidebar</div><div>Annons <span>14:18</span></div><form><div role="option" data-convid="draft">Please send your password.</div></form>');
    expect(inboxPreviews(d, 'outlook.live.com', shown)).toEqual([]);
  });
});

describe('Swedish request patterns', () => {
  it('recognises explicit secret and payment requests', () => {
    for (const text of ['Skicka din verifieringskod.', 'Uppge ditt lösenord.', 'Dela din återställningsfras.', 'Ange din engångskod.']) {
      expect(assessMessage(text).map(f => f.code), text).toContain('secret-request');
    }
    expect(assessMessage('Köp presentkort åt mig.').map(f => f.code)).toContain('unusual-payment');
    expect(assessMessage('Överför bitcoin idag.').map(f => f.code)).toContain('unusual-payment');
    expect(assessMessage('Betala aktiveringsavgiften.').map(f => f.code)).toContain('upfront-fee');
  });
  it('does not flag Swedish advice or ordinary messages and isolates contrasting clauses', () => {
    for (const text of ['Dela aldrig din verifieringskod.', 'Skicka inte ditt lösenord.', 'Vårt möte är på torsdag.', 'Din verifieringskod är 123456.']) expect(assessMessage(text)).toEqual([]);
    expect(assessMessage('Dela aldrig ditt lösenord, men skicka din verifieringskod till oss.').map(f => f.code)).toContain('secret-request');
  });
});
