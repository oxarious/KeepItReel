import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Download, ShieldCheck } from 'lucide-react';
import { useStore } from './common';
import { accessOrigins } from '../lib/protection-config';
import { feedbackDraftKey, makeFeedbackReport, sanitizeFeedbackContext, type FeedbackContext, type FeedbackKind } from '../lib/feedback';

export function BetaCenter() {
  const { state } = useStore();
  const [kind, setKind] = useState<FeedbackKind>('wrong_warning');
  const [context, setContext] = useState<FeedbackContext>({ scope: 'general', codes: [] });
  const [notes, setNotes] = useState(''); const [preview, setPreview] = useState(''); const [feedback, setFeedback] = useState('');
  useEffect(() => {
    const key = feedbackDraftKey(location.search);
    void browser.storage.session.get(key).then(async result => {
      if (result[key]) setContext(sanitizeFeedbackContext(result[key]));
      else if (key !== 'feedbackDraft') setFeedback('This draft has expired or was already opened. Select the feature and describe the issue below.');
      await browser.storage.session.remove(key);
    }).catch(() => setFeedback('Could not load the warning categories. You can still describe the issue below.'));
  }, []);
  const prepare = async () => {
    try {
      const grants = { websites: await browser.permissions.contains({ origins: accessOrigins.websites }), email: await browser.permissions.contains({ origins: accessOrigins.email }) };
      const report = makeFeedbackReport({ version: browser.runtime.getManifest().version, kind, context, notes, state, grants, userAgent: navigator.userAgent });
      setPreview(JSON.stringify(report, null, 2)); setFeedback('Review exactly what the file will contain. Nothing has been sent.');
    } catch (e) { setFeedback((e as Error).message); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([preview], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `keepitreel-feedback-${browser.runtime.getManifest().version}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000); setFeedback('Saved locally. If you choose, email the reviewed file to oscar.sommerfors@gmail.com. Nothing is sent automatically.');
  };
  return <><div className="page-intro"><h1>Feedback</h1><p>KeepItReel {browser.runtime.getManifest().version} is free and in early development. No account, payment details, or subscription required.</p></div>
    <section className="surface prose"><h2>What to expect</h2><p>Try the feed filters, website checks and local text checker. Gmail and Outlook checks are experimental and may not recognise your layout. LinkedIn and native phone apps are excluded.</p><p>AI origin can remain unknown. Warnings are reasons to review content, not proof of a scam. Keep the browser’s own security protections enabled.</p><p>All current features are free. No payment or automatic upgrade is enabled. Feature suggestions and bug reports help decide what to improve next.</p></section>
    <section className="surface local-checker"><div className="section-heading"><h2>Report a problem or suggest a feature</h2><ShieldCheck size={21}/></div><p className="small muted">No automatic uploads. This form does not capture page URLs, messages, screenshots, history, source lists or account details. Avoid putting personal information in your note.</p>
      <p className="small">Contact <a href="mailto:oscar.sommerfors@gmail.com">oscar.sommerfors@gmail.com</a>. You can describe the issue directly or attach a feedback file after reviewing it.</p><label htmlFor="feedback-kind">What happened?</label><select id="feedback-kind" value={kind} onChange={e => { setKind(e.target.value as FeedbackKind); setPreview(''); }}><option value="wrong_warning">A warning was wrong</option><option value="missed_warning">Something concerning was missed</option><option value="broken_page">A page stopped working</option><option value="permission_problem">Site access or setup problem</option><option value="suggestion">A suggestion</option></select>
      <label htmlFor="feedback-scope">Feature</label><select id="feedback-scope" value={context.scope} onChange={e => { setContext({ scope: e.target.value as FeedbackContext['scope'], codes: [] }); setPreview(''); }}><option value="general">General</option><option value="web">Website checks</option><option value="email">Webmail checks</option><option value="feed">Feed filtering</option><option value="local">Local text checker</option></select>
      <label htmlFor="feedback-notes">Your note (optional, up to 2,000 characters)</label><textarea id="feedback-notes" value={notes} maxLength={2000} placeholder="Describe what you expected and what happened. Leave out private messages and personal details." onChange={e => { setNotes(e.target.value); setPreview(''); }}/>
      <div className="form-actions"><button className="primary" onClick={() => void prepare()}>Preview feedback file</button><button className="text-button" onClick={() => { setNotes(''); setPreview(''); setContext({ scope: 'general', codes: [] }); setFeedback('Draft cleared.'); }}>Clear feedback draft</button></div>
      {preview && <div className="local-result"><h3>Exactly what will be exported</h3><pre className="feedback-preview" aria-label="Feedback file preview">{preview}</pre><button className="secondary" onClick={download}><Download size={16}/>Export feedback file</button></div>}
      {feedback && <p role="status" className="feedback">{feedback}</p>}
    </section></>;
}
