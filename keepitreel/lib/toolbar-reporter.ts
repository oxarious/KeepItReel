import { browser } from 'wxt/browser';
import { warningCodes } from './toolbar-warnings';

/** Only fixed category IDs leave the scanner; never page/email text or URLs. */
export function toolbarReporter(source: 'feed' | 'protection', refresh: () => void) {
  let last = '';
  const listener = (message: { namespace?: string; type?: string }) => {
    if (message?.namespace === 'clearfeed' && message.type === 'toolbarRefresh') { last = ''; refresh(); }
  };
  browser.runtime.onMessage.addListener(listener);
  return {
    publish(codes: string[], checked: boolean) {
      const summary = { codes: warningCodes(codes), checked };
      const key = JSON.stringify([location.href, summary]);
      if (key === last) return;
      last = key;
      void browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'toolbarReport', source, summary }).catch(() => { last = ''; });
    },
    dispose() { browser.runtime.onMessage.removeListener(listener); },
  };
}
