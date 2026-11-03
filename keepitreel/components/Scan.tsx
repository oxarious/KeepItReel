import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { cloud, cloudRequest } from '../lib/cloud';
import type { Session } from '@supabase/supabase-js';
import { FileText, ArrowRight, LockKeyhole } from 'lucide-react';

export function Scan() {
  const [text, setText] = useState(''); const [email, setEmail] = useState(''); const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false); const [session, setSession] = useState<Session | null>(null);
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ label: string; model: string } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  useEffect(() => {
    browser.storage.session.get('scanDraft').then(d => { const draft = d.scanDraft as { text?: string } | undefined; if (draft?.text) setText(draft.text); });
    if (!cloud) return;
    cloud.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = cloud.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (session) cloudRequest({ action: 'quota' }).then(d => setCredits(d.remaining)).catch(e => setMessage(e.message)); }, [session]);
  const login = async () => {
    if (!cloud) return;
    setBusy(true); setMessage('');
    try {
      const { error } = sent ? await cloud.auth.verifyOtp({ email, token: otp, type: 'email' }) : await cloud.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error; setSent(true);
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  };
  const analyze = async () => {
    setBusy(true); setMessage(''); setResult(null);
    try {
      const id = requestId || crypto.randomUUID(); setRequestId(id);
      let response = await cloudRequest({ action: 'submit', requestId: id, text });
      for (let n = 0; response.status === 'pending' && n < 30; n++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        response = await cloudRequest({ action: 'status', requestId: id });
      }
      if (response.status === 'pending') setMessage('Still processing. Use “Check again” to resume this request without another charge.');
      else if (response.status === 'uncertain') setMessage('The provider submission could not be confirmed. This request will not be automatically resubmitted. Contact the operator with request ID ' + id + '.');
      else if (response.status === 'failed') setMessage('The analysis failed. Contact the operator if your allowance needs correcting.');
      else if (response.result) setResult(response.result);
      const quota = await cloudRequest({ action: 'quota' }); setCredits(quota.remaining);
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  };
  return <>
    <div className="page-intro"><h1>Text analysis</h1><p>Check a passage for signs of AI writing. Only the text you approve is sent for analysis.</p></div>
    {!cloud && <div className="notice-panel"><LockKeyhole size={22}/><div><strong>Cloud analysis is not connected</strong><p>The extension’s feed filters work locally. To enable text analysis, deploy the included backend and add its public configuration when building the extension. See the setup guide supplied with KeepItReel.</p></div></div>}
    {cloud && !session && <section className="surface"><h2>Sign in to check text</h2><p className="muted">Use the email invited by your beta operator.</p><div className="form-row"><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={sent}/></label>{sent && <label>Email code<input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code"/></label>}<button className="primary" onClick={login} disabled={busy || !email}>{sent ? 'Verify code' : 'Send code'}</button></div></section>}
    <section className="surface scan-surface"><div className="section-heading"><h2><FileText size={20}/> Your passage</h2>{session && <span className="pill">{credits ?? '…'} credits left</span>}</div><p className="muted">English prose, 300–1,000 words. For a longer article, choose an excerpt. This assessment covers only the submitted text.</p>
      <label className="sr-only" htmlFor="passage">Text to analyse</label><textarea id="passage" placeholder="Paste a passage here, or open an article and select Check this page in the extension popup…" value={text} onChange={e => { setText(e.target.value); setRequestId(null); setResult(null); setConsent(false); }} disabled={busy}/>
      <div className="text-meta"><span>{words.toLocaleString()} words</span><span>{Math.ceil(words / 100)} credits · up to 100 words per credit</span></div>
      <label className="check-line"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!cloud || busy}/> Send this passage to the configured service and Pangram for analysis.</label>
      <div className="form-actions"><button className="primary" disabled={!session || !consent || busy || words < 300 || words > 1000} onClick={analyze}>{busy ? 'Checking…' : requestId ? 'Check again' : 'Analyse passage'}<ArrowRight size={16}/></button>{session && <button className="text-button" onClick={() => cloud?.auth.signOut()}>Sign out</button>}<button className="text-button" disabled={busy} onClick={() => { setText(''); setResult(null); setRequestId(null); void browser.storage.session.remove('scanDraft'); }}>Clear passage</button></div>
      {message && <p role="status" className="feedback">{message}</p>}
      {result && <div className="assessment" role="status"><span className="eyebrow">Assessment of this passage</span><h2>{result.label}</h2><p>This is a model estimate, not proof of authorship. AI assistance, editing, and unfamiliar writing styles can affect the result. Provider model: {result.model}.</p></div>}
    </section>
  </>;
}
