import { useMemo, useRef, useState } from 'react';
import { useStore, setState, uid, addSession } from '../lib/store';
import { getDialect } from '../lib/catalog';
import { processTranscript, formatOutput, FORMATS, parseCommand, makeFormal, makeCasual, diffWords, hunksFrom, applyHunks, type FormatId, type Mode, type Token, type CommandId } from '../lib/textProcessing';
import { useRecognizer } from '../components/hooks';
import { Icon } from '../components/Icon';
import { toast, copyText, download, Confirm, DemoNote, useInterval, useSpeaker } from '../components/ui';
import { recognitionSupported } from '../lib/speech';
import { navigate } from '../lib/router';
import { PageHead } from './Shell';
import type { StudioDoc } from '../lib/types';

interface Seg { text: string; locked?: boolean; at: number }
interface Snap { segs: Seg[]; manual: string | null; styleShift: 'none' | 'formal' | 'casual' }

const MODE_INFO: Record<Mode, string> = {
  verbatim: 'Every word as spoken, including “um”s, repeats and false starts.',
  clean: 'Adds punctuation and removes clear fillers and stutter-repeats. Your wording stays the same.',
  polished: 'Also resolves self-corrections (“two — actually, three”), removes hesitations and tidies structure.',
};

export function Studio() {
  const p = useStore((s) => s.profile);
  const prefs = useStore((s) => s.fillerPrefs);
  const docs = useStore((s) => s.studioDocs);
  const { dialect } = getDialect(p.dialect);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [mode, setMode] = useState<Mode>('clean');
  const [format, setFormat] = useState<FormatId>('paragraphs');
  const [manual, setManual] = useState<string | null>(null);
  const [styleShift, setStyleShift] = useState<Snap['styleShift']>('none');
  const [view, setView] = useState<'output' | 'compare'>('output');
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [undo, setUndo] = useState<Snap[]>([]);
  const [redo, setRedo] = useState<Snap[]>([]);
  const [lastCmd, setLastCmd] = useState<{ id: CommandId; label: string } | null>(null);
  const [cmdNote, setCmdNote] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StudioDoc | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const startRef = useRef(0);
  const { say } = useSpeaker();

  const snapshot = (): Snap => ({ segs, manual, styleShift });
  const push = () => { setUndo((u) => [...u.slice(-49), snapshot()]); setRedo([]); };
  const restore = (s: Snap) => { setSegs(s.segs); setManual(s.manual); setStyleShift(s.styleShift); };
  const doUndo = () => { const last = undo.at(-1); if (!last) return; setRedo((r) => [...r, snapshot()]); setUndo((u) => u.slice(0, -1)); restore(last); };
  const doRedo = () => { const last = redo.at(-1); if (!last) return; setUndo((u) => [...u, snapshot()]); setRedo((r) => r.slice(0, -1)); restore(last); };

  const rec = useRecognizer({
    lang: dialect.recognitionLang,
    onFinal: (t) => {
      const cmd = prefs.voiceCommands ? parseCommand(t) : null;
      if (cmd) return runCommand(cmd.id, cmd.label);
      push();
      setSegs((s) => [...s, { text: t, at: Date.now() - startRef.current }]);
      setManual(null);
    },
  });
  useInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), rec.listening ? 500 : null);

  function runCommand(id: CommandId, label: string, fromRepeat = false) {
    if (id !== 'repeat' && !fromRepeat) setLastCmd({ id, label });
    setCmdNote(`Command recognised: ${label}`);
    setTimeout(() => setCmdNote(null), 3500);
    switch (id) {
      case 'delete-last': push(); setSegs((s) => s.slice(0, -1)); toast('Deleted the last sentence', { action: { label: 'Undo', run: () => doUndoLatest() } }); break;
      case 'undo': doUndoLatest(); break;
      case 'new-paragraph': push(); setSegs((s) => (s.length ? [...s.slice(0, -1), { ...s[s.length - 1], text: s[s.length - 1].text + ' new paragraph' }] : s)); break;
      case 'formal': push(); setStyleShift('formal'); break;
      case 'casual': push(); setStyleShift('casual'); break;
      case 'lock-last': push(); setSegs((s) => (s.length ? [...s.slice(0, -1), { ...s[s.length - 1], locked: true }] : s)); break;
      case 'remove-fillers': push(); setMode((m) => (m === 'verbatim' ? 'clean' : m)); break;
      case 'repeat': if (lastCmd) runCommand(lastCmd.id, lastCmd.label, true); else toast('There’s no previous instruction to repeat.'); break;
      case 'stop': stop(); break;
      case 'save': setTimeout(() => saveDoc(), 50); break;
      case 'switch-conversation': stop(); navigate('/app/conversation'); break;
      case 'read-back': say(outputRef.current, p.dialect); break;
    }
  }
  // undo from inside callbacks: use functional updates
  function doUndoLatest() { setUndo((u) => { const last = u.at(-1); if (last) { setRedo((r) => [...r, { segs: segsRef.current, manual: manualRef.current, styleShift: styleRef.current }]); restore(last); } return u.slice(0, -1); }); }
  const segsRef = useRef(segs); segsRef.current = segs;
  const manualRef = useRef(manual); manualRef.current = manual;
  const styleRef = useRef(styleShift); styleRef.current = styleShift;

  const start = () => { startRef.current = Date.now() - elapsed * 1000; rec.start(); };
  const stop = () => rec.stop();

  const lang = p.targetLang;
  const verbatim = useMemo(() => processTranscript(segs, 'verbatim', prefs, lang), [segs, prefs, lang]);
  const processed = useMemo(() => processTranscript(segs, mode, prefs, lang), [segs, mode, prefs, lang]);
  const generated = useMemo(() => {
    let t = formatOutput(processed.paragraphs, format);
    if (styleShift === 'formal') t = makeFormal(t); else if (styleShift === 'casual') t = makeCasual(t);
    return t;
  }, [processed, format, styleShift]);
  const output = manual ?? generated;
  const outputRef = useRef(output); outputRef.current = output;

  const diff = useMemo(() => hunksFrom(diffWords(verbatim.text.replace(/\n+/g, ' '), processed.text.replace(/\n+/g, ' '))), [verbatim, processed]);
  const acceptedText = useMemo(() => applyHunks(diff.parts, rejected), [diff, rejected]);

  function saveDoc() {
    const text = outputRef.current;
    if (!segsRef.current.length && !text.trim()) { toast('Nothing to save yet.'); return; }
    const now = Date.now();
    const raw = segsRef.current.map((s) => s.text).join('\n');
    const title = (text.split('\n').find((l) => l.trim()) ?? 'Untitled').slice(0, 48);
    if (docId) {
      setState((s) => ({ studioDocs: s.studioDocs.map((d) => (d.id === docId ? { ...d, raw, output: text, mode, format, updatedAt: now, title } : d)) }));
    } else {
      const id = uid(); setDocId(id);
      setState((s) => ({ studioDocs: [{ id, title, createdAt: now, updatedAt: now, raw, output: text, mode, format }, ...s.studioDocs] }));
      if (verbatim.stats.words) addSession({ kind: 'studio', title: 'Voice Studio dictation', startedAt: now - elapsed * 1000, durationSec: Math.max(elapsed, 1), words: verbatim.stats.words, fillers: verbatim.stats.fillers, repetitions: verbatim.stats.repetitions, wpm: elapsed > 10 ? Math.round(verbatim.stats.words / (elapsed / 60)) : undefined, lang: p.targetLang });
    }
    toast('Saved to your session history');
  }
  const openDoc = (d: StudioDoc) => { push(); setSegs(d.raw.split('\n').filter(Boolean).map((t) => ({ text: t, at: 0 }))); setMode(d.mode); setFormat(d.format as FormatId); setManual(d.output); setDocId(d.id); setElapsed(0); };
  const clearAll = () => { push(); setSegs([]); setManual(null); setStyleShift('none'); setDocId(null); setElapsed(0); setRejected(new Set()); };
  const retryLast = () => { if (!segs.length) return; push(); setSegs((s) => s.slice(0, -1)); start(); toast('Removed the last segment — say it again.'); };
  const addPasted = () => { if (!pasteText.trim()) return; push(); setSegs((s) => [...s, ...pasteText.split(/\n+/).filter(Boolean).map((t) => ({ text: t, at: 0 }))]); setPasteText(''); setManual(null); };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0'), ss = String(elapsed % 60).padStart(2, '0');

  return (
    <>
      <PageHead title="Voice Studio" sub="Speak naturally. Get text you can use." >
        <button className="btn sm" onClick={doUndo} disabled={!undo.length} aria-label="Undo"><Icon name="undo" size={18} /></button>
        <button className="btn sm" onClick={doRedo} disabled={!redo.length} aria-label="Redo"><Icon name="redo" size={18} /></button>
      </PageHead>
      <DemoNote>Transcription uses your browser’s speech recognition, and the clean-up runs on your device with Speakeasy’s rule-based engine. Production adds a streaming speech service and an AI rewrite for harder edits. This works inside Speakeasy only — it can’t type into other apps.</DemoNote>

      <div className="studio">
        <div className="stack" style={{ ['--gap' as any]: '16px' }}>
          <section className="panel" aria-label="Recording">
            <div className="spread">
              <div className="row">
                {recognitionSupported() ? (
                  <button className="mic" style={{ width: 64, height: 64 }} data-state={rec.listening ? 'listening' : rec.error && rec.error.code !== 'no-speech' && rec.error.code !== 'aborted' ? 'error' : 'ready'} onClick={() => (rec.listening ? stop() : start())} aria-label={rec.listening ? 'Stop dictation' : 'Start dictation'}>
                    <span className="ring" /><Icon name={rec.listening ? 'stop' : 'mic'} size={26} />
                  </button>
                ) : null}
                <div>
                  <div style={{ fontWeight: 700 }} role="status">{rec.listening ? 'Listening' : segs.length ? 'Paused' : 'Ready'}</div>
                  <div className="muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss} · {verbatim.stats.words} words</div>
                </div>
              </div>
              <div className="row">
                <button className="btn sm" onClick={retryLast} disabled={!segs.length}><Icon name="refresh" size={16} />Redo last bit</button>
                <button className="btn sm danger" onClick={() => setConfirmClear(true)} disabled={!segs.length && !manual}><Icon name="trash" size={16} />Clear</button>
              </div>
            </div>
            {rec.error && rec.error.code !== 'no-speech' && <p className="tag improve" style={{ display: 'flex', padding: '8px 12px', marginTop: 12, whiteSpace: 'normal' }} role="alert">{rec.error.message}</p>}
            {cmdNote && <div className="cmd-toast" style={{ marginTop: 12 }} role="status"><Icon name="sparkle" size={18} />{cmdNote}</div>}
            <div className="studio-live" style={{ marginTop: 14 }} aria-label="Live transcript" aria-live="polite">
              {!segs.length && !rec.partial && <span className="muted">{recognitionSupported() ? 'Press the mic and start talking. Try: “Um, can you move the meeting to two — actually, make that three — and send everyone the notes.”' : 'Speech recognition isn’t available in this browser. Paste or type spoken text below to try the clean-up.'}</span>}
              {verbatim.annotated.map((toks, i) => (
                <span key={i}>{segs[i]?.locked && <Icon name="lock" size={14} label="Kept exactly as said" />}<Tokens toks={toks} />{' '}</span>
              ))}
              {rec.partial && <span className="partial" aria-label="Provisional words">{rec.partial}</span>}
            </div>
            <div className="legend" style={{ marginTop: 10 }}>
              <span><span className="tok-filler">um</span> filler</span><span><span className="tok-discourse possible">like</span> maybe a filler</span><span><span className="tok-repetition">I I</span> repeat</span><span><span className="tok-correction-old">two</span> <span className="tok-correction-marker">actually make that</span> self-correction</span>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Paste or type spoken text instead</summary>
              <div className="stack" style={{ marginTop: 8, ['--gap' as any]: '8px' }}>
                <textarea className="input" value={pasteText} onChange={(e) => setPasteText(e.target.value)} aria-label="Spoken text to process" placeholder="so um I was thinking we could like meet on Tuesday no wait Wednesday" />
                <button className="btn sm" onClick={addPasted}>Add to transcript</button>
              </div>
            </details>
          </section>

          <section className="panel" aria-label="Output">
            <div className="spread" style={{ marginBottom: 12 }}>
              <div className="seg" role="group" aria-label="Processing mode">
                {(['verbatim', 'clean', 'polished'] as const).map((m) => <button key={m} aria-pressed={mode === m} onClick={() => { push(); setMode(m); setManual(null); }}>{m[0].toUpperCase() + m.slice(1)}</button>)}
              </div>
              <div className="seg" role="group" aria-label="View">
                <button aria-pressed={view === 'output'} onClick={() => setView('output')}>Result</button>
                <button aria-pressed={view === 'compare'} onClick={() => setView('compare')}>Compare</button>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 0 }}>{MODE_INFO[mode]}{styleShift !== 'none' && <> · <strong>Tone: {styleShift}</strong> <button className="btn ghost sm" onClick={() => { push(); setStyleShift('none'); }}>Reset tone</button></>}</p>
            {view === 'output' ? (
              <>
                <textarea className="input output-box" value={output} onChange={(e) => { if (manual === null) push(); setManual(e.target.value); }} aria-label="Result text (editable)" placeholder="Your text appears here." />
                {manual !== null && <p className="small muted">You’ve edited this by hand. <button className="btn ghost sm" onClick={() => { push(); setManual(null); }}>Restore generated text</button></p>}
              </>
            ) : (
              <div className="stack" style={{ ['--gap' as any]: '10px' }}>
                {mode === 'verbatim' ? <p className="muted">Verbatim makes no changes, so there’s nothing to compare. Switch to Clean or Polished.</p> : (
                  <>
                    <p className="small muted" style={{ margin: 0 }}>Click a change to reject or restore it. Original words are struck through; new words are highlighted.</p>
                    <div className="diff output-box" style={{ whiteSpace: 'normal' }}>
                      {diff.parts.map((part, i) => 'type' in part ? <span key={i}>{part.text} </span> : (
                        <button key={i} className={`hunk ${rejected.has(part.id) ? 'rejected' : ''}`} style={{ border: 0, background: 'none', padding: 0, font: 'inherit', color: 'inherit' }} aria-label={`${rejected.has(part.id) ? 'Restore' : 'Reject'} change: ${part.del ? 'remove “' + part.del + '”' : ''} ${part.ins ? 'add “' + part.ins + '”' : ''}`}
                          onClick={() => setRejected((r) => { const n = new Set(r); n.has(part.id) ? n.delete(part.id) : n.add(part.id); return n; })}>
                          {part.del && <del>{part.del}</del>}{part.del && part.ins ? ' ' : ''}{part.ins && <ins>{part.ins}</ins>}{' '}
                        </button>
                      ))}
                    </div>
                    <div className="row">
                      <span className="small muted">{diff.hunks.length - rejected.size} of {diff.hunks.length} changes accepted</span>
                      <button className="btn sm primary" onClick={() => { push(); setManual(acceptedText); setView('output'); toast('Applied your accepted changes'); }} disabled={!diff.hunks.length}>Use this version</button>
                      <button className="btn sm" onClick={() => { push(); setManual(verbatim.text); setView('output'); }}>Restore original</button>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={() => copyText(output)} disabled={!output}><Icon name="copy" size={16} />Copy</button>
              <button className="btn sm" onClick={() => download(`speakeasy-${new Date().toISOString().slice(0, 10)}.txt`, output)} disabled={!output}><Icon name="download" size={16} />Export .txt</button>
              <button className="btn sm primary" onClick={saveDoc}><Icon name="save" size={16} />Save session</button>
            </div>
          </section>
        </div>

        <aside className="side-tools">
          <div className="panel">
            <label className="field"><span>Format</span>
              <select className="input" value={format} onChange={(e) => { push(); setFormat(e.target.value as FormatId); setManual(null); }}>{FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            </label>
            <p className="small muted" style={{ marginBottom: 0 }}>You can change the format after speaking.</p>
          </div>
          <div className="panel">
            <h3 style={{ fontSize: 'var(--step-1)' }}>Clean-up settings</h3>
            {([['basic', 'Um, uh, er'], ['discourse', '“Like”, “you know” as fillers'], ['repetitions', 'Repeats and false starts'], ['hesitations', 'Hesitation phrases']] as const).map(([k, label]) => (
              <label key={k} className="field" style={{ marginBottom: 10 }}><span>{label}</span>
                <select className="input" value={prefs[k]} onChange={(e) => setState((s) => ({ fillerPrefs: { ...s.fillerPrefs, [k]: e.target.value } }))}><option value="remove">Remove (Clean mode)</option><option value="highlight">Highlight only</option><option value="keep">Keep</option></select>
              </label>
            ))}
            <label className="switch"><span className="small">Spoken punctuation (“comma”, “new paragraph”)</span><input type="checkbox" checked={prefs.spokenPunctuation} onChange={(e) => setState((s) => ({ fillerPrefs: { ...s.fillerPrefs, spokenPunctuation: e.target.checked } }))} /></label>
            <label className="switch"><span className="small">Voice commands</span><input type="checkbox" checked={prefs.voiceCommands} onChange={(e) => setState((s) => ({ fillerPrefs: { ...s.fillerPrefs, voiceCommands: e.target.checked } }))} /></label>
            <p className="small muted" style={{ marginBottom: 0 }}>“Like” and “you know” are only removed when they’re clearly fillers — “I like the design” stays as it is. Polished mode always removes clear fillers.</p>
          </div>
          <details className="panel">
            <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Voice commands</summary>
            <p className="small muted">Say these on their own, as a separate phrase:</p>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              {['Delete the last sentence', 'Undo that', 'New paragraph', 'Make that more formal', 'Make it more casual', 'Keep the last sentence exactly as I said it', 'Remove the filler words', 'Repeat the last instruction', 'Read it back', 'Save this', 'Stop recording', 'Switch to conversation mode'].map((c) => <li key={c}>{c}</li>)}
            </ul>
          </details>
          <div className="panel">
            <h3 style={{ fontSize: 'var(--step-1)' }}>Saved sessions</h3>
            {!docs.length ? <p className="small muted" style={{ margin: 0 }}>Saved dictations appear here, in this browser only.</p> : (
              <div style={{ display: 'grid', gap: 6 }}>
                {docs.slice(0, 8).map((d) => (
                  <div key={d.id} className="spread" style={{ flexWrap: 'nowrap' }}>
                    <button className="btn ghost sm grow" style={{ justifyContent: 'flex-start', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => openDoc(d)}>{d.title}</button>
                    <button className="btn ghost sm icon-only" aria-label={`Delete ${d.title}`} onClick={() => setConfirmDelete(d)}><Icon name="trash" size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
      <Confirm open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={clearAll} title="Clear this session?" body="This removes the current transcript and result. You can undo straight afterwards." confirmLabel="Clear" />
      <Confirm open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { if (confirmDelete) { setState((s) => ({ studioDocs: s.studioDocs.filter((d) => d.id !== confirmDelete.id) })); if (docId === confirmDelete.id) setDocId(null); toast('Deleted'); } }} title="Delete saved session?" body={`“${confirmDelete?.title ?? ''}” will be deleted from this browser. This can’t be undone.`} confirmLabel="Delete" />
    </>
  );
}

function Tokens({ toks }: { toks: Token[] }) {
  return (
    <>
      {toks.map((t, i) => {
        const space = i > 0 && t.kind !== 'punct' ? ' ' : '';
        if (!t.kind || t.kind === 'punct') return <span key={i}>{space}{t.w === '¶' ? '' : t.w}</span>;
        if (t.kind === 'break') return <br key={i} />;
        return <span key={i}>{space}<span className={`tok-${t.kind} ${t.confidence === 'possible' ? 'possible' : ''}`} title={t.note}>{t.w}</span></span>;
      })}
    </>
  );
}
