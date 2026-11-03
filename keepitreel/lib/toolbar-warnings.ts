export const warningTypes = {
  disclosure: { title: 'AI disclosure', detail: 'An explicit AI disclosure was found. It may refer to only part of the content; it does not establish harmful content.' },
  secret: { title: 'Private code or password request', detail: 'Checked text asks for a password, verification code or recovery phrase. Review the request before acting.' },
  prize: { title: 'Payment to claim a prize', detail: 'A post pairs a prize claim with a fee or deposit request. This is a pattern match, not proof of fraud.' },
  payment: { title: 'Unusual payment or upfront fee', detail: 'Checked text requests a gift card, cryptocurrency or advance fee. Verify the context independently.' },
  promotion: { title: 'Suspicious promotion', detail: 'Guaranteed earnings or repeated promotional wording matched a local check. Legitimate context may be missing.' },
  link: { title: 'Link address concern', detail: 'A visible link has a mismatched label, misleading domain or login prefix. Destinations were not visited or malware-scanned.' },
  sender: { title: 'Sender-label mismatch', detail: 'The displayed sender label differs from the available address information. Sender identity was not authenticated.' },
} as const;
export type WarningType = keyof typeof warningTypes;
export interface ToolbarSummary { codes: WarningType[]; checked: boolean; }
const mappings: Record<string, WarningType> = {
  'ai-disclosure': 'disclosure', 'self-disclosure': 'disclosure',
  'spam-secret': 'secret', 'secret-request': 'secret', 'spam-prize-fee': 'prize',
  'unusual-payment': 'payment', 'upfront-fee': 'payment',
  'spam-repeat': 'promotion', 'spam-return': 'promotion', 'guaranteed-return': 'promotion',
  'destination-mismatch': 'link', 'embedded-credentials': 'link', 'brand-subdomain': 'link',
  'sender-mismatch': 'sender',
};
export function warningCodes(codes: string[]): WarningType[] {
  return sanitizeWarningCodes(codes.map(code => mappings[code]).filter(Boolean));
}
export function sanitizeWarningCodes(input: unknown): WarningType[] {
  return Array.isArray(input) ? [...new Set(input.slice(0, 100).filter((c): c is WarningType => typeof c === 'string' && Object.hasOwn(warningTypes, c)))].sort() : [];
}
export function mergeWarnings(...summaries: (ToolbarSummary | undefined)[]): ToolbarSummary {
  return { codes: sanitizeWarningCodes(summaries.flatMap(s => s?.codes || [])), checked: summaries.some(s => s?.checked === true) };
}
