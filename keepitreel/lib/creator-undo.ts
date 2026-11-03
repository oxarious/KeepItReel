import { normalizeCreator, type Platform, type Rule, type State } from './model';

export interface CreatorUndo { applied: Rule; previous?: Rule; createdAt: number; }
export type CreatorUndos = Record<string, CreatorUndo>;
export function clearCreatorUndos(records: CreatorUndos, platform: string, key: string): CreatorUndos {
  return Object.fromEntries(Object.entries(records).filter(([, entry]) => entry?.applied && !(entry.applied.platform === platform && entry.applied.key === key)));
}
export function blockCreator(state: State, records: CreatorUndos, input: { platform: Platform; key: string; name: string; token: string }, now = Date.now()): CreatorUndos {
  if (!['youtube', 'tiktok'].includes(input.platform) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.token) || Object.hasOwn(records, input.token)) throw new Error('Invalid creator action.');
  const key = normalizeCreator(input.platform, input.key);
  const previous = state.rules.find(rule => rule.platform === input.platform && rule.key === key);
  const rest = state.rules.filter(rule => !(rule.platform === input.platform && rule.key === key));
  if (rest.length >= 1000) throw new Error('Your list has reached 1,000 entries.');
  const applied: Rule = { platform: input.platform, key, name: String(input.name).slice(0, 120), action: 'block' };
  state.rules = [...rest, applied];
  const next = clearCreatorUndos(records, input.platform, key);
  next[input.token] = { applied, ...(previous ? { previous: { ...previous } } : {}), createdAt: now };
  // Keep a bounded browser-session history, including when the worker sleeps.
  return Object.fromEntries(Object.entries(next).sort((a, b) => b[1].createdAt - a[1].createdAt).slice(0, 20));
}
export function undoCreator(state: State, records: CreatorUndos, token: string): CreatorUndos {
  const entry = records[token];
  const applied = entry?.applied;
  const current = applied && state.rules.find(rule => rule.platform === applied.platform && rule.key === applied.key);
  if (!applied || !current || current.action !== 'block' || current.name !== applied.name) throw new Error('Undo is no longer available because this creator preference changed. Manage it in Your lists.');
  state.rules = state.rules.filter(rule => !(rule.platform === applied.platform && rule.key === applied.key));
  if (entry.previous) state.rules.push({ ...entry.previous });
  return clearCreatorUndos(records, applied.platform, applied.key);
}
