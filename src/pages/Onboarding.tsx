import { useState } from 'react';
import { LANGUAGES, LEVELS, GOALS, MASCOTS, CORRECTIONS, SUPPORT_LANGUAGES, STATUS_LABEL, getDialect, getMascot } from '../lib/catalog';
import { useStore, setProfile, setState } from '../lib/store';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { SpeakButton, Wordmark, useSpeaker } from '../components/ui';
import { MicCheck } from '../components/MicCheck';
import { useRecognizer } from '../components/hooks';
import { demoEngine } from '../lib/conversation';
import type { Level } from '../lib/types';

const STEPS = ['Language', 'Level', 'Goals', 'Coach', 'Preferences', 'Microphone', 'Start'];
const OPTIONAL = new Set([2, 4, 5]);

export function Onboarding() {
  const step = useStore((s) => s.onboardingStep);
  const p = useStore((s) => s.profile);
  const go = (n: number) => { setState({ onboardingStep: Math.max(0, Math.min(STEPS.length - 1, n)) }); window.scrollTo({ top: 0 }); };
  const finish = () => { setState({ onboarded: true, onboardingStep: STEPS.length - 1 }); navigate('/app/conversation'); };

  return (
    <div className="onb">
      <div className="onb-top">
        <Wordmark />
        <div className="progress-track" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <span className="small muted" aria-hidden="true">{step + 1}/{STEPS.length}</span>
      </div>
      <main className="onb-body" id="main">
        <nav aria-label="Setup steps" className="row small" style={{ marginBottom: 18 }}>
          {STEPS.map((s, i) => (
            <button key={s} className={`chip ${i === step ? 'on' : ''}`} style={{ minHeight: 32, padding: '4px 10px' }} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}>
              {i < step ? <Icon name="check" size={14} /> : null}{s}
            </button>
          ))}
        </nav>
        {step === 0 && <StepLanguage />}
        {step === 1 && <StepLevel />}
        {step === 2 && <StepGoals />}
        {step === 3 && <StepCoach />}
        {step === 4 && <StepPrefs />}
        {step === 5 && <><h1>Let’s check your microphone</h1><MicCheck onTextOnly={() => go(6)} /></>}
        {step === 6 && <StepStart onStart={finish} />}
      </main>
      <div className="onb-foot">
        <button className="btn" onClick={() => (step === 0 ? navigate('/') : go(step - 1))}><Icon name="back" size={18} />Back</button>
        <div className="row">
          {OPTIONAL.has(step) && <button className="btn ghost" onClick={() => go(step + 1)}>Skip</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn primary" onClick={() => go(step + 1)}>Continue<Icon name="next" size={18} /></button>
          ) : (
            <button className="btn primary" onClick={finish}><Icon name="mic" size={18} />Start talking with {getMascot(p.mascot).name.split(' ').pop()}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepLanguage() {
  const p = useStore((s) => s.profile);
  return (
    <>
      <h1>What do you want to speak?</h1>
      <p className="muted">Pick a language and the region you care about. A region is a choice, not a default — they really do sound different.</p>
      <div className="lang-grid" role="group" aria-label="Target language">
        {LANGUAGES.map((l) => {
          const on = p.targetLang === l.id;
          return (
            <div key={l.id} className="lang-card" aria-pressed={on} role="button" tabIndex={0}
              onClick={() => !on && setProfile({ targetLang: l.id, dialect: l.dialects[0].id })}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setProfile({ targetLang: l.id, dialect: l.dialects[0].id }); } }}>
              <div className="row"><span className="lang-mark">{l.mark}</span><div><strong>{l.name}</strong><div className="small muted">{l.nativeName}</div></div>{on && <Icon name="check" className="" />}</div>
              {on && (
                <div className="stack" style={{ ['--gap' as any]: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <span className="label">Region</span>
                  <div className="row">
                    {l.dialects.map((d) => <button key={d.id} className="chip" aria-pressed={p.dialect === d.id} onClick={() => setProfile({ dialect: d.id })}>{d.label}</button>)}
                  </div>
                  <span className="small muted">{STATUS_LABEL[getDialect(p.dialect).dialect.contentStatus].label}: {STATUS_LABEL[getDialect(p.dialect).dialect.contentStatus].detail}</span>
                  <SpeakButton text={getDialect(p.dialect).dialect.greeting.natural} dialect={p.dialect} label="Hear a sample" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="field" style={{ marginTop: 24, maxWidth: 360 }}>
        <span>Explanations and translations in</span>
        <select className="input" value={p.supportLang} onChange={(e) => setProfile({ supportLang: e.target.value, explainInSupport: e.target.value !== p.targetLang })}>
          {SUPPORT_LANGUAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="small muted" style={{ fontWeight: 400 }}>The demo explains things in English. Other support languages will use the AI service once connected.</span>
      </div>
    </>
  );
}

function StepLevel() {
  const p = useStore((s) => s.profile);
  const [assess, setAssess] = useState(false);
  return (
    <>
      <h1>How comfortable are you speaking?</h1>
      <p className="muted">This just sets a starting point. You can always try easier or harder conversations.</p>
      <div className="option-grid" role="radiogroup" aria-label="Level">
        {LEVELS.map((l) => (
          <button key={l.id} className="option" role="radio" aria-checked={p.level === l.id} onClick={() => setProfile({ level: l.id, difficulty: levelToDifficulty(l.id) })}>
            <strong>{l.label}</strong><span className="hint">{l.hint}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        {!assess ? <button className="btn" onClick={() => setAssess(true)}><Icon name="mic" size={18} />Take a 30-second speaking check (optional)</button> : <QuickAssessment />}
      </div>
    </>
  );
}
function levelToDifficulty(l: Level) {
  return ({ 'complete-beginner': 'beginner', beginner: 'beginner', intermediate: 'everyday', 'upper-intermediate': 'intermediate', advanced: 'advanced', unsure: 'adaptive' } as const)[l];
}

function QuickAssessment() {
  const p = useStore((s) => s.profile);
  const { dialect } = getDialect(p.dialect);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ level: Level; why: string } | null>(null);
  const rec = useRecognizer({ lang: dialect.recognitionLang, onFinal: (t) => setText((x) => (x ? x + ' ' : '') + t) });
  const evaluate = () => {
    rec.stop();
    const words = text.trim().split(/\s+/).filter(Boolean);
    const unique = new Set(words.map((w) => w.toLowerCase())).size;
    const level: Level = words.length < 8 ? 'beginner' : words.length < 25 ? 'intermediate' : unique / words.length > 0.6 && words.length > 45 ? 'advanced' : 'upper-intermediate';
    setResult({ level, why: `You said ${words.length} words with ${unique} different words in about 30 seconds. This is a rough guide based on how much you said, not a test of your grammar.` });
  };
  return (
    <div className="panel stack">
      <strong>Tell us a little about yourself and your day, for about 30 seconds.</strong>
      <div className="row">
        {!rec.listening ? <button className="btn primary" onClick={() => rec.start()}><Icon name="mic" size={18} />Start</button> : <button className="btn" onClick={evaluate}><Icon name="stop" size={18} />Done</button>}
        <span className="muted small">{rec.listening ? (rec.partial || 'Listening…') : rec.error?.message}</span>
      </div>
      <textarea className="input" aria-label="Your answer (or type it)" placeholder="Your words appear here. You can also type." value={text} onChange={(e) => setText(e.target.value)} />
      {!rec.listening && text && !result && <button className="btn" onClick={evaluate}>Suggest my level</button>}
      {result && (
        <div className="panel tint-mint stack">
          <span>Suggested level: <strong>{LEVELS.find((l) => l.id === result.level)!.label}</strong></span>
          <span className="small">{result.why}</span>
          <div className="row"><button className="btn sm primary" onClick={() => setProfile({ level: result.level, difficulty: levelToDifficulty(result.level) })}>Use this level</button></div>
        </div>
      )}
    </div>
  );
}

function StepGoals() {
  const goals = useStore((s) => s.profile.goals);
  const toggle = (id: string) => setProfile({ goals: goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id] });
  return (
    <>
      <h1>What would you like to get better at?</h1>
      <p className="muted">Choose as many as you like. We’ll use these to shape your home screen.</p>
      <div className="option-grid" role="group" aria-label="Goals">
        {GOALS.map((g) => <button key={g.id} className="option" aria-pressed={goals.includes(g.id)} onClick={() => toggle(g.id)}><strong>{g.label}</strong></button>)}
      </div>
    </>
  );
}

function StepCoach() {
  const p = useStore((s) => s.profile);
  const m = getMascot(p.mascot);
  const { speaking, say, stop } = useSpeaker();
  return (
    <>
      <h1>Choose your coach</h1>
      <p className="muted">You can switch at any time, or pick a different coach for a single exercise.</p>
      <div className="mascot-pick" role="radiogroup" aria-label="Coach">
        {MASCOTS.map((x) => (
          <button key={x.id} role="radio" aria-pressed={p.mascot === x.id} aria-checked={p.mascot === x.id} onClick={() => { stop(); setProfile({ mascot: x.id, personality: x.defaultPersonality }); }}>
            <Mascot id={x.id} size={84} title={x.name} mood={p.mascot === x.id ? 'happy' : 'idle'} />{x.name.replace('Professor ', 'Prof. ')}
          </button>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center' }}>
        <Mascot id={m.id} size={110} mood={speaking ? 'speaking' : 'idle'} />
        <div>
          <h3>{m.name}</h3>
          <p>{m.oneLiner}</p>
          <p className="muted small">Good for: {m.strengths.join(', ')}.</p>
          <p className="small">“{m.teachingStyle}”</p>
          <button className="btn sm" onClick={() => (speaking ? stop() : say(m.sample, 'en-GB', { mascot: m.id }))}><Icon name={speaking ? 'stop' : 'volume'} size={16} />{speaking ? 'Stop' : 'Hear a sample'}</button>
        </div>
      </div>
    </>
  );
}

function StepPrefs() {
  const p = useStore((s) => s.profile);
  return (
    <>
      <h1>How should conversations feel?</h1>
      <p className="muted">Sensible defaults are already selected.</p>
      <div className="stack" style={{ ['--gap' as any]: '22px' }}>
        <div className="field"><span>Speaking speed</span>
          <div className="seg" role="group" aria-label="Speaking speed">{(['slow', 'normal', 'natural'] as const).map((s) => <button key={s} aria-pressed={p.speed === s} onClick={() => setProfile({ speed: s })}>{{ slow: 'Slower', normal: 'Normal', natural: 'Natural' }[s]}</button>)}</div>
        </div>
        <div className="field"><span>Corrections</span>
          <div className="option-grid">{CORRECTIONS.map((c) => <button key={c.id} className="option" aria-pressed={p.correction === c.id} onClick={() => setProfile({ correction: c.id })}><strong>{c.label}{c.id === 'balanced' ? ' (default)' : ''}</strong><span className="hint">{c.hint}</span></button>)}</div>
        </div>
        <div className="field"><span>When should feedback appear?</span>
          <div className="seg" role="group">{(['during', 'after'] as const).map((s) => <button key={s} aria-pressed={p.feedbackTiming === s} onClick={() => setProfile({ feedbackTiming: s })}>{s === 'during' ? 'During the conversation' : 'After each session'}</button>)}</div>
        </div>
        <div className="field"><span>Practice style</span>
          <div className="seg" role="group">{(['relaxed', 'structured', 'mixed'] as const).map((s) => <button key={s} aria-pressed={p.practiceStyle === s} onClick={() => setProfile({ practiceStyle: s })}>{{ relaxed: 'Relaxed chat', structured: 'Structured exercises', mixed: 'A mix' }[s]}</button>)}</div>
        </div>
        <label className="switch"><span>Show explanations in my support language<br /><span className="small muted">Currently: {SUPPORT_LANGUAGES.find((s) => s.id === p.supportLang)?.name}</span></span><input type="checkbox" checked={p.explainInSupport} onChange={(e) => setProfile({ explainInSupport: e.target.checked })} /></label>
      </div>
    </>
  );
}

function StepStart({ onStart }: { onStart: () => void }) {
  const p = useStore((s) => s.profile);
  const m = getMascot(p.mascot);
  const opening = demoEngine.opening({ lang: p.targetLang, dialect: p.dialect, mascot: p.mascot, personality: p.personality, difficulty: p.difficulty, history: [] });
  const { speaking, say, stop } = useSpeaker();
  return (
    <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 18, paddingTop: 10 }}>
      <Mascot id={m.id} size={200} mood={speaking ? 'speaking' : 'happy'} className="bob" />
      <div className="bubble tail-left" style={{ fontSize: 'var(--step-2)', lineHeight: 1.4, textAlign: 'left' }} lang={p.dialect}>
        {opening.text}
        {opening.translation && <div className="small muted" style={{ marginTop: 6 }}>{opening.translation}</div>}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => (speaking ? stop() : say(opening.text, p.dialect, { mascot: m.id }))}><Icon name={speaking ? 'stop' : 'volume'} size={18} />{speaking ? 'Stop' : 'Hear it'}</button>
        <button className="btn primary lg" onClick={onStart}><Icon name="mic" />Reply to {m.name.split(' ').pop()}</button>
      </div>
      <p className="muted small">You can answer out loud or type. Short answers are perfect.</p>
    </div>
  );
}
