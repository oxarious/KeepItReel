import { browser } from 'wxt/browser';
import { hydrate, type State, type Rule, type Settings, type Item } from './model';
export type Action =
  | { type: 'get' } | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'sitePause'; host: string; paused: boolean }
  | { type: 'creatorBlock'; platform: 'youtube' | 'tiktok'; key: string; name: string; token: string }
  | { type: 'undoCreator'; token: string }
  | { type: 'rule'; rule: Rule } | { type: 'removeRule'; platform: string; key: string }
  | { type: 'record'; item: Item; reason: string } | { type: 'clearHistory' }
  | { type: 'forgetEvidence' } | { type: 'reset' };
export async function dispatch(action: Action): Promise<State> {
  const response = await browser.runtime.sendMessage({ namespace: 'clearfeed', ...action });
  if (response?.error) throw new Error(response.error);
  return hydrate(response);
}
export async function readState(): Promise<State> { return hydrate((await browser.storage.local.get('state')).state as Partial<State> | undefined); }
export function subscribe(callback: (s: State) => void) {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes.state) callback(hydrate(changes.state.newValue as State));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
