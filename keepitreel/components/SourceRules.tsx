import { useState, type FormEvent } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { PlatformIcon, platformNames, useStore } from './common';
import { DurationSelect, useRuleClock } from './RuleDuration';
import { expiryFor, expiryLabel, type RuleDuration } from '../lib/filter-rules';
import { normalizeCreator, type Platform, type Rule } from '../lib/model';
import { dispatch } from '../lib/store';

export function SourceRules() {
  const { state, ready, error } = useStore();
  const [platform, setPlatform] = useState<Platform>('youtube');
  const [input, setInput] = useState('');
  const [action, setAction] = useState<Rule['action']>('block');
  const [duration, setDuration] = useState<RuleDuration>('permanent');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useRuleClock(state.rules);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const key = normalizeCreator(platform, input);
      await dispatch({ type: 'rule', rule: { platform, key, name: key, action, expiresAt: action === 'block' ? expiryFor(duration) : undefined } });
      setInput('');
      setFeedback(`${key} added to your ${action === 'block' ? 'block' : 'allow'} list.`);
    } catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(rule: Rule) {
    setBusy(true);
    try { await dispatch({ type: 'removeRule', platform: rule.platform, key: rule.key }); setFeedback('Rule removed.'); }
    catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  function exportRules() {
    const data = { version: 1, rules: state.rules, topicRules: state.topicRules, settings: state.settings };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keepitreel-settings.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return <>
    <div className="page-intro"><h1>Your lists</h1><p>Block creators or websites, and make exceptions for the ones you want to see.</p></div>
    <section className="surface">
      <h2>Add a source</h2>
      <form className="rule-form" onSubmit={add}>
        <label>Platform<select value={platform} onChange={event => setPlatform(event.target.value as Platform)} disabled={!ready || busy}>{Object.entries(platformNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <label className="grow">{platform === 'google' ? 'Website' : 'Creator'}<input placeholder={platform === 'google' ? 'example.com' : '@handle or profile URL'} value={input} onChange={event => setInput(event.target.value)} required maxLength={300} disabled={!ready || busy}/></label>
        <label>Action<select value={action} onChange={event => setAction(event.target.value as Rule['action'])} disabled={!ready || busy}><option value="block">Block</option><option value="allow">Always allow</option></select></label>
        {action === 'block' && <DurationSelect value={duration} onChange={setDuration} disabled={!ready || busy}/>}
        <button className="primary" type="submit" disabled={!ready || busy}><Plus size={17}/>Add</button>
      </form>
      <p className="small muted">Google domain rules include subdomains. A more specific domain rule takes priority. Saving a source replaces its previous rule. Expired blocks stop applying, while other filters can still match.</p>
      {(error || feedback) && <p className="feedback" role="status">{error || feedback}</p>}
    </section>
    <section className="surface">
      <div className="section-heading"><h2>Your rules ({state.rules.length})</h2><button className="text-button" onClick={exportRules} disabled={!ready}><Download size={16}/>Export settings</button></div>
      <label className="sr-only" htmlFor="search-rules">Search your rules</label>
      <input id="search-rules" className="search-input" placeholder="Find a creator or website…" value={search} onChange={event => setSearch(event.target.value)}/>
      {!state.rules.length && <div className="empty-state"><h3>No saved rules</h3><p>Add a source above, or use the monkey creator button while browsing.</p></div>}
      <div className="rule-list">{state.rules.filter(rule => `${rule.name} ${rule.key}`.toLowerCase().includes(search.toLowerCase())).map(rule => <div className="list-row" key={`${rule.platform}:${rule.key}`}>
        <PlatformIcon platform={rule.platform}/>
        <div className="grow"><strong>{rule.key}</strong><small>{platformNames[rule.platform]}</small>{rule.expiresAt !== undefined && <small>{expiryLabel(rule.expiresAt, now)}</small>}</div>
        <span className={`rule-badge ${rule.action}`}>{rule.action === 'allow' ? 'Always allow' : rule.expiresAt !== undefined && rule.expiresAt <= now ? 'Expired' : 'Blocked'}</span>
        <button className="icon-button" aria-label={`Remove ${rule.key}`} disabled={busy} onClick={() => void remove(rule)}><Trash2 size={16}/></button>
      </div>)}</div>
    </section>
  </>;
}
