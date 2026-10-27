import { useEffect, useRef, useState } from 'react';
import { SPEAKING_MODES, getDialect } from '../lib/catalog';
import { useStore, addSession } from '../lib/store';
import { useLocation } from '../lib/router';
import { useRecognizer } from '../components/hooks';
import { analyse, buildReport, fmtTime, type TimedSegment, type SpeechMetrics, type Report } from '../lib/analysis';
import { startRecorder, recognitionSupported } from '../lib/speech';
import { Mascot } from '../components/Mascot';
import { Icon } from '../components/Icon';
import { useInterval, DemoNote, toast } from '../components/ui';
import { annotate, tokenize } from '../lib/textProcessing';
import { Link } from '../lib/router';
import { PageHead } from './Shell';

type Phase = 'setup' | 'running' | 'report';

export function Speaking() {
  const { query } = useLocation();
  const p = useStore((s) => s.profile);
  const { dialect } = getDialect(p.dialect);
  const [modeId, setModeId] = useState(query.get('mode') ?? 'one-minute');
  const mode = SPEAKING_MODES.find((m) => m.id === modeId) ?? SPEAKING_MODES[0];
  const [prompt, setPrompt] = useState(mode.prompts[0]);
  const [custom, setCustom] = useState('');
  const [seconds, setSeconds] = useState(mode.seconds);
  const [phase, setPhase] = useState<Phase>('setup');
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<TimedSegment[]>([]);
  const [result, setResult] = useState<{ m: SpeechMetrics; r: Report } | null>(null);
  const [recording, setRecording] = useState<string | null>(null);
  const t0 = useRef(0);
  const segStart = useRef<number | null>(null);
  const recorder = useRef<{ stop(): Promise<string | null> } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const segsRef = useRef<TimedSegment[]>([]); segsRef.current = segments;

  useEffect(() => { setPrompt(mode.prompts[0]); setSeconds(mode.seconds); }, [modeId]); // eslint-disable-line

  const rec = useRecognizer({
    lang: dialect.recognitionLang,
    onFinal: (text, at) => {
      const end = at - t0.current;
      const start = segStart.current !== null ? segStart.current : Math.max(0, end - text.split(' ').length * 400);
      segStart.current = null;
      setSegments((s) => [...s, { text, start, end }]);
    },
  });
  useEffect(() => { if (rec.partial && segStart.current === null) segStart.current = Date.now() - t0.current; }, [rec.partial]);

  useInterval(() => {
    const e = Math.floor((Date.now() - t0.current) / 1000);
    setElapsed(e);
    if (e >= seconds) finish();
  }, phase === 'running' ? 250 : null);

  const begin = async () => {
    if (!recognitionSupported()) { toast('Speech recognition isn’t available in this browser, so we can’t analyse a talk here. Try Chrome, Edge or Safari.', { kind: 'error', ms: 7000 }); return; }
    setSegments([]); setResult(null); setRecording(null); setElapsed(0);
    t0.current = Date.now(); segStart.current = null;
    if (p.keepRecordings) { try { recorder.current = await startRecorder(); } catch { recorder.current = null; } }
    if (rec.start()) setPhase('running');
  };

  async function finish() {
    if (phase !== 'running') return;
    rec.stop();
    const url = await recorder.current?.stop(); recorder.current = null;
    if (url) setRecording(url);
    setTimeout(() => {
      const dur = Math.max(1, Math.round((Date.now() - t0.current) / 1000));
      const segs = segsRef.current;
      const topic = custom.trim() || prompt;
      const m = analyse(segs, dur, topic, p.targetLang);
      const r = buildReport(m, p.feedbackFocus, p.speechSupportMode);
      setResult({ m, r }); setPhase('report');
      if (m.words) addSession({ kind: 'speaking', title: mode.label, startedAt: t0.current, durationSec: dur, words: m.words, fillers: m.fillers, repetitions: m.repetitions, wpm: m.wpm || undefined, lang: p.targetLang, summary: r.strongest });
    }, 700); // allow the last final result to arrive
  }

  const seek = (ms?: number) => { if (ms === undefined || !audioRef.current) return; audioRef.current.currentTime = Math.max(0, ms / 1000 - 1); audioRef.current.play().catch(() => {}); };
  const left = Math.max(0, seconds - elapsed);
  const showFillers = !p.speechSupportMode && p.feedbackFocus.fillers;

  return (
    <>
      <PageHead title="Speaking Practice" sub="Timed talks with clear, evidence-based feedback." />
      {phase === 'setup' && (
        <div className="convo-layout">
          <section className="panel stack" style={{ ['--gap' as any]: '18px' }}>
            <div className="field"><span>Practice mode</span>
              <div className="row" role="group" aria-label="Practice mode">{SPEAKING_MODES.map((m) => <button key={m.id} className="chip" aria-pressed={m.id === modeId} onClick={() => setModeId(m.id)}>{m.label}</button>)}</div>
            </div>
            <div className="field"><span>Prompt</span>
              <div style={{ display: 'grid', gap: 6 }}>{mode.prompts.map((pr) => <button key={pr} className="option" aria-pressed={!custom && pr === prompt} onClick={() => { setPrompt(pr); setCustom(''); }}><strong>{pr}</strong></button>)}</div>
              <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or write your own topic…" aria-label="Your own topic" />
            </div>
            <label className="field" style={{ maxWidth: 240 }}><span>Duration</span>
              <select className="input" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>{[30, 45, 60, 90, 120, 180, 300].map((s) => <option key={s} value={s}>{s < 60 ? `${s} seconds` : `${s / 60} minute${s > 60 ? 's' : ''}`}</option>)}</select>
            </label>
            <div className="row">
              <button className="btn primary lg" onClick={begin}><Icon name="mic" />Start speaking</button>
              <span className="small muted">{p.keepRecordings ? 'Recording for replay is on (kept in this tab only).' : <>Replay is off. <Link to="/app/settings">Turn on recording for replay</Link></>}</span>
            </div>
          </section>
          <aside className="side-tools">
            <div className="panel tint-yellow" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'center' }}>
              <Mascot id="ace" size={72} mood="happy" />
              <p style={{ margin: 0 }}>“Take a breath, glance at your prompt, and go when you’re ready. Pauses are allowed.”</p>
            </div>
            <div className="panel small">
              <strong>What we measure</strong>
              <p className="muted" style={{ margin: '6px 0 0' }}>Pace, filler words, repeated starts, long pauses, transitions, variety of words and whether you stayed on topic. We don’t claim to measure confidence or charisma — and a slower pace isn’t a fault.</p>
              {p.speechSupportMode && <p style={{ margin: '8px 0 0' }}>Communication-first mode is on: we won’t comment on repetitions, pauses or fillers.</p>}
            </div>
          </aside>
        </div>
      )}

      {phase === 'running' && (
        <section className="panel" style={{ textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 14, padding: 32 }}>
          <div className="muted">{custom.trim() || prompt}</div>
          <div className="timer" role="timer" aria-live="off">{fmtTime(left * 1000)}</div>
          <div className="meter" style={{ width: 'min(420px, 100%)' }} aria-hidden="true"><div style={{ width: `${(elapsed / seconds) * 100}%`, background: 'var(--primary)' }} /></div>
          <div className="studio-live" style={{ width: '100%', textAlign: 'left', maxHeight: 220, overflow: 'auto' }} aria-live="polite">
            {segments.map((s) => s.text).join(' ')} <span className="partial">{rec.partial}</span>
            {!segments.length && !rec.partial && <span className="muted">Start whenever you’re ready…</span>}
          </div>
          {rec.error && rec.error.code !== 'no-speech' && <p className="tag improve" role="alert">{rec.error.message}</p>}
          <button className="btn primary lg" onClick={finish}><Icon name="stop" />Finish</button>
        </section>
      )}

      {phase === 'report' && result && (
        <div className="convo-layout">
          <section className="stack" style={{ ['--gap' as any]: '16px' }}>
            <div className="report">
              <div className="r s"><h4><Icon name="check" size={18} />Your strongest point</h4><p>{result.r.strongest}</p></div>
              <div className="r i"><h4><Icon name="sparkle" size={18} />One thing to improve</h4><p>{result.r.improve}</p></div>
              <div className="r n"><h4><Icon name="next" size={18} />Your next exercise</h4><p>{result.r.next}</p></div>
            </div>
            {result.r.evidence.length > 0 && (
              <div className="panel">
                <h3 style={{ fontSize: 'var(--step-1)' }}>Evidence</h3>
                <div className="row">{result.r.evidence.map((e, i) => <button key={i} className="chip" onClick={() => seek(e.at)} disabled={!recording} title={recording ? 'Play from here' : 'Turn on recording for replay to listen back'}>{e.at !== undefined && <span className="muted">{fmtTime(e.at)}</span>} {e.label}: {e.text}</button>)}</div>
              </div>
            )}
            {recording && <div className="panel"><h3 style={{ fontSize: 'var(--step-1)' }}>Your recording</h3><audio ref={audioRef} src={recording} controls style={{ width: '100%' }} /><p className="small muted">Kept in this tab only. It’s gone when you leave the page.</p></div>}
            <div className="panel">
              <h3 style={{ fontSize: 'var(--step-1)' }}>Transcript</h3>
              <p style={{ lineHeight: 1.8 }}>{segments.length ? segments.map((s, i) => <span key={i}>{annotate(tokenize(s.text), p.targetLang).map((t, j) => <span key={j}>{j ? ' ' : ''}{showFillers && t.kind && t.kind !== 'punct' && t.kind !== 'break' && t.confidence === 'high' ? <span className={`tok-${t.kind}`}>{t.w}</span> : t.w}</span>)} </span>) : <span className="muted">We didn’t catch any speech this time.</span>}</p>
            </div>
            <div className="row">
              <button className="btn primary" onClick={begin}><Icon name="repeat" size={18} />Repeat this exercise</button>
              <button className="btn" onClick={() => setPhase('setup')}>Choose another</button>
            </div>
          </section>
          <aside className="side-tools">
            <div className="panel">
              <h3 style={{ fontSize: 'var(--step-1)' }}>Measures</h3>
              <dl className="dl">
                <dt>Duration</dt><dd>{fmtTime(result.m.durationSec * 1000)}</dd>
                <dt>Words</dt><dd>{result.m.words}</dd>
                {p.feedbackFocus.pace && <><dt>Pace</dt><dd>{result.m.wpm ? `${result.m.wpm} words/min` : '—'}</dd></>}
                {showFillers && <><dt>Fillers</dt><dd>{result.m.fillers} ({result.m.fillersPerMin}/min)</dd></>}
                {!p.speechSupportMode && p.feedbackFocus.repetitions && <><dt>Repeats</dt><dd>{result.m.repetitions}</dd></>}
                {!p.speechSupportMode && p.feedbackFocus.pauses && <><dt>Long pauses</dt><dd>{result.m.longPauses.length} (avg pause {result.m.avgPauseSec}s)</dd></>}
                <dt>Transitions</dt><dd>{result.m.transitions.length ? result.m.transitions.join(', ') : 'none detected'}</dd>
                <dt>Word variety</dt><dd>{result.m.variety !== null ? `${Math.round(result.m.variety * 100)}% different words` : 'needs 40+ words'}</dd>
                {result.m.relevance !== null && <><dt>On topic</dt><dd>{result.m.relevance >= 0.5 ? 'Yes' : result.m.relevance > 0 ? 'Partly' : 'Hard to tell'}</dd></>}
              </dl>
              <p className="small muted" style={{ marginBottom: 0 }}>Pauses are estimated from when the recogniser returned each phrase, so treat them as approximate.</p>
            </div>
          </aside>
        </div>
      )}
      {phase === 'setup' && !recognitionSupported() && <DemoNote>Speech recognition isn’t available in this browser, so timed talks can’t be analysed here. Chrome, Edge and Safari support it.</DemoNote>}
    </>
  );
}
