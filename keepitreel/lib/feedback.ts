import type { State } from './model';

export const feedbackKinds = ['wrong_warning', 'missed_warning', 'broken_page', 'permission_problem', 'suggestion'] as const;
export type FeedbackKind = typeof feedbackKinds[number];
export const findingCodes = ['destination-mismatch', 'embedded-credentials', 'ip-address', 'international-domain', 'unencrypted', 'short-link', 'brand-subdomain', 'secret-request', 'unusual-payment', 'upfront-fee', 'guaranteed-return', 'sender-mismatch', 'ai-disclosure'] as const;
export interface FeedbackContext { scope: 'web' | 'email' | 'feed' | 'local' | 'general'; codes: string[]; }
export function feedbackDraftKey(search: string): string {
  const token = new URLSearchParams(search).get('feedback');
  return token && /^[a-f0-9-]{36}$/i.test(token) ? `feedbackDraft:${token}` : 'feedbackDraft';
}
export function sanitizeFeedbackContext(input: unknown): FeedbackContext {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    scope: ['web', 'email', 'feed', 'local'].includes(String(value.scope)) ? value.scope as FeedbackContext['scope'] : 'general',
    codes: Array.isArray(value.codes) ? [...new Set(value.codes.filter((c): c is string => typeof c === 'string' && findingCodes.includes(c as typeof findingCodes[number])))].slice(0, 15) : [],
  };
}
export function makeFeedbackReport(input: { version: string; kind: FeedbackKind; context: FeedbackContext; notes: string; state: State; grants: { websites: boolean; email: boolean }; userAgent: string }) {
  const s = input.state.settings;
  return {
    schemaVersion: 1, product: 'KeepItReel', version: input.version, channel: 'early-development',
    feedback: { kind: feedbackKinds.includes(input.kind) ? input.kind : 'suggestion', ...sanitizeFeedbackContext(input.context), notes: input.notes.slice(0, 2000) },
    diagnostics: {
      browserMajor: input.userAgent.match(/(?:Chrome|Chromium)\/(\d+)/)?.[1] || 'unknown',
      os: /Windows/.test(input.userAgent) ? 'Windows' : /Macintosh/.test(input.userAgent) ? 'macOS' : /Linux/.test(input.userAgent) ? 'Linux' : 'other',
      enabled: s.enabled, mode: s.mode, websites: s.protection.websites, links: s.protection.links, email: s.protection.email,
      websiteAccess: input.grants.websites === true, emailAccess: input.grants.email === true,
    },
  };
}
