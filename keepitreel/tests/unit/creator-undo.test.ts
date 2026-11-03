import { describe, expect, it } from 'vitest';
import { blockCreator, undoCreator, clearCreatorUndos, type CreatorUndos } from '../../lib/creator-undo';
import { freshState, normalizeCreator } from '../../lib/model';
import { collectYoutube } from '../../lib/adapters';
import { JSDOM } from 'jsdom';
const token = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const action = (n = 1) => ({ platform: 'youtube' as const, key: '@creator', name: 'Creator', token: token(n) });

describe('creator undo', () => {
  it('removes a new block without changing unrelated rules or preferences', () => {
    const state = freshState(); state.settings.theme = 'dark';
    state.rules.push({ platform: 'google', key: 'example.com', name: 'Example', action: 'allow' });
    const records = blockCreator(state, {}, action());
    expect(state.rules).toHaveLength(2);
    expect(undoCreator(state, records, token(1))).toEqual({});
    expect(state.rules).toEqual([{ platform: 'google', key: 'example.com', name: 'Example', action: 'allow' }]);
    expect(state.settings.theme).toBe('dark');
  });
  it('restores the exact previous allow choice', () => {
    const state = freshState(); const previous = { platform: 'youtube' as const, key: '@creator', name: 'My saved name', action: 'allow' as const };
    state.rules.push(previous);
    const records = blockCreator(state, {}, action());
    expect(state.rules[0]?.action).toBe('block');
    undoCreator(state, records, token(1)); expect(state.rules).toEqual([previous]);
  });
  it('rejects stale undo after a newer change, even an identical-looking block', () => {
    const state = freshState(); const records = blockCreator(state, {}, action());
    const invalidated = clearCreatorUndos(records, 'youtube', '@creator');
    expect(() => undoCreator(state, invalidated, token(1))).toThrow('preference changed');
    expect(state.rules[0]?.action).toBe('block');
    const next = blockCreator(state, records, action(2));
    expect(() => undoCreator(state, next, token(1))).toThrow();
    expect(next[token(2)]).toBeDefined();
  });
  it('bounds browser-session history and rejects invalid action tokens', () => {
    const state = freshState(); let records: CreatorUndos = {};
    for (let i = 1; i <= 25; i++) records = blockCreator(state, records, { ...action(i), key: `@creator${i}` }, i);
    expect(Object.keys(records)).toHaveLength(20); expect(records[token(25)]).toBeDefined(); expect(records[token(1)]).toBeUndefined();
    expect(() => blockCreator(state, records, { ...action(), token: '__proto__' })).toThrow('Invalid');
  });
});

describe('YouTube creator and active Short identity', () => {
  it('keeps modern thumbnail cards with plain-text bylines without guessing a creator', () => {
    const doc = new JSDOM('<ytd-rich-item-renderer><div id="content"><yt-lockup-view-model><div class="ytLockupViewModelHost"><a href="/watch?v=one">Thumbnail</a><div class="ytLockupMetadataViewModelTextContainer"><h3><a class="ytLockupMetadataViewModelTitle" href="/watch?v=one">A video</a></h3><div class="ytContentMetadataViewModelMetadataRow"><span>Creator display name</span></div></div></div></yt-lockup-view-model></div></ytd-rich-item-renderer>', {url:'https://www.youtube.com/'}).window.document;
    const records = collectYoutube(doc); expect(records).toHaveLength(1);
    expect(records[0].item.title).toBe('A video'); expect(records[0].item.creator).toBeUndefined();
    expect(records[0].controlsRoot?.className).toBe('ytLockupMetadataViewModelTextContainer');
    expect(records[0].root.tagName).toBe('YTD-RICH-ITEM-RENDERER');
    doc.querySelector('ytd-rich-item-renderer')!.insertAdjacentHTML('beforeend', '<a href="/@ActualOwner">Actual owner</a>');
    expect(collectYoutube(doc)[0].item.creator).toBe('@actualowner');
  });
  it('deduplicates lockup descendants inside every supported outer card', () => {
    for (const tag of ['ytd-rich-item-renderer', 'ytd-grid-video-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer', 'yt-lockup-view-model']) {
      const doc = new JSDOM(`<${tag}><yt-lockup-view-model><div class="ytLockupViewModelHost"><a href="/watch?v=one">Video</a><ytd-channel-name><a href="/@Owner">Owner</a></ytd-channel-name></div></yt-lockup-view-model></${tag}>`, {url:'https://www.youtube.com/'}).window.document;
      expect(collectYoutube(doc)).toHaveLength(1); expect(collectYoutube(doc)[0].root.tagName).toBe(tag.toUpperCase());
    }
  });
  it('supports a standalone lockup host and resolves links in a later metadata row', () => {
    const doc = new JSDOM('<div class="ytLockupViewModelHost"><a href="/watch?v=one">Video</a><div class="ytContentMetadataViewModelMetadataRow">Public metadata</div><div class="ytContentMetadataViewModelMetadataRow"><a href="/@Owner">Owner</a></div><a href="/@Topic">Other topic</a></div>', {url:'https://www.youtube.com/'}).window.document;
    const records = collectYoutube(doc); expect(records).toHaveLength(1); expect(records[0].item.creator).toBe('@owner');
  });
  it('does not turn multiple creator links into a guessed block target', () => {
    const doc = new JSDOM('<yt-lockup-view-model><a href="/watch?v=one">Video</a><div class="ytContentMetadataViewModelMetadataRow"><a href="/@First">First</a><a href="/@Second">Second</a></div></yt-lockup-view-model>', {url:'https://www.youtube.com/'}).window.document;
    expect(collectYoutube(doc)[0].item.creator).toBeUndefined();
  });
  it('normalizes creator tab links while preserving channel ID case', () => {
    expect(normalizeCreator('youtube', 'https://www.youtube.com/@Creator/shorts')).toBe('@creator');
    expect(normalizeCreator('youtube', 'https://www.youtube.com/@S%C3%B6der/shorts')).toBe('@söder');
    expect(normalizeCreator('youtube', 'https://www.youtube.com/channel/UCaBcD/videos')).toBe('channel/UCaBcD');
    expect(() => normalizeCreator('youtube', 'https://www.youtube.com/@Creator/unrecognised/path')).toThrow();
  });
  it('collects the observed absolute-permalink layout and channel bar, not a topic channel', () => {
    const doc = new JSDOM('<ytd-shorts><ytd-reel-video-renderer><div id="shorts-player"><video></video><a href="https://www.youtube.com/shorts/one">Video</a></div><yt-reel-channel-bar-view-model><a href="/@Owner/shorts">@Owner</a></yt-reel-channel-bar-view-model><a href="/channel/UCtopic/shorts">Topic</a></ytd-reel-video-renderer></ytd-shorts>', { url: 'https://www.youtube.com/shorts/one' }).window.document;
    const records = collectYoutube(doc);
    expect(records).toHaveLength(1); expect(records[0]?.item.creator).toBe('@owner'); expect(records[0]?.item.short).toBe(true);
    expect(records[0]?.controlsRoot?.id).toBe('shorts-player');
    doc.querySelector('yt-reel-channel-bar-view-model a')!.remove();
    expect(collectYoutube(doc)[0]?.item.creator).toBeUndefined();
  });
  it('ignores preloaded reels and follows recycled active identities', () => {
    const dom = new JSDOM('<ytd-shorts><ytd-reel-video-renderer video-id="one" is-active><yt-reel-channel-bar-view-model><a href="/@First/shorts">First</a></yt-reel-channel-bar-view-model></ytd-reel-video-renderer><ytd-reel-video-renderer video-id="two"><yt-reel-channel-bar-view-model><a href="/@Second/shorts">Second</a></yt-reel-channel-bar-view-model></ytd-reel-video-renderer></ytd-shorts>', { url: 'https://www.youtube.com/shorts/one' });
    expect(collectYoutube(dom.window.document).map(r => r.item.creator)).toEqual(['@first']);
    const reels = dom.window.document.querySelectorAll('ytd-reel-video-renderer');
    reels[0]!.removeAttribute('is-active'); reels[1]!.setAttribute('is-active', ''); dom.reconfigure({ url: 'https://www.youtube.com/shorts/two' });
    expect(collectYoutube(dom.window.document).map(r => r.item.creator)).toEqual(['@second']);
    reels[1]!.querySelector('a')!.remove(); expect(collectYoutube(dom.window.document)[0]?.item.creator).toBeUndefined();
  });
  it('fails open for ambiguous reels and does not treat a watch comment as its creator', () => {
    const reels = new JSDOM('<ytd-shorts><ytd-reel-video-renderer></ytd-reel-video-renderer><ytd-reel-video-renderer></ytd-reel-video-renderer></ytd-shorts>', { url: 'https://www.youtube.com/shorts/one' }).window.document;
    expect(collectYoutube(reels)).toEqual([]);
    const watch = new JSDOM('<ytd-watch-flexy><div id="player"></div><div id="primary"><h1>Video</h1><ytd-comments><a href="/@Commenter">Commenter</a></ytd-comments></div></ytd-watch-flexy>', { url: 'https://www.youtube.com/watch?v=one' }).window.document;
    expect(collectYoutube(watch)[0]?.item.creator).toBeUndefined();
  });
});
