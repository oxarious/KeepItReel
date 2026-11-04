import { test, expect, chromium, type BrowserContext, type Page, type Locator } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
const extension=path.resolve('.output/chrome-mv3');
let context:BrowserContext;let id:string;let options:Page;
const youtube=(label=true,id='example')=>`<ytd-rich-item-renderer><div class="visual">Video preview</div><a href="/watch?v=${id}" id="video-title">${label?'A fictional valley':'How to detect AI-generated content'}</a><ytd-channel-name><a href="/@${id}">@${id}</a></ytd-channel-name>${label?'<ytd-info-panel-content-renderer><span>Altered or synthetic content</span></ytd-info-panel-content-renderer>':''}<video></video></ytd-rich-item-renderer>`;
const html=(body:string)=>`<!doctype html><html lang="en"><head><style>body{font:16px system-ui;margin:30px}ytd-rich-item-renderer,[data-e2e="feed-item"],.MjjYud{display:block;position:relative;border:1px solid #ddd;min-height:260px;margin:20px;padding:20px}.visual{height:100px;background:#eee}a{display:block}video{width:200px;height:80px}</style></head><body>${body}</body></html>`;
async function fixture(url:string,body:string){const page=await context.newPage();await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:html(body)}):route.abort());await page.goto(url);return page;}
async function action(data:Record<string,unknown>){return options.evaluate(async d=>(globalThis as any).chrome.runtime.sendMessage({namespace:'clearfeed',...d}),data);}
async function openVideo(scope: Page | Locator) {
 const trigger=scope.locator('clearfeed-panel .email-trigger').first();
 await expect(trigger).toBeVisible();
 if(await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
 await expect(scope.locator('clearfeed-panel .email-analysis:visible')).toHaveCount(1);
}
async function clickVideo(scope: Page | Locator, name: string) { await openVideo(scope); await scope.getByRole('button',{name,exact:true}).click(); }
const shortScene=()=>`<style>ytd-shorts{display:block}ytd-reel-video-renderer{display:block;position:relative;width:500px;height:700px}ytd-reel-video-renderer[hidden]{display:none}#shorts-player{position:relative;width:350px;height:620px;margin:auto;background:#ddd}yt-reel-channel-bar-view-model{display:block}</style><ytd-shorts><ytd-reel-video-renderer id="first"><div id="shorts-player"><video muted></video><a class="permalink" href="https://www.youtube.com/shorts/one">First short</a></div><yt-reel-channel-bar-view-model><a href="/@First/shorts">@First</a></yt-reel-channel-bar-view-model><a href="/channel/UCtopic/shorts">A topic channel</a></ytd-reel-video-renderer><ytd-reel-video-renderer id="second" video-id="two"><div id="shorts-player"><video muted></video><a class="permalink" href="/shorts/two">Second short</a></div><yt-reel-channel-bar-view-model><a href="/@Second/shorts">@Second</a></yt-reel-channel-bar-view-model></ytd-reel-video-renderer></ytd-shorts><div id="navigation-button-down"><button aria-label="Next video">Next</button></div>`;
async function wireNext(page:Page){await page.evaluate(()=>{document.querySelector('#navigation-button-down button')!.addEventListener('click',()=>{(window as any).nativeNextCalls=((window as any).nativeNextCalls||0)+1;(document.querySelector('#first')as HTMLElement).hidden=true;document.querySelector('#second')!.setAttribute('is-active','');history.pushState(null,'','/shorts/two');document.dispatchEvent(new Event('yt-navigate-finish'));});});}
test.beforeAll(async()=>{context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:1360,height:1000}});let worker=context.serviceWorkers()[0];if(!worker)worker=await context.waitForEvent('serviceworker');id=new URL(worker.url()).host;options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);});
test.beforeEach(async()=>{await action({type:'reset'});await options.goto(`chrome-extension://${id}/options.html`);});
test.afterAll(async()=>{await context.close();});
const homeLockup = (id: string, creator = '') => `<ytd-rich-item-renderer id="card-${id}"><div id="content"><yt-lockup-view-model><div class="ytLockupViewModelHost"><a href="/watch?v=${id}" class="ytLockupViewModelContentImage"><div class="visual">Thumbnail</div></a><div class="ytLockupViewModelMetadata"><yt-lockup-metadata-view-model><div class="ytLockupMetadataViewModelTextContainer"><h3><a class="ytLockupMetadataViewModelTitle" href="/watch?v=${id}">An ordinary video</a></h3><div class="ytContentMetadataViewModelMetadataRow">${creator ? `<a href="/@${creator}">${creator}</a>` : '<span>A creator name without a profile link</span>'}</div></div></yt-lockup-metadata-view-model></div></div></yt-lockup-view-model></div></ytd-rich-item-renderer>`;

test('one coloured monkey opens honest analysis with keyboard, light dismissal and narrow bounds', async () => {
 await action({type:'settings',patch:{filterLabels:false}});
 const p=await fixture('https://www.youtube.com/', youtube(false,'ordinary')+youtube(true,'disclosed')+youtube(false,'risky').replace('How to detect AI-generated content','Send me your verification code.'));
 const cards=p.locator('ytd-rich-item-renderer');
 await expect(p.locator('clearfeed-panel .email-trigger')).toHaveCount(3);
 for(let i=0;i<3;i++) {
  const card=cards.nth(i); await expect(card.locator('clearfeed-panel button:visible')).toHaveCount(1);
  await expect(card.locator('.email-trigger')).toHaveAttribute('data-tone',['green','yellow','red'][i]);
  await expect(card.locator('.email-trigger')).toHaveText('');
  await expect(card.getByRole('button',{name:'Hide video',exact:true})).toBeHidden();
 }
 await p.evaluate(()=>{(window as any).cardEvents=0; document.querySelectorAll('ytd-rich-item-renderer').forEach(e=>{ for(const type of ['click','pointerdown','keydown']) e.addEventListener(type,()=>{(window as any).cardEvents++;}); });});
 const ordinary=cards.nth(0), trigger=ordinary.locator('.email-trigger');
 await trigger.focus();await p.keyboard.press('Enter');
 await expect(ordinary.getByRole('region',{name:'KeepItReel video analysis'})).toBeVisible();
 await expect(ordinary.getByText(/creator reputation are not analysed/)).toBeVisible();
 await expect(ordinary.getByRole('button',{name:'Hide video',exact:true})).toBeVisible();
 await expect(ordinary.getByRole('button',{name:'Block creator @ordinary',exact:true})).toBeVisible();
 expect(await p.evaluate(()=>(window as any).cardEvents)).toBe(0);
 await p.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(ordinary.locator('.email-analysis')).toBeHidden();
 await trigger.click();await p.mouse.click(5,5);await expect(ordinary.locator('.email-analysis')).toBeHidden();
 await openVideo(cards.nth(1));await expect(cards.nth(1).getByText(/labels this item: Altered or synthetic content/)).toBeVisible();
 await openVideo(cards.nth(2));await expect(cards.nth(1).locator('.email-analysis')).toBeHidden();await expect(cards.nth(2).getByText('Request for a private secret',{exact:true})).toBeVisible();
 await p.keyboard.press('Escape');await action({type:'settings',patch:{theme:'dark'}});
 await expect(ordinary.locator('clearfeed-panel')).toHaveAttribute('data-theme','dark');
 await p.setViewportSize({width:390,height:700});await openVideo(ordinary);
 const bounds=(await ordinary.locator('.email-analysis').boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
 await p.screenshot({path:path.resolve('../../outputs/keepitreel-video-analysis-dark.png')});
 await action({type:'settings',patch:{spamChecks:false}});await expect(trigger).toHaveAttribute('data-tone','yellow');await openVideo(ordinary);await expect(ordinary.getByText(/Spam checks are off/)).toBeVisible();
 await action({type:'settings',patch:{enabled:false}});await expect(p.locator('clearfeed-panel')).toHaveCount(0);await p.close();
});

test('toolbar-only feed keeps scanning and automatic covers without any monkey launchers', async () => {
 await action({type:'settings',patch:{showPageButton:false,filterLabels:false}});
 const p=await fixture('https://www.youtube.com/',youtube(true,'disclosed')+youtube(false,'secret').replace('How to detect AI-generated content','Send me your verification code.'));
 const tabId=await options.evaluate(async ()=>(await (globalThis as any).chrome.tabs.query({active:true,currentWindow:true}))[0].id);
 const badge=()=>options.evaluate(async tabId=>(globalThis as any).chrome.action.getBadgeText({tabId}),tabId);
 await expect.poll(badge).toBe('2');await expect(p.locator('clearfeed-panel')).toHaveCount(0);
 await action({type:'settings',patch:{hideSuspicious:true}});await expect(p.locator('[data-cf-filter]')).toHaveCount(1);await expect(p.locator('.email-trigger,.creator-button')).toHaveCount(0);await expect(p.getByRole('button',{name:'Show once',exact:true})).toBeVisible();
 await action({type:'settings',patch:{showPageButton:true}});await expect(p.locator('.email-trigger')).toHaveCount(2);expect(await badge()).toBe('2');
 await action({type:'settings',patch:{spamChecks:false}});await expect.poll(badge).toBe('1');
 await p.locator('ytd-info-panel-content-renderer').evaluate(e=>e.remove());await expect.poll(badge).toBe('');
 await action({type:'settings',patch:{platforms:{youtube:false}}});await expect(p.locator('clearfeed-panel')).toHaveCount(0);await p.close();
});

test('Home feed thumbnails retain Hide video without creator links and after lazy mounting', async () => {
 const p=await fixture('https://www.youtube.com/',homeLockup('one'));
 const card=p.locator('#card-one');
 await expect(card.locator('.email-trigger')).toBeVisible();await expect(card.getByRole('button',{name:'Hide video',exact:true})).toBeHidden();
 await expect(card.locator('.ytLockupMetadataViewModelTextContainer > clearfeed-panel')).toHaveCount(1);
 await expect(card.getByRole('button',{name:/Block creator/})).toHaveCount(0);
 await p.evaluate(()=>{document.querySelector('ytd-rich-item-renderer')!.addEventListener('click',()=>{(window as any).cardNavigated=true;});});
 await clickVideo(card,'Hide video');
 await expect(card).toHaveAttribute('data-cf-filter','cover');expect(await p.evaluate(()=>(window as any).cardNavigated)).toBeUndefined();
 expect((await action({type:'get'})).rules).toEqual([]);
 // Loading a creator later must not undo the user's explicit hide of this video.
 await card.locator('.ytContentMetadataViewModelMetadataRow').evaluate(e=>{e.innerHTML='<a href="/@LaterOwner">Later owner</a>';});
 await expect(card).toHaveAttribute('data-cf-filter','cover');
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();
 await expect(card).not.toHaveAttribute('data-cf-filter');await openVideo(card);await expect(card.getByRole('button',{name:'Block creator @laterowner',exact:true})).toBeVisible();
 await p.evaluate(markup=>document.body.insertAdjacentHTML('beforeend',markup),homeLockup('two'));
 await expect(p.locator('clearfeed-panel .email-trigger')).toHaveCount(2);
 await card.locator('.ytLockupMetadataViewModelTextContainer').evaluate(e=>{const next=e.cloneNode(true) as HTMLElement;next.querySelectorAll('clearfeed-panel').forEach(n=>n.remove());e.replaceWith(next);});
 await expect(card.locator('.email-trigger')).toBeVisible();await expect(card.getByRole('button',{name:'Hide video',exact:true})).toBeHidden();
 await expect(card.locator('clearfeed-panel')).toHaveCount(1);await expect(p.locator('clearfeed-panel')).toHaveCount(2);
 await p.close();
});

test('Home feed video hiding and monkey creator blocking have independent Undo', async () => {
 const p=await fixture('https://www.youtube.com/',homeLockup('first','SameOwner')+homeLockup('second','SameOwner'));
 const first=p.locator('#card-first');
 await clickVideo(first,'Hide video');
 await expect(p.locator('[data-cf-filter]')).toHaveCount(1);expect((await action({type:'get'})).rules).toEqual([]);
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 await clickVideo(first,'Block creator @sameowner');
 await expect(p.locator('[data-cf-filter]')).toHaveCount(2);
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);expect((await action({type:'get'})).rules).toEqual([]);
 await p.close();
});

test('recycled Home thumbnails reject stale hide actions and ignore nested duplicate hosts', async () => {
 const p=await fixture('https://www.youtube.com/',homeLockup('one')+'<div id="standalone"><a href="/watch?v=standalone">A new card</a></div>');
 await openVideo(p);const button=p.getByRole('button',{name:'Hide video',exact:true});
 await button.evaluate(control=>{(window as any).staleButton=control;document.querySelectorAll('a[href*="watch?"]').forEach(a=>a.setAttribute('href','/watch?v=recycled'));(control as HTMLButtonElement).click();});
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 await expect(p.locator('clearfeed-undo').getByRole('status')).toContainText('video changed');
 await expect.poll(()=>p.evaluate(()=>(window as any).staleButton.isConnected)).toBe(false);
 await openVideo(p);await expect(button).toHaveCount(1);await button.click();await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();
 await expect(p.locator('clearfeed-panel')).toHaveCount(1);expect((await action({type:'get'})).rules).toEqual([]);
 await p.locator('#standalone').evaluate(e=>e.classList.add('ytLockupViewModelHost'));
 await expect(p.locator('#standalone clearfeed-panel .email-trigger')).toBeVisible();
 await p.locator('#standalone').evaluate(e=>e.classList.remove('ytLockupViewModelHost'));
 await expect(p.locator('#standalone clearfeed-panel')).toHaveCount(0);
 await p.close();
});

test('explained disclosure flags stay visible, expand with the keyboard and can be dismissed without losing the monkey', async () => {
 await action({type:'settings',patch:{filterLabels:false}});
 const p=await fixture('https://www.youtube.com/',youtube());
 const summary=p.locator('clearfeed-panel .email-trigger');await expect(summary).toHaveAttribute('data-tone','yellow');
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 await summary.focus();await p.keyboard.press('Enter');await expect(p.locator('clearfeed-panel .email-analysis')).toBeVisible();
 await expect(p.locator('.flag-list strong').getByText('AI disclosure found',{exact:true})).toBeVisible();
 await expect(p.getByText(/labels this item: Altered or synthetic content/)).toBeVisible();
 await p.getByRole('button',{name:'Dismiss flag',exact:true}).click();await expect(p.locator('clearfeed-panel summary')).toHaveCount(0);
 await openVideo(p);await expect(p.getByRole('button',{name:'Block creator @example',exact:true})).toBeVisible();await expect(p.getByText(/You dismissed the automatic flag/)).toBeVisible();
 expect((await action({type:'get'})).rules).toEqual([]);expect((await action({type:'get'})).totalFiltered).toBe(0);await p.close();
});

test('spam flags preserve playback by default and a single post hide can be undone independently of creator rules', async () => {
 const markup=youtube(false,'offer').replace('How to detect AI-generated content','Guaranteed daily returns. DM me on Telegram to invest.');
 const p=await fixture('https://www.youtube.com/',markup);
 await p.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=50;canvas.getContext('2d')!.fillRect(0,0,80,50);const video=document.querySelector('video')!;video.srcObject=canvas.captureStream(5);video.muted=true;await video.play();});
 const summary=p.locator('clearfeed-panel .email-trigger');await expect(summary).toHaveAttribute('data-tone','yellow');
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);expect(await p.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(false);
 await summary.click();await expect(p.getByText('Guaranteed returns with a contact request',{exact:true})).toBeVisible();
 await p.getByRole('button',{name:'Hide video',exact:true}).click();await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 expect(await p.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 expect(await p.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);expect((await action({type:'get'})).rules).toEqual([]);
 await clickVideo(p,'Block creator @offer');await expect(p.getByText('Creator on your blocklist',{exact:true})).toBeVisible();
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();await expect(summary).toBeVisible();
 expect((await action({type:'get'})).rules).toEqual([]);await p.close();
});

test('spam choices persist, update open tabs and preserve allow exceptions and label-only mode', async () => {
 const p=await fixture('https://www.youtube.com/',youtube(false,'secret').replace('How to detect AI-generated content','Send me your verification code to join.'));
 await expect(p.locator('clearfeed-panel .email-trigger')).toHaveAttribute('data-tone','red');
 await options.goto(`chrome-extension://${id}/options.html#filters`);
 const hide=options.getByRole('switch',{name:'Hide suspicious posts automatically',exact:true});await expect(hide).toHaveAttribute('aria-checked','false');
 await hide.click();await expect(p.locator('[data-cf-filter]')).toHaveCount(1);await options.reload();await expect(hide).toHaveAttribute('aria-checked','true');
 await action({type:'rule',rule:{platform:'youtube',key:'@secret',name:'Secret',action:'allow'}});await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 await expect(p.locator('clearfeed-panel .email-trigger')).toBeVisible();await action({type:'removeRule',platform:'youtube',key:'@secret'});
 await action({type:'settings',patch:{mode:'label'}});await expect(p.locator('[data-cf-filter]')).toHaveCount(0);await expect(p.getByRole('button',{name:'Dismiss label',exact:true})).toBeVisible();
 await options.getByRole('switch',{name:'Check posts for spam patterns',exact:true}).click();await expect(p.getByText('Request for a private secret',{exact:true})).toHaveCount(0);
 await openVideo(p);await expect(p.getByRole('button',{name:'Block creator @secret',exact:true})).toBeVisible();await expect(p.locator('.email-trigger')).toHaveAttribute('data-tone','yellow');await p.close();
});

test('repeated promotions require distinct posts and published captions never enter browser storage', async () => {
 const promo='An investment offer just for you today. Message me on Telegram to join our crypto group and learn more.';
 const card=(id:string)=>youtube(false,id)+'';
 const p=await fixture('https://www.youtube.com/',card('a')+card('b'));
 await p.evaluate(text=>document.querySelectorAll('ytd-rich-item-renderer').forEach(root=>{const caption=document.createElement('div');caption.id='description-text';caption.textContent=text;root.append(caption);}),promo);
 await expect(p.locator('.email-trigger[data-tone=yellow]')).toHaveCount(0);
 await p.evaluate(({markup,text})=>{document.body.insertAdjacentHTML('beforeend',markup);const root=document.querySelectorAll('ytd-rich-item-renderer')[2];const caption=document.createElement('div');caption.id='description-text';caption.textContent=text;root.append(caption);},{markup:card('c'),text:promo});
 await expect(p.locator('.email-trigger[data-tone=yellow]')).toHaveCount(3);await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 await p.locator('.email-trigger').first().click();await expect(p.getByText('Repeated promotional text',{exact:true}).first()).toBeVisible();
 await p.evaluate(()=>document.body.append(document.createElement('hr')));await expect(p.locator('.email-trigger[data-tone=yellow]')).toHaveCount(3);
 await p.evaluate(()=>{document.querySelectorAll('#description-text')[2].textContent='Different published caption';});await expect(p.locator('.email-trigger[data-tone=yellow]')).toHaveCount(0);
 await p.evaluate(()=>{document.querySelectorAll('#description-text')[0].textContent='Send me your password. Caption-canary-7392';});
 await action({type:'settings',patch:{hideSuspicious:true}});await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 const stored=await options.evaluate(async()=>JSON.stringify({local:await (globalThis as any).chrome.storage.local.get(null),session:await (globalThis as any).chrome.storage.session.get(null)}));
 expect(stored).not.toContain('Caption-canary-7392');expect(stored).not.toContain(promo);await p.close();
});

test('Shorts flags do not auto-skip visible posts and post Undo survives navigation without moving back', async () => {
 await action({type:'settings',patch:{autoSkip:true}});
 const p=await fixture('https://www.youtube.com/shorts/one',shortScene());await wireNext(p);
 await p.evaluate(()=>{const title=document.createElement('yt-shorts-video-title-view-model');title.textContent='Send me your verification code to join.';document.querySelector('#first')!.append(title);});
 await expect(p.locator('clearfeed-panel .email-trigger')).toHaveAttribute('data-tone','red');expect(await p.evaluate(()=>(window as any).nativeNextCalls||0)).toBe(0);
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);await action({type:'settings',patch:{autoSkip:false}});
 await openVideo(p);await p.getByRole('button',{name:'Hide video',exact:true}).click();await expect(p.locator('#first')).toHaveAttribute('data-cf-filter','cover');
 await p.locator('#first clearfeed-panel').getByRole('button',{name:'Next video',exact:true}).click();await expect(p).toHaveURL(/shorts\/two$/);
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();expect(p.url()).toContain('/shorts/two');expect((await action({type:'get'})).rules).toEqual([]);
 await openVideo(p);await expect(p.getByRole('button',{name:'Block creator @second',exact:true})).toBeVisible();await p.close();
});

test('TikTok flags published captions, ignores unrelated comment text and rejects a recycled post action', async () => {
 const p=await fixture('https://www.tiktok.com/', '<div data-e2e="feed-item"><a href="https://www.tiktok.com/@offer/video/12345">Play</a><div data-e2e="video-desc">Claim your prize and pay a processing fee first.</div></div><div data-e2e="feed-item"><a href="https://www.tiktok.com/@ordinary/video/23456">Play</a><div data-e2e="video-desc">An ordinary published post</div><aside>Send me your password.</aside></div>');
 await expect(p.locator('summary')).toHaveCount(1);await p.locator('summary').click();await expect(p.getByText('Payment requested to claim a prize',{exact:true})).toBeVisible();
 await p.getByRole('button',{name:'Hide this post',exact:true}).evaluate(control=>{const root=document.querySelector('[data-e2e="feed-item"]')!;root.querySelector('a')!.setAttribute('href','https://www.tiktok.com/@new/video/34567');root.querySelector('[data-e2e="video-desc"]')!.textContent='A different post';(control as HTMLButtonElement).click();});
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);await expect(p.locator('summary')).toHaveCount(0);
 await expect(p.locator('clearfeed-undo').getByRole('status')).toContainText('post changed');expect((await action({type:'get'})).rules).toEqual([]);await p.close();
});

test('YouTube filters scoped disclosures, reveals and honors allow rules',async()=>{
 const p=await fixture('https://www.youtube.com/',youtube()+youtube(false,'human'));
 await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 await expect(p.locator('ytd-rich-item-renderer').nth(1)).not.toHaveAttribute('data-cf-filter');
 await p.getByRole('button',{name:'Show once',exact:true}).click();await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 await clickVideo(p.locator('ytd-rich-item-renderer').first(),'Filter again');await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 await p.getByRole('button',{name:'Always allow',exact:true}).click();await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 const s:any=await action({type:'get'});expect(s.rules[0].action).toBe('allow');expect(s.history).toHaveLength(1);await p.close();
});
test('new and recycled feed cards are reevaluated without duplicate controls',async()=>{
 const p=await fixture('https://www.youtube.com/',youtube(false,'first'));
 await expect(p.locator('clearfeed-panel')).toHaveCount(1);
 await p.evaluate(markup=>document.body.insertAdjacentHTML('beforeend',markup),youtube(true,'second'));
 await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 await p.evaluate(()=>{const root=document.querySelectorAll('ytd-rich-item-renderer')[1]!;root.querySelector('ytd-info-panel-content-renderer')?.remove();root.querySelector('a')!.setAttribute('href','/watch?v=new-id');});
 await expect(p.locator('[data-cf-filter]')).toHaveCount(0);await expect(p.locator('clearfeed-panel')).toHaveCount(2);await p.close();
});
test('TikTok covers, pauses playback, skips once, and disabling restores the feed',async()=>{
 const p=await fixture('https://www.tiktok.com/',`<div data-e2e="feed-item" style="height:620px"><a href="https://www.tiktok.com/@studio/video/12345">Play</a><div data-e2e="video-desc">A scene</div><video muted></video></div><button data-e2e="arrow-down">Next</button>`);
 await p.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;canvas.getContext('2d')!.fillRect(0,0,160,90);const video=document.querySelector('video')!;video.srcObject=canvas.captureStream(5);video.muted=true;await video.play();(window as any).skips=0;document.querySelector('button[data-e2e]')!.addEventListener('click',()=>{(window as any).skips++});});
 expect(await p.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(false);
 await p.evaluate(()=>document.querySelector('[data-e2e="feed-item"]')!.insertAdjacentHTML('beforeend','<span data-e2e="aigc-label">AI-generated</span>'));
 await expect(p.locator('[data-cf-filter]')).toHaveCount(1);await expect.poll(()=>p.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await action({type:'settings',patch:{autoSkip:true}});await expect.poll(()=>p.evaluate(()=>(window as any).skips)).toBe(1);
 await p.evaluate(()=>window.dispatchEvent(new Event('scroll')));await p.waitForTimeout(500);expect(await p.evaluate(()=>(window as any).skips)).toBe(1);
 await action({type:'settings',patch:{enabled:false}});await expect(p.locator('[data-cf-filter]')).toHaveCount(0);await expect(p.locator('clearfeed-panel')).toHaveCount(0);await p.close();
});
test('monkey creator control blocks regular cards and Undo restores earlier choices without overwriting a newer edit',async()=>{
 const p=await fixture('https://www.youtube.com/',youtube(false,'human'));
 await openVideo(p);const control=p.getByRole('button',{name:'Block creator @human',exact:true});
 await expect(control).toBeVisible();await expect(control).toHaveText('Block creator');await expect(p.locator('.email-trigger svg')).toHaveAttribute('aria-hidden','true');
 await openVideo(p);await control.click();await expect(p.locator('[data-cf-filter]')).toHaveCount(1);
 const toast=p.locator('clearfeed-undo');await expect(toast.getByRole('status')).toHaveText('Blocked @human in KeepItReel. Until removed.');
 expect(await toast.evaluate(e=>e.matches(':popover-open'))).toBe(true);
 await toast.getByRole('button',{name:'Undo',exact:true}).click();await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 expect((await action({type:'get'})).rules.some((r:any)=>r.key==='@human')).toBe(false);
 await action({type:'rule',rule:{platform:'youtube',key:'@human',name:'My allowed creator',action:'allow'}});
 await openVideo(p);await control.click();await toast.getByRole('button',{name:'Undo',exact:true}).click();
 expect((await action({type:'get'})).rules.find((r:any)=>r.key==='@human')).toEqual({platform:'youtube',key:'@human',name:'My allowed creator',action:'allow'});
 await openVideo(p);await control.click();await expect(toast.getByRole('button',{name:'Undo',exact:true})).toBeVisible();
 await action({type:'rule',rule:{platform:'youtube',key:'@human',name:'Newer choice',action:'allow'}});
 await toast.getByRole('button',{name:'Undo',exact:true}).click();await expect(toast.getByRole('status')).toContainText('preference changed');
 expect((await action({type:'get'})).rules.find((r:any)=>r.key==='@human').name).toBe('Newer choice');await p.close();
});

test('watch-page monkey sits inside the player and targets its owner rather than commenters',async()=>{
 const p=await fixture('https://www.youtube.com/watch?v=watchone','<ytd-watch-flexy><div id="player-container-outer" style="width:700px;height:400px;background:#ddd"><video></video></div><div id="primary-inner"><h1>A watch video</h1><div id="owner"><a href="/@WatchOwner/videos">Watch owner</a></div><ytd-comments><a href="/@Commenter">Commenter</a></ytd-comments></div></ytd-watch-flexy>');
 await openVideo(p);const control=p.getByRole('button',{name:'Block creator @watchowner',exact:true});await expect(control).toBeVisible();
 await expect(p.locator('#player-container-outer clearfeed-panel')).toHaveCount(1);
 const bounds=await p.locator('.email-trigger').boundingBox(),player=await p.locator('#player-container-outer').boundingBox();expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(player!.x+player!.width);
 await openVideo(p);await control.click();await expect(p.locator('#player-container-outer')).toHaveAttribute('data-cf-filter','cover');
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 expect((await action({type:'get'})).rules).toEqual([]);await p.close();
});

test('Shorts monkey follows active and recycled players, rejects stale clicks and keeps Undo after navigation',async()=>{
 const p=await fixture('https://www.youtube.com/shorts/one',shortScene());await wireNext(p);
 await openVideo(p);const first=p.getByRole('button',{name:'Block creator @first',exact:true});await expect(first).toBeVisible();await expect(p.getByRole('button',{name:'Block creator @second',exact:true})).toHaveCount(0);
 await p.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=50;canvas.getContext('2d')!.fillRect(0,0,80,50);const video=document.querySelector('#first video')as HTMLVideoElement;video.srcObject=canvas.captureStream(5);video.muted=true;await video.play();});
 await first.click();await expect.poll(()=>p.locator('#first video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await p.locator('#first clearfeed-panel').getByRole('button',{name:'Next video',exact:true}).click();
 await expect(p).toHaveURL(/shorts\/two$/);await openVideo(p);await expect(p.getByRole('button',{name:'Block creator @second',exact:true})).toBeVisible();
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();
 expect((await action({type:'get'})).rules).toEqual([]);expect(p.url()).toContain('/shorts/two');
 expect(await p.locator('#first video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await openVideo(p);await p.getByRole('button',{name:'Block creator @second',exact:true}).evaluate(control=>{
  const root=document.querySelector('#second')!;root.setAttribute('video-id','three');root.querySelector('.permalink')!.setAttribute('href','/shorts/three');root.querySelector('yt-reel-channel-bar-view-model a')!.setAttribute('href','/@Third/shorts');history.pushState(null,'','/shorts/three');(control as HTMLButtonElement).click();
 });
 await expect(p.locator('clearfeed-undo').getByRole('status')).toContainText('The video changed');expect((await action({type:'get'})).rules).toEqual([]);
 await expect(p.locator('clearfeed-panel .email-trigger')).toHaveAttribute('aria-expanded','false');await openVideo(p);const third=p.getByRole('button',{name:'Block creator @third',exact:true});await expect(third).toBeVisible();await third.click();
 await expect(p.locator('#second')).toHaveAttribute('data-cf-filter','cover');expect((await action({type:'get'})).rules[0].key).toBe('@third');
 await p.locator('clearfeed-undo').getByRole('button',{name:'Undo',exact:true}).click();
 await p.locator('#second yt-reel-channel-bar-view-model').evaluate(e=>e.replaceChildren());
 await expect(p.getByRole('button',{name:/Block creator/,includeHidden:true})).toHaveCount(0);
 await expect(p.locator('.email-trigger')).toHaveAttribute('data-tone','yellow');await openVideo(p);
 await expect(p.getByText(/Creator identity is unavailable/)).toBeVisible();await expect(p.getByRole('button',{name:'Hide video',exact:true})).toBeVisible();await p.close();
});

test('Shorts auto-skip leaves a persistent Undo action for the creator just blocked',async()=>{
 await action({type:'settings',patch:{autoSkip:true}});
 const p=await fixture('https://www.youtube.com/shorts/one',shortScene());await wireNext(p);
 await clickVideo(p,'Block creator @first');
 await expect(p).toHaveURL(/shorts\/two$/);await openVideo(p);await expect(p.getByRole('button',{name:'Block creator @second',exact:true})).toBeVisible();
 const toast=p.locator('clearfeed-undo');await expect(toast.getByRole('status')).toContainText('@first');await toast.getByRole('button',{name:'Undo',exact:true}).click();
 expect((await action({type:'get'})).rules).toEqual([]);expect(await p.evaluate(()=>(window as any).nativeNextCalls)).toBe(1);
 await action({type:'settings',patch:{enabled:false}});await expect(p.locator('clearfeed-undo')).toHaveCount(0);await p.close();
});

test('Google domain rules hide subdomains and allow specific exceptions',async()=>{
 const p=await fixture('https://www.google.com/search?q=tools','<div id="search"><div class="MjjYud"><a href="https://news.example.com/a"><h3>News result</h3></a></div><div class="MjjYud"><a href="https://docs.example.com/a"><h3>Documentation</h3></a></div></div>');
 await expect(p.getByRole('button',{name:'Hide this source'})).toHaveCount(2);
 await action({type:'rule',rule:{platform:'google',key:'example.com',name:'Example',action:'block'}});await expect(p.locator('[data-cf-filter]')).toHaveCount(2);
 await action({type:'rule',rule:{platform:'google',key:'docs.example.com',name:'Docs',action:'allow'}});await expect(p.locator('[data-cf-filter]')).toHaveCount(1);await p.close();
});
test('label-only mode leaves media available and history can be disabled',async()=>{
 await action({type:'settings',patch:{mode:'label',historyEnabled:false}});const p=await fixture('https://www.youtube.com/',youtube());
 await expect(p.getByRole('button',{name:'Dismiss label'})).toBeVisible();await expect(p.locator('[data-cf-filter]')).toHaveCount(0);
 const s:any=await action({type:'get'});expect(s.history).toHaveLength(0);await p.close();
});
test('disclosure cache carries across pages and can be cleared',async()=>{
 const p=await fixture('https://www.youtube.com/',youtube());await expect(p.locator('[data-cf-filter]')).toHaveCount(1);await expect.poll(async()=>Object.keys((await action({type:'get'}) as any).evidence).length).toBe(1);await p.close();
 const next=await fixture('https://www.youtube.com/',youtube(false,'example'));await expect(next.locator('[data-cf-filter]')).toHaveCount(1);await action({type:'forgetEvidence'});await expect(next.locator('[data-cf-filter]')).toHaveCount(0);await next.close();
});
test('settings, source management and local checker are usable',async()=>{
 await options.getByRole('link',{name:'Your lists'}).click();await options.getByLabel('Creator',{exact:true}).fill('@testcreator');await options.getByRole('button',{name:'Add',exact:true}).click();await expect(options.getByText('@testcreator',{exact:true})).toBeVisible();await options.getByRole('button',{name:'Remove @testcreator'}).click();await expect(options.getByText('No saved rules')).toBeVisible();
 await options.getByRole('link',{name:'Check text locally',exact:true}).click();await options.getByRole('button',{name:'Try a fictional example'}).click();await options.getByRole('button',{name:'Check locally'}).click();await expect(options.getByText('Request for a private code or secret',{exact:true})).toBeVisible();
 const demo=await context.newPage();await demo.goto(`chrome-extension://${id}/demo.html`);await expect(demo.locator('[data-cf-filter]')).toHaveCount(1);await expect(demo.locator('clearfeed-panel')).toHaveCount(3);const state:any=await action({type:'get'});expect(state.totalFiltered).toBe(0);await demo.close();
});
test('UI screenshots, accessibility basics and no background uploads',async()=>{
 const errors:string[]=[];options.on('pageerror',e=>errors.push(e.message));const external:string[]=[];options.on('request',req=>{if(req.url().startsWith('http'))external.push(req.url())});
 await options.goto(`chrome-extension://${id}/options.html`);await expect(options.getByRole('heading',{name:'Overview'})).toBeVisible();fs.mkdirSync('../../work/screenshots',{recursive:true});await options.screenshot({path:'../../work/screenshots/options.png',fullPage:true});
 await options.setViewportSize({width:600,height:900});await options.screenshot({path:'../../work/screenshots/options-mobile.png',fullPage:true});expect(await options.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await options.setViewportSize({width:1360,height:1000});
 const pop=await context.newPage();await pop.setViewportSize({width:378,height:600});await pop.goto(`chrome-extension://${id}/popup.html`);await expect(pop.getByRole('switch',{name:'Enable KeepItReel'})).toBeVisible();expect(await pop.getByLabel('Appearance',{exact:true}).evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight)).toBe(true);expect(await pop.evaluate(()=>document.documentElement.scrollHeight<=600)).toBe(true);await pop.screenshot({path:'../../work/screenshots/popup.png'});await pop.close();expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('article extraction stays local and preserves the original page',async()=>{
 const p=await fixture('https://www.youtube.com/article-test','<article><h1>Example article</h1><p id="chosen">A selected passage that should remain on the page.</p></article>');
 await p.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('#chosen')!);getSelection()!.removeAllRanges();getSelection()!.addRange(range);});
 // Chrome grants activeTab on a real toolbar click. Exercise extraction in the already
 // injected extension world without broadening the production manifest for the test.
 await expect(p.locator('body')).toBeVisible();await p.waitForTimeout(200);
 const cdp=await context.newCDPSession(p);const worlds:any[]=[];cdp.on('Runtime.executionContextCreated',e=>worlds.push(e.context));await cdp.send('Runtime.enable');
 const world=worlds.find(w=>w.name.includes(id)||w.origin.includes(id));expect(world,JSON.stringify(worlds)).toBeTruthy();
 await cdp.send('Runtime.evaluate',{expression:fs.readFileSync(path.join(extension,'extract.js'),'utf8'),contextId:world.id,awaitPromise:true});
 await expect.poll(()=>options.evaluate(async()=>((await (globalThis as any).chrome.storage.session.get('scanDraft')).scanDraft?.text))).toBe('A selected passage that should remain on the page.');
 await expect(p.locator('#chosen')).toHaveText('A selected passage that should remain on the page.');await cdp.detach();await p.close();
});

test('appearance persists, syncs with the popup, follows the OS and leaves website styling alone', async () => {
 test.setTimeout(45000);
 await options.emulateMedia({colorScheme:'light'});
 await options.getByLabel('Appearance',{exact:true}).selectOption('dark');
 await expect(options.locator('html')).toHaveAttribute('data-theme','dark');
 await options.reload();
 await expect(options.getByLabel('Appearance',{exact:true})).toHaveValue('dark');
 const pop=await context.newPage();await pop.goto(`chrome-extension://${id}/popup.html`);
 await expect(pop.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(pop.locator('.brand-logo-dark')).toBeVisible();
 await expect(pop.locator('.brand-logo-light')).toBeHidden();
 const p=await fixture('https://www.youtube.com/',youtube());
 await expect(p.locator('clearfeed-panel')).toHaveAttribute('data-theme','dark');
 const before=await p.locator('body').evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
 await p.evaluate(()=>{(window as any).originalPanel=document.querySelector('clearfeed-panel');});
 await pop.getByLabel('Appearance',{exact:true}).selectOption('light');
 await expect(options.locator('html')).toHaveAttribute('data-theme','light');
 await expect(p.locator('clearfeed-panel')).toHaveAttribute('data-theme','light');
 expect(await p.evaluate(()=>(window as any).originalPanel===document.querySelector('clearfeed-panel'))).toBe(true);
 expect(await p.locator('html').getAttribute('data-theme')).toBeNull();
 expect(await p.locator('body').evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}))).toEqual(before);
 await pop.emulateMedia({colorScheme:'dark'});
 await expect(pop.locator('html')).toHaveAttribute('data-theme','light');
 await options.getByLabel('Appearance',{exact:true}).selectOption('system');
 await expect(options.locator('html')).toHaveAttribute('data-theme','light');
 await expect(pop.locator('html')).toHaveAttribute('data-theme','dark');
 await options.emulateMedia({colorScheme:'dark'});
 await expect(options.locator('html')).toHaveAttribute('data-theme','dark');
 await action({type:'settings',patch:{theme:'invalid'}});
 expect((await action({type:'get'})).settings.theme).toBe('system');
 await options.emulateMedia({colorScheme:'light'});await p.close();await pop.close();
});


test('permission denial keeps website checking off in the production build', async () => {
 await options.goto('chrome-extension://' + id + '/options.html#protection');
 // Controlled API denial tests application behavior, not the native Chrome prompt.
 await options.evaluate(() => { (globalThis as any).chrome.permissions.request = async () => false; });
 await options.getByRole('switch', { name: 'Automatic website scanning' }).click();
 await expect(options.getByText('Site access was not granted. This check remains off.')).toBeVisible();
 expect((await action({type:'get'})).settings.protection.websites).toBe(false);
 expect(await options.evaluate(async () => (globalThis as any).chrome.scripting.getRegisteredContentScripts())).toEqual([]);
 await options.reload();
});

test('a local draft is consumed and reset removes transient drafts', async () => {
 await action({type:'draft',text:'Please send your verification code.'});
 await options.goto('chrome-extension://' + id + '/options.html#check');
 await expect(options.getByLabel('Message or page text')).toHaveValue('Please send your verification code.');
 expect(await options.evaluate(async () => (await (globalThis as any).chrome.storage.session.get('scanDraft')).scanDraft)).toBeUndefined();
 await options.getByRole('link', { name: 'Overview', exact: true }).click();
 await options.getByRole('link', { name: 'Check text locally', exact: true }).click();
 await expect(options.getByLabel('Message or page text')).toHaveValue('');
 await action({type:'draft',text:'Temporary private text'}); await action({type:'reset'});
 expect(await options.evaluate(async () => (globalThis as any).chrome.storage.session.get(null))).toEqual({});
});
