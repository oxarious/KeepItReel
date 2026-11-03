import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { dispatch, readState, subscribe } from '../lib/store';
import { freshState, type State, type Settings, type Platform, type ThemePreference } from '../lib/model';
export function useStore() {
  const [state, setState] = useState<State>(freshState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    readState().then(s => { setState(s); setReady(true); }).catch(e => setError(e.message));
    return subscribe(setState);
  }, []);
  const patch = async (settings: Partial<Settings>) => { try { setState(await dispatch({ type: 'settings', patch: settings })); } catch (e) { setError(String(e)); } };
  return { state, ready, error, patch };
}
export function Mark() { return <img className="brand-mark" src={browser.runtime.getURL('/icon/128.png')} width={36} height={36} alt="" aria-hidden="true"/>; }
export function Brand() { return <div className="brand"><img className="brand-logo brand-logo-light" src={browser.runtime.getURL('/brand/keepitreel-logo.svg')} width={184} height={48} alt="KeepItReel"/><img className="brand-logo brand-logo-dark" src={browser.runtime.getURL('/brand/keepitreel-logo-white.svg')} width={184} height={48} alt="KeepItReel"/></div>; }
export function ThemeSelect({ value, onChange, disabled = false }: { value: ThemePreference; onChange: (theme: ThemePreference) => void; disabled?: boolean }) {
  return <label className="theme-select"><span>Appearance</span><select aria-label="Appearance" value={value} onChange={e => onChange(e.target.value as ThemePreference)} disabled={disabled}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
export function Toggle({ value, label, onChange, disabled = false }: { value: boolean; label: string; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <button className={`toggle ${value ? 'is-on' : ''}`} role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} disabled={disabled}><span/></button>;
}
export const platformNames: Record<Platform, string> = { youtube: 'YouTube', tiktok: 'TikTok', google: 'Google Search' };
export function PlatformIcon({ platform }: { platform: Platform }) { return <span className={`platform-icon ${platform}`} aria-hidden="true">{platform === 'youtube' ? '▶' : platform === 'tiktok' ? '♪' : 'G'}</span>; }
export function PlatformRows({ state, patch }: { state: State; patch: (s: Partial<Settings>) => void }) {
  return <div className="platform-list">{(['youtube', 'tiktok', 'google'] as Platform[]).map(p => <div className="platform-row" key={p}><PlatformIcon platform={p}/><div className="grow"><strong>{platformNames[p]}</strong><small>{p === 'google' ? 'Your blocked websites' : 'AI disclosures & creator rules'}</small></div><Toggle label={`Enable ${platformNames[p]}`} value={state.settings.platforms[p]} onChange={v => patch({ platforms: { ...state.settings.platforms, [p]: v } })}/></div>)}</div>;
}
export const openOptions = (hash = '') => browser.tabs.create({ url: browser.runtime.getURL('/options.html') + hash });
