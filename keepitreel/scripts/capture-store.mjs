import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const destination = path.resolve('../chrome-submission/assets');
const scratch = path.resolve('../../work');
fs.mkdirSync(destination, { recursive: true });
fs.mkdirSync(scratch, { recursive: true });
// Only this disposable screenshot copy has a pre-granted fixture origin.
// The release artifact and its optional permissions are never modified.
const extension = fs.mkdtempSync(path.join(scratch, 'store-screenshots-'));
fs.cpSync('.output/chrome-mv3', extension, { recursive: true });
const manifestPath = path.join(extension, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.host_permissions = ['http://*/*', 'https://*/*'];
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.getByRole('heading', { name: 'Overview' }).waitFor();
  await page.screenshot({ path: path.join(destination, 'store-01-overview.png') });
  await page.goto(`chrome-extension://${id}/options.html#check`);
  await page.getByRole('button', { name: 'Try a fictional example' }).click();
  await page.getByRole('button', { name: 'Check locally' }).click();
  await page.getByText('Request for a private code or secret', { exact: true }).waitFor();
  // Capture the real top-of-page layout at the mandated store image size.
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(destination, 'store-02-local-checker.png') });
  await page.evaluate(async () => chrome.runtime.sendMessage({ namespace: 'clearfeed', type: 'settings', patch: { protection: { websites: true, links: true, email: false, excludedDomains: [] } } }));
  const demo = await context.newPage();
  await demo.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><meta charset="UTF-8"><title>KeepItReel fictional demonstration</title><style>body{font:18px/1.8 system-ui;color:#263c33;background:#f5f4ef;margin:90px 70px;max-width:590px}h1{font:52px/1.15 Georgia}small{letter-spacing:2px}a{color:#28634a}p{max-width:480px}</style><small>FICTIONAL DEMONSTRATION</small><article><h1>Sample page check</h1><p>This sample shows how KeepItReel explains a disclosure and a misleading address.</p><p>This article was generated using AI.</p><a href="https://review.example/verify">paypal.com</a><p>No real account, sender or payment is involved.</p></article></html>' }));
  await demo.goto('https://demo.example.com/keepitreel');
  await demo.getByRole('button', { name: /KeepItReel · 1 concern/ }).click();
  await demo.getByRole('region', { name: 'KeepItReel page report' }).waitFor();
  await demo.screenshot({ path: path.join(destination, 'store-03-page-report.png') });
  fs.copyFileSync('.output/chrome-mv3/icon/128.png', path.join(destination, 'store-icon.png'));
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.screenshot({ path: path.join(destination, 'store-04-dark.png') });
  console.log('Captured 4 actual 1280x800 release UI screenshots and 128px icon.');
} finally { await context.close(); }
