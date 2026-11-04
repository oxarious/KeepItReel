import { useState } from 'react';
import { browser } from 'wxt/browser';
import { PlatformRows, useStore } from './common';
import { Protection } from './Protection';
import { dispatch } from '../lib/store';
import { phraseMatches } from '../lib/filter-rules';

const steps = ['Choose your feeds', 'Optional checks', 'Try an example'];

export function SetupGuide() {
  const { state, ready, error, patch } = useStore();
  const [step, setStep] = useState(0);
  const [phrase, setPhrase] = useState('election');
  const [applied, setApplied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const exampleTitle = 'Election news this morning';
  const matches = applied && phraseMatches(exampleTitle, phrase);

  async function complete() {
    setBusy(true);
    try { await dispatch({ type: 'completeSetup' }); location.hash = 'overview'; }
    catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-intro"><h1>Getting started</h1><p>Choose your checks and try a fictional example. You can return to this guide at any time.</p></div>
    <ol className="setup-steps" aria-label="Setup progress">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
    {(error || feedback) && <p className="feedback" role="status">{error || feedback}</p>}
    {step === 0 && <section className="surface">
      <h2>Choose your feeds</h2><p className="small muted">These choices save immediately. KeepItReel reads supported feed content locally and adds controls for your preferences.</p>
      <PlatformRows state={state} patch={patch}/>
      <p className="small muted">Pin KeepItReel through Chrome’s Extensions menu to keep warnings within reach. Refresh existing tabs after installing.</p>
    </section>}
    {step === 1 && <Protection embedded/>}
    {step === 2 && <section className="surface">
      <h2>Try a topic filter</h2><p className="small muted">This practice card uses fictional text. Your saved filters are edited in Topic filters.</p>
      <form className="rule-form" onSubmit={event => { event.preventDefault(); setApplied(true); }}>
        <label className="grow">Practice phrase<input value={phrase} onChange={event => { setPhrase(event.target.value); setApplied(false); }} maxLength={100} required/></label>
        <button className="primary" type="submit" disabled={!phrase.trim()}>Try filter</button>
      </form>
      <div className="setup-example" role="status">
        {matches ? <><strong>Hidden by your practice filter</strong><p>Matched “{phrase.trim()}” in the title.</p><button className="secondary" onClick={() => setApplied(false)}>Undo practice filter</button></> : <><strong>{exampleTitle}</strong><p>{applied ? 'This phrase does not match the title.' : 'Fictional YouTube title'}</p></>}
      </div>
      <p className="small muted">Real topic filters follow your display mode. Choose Cover or Collapse to hide matches, or Label only to keep them visible.</p>
      <button className="text-button" onClick={() => void browser.tabs.create({ url: browser.runtime.getURL('/demo.html') })}>Open the full interactive demo</button>
      <p className="small muted">The full demo uses your saved preferences. Creator blocks made there are saved locally.</p>
    </section>}
    <div className="setup-actions">
      {step > 0 && <button className="secondary" onClick={() => setStep(step - 1)}>Back</button>}
      {step < 2 ? <button className="primary" disabled={!ready} onClick={() => setStep(step + 1)}>{step === 1 ? 'Continue to example' : 'Continue'}</button> : <button className="primary" disabled={!ready || busy} onClick={() => void complete()}>Finish setup</button>}
      <button className="text-button" onClick={() => { location.hash = 'overview'; }}>Finish later</button>
    </div>
  </>;
}
