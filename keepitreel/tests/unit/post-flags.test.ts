import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { PostFlagger, textFlags } from '../../lib/post-flags';
import { cacheKey, decision, freshState, hydrate, type Item } from '../../lib/model';
import { collectYoutube, collectTiktok } from '../../lib/adapters';

const item = (id = 'one', creator = '@one', title = 'A normal post'): Item => ({ platform: 'youtube', id, creator, title, url: `https://www.youtube.com/watch?v=${id}` });
const promotion = 'A special investment offer for you today. Message me on Telegram for the details and join our crypto group.';
const sample = (id: string, creator = `@${id}`, postText = promotion) => ({ item: item(id, creator), postText });
const codes = (text: string) => textFlags(text).map(flag => flag.code);

describe('local post review patterns', () => {
  it('explains direct secret requests without claiming AI authorship', () => {
    expect(codes('Send me your verification code to join the group.')).toEqual(['spam-secret']);
    expect(codes('Share your seed phrase with us.')).toEqual(['spam-secret']);
    expect(textFlags('Give us your password.')[0].detail).toContain('not proof');
  });
  it('requires combinations for promotional return and prize-fee flags', () => {
    expect(codes('Guaranteed daily returns. DM me on Telegram to invest.')).toEqual(['spam-return']);
    expect(codes('Claim your prize and pay a processing fee first.')).toEqual(['spam-prize-fee']);
    expect(codes('Guaranteed returns')).toEqual([]);
    expect(codes('Our shipping fee is $5.')).toEqual([]);
    expect(codes('Claim your prize at the community fair.')).toEqual([]);
  });
  it('does not treat AI words, ordinary promotions or obvious safety education as origin evidence', () => {
    for (const text of ['AI-generated content explained', 'A polished, repetitive, enthusiastic introduction!', 'Message me about our new store offer', 'Never send me your verification code.', 'Warning: guaranteed daily returns. DM me on Telegram.', 'How to avoid scams that say claim your prize and pay a fee.']) expect(codes(text)).toEqual([]);
  });
  it('requires three distinct posts and multiple known creators for repeated promotions', () => {
    const flagger = new PostFlagger();
    expect(flagger.assess([sample('a'), sample('b')], 1000).get('youtube:a')).toEqual([]);
    const flags = flagger.assess([sample('c')], 2000).get('youtube:c');
    expect(flags?.[0].code).toBe('spam-repeat');
    expect(flags?.[0].detail).toContain('in this tab');
    expect(flagger.assess([sample('a'), sample('b')], 3000).get('youtube:a')?.[0].code).toBe('spam-repeat');
  });
  it('does not count rescans, duplicate cards or a single creator as a campaign', () => {
    const flagger = new PostFlagger();
    for (let n = 0; n < 10; n++) expect(flagger.assess([sample('a'), sample('a')], n).get('youtube:a')).toEqual([]);
    expect(new PostFlagger().assess([sample('a', '@same'), sample('b', '@same'), sample('c', '@same')], 100).get('youtube:a')).toEqual([]);
    expect(new PostFlagger().assess([sample('a', ''), sample('b', ''), sample('c', '')], 100).get('youtube:a')).toEqual([]);
  });
  it('expires previous observations, clears them and replaces corrected text', () => {
    const flagger = new PostFlagger(); flagger.assess([sample('a'), sample('b')], 0);
    expect(flagger.assess([sample('c')], 15 * 60000).get('youtube:c')).toEqual([]);
    flagger.assess([sample('a'), sample('b')], 15 * 60000);
    expect(flagger.assess([sample('c')], 15 * 60000).get('youtube:c')?.[0].code).toBe('spam-repeat');
    expect(flagger.assess([sample('b', '@b', 'A different caption'), sample('c')], 15 * 60000 + 1).get('youtube:c')).toEqual([]);
    flagger.clear(); expect(flagger.assess([sample('a')], 20 * 60000).get('youtube:a')).toEqual([]);
  });
  it('bounds scans to 200 posts, caps text and skips Google', () => {
    const samples = Array.from({ length: 220 }, (_, n) => sample(`post${n}`));
    const flagger = new PostFlagger(); expect(flagger.assess(samples, 1000).size).toBe(200);
    expect(flagger.assess([{ item: { ...item(), platform: 'google' }, postText: 'Send me your password.' }], 2000).size).toBe(0);
    expect(codes('x'.repeat(4000) + ' Send me your password.')).toEqual([]);
    const expanding = 'ﬃ'.repeat(1400) + ' ' + promotion;
    expect(new PostFlagger().assess([sample('a', '@a', expanding), sample('b', '@b', expanding), sample('c', '@c', expanding)], 0).get('youtube:a')).toEqual([]);
  });
});

describe('flag and filter preferences', () => {
  it('shows suspicion without hiding by default and permits opt-in auto filtering', () => {
    const s = freshState(), post = item(), flags = textFlags('Send me your password.');
    expect(decision(post, s, 1000, flags)).toMatchObject({ filter: false, flags });
    s.settings.hideSuspicious = true; expect(decision(post, s, 1000, flags).filter).toBe(true);
    s.settings.spamChecks = false; expect(decision(post, s, 1000, flags)).toMatchObject({ filter: false, flags: [] });
  });
  it('preserves allow/block priority and master/platform pause', () => {
    const s = freshState(), post = item(), flags = textFlags('Send me your password.'); s.settings.hideSuspicious = true;
    s.rules = [{ platform: 'youtube', key: '@one', name: 'One', action: 'allow' }];
    expect(decision(post, s, 1000, flags)).toMatchObject({ filter: false, flags });
    s.rules[0].action = 'block'; expect(decision(post, s, 1000, []).reason).toContain('blocklist');
    s.settings.enabled = false; expect(decision(post, s, 1000, flags)).toEqual({ filter: false });
    s.settings.enabled = true; s.settings.platforms.youtube = false; expect(decision(post, s, 1000, flags)).toEqual({ filter: false });
  });
  it('labels disclosures even when automatic disclosure filtering is off and expires cached evidence', () => {
    const s = freshState(), post = item(); s.settings.filterLabels = false;
    s.evidence[cacheKey(post)] = { source: 'platform', label: 'AI-generated', observedAt: 1000 };
    expect(decision(post, s, 2000)).toMatchObject({ filter: false, flags: [{ code: 'ai-disclosure', kind: 'disclosure' }] });
    expect(decision(post, s, 2000).flags?.[0].detail).toContain('previously observed');
    expect(decision(post, s, 31 * 86400000).flags).toEqual([]);
  });
  it('migrates old preferences without opting into automatic hiding and rejects nonboolean choices', () => {
    const s = freshState(); delete (s.settings as any).spamChecks; delete (s.settings as any).hideSuspicious;
    expect(hydrate(s).settings).toMatchObject({ spamChecks: true, hideSuspicious: false });
    (s.settings as any).hideSuspicious = 'true'; (s.settings as any).spamChecks = 0;
    expect(hydrate(s).settings).toMatchObject({ spamChecks: true, hideSuspicious: false });
    s.settings.hideSuspicious = true; s.settings.spamChecks = false;
    expect(hydrate(s).settings).toMatchObject({ spamChecks: false, hideSuspicious: true });
  });
});

describe('published post scope', () => {
  it('reads supported captions without comments, editors or injected controls', () => {
    const doc = new JSDOM('<ytd-rich-item-renderer><a id="video-title" href="/watch?v=one">Ordinary title</a><ytd-channel-name><a href="/@one">One</a></ytd-channel-name><form><div id="description-text">Send me your password.</div></form><ytd-comments><div class="metadata-snippet-text">Send me your seed phrase.</div></ytd-comments><clearfeed-panel>Guaranteed profits. DM me.</clearfeed-panel><div class="metadata-snippet-text">Published caption</div></ytd-rich-item-renderer>', { url: 'https://www.youtube.com/' }).window.document;
    const record = collectYoutube(doc)[0]; expect(record.postText).toBe('Published caption'); expect(record.item).not.toHaveProperty('postText');
    const tiktok = new JSDOM('<div data-e2e="feed-item"><a href="https://www.tiktok.com/@one/video/123">Play</a><div data-e2e="video-desc">Published TikTok caption</div><aside>Send me your password.</aside></div>', { url: 'https://www.tiktok.com/' }).window.document;
    expect(collectTiktok(tiktok)[0].postText).toBe('Published TikTok caption');
    tiktok.querySelector('[data-e2e="video-desc"]')!.setAttribute('contenteditable', 'plaintext-only');
    expect(collectTiktok(tiktok)[0].postText).toBe('TikTok post');
    expect(collectTiktok(tiktok)[0].item.title).toBe('TikTok post');
  });
});
