import { describe, expect, it } from 'vitest';
import { decision, freshState, hydrate, type Item, type TopicRule } from '../../lib/model';
import { DAY_MS, expiryFor, hydrateTopics, matchingTopic, nextRuleExpiry, normalizeTopic, phraseMatches, ruleIsActive, validateExpiry } from '../../lib/filter-rules';
import { blockCreator, undoCreator } from '../../lib/creator-undo';

const id = '00000000-0000-4000-8000-000000000001';
const topic: TopicRule = { id, phrase: 'election', platform: 'youtube' };
const item: Item = { id: 'example', platform: 'youtube', creator: '@example', title: 'Election news today', url: 'https://www.youtube.com/watch?v=example' };

describe('literal topic filters', () => {
  it.each([
    ['ELECTION news', 'election', true],
    ['An election result', ' election ', true],
    ['An electioneer', 'election', false],
    ['Pre-election news', 'election', true],
    ['An armchair review', 'AI', false],
    ['A chair and an AI tool', 'AI', true],
    ['ÅRETS   NYHETER', 'årets nyheter', true],
    ['Fullwidth ＡＩ tools', 'AI', true],
    ['C++ tutorial', 'C++', true],
    ['Anything at all', '.*', false],
    ['A literal .* example', '.*', true],
    ['𐐀𐐀', '𐐀', false],
    ['Anything', ' ', false],
  ])('matches %j with %j: %s', (text, phrase, expected) => {
    expect(phraseMatches(text, phrase)).toBe(expected);
  });

  it('limits inspected text, scopes platforms and ignores expired topics', () => {
    expect(phraseMatches('x'.repeat(4000) + ' election', 'election')).toBe(false);
    expect(matchingTopic('tiktok', item.title, [topic], 100)).toBeUndefined();
    expect(matchingTopic('tiktok', item.title, [{ ...topic, platform: 'all' }], 100)).toBeDefined();
    expect(matchingTopic('google', item.title, [{ ...topic, platform: 'all' }], 100)).toBeUndefined();
    expect(matchingTopic('youtube', item.title, [{ ...topic, expiresAt: 100 }], 100)).toBeUndefined();
  });

  it('honours creator exceptions, master and platform switches without inventing warnings', () => {
    const state = freshState(); state.topicRules = [topic];
    expect(decision(item, state, 100)).toMatchObject({ filter: true, topic, flags: [] });
    state.rules = [{ platform: 'youtube', key: '@example', name: 'Example', action: 'allow' }];
    expect(decision(item, state, 100).filter).toBe(false);
    state.rules = []; state.settings.enabled = false;
    expect(decision(item, state, 100).filter).toBe(false);
    state.settings.enabled = true; state.settings.platforms.youtube = false;
    expect(decision(item, state, 100).filter).toBe(false);
  });

  it('uses the supported caption passed by an adapter, with a title fallback', () => {
    const state = freshState(); state.topicRules = [{ ...topic, platform: 'tiktok' }];
    const post = { ...item, platform: 'tiktok' as const, title: 'A short video' };
    expect(decision(post, state, 100).filter).toBe(false);
    expect(decision(post, state, 100, [], 'Election news today').filter).toBe(true);
  });

  it('rejects malformed topics and keeps only valid saved entries', () => {
    expect(() => normalizeTopic({ ...topic, id: '-'.repeat(36) })).toThrow();
    expect(() => normalizeTopic({ ...topic, phrase: 'a'.repeat(101) })).toThrow();
    expect(() => normalizeTopic({ ...topic, platform: 'google' as never })).toThrow();
    expect(hydrateTopics([null, {}, topic, topic, { ...topic, id: id.replace(/1$/, '2'), expiresAt: Infinity }])).toEqual([topic]);
    expect(hydrateTopics([{ ...topic, expiresAt: 10 }])).toEqual([{ ...topic, expiresAt: 10 }]);
  });
});

describe('timed rules and migration', () => {
  it('keeps old saved preferences without requiring a storage reset', () => {
    const old = freshState(); old.settings.theme = 'dark'; old.settings.showPageButton = false;
    old.rules = [{ platform: 'youtube', key: '@example', name: 'Example', action: 'block' }];
    const { topicRules: _topics, setupCompleted: _setup, ...legacy } = old;
    const restored = hydrate(legacy);
    expect(restored.topicRules).toEqual([]); expect(restored.setupCompleted).toBe(false);
    expect(restored.settings).toEqual(old.settings); expect(restored.rules).toEqual(old.rules);
    expect(decision(item, restored, 100).filter).toBe(true);
  });

  it('expires exactly at the deadline and other applicable filters still apply', () => {
    const state = freshState();
    state.rules = [{ platform: 'youtube', key: '@example', name: 'Example', action: 'block', expiresAt: 200 }];
    expect(decision(item, state, 199).filter).toBe(true);
    expect(decision(item, state, 200).filter).toBe(false);
    state.topicRules = [{ ...topic, expiresAt: 300 }];
    expect(decision(item, state, 200)).toMatchObject({ filter: true, topic: state.topicRules[0] });
    expect(decision(item, state, 300).filter).toBe(false);
    expect(ruleIsActive({ expiresAt: NaN }, 100)).toBe(false);
  });

  it('validates duration and schedules only future finite deadlines', () => {
    expect(expiryFor('permanent', 100)).toBeUndefined();
    expect(expiryFor('day', 100)).toBe(100 + DAY_MS);
    expect(expiryFor('week', 100)).toBe(100 + 7 * DAY_MS);
    expect(expiryFor('month', 100)).toBe(100 + 30 * DAY_MS);
    for (const value of [100, NaN, Infinity, '200', 100 + 31 * DAY_MS]) expect(() => validateExpiry(value, 100)).toThrow();
    expect(nextRuleExpiry([{}, { expiresAt: 99 }, { expiresAt: Infinity }, { expiresAt: 300 }, { expiresAt: 200 }], 100)).toBe(200);
  });

  it('Undo restores the previous timed block and rejects a changed deadline', () => {
    const state = freshState();
    const previous = { platform: 'youtube' as const, key: '@example', name: 'Example', action: 'block' as const, expiresAt: 200 };
    state.rules = [previous];
    const input = { platform: 'youtube' as const, key: '@example', name: 'Example', token: id, expiresAt: 300 };
    const records = blockCreator(state, {}, input, 100);
    undoCreator(state, records, id); expect(state.rules).toEqual([previous]);
    const next = blockCreator(state, {}, input, 100);
    state.rules[0]!.expiresAt = 400;
    expect(() => undoCreator(state, next, id)).toThrow('preference changed');
  });
});
