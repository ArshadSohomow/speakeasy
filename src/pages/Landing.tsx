import { useEffect, useMemo, useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Icon } from '../components/Icon';
import { useSpeaker, Wordmark, SpeakButton, Dialog } from '../components/ui';
import { FeedbackCard } from '../components/Expression';
import { MASCOTS, LANGUAGES, STATUS_LABEL, getMascot } from '../lib/catalog';
import { evaluateUtterance } from '../lib/teaching';
import { processTranscript } from '../lib/textProcessing';
import { navigate, Link } from '../lib/router';
import { useStore, setProfile } from '../lib/store';
import type { MascotId } from '../lib/types';

const ACCENT_BG: Record<string, string> = { mint: 'var(--mint)', coral: 'var(--coral)', sky: 'var(--sky)', yellow: 'var(--yellow)', lavender: 'var(--lavender)' };

export function Landing() {
  const onboarded = useStore((s) => s.onboarded);
  const chosen = useStore((s) => s.profile.mascot);
  const [stageId, setStageId] = useState<MascotId>('kai');
  const [wordIdx, setWordIdx] = useState(-1);
  const [scrolled, setScrolled] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const { speaking, say, stop } = useSpeaker();
  const m = getMascot(stageId);
  const words = m.sample.split(' ');

  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);

  const start = () => navigate(onboarded ? '/app' : '/start');
  const play = (slow = false) => {
    if (speaking) { stop(); setWordIdx(-1); return; }
    const starts: number[] = []; let c = 0; for (const w of words) { starts.push(c); c += w.length + 1; }
    say(m.sample, 'en-GB', { slow, mascot: m.id, onEnd: () => setWordIdx(-1), onBoundary: (ci) => setWordIdx(starts.findIndex((s, i) => ci >= s && (i === starts.length - 1 || ci < starts[i + 1]))) });
  };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={`site-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="inner">
          <Wordmark />
          <nav aria-label="Sections">
            <a href="#coaches">Coaches</a><a href="#languages">Languages</a><a href="#real-talk">How people say it</a><a href="#studio">Voice Studio</a><a href="#privacy">Privacy</a>
          </nav>
          <div className="row" style={{ marginLeft: 'auto' }}>
            <button className="btn ghost" onClick={() => setSignIn(true)}>Sign in</button>
            <button className="btn primary" onClick={start}>{onboarded ? 'Open app' : 'Start speaking'}</button>
          </div>
        </div>
      </header>

      <main id="main">
        <div className="wrap">
          <section className="hero" aria-labelledby="hero-title">
            <div>
              <h1 id="hero-title"><span className="line">Learn the language.</span><span className="line">Find your voice.</span><span className="line">Speak like a local.</span></h1>
              <p className="lede">Have real conversations, discover how people actually speak, and build confidence one conversation at a time.</p>
              <div className="row">
                <button className="btn primary lg" onClick={start}><Icon name="mic" />Start speaking</button>
                <a className="btn lg" href="#coaches">Meet your coaches</a>
              </div>
              <p className="reassure"><span className="dot" aria-hidden="true" />Practise out loud with no audience. Mistakes are part of the conversation, not a score.</p>
            </div>

            <div className="stage" style={{ background: ACCENT_BG[m.accent] }} aria-label={`${m.name} preview`}>
              <div>
                <div className="stage-bubble" aria-live="polite">
                  {words.map((w, i) => <span key={i} className={`word ${i === wordIdx ? 'on' : ''}`}>{w}{i < words.length - 1 ? ' ' : ''}</span>)}
                </div>
                <div className="stage-controls">
                  <button className="btn sm" onClick={() => play(false)} aria-label={speaking ? 'Stop sample' : `Hear ${m.name}`}><Icon name={speaking ? 'stop' : 'play'} size={16} />{speaking ? 'Stop' : `Hear ${m.name.split(' ').pop()}`}</button>
                  {!speaking && <button className="btn sm" onClick={() => play(true)}><Icon name="slow" size={16} />Slower</button>}
                </div>
              </div>
              <div className="stage-meta small">
                <strong style={{ fontSize: 'var(--step-1)' }}>{m.name}</strong>
                <span>{m.oneLiner}</span>
              </div>
              <Mascot id={m.id} mood={speaking ? 'speaking' : 'idle'} size={260} bg={false} className="stage-mascot bob" title={`${m.name}, the ${m.animal.toLowerCase()}`} />
            </div>
          </section>

          <div className="cast" role="group" aria-label="Preview a coach">
            {MASCOTS.map((x) => (
              <button key={x.id} aria-pressed={stageId === x.id} onClick={() => { stop(); setWordIdx(-1); setStageId(x.id); }}>
                <Mascot id={x.id} size={76} title={x.name} />
                <span>{x.name.replace('Professor ', 'Prof. ')}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="section" id="coaches" aria-labelledby="coaches-h">
          <div className="wrap">
            <div className="section-head">
              <h2 id="coaches-h">Five coaches, one learning profile</h2>
              <p>Each coach has their own way of talking and teaching. Switch whenever you like — your progress, vocabulary and history stay with you.</p>
            </div>
            <div className="coach-list">
              {MASCOTS.map((x) => (
                <article key={x.id} className="coach-row" aria-current={chosen === x.id}>
                  <Mascot id={x.id} size={112} title={x.name} />
                  <div>
                    <h3>{x.name} <span className="muted small" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>· {x.animal}</span></h3>
                    <p className="style">{x.oneLiner} {x.style}</p>
                    <p className="sample">“{x.sample}”</p>
                  </div>
                  <div className="actions">
                    <SpeakButton text={x.sample} dialect="en-GB" mascot={x.id} label="Play sample" />
                    <button className={`btn sm ${chosen === x.id ? 'primary' : ''}`} onClick={() => setProfile({ mascot: x.id, personality: x.defaultPersonality })} aria-pressed={chosen === x.id}>
                      {chosen === x.id ? <><Icon name="check" size={16} />Your coach</> : `Choose ${x.name.split(' ').pop()}`}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>Voices in this demo use your device’s built-in text-to-speech. They’re AI-generated voices, not real people.</p>
          </div>
        </section>

        <LanguagePreview />
        <RealTalk />
        <StudioPeek />

        <section className="section" id="privacy" aria-labelledby="privacy-h">
          <div className="wrap grid-2">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <h2 id="privacy-h">Your voice stays yours</h2>
              <p>We ask for your microphone only when you start speaking. Recordings aren’t kept unless you turn that on, and you can delete your learning data at any time.</p>
            </div>
            <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                ['mic', 'Microphone access only when you press the mic.'],
                ['lock', 'No recordings stored by default. Replay is opt-in.'],
                ['info', 'We tell you when speech is processed by an outside service.'],
                ['trash', 'Inspect, export or delete everything we’ve learned about you.'],
              ].map(([i, t]) => <li key={t} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Icon name={i as any} /><span>{t}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="dash-hero" style={{ background: 'var(--lavender)', color: 'var(--lavender-ink)' }}>
              <Mascot id={chosen} size={96} />
              <div className="spread">
                <div><h2 style={{ marginBottom: 4 }}>Your first conversation takes about a minute to start.</h2><p style={{ margin: 0 }}>No sign-up needed to try it.</p></div>
                <button className="btn primary lg" onClick={start}><Icon name="mic" />Start speaking</button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap spread">
          <span>Speakeasy · demo build. Progress is saved in this browser only.</span>
          <span className="row"><Link to="/privacy">Privacy</Link><Link to="/about">What’s real in this demo</Link></span>
        </div>
      </footer>
      <SignInDialog open={signIn} onClose={() => setSignIn(false)} />
    </>
  );
}

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Accounts are coming soon" footer={<><button className="btn" onClick={onClose}>Close</button><button className="btn primary" onClick={() => { onClose(); navigate('/start'); }}>Continue as guest</button></>}>
      <p>This is a demo build, so there’s no account server connected yet. As a guest, your progress, vocabulary and settings are saved in this browser only.</p>
      <p className="muted small">When accounts are enabled, you’ll be able to sign in with email and keep your progress across devices. Clearing your browser data will remove guest progress.</p>
    </Dialog>
  );
}

function LanguagePreview() {
  const [langId, setLangId] = useState(LANGUAGES[0].id);
  const lang = LANGUAGES.find((l) => l.id === langId)!;
  const [dialectId, setDialectId] = useState(lang.dialects[0].id);
  const [showText, setShowText] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const dialect = lang.dialects.find((d) => d.id === dialectId) ?? lang.dialects[0];
  useEffect(() => setDialectId(lang.dialects[0].id), [langId]); // eslint-disable-line
  return (
    <section className="section" id="languages" aria-labelledby="lang-h" style={{ background: 'var(--surface-2)' }}>
      <div className="wrap">
        <div className="section-head">
          <h2 id="lang-h">Hear how it really sounds — region by region</h2>
          <p>The same friendly “How’s it going? What have you been up to?”, the way people actually say it in different places.</p>
        </div>
        <div className="lang-preview">
          <div className="lang-tabs" role="tablist" aria-label="Languages">
            {LANGUAGES.map((l) => (
              <button key={l.id} role="tab" aria-selected={l.id === langId} onClick={() => setLangId(l.id)}>
                <span className="lang-mark" aria-hidden="true">{l.mark}</span>
                <span>{l.name}<br /><span className="small muted" style={{ fontWeight: 500 }}>{l.nativeName}</span></span>
              </button>
            ))}
          </div>
          <div className="panel" role="tabpanel" aria-label={lang.name}>
            <div className="spread">
              <div className="row" role="group" aria-label="Region">
                {lang.dialects.map((d) => <button key={d.id} className="chip" aria-pressed={d.id === dialect.id} onClick={() => setDialectId(d.id)}>{d.label}</button>)}
              </div>
              <span className="tag" title={STATUS_LABEL[dialect.contentStatus].detail}>{STATUS_LABEL[dialect.contentStatus].label}</span>
            </div>
            {showText ? <p className="phrase" lang={dialect.id}>{dialect.greeting.natural}</p> : <p className="phrase muted">Transcript hidden — listen first.</p>}
            {showText && dialect.greeting.romanised && <p className="muted" style={{ marginTop: -4 }}>{dialect.greeting.romanised}</p>}
            {showTr && langId !== 'en' && <p><strong>Meaning:</strong> {dialect.greeting.translation}</p>}
            <p className="muted">{dialect.greeting.note}</p>
            {dialect.note && <p className="small tag note" style={{ display: 'block', padding: '8px 12px', borderRadius: 10 }}>{dialect.note}</p>}
            <div className="row" style={{ marginTop: 12 }}>
              <SpeakButton text={dialect.greeting.natural} dialect={dialect.id} label="Natural speed" variant="primary" size="" />
              <SpeakButton text={dialect.greeting.natural} dialect={dialect.id} slow label="Learner speed" size="" />
              <button className="chip" aria-pressed={showText} onClick={() => setShowText((v) => !v)}>Transcript</button>
              {langId !== 'en' && <button className="chip" aria-pressed={showTr} onClick={() => setShowTr((v) => !v)}>Translation</button>}
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>Audio uses a {dialect.id} voice from your device. If your device doesn’t have one, we’ll tell you rather than play it in the wrong accent.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RealTalk() {
  const fb = useMemo(() => evaluateUtterance('Ayer fui a una fiesta y fue muy buena.', 'es', 'es-ES')[0], []);
  return (
    <section className="section" id="real-talk" aria-labelledby="real-h">
      <div className="wrap grid-2" style={{ alignItems: 'start' }}>
        <div className="section-head">
          <h2 id="real-h">Correct isn’t always natural</h2>
          <p>Speakeasy tells you the difference between wrong, understandable-but-unusual, casual, regional and just right — and when a phrase only works in certain places.</p>
          <p className="muted">Your coach keeps the conversation going and saves tips for the right moment. You choose how often you want to be corrected.</p>
        </div>
        <div className="panel">{fb && <FeedbackCard fb={fb} />}</div>
      </div>
    </section>
  );
}

function StudioPeek() {
  const spoken = 'um so can you move the meeting to two actually make that three and uh send everyone the notes';
  const [mode, setMode] = useState<'verbatim' | 'clean' | 'polished'>('polished');
  const out = processTranscript([{ text: spoken }], mode).text;
  return (
    <section className="section" id="studio" aria-labelledby="studio-h" style={{ background: 'var(--surface-2)' }}>
      <div className="wrap">
        <div className="section-head">
          <h2 id="studio-h">Voice Studio: say it messy, get it clean</h2>
          <p>Dictate freely. Change your mind mid-sentence. Speakeasy removes the “ums”, understands “actually, make that three”, and formats the result — and keeps a word-for-word version whenever you need it.</p>
        </div>
        <div className="studio-peek">
          <div className="panel"><div className="label">What you said</div><p style={{ fontSize: 'var(--step-1)', margin: '8px 0 0' }}>“{spoken}”</p></div>
          <div className="panel">
            <div className="spread"><div className="label">What you get</div>
              <div className="seg" role="group" aria-label="Processing mode">{(['verbatim', 'clean', 'polished'] as const).map((m) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}</div>
            </div>
            <p style={{ fontSize: 'var(--step-1)', margin: '8px 0 0' }} aria-live="polite">{out}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
