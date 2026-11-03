import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { ShieldCheck, Globe, Mail, Trash2, ArrowRight } from 'lucide-react';
import { Toggle, useStore } from './common';
import { accessOrigins } from '../lib/protection-access';
import { dispatch } from '../lib/store';
import { normalizeProtectionDomain, type ProtectionSettings } from '../lib/model';
import { assessLink, assessMessage, findDisclosures, linksInText, type Finding } from '../lib/protection-policy';

export function LocalChecker({ loadDraft = false }: { loadDraft?: boolean }) {
  const [text, setText] = useState(''); const [url, setUrl] = useState('');
  const [findings, setFindings] = useState<Finding[] | null>(null); const [error, setError] = useState('');
  useEffect(() => {
    if (!loadDraft) return;
    void browser.storage.session.get('scanDraft').then(async result => {
      const draft = result.scanDraft as { text?: unknown } | undefined;
      if (typeof draft?.text === 'string') setText(draft.text.slice(0, 30000));
      await browser.storage.session.remove('scanDraft');
    });
  }, [loadDraft]);
  const check = () => {
    setError('');
    if (url) { try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); } catch { setError('Enter a complete http:// or https:// link.'); return; } }
    const links = [...new Set([...linksInText(text), ...(url ? [url] : [])])];
    setFindings([...assessMessage(text), ...findDisclosures(text), ...links.flatMap(link => assessLink(link).findings)]);
  };
  return <section className="surface local-checker"><h2>Check text or a link</h2><p className="small muted">Paste a message, invitation note, or link. This check runs on your device, uses English text patterns, and is cleared when you leave this screen.</p>
    <label htmlFor="local-text">Message or page text</label><textarea id="local-text" value={text} maxLength={30000} placeholder="Paste the content you want to check…" onChange={e => { setText(e.target.value); setFindings(null); }}/>
    <label htmlFor="local-url">Link (optional)</label><input id="local-url" type="url" placeholder="https://…" value={url} maxLength={4096} onChange={e => { setUrl(e.target.value); setFindings(null); }}/>
    <div className="form-actions"><button className="primary" disabled={!text.trim() && !url.trim()} onClick={check}>Check locally<ArrowRight size={16}/></button><button className="text-button" onClick={() => { setText('Please send your verification code to activate your account.'); setUrl('https://paypal.com.account-review.example/verify'); setFindings(null); }}>Try a fictional example</button><button className="text-button" onClick={() => { setText(''); setUrl(''); setFindings(null); setError(''); }}>Clear</button></div>
    {error && <p role="alert" className="feedback">{error}</p>}
    {findings && <div className="local-result" role="status"><strong>{findings.length ? `${findings.length} signal(s) to review` : 'No matching risk or disclosure patterns found'}</strong><p>AI authorship and sender identity remain unverified. This is not a safety verdict.</p>{findings.map((f, i) => <div className="local-finding" key={i}><strong>{f.title}</strong><p>{f.detail}</p></div>)}</div>}
  </section>;
}

export function Protection() {
  const { state, ready } = useStore(); const p = state.settings.protection;
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false); const [excluded, setExcluded] = useState('');
  const loadAccess = async () => {
    const result: Record<string, boolean> = {};
    for (const key of ['websites', 'email'] as const) result[key] = await browser.permissions.contains({ origins: accessOrigins[key] });
    setPermissions(result);
  };
  useEffect(() => { void loadAccess(); browser.permissions.onAdded.addListener(loadAccess); browser.permissions.onRemoved.addListener(loadAccess); return () => { browser.permissions.onAdded.removeListener(loadAccess); browser.permissions.onRemoved.removeListener(loadAccess); }; }, []);
  const save = async (patch: Partial<ProtectionSettings>) => { await dispatch({ type: 'settings', patch: { protection: { ...p, ...patch } } }); };
  const toggle = async (key: 'websites' | 'email', on: boolean) => {
    setBusy(true); setFeedback('');
    try {
      // Must be called directly in the click handler to preserve the browser's user gesture.
      if (on && !await browser.permissions.request({ origins: accessOrigins[key] })) { setFeedback('Site access was not granted. This check remains off.'); return; }
      await save({ [key]: on }); await loadAccess();
      setFeedback(on ? 'Enabled. Checks will appear on supported pages, including tabs already open.' : 'Checks paused. You can revoke site access in the browser’s extension settings.');
    } catch (e) { setFeedback((e as Error).message); } finally { setBusy(false); }
  };
  const items = [
    { key: 'websites' as const, icon: Globe, name: 'Automatic website scanning', detail: 'Inspect readable page content for explicit AI self-disclosures and check visible links. Unlabelled content stays “origin unknown”. Browser site access is required; private message integrations remain separate.' },
    { key: 'email' as const, icon: Mail, name: 'Gmail & Outlook webmail (experimental)', detail: 'Check visible inbox previews and supported opened messages for suspicious requests. Opened messages also support sender-label mismatches (Gmail) and link checks. No mailbox connection, hidden-message fetch, attachment scan, or message storage.' },
  ];
  return <><div className="page-intro"><h1>Web &amp; message protection</h1><p>Choose which website, link and webmail checks to enable.</p></div>
    {!state.settings.enabled && <p className="feedback">KeepItReel is paused globally. Enable it at the top of the page to run these checks.</p>}
    <section className="surface"><div className="section-heading"><h2>Your protection</h2><span className="pill">No page uploads</span></div>
      {items.map(item => <div className="setting-row" key={item.key}><div className="protection-copy"><item.icon size={21}/><div><h3>{item.name}</h3><p>{item.detail}</p><small className={p[item.key] && permissions[item.key] ? 'access-active' : ''}>{p[item.key] && permissions[item.key] ? 'Enabled · site access granted' : p[item.key] ? 'Needs browser site permission' : 'Off'}</small></div></div><Toggle label={item.name} value={p[item.key] && !!permissions[item.key]} disabled={busy || !ready} onChange={v => void toggle(item.key, v)}/></div>)}
      <div className="setting-row"><div><h3>Suspicious link checks</h3><p>Inspect addresses without visiting them. Higher-concern patterns show a review dialog on ordinary clicks. Redirects, downloads, attachments, and every possible scam are not covered.</p></div><Toggle label="Suspicious link checks" value={p.links} onChange={v => void save({ links: v }).catch(e => setFeedback(e.message))}/></div>
    </section>
    {feedback && <p className="feedback" role="status">{feedback}</p>}
    <section className="surface"><h2>Remove optional site access</h2><p className="small muted">Turn off website and webmail checks and revoke their optional permissions. Existing YouTube, TikTok and Google feed permissions remain; use the main switch to pause all filtering.</p><button className="secondary" onClick={() => void (async () => {
      try {
        await save({ websites: false, email: false });
        await browser.permissions.remove({ origins: [...accessOrigins.websites, ...accessOrigins.email] });
        await loadAccess();
        const remains = await browser.permissions.contains({ origins: accessOrigins.websites }) || await browser.permissions.contains({ origins: accessOrigins.email });
        setFeedback(remains ? 'Checks are off. Browser site access remains; review it in Chrome’s extension settings.' : 'Optional site access removed. Website and webmail checks are off.');
      } catch (e) { setFeedback((e as Error).message); }
    })()}>Turn off and revoke optional access</button></section>
    <section className="surface"><h2>Excluded sites</h2><p className="small muted">Password, payment, and code forms pause general checks. Known account/workspace pages are excluded. Add other private or sensitive sites here; there is no reliable automatic way to identify every sensitive page.</p><form className="rule-form" onSubmit={e => { e.preventDefault(); try { const domain = normalizeProtectionDomain(excluded); void save({ excludedDomains: [...new Set([...p.excludedDomains, domain])] }).then(() => { setExcluded(''); setFeedback('Site excluded, including its subdomains.'); }).catch(e => setFeedback(e.message)); } catch (e) { setFeedback((e as Error).message); } }}><label className="grow">Excluded domain<input value={excluded} onChange={e => setExcluded(e.target.value)} placeholder="private.example.com" maxLength={300} required/></label><button className="secondary" type="submit">Exclude site</button></form>{p.excludedDomains.map(domain => <div className="list-row" key={domain}><span className="grow">{domain}</span><button className="icon-button" aria-label={`Resume checks on ${domain}`} onClick={() => void save({ excludedDomains: p.excludedDomains.filter(d => d !== domain) }).catch(e => setFeedback(e.message))}><Trash2 size={16}/></button></div>)}</section>
    <LocalChecker/>
    <div className="welcome-note"><ShieldCheck size={22}/><div><strong>Coverage and limitations</strong><p>Disclosures use English patterns; email requests support English and Swedish. They cannot establish human authorship, verify a sender, or guarantee safety. Private content and new page assessments are not stored in history or sent to a server. Website layouts can change. Browser-protected pages, native phone apps, and full unopened message bodies are outside this version. Inbox previews only check visible row text.</p></div></div>
  </>;
}
