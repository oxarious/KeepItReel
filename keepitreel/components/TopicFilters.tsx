import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from './common';
import { DurationSelect, useRuleClock } from './RuleDuration';
import { expiryFor, expiryLabel, type RuleDuration } from '../lib/filter-rules';
import { dispatch } from '../lib/store';
import type { TopicRule } from '../lib/model';

export function TopicFilters() {
  const { state, ready, error } = useStore();
  const [phrase, setPhrase] = useState('');
  const [platform, setPlatform] = useState<TopicRule['platform']>('youtube');
  const [duration, setDuration] = useState<RuleDuration>('permanent');
  const [feedback, setFeedback] = useState('');
  const [undoId, setUndoId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const now = useRuleClock(state.topicRules);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      const id = crypto.randomUUID();
      await dispatch({ type: 'topicRule', rule: { id, phrase, platform, expiresAt: expiryFor(duration) } });
      setUndoId(id);
      setPhrase('');
      setFeedback('Topic filter added. Matching items use your display mode in Filter settings.');
    } catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await dispatch({ type: 'removeTopic', id });
      if (undoId === id) setUndoId(undefined);
      setFeedback('Topic filter removed. Other matching rules may still apply.');
    } catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-intro"><h1>Topic filters</h1><p>Choose words or phrases you want to see less of in your feed.</p></div>
    <section className="surface">
      <h2>Add a topic</h2>
      <p className="small muted">Match whole words and phrases in supported YouTube titles and TikTok captions. Matching ignores case and extra spaces. Each filter uses the literal phrase you enter.</p>
      <form className="rule-form" onSubmit={add}>
        <label className="grow">Word or phrase<input value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="For example, election" maxLength={100} required disabled={!ready || busy}/></label>
        <label>Platform<select value={platform} onChange={event => setPlatform(event.target.value as TopicRule['platform'])} disabled={!ready || busy}>
          <option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="all">YouTube and TikTok</option>
        </select></label>
        <DurationSelect value={duration} onChange={setDuration} disabled={!ready || busy}/>
        <button className="primary" type="submit" disabled={!ready || busy || !phrase.trim()}><Plus size={17}/>Add topic</button>
      </form>
      <p className="small muted">Always allow for a creator overrides topic filters. Filters use the Cover, Collapse or Label only mode selected in Filter settings.</p>
      {(error || feedback) && <p className="feedback" role="status">{error || feedback}</p>}
      {undoId && state.topicRules.some(rule => rule.id === undoId) && <button className="secondary" disabled={busy} onClick={() => void remove(undoId)}>Undo added topic</button>}
    </section>
    <section className="surface">
      <h2>Your topics ({state.topicRules.length}/100)</h2>
      <p className="small muted">Timed filters stop automatically. Expired entries stay here until you remove them.</p>
      {!state.topicRules.length && <p className="empty-state">Your saved topics will appear here.</p>}
      <div className="rule-list">{state.topicRules.map(rule => <div className="list-row" key={rule.id}>
        <div className="grow"><strong>{rule.phrase}</strong><small>{rule.platform === 'all' ? 'YouTube and TikTok' : rule.platform === 'youtube' ? 'YouTube' : 'TikTok'}</small><small>{expiryLabel(rule.expiresAt, now)}</small></div>
        <button className="icon-button" aria-label={`Remove topic ${rule.phrase}`} disabled={busy} onClick={() => void remove(rule.id)}><Trash2 size={16}/></button>
      </div>)}</div>
    </section>
  </>;
}
