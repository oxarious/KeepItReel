import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const production = path.resolve('.output/chrome-mv3');
const scratch = path.resolve('../../work');
let context: BrowserContext; let id: string; let options: Page;
const errors: string[] = [];
const enabled = { websites: true, links: true, email: false, excludedDomains: [] };
const html = (body: string) => `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>KeepItReel fixture</title><style>body{font:16px/1.7 system-ui;margin:40px;max-width:800px}a{display:inline-block;margin:8px 0}article,.adn,.invitation-card{display:block;padding:24px;border:1px solid #ddd;margin:20px 0}h1{font:40px Georgia}</style></head><body>${body}</body></html>`;

for (const provider of ['Gmail', 'Outlook personal', 'Outlook work']) {
  test(`${provider} inbox previews are local, limited, reversible and do not open or select messages`, async () => {
    const gmail = provider === 'Gmail';
    const row = (id: string, subject: string, preview: string) => gmail
      ? `<tr class="zA" id="${id}"><td class="yW">Example sender</td><td><div class="xS" role="link"><div class="xT"><div class="y6"><span class="bog">${subject}</span></div> <span class="y2">${preview}</span></div></div></td><td class="xW"><span class="received">10:00</span></td></tr>`
      : `<div role="option" data-convid="${id}" id="${id}"><div><span data-testid="subject">${subject}</span> <span data-testid="preview">${preview}</span></div><time><span class="received">10:00</span></time></div>`;
    const rows = row('a', 'Please send your verification code.', 'Fictional test') + row('b', 'Meeting on Thursday', 'Never share your verification code.') + row('c', 'Köp presentkort åt mig.', 'Fiktivt test');
    const url = gmail ? 'https://mail.google.com/mail/u/0/#inbox' : provider === 'Outlook personal' ? 'https://outlook.live.com/mail/0/' : 'https://outlook.office.com/mail/';
    const p = await fixture(url, `<h1>Fictional inbox</h1>${gmail ? `<table><tbody>${rows}</tbody></table>` : `<div role="listbox">${rows}</div>`}`);
    await expect(p.locator('clearfeed-inbox')).toHaveCount(0);
    const originalHeight = (await p.locator('#a').boundingBox())!.height;
    await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
    await expect(p.locator('clearfeed-inbox')).toHaveCount(3);
    const a = p.locator('#a clearfeed-inbox'), b = p.locator('#b clearfeed-inbox'), c = p.locator('#c clearfeed-inbox');
    await expect(a.locator('.email-trigger')).toHaveAttribute('data-tone', 'red');
    await expect(b.locator('.email-trigger')).toHaveAttribute('data-tone', 'grey');
    await expect(c.locator('.email-trigger')).toHaveAttribute('data-tone', 'yellow');
    expect((await p.locator('#a').boundingBox())!.height).toBeCloseTo(originalHeight, 1);
    const buttonBox = (await a.locator('.email-trigger').boundingBox())!;
    const timeBox = (await p.locator('#a .received').boundingBox())!;
    expect(buttonBox.width).toBe(24); expect(buttonBox.height).toBe(24);
    expect(buttonBox.x).toBeGreaterThanOrEqual(timeBox.x + timeBox.width);
    expect(Math.abs(buttonBox.y + buttonBox.height / 2 - (timeBox.y + timeBox.height / 2))).toBeLessThan(6);
    await p.evaluate(() => {
      (window as any).rowEvents = 0;
      for (const id of ['a', 'b', 'c']) for (const type of ['click', 'keydown', 'mousedown']) document.getElementById(id)!.addEventListener(type, () => (window as any).rowEvents++);
    });
    const requests: string[] = []; p.on('request', r => requests.push(r.url()));
    await a.locator('.email-trigger').focus(); await p.keyboard.press('Enter');
    await expect(a.getByRole('region', { name: 'KeepItReel inbox preview check' })).toBeVisible();
    await expect(a.getByText('Request for a private code or secret', { exact: true })).toBeVisible();
    await expect(a.getByText(/full message, link destinations/)).toBeVisible();
    await p.keyboard.press('Escape'); await expect(a.locator('.email-analysis')).toBeHidden();
    await a.locator('.email-trigger').click(); await a.getByRole('button', { name: 'Close email analysis' }).click();
    expect(await p.evaluate(() => (window as any).rowEvents)).toBe(0); expect(p.url()).toBe(url); expect(requests).toEqual([]);
    // Preview checks never use hidden full content or actual link destinations in the row.
    await p.locator('#b').evaluate(row => { const hidden = document.createElement('span'); hidden.hidden = true; hidden.textContent = 'Send your password.'; row.append(hidden); });
    await b.locator('.email-trigger').click(); await expect(b.getByText(/Grey does not mean safe/)).toBeVisible();
    await b.getByRole('button', { name: 'Close email analysis' }).click();
    // Recycled row: a stale click cannot display the previous email's reasons.
    await a.locator('.email-trigger').click();
    await p.locator('#a').evaluate((row, gmail) => { row.querySelector(gmail ? '.bog' : '[data-testid="subject"]')!.textContent = 'Lunch tomorrow'; }, gmail);
    await expect(a.locator('.email-trigger')).toHaveAttribute('data-tone', 'grey'); await expect(a.locator('.email-analysis')).toBeHidden();
    await p.locator('#c').evaluate(row => { (row as HTMLElement).style.display = 'none'; }); await expect(c).toHaveCount(0);
    await p.locator('#c').evaluate(row => { (row as HTMLElement).style.display = ''; }); await expect(c).toHaveCount(1);
    await p.locator(gmail ? 'tbody' : '[role="listbox"]').evaluate((parent, markup) => parent.insertAdjacentHTML('beforeend', markup), row('d', 'Skicka din verifieringskod.', 'Fiktivt test'));
    await expect(p.locator('#d clearfeed-inbox .email-trigger')).toHaveAttribute('data-tone', 'red');
    await action({ type: 'settings', patch: { theme: 'dark' } }); await expect(a).toHaveAttribute('data-theme', 'dark');
    await p.setViewportSize({ width: 390, height: 700 }); await a.locator('.email-trigger').click();
    const box = (await a.locator('.email-analysis').boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
    await action({ type: 'settings', patch: { protection: { ...enabled, email: false } } });
    await expect(p.locator('clearfeed-inbox')).toHaveCount(0);
    expect(await p.locator('#a').locator(gmail ? 'td.xW' : 'time').evaluate(e => (e as HTMLElement).style.whiteSpace)).toBe('');
    const stored = await options.evaluate(async () => JSON.stringify({ local: await (globalThis as any).chrome.storage.local.get(null), session: await (globalThis as any).chrome.storage.session.get(null) }));
    for (const text of ['Example sender', 'Lunch tomorrow', 'verifieringskod', 'Fictional test']) expect(stored).not.toContain(text);
  });
}
async function fixture(url: string, body: string) {
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: html(body) }) : route.abort());
  await page.goto(url); return page;
}

test('Gmail hover toolbar leaves a separate clickable monkey slot and restores native layout on disable', async () => {
  const p = await fixture('https://mail.google.com/mail/u/0/#inbox/hover', `<style>
    table{width:100%;border-collapse:collapse}.zA{position:relative;display:flex;align-items:center;height:36px;border-bottom:1px solid #ddd;isolation:isolate;transform:translateZ(0)}
    .zA td{padding:0 8px;white-space:nowrap}.subject{flex:1;min-width:0;overflow:hidden}.xW{margin-left:auto}
    .bq4{position:absolute;right:0;top:0;height:100%;display:none;align-items:center;background:white;z-index:10}
    .bq4 button{height:32px;width:40px}.zA:hover .bq4,.zA:focus-within .bq4{display:flex}
    .zA:hover .xW,.zA:focus-within .xW{visibility:hidden}
    </style><h1>Fictional inbox hover test</h1><div style="overflow:hidden"><table><tbody><tr class="zA" id="hover-row"><td>Test sender</td><td class="subject"><span class="bog">Please send your verification code.</span><span class="y2"> Fictional test</span></td><td class="xW">10:00</td><td class="bq4">${['Archive','Delete','Unread','Snooze'].map(t => `<button aria-label="${t}">${t[0]}</button>`).join('')}</td></tr></tbody></table></div>`);
  const row = p.locator('#hover-row'); const originalHeight = (await row.boundingBox())!.height;
  await p.evaluate(() => {
    (window as any).actions = []; (window as any).rowClicks = 0;
    document.querySelectorAll('.bq4 button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); (window as any).actions.push(b.getAttribute('aria-label')); }));
    document.querySelector('#hover-row')!.addEventListener('click', () => (window as any).rowClicks++);
  });
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const trigger = row.locator('.email-trigger');
  await trigger.hover(); await expect(row.locator('.bq4')).toBeVisible();
  const hint = row.locator('.email-hint');
  await expect(hint).toBeVisible(); expect(await hint.evaluate(e => e.matches(':popover-open'))).toBe(true);
  const hintBox = (await hint.boundingBox())!;
  expect(hintBox.y).toBeLessThan((await row.boundingBox())!.y);
  expect(await hint.evaluate(e => { const r = e.getBoundingClientRect(); return (e.getRootNode() as ShadowRoot).elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e; })).toBe(true);
  await hint.hover(); await expect(hint).toBeVisible();
  await p.keyboard.press('Escape'); await expect(hint).toBeHidden();
  await trigger.hover(); await expect(hint).toBeVisible();
  await expect(row.locator('.xW')).toBeHidden();
  expect((await row.boundingBox())!.height).toBe(originalHeight);
  const monkeyBox = (await trigger.boundingBox())!, toolbarBox = (await row.locator('.bq4').boundingBox())!;
  expect(monkeyBox.x).toBeGreaterThanOrEqual(toolbarBox.x + toolbarBox.width);
  await trigger.click(); await expect(row.locator('.email-analysis')).toBeVisible(); await expect(hint).toBeHidden();
  expect(await p.evaluate(() => (window as any).actions)).toEqual([]); expect(await p.evaluate(() => (window as any).rowClicks)).toBe(0);
  await row.getByRole('button', { name: 'Close email analysis' }).click();
  for (const name of ['Archive','Delete','Unread','Snooze']) await row.getByRole('button', { name, exact: true }).click();
  expect(await p.evaluate(() => (window as any).actions)).toEqual(['Archive','Delete','Unread','Snooze']);
  await trigger.focus(); await p.keyboard.press('Enter'); await expect(row.locator('.email-analysis')).toBeVisible();
  await p.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  // Gmail can rerender trailing cells while reusing a row.
  await row.locator('[data-keepitreel-inbox-slot]').evaluate(e => e.remove());
  await expect(row.locator('clearfeed-inbox')).toHaveCount(1); await trigger.click(); await expect(row.locator('.email-analysis')).toBeVisible();
  await row.getByRole('button', { name: 'Close email analysis' }).click();
  await action({ type: 'settings', patch: { protection: { ...enabled, email: false } } });
  await expect(row.locator('clearfeed-inbox,[data-keepitreel-inbox-slot]')).toHaveCount(0);
  await expect(row).not.toHaveAttribute('data-keepitreel-inbox'); await row.hover();
  await expect(row.locator('.bq4')).toHaveCSS('right', '0px'); expect((await row.boundingBox())!.height).toBe(originalHeight);
});
async function action(data: Record<string, unknown>) {
  const result = await options.evaluate(async d => (globalThis as any).chrome.runtime.sendMessage({ namespace: 'clearfeed', ...d }), data);
  if (result?.error) throw new Error(result.error); return result;
}
test.beforeAll(async () => {
  // Chromium's native optional-permission prompt cannot be accepted by headless Playwright.
  // The code is unchanged; this isolated copy pre-grants host access for integration tests.
  // Production keeps optional access and is separately checked below.
  fs.mkdirSync(scratch, { recursive: true });
  const extension = fs.mkdtempSync(path.join(scratch, 'protection-e2e-'));
  fs.cpSync(production, extension, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
  manifest.host_permissions = ['http://*/*', 'https://*/*'];
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 1360, height: 1000 } });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'); id = new URL(worker.url()).host;
  options = await context.newPage(); await options.goto(`chrome-extension://${id}/options.html#protection`);
});
test.beforeEach(async () => { errors.length = 0; await action({ type: 'reset' }); await options.goto(`chrome-extension://${id}/options.html#protection`); });
test.afterEach(async () => { expect(errors).toEqual([]); for (const page of context.pages()) if (page !== options) await page.close(); });
test.afterAll(async () => { await context.close(); });

test('production package requests optional access and enables only selected integrations', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(production, 'manifest.json'), 'utf8'));
  expect(manifest.optional_host_permissions).toEqual(['http://*/*', 'https://*/*']);
  expect(manifest.host_permissions || []).not.toContain('https://*/*');
  const before = await fixture('https://article.example.com/', '<article>This article was generated using AI.</article>');
  await expect(before.locator('clearfeed-guard')).toHaveCount(0);
  await options.getByRole('switch', { name: 'Automatic website scanning' }).click();
  await expect(options.getByRole('switch', { name: 'Automatic website scanning' })).toHaveAttribute('aria-checked', 'true');
  await expect(before.getByRole('button', { name: 'KeepItReel · AI disclosure', exact: true })).toBeVisible();
  const state = await action({ type: 'get' }); expect(state.settings.protection.email).toBe(false); expect(state.settings.protection).not.toHaveProperty('linkedin');
  await options.getByRole('switch', { name: 'Automatic website scanning' }).click();
  await expect(before.getByRole('button', { name: 'KeepItReel · paused', exact: true })).toBeVisible();
  // The UI receives the saved setting before Chrome finishes unregistering scripts.
  await expect.poll(() => options.evaluate(async () => (globalThis as any).chrome.scripting.getRegisteredContentScripts())).toEqual([]);
});

test('toolbar-only protection keeps warning types per tab and clears navigation, pause and removal', async () => {
  await action({ type: 'settings', patch: { showPageButton: false, protection: { ...enabled, email: true } } });
  const p = await fixture('https://article.example.com/toolbar', '<article><p>This article was generated using AI.</p><a id="risk" href="https://other.test">paypal.com</a><a href="https://other.test">paypal.com</a></article>');
  const other = await fixture('https://different.example.com/toolbar', '<article>Ordinary text.</article>');
  const tabId = await options.evaluate(async url => (await (globalThis as any).chrome.tabs.query({})).find((t: any) => t.url === url).id, p.url());
  const otherId = await options.evaluate(async url => (await (globalThis as any).chrome.tabs.query({})).find((t: any) => t.url === url).id, other.url());
  const badge = (id: number) => options.evaluate(async tabId => (globalThis as any).chrome.action.getBadgeText({tabId}), id);
  await expect.poll(() => badge(tabId)).toBe('2'); await expect.poll(() => badge(otherId)).toBe('');
  await expect(p.locator('clearfeed-guard .badge')).toBeHidden();
  const summary = await action({ type: 'toolbarGet', tabId }); expect(summary.codes).toEqual(['disclosure','link']);
  await p.locator('#risk').click(); await expect(p.getByRole('dialog', {name:'Review this link'})).toBeVisible(); await p.getByRole('button',{name:'Go back',exact:true}).click();
  await options.evaluate(async tabId => (globalThis as any).chrome.tabs.update(tabId,{active:true}), tabId);
  const popup=await context.newPage(); await popup.setViewportSize({width:378,height:600});await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.evaluate(async tabId => (globalThis as any).chrome.tabs.update(tabId,{active:true}),tabId);
  await expect(popup.getByText('2 warning types on this tab',{exact:true})).toBeVisible();
  await popup.getByText('View warnings',{exact:true}).click();await expect(popup.getByText('AI disclosure',{exact:true})).toBeVisible();await expect(popup.getByText('Link address concern',{exact:true})).toBeVisible();
  await expect(popup.getByRole('switch',{name:'Show monkeys on websites',exact:true})).toHaveAttribute('aria-checked','false');
  await popup.screenshot({path:path.join(scratch,'screenshots/toolbar-only-popup.png')});
  await popup.getByRole('switch',{name:'Show monkeys on websites',exact:true}).click();await expect(p.locator('clearfeed-guard .badge')).toBeVisible();expect(await badge(tabId)).toBe('2');
  await action({type:'settings',patch:{enabled:false}});await expect.poll(()=>badge(tabId)).toBe('');
  await action({type:'settings',patch:{enabled:true}});await expect.poll(()=>badge(tabId)).toBe('2');
  await p.route('**/clean',route=>route.fulfill({contentType:'text/html',body:html('<article>New ordinary page.</article>')}));await p.goto('https://article.example.com/clean');await expect.poll(()=>badge(tabId)).toBe('');
  await p.close();await expect.poll(async()=>{const stored=await options.evaluate(async()=>((await (globalThis as any).chrome.storage.session.get('toolbarWarnings')).toolbarWarnings||{}));return Object.hasOwn(stored,String(tabId));}).toBe(false);
});

test('hidden email monkeys still report warning categories without storing message data', async () => {
  await action({type:'settings',patch:{showPageButton:false,protection:{...enabled,email:true}}});
  const p=await fixture('https://mail.google.com/mail/u/0/#inbox/toolbar-private', '<div class="a3s aiL">Private canary 47293. Please send your verification code.</div><table><tr class="zA"><td><span class="bog">Please send your verification code.</span></td><td class="xW">10:00</td></tr></table>');
  const tabId=await options.evaluate(async url=>(await (globalThis as any).chrome.tabs.query({})).find((t:any)=>t.url===url).id,p.url());
  await expect.poll(()=>options.evaluate(async tabId=>(globalThis as any).chrome.action.getBadgeText({tabId}),tabId)).toBe('1');
  await expect(p.locator('clearfeed-message,clearfeed-inbox')).toHaveCount(0);await expect(p.locator('clearfeed-guard .badge')).toBeHidden();
  const stored=await options.evaluate(async()=>JSON.stringify((await (globalThis as any).chrome.storage.session.get('toolbarWarnings')).toolbarWarnings));
  for(const privateText of ['47293','verification code','mail.google.com','toolbar-private']) expect(stored).not.toContain(privateText);
  expect((await action({type:'toolbarGet',tabId})).codes).toEqual(['secret']);
  const color=await options.evaluate(async tabId=>(globalThis as any).chrome.action.getBadgeBackgroundColor({tabId}),tabId);expect(color).toEqual([163,50,50,255]);
  await action({type:'settings',patch:{showPageButton:true}});await expect(p.locator('clearfeed-message')).toHaveCount(1);await expect(p.locator('clearfeed-inbox')).toHaveCount(1);
  await action({type:'settings',patch:{protection:{...enabled,email:false}}});await expect.poll(()=>options.evaluate(async tabId=>(globalThis as any).chrome.action.getBadgeText({tabId}),tabId)).toBe('');
});

test('automatic page scan explains origin, updates dynamic content and supports site pause', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const p = await fixture('https://article.example.com/story', '<article><h1>A fictional landscape</h1><p>This article was generated using AI.</p><a id="link" href="https://evil.test/login">https://paypal.com</a></article>');
  await p.getByRole('button', { name: /KeepItReel · 1 concern/ }).click();
  await expect(p.getByText('Origin: self-disclosure found.', { exact: true })).toBeVisible();
  await expect(p.getByText('Displayed address differs', { exact: true })).toBeVisible();
  await p.locator('#link').evaluate(a => a.setAttribute('href', 'https://paypal.com'));
  await expect(p.getByText('Displayed address differs', { exact: true })).toHaveCount(0);
  await p.locator('article p').evaluate(e => { e.textContent = 'How AI-generated content works.'; });
  await expect(p.getByText('Origin: unknown.', { exact: true })).toBeVisible();
  await p.getByRole('button', { name: 'Pause on this site' }).click();
  await expect(p.getByText('Excluded by your site preferences', { exact: true })).toBeVisible();
  const state = await action({ type: 'get' }); expect(state.settings.protection.excludedDomains).toEqual(['article.example.com']);
});

test('site pause becomes Start, persists, resumes immediately and preserves other exclusions', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, excludedDomains: ['private.example.org'] } } });
  const p = await fixture('https://www.article.example.com/pause', '<article>This article was generated using AI.</article>');
  const badge = p.locator('clearfeed-guard .badge');
  await badge.click(); await p.getByRole('button', { name: 'Pause on this site', exact: true }).click();
  await expect(p.getByRole('button', { name: 'Start on this site', exact: true })).toBeEnabled();
  await expect(p.getByText('Excluded by your site preferences', { exact: true })).toBeVisible();
  expect((await action({ type: 'get' })).settings.protection.excludedDomains).toEqual(['private.example.org', 'www.article.example.com']);
  await p.reload(); await badge.click();
  await expect(p.getByRole('button', { name: 'Start on this site', exact: true })).toBeEnabled();
  await p.getByRole('button', { name: 'Start on this site', exact: true }).click();
  await expect(p.getByRole('button', { name: 'Pause on this site', exact: true })).toBeEnabled();
  await expect(p.getByText('Origin: self-disclosure found.', { exact: true })).toBeVisible();
  expect((await action({ type: 'get' })).settings.protection.excludedDomains).toEqual(['private.example.org']);
  // A broader private-site exclusion must not be silently removed by this control.
  await action({ type: 'settings', patch: { protection: { ...enabled, excludedDomains: ['example.com'] } } });
  await expect(p.getByRole('button', { name: 'Pause on this site', exact: true })).toBeDisabled();
  expect((await action({ type: 'get' })).settings.protection.excludedDomains).toEqual(['example.com']);
});

test('hidden logo persists while link checks run and the toolbar popup restores it', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const p = await fixture('https://article.example.com/hide', '<article><a id="risk" href="https://evil.test">paypal.com</a></article>');
  const other = await fixture('https://another.example.net/', '<article>A separate page.</article>');
  await p.locator('clearfeed-guard .badge').click();
  const scripts = await options.evaluate(async () => (globalThis as any).chrome.scripting.getRegisteredContentScripts());
  await p.getByRole('button', { name: 'Hide this button', exact: true }).click();
  await expect(p.locator('clearfeed-guard .badge')).toBeHidden();
  await expect(other.locator('clearfeed-guard .badge')).toBeHidden();
  expect((await action({ type: 'get' })).settings.showPageButton).toBe(false);
  await p.reload(); await expect(p.locator('clearfeed-guard')).toHaveCount(1);
  await expect(p.locator('clearfeed-guard .badge')).toBeHidden();
  await p.locator('#risk').click(); await expect(p.getByRole('dialog', { name: 'Review this link' })).toBeVisible();
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/popup.html`);
  const show = popup.getByRole('switch', { name: 'Show monkeys on websites', exact: true });
  await expect(show).toHaveAttribute('aria-checked', 'false'); await show.click();
  // The state notification may paint the button after the popup updates; wait for it.
  await expect(p.locator('clearfeed-guard .badge')).toBeVisible();
  await expect(other.locator('clearfeed-guard .badge')).toBeVisible();
  await expect(p.getByRole('dialog', { name: 'Review this link' })).toBeVisible();
  await p.getByRole('button', { name: 'Go back', exact: true }).click();
  expect((await action({ type: 'get' })).settings.protection).toEqual(enabled);
  expect(await options.evaluate(async () => (globalThis as any).chrome.scripting.getRegisteredContentScripts())).toEqual(scripts);
});

test('Atkinson renders locally in popup, reports and feeds even when website font requests are forbidden', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  await options.evaluate(() => document.fonts.ready);
  expect(await options.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toContain('KeepItReel Atkinson');
  const p = await context.newPage(); const fontRequests: string[] = [];
  p.on('request', request => { if (request.resourceType() === 'font') fontRequests.push(request.url()); });
  await p.route('**/*', route => route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'none'" }, body: html('<style>body{font-family:Arial!important}</style><article>This article was generated using AI.</article>') }));
  await p.goto('https://article.example.com/font-csp');
  await p.locator('clearfeed-guard .badge').click();
  await p.waitForFunction(() => [...document.fonts].some(f => f.family.replaceAll('"', '') === 'KeepItReel Atkinson' && f.status === 'loaded'));
  expect(await p.locator('clearfeed-guard h2').evaluate(el => getComputedStyle(el).fontFamily)).toContain('KeepItReel Atkinson');
  expect(await p.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toBe('Arial');
  expect(fontRequests).toEqual([]);
  const popup = await context.newPage(); await popup.setViewportSize({ width: 378, height: 600 }); await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.evaluate(() => document.fonts.ready);
  await expect(popup.getByRole('switch', { name: 'Show monkeys on websites', exact: true })).toBeVisible();
  expect(await popup.evaluate(() => document.documentElement.scrollHeight <= 600)).toBe(true);
  expect(await popup.getByLabel('Appearance', { exact: true }).evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  const feed = await fixture('https://www.youtube.com/', '<ytd-rich-item-renderer><a id="video-title" href="/watch?v=font">A scene</a><ytd-info-panel-content-renderer>Altered or synthetic content</ytd-info-panel-content-renderer></ytd-rich-item-renderer>');
  await expect(feed.locator('clearfeed-panel')).toHaveCount(1);
  await feed.waitForFunction(() => [...document.fonts].some(f => f.family.replaceAll('"', '') === 'KeepItReel Atkinson' && f.status === 'loaded'));
  expect(await feed.locator('clearfeed-panel button').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('KeepItReel Atkinson');
});

test('dark appearance covers page reports, link dialogs and email notices without restyling the site', async () => {
  await action({ type: 'settings', patch: { theme: 'dark', protection: { ...enabled, email: true } } });
  const p = await fixture('https://article.example.com/dark', '<article><a id="link" href="https://evil.test/login">https://paypal.com</a></article>');
  await expect(p.locator('clearfeed-guard')).toHaveAttribute('data-theme', 'dark');
  await p.getByRole('button', { name: /KeepItReel · 1 concern/ }).click();
  const report = p.getByRole('region', { name: 'KeepItReel page report' });
  await expect(report).toBeVisible();
  await expect(report).toHaveCSS('background-color', 'rgb(24, 38, 31)');
  await p.locator('#link').click();
  const dialog = p.getByRole('dialog', { name: 'Review this link' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.panel')).toHaveCSS('background-color', 'rgb(24, 38, 31)');
  await p.getByRole('button', { name: 'Go back' }).click();
  const mail = await fixture('https://mail.google.com/mail/u/0/#inbox/dark', '<div class="adn"><span class="gD" email="sender@example.com">Sender</span><div class="a3s aiL"><p>Please send your verification code.</p></div></div>');
  await expect(mail.locator('clearfeed-message')).toHaveAttribute('data-theme', 'dark');
  await expect(mail.locator('clearfeed-message .email-analysis')).toHaveCSS('background-color', 'rgb(24, 38, 31)');
  await options.getByLabel('Appearance', { exact: true }).selectOption('light');
  await expect(mail.locator('clearfeed-message')).toHaveAttribute('data-theme', 'light');
  await expect(p.locator('clearfeed-guard')).toHaveAttribute('data-theme', 'light');
  expect(await p.locator('html').getAttribute('data-theme')).toBeNull();
  expect(await mail.locator('html').getAttribute('data-theme')).toBeNull();
});

test('review dialog stops deceptive navigation, rechecks changed href, and keeps user in control', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const p = await fixture('https://article.example.com/', '<a id="link" href="https://paypal.com">paypal.com</a>');
  await expect(p.locator('clearfeed-guard')).toHaveCount(1);
  await p.locator('#link').evaluate(a => a.setAttribute('href', 'https://evil.test/private?token=secret-value'));
  await p.locator('#link').click();
  await expect(p.getByRole('dialog', { name: 'Review this link' })).toBeVisible();
  expect(p.url()).toBe('https://article.example.com/');
  await expect(p.getByText('evil.test', { exact: true })).toBeVisible();
  await expect(p.locator('clearfeed-guard')).not.toContainText('secret-value');
  await expect(p.getByRole('link', { name: 'Continue to link' })).toHaveAttribute('href', 'https://evil.test/private?token=secret-value');
  await p.keyboard.press('Escape'); await expect(p.getByRole('dialog')).toHaveCount(0);
  await p.locator('#link').click(); await p.getByRole('button', { name: 'Go back' }).click();
  await expect(p.getByRole('dialog')).toHaveCount(0); expect(p.url()).toBe('https://article.example.com/');
  await action({ type: 'settings', patch: { protection: { ...enabled, links: false } } });
  await p.locator('#link').click(); await expect(p).toHaveURL(/evil\.test/);
});

test('native link review isolates the page, restores focus and follows only the reviewed destination', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const p = await fixture('https://article.example.com/keyboard', '<button id="outside">Page action</button><a id="link" href="https://paypal.com.account-review.example/path">paypal.com</a>');
  await expect(p.locator('clearfeed-guard')).toHaveCount(1);
  const source = p.locator('#link');
  await source.focus(); await p.keyboard.press('Enter');
  const dialog = p.getByRole('dialog', { name: 'Review this link' });
  const back = dialog.getByRole('button', { name: 'Go back' });
  const follow = dialog.getByRole('link', { name: 'Continue to link' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(e => e.matches('dialog:modal'))).toBe(true);
  await expect(back).toBeFocused();
  await p.locator('#outside').evaluate(e => (e as HTMLElement).focus());
  await expect(back).toBeFocused();
  await p.keyboard.press('Tab'); await expect(follow).toBeFocused();
  await p.keyboard.press('Shift+Tab'); await expect(back).toBeFocused();
  await p.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await expect(source).toBeFocused();
  await p.keyboard.press('Enter'); await back.click();
  await expect(dialog).toHaveCount(0); await expect(source).toBeFocused();
  await p.keyboard.press('Enter');
  // Page scripts may change the original anchor, but confirmation uses the snapshot.
  await source.evaluate(e => e.setAttribute('href', 'https://changed.example/'));
  await context.route('https://paypal.com.account-review.example/path', route => route.fulfill({ contentType: 'text/html', body: html('<p>Reviewed destination</p>') }), { times: 1 });
  const opened = context.waitForEvent('page'); await follow.click();
  const destination = await opened;
  await expect(destination).toHaveURL('https://paypal.com.account-review.example/path');
  await expect(dialog).toHaveCount(0);
  await expect(source).toBeFocused();
  expect(p.url()).toBe('https://article.example.com/keyboard');
});

test('page report keeps keyboard focus through live findings and returns it on close', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const p = await fixture('https://article.example.com/report-focus', '<article><p>This article was generated using AI.</p><a id="link" href="https://evil.test">paypal.com</a></article>');
  const badge = p.locator('clearfeed-guard .badge');
  await expect(badge).toHaveAttribute('aria-expanded', 'false');
  await badge.focus(); await p.keyboard.press('Enter');
  const settings = p.getByRole('button', { name: 'Protection settings' });
  await expect(settings).toBeFocused();
  await expect(badge).toHaveAttribute('aria-controls', 'page-report');
  await expect(badge).toHaveAttribute('aria-expanded', 'true');
  await p.locator('#link').evaluate(e => e.setAttribute('href', 'https://paypal.com'));
  await expect(p.getByText('Displayed address differs', { exact: true })).toHaveCount(0);
  await expect(settings).toBeFocused();
  await p.getByRole('button', { name: 'Close report' }).focus();
  await p.keyboard.press('Enter');
  await expect(badge).toBeFocused();
  await expect(badge).toHaveAttribute('aria-expanded', 'false');
  // A background scan must update the badge without replacing the focused button.
  await p.locator('article p').evaluate(e => { e.textContent = 'A human-written example.'; });
  await expect(badge).toHaveAccessibleName('KeepItReel · page check');
  await expect(badge).toHaveText('');
  await expect(badge.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(badge.locator('.question-mark')).toHaveCount(0);
  const bounds = await badge.boundingBox(); expect(bounds!.width).toBeGreaterThanOrEqual(44); expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await expect(badge).toBeFocused();
});

test('sensitive forms, draft editors and private integrations are excluded', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const login = await fixture('https://login.example.com/', '<input type="password"><article>This article was generated using AI.</article>');
  await login.getByRole('button', { name: 'KeepItReel · paused' }).click(); await expect(login.getByText(/Password, payment, or code form detected/)).toBeVisible();
  const mail = await fixture('https://mail.google.com/mail/u/0/', '<div class="adn"><div class="a3s aiL">Please send your verification code.</div></div>');
  await mail.getByRole('button', { name: 'KeepItReel · paused' }).click(); await expect(mail.getByText('Email checks are off', { exact: true })).toBeVisible(); await expect(mail.locator('clearfeed-message')).toHaveCount(0);
  const linkedin = await fixture('https://www.linkedin.com/mynetwork/', '<div class="invitation-card">Please send your password.</div>');
  await expect(linkedin.locator('clearfeed-guard')).toHaveCount(0); await expect(linkedin.locator('clearfeed-message')).toHaveCount(0);
});

for (const domain of ['outlook.live.com', 'outlook.cloud.microsoft']) {
  test(`Outlook plain-date rows have a compact corner control on ${domain}`, async () => {
    await action({ type: 'settings', patch: { protection: { ...enabled, email: false } } });
    const p = await fixture(`https://${domain}/mail/0/`, `<style>
      body{max-width:none;margin:20px} [role=listbox]{width:360px;max-width:100%;overflow:hidden}
      .mail-row{box-sizing:border-box;position:relative;height:100px;padding:12px 14px 12px 44px;border-bottom:1px solid #c5d0d9;background:#e6f0fa}
      .mail-row .line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:24px}
      .date{float:right}.actions{position:absolute;right:8px;top:8px;display:none}.mail-row:hover .actions,.mail-row:focus-within .actions{display:flex}
      .actions button{width:24px;height:24px}.select{position:absolute;left:12px;top:16px}
      </style><h1>Fictional Outlook inbox</h1><div role="listbox">
      <div role="option" data-convid="fictional-one" class="mail-row" id="plain-date"><input class="select" type="checkbox" aria-label="Select message"><div class="line">Fictional sender</div><div class="line"><span class="date">14:18</span>Test message</div><div class="line" id="snippet">Please send your verification code.</div><div class="actions"><button aria-label="Flag">⚑</button><button aria-label="Delete">×</button></div></div>
      </div><div role="option">Sidebar option</div><p>Fictional fixture. No mailbox connection.</p>`);
    const row = p.locator('#plain-date'); const before = (await row.boundingBox())!;
    const initialStyle = await row.getAttribute('style');
    await p.evaluate(() => { (window as any).rowClicks = 0; (window as any).actionClicks = 0; document.querySelector('#plain-date')!.addEventListener('click', () => (window as any).rowClicks++); document.querySelector('.actions')!.addEventListener('click', e => { e.stopPropagation(); (window as any).actionClicks++; }); });
    await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
    const trigger = row.locator('clearfeed-inbox .email-trigger');
    await expect(trigger).toHaveAttribute('data-tone', 'red');
    await expect(p.locator('clearfeed-inbox')).toHaveCount(1);
    const after = (await row.boundingBox())!; const button = (await trigger.boundingBox())!; const date = (await row.locator('.date').boundingBox())!;
    expect(after.height).toBe(before.height); expect(after.width).toBe(before.width);
    expect(button.width).toBe(24); expect(button.height).toBe(24);
    expect(button.x + button.width).toBeLessThanOrEqual(after.x + after.width);
    expect(button.y).toBeGreaterThanOrEqual(date.y + date.height);
    await trigger.hover(); await expect(row.locator('.email-hint')).toBeVisible();
    const toolbar = (await row.locator('.actions').boundingBox())!; expect(button.y).toBeGreaterThan(toolbar.y + toolbar.height);
    await trigger.click(); await expect(row.locator('.email-analysis')).toBeVisible();
    expect(await p.evaluate(() => (window as any).rowClicks)).toBe(0);
    await p.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await p.keyboard.press('Enter'); await expect(row.locator('.email-analysis')).toBeVisible();
    await p.keyboard.press('Escape');
    await row.getByRole('button', { name: 'Flag', exact: true }).click();
    expect(await p.evaluate(() => (window as any).actionClicks)).toBe(1);
    await expect(row.locator('input')).not.toBeChecked();
    await row.locator('#snippet').evaluate(e => { e.textContent = 'Meeting tomorrow'; });
    await expect(trigger).toHaveAttribute('data-tone', 'grey');
    await expect(p.locator('clearfeed-inbox')).toHaveCount(1);
    expect((await row.boundingBox())!.height).toBe(before.height);
    await p.setViewportSize({ width: 390, height: 650 });
    await trigger.click(); const panel = (await row.locator('.email-analysis').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0); expect(panel.x + panel.width).toBeLessThanOrEqual(390);
    await p.keyboard.press('Escape'); await p.mouse.move(0, 0);
    await p.screenshot({ path: path.join(scratch, `screenshots/outlook-corner-${domain}.png`) });
    await action({ type: 'settings', patch: { protection: { ...enabled, email: false } } });
    await expect(p.locator('clearfeed-inbox')).toHaveCount(0);
    expect((await row.getAttribute('style')) || null).toBe(initialStyle);
  });
}

test('Gmail checks opened messages locally, ignores quotes and drafts, and forgets removed items', async () => {
  const outgoing: string[] = []; context.on('request', request => { if (!request.isNavigationRequest() && /^https?:/.test(request.url())) outgoing.push(request.url()); });
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const p = await fixture('https://mail.google.com/mail/u/0/#inbox/123', '<div class="adn"><span class="gD" email="sender@example.com">Sender</span><div class="a3s aiL"><p>Please send your verification code.</p><a href="https://evil.test">paypal.com</a><blockquote>Send gift cards.</blockquote></div></div><div contenteditable="true" class="a3s aiL">Send your password.</div>');
  await expect(p.locator('clearfeed-message')).toHaveCount(1);
  await expect(p.locator('clearfeed-message')).toContainText('Request for a private code or secret');
  await expect(p.locator('clearfeed-message')).not.toContainText('Unusual payment');
  await p.locator('clearfeed-message .email-trigger').click();
  await p.locator('clearfeed-message summary').click();
  await expect(p.locator('clearfeed-message').getByText(/Attachments, authentication headers and AI authorship are not verified/)).toBeVisible();
  const stored = await options.evaluate(async () => ({ local: await (globalThis as any).chrome.storage.local.get(null), session: await (globalThis as any).chrome.storage.session.get(null) }));
  expect(JSON.stringify(stored)).not.toContain('verification code'); expect(JSON.stringify(stored)).not.toContain('sender@example.com'); expect(outgoing).toEqual([]);
  await p.locator('.adn').evaluate(e => e.remove());
  await expect(p.locator('clearfeed-message')).toHaveCount(0);
  await p.locator('clearfeed-guard .badge').click();
  await expect(p.getByText(/No supported opened message found/)).toBeVisible();
});

test('Outlook supported messages are checked and unfamiliar layouts have an explicit coverage state', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const p = await fixture('https://outlook.live.com/mail/0/', '<div aria-label="Message body">Please pay the activation fee.<a href="https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fpaypal.com">paypal.com</a></div>');
  await expect(p.locator('clearfeed-message')).toHaveCount(1); await expect(p.locator('clearfeed-message')).toContainText('Upfront fee requested');
  await expect(p.locator('clearfeed-message')).not.toContainText('Displayed address differs');
  await p.locator('[aria-label="Message body"]').evaluate(e => e.removeAttribute('aria-label'));
  await expect(p.locator('clearfeed-message')).toHaveCount(0);
  await p.getByRole('button', { name: 'KeepItReel · page check' }).click(); await expect(p.getByText(/No supported opened message found/)).toBeVisible();
});

test('LinkedIn is excluded for existing and new tabs, even with legacy flags', async () => {
  const existing = await fixture('https://www.linkedin.com/mynetwork/', '<article>This article was generated using AI.</article>');
  await action({ type: 'settings', patch: { protection: { ...enabled, linkedin: true } } });
  const scripts = await options.evaluate(async () => (globalThis as any).chrome.scripting.getRegisteredContentScripts());
  expect(scripts[0].excludeMatches.sort()).toEqual(['*://linkedin.com/*', '*://*.linkedin.com/*'].sort());
  for (const host of ['linkedin.com', 'uk.linkedin.com']) {
    const page = await fixture('https://' + host + '/mynetwork/', '<div class="invitation-card">Please send your verification code.</div>');
    await expect(page.locator('clearfeed-guard,clearfeed-message,clearfeed-panel')).toHaveCount(0);
  }
  await expect(existing.locator('clearfeed-guard,clearfeed-message,clearfeed-panel')).toHaveCount(0);
  const state = await action({ type: 'get' }); expect(state.settings.protection).not.toHaveProperty('linkedin');
});

test('local checker, responsive settings and page report render without background uploads', async () => {
  const outgoing: string[] = []; options.on('request', r => { if (r.url().startsWith('http')) outgoing.push(r.url()); });
  await options.getByRole('button', { name: 'Try a fictional example' }).click(); await options.getByRole('button', { name: 'Check locally' }).click();
  await expect(options.getByText('Request for a private code or secret', { exact: true })).toBeVisible();
  await expect(options.getByText('Brand name inside another domain', { exact: true })).toBeVisible();
  await options.evaluate(() => scrollTo(0, 0));
  await options.screenshot({ path: path.join(scratch, 'screenshots/protection-settings.png'), fullPage: true });
  await options.screenshot({ path: path.join(scratch, 'screenshots/protection-preview.png') });
  await options.setViewportSize({ width: 600, height: 900 }); expect(await options.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await options.screenshot({ path: path.join(scratch, 'screenshots/protection-mobile.png'), fullPage: true }); await options.setViewportSize({ width: 1360, height: 1000 });
  expect(outgoing).toEqual([]);
  await options.getByRole('button', { name: 'Clear', exact: true }).click(); await expect(options.getByLabel('Message or page text')).toHaveValue('');
  await action({ type: 'settings', patch: { protection: enabled } });
  const p = await fixture('https://article.example.com/', '<article><h1>Beyond the feed.</h1><p>A fictional page used to demonstrate KeepItReel’s local checks.</p><p>This article was generated using AI.</p><a href="https://paypal.com.account-review.example">paypal.com</a></article>');
  await p.getByRole('button', { name: /KeepItReel · 1 concern/ }).click(); await p.screenshot({ path: path.join(scratch, 'screenshots/protection-report.png'), fullPage: true });
});


test('feedback export includes only reviewed diagnostics and voluntary notes', async () => {
  await action({ type: 'settings', patch: { protection: enabled } });
  const page = await fixture('https://private.example.com/message?token=secret-value', '<article>Private body text<a href="https://evil.test">paypal.com</a></article>');
  await page.getByRole('button', { name: /KeepItReel · 1 concern/ }).click();
  const opened = context.waitForEvent('page'); await page.getByRole('button', { name: 'Report a problem' }).click();
  const report = await opened; await report.waitForURL(/options.html\?feedback=[a-f0-9-]+#beta/);
  await expect(report.getByLabel('Feature', { exact: true })).toHaveValue('web');
  await report.getByLabel('Your note', { exact: false }).fill('The warning was confusing.');
  await report.getByRole('button', { name: 'Preview feedback file' }).click();
  const json = await report.getByLabel('Feedback file preview').textContent();
  expect(JSON.parse(json!).feedback.codes).toContain('destination-mismatch');
  for (const secret of ['private.example.com', 'secret-value', 'Private body', 'evil.test']) expect(json).not.toContain(secret);
  const downloaded = report.waitForEvent('download'); await report.getByRole('button', { name: 'Export feedback file' }).click();
  const download = await downloaded; expect(download.suggestedFilename()).toBe('keepitreel-feedback-0.3.21.json');
  expect(fs.readFileSync((await download.path())!, 'utf8')).toBe(json);
  expect(await report.evaluate(async () => Object.keys(await (globalThis as any).chrome.storage.session.get(null)).filter(k => k.startsWith('feedbackDraft')))).toEqual([]);
});


test('revoke control pauses checks without claiming fixture required access was removed', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const page = await fixture('https://article.example.com/revoke', '<article>This article was generated using AI.</article>');
  await expect(page.locator('clearfeed-guard')).toHaveCount(1);
  await options.getByRole('button', { name: 'Turn off and revoke optional access' }).click();
  await expect(options.getByRole('switch', { name: 'Automatic website scanning' })).toHaveAttribute('aria-checked', 'false');
  await expect(options.getByRole('switch', { name: 'Gmail & Outlook webmail (experimental)' })).toHaveAttribute('aria-checked', 'false');
  // Settings update first; scanner removal completes asynchronously in Chrome.
  await expect.poll(() => options.evaluate(async () => (globalThis as any).chrome.scripting.getRegisteredContentScripts())).toEqual([]);
  await expect(page.getByRole('button', { name: 'KeepItReel · paused' })).toBeVisible();
  // This test copy has required broad access: Chrome retains it or rejects removal.
  // The UI must never promise that access was removed in either case.
  await expect(options.locator('[role="status"]').filter({ hasText: 'Optional site access removed.' })).toHaveCount(0);
});

for (const provider of ['Gmail', 'Outlook']) {
  test(`${provider} compact monkey reports appear before long emails with accurate colours and keyboard controls`, async () => {
    await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
    const attributes = provider === 'Gmail' ? 'class="a3s aiL"' : 'aria-label="Message body"';
    const url = provider === 'Gmail' ? 'https://mail.google.com/mail/u/0/#inbox/compact' : 'https://outlook.live.com/mail/0/';
    const page = await fixture(url, `<article><h1>Fictional email</h1><div id="body" ${attributes}><p>Please send your verification code.</p>${'<p>More ordinary message content.</p>'.repeat(55)}</div></article>`);
    const host = page.locator('clearfeed-message'); const trigger = host.locator('.email-trigger'); const panel = host.locator('.email-analysis');
    await expect(trigger).toHaveAttribute('data-tone', 'red');
    await expect(trigger).toHaveAccessibleName(/High-risk request found/);
    expect(await host.evaluate(e => e.nextElementSibling?.id)).toBe('body');
    expect((await host.boundingBox())!.height).toBeLessThanOrEqual(48);
    await expect(panel).toBeHidden();
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(panel).toBeVisible(); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.getByText('Request for a private code or secret', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(panel).toBeHidden(); await expect(trigger).toBeFocused();
    await page.keyboard.press('Space'); await expect(panel).toBeVisible();
    await page.locator('h1').click(); await expect(panel).toBeHidden();
    await trigger.click(); await host.getByRole('button', { name: 'Dismiss for this message' }).click();
    await expect(trigger).toHaveAttribute('data-tone', 'red');
    await expect(host.getByRole('button', { name: 'Show warning' })).toBeFocused();
    await host.getByRole('button', { name: 'Show warning' }).click();
    await host.getByRole('button', { name: 'Close email analysis' }).click(); await expect(trigger).toBeFocused();
    // A replacement message closes the previous analysis and changes its accessible status.
    await trigger.click();
    await page.locator('#body').evaluate(e => { e.innerHTML = '<p>Never share your verification code.</p>'; });
    await expect(trigger).toHaveAttribute('data-tone', 'green'); await expect(panel).toBeHidden();
    await trigger.click(); await expect(panel.getByText(/does not establish that the email is safe/)).toBeVisible();
    await host.getByRole('button', { name: 'Close email analysis' }).click();
    await page.evaluate(() => { const section = document.createElement('section'); document.querySelector('article')!.append(section); section.append(document.querySelector('#body')!); });
    await expect(page.locator('section > clearfeed-message:has(+ #body)')).toHaveCount(1);
    await page.locator('#body').evaluate(e => { e.innerHTML = '<a href="https://example.org">https://example.com</a>'; });
    await expect(trigger).toHaveAttribute('data-tone', 'yellow');
    await page.setViewportSize({ width: 390, height: 600 });
    await trigger.click(); await expect(panel.getByText('Displayed address differs', { exact: true })).toBeVisible();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(600);
    await action({ type: 'settings', patch: { protection: { ...enabled, email: false } } });
    await expect(host).toHaveCount(0);
  });

  test(`${provider} keeps explanations, dismissal and recycled messages separate`, async () => {
    await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
    const gmail = provider === 'Gmail';
    const attributes = gmail ? 'class="a3s aiL"' : 'aria-label="Message body"';
    const url = gmail ? 'https://mail.google.com/mail/u/0/#inbox/test' : 'https://outlook.office.com/mail/';
    const page = await fixture(url, `<div class="adn"><div id="first" ${attributes}><p>Please <b>send</b> your verification code.</p><a href="https://different.test/">paypal.com</a></div></div><div class="adn"><div id="second" ${attributes}>Please pay the activation fee.</div></div>`);
    const first = page.locator('clearfeed-message:has(+ #first)'); const second = page.locator('clearfeed-message:has(+ #second)');
    await expect(page.locator('clearfeed-message')).toHaveCount(2);
    await first.locator('.email-trigger').click();
    await expect(first.getByText('Request for a private code or secret', { exact: true })).toBeVisible();
    await expect(first).not.toContainText('Upfront fee requested');
    await first.getByRole('button', { name: 'Close email analysis' }).click();
    await second.locator('.email-trigger').click(); await expect(second.getByText('Upfront fee requested', { exact: true })).toBeVisible();
    await expect(second).not.toContainText('Request for a private code or secret');
    await second.getByRole('button', { name: 'Close email analysis' }).click();
    await first.locator('.email-trigger').click();
    await first.getByRole('button', { name: 'Dismiss for this message' }).click();
    await expect(first.getByRole('button', { name: 'Show warning' })).toBeFocused();
    await expect(second).toContainText('Flagged email');
    // Dismissal is not a sender allowlist and does not disable the link guard.
    await first.getByRole('button', { name: 'Close email analysis' }).click();
    await page.locator('#first a').click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
    await first.locator('.email-trigger').click();
    await first.getByRole('button', { name: 'Show warning' }).click();
    await expect(first.getByRole('button', { name: 'Close email analysis' })).toBeFocused();
    await first.getByRole('button', { name: 'Dismiss for this message' }).click();
    await page.locator('#first').evaluate(e => { e.innerHTML = '<p>A different email: please send your verification code.</p>'; });
    await expect(first).toContainText('Flagged email'); await expect(first.getByRole('button', { name: 'Show warning' })).toHaveCount(0);
    // Collapse via CSS, as webmail often does, must remove its notice.
    await page.locator('#second').evaluate(e => { (e as HTMLElement).style.display = 'none'; });
    await expect(second).toHaveCount(0);
    await page.locator('#second').evaluate(e => { (e as HTMLElement).style.display = ''; });
    await expect(second).toContainText('Flagged email');
    await action({ type: 'settings', patch: { protection: { ...enabled, email: false } } });
    await expect(page.locator('clearfeed-message')).toHaveCount(0);
  });
}

test('Outlook reply quotes, drafts and ordinary messages are not presented as suspicious mail', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const page = await fixture('https://outlook.live.com/mail/0/', '<div aria-label="Message content"><div id="UniqueMessageBody_1"><p>Thanks for your help.</p><div id="divRplyFwdMsg">Earlier reply</div><p>Send your password.</p><a id="quoted" href="https://different.test/">paypal.com</a></div><div id="UniqueMessageBody_2"><p>Your invoice is attached. Please pay by bank transfer by Friday.</p></div></div><div contenteditable="true" aria-label="Message body">Send gift cards.</div>');
  await expect(page.locator('clearfeed-message')).toHaveCount(2);
  await expect(page.locator('clearfeed-message').first()).toContainText('Opened message checked');
  await expect(page.locator('clearfeed-message').last()).toContainText('Opened message checked');
  await page.locator('clearfeed-message .email-trigger').first().click();
  await expect(page.locator('clearfeed-message').first()).toContainText('0 web links inspected');
  expect(await page.locator('#quoted').evaluate(a => {
    let intercepted: boolean | undefined;
    a.addEventListener('click', e => { intercepted = e.defaultPrevented; e.preventDefault(); }, { once: true });
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return intercepted;
  })).toBe(false);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('email link notes, disabled checks and partial coverage do not claim safety', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const page = await fixture('https://mail.google.com/mail/u/0/#inbox/notes', '<div class="a3s aiL"><p>Hello, here is our newsletter.</p><a href="https://bit.ly/example">Read it</a></div>');
  const notice = page.locator('clearfeed-message');
  await expect(notice).toContainText('Link notes'); await expect(notice).not.toContainText('Flagged email');
  await notice.locator('.email-trigger').click(); await expect(notice.getByText('Destination is shortened', { exact: true })).toBeVisible();
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true, links: false } } });
  await expect(notice).toContainText('Partial email check');
  await notice.locator('.email-trigger').click(); await expect(notice.getByText(/Link checks are off/)).toBeVisible();
  await page.locator('.a3s').evaluate(e => { e.textContent = 'x'.repeat(31000); });
  await expect(notice).toContainText('this message exceeded the text or link limits'); await notice.locator('.email-trigger').click();
  await expect(notice.getByText(/this message exceeded the text or link limits/)).toBeVisible();
  await page.locator('.a3s').evaluate(e => { e.innerHTML = '<img alt="Please send your password" src="https://example.com/image.png">'; });
  await expect(notice).toContainText('No readable message text found');
  await expect(notice).not.toContainText('Opened message checked');
});

test('email incorrect-warning drafts contain only that message categories and stay separate', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const page = await fixture('https://mail.google.com/mail/u/0/#inbox/private-identifier', '<div class="adn"><span class="gD" email="private-person@example.com">Person</span><div class="a3s aiL" id="report-one">Private unique phrase: send your verification code.</div></div><div class="adn"><div class="a3s aiL" id="report-two">Pay the activation fee.</div></div>');
  const drafts: Page[] = [];
  for (const id of ['report-one', 'report-two']) {
    await page.bringToFront(); const notice = page.locator(`clearfeed-message:has(+ #${id})`);
    await notice.locator('.email-trigger').click();
    const opened = context.waitForEvent('page'); await notice.getByRole('button', { name: 'Report incorrect warning' }).click();
    drafts.push(await opened);
    await page.bringToFront(); await notice.getByRole('button', { name: 'Close email analysis' }).click();
  }
  const expected = [['secret-request'], ['upfront-fee']];
  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]; await draft.waitForURL(/options.html\?feedback=[a-f0-9-]+#beta/);
    await expect(draft.getByLabel('Feature', { exact: true })).toHaveValue('email');
    await expect(draft.getByLabel('What happened?')).toHaveValue('wrong_warning');
    await draft.getByRole('button', { name: 'Preview feedback file' }).click();
    const text = await draft.getByLabel('Feedback file preview').textContent(); expect(JSON.parse(text!).feedback.codes).toEqual(expected[i]);
    for (const secret of ['private-person', 'private-identifier', 'Private unique phrase', 'verification code', 'activation fee']) expect(text).not.toContain(secret);
  }
  expect(drafts[0].url()).not.toBe(drafts[1].url());
  const storage = await options.evaluate(async () => ({ local: await (globalThis as any).chrome.storage.local.get(null), session: await (globalThis as any).chrome.storage.session.get(null) }));
  for (const secret of ['private-person', 'private-identifier', 'Private unique phrase', 'verification code', 'activation fee']) expect(JSON.stringify(storage)).not.toContain(secret);
});

test('a stale dismiss action cannot suppress a replacement email before the next scan', async () => {
  await action({ type: 'settings', patch: { protection: { ...enabled, email: true } } });
  const page = await fixture('https://mail.google.com/mail/u/0/#inbox/stale', '<div class="a3s aiL">First email: send your password.</div>');
  await expect(page.locator('clearfeed-message')).toContainText('Flagged email');
  await page.locator('clearfeed-message .email-trigger').click();
  await page.evaluate(() => {
    document.querySelector('.a3s')!.textContent = 'Replacement email: send your password.';
    const buttons = document.querySelector('clearfeed-message')!.shadowRoot!.querySelectorAll('button');
    Array.from(buttons).find(b => b.textContent === 'Dismiss for this message')!.click();
  });
  await expect(page.getByText('The message changed. Wait for its updated check.')).toBeVisible();
  await expect(page.getByText('The message changed. Wait for its updated check.')).toHaveCount(0);
  await expect(page.locator('clearfeed-message')).not.toContainText('Replacement email');
  await page.locator('clearfeed-message .email-trigger').click();
  await expect(page.locator('clearfeed-message').getByRole('button', { name: 'Dismiss for this message' })).toBeVisible();
  await expect(page.locator('clearfeed-message').getByRole('button', { name: 'Show warning' })).toHaveCount(0);
});
