import { defineContentScript } from 'wxt/utils/define-content-script';
import { startFeed } from '../lib/feed';
export default defineContentScript({
  matches: ['*://www.youtube.com/*', '*://www.tiktok.com/*', '*://www.google.com/search*', '*://www.google.se/search*', '*://www.google.co.uk/search*', '*://www.google.de/search*', '*://www.google.fr/search*', '*://www.google.ca/search*', '*://www.google.com.au/search*'],
  runAt: 'document_idle',
  async main(ctx) { const cleanup = await startFeed(); if (cleanup) ctx.onInvalidated(cleanup); },
});
