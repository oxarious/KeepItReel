import { browser } from 'wxt/browser';
import type { ProtectionSettings } from './model';
import { accessOrigins, excludedHost, excludedMatches } from './protection-config';
export { accessOrigins } from './protection-config';
// Keep the service worker independent of the DOM scanner and its classifiers.
export async function syncProtectionScripts(p: ProtectionSettings, enabled: boolean) {
  const matches: string[] = [];
  if (enabled) for (const key of ['websites', 'email'] as const) {
    if (p[key] && await browser.permissions.contains({ origins: accessOrigins[key] })) matches.push(...accessOrigins[key]);
  }
  const registered = await browser.scripting.getRegisteredContentScripts({ ids: ['clearfeed-protection'] });
  if (!matches.length) {
    if (registered.length) await browser.scripting.unregisterContentScripts({ ids: ['clearfeed-protection'] });
    return;
  }
  const script = { id: 'clearfeed-protection', matches: [...new Set(matches)], excludeMatches: excludedMatches, js: ['protection.js'], runAt: 'document_idle' as const, persistAcrossSessions: true };
  if (registered.length && JSON.stringify([...(registered[0]?.matches || [])].sort()) === JSON.stringify([...script.matches].sort()) && JSON.stringify([...(registered[0]?.excludeMatches || [])].sort()) === JSON.stringify([...excludedMatches].sort())) return;
  if (registered.length) await browser.scripting.updateContentScripts([script]);
  else await browser.scripting.registerContentScripts([script]);
  // Apply new consent to already-open pages too; the script is idempotent.
  const tabs = await browser.tabs.query({ url: script.matches });
  await Promise.allSettled(tabs.filter(t => t.id !== undefined && t.url && !excludedHost(new URL(t.url).hostname)).map(t => browser.scripting.executeScript({ target: { tabId: t.id! }, files: ['/protection.js'] })));
}
