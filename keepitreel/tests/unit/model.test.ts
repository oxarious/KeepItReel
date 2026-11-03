import { describe, it, expect } from 'vitest';
import { cacheKey, decision, freshState, normalizeCreator, normalizeProtectionDomain, type Item } from '../../lib/model';
import { platformFor, collectYoutube, collectTiktok, collectGoogle, disclosure } from '../../lib/adapters';
import { JSDOM } from 'jsdom';
import { summarizeResult, validateText, validId } from '../../supabase/functions/analyze/domain';
const item: Item = { platform:'youtube',id:'abc',title:'An AI-generated title',url:'https://www.youtube.com/watch?v=abc',creator:'@creator' };
describe('filter policy',()=>{
  it('does not mistake titles or missing evidence for AI origin',()=>expect(decision(item,freshState()).filter).toBe(false));
  it('uses platform evidence but permits an explicit exception',()=>{
    const s=freshState();const labelled={...item,evidence:{source:'platform' as const,label:'Altered or synthetic content',observedAt:Date.now()}};
    expect(decision(labelled,s).filter).toBe(true);
    s.rules=[{platform:'youtube',key:'@creator',name:'Creator',action:'allow'}];expect(decision(labelled,s).filter).toBe(false);
  });
  it('expires remembered disclosures after 30 days',()=>{const s=freshState();s.evidence[cacheKey(item)]={source:'platform',label:'AI-generated',observedAt:1};expect(decision(item,s,31*86400000).filter).toBe(false);expect(decision(item,s,1000).filter).toBe(true);});
  it('respects the master switch and platform switch',()=>{const s=freshState();s.rules=[{platform:'youtube',key:'@creator',name:'Creator',action:'block'}];expect(decision(item,s).filter).toBe(true);s.settings.enabled=false;expect(decision(item,s).filter).toBe(false);s.settings.enabled=true;s.settings.platforms.youtube=false;expect(decision(item,s).filter).toBe(false);});
  it('matches subdomains, not suffix lookalikes, and uses the most specific exception',()=>{const s=freshState();s.rules=[{platform:'google',key:'example.com',name:'Example',action:'block'},{platform:'google',key:'docs.example.com',name:'Docs',action:'allow'}];expect(decision({...item,platform:'google',creator:'news.example.com'},s).filter).toBe(true);expect(decision({...item,platform:'google',creator:'notexample.com'},s).filter).toBe(false);expect(decision({...item,platform:'google',creator:'docs.example.com'},s).filter).toBe(false);});
});
describe('identity normalization',()=>{
  it('keeps exact site pause hosts, supports local test hosts and rejects credential URLs',()=>{
    expect(normalizeProtectionDomain('https://www.Example.com/path')).toBe('www.example.com');
    expect(normalizeProtectionDomain('localhost')).toBe('localhost');
    expect(normalizeProtectionDomain('http://[::1]:8765/')).toBe('[::1]');
    expect(()=>normalizeProtectionDomain('https://user:secret@example.com')).toThrow();
    expect(()=>normalizeProtectionDomain('javascript:alert(1)')).toThrow();
  });
  it('accepts supported profile URLs and preserves case-sensitive channel IDs',()=>{expect(normalizeCreator('youtube','https://www.youtube.com/@Example')).toBe('@example');expect(normalizeCreator('youtube','https://www.youtube.com/channel/UCaBcD')).toBe('channel/UCaBcD');expect(normalizeCreator('google','https://www.Example.com/path')).toBe('example.com');});
  it('rejects spoofed hosts and executable URLs',()=>{expect(()=>normalizeCreator('youtube','https://youtube.com.evil.org/@name')).toThrow();expect(()=>normalizeCreator('google','javascript:alert(1)')).toThrow();expect(platformFor('tiktok.com.evil.org')).toBeUndefined();});
});
const dom=(html:string,url='https://www.youtube.com/')=>new JSDOM(html,{url}).window.document;
describe('page adapters',()=>{
  it('recognizes the current YouTube AI badge without relying on its short visible text',()=>{const d=dom('<yt-metadata-badge-renderer><badge-shape aria-label="AI: Content was made with AI"><div>AI</div></badge-shape></yt-metadata-badge-renderer>');expect(disclosure(d.body,'youtube')?.label).toBe('Content was made with AI');});
  it('finds TikTok post identity in the current player markup when no video link exists',()=>{const d=dom('<article data-e2e="recommend-list-item-container"><div id="xgwrapper-0-7697839909842767111"><video></video></div><span data-e2e="aigc-label">AI-generated</span></article>','https://www.tiktok.com/');const i=collectTiktok(d)[0]?.item;expect(i?.id).toBe('7697839909842767111');expect(i?.creator).toBeUndefined();expect(i?.evidence?.label).toBe('AI-generated');});
  it('extracts a disclosure only from a recognised component',()=>{const d=dom('<article><h3>AI-generated</h3><p>Altered or synthetic content</p></article>');expect(disclosure(d.body,'youtube')).toBeUndefined();d.body.innerHTML+='<ytd-info-panel-content-renderer><span>Altered or synthetic content</span></ytd-info-panel-content-renderer>';expect(disclosure(d.body,'youtube')?.source).toBe('platform');});
  it('does not infer generation from an unrelated provenance heading',()=>{const d=dom('<yt-video-attribute-view-model>How this content was made</yt-video-attribute-view-model>');expect(disclosure(d.body,'youtube')).toBeUndefined();});
  it('deduplicates nested YouTube cards',()=>{const d=dom('<ytd-rich-item-renderer><yt-lockup-view-model><a href="/watch?v=one" id="video-title">Title</a><ytd-channel-name><a href="/@creator">Creator</a></ytd-channel-name></yt-lockup-view-model></ytd-rich-item-renderer>');const cards=collectYoutube(d);expect(cards).toHaveLength(1);expect(cards[0]?.item.creator).toBe('@creator');});
  it('keeps TikTok descriptions out of the disclosure classifier and handles Explore',()=>{const d=dom('<div data-e2e="explore-item"><a href="https://www.tiktok.com/@name/video/123">Play</a><div data-e2e="video-desc">AI-generated content</div></div>','https://www.tiktok.com/explore');expect(collectTiktok(d)[0]?.item.evidence).toBeUndefined();expect(collectTiktok(d)[0]?.item.short).toBe(false);d.querySelector('[data-e2e="explore-item"]')!.innerHTML+='<span data-e2e="aigc-label">AI-generated</span>';expect(collectTiktok(d)[0]?.item.evidence?.label).toBe('AI-generated');});
  it('finds only actual Google result links',()=>{const d=dom('<div id="search"><div class="MjjYud"><a href="https://example.com/a"><h3>Result</h3></a></div><div class="MjjYud"><a href="javascript:alert(1)"><h3>Bad</h3></a></div></div>','https://www.google.com/search?q=test');expect(collectGoogle(d)).toHaveLength(1);expect(collectGoogle(d)[0]?.item.creator).toBe('example.com');});
});
describe('cloud input and output',()=>{
  it('counts billing blocks on the server and bounds requests',()=>{expect(validateText('word '.repeat(301)).credits).toBe(4);expect(()=>validateText('word '.repeat(299))).toThrow();expect(()=>validateText('word '.repeat(1001))).toThrow();expect(()=>validateText({text:'x'})).toThrow();});
  it('never certifies human origin or exposes provider text',()=>{expect(summarizeResult({prediction_short:'Human',text:'secret'},'test')).toEqual({label:'No strong AI signal',model:'test'});expect(summarizeResult({prediction_short:'Mixed'},'test').label).toContain('Uncertain');expect(validId('a/../../secret')).toBe(false);});
});
