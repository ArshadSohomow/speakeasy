import { useEffect, useState } from 'react';
import { useStore, setProfile, setState, resetAll, getState, isStorageAvailable } from '../lib/store';
import { LANGUAGES, SUPPORT_LANGUAGES, MASCOTS, PERSONALITIES, DIFFICULTIES, CORRECTIONS, STATUS_LABEL, getDialect } from '../lib/catalog';
import { Mascot } from '../components/Mascot';
import { Icon } from '../components/Icon';
import { Confirm, download, toast } from '../components/ui';
import { MicCheck } from '../components/MicCheck';
import { SignInDialog } from './Landing';
import { navigate } from '../lib/router';
import { backendAvailable } from '../lib/conversation';
import { recognitionSupported, loadVoices, findVoice, getRecognitionProvider } from '../lib/speech';
import { ruleLabel } from '../lib/teaching';
import { PageHead } from './Shell';
import type { Theme } from '../lib/types';

export function applyTheme(t: Theme) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}

export function Settings() {
  const s = useStore((x) => x);
  const p = s.profile;
  const [confirm, setConfirm] = useState<null | 'all' | 'vocab' | 'history' | 'learning'>(null);
  const [signIn, setSignIn] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const [voice, setVoice] = useState<string>('checking…');
  const [interest, setInterest] = useState('');
  const { language, dialect } = getDialect(p.dialect);

  useEffect(() => { backendAvailable().then(setAi); }, []);
  useEffect(() => { loadVoices().then(() => { const v = findVoice(dialect.voiceLangs); setVoice(v.voice ? `${v.voice.name}${v.exact ? '' : ' (closest regional match)'}` : `None installed for ${dialect.id}`); }); }, [dialect.id]);

  const exportData = () => download(`speakeasy-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getState(), null, 2), 'application/json');
  const doDelete = () => {
    if (confirm === 'all') { resetAll(); applyTheme('system'); toast('All Speakeasy data deleted from this browser'); navigate('/'); }
    if (confirm === 'vocab') { setState({ vocab: [] }); toast('Vocabulary deleted'); }
    if (confirm === 'history') { setState({ sessions: [], studioDocs: [], pronAttempts: [] }); toast('Session history deleted'); }
    if (confirm === 'learning') { setState({ errorPatterns: {} }); setProfile({ interests: [] }); toast('Learning profile cleared'); }
  };

  return (
    <>
      <PageHead title="Settings" sub="Everything is saved in this browser as you change it." />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ ['--gap' as any]: '16px' }}>
          <section className="panel stack" aria-labelledby="s-acc">
            <h2 id="s-acc" style={{ fontSize: 'var(--step-2)' }}>Account</h2>
            <div className="spread"><span><strong>Guest</strong> <span className="muted small">· progress saved in this browser only</span></span><button className="btn sm" onClick={() => setSignIn(true)}>Sign in</button></div>
            <label className="field"><span>Display name</span><input className="input" value={p.name} onChange={(e) => setProfile({ name: e.target.value.slice(0, 40) })} placeholder="What should your coach call you?" /></label>
            {!isStorageAvailable() && <p className="tag improve" style={{ whiteSpace: 'normal', padding: '8px 12px' }}>Your browser is blocking storage, so settings won’t be kept after you close this tab.</p>}
          </section>

          <section className="panel stack" aria-labelledby="s-lang">
            <h2 id="s-lang" style={{ fontSize: 'var(--step-2)' }}>Language</h2>
            <label className="field"><span>I’m learning</span>
              <select className="input" value={p.targetLang} onChange={(e) => { const l = LANGUAGES.find((x) => x.id === e.target.value)!; setProfile({ targetLang: l.id, dialect: l.dialects[0].id }); }}>{LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            </label>
            <label className="field"><span>Region</span>
              <select className="input" value={p.dialect} onChange={(e) => setProfile({ dialect: e.target.value })}>{language.dialects.map((d) => <option key={d.id} value={d.id}>{d.label} — {STATUS_LABEL[d.contentStatus].label}</option>)}</select>
            </label>
            <label className="field"><span>Explanations in</span>
              <select className="input" value={p.supportLang} onChange={(e) => setProfile({ supportLang: e.target.value })}>{SUPPORT_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            </label>
            <label className="switch"><span>Show explanations in my support language</span><input type="checkbox" checked={p.explainInSupport} onChange={(e) => setProfile({ explainInSupport: e.target.checked })} /></label>
          </section>

          <section className="panel stack" aria-labelledby="s-coach">
            <h2 id="s-coach" style={{ fontSize: 'var(--step-2)' }}>Coach</h2>
            <div className="row" role="radiogroup" aria-label="Default coach">
              {MASCOTS.map((m) => <button key={m.id} role="radio" aria-checked={p.mascot === m.id} className="chip" style={{ padding: '4px 12px 4px 4px' }} onClick={() => setProfile({ mascot: m.id })}><Mascot id={m.id} size={32} />{m.name.split(' ').pop()}</button>)}
            </div>
            <label className="field"><span>Personality</span><select className="input" value={p.personality} onChange={(e) => setProfile({ personality: e.target.value as any })}>{PERSONALITIES.map((x) => <option key={x.id} value={x.id}>{x.label} — {x.hint}</option>)}</select></label>
            <label className="field"><span>Difficulty</span><select className="input" value={p.difficulty} onChange={(e) => setProfile({ difficulty: e.target.value as any })}>{DIFFICULTIES.map((x) => <option key={x.id} value={x.id}>{x.label} — {x.hint}</option>)}</select></label>
            <label className="field"><span>Corrections</span><select className="input" value={p.correction} onChange={(e) => setProfile({ correction: e.target.value as any })}>{CORRECTIONS.map((x) => <option key={x.id} value={x.id}>{x.label} — {x.hint}</option>)}</select></label>
            <label className="field"><span>Feedback timing</span><select className="input" value={p.feedbackTiming} onChange={(e) => setProfile({ feedbackTiming: e.target.value as any })}><option value="after">After each session</option><option value="during">During the conversation</option></select></label>
            <label className="field"><span>Coach speaking speed</span><select className="input" value={p.speed} onChange={(e) => setProfile({ speed: e.target.value as any })}><option value="slow">Slower</option><option value="normal">Normal</option><option value="natural">Natural</option></select></label>
          </section>

          <section className="panel stack" aria-labelledby="s-look">
            <h2 id="s-look" style={{ fontSize: 'var(--step-2)' }}>Appearance</h2>
            <div className="seg" role="group" aria-label="Theme">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => <button key={t} aria-pressed={p.theme === t} onClick={() => { setProfile({ theme: t }); applyTheme(t); }}><Icon name={t === 'system' ? 'auto' : t === 'light' ? 'sun' : 'moon'} size={16} /> {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}</button>)}
            </div>
            <label className="switch"><span>Reduce motion<br /><span className="small muted">Also follows your system setting automatically.</span></span><input type="checkbox" checked={p.reduceMotion} onChange={(e) => { setProfile({ reduceMotion: e.target.checked }); document.documentElement.toggleAttribute('data-motion', false); if (e.target.checked) document.documentElement.setAttribute('data-motion', 'reduce'); }} /></label>
          </section>
        </div>

        <div className="stack" style={{ ['--gap' as any]: '16px' }}>
          <section className="panel stack" aria-labelledby="s-speech">
            <h2 id="s-speech" style={{ fontSize: 'var(--step-2)' }}>Speech</h2>
            <label className="switch"><span>Hands-free conversations<br /><span className="small muted">Listen again automatically after the coach speaks.</span></span><input type="checkbox" checked={p.handsFree} onChange={(e) => setProfile({ handsFree: e.target.checked })} /></label>
            <label className="switch"><span>Text-only mode<br /><span className="small muted">Type instead of speaking everywhere.</span></span><input type="checkbox" checked={s.textOnly} onChange={(e) => setState({ textOnly: e.target.checked })} /></label>
            <label className="switch"><span>Communication-first mode<br /><span className="small muted">For people who stutter or have other speech differences. Focuses on getting your message across; no feedback on repetitions, blocks, pauses or fillers unless you choose it below.</span></span><input type="checkbox" checked={p.speechSupportMode} onChange={(e) => setProfile({ speechSupportMode: e.target.checked })} /></label>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ marginBottom: 6 }}>Give me feedback on</legend>
              <div className="row">
                {(['clarity', 'pace', 'pauses', 'repetitions', 'fillers'] as const).map((k) => <button key={k} className="chip" aria-pressed={p.feedbackFocus[k]} onClick={() => setProfile({ feedbackFocus: { ...p.feedbackFocus, [k]: !p.feedbackFocus[k] } })}>{{ clarity: 'Clarity of my message', pace: 'Pace', pauses: 'Pauses', repetitions: 'Repetitions', fillers: 'Filler words' }[k]}</button>)}
              </div>
            </fieldset>
            <details><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Test microphone</summary><div style={{ marginTop: 12 }}><MicCheck /></div></details>
          </section>

          <section className="panel stack" aria-labelledby="s-priv">
            <h2 id="s-priv" style={{ fontSize: 'var(--step-2)' }}>Privacy and your data</h2>
            <label className="switch"><span>Keep recordings for replay<br /><span className="small muted">Speaking Practice can keep your audio so you can listen back. In this demo it stays in the open tab and is discarded when you leave. Off by default.</span></span><input type="checkbox" checked={p.keepRecordings} onChange={(e) => setProfile({ keepRecordings: e.target.checked })} /></label>
            <div>
              <div className="label">What Speakeasy has learned about you</div>
              {Object.values(s.errorPatterns).length ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 6 }}>
                  {Object.values(s.errorPatterns).map((e) => (
                    <li key={e.key} className="spread small" style={{ flexWrap: 'nowrap' }}><span>{ruleLabel(e.key)} <span className="muted">· seen {e.count}×</span></span><button className="btn ghost sm" onClick={() => setState((st) => { const n = { ...st.errorPatterns }; delete n[e.key]; return { errorPatterns: n }; })}>Forget</button></li>
                  ))}
                </ul>
              ) : <p className="small muted" style={{ margin: '6px 0' }}>No recurring patterns yet.</p>}
              <div className="label" style={{ marginTop: 8 }}>Topics you enjoy (optional)</div>
              <div className="row" style={{ marginTop: 6 }}>
                {p.interests.map((i) => <button key={i} className="chip" onClick={() => setProfile({ interests: p.interests.filter((x) => x !== i) })} aria-label={`Remove ${i}`}>{i} <Icon name="close" size={14} /></button>)}
                <form className="row" onSubmit={(e) => { e.preventDefault(); if (interest.trim()) { setProfile({ interests: [...new Set([...p.interests, interest.trim()])] }); setInterest(''); } }}>
                  <input className="input" style={{ width: 180, minHeight: 40 }} value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="e.g. football" aria-label="Add a topic" /><button className="btn sm">Add</button>
                </form>
              </div>
              <p className="small muted">We never infer sensitive things about you from conversations. Patterns are suggestions, not permanent labels.</p>
            </div>
            <div className="row">
              <button className="btn sm" onClick={exportData}><Icon name="download" size={16} />Export my data</button>
              <button className="btn sm danger" onClick={() => setConfirm('learning')}>Clear learning profile</button>
              <button className="btn sm danger" onClick={() => setConfirm('vocab')}>Delete vocabulary</button>
              <button className="btn sm danger" onClick={() => setConfirm('history')}>Delete history</button>
              <button className="btn sm danger" onClick={() => setConfirm('all')}><Icon name="trash" size={16} />Delete everything</button>
            </div>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} className="small">Read the privacy notice</a>
          </section>

          <section className="panel stack" aria-labelledby="s-status">
            <h2 id="s-status" style={{ fontSize: 'var(--step-2)' }}>Services</h2>
            <dl className="dl">
              <dt>Conversation AI</dt><dd>{ai === null ? 'Checking…' : ai ? 'Live AI connected' : 'Demo coach (scripted, runs in your browser)'}</dd>
              <dt>Speech recognition</dt><dd>{recognitionSupported() ? getRecognitionProvider().label : 'Not available in this browser'}</dd>
              <dt>Voice for {dialect.id}</dt><dd>{voice}</dd>
              <dt>Storage</dt><dd>This browser (guest)</dd>
            </dl>
            <button className="btn sm" onClick={() => { setState({ onboarded: false, onboardingStep: 0 }); navigate('/start'); }}>Redo setup</button>
          </section>
        </div>
      </div>
      <Confirm open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete}
        title={confirm === 'all' ? 'Delete everything?' : confirm === 'vocab' ? 'Delete all vocabulary?' : confirm === 'history' ? 'Delete session history?' : 'Clear learning profile?'}
        body={confirm === 'all' ? 'This removes your settings, vocabulary, history, saved dictations and quotes from this browser. It can’t be undone.' : 'This can’t be undone.'}
        confirmLabel="Delete" />
      <SignInDialog open={signIn} onClose={() => setSignIn(false)} />
    </>
  );
}
