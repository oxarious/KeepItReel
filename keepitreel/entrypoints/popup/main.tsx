import '../../lib/app-theme';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { ArrowUpRight, SlidersHorizontal, FileText } from 'lucide-react';
import { Brand, ThemeSelect, PlatformRows, Toggle, openOptions, useStore } from '../../components/common';
import { excludedHost } from '../../lib/protection-config';
import { warningTypes, type ToolbarSummary } from '../../lib/toolbar-warnings';
import { ruleIsActive } from '../../lib/filter-rules';
import { useRuleClock } from '../../components/RuleDuration';
import '../../styles/app.css';

function Popup() {
  const { state, ready, error, patch } = useStore();
  const now = useRuleClock(state.rules);
  const [scanError, setScanError] = React.useState('');
  const [pageStatus, setPageStatus] = React.useState<{ status: string; checked: number } | null>(null);
  const [warnings, setWarnings] = React.useState<ToolbarSummary>({ codes: [], checked: false });
  React.useEffect(() => {
    let epoch = 0;
    const refresh = async () => {
      const request = ++epoch;
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) return;
      const [summary, status] = await Promise.allSettled([
        browser.runtime.sendMessage({ namespace: 'clearfeed', type: 'toolbarGet', tabId: tab.id }),
        browser.tabs.sendMessage(tab.id, { namespace: 'clearfeed', type: 'protectionStatus' }),
      ]);
      if (request !== epoch) return;
      setWarnings(summary.status === 'fulfilled' && summary.value?.codes ? summary.value : { codes: [], checked: false });
      setPageStatus(status.status === 'fulfilled' && status.value?.status ? status.value : null);
    };
    const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'session' && changes.toolbarWarnings) void refresh(); };
    const activated = () => { void refresh(); };
    browser.storage.onChanged.addListener(changed); browser.tabs.onActivated.addListener(activated); void refresh();
    return () => { epoch++; browser.storage.onChanged.removeListener(changed); browser.tabs.onActivated.removeListener(activated); };
  }, []);
  const report = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    try { if (!tab?.id) throw new Error(); await browser.tabs.sendMessage(tab.id, { namespace: 'clearfeed', type: 'protectionOpen' }); window.close(); }
    catch { await openOptions('#protection'); }
  };
  const scan = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error('Open a web article before checking a page.');
      if (excludedHost(new URL(tab.url!).hostname)) throw new Error('This site is excluded from checks. You can paste text into the local checker yourself.');
      await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['/extract.js'] });
      await openOptions('#check');
    } catch (e) { setScanError((e as Error).message); }
  };
  return <div className="popup"><header><Brand/><button className="icon-button" aria-label="Open settings" onClick={() => openOptions()}><SlidersHorizontal size={19}/></button></header><div className="status-strip"><div><span className={`status-dot ${state.settings.enabled ? '' : 'paused'}`}/><strong>{state.settings.enabled ? 'Filtering is on' : 'Filtering is paused'}</strong></div><Toggle label="Enable KeepItReel" value={state.settings.enabled} onChange={v => patch({ enabled: v })} disabled={!ready}/></div><section className="toolbar-warnings" aria-label="Warnings on this tab"><strong role="status">{!state.settings.enabled ? 'Checks paused' : warnings.codes.length ? `${warnings.codes.length} warning type${warnings.codes.length === 1 ? '' : 's'} on this tab` : warnings.checked ? 'No matching warnings reported' : 'No checks reported on this tab'}</strong>{state.settings.enabled && warnings.codes.length > 0 && <details><summary>View warnings</summary><div className="toolbar-warning-list">{warnings.codes.map(code=><div key={code}><strong>{warningTypes[code].title}</strong><p>{warningTypes[code].detail}</p></div>)}</div></details>}<p className="toolbar-scope">Current local checks only. No badge does not mean safe.</p><div className="popup-visibility"><span>Show monkeys on websites</span><Toggle label="Show monkeys on websites" value={state.settings.showPageButton} onChange={v=>patch({showPageButton:v})} disabled={!ready}/></div>{!state.settings.showPageButton && <p className="toolbar-scope">Monkeys hidden. Enabled checks and filters stay active.</p>}</section><section className="protection-status"><strong>Web &amp; message protection</strong><p>{pageStatus ? `${pageStatus.status} · ${pageStatus.checked} links checked` : "Not active on this page. Enable checks and site access in settings."}</p><div className="popup-protection-actions"><button className="text-button" onClick={report}>{pageStatus ? "Open page report" : "Set up protection"}<ArrowUpRight size={14}/></button></div></section><details className="popup-platforms"><summary>Website filters</summary><PlatformRows state={state} patch={patch}/></details><div className="popup-stats"><div><strong>{state.totalFiltered}</strong><span>filter events</span></div><div><strong>{state.rules.filter(r => r.action === 'block' && ruleIsActive(r, now)).length}</strong><span>blocked sources</span></div></div><button className="wide-button" onClick={scan}><FileText size={17}/>Check this page locally<ArrowUpRight size={16}/></button>{(error || scanError) && <p className="feedback" role="alert">{error || scanError}</p>}<footer><ThemeSelect value={state.settings.theme} onChange={theme=>patch({theme})} disabled={!ready}/><button className="text-button" onClick={() => openOptions('#history')}>History <ArrowUpRight size={13}/></button></footer></div>;
}
createRoot(document.getElementById('root')!).render(<Popup/>);
