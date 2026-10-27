import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, setProfile, addSession, recordErrors, getState } from '../lib/store';
import { getMascot, getDialect, MASCOTS, PERSONALITIES, DIFFICULTIES, SCENARIOS, findExpressionsIn, type Expression, type Scenario } from '../lib/catalog';
import { demoEngine, apiEngine, backendAvailable, detectTopic, type Turn, type ConversationEngine } from '../lib/conversation';
import { evaluateUtterance } from '../lib/teaching';
import type { Feedback, Difficulty, MascotId } from '../lib/types';
import { Mascot, type Mood } from '../components/Mascot';
import { Icon } from '../components/Icon';
import { useRecognizer, type MicUiState } from '../components/hooks';
import { useSpeaker, toast, Dialog, DemoNote } from '../components/ui';
import { ExpressionDialog, FeedbackCard } from '../components/Expression';
import { useLocation, navigate } from '../lib/router';
import { recognitionSupported } from '../lib/speech';
import { saveVocab } from '../lib/srs';
import { PageHead } from './Shell';

interface UTurn extends Turn { feedback?: Feedback[]; inlineTip?: Feedback }
type Phase = 'setup' | 'live' | 'summary';

const STATE_LABEL: Record<MicUiState, string> = { ready: 'Ready — tap to talk', listening: 'Listening…', processing: 'Thinking…', speaking: 'Speaking — tap to interrupt', paused: 'Paused', error: 'Microphone problem' };

export function Conversation() {
  const { query } = useLocation();
  const p = useStore((s) => s.profile);
  const textOnly = useStore((s) => s.textOnly);
  const [scenario, setScenario] = useState<Scenario>(() => SCENARIOS.find((s) => s.id === query.get('scenario')) ?? SCENARIOS[0]);
  const [mascotId, setMascotId] = useState<MascotId>(p.mascot);
  const [phase, setPhase] = useState<Phase>('setup');
  const [turns, setTurns] = useState<UTurn[]>([]);
  const [mic, setMic] = useState<MicUiState>('ready');
  const [muted, setMuted] = useState(false);
  const [showTr, setShowTr] = useState(p.targetLang !== 'en');
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [explain, setExplain] = useState<{ open: boolean; list: Expression[]; line: string }>({ open: false, list: [], line: '' });
  const [detail, setDetail] = useState<Expression | null>(null);
  const [typed, setTyped] = useState('');
  const [engine, setEngine] = useState<ConversationEngine>(demoEngine);
  const [adaptiveLevel, setAdaptiveLevel] = useState<Difficulty>(p.difficulty === 'adaptive' ? 'everyday' : p.difficulty);
  const [startedAt, setStartedAt] = useState(0);
  const [summary, setSummary] = useState<null | { seconds: number; words: number; turns: number; topics: string[]; feedback: Feedback[]; saved: number }>(null);
  const buffer = useRef<string[]>([]);
  const silence = useRef<number | null>(null);
  const busy = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<UTurn[]>([]); turnsRef.current = turns;
  const pausedRef = useRef(false); pausedRef.current = mic === 'paused';
  const { language, dialect } = getDialect(p.dialect);
  const mascot = getMascot(mascotId);
  const speaker = useSpeaker();
  const handsFree = p.handsFree && !textOnly && recognitionSupported();

  useEffect(() => { backendAvailable().then((ok) => ok && setEngine(apiEngine)); }, []);
  useEffect(() => { const s = SCENARIOS.find((x) => x.id === query.get('scenario')); if (s && phase === 'setup') { setScenario(s); setMascotId(s.id === 'free' ? p.mascot : (s.mascot as MascotId)); } }, [query.get('scenario')]); // eslint-disable-line
  useEffect(() => { if (phase === 'setup') listRef.current?.scrollTo({ top: 0 }); else listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [turns, phase]);

  const difficulty: Difficulty = p.difficulty === 'adaptive' ? adaptiveLevel : p.difficulty;
  const ctxFor = (history: Turn[]) => ({ lang: p.targetLang, dialect: p.dialect, mascot: mascotId, personality: p.personality, difficulty, scenario: scenario.id === 'free' ? undefined : scenario, history, name: p.name });

  const rec = useRecognizer({
    lang: dialect.recognitionLang,
    onFinal: (t) => { buffer.current.push(t); armSilence(); },
    onSpeechStart: () => { if (speaker.speaking) speaker.stop(); },
  });
  useEffect(() => { if (rec.partial) armSilence(); }, [rec.partial]); // eslint-disable-line
  useEffect(() => { if (rec.error && rec.error.code !== 'no-speech') { setMic('error'); } }, [rec.error]);

  function armSilence() {
    if (silence.current) window.clearTimeout(silence.current);
    silence.current = window.setTimeout(() => { if (buffer.current.length && !rec.partial) commitSpeech(); }, 1300);
  }
  function commitSpeech() {
    const text = buffer.current.join(' ').trim();
    buffer.current = [];
    if (!text) return;
    rec.stop();
    send(text);
  }

  const speakCoach = (text: string, after?: () => void) => {
    if (muted) { after?.(); return; }
    setMic('speaking');
    speaker.say(text, p.dialect, { mascot: mascotId, onEnd: () => { setMic('ready'); after?.(); } }).then((r) => { if (!r.ok) { setMic('ready'); after?.(); } });
  };
  const listen = () => {
    speaker.stop();
    if (!rec.start()) { setMic('error'); return; }
    setMic('listening');
  };

  function begin() {
    const opening = engine.opening(ctxFor([]));
    const t: UTurn = { role: 'coach', text: opening.text, translation: opening.translation, at: Date.now() };
    setTurns([t]); setPhase('live'); setStartedAt(Date.now()); setSummary(null);
    speakCoach(opening.text, () => { if (handsFree) listen(); });
  }

  async function send(text: string) {
    if (busy.current) return; // avoid duplicate requests
    busy.current = true;
    const fb = evaluateUtterance(text, p.targetLang, p.dialect);
    const show = pickInline(fb, p.correction, p.feedbackTiming);
    const userTurn: UTurn = { role: 'user', text, at: Date.now(), feedback: fb, inlineTip: show };
    const history = [...turnsRef.current, userTurn];
    setTurns(history);
    setMic('processing');
    adapt(history);
    let reply;
    try { reply = await engine.reply(ctxFor(history), text); }
    catch (e: any) {
      if (engine.id === 'api') { toast(e?.message === 'rate-limited' ? 'The AI service is busy. Switched to the demo coach for now.' : 'The AI service didn’t respond. Switched to the demo coach.', { kind: 'error' }); setEngine(demoEngine); }
      reply = await demoEngine.reply(ctxFor(history), text);
    }
    const coach: UTurn = { role: 'coach', text: reply.text, translation: reply.translation, at: Date.now(), topic: reply.topic ?? detectTopic(text) ?? undefined };
    setTurns((t) => [...t, coach]);
    busy.current = false;
    speakCoach(reply.text, () => { if (handsFree && !pausedRef.current) listen(); else if (!pausedRef.current) setMic('ready'); });
  }

  function adapt(history: UTurn[]) {
    if (p.difficulty !== 'adaptive') return;
    const users = history.filter((t) => t.role === 'user').slice(-4);
    if (users.length < 2) return;
    const avg = users.reduce((a, t) => a + t.text.split(/\s+/).length, 0) / users.length;
    const clar = users.filter((t) => /\b(sorry|what\?|repeat|slower|don'?t understand|pardon)\b/i.test(t.text)).length;
    const next: Difficulty = clar >= 2 || avg < 3 ? 'beginner' : avg > 16 && clar === 0 ? 'advanced' : avg > 9 ? 'intermediate' : 'everyday';
    if (next !== adaptiveLevel) { setAdaptiveLevel(next); toast(`Adjusted to ${DIFFICULTIES.find((d) => d.id === next)!.label.toLowerCase()} — you can change this anytime.`); }
  }

  function micPress() {
    if (phase !== 'live') return begin();
    if (mic === 'listening') { if (buffer.current.length || rec.partial) { if (rec.partial) buffer.current.push(rec.partial); commitSpeech(); } else { rec.stop(); setMic('ready'); } return; }
    if (mic === 'processing') return;
    listen();
  }

  function pause() { rec.stop(); speaker.stop(); setMic((m) => (m === 'paused' ? 'ready' : 'paused')); }

  function end() {
    rec.stop(); speaker.stop();
    const users = turnsRef.current.filter((t) => t.role === 'user');
    const words = users.reduce((a, t) => a + t.text.split(/\s+/).filter(Boolean).length, 0);
    const feedback = users.flatMap((t) => t.feedback ?? []);
    const unique = feedback.filter((f, i) => feedback.findIndex((x) => x.pattern === f.pattern) === i);
    const topics = [...new Set(turns.map((t) => t.topic).filter(Boolean) as string[])];
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (users.length) {
      recordErrors(unique.filter((f) => f.category === 'incorrect' || f.category === 'register').map((f) => ({ pattern: f.pattern, label: f.explanation.split('.')[0], example: f.originalText, fix: f.suggestedAlternative })));
      addSession({ kind: 'conversation', title: scenario.id === 'free' ? `Chat with ${mascot.name}` : scenario.title, startedAt, durationSec: seconds, words, fillers: 0, repetitions: 0, lang: p.targetLang, mascot: mascotId,
        summary: `${users.length} replies${topics.length ? ' about ' + topics.slice(0, 3).join(', ') : ''}. ${unique.length ? unique.length + ' tip' + (unique.length > 1 ? 's' : '') + ' to review.' : 'No corrections needed.'}`, errors: unique.map((f) => f.pattern) });
    }
    setSummary({ seconds, words, turns: users.length, topics, feedback: unique, saved: 0 });
    setPhase('summary'); setMic('ready');
  }

  function retry(variant?: { personality?: string; difficulty?: Difficulty }) {
    if (variant?.personality) setProfile({ personality: variant.personality as any });
    if (variant?.difficulty) setProfile({ difficulty: variant.difficulty });
    setTurns([]); setPhase('setup');
  }

  const explainLine = (line: string) => setExplain({ open: true, list: findExpressionsIn(line, p.targetLang), line });
  const users = turns.filter((t) => t.role === 'user');
  const mood: Mood = mic === 'speaking' ? 'speaking' : mic === 'listening' ? 'listening' : mic === 'processing' ? 'thinking' : 'idle';
  const status = rec.error && mic === 'error' ? rec.error.message : STATE_LABEL[mic];

  return (
    <>
      <PageHead title="Conversation Coach" sub={<>{language.name} · {dialect.label} · {mascot.name} · <span className="tag">{engine.id === 'api' ? 'Live AI' : 'Demo coach (scripted)'}</span></>} />
      {engine.id === 'demo' && phase === 'setup' && (
        <DemoNote>This demo coach runs in your browser using a scripted conversation engine. It responds to what you say, but it isn’t a full AI yet — connect a model in production for open-ended chat. {p.targetLang !== 'en' && 'Non-English conversations use a small starter set.'}</DemoNote>
      )}
      <div className="convo-layout">
        <section className="convo" aria-label="Conversation" style={{ position: 'relative' }}>
          <div className="convo-top">
            <Mascot id={mascotId} size={44} mood={mood} />
            <div className="grow">
              <strong>{mascot.name}</strong>
              <div className="topic">{phase === 'live' ? `Topic: ${scenario.id === 'free' ? (turns.at(-1)?.topic ?? 'anything you like') : scenario.title}` : scenario.title}{p.difficulty === 'adaptive' ? ` · Adaptive (${DIFFICULTIES.find((d) => d.id === adaptiveLevel)!.label})` : ''}</div>
            </div>
            <button className="btn sm icon-only ghost" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute coach voice' : 'Mute coach voice'}><Icon name={muted ? 'mute' : 'volume'} /></button>
            {p.targetLang !== 'en' && <button className="btn sm icon-only ghost" onClick={() => setShowTr((v) => !v)} aria-pressed={showTr} aria-label="Show translations"><Icon name="translate" /></button>}
            <button className="btn sm icon-only ghost" onClick={() => setHelp(true)} aria-label="Help"><Icon name="help" /></button>
            <button className="btn sm icon-only ghost" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Conversation options"><Icon name="more" /></button>
            {phase === 'live' && <button className="btn sm" onClick={end}>End</button>}
          </div>
          {menu && (
            <div className="menu-pop" role="dialog" aria-label="Conversation options">
              <div className="field"><span>Coach</span>
                <div className="row">{MASCOTS.map((x) => <button key={x.id} className="btn sm icon-only ghost" style={{ width: 48, height: 48, padding: 0, outline: x.id === mascotId ? '2px solid var(--primary)' : 'none', borderRadius: '50%' }} aria-label={x.name} aria-pressed={x.id === mascotId} onClick={() => { setMascotId(x.id); toast(`Switched to ${x.name}. Your progress stays the same.`); }}><Mascot id={x.id} size={44} /></button>)}</div>
              </div>
              <label className="field"><span>Personality</span><select className="input" value={p.personality} onChange={(e) => setProfile({ personality: e.target.value as any })}>{PERSONALITIES.map((x) => <option key={x.id} value={x.id}>{x.label} — {x.hint}</option>)}</select></label>
              <label className="field"><span>Difficulty</span><select className="input" value={p.difficulty} onChange={(e) => setProfile({ difficulty: e.target.value as Difficulty })}>{DIFFICULTIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
              <label className="field"><span>Coach speed</span><select className="input" value={p.speed} onChange={(e) => setProfile({ speed: e.target.value as any })}><option value="slow">Slower</option><option value="normal">Normal</option><option value="natural">Natural</option></select></label>
              <label className="switch"><span>Hands-free (listen again after the coach speaks)</span><input type="checkbox" checked={p.handsFree} onChange={(e) => setProfile({ handsFree: e.target.checked })} /></label>
              <button className="btn sm" onClick={() => setMenu(false)}>Done</button>
            </div>
          )}

          <div className="transcript" ref={listRef} aria-live="polite" aria-label="Transcript">
            {phase === 'setup' && (
              <div className="empty">
                <Mascot id={mascotId} size={150} mood="happy" className="bob" />
                <h2 style={{ marginBottom: 0 }}>{scenario.title}</h2>
                <p>{scenario.context}</p>
                {scenario.id !== 'free' && <p className="small">You: {scenario.roles.you} · {mascot.name.split(' ').pop()}: {scenario.roles.coach}</p>}
                <button className="btn primary lg" onClick={begin}><Icon name="mic" />Start conversation</button>
                <p className="small">{handsFree ? 'Hands-free is on: after the coach speaks, we’ll listen for your reply.' : recognitionSupported() ? 'Tap the mic when you want to speak.' : 'Speech recognition isn’t available here, so you’ll type your replies.'}</p>
              </div>
            )}
            {phase !== 'setup' && turns.map((t, i) => (
              <div key={i}>
                <div className={`turn ${t.role}`}>
                  {t.role === 'coach' && <Mascot id={mascotId} size={34} className="coach-face" />}
                  <div style={{ maxWidth: '85%' }}>
                    <div className="bubble" lang={t.role === 'coach' ? p.dialect : undefined}>{t.text}
                      {showTr && t.translation && <div className="tr">{t.translation}</div>}
                    </div>
                    {t.role === 'coach' && (
                      <div className="turn-actions">
                        <button onClick={() => speaker.say(t.text, p.dialect, { mascot: mascotId })}><Icon name="repeat" size={14} />Replay</button>
                        <button onClick={() => speaker.say(t.text, p.dialect, { mascot: mascotId, slow: true })}><Icon name="slow" size={14} />Slower</button>
                        <button onClick={() => explainLine(t.text)}><Icon name="help" size={14} />Explain that</button>
                        {p.targetLang !== 'en' && !showTr && t.translation && <button onClick={() => setShowTr(true)}><Icon name="translate" size={14} />Translate</button>}
                      </div>
                    )}
                  </div>
                </div>
                {t.inlineTip && <div className="tip" style={{ marginLeft: 'auto', marginTop: 8 }} role="note"><strong>Quick tip:</strong> “{t.inlineTip.suggestedAlternative}” — {t.inlineTip.explanation}</div>}
              </div>
            ))}
            {phase === 'live' && (rec.partial || mic === 'processing') && (
              <div className={`turn ${rec.partial ? 'user' : 'coach'}`}>
                {!rec.partial && <Mascot id={mascotId} size={34} mood="thinking" />}
                <div className="bubble partial">{rec.partial || '…'}</div>
              </div>
            )}
            {phase === 'summary' && summary && <Summary s={summary} onRetry={retry} onNew={() => { setTurns([]); setPhase('setup'); }} />}
          </div>

          {phase !== 'summary' && (
            <div className="dock">
              {!textOnly && recognitionSupported() && (
                <>
                  <div className="dock-row">
                    {phase === 'live' && <button className="btn icon-only" onClick={pause} aria-label={mic === 'paused' ? 'Resume' : 'Pause'}><Icon name={mic === 'paused' ? 'play' : 'pause'} /></button>}
                    <button className="mic" data-state={mic} onClick={micPress} aria-label={phase !== 'live' ? 'Start conversation' : mic === 'listening' ? 'Finish speaking' : mic === 'speaking' ? 'Interrupt and speak' : 'Start speaking'}>
                      <span className="ring" />
                      <Icon name={mic === 'listening' ? 'stop' : mic === 'error' ? 'mic-off' : 'mic'} size={30} />
                    </button>
                    {phase === 'live' && <button className="btn icon-only" onClick={() => setHelp(true)} aria-label="I’m stuck"><Icon name="help" /></button>}
                  </div>
                  <div className="mic-label" role="status"><span className="state" style={{ color: mic === 'error' ? 'var(--improve)' : mic === 'listening' ? 'var(--improve)' : 'var(--muted)' }}>{status}</span></div>
                </>
              )}
              <form className="textbox" onSubmit={(e) => { e.preventDefault(); if (!typed.trim()) return; if (phase !== 'live') { begin(); } else { send(typed.trim()); } setTyped(''); }}>
                <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={phase === 'live' ? 'Or type your reply…' : 'Type to start'} aria-label="Type your reply" disabled={mic === 'processing'} />
                <button className="btn" type="submit" disabled={mic === 'processing'}>Send</button>
              </form>
            </div>
          )}
        </section>

        <aside className="side-tools" aria-label="Scenarios">
          <div className="panel">
            <h3 style={{ fontSize: 'var(--step-1)' }}>Roleplay library</h3>
            <div style={{ display: 'grid', gap: 6, maxHeight: 420, overflowY: 'auto', marginRight: -8, paddingRight: 8 }}>
              {SCENARIOS.map((s) => (
                <button key={s.id} className="option" aria-pressed={s.id === scenario.id} disabled={phase === 'live'} onClick={() => { setScenario(s); setMascotId(s.id === 'free' ? p.mascot : (s.mascot as MascotId)); navigate(`/app/conversation?scenario=${s.id}`, { replace: true }); setPhase('setup'); setTurns([]); }}>
                  <strong>{s.title}</strong><span className="hint">{s.difficulty} · {s.topic}</span>
                </button>
              ))}
            </div>
            {phase === 'live' && <p className="small muted" style={{ marginTop: 8 }}>End this conversation to switch scenes.</p>}
          </div>
          {scenario.id !== 'free' && (
            <div className="panel">
              <h3 style={{ fontSize: 'var(--step-1)' }}>In this scene</h3>
              <ul className="small" style={{ paddingLeft: 18, margin: '0 0 8px' }}>{scenario.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
              <details><summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Phrases that might help</summary><ul className="small" style={{ paddingLeft: 18 }}>{scenario.hints.map((h) => <li key={h}>{h}</li>)}</ul></details>
            </div>
          )}
          <div className="panel small">
            <strong>Corrections: {p.correction[0].toUpperCase() + p.correction.slice(1)}</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>{p.correction === 'gentle' ? 'Tips are saved for the end so the chat keeps flowing.' : p.correction === 'balanced' ? 'Only mistakes that change the meaning get a quick tip now; the rest wait for the summary.' : 'You’ll see a quick tip whenever something could sound more natural.'}</p>
          </div>
        </aside>
      </div>

      <Dialog open={help} onClose={() => setHelp(false)} title="Stuck? That’s normal.">
        <p>Try one of these to keep things moving:</p>
        <div className="stack" style={{ ['--gap' as any]: '8px' }}>
          {(scenario.hints.length ? scenario.hints : ['Could you say that again?', 'Sorry, what does that mean?', 'Can you speak a bit more slowly?', 'I’m not sure, but I think…']).concat(['Could you say that again, a bit more slowly?']).map((h) => (
            <button key={h} className="option" onClick={() => { setHelp(false); if (phase === 'live') send(h); else setTyped(h); }}><strong>“{h}”</strong></button>
          ))}
        </div>
        <p className="small muted">Asking someone to repeat or slow down is a real conversation skill, not a failure.</p>
      </Dialog>

      <Dialog open={explain.open} onClose={() => setExplain({ ...explain, open: false })} title="Explain that">
        <p className="muted">“{explain.line}”</p>
        {explain.list.length ? explain.list.map((e) => (
          <button key={e.phrase} className="option" onClick={() => { setExplain({ ...explain, open: false }); setDetail(e); }}><strong>{e.natural}</strong><span className="hint">{e.meaning} · {e.formality}</span></button>
        )) : <p>Nothing in this line is in our expression library yet. {engine.id === 'demo' ? 'With the AI service connected, the coach can explain any phrase.' : ''}</p>}
        <div className="row"><button className="btn sm" onClick={() => { const { created } = saveVocab({ text: explain.line, meaning: 'Saved from conversation', lang: p.targetLang, dialect: p.dialect, context: `${mascot.name}, ${scenario.title}`, source: 'conversation' }); toast(created ? 'Saved the whole line to your vocabulary' : 'Already saved'); }}><Icon name="bookmark" size={16} />Save the whole line</button></div>
      </Dialog>
      <ExpressionDialog expr={detail} open={!!detail} onClose={() => setDetail(null)} />
    </>
  );
}

function pickInline(fb: Feedback[], style: string, timing: string): Feedback | undefined {
  if (!fb.length) return undefined;
  if (style === 'gentle' && timing !== 'during') return undefined;
  if (style === 'detailed' || timing === 'during') return fb[0];
  return fb.find((f) => f.affectsMeaning || f.category === 'register');
}

function Summary({ s, onRetry, onNew }: { s: { seconds: number; words: number; turns: number; topics: string[]; feedback: Feedback[] }; onRetry: (v?: any) => void; onNew: () => void }) {
  const p = getState().profile;
  const nextDifficulty: Difficulty = p.difficulty === 'beginner' ? 'everyday' : p.difficulty === 'everyday' ? 'intermediate' : 'advanced';
  const otherPersonality = p.personality === 'funny' ? 'thoughtful' : 'funny';
  const mins = Math.floor(s.seconds / 60), secs = s.seconds % 60;
  return (
    <div className="stack" style={{ ['--gap' as any]: '16px' }} aria-label="Session summary">
      <h2 style={{ marginBottom: 0 }}>Nice conversation.</h2>
      <div className="kpis">
        <div className="kpi"><b>{mins}:{String(secs).padStart(2, '0')}</b><span>time</span></div>
        <div className="kpi"><b>{s.turns}</b><span>replies from you</span></div>
        <div className="kpi"><b>{s.words}</b><span>words spoken</span></div>
      </div>
      {s.topics.length > 0 && <p style={{ margin: 0 }}>You talked about {s.topics.join(', ')}.</p>}
      {s.turns === 0 && <p className="muted" style={{ margin: 0 }}>You didn’t reply this time, so there’s nothing to review yet.</p>}
      {s.feedback.length ? (
        <>
          <h3 style={{ marginBottom: 0 }}>Worth remembering</h3>
          {s.feedback.map((f) => <div className="panel" key={f.id}><FeedbackCard fb={f} /></div>)}
        </>
      ) : s.turns > 0 ? <div className="panel tint-mint">Nothing to correct — everything you said sounded natural to the demo teaching engine. It only checks a limited set of common patterns, so try a longer chat for more feedback.</div> : null}
      <div className="row">
        <button className="btn primary" onClick={() => onRetry()}><Icon name="repeat" size={18} />Repeat the scene</button>
        <button className="btn" onClick={() => onRetry({ personality: otherPersonality })}>Try with a {otherPersonality} coach</button>
        {p.difficulty !== 'advanced' && p.difficulty !== 'adaptive' && <button className="btn" onClick={() => onRetry({ difficulty: nextDifficulty })}>Make it harder</button>}
        <button className="btn ghost" onClick={onNew}>New conversation</button>
      </div>
    </div>
  );
}
