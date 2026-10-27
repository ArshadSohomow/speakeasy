import { useEffect, useRef, useState } from 'react';
import { PRON_ITEMS, pickDaily, itemsFor, type PronItem } from '../lib/content';
import { useStore, setState, addSession } from '../lib/store';
import { getDialect } from '../lib/catalog';
import { useLocation } from '../lib/router';
import { useSpeaker, SpeakButton, toast, DemoNote } from '../components/ui';
import { useRecognizer } from '../components/hooks';
import { startRecorder, recognitionSupported } from '../lib/speech';
import { saveVocab } from '../lib/srs';
import { norm } from '../lib/textProcessing';
import { Icon } from '../components/Icon';
import { PageHead } from './Shell';

function compareWords(target: string, heard: string) {
  const isJa = /[぀-ヿ一-龯]/.test(target);
  if (isJa) {
    const t = target.replace(/[、。？！\s]/g, ''), h = heard.replace(/[、。？！\s]/g, '');
    const ok = [...t].filter((c) => h.includes(c)).length;
    return { words: [{ w: target, ok: ok / Math.max(1, t.length) > 0.7 }], matched: ok, total: t.length };
  }
  const tw = target.split(/\s+/).map((w) => ({ w, n: norm(w) }));
  const hw = new Set(heard.split(/\s+/).map(norm));
  const words = tw.map((x) => ({ w: x.w, ok: hw.has(x.n) }));
  return { words, matched: words.filter((w) => w.ok).length, total: words.length };
}

export function Pronunciation() {
  const { query } = useLocation();
  const p = useStore((s) => s.profile);
  const attempts = useStore((s) => s.pronAttempts);
  const items = [...itemsFor(PRON_ITEMS, p.targetLang), ...(p.targetLang !== 'en' ? PRON_ITEMS.filter((i) => i.lang === 'en') : [])];
  const daily = pickDaily(itemsFor(PRON_ITEMS, p.targetLang), 1);
  const [item, setItem] = useState<PronItem>(() => PRON_ITEMS.find((i) => i.text === query.get('item')) ?? daily);
  const dialectId = item.dialect ?? (item.lang === p.targetLang ? p.dialect : 'en-GB');
  const { dialect } = getDialect(dialectId);
  const [heard, setHeard] = useState('');
  const [mine, setMine] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<{ stop(): Promise<string | null> } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const { say } = useSpeaker();
  const rec = useRecognizer({ lang: dialect.recognitionLang, continuous: false, onFinal: (t) => setHeard((h) => (h ? h + ' ' : '') + t) });

  useEffect(() => { setHeard(''); setMine(null); }, [item]);
  useEffect(() => () => { if (mine) URL.revokeObjectURL(mine); }, [mine]);

  const startAttempt = async () => {
    setHeard(''); setMine(null);
    try { recorder.current = await startRecorder(); } catch { recorder.current = null; }
    if (recognitionSupported()) rec.start();
    else if (!recorder.current) { toast('We couldn’t access a microphone.', { kind: 'error' }); return; }
    setRecording(true);
  };
  const stopAttempt = async () => {
    rec.stop(); setRecording(false);
    const url = await recorder.current?.stop(); recorder.current = null;
    if (url) setMine(url);
  };
  useEffect(() => { if (recording && heard && !rec.listening) stopAttempt(); }, [heard, rec.listening]); // eslint-disable-line

  const result = heard ? compareWords(item.text, heard) : null;
  useEffect(() => {
    if (!result) return;
    setState((s) => ({ pronAttempts: [...s.pronAttempts, { text: item.text, at: Date.now(), matched: result.matched, total: result.total }] }));
    addSession({ kind: 'pronunciation', title: `Pronunciation: ${item.text}`, startedAt: Date.now(), durationSec: 15, words: result.total, fillers: 0, repetitions: 0, lang: item.lang });
  }, [heard]); // eslint-disable-line

  const playMine = () => { if (!mine) return; audio.current?.pause(); audio.current = new Audio(mine); audio.current.play().catch(() => toast('Couldn’t play your recording.', { kind: 'error' })); };
  const compare = () => say(item.text, dialectId, { onEnd: () => setTimeout(playMine, 400) });
  const mineAttempts = attempts.filter((a) => a.text === item.text);

  return (
    <>
      <PageHead title="Pronunciation" sub="Listen, say it, compare." />
      <DemoNote>Feedback compares the words your browser’s speech recogniser heard with the target. That tells you whether you were understood — it isn’t sound-by-sound scoring. Your recording stays in this tab for replay and is never uploaded.</DemoNote>
      <div className="convo-layout">
        <section className="panel stack" style={{ ['--gap' as any]: '14px' }} aria-labelledby="pw">
          <div className="spread">
            <span className="tag lav">{item === daily ? 'Difficult word of the day' : `${item.level[0].toUpperCase() + item.level.slice(1)}`}</span>
            <span className="small muted">{dialect.label}</span>
          </div>
          <div>
            <div className="big-word" id="pw" lang={dialectId}>{item.text}</div>
            {item.romanised && <div className="muted">{item.romanised}</div>}
            {item.ipa && <div className="muted" aria-label="Phonetic transcription">{item.ipa}</div>}
          </div>
          <dl className="dl">
            <dt>Meaning</dt><dd>{item.meaning}</dd>
            <dt>Syllables</dt><dd>{item.syllables}</dd>
            <dt>Stress</dt><dd>{item.stress}</dd>
            <dt>Example</dt><dd lang={dialectId}>{item.example} <SpeakButton text={item.example} dialect={dialectId} label="" /></dd>
          </dl>
          <div className="panel tint-yellow small" style={{ padding: 12 }}><strong>Tip: </strong>{item.tip}</div>
          <div className="row">
            <SpeakButton text={item.text} dialect={dialectId} label="Listen" variant="primary" size="" />
            <SpeakButton text={item.text} dialect={dialectId} slow label="Slowly" size="" />
          </div>
          <hr className="divider" style={{ margin: '4px 0' }} />
          <div className="row">
            <button className="mic" style={{ width: 64, height: 64 }} data-state={recording ? 'listening' : 'ready'} onClick={() => (recording ? stopAttempt() : startAttempt())} aria-label={recording ? 'Stop recording' : 'Record your attempt'}><span className="ring" /><Icon name={recording ? 'stop' : 'mic'} size={26} /></button>
            <div>
              <strong>{recording ? 'Say it now…' : 'Repeat after me'}</strong>
              <div className="small muted" role="status">{recording ? rec.partial || 'Listening' : rec.error && rec.error.code !== 'no-speech' ? rec.error.message : 'Record yourself, then compare with the reference.'}</div>
            </div>
          </div>
          {result && (
            <div className="panel stack" aria-live="polite">
              <div className="small muted">We heard: “{heard}”</div>
              <div className="match-words">{result.words.map((w, i) => <span key={i} className={w.ok ? 'ok' : 'miss'}>{w.ok ? '✓ ' : '✗ '}{w.w}</span>)}</div>
              <p style={{ margin: 0 }}>{result.matched === result.total ? 'Clearly understood. Nice work.' : result.matched === 0 ? 'The recogniser heard something different. Listen slowly, focus on the tip above, and try again.' : 'Partly understood. Try the highlighted words again, slowly.'}</p>
            </div>
          )}
          {(mine || result) && (
            <div className="row">
              {mine && <button className="btn sm" onClick={playMine}><Icon name="play" size={16} />My attempt</button>}
              {mine && <button className="btn sm" onClick={compare}><Icon name="repeat" size={16} />Reference, then mine</button>}
              <button className="btn sm" onClick={startAttempt}><Icon name="refresh" size={16} />Try again</button>
            </div>
          )}
          <div className="row">
            <button className="btn sm" onClick={() => { const { created } = saveVocab({ text: item.text, meaning: item.meaning, lang: item.lang, dialect: dialectId, example: item.example, context: 'Pronunciation practice', source: 'pronunciation' }); toast(created ? 'Saved for later practice' : 'Already saved'); }}><Icon name="bookmark" size={16} />Save for later</button>
            {mineAttempts.length > 0 && <span className="small muted">{mineAttempts.length} attempt{mineAttempts.length > 1 ? 's' : ''} so far · best {Math.max(...mineAttempts.map((a) => Math.round((a.matched / a.total) * 100)))}% of words recognised</span>}
          </div>
        </section>
        <aside className="side-tools">
          <div className="panel">
            <h3 style={{ fontSize: 'var(--step-1)' }}>Practice list</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {items.map((i) => (
                <button key={i.text} className="option" aria-pressed={i.text === item.text} onClick={() => setItem(i)}>
                  <strong lang={i.dialect ?? 'en'}>{i.text}</strong><span className="hint">{i.meaning} · {i.level}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
