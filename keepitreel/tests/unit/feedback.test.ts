import { describe, it, expect } from 'vitest';
import { feedbackDraftKey, makeFeedbackReport, sanitizeFeedbackContext } from '../../lib/feedback';
import { freshState, hydrate } from '../../lib/model';

describe('private beta migration and feedback', () => {
  it('selects only a bounded report token, never an arbitrary storage key', () => {
    expect(feedbackDraftKey('?feedback=6b62062a-d2eb-4a12-9591-c759135998ab')).toBe('feedbackDraft:6b62062a-d2eb-4a12-9591-c759135998ab');
    expect(feedbackDraftKey('?feedback=state')).toBe('feedbackDraft');
    expect(feedbackDraftKey('')).toBe('feedbackDraft');
  });
  it('discards retired integration flags while preserving rules and settings', () => {
    const old = freshState(); old.settings.mode = 'label';
    old.settings.protection = { ...old.settings.protection, websites: true, linkedin: true } as any;
    old.rules.push({ platform: 'youtube', key: '@example', name: 'Example', action: 'allow' });
    const migrated = hydrate(old);
    expect(migrated.settings.protection).not.toHaveProperty('linkedin');
    expect(migrated.settings.protection.websites).toBe(true);
    expect(migrated.settings.mode).toBe('label'); expect(migrated.rules).toEqual(old.rules);
  });
  it('only accepts known scopes and codes from an untrusted page context', () => {
    expect(sanitizeFeedbackContext({ scope: 'email', codes: ['secret-request', 'secret-request', 'private message'], url: 'https://private.test' })).toEqual({ scope: 'email', codes: ['secret-request'] });
    expect(sanitizeFeedbackContext({ scope: 'private message', codes: [3, null] })).toEqual({ scope: 'general', codes: [] });
  });
  it('excludes browsing state, content, account identifiers and full user agent', () => {
    const state = freshState(); state.rules.push({ platform: 'google', key: 'secret.test', name: 'Private name', action: 'block' });
    state.settings.protection.excludedDomains = ['secret.test'];
    state.history = [{ id: 'secret-id', platform: 'youtube', title: 'Private title', url: 'https://secret.test/?token=secret', time: 0, reason: 'Private reason' }];
    const report = makeFeedbackReport({ version: '0.3.1', kind: 'wrong_warning', context: { scope: 'email', codes: ['secret-request'] }, notes: 'My voluntary note', state, grants: { websites: false, email: true }, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/144.0.1234.12' });
    expect(report.diagnostics.browserMajor).toBe('144'); expect(report.diagnostics.os).toBe('Windows');
    expect(report.feedback.notes).toBe('My voluntary note');
    const json = JSON.stringify(report);
    for (const text of ['secret.test', 'secret-id', 'Private title', 'Private name', '1234.12', 'Mozilla']) expect(json).not.toContain(text);
  });
  it('bounds voluntarily entered notes', () => {
    const report = makeFeedbackReport({ version: '0.3.1', kind: 'suggestion', context: { scope: 'general', codes: [] }, notes: 'x'.repeat(5000), state: freshState(), grants: { websites: false, email: false }, userAgent: '' });
    expect(report.feedback.notes).toHaveLength(2000);
  });
});
