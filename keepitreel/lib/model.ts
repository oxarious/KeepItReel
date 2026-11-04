import { hydrateTopics, matchingTopic, ruleIsActive } from './filter-rules';

export type Platform = 'youtube' | 'tiktok' | 'google';
export type DisplayMode = 'cover' | 'collapse' | 'label';
export type ThemePreference = 'system' | 'light' | 'dark';
export const normalizeTheme = (value: unknown): ThemePreference => value === 'light' || value === 'dark' ? value : 'system';
export interface ProtectionSettings {
  websites: boolean; links: boolean; email: boolean;
  excludedDomains: string[];
}
export const protectionDefaults: ProtectionSettings = {
  websites: false, links: true, email: false, excludedDomains: [],
};
export interface Settings {
  enabled: boolean; platforms: Record<Platform, boolean>; filterLabels: boolean;
  spamChecks: boolean; hideSuspicious: boolean;
  mode: DisplayMode; autoSkip: boolean; historyEnabled: boolean; theme: ThemePreference; showPageButton: boolean;
  protection: ProtectionSettings;
}
export interface Rule { platform: Platform; key: string; name: string; action: 'block' | 'allow'; expiresAt?: number; }
export interface TopicRule { id: string; phrase: string; platform: 'youtube' | 'tiktok' | 'all'; expiresAt?: number; }
export interface Evidence { label: string; source: 'platform'; observedAt: number; }
export interface PostFlag {
  code: 'ai-disclosure' | 'spam-secret' | 'spam-prize-fee' | 'spam-return' | 'spam-repeat';
  kind: 'disclosure' | 'spam'; title: string; detail: string;
}
export interface Item {
  id: string; platform: Platform; title: string; url: string;
  creator?: string; creatorName?: string; evidence?: Evidence; short?: boolean;
}
export interface HistoryEntry extends Item { reason: string; time: number; }
export interface State {
  version: 1; settings: Settings; rules: Rule[]; topicRules: TopicRule[]; setupCompleted: boolean; history: HistoryEntry[];
  evidence: Record<string, Evidence>; totalFiltered: number;
}
export const defaults: Settings = {
  enabled: true, platforms: { youtube: true, tiktok: true, google: true },
  filterLabels: true, spamChecks: true, hideSuspicious: false, mode: 'cover', autoSkip: false, historyEnabled: true, theme: 'system', showPageButton: true,
  protection: protectionDefaults,
};
export const freshState = (): State => ({ version: 1, settings: structuredClone(defaults), rules: [], topicRules: [], setupCompleted: false, history: [], evidence: {}, totalFiltered: 0 });
export function hydrate(raw: Partial<State> | undefined): State {
  const s = freshState();
  if (!raw || raw.version !== 1) return s;
  const old = raw.settings?.protection;
  // Explicit fields discard removed integration flags during migration from 0.2.
  const protection: ProtectionSettings = {
    websites: old?.websites === true, links: old?.links !== false, email: old?.email === true,
    excludedDomains: Array.isArray(old?.excludedDomains) ? old.excludedDomains.filter(d => typeof d === 'string').slice(0, 300) : [],
  };
  return { ...s, ...raw, topicRules: hydrateTopics(raw.topicRules), setupCompleted: raw.setupCompleted === true, settings: { ...defaults, ...raw.settings, spamChecks: raw.settings?.spamChecks !== false, hideSuspicious: raw.settings?.hideSuspicious === true, theme: normalizeTheme(raw.settings?.theme), showPageButton: raw.settings?.showPageButton !== false, platforms: { ...defaults.platforms, ...raw.settings?.platforms }, protection } };
}
export function normalizeCreator(platform: Platform, input: string): string {
  const value = input.trim();
  if (!value) throw new Error('Enter a channel, creator, or domain.');
  if (platform === 'google') {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (!url.hostname.includes('.') && url.hostname !== 'localhost' && !url.hostname.startsWith('['))) throw new Error('Enter a valid domain, such as example.com.');
    return url.hostname.toLowerCase().replace(/^www\./, '');
  }
  let handle = value;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const domain = platform === 'youtube' ? 'youtube.com' : 'tiktok.com';
    if (url.hostname !== domain && !url.hostname.endsWith(`.${domain}`)) throw new Error(`Use a ${domain} profile URL.`);
    handle = decodeURIComponent(url.pathname).replace(/\/$/, '');
    if (platform === 'youtube') handle = handle.replace(/\/(?:featured|videos|shorts|streams|playlists|community|posts|about)$/, '');
  }
  handle = handle.replace(/^\//, '');
  if (platform === 'youtube' && /^channel\/UC[\w-]+$/.test(handle)) return handle;
  if (!handle.startsWith('@')) handle = `@${handle}`;
  if (!/^@[\p{L}\p{N}_.-]{1,100}$/u.test(handle)) throw new Error('Use a creator @handle or profile URL.');
  return handle.toLowerCase();
}
// Site pause/exclusions preserve the exact host; Google source rules strip www.
export function normalizeProtectionDomain(input: string): string {
  normalizeCreator('google', input);
  return new URL(input.includes('://') ? input : `https://${input}`).hostname.toLowerCase();
}
export const cacheKey = (item: Item) => `${item.platform}:${item.id}`;
export function ruleFor(item: Item, rules: Rule[], now = Date.now()): Rule | undefined {
  if (!item.creator) return;
  const matches = rules.filter(r => ruleIsActive(r, now) && r.platform === item.platform && (r.key === item.creator || (item.platform === 'google' && item.creator!.endsWith(`.${r.key}`))));
  // Most specific domain wins; explicit allow wins for the same identity.
  return matches.sort((a, b) => b.key.length - a.key.length || (a.action === 'allow' ? -1 : 1))[0];
}
export function decision(item: Item, state: State, now = Date.now(), spamFlags: PostFlag[] = [], text = item.title): { filter: boolean; reason?: string; evidence?: Evidence; flags?: PostFlag[]; topic?: TopicRule } {
  if (!state.settings.enabled || !state.settings.platforms[item.platform]) return { filter: false };
  const rule = ruleFor(item, state.rules, now);
  if (rule?.action === 'block') return { filter: true, reason: `${item.platform === 'google' ? 'Source' : 'Creator'} on your blocklist` };
  const observed = item.evidence ?? state.evidence[cacheKey(item)];
  const evidence = item.platform !== 'google' && observed && now - observed.observedAt < 30 * 86400000 ? observed : undefined;
  const flags: PostFlag[] = state.settings.spamChecks && item.platform !== 'google' ? [...spamFlags] : [];
  if (evidence) flags.unshift({ code: 'ai-disclosure', kind: 'disclosure', title: 'AI disclosure found', detail: `${item.platform === 'youtube' ? 'YouTube' : 'TikTok'} labels this item: ${evidence.label}. This can include significant editing; it does not establish that the whole post was AI-generated.${item.evidence ? '' : ' The disclosure was previously observed on this device (up to 30 days).'}` });
  if (rule?.action === 'allow') return { filter: false, flags, evidence };
  const topic = matchingTopic(item.platform, text, state.topicRules, now);
  if (topic) return { filter: true, reason: `Matches your topic filter: “${topic.phrase}”`, topic, flags, evidence };
  if (state.settings.filterLabels && evidence) {
    return { filter: true, reason: `${item.platform === 'youtube' ? 'YouTube' : 'TikTok'} disclosure: ${evidence.label}`, evidence, flags };
  }
  if (state.settings.hideSuspicious && flags.some(flag => flag.kind === 'spam')) return { filter: true, reason: 'Flagged · Possible spam', flags, evidence };
  return { filter: false, flags, evidence };
}
export function safeUrl(url: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); } catch { return false; }
}
