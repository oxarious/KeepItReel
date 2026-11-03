import { Readability } from '@mozilla/readability';
import { browser } from 'wxt/browser';
import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { excludedHost } from '../lib/protection-config';
export default defineUnlistedScript(async () => {
  if (excludedHost(location.hostname)) return;
  const selected = window.getSelection()?.toString().trim();
  const article = selected ? null : new Readability(document.cloneNode(true) as Document).parse();
  const text = selected || article?.textContent || '';
  await browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'draft', text: text.slice(0, 30000) });
});
