import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

let context: BrowserContext;
let options: Page;
let extensionUrl: string;

async function action(data: Record<string, unknown>) {
  return options.evaluate(async data => {
    const result = await (globalThis as any).chrome.runtime.sendMessage({ namespace: 'clearfeed', ...data });
    if (result?.error) throw new Error(result.error);
    return result;
  }, data);
}

async function feed(title = 'Election news today') {
  const page = await context.newPage();
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><style>body{font:16px system-ui;margin:30px}ytd-rich-item-renderer{display:block;position:relative;min-height:300px;padding:20px;border:1px solid #ccc}a{display:block}</style></head><body><ytd-rich-item-renderer><a id="video-title" href="/watch?v=example">${title}</a><ytd-channel-name><a href="/@example">@example</a></ytd-channel-name></ytd-rich-item-renderer></body></html>` })
    : route.abort());
  await page.goto('https://www.youtube.com/');
  await expect(page.locator('.email-trigger')).toBeVisible();
  return page;
}

test.beforeAll(async () => {
  const extension = path.resolve('.output/chrome-mv3');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 1360, height: 950 },
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  extensionUrl = `chrome-extension://${new URL(worker.url()).host}`;
  options = await context.newPage();
  await options.goto(`${extensionUrl}/options.html`);
});

test.beforeEach(async () => {
  await action({ type: 'reset' });
  await options.setViewportSize({ width: 1360, height: 950 });
  await options.goto(`${extensionUrl}/options.html#topics`);
  await expect(options.getByRole('heading', { name: 'Topic filters', exact: true })).toBeVisible();
});

test.afterEach(async () => {
  for (const page of context.pages()) if (page !== options) await page.close();
});
test.afterAll(async () => { await context.close(); });

test('topic controls save, explain, show once, export and undo without a warning colour', async () => {
  const page = await feed();
  await options.getByLabel('Word or phrase').fill('election');
  await options.getByRole('combobox', { name: 'Duration', exact: true }).selectOption('week');
  await options.getByRole('button', { name: 'Add topic', exact: true }).click();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(1);
  await expect(page.getByText('Matches your topic filter: “election”', { exact: true })).toBeVisible();
  await expect(page.locator('.email-trigger')).toHaveAttribute('data-tone', 'green');
  const saved = await action({ type: 'get' });
  expect(saved.topicRules[0].expiresAt).toBeGreaterThan(Date.now() + 6 * 86400000);
  await page.getByRole('button', { name: 'Show once', exact: true }).click();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(1);
  await options.goto(`${extensionUrl}/options.html#lists`);
  const downloadPromise = options.waitForEvent('download');
  await options.getByRole('button', { name: 'Export settings' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString()).topicRules).toEqual(saved.topicRules);
  await page.getByRole('button', { name: 'Undo topic filter', exact: true }).click();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(0);
  expect((await action({ type: 'get' })).topicRules).toEqual([]);
});

test('short-lived topic and creator rules expire on an idle feed', async () => {
  const page = await feed();
  for (const kind of ['topic', 'creator']) {
    const expiresAt = Date.now() + 2500;
    await action(kind === 'topic'
      ? { type: 'topicRule', rule: { id: crypto.randomUUID(), phrase: 'election', platform: 'youtube', expiresAt } }
      : { type: 'rule', rule: { platform: 'youtube', key: '@example', name: 'Example', action: 'block', expiresAt } });
    await expect(page.locator('[data-cf-filter]')).toHaveCount(1);
    // No scroll, click or navigation should be needed to remove an expired cover.
    await expect(page.locator('[data-cf-filter]')).toHaveCount(0, { timeout: 7000 });
  }
});

test('creator duration in the monkey analysis keeps Undo and does not add topic rules', async () => {
  await action({ type: 'settings', patch: { theme: 'dark' } });
  const page = await feed();
  await page.locator('.email-trigger').click();
  await page.getByRole('combobox', { name: 'Block duration', exact: true }).selectOption('day');
  expect(await page.locator('.block-duration').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(24, 38, 31)');
  await page.screenshot({ path: 'test-results/timed-creator-dark.png' });
  await page.getByRole('button', { name: 'Block creator @example', exact: true }).click();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(1);
  const state = await action({ type: 'get' });
  expect(state.rules[0].expiresAt).toBeGreaterThan(Date.now() + 23 * 3600000);
  expect(state.topicRules).toEqual([]);
  await page.locator('clearfeed-undo').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(0);
  expect((await action({ type: 'get' })).rules).toEqual([]);
});

test('dismissing a spam warning preserves a personal topic cover', async () => {
  const page = await feed('Election: send me your verification code.');
  await action({ type: 'topicRule', rule: { id: crypto.randomUUID(), phrase: 'election', platform: 'youtube' } });
  await expect(page.locator('[data-cf-filter]')).toHaveCount(1);
  await page.locator('.email-trigger').click();
  await page.getByRole('button', { name: 'Dismiss flag', exact: true }).click();
  await expect(page.locator('[data-cf-filter]')).toHaveCount(1);
  await expect(page.getByText('Matches your topic filter: “election”', { exact: true })).toBeVisible();
});

test('guided setup skips optional permissions, practices locally and persists completion', async () => {
  await options.goto(`${extensionUrl}/options.html#welcome`);
  await expect(options.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
  const permissions = () => options.evaluate(() => (globalThis as any).chrome.permissions.getAll());
  const before = await permissions();
  await options.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(options.getByRole('heading', { name: 'Optional website and email checks' })).toBeVisible();
  await expect(options.getByRole('heading', { name: 'Excluded sites' })).toHaveCount(0);
  await options.getByRole('button', { name: 'Continue to example' }).click();
  await options.getByRole('button', { name: 'Try filter', exact: true }).click();
  await expect(options.getByText('Hidden by your practice filter', { exact: true })).toBeVisible();
  await options.getByRole('button', { name: 'Undo practice filter' }).click();
  await expect(options.getByText('Election news this morning', { exact: true })).toBeVisible();
  expect((await action({ type: 'get' })).topicRules).toEqual([]);
  expect(await permissions()).toEqual(before);
  await options.getByRole('button', { name: 'Finish setup' }).click();
  await expect(options).toHaveURL(/#overview$/);
  await options.reload();
  expect((await action({ type: 'get' })).setupCompleted).toBe(true);
  await options.getByRole('link', { name: 'Getting started', exact: true }).click();
  await expect(options.getByRole('heading', { name: 'Choose your feeds' })).toBeVisible();
});

test('topic form stays usable in dark mode and a narrow settings window', async () => {
  await action({ type: 'settings', patch: { theme: 'dark' } });
  await options.setViewportSize({ width: 720, height: 900 });
  await options.getByLabel('Word or phrase').fill('electric cars');
  await options.getByRole('combobox', { name: 'Platform', exact: true }).selectOption('all');
  await options.getByRole('button', { name: 'Add topic', exact: true }).click();
  await expect(options.getByRole('heading', { name: 'Your topics (1/100)' })).toBeVisible();
  expect(await options.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await options.screenshot({ path: 'test-results/topic-filters-dark.png', fullPage: true });
  await options.getByRole('button', { name: 'Undo added topic' }).click();
  await expect(options.getByRole('heading', { name: 'Your topics (0/100)' })).toBeVisible();
});

test('topic scope covers active Shorts and TikTok captions but not YouTube descriptions', async () => {
  await action({ type: 'topicRule', rule: { id: crypto.randomUUID(), phrase: 'election', platform: 'all' } });
  const scenes = [
    {
      url: 'https://www.youtube.com/shorts/example',
      markup: '<ytd-shorts><ytd-reel-video-renderer is-active video-id="example"><div id="shorts-player"><a id="video-title" href="/shorts/example">Election news</a></div><yt-reel-channel-bar-view-model><a href="/@example/shorts">@example</a></yt-reel-channel-bar-view-model></ytd-reel-video-renderer></ytd-shorts>',
      matches: 1,
    },
    {
      url: 'https://www.tiktok.com/',
      markup: '<div data-e2e="feed-item"><a href="https://www.tiktok.com/@example/video/12345">Play</a><div data-e2e="video-desc">Election news</div></div>',
      matches: 1,
    },
    {
      url: 'https://www.youtube.com/',
      markup: '<ytd-rich-item-renderer><a id="video-title" href="/watch?v=example">An ordinary video</a><ytd-channel-name><a href="/@example">@example</a></ytd-channel-name><div id="description-text">Election news</div></ytd-rich-item-renderer>',
      matches: 0,
    },
  ];
  for (const scene of scenes) {
    const page = await context.newPage();
    await page.route('**/*', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: `<!doctype html><style>ytd-reel-video-renderer,ytd-rich-item-renderer,[data-e2e="feed-item"]{display:block;position:relative;width:500px;height:650px}</style>${scene.markup}` })
      : route.abort());
    await page.goto(scene.url);
    await expect(page.locator('clearfeed-panel')).toHaveCount(1);
    await expect(page.locator('[data-cf-filter]')).toHaveCount(scene.matches);
    await page.close();
  }
});

test('serialized topic actions preserve concurrent edits and reject duplicate or invalid filters', async () => {
  const first = { id: crypto.randomUUID(), phrase: 'election', platform: 'youtube' };
  const second = { id: crypto.randomUUID(), phrase: 'cars', platform: 'tiktok' };
  await Promise.all([action({ type: 'topicRule', rule: first }), action({ type: 'topicRule', rule: second })]);
  expect((await action({ type: 'get' })).topicRules).toHaveLength(2);
  await expect(action({ type: 'topicRule', rule: { ...first, id: crypto.randomUUID(), phrase: ' ELECTION ' } })).rejects.toThrow('already filtered');
  await expect(action({ type: 'topicRule', rule: { ...first, id: crypto.randomUUID(), expiresAt: Date.now() - 1000 } })).rejects.toThrow('future expiry');
  await action({ type: 'removeTopic', id: first.id });
  expect((await action({ type: 'get' })).topicRules).toEqual([second]);
});
