import type { TopicRule } from './model';

export const DAY_MS = 86_400_000;
export const ruleDurations = [
  { value: 'permanent', label: 'Until I remove it', days: 0 },
  { value: 'day', label: '24 hours', days: 1 },
  { value: 'week', label: '7 days', days: 7 },
  { value: 'month', label: '30 days', days: 30 },
] as const;
export type RuleDuration = typeof ruleDurations[number]['value'];

export function expiryFor(duration: RuleDuration, now = Date.now()): number | undefined {
  const choice = ruleDurations.find(option => option.value === duration);
  if (!choice) throw new Error('Choose a valid duration.');
  return choice.days ? now + choice.days * DAY_MS : undefined;
}

export function validateExpiry(value: unknown, now = Date.now()): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= now || value > now + 30 * DAY_MS) {
    throw new Error('Choose a future expiry within 30 days.');
  }
  return value;
}

export function ruleIsActive(rule: { expiresAt?: number }, now = Date.now()): boolean {
  return rule.expiresAt === undefined || (Number.isFinite(rule.expiresAt) && rule.expiresAt > now);
}

export function expiryLabel(expiresAt?: number, now = Date.now()): string {
  if (expiresAt === undefined) return 'Until removed';
  return expiresAt <= now ? 'Expired' : `Ends ${new Date(expiresAt).toLocaleString()}`;
}

export function normalizePhrase(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

/** Literal, case-insensitive phrases with Unicode word boundaries. Never evaluate user regex. */
export function phraseMatches(text: string, phrase: string): boolean {
  const haystack = normalizePhrase(text.slice(0, 4000));
  const needle = normalizePhrase(phrase);
  if (!needle) return false;
  const characters = Array.from(needle);
  const word = /[\p{L}\p{N}_]/u;
  let position = haystack.indexOf(needle);
  while (position !== -1) {
    // Two UTF-16 units are enough for one neighbouring Unicode character.
    // Avoid copying the whole caption for every rejected substring match.
    const before = Array.from(haystack.slice(Math.max(0, position - 2), position)).at(-1) || '';
    const end = position + needle.length;
    const after = Array.from(haystack.slice(end, end + 2))[0] || '';
    if ((!word.test(characters[0]!) || !word.test(before)) && (!word.test(characters.at(-1)!) || !word.test(after))) return true;
    position = haystack.indexOf(needle, position + 1);
  }
  return false;
}

export function matchingTopic(platform: string, text: string, rules: TopicRule[], now: number): TopicRule | undefined {
  if (platform !== 'youtube' && platform !== 'tiktok') return;
  return rules.find(rule => (rule.platform === 'all' || rule.platform === platform) && ruleIsActive(rule, now) && phraseMatches(text, rule.phrase));
}

export function normalizeTopic(input: TopicRule, now = Date.now()): TopicRule {
  if (!input || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.id) || !['youtube', 'tiktok', 'all'].includes(input.platform) || typeof input.phrase !== 'string') {
    throw new Error('Invalid topic filter.');
  }
  const phrase = input.phrase.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!phrase || phrase.length > 100) throw new Error('Enter a word or phrase of up to 100 characters.');
  const expiresAt = validateExpiry(input.expiresAt, now);
  return { id: input.id, phrase, platform: input.platform, ...(expiresAt === undefined ? {} : { expiresAt }) };
}

/** Old installations have no topic list. Ignore malformed persisted entries without losing other preferences. */
export function hydrateTopics(value: unknown): TopicRule[] {
  if (!Array.isArray(value)) return [];
  const rules: TopicRule[] = [];
  for (const candidate of value.slice(0, 100)) {
    try {
      const rule = normalizeTopic({ ...candidate, expiresAt: undefined });
      if (candidate.expiresAt !== undefined) {
        if (typeof candidate.expiresAt !== 'number' || !Number.isFinite(candidate.expiresAt)) continue;
        rule.expiresAt = candidate.expiresAt;
      }
      if (!rules.some(existing => existing.id === rule.id)) rules.push(rule);
    } catch { /* Ignore invalid stored rules. */ }
  }
  return rules;
}

export function nextRuleExpiry(rules: { expiresAt?: number }[], now = Date.now()): number | undefined {
  const expiries = rules.map(rule => rule.expiresAt).filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > now);
  return expiries.length ? Math.min(...expiries) : undefined;
}
