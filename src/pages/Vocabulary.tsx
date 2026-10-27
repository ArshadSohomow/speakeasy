import { useMemo, useState } from 'react';
import { useStore, addSession } from '../lib/store';
import { schedule, isDue, saveVocab, updateVocab, deleteVocab, type Grade } from '../lib/srs';
import { getDialect } from '../lib/catalog';
import { useLocation, navigate } from '../lib/router';
import { SpeakButton, toast, Confirm, Dialog, useSpeaker } from '../components/ui';
import { useRecognizer } from '../components/hooks';
import { Icon } from '../components/Icon';
import { recognitionSupported } from '../lib/speech';
import type { VocabEntry } from '../lib/types';
import { PageHead } from './Shell';

const FILTERS: { id: string; label: string; test: (v: VocabEntry) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'due', label: 'Due now', test: (v) => isDue(v) },
  { id: 'new', label: 'New', test: (v) => v.status === 'new' },
  { id: 'learning', label: 'Learning', test: (v) => v.status === 'learning' },
  { id: 'familiar', label: 'Familiar', test: (v) => v.status === 'familiar' },
  { id: 'difficult', label: 'Difficult', test: (v) => v.status === 'difficult' },
  { id: 'conversation', label: 'From conversations', test: (v) => v.source === 'conversation' || v.source === 'explain' },
  { id: 'pron', label: 'Pronunciation practice', test: (v) => v.source === 'pronunciation' },
  { id: 'regional', label: 'Regional expressions', test: (v) => !!v.regional },
];
const STATUS_TAG: Record<string, string> = { new: 'sky', learning: 'note', familiar: 'good', difficult: 'improve' };

export function Vocabulary() {
  const { query } = useLocation();
  const vocab = useStore((s) => s.vocab);
  const p = useStore((s) => s.profile);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [del, setDel] = useState<VocabEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const reviewing = query.get('review') === '1';
  const list = useMemo(() => vocab.filter(FILTERS.find((f) => f.id === filter)!.test), [vocab, filter]);
  const due = vocab.filter((v) => isDue(v));

  if (reviewing) return <Review queue={due} />;

  return (
    <>
      <PageHead title="Vocabulary" sub={`${vocab.length} saved · ${due.length} due for review`}>
        <button className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={18} />Add phrase</button>
        <button className="btn primary" onClick={() => navigate('/app/vocabulary?review=1')} disabled={!due.length}><Icon name="repeat" size={18} />Review {due.length || ''}</button>
      </PageHead>
      <div className="row" role="group" aria-label="Filter" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>)}
      </div>
      {!vocab.length ? (
        <div className="panel empty">
          <Icon name="vocab" size={40} />
          <h2 style={{ marginBottom: 0 }}>Your phrasebook is empty</h2>
          <p>Save expressions from conversations, the daily challenge or pronunciation practice. They’ll come back for review at the right time.</p>
          <div className="row"><button className="btn primary" onClick={() => navigate('/app/daily')}>See today’s expression</button><button className="btn" onClick={() => setAdding(true)}>Add one yourself</button></div>
        </div>
      ) : !list.length ? <p className="muted">Nothing matches this filter.</p> : (
        <div className="vocab-list">
          {list.map((v) => (
            <div key={v.id} className="vocab-item">
              <div style={{ minWidth: 0 }}>
                <button className="btn ghost" style={{ padding: 0, minHeight: 0, justifyContent: 'flex-start' }} onClick={() => setOpen(open === v.id ? null : v.id)} aria-expanded={open === v.id}>
                  <span className="t" lang={v.dialect}>{v.text}</span>
                </button>
                <div className="small muted">{v.meaning}</div>
                <div className="row small" style={{ marginTop: 6 }}><span className={`tag ${STATUS_TAG[v.status]}`}>{v.status[0].toUpperCase() + v.status.slice(1)}</span><span className="tag">{v.dialect}</span>{isDue(v) && <span className="tag lav">Due</span>}{v.sample && <span className="tag">Sample</span>}</div>
                {open === v.id && (
                  <div className="stack small" style={{ marginTop: 10, ['--gap' as any]: '8px' }}>
                    <dl className="dl">
                      {v.context && <><dt>Context</dt><dd>{v.context}</dd></>}
                      {v.example && <><dt>Example</dt><dd>{v.example}</dd></>}
                      <dt>Added</dt><dd>{new Date(v.addedAt).toLocaleDateString()}</dd>
                      <dt>Reviews</dt><dd>{v.reviews}{v.lastReviewed ? ` · last ${new Date(v.lastReviewed).toLocaleDateString()}` : ''}</dd>
                      <dt>Next review</dt><dd>{isDue(v) ? 'Now' : new Date(v.nextReview).toLocaleDateString()}</dd>
                    </dl>
                    <label className="field"><span>Meaning (editable)</span><input className="input" defaultValue={v.meaning} onBlur={(e) => e.target.value !== v.meaning && (updateVocab(v.id, { meaning: e.target.value }), toast('Updated'))} /></label>
                  </div>
                )}
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <SpeakButton text={v.text} dialect={v.dialect} label={undefined} />
                <button className="btn sm icon-only ghost" aria-label={`Delete ${v.text}`} onClick={() => setDel(v)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { deleteVocab(del.id); toast('Deleted'); } }} title="Delete this phrase?" body={`“${del?.text}” and its review history will be removed.`} confirmLabel="Delete" />
      <AddDialog open={adding} onClose={() => setAdding(false)} lang={p.targetLang} dialect={p.dialect} />
    </>
  );
}

function AddDialog({ open, onClose, lang, dialect }: { open: boolean; onClose: () => void; lang: any; dialect: string }) {
  const [text, setText] = useState(''); const [meaning, setMeaning] = useState(''); const [example, setExample] = useState('');
  return (
    <Dialog open={open} onClose={onClose} title="Add a phrase" footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!text.trim() || !meaning.trim()} onClick={() => { saveVocab({ text: text.trim(), meaning: meaning.trim(), example, lang, dialect, source: 'manual' }); toast('Added to your vocabulary'); setText(''); setMeaning(''); setExample(''); onClose(); }}>Add</button></>}>
      <label className="field"><span>Word or phrase</span><input className="input" value={text} onChange={(e) => setText(e.target.value)} /></label>
      <label className="field"><span>Meaning</span><input className="input" value={meaning} onChange={(e) => setMeaning(e.target.value)} /></label>
      <label className="field"><span>Example sentence (optional)</span><input className="input" value={example} onChange={(e) => setExample(e.target.value)} /></label>
      <p className="small muted">Saved for {getDialect(dialect).language.name} ({getDialect(dialect).dialect.label}).</p>
    </Dialog>
  );
}

type Task = 'recall' | 'listen' | 'use';
function Review({ queue }: { queue: VocabEntry[] }) {
  const [items] = useState(() => queue.slice(0, 15));
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [recalled, setRecalled] = useState(0);
  const [started] = useState(Date.now());
  const { say } = useSpeaker();
  const cur = items[i];
  const task: Task = !cur ? 'recall' : (['recall', 'listen', 'use'] as Task[])[(cur.reviews + i) % 3];
  const { dialect } = getDialect(cur?.dialect ?? 'en-GB');
  const rec = useRecognizer({ lang: dialect.recognitionLang, continuous: false, onFinal: (t) => setAnswer((a) => (a ? a + ' ' : '') + t) });

  if (!items.length) return (
    <div className="panel empty"><Icon name="check" size={40} /><h2>Nothing due right now</h2><p>Come back later — phrases return when they’re about to slip your mind.</p><button className="btn" onClick={() => navigate('/app/vocabulary')}>Back to vocabulary</button></div>
  );
  if (!cur) {
    return (
      <div className="panel empty">
        <Icon name="sparkle" size={40} />
        <h2>Review done</h2>
        <p>You reviewed {items.length} phrase{items.length > 1 ? 's' : ''} and recalled {recalled} without help.</p>
        <button className="btn primary" onClick={() => navigate('/app/vocabulary')}>Back to vocabulary</button>
      </div>
    );
  }
  const used = task === 'use' && answer && answer.toLowerCase().includes(cur.text.toLowerCase().split(' ')[0]);
  const grade = (g: Grade) => {
    updateVocab(cur.id, schedule(cur, g));
    if (g === 'good' || g === 'easy') setRecalled((r) => r + 1);
    setRevealed(false); setAnswer('');
    if (i + 1 >= items.length) addSession({ kind: 'review', title: 'Vocabulary review', startedAt: started, durationSec: Math.round((Date.now() - started) / 1000), words: 0, fillers: 0, repetitions: 0, lang: cur.lang, recalled: recalled + (g === 'good' || g === 'easy' ? 1 : 0) });
    setI(i + 1);
  };

  return (
    <>
      <PageHead title="Review" sub={`${i + 1} of ${items.length}`}><button className="btn" onClick={() => navigate('/app/vocabulary')}>Stop</button></PageHead>
      <div className="flash">
        <div className="stack" style={{ ['--gap' as any]: '14px', width: 'min(560px, 100%)' }}>
          <span className="tag lav" style={{ justifySelf: 'center' }}>{task === 'recall' ? 'What does it mean?' : task === 'listen' ? 'Listen — what phrase is it?' : 'Use it in a sentence'}</span>
          {task === 'listen' && !revealed ? (
            <button className="btn lg" style={{ justifySelf: 'center' }} onClick={() => say(cur.text, cur.dialect)}><Icon name="volume" />Play</button>
          ) : <div className="big-word" lang={cur.dialect}>{cur.text}</div>}
          {!revealed && (
            <>
              <div className="textbox">
                <input className="input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={task === 'use' ? 'Say or type a sentence using it…' : task === 'listen' ? 'Type what you heard…' : 'Say or type the meaning (optional)…'} aria-label="Your answer" />
                {recognitionSupported() && <button className="btn icon-only" onClick={() => (rec.listening ? rec.stop() : rec.start())} aria-label={rec.listening ? 'Stop' : 'Answer by speaking'}><Icon name={rec.listening ? 'stop' : 'mic'} /></button>}
              </div>
              <button className="btn primary" onClick={() => setRevealed(true)}>Show answer</button>
            </>
          )}
          {revealed && (
            <>
              <div><strong>{cur.meaning}</strong>{cur.example && <div className="muted small">{cur.example}</div>}</div>
              {answer && <div className="small">You answered: “{answer}” {task === 'use' && (used ? <span className="tag good">Used the phrase</span> : <span className="tag note">Phrase not detected</span>)}</div>}
              <p className="small muted" style={{ margin: 0 }}>How well did you know it?</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn" onClick={() => grade('again')}>Didn’t know</button>
                <button className="btn" onClick={() => grade('hard')}>Hard</button>
                <button className="btn primary" onClick={() => grade('good')}>Got it</button>
                <button className="btn" onClick={() => grade('easy')}>Easy</button>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>Phrases only move to “familiar” after several successful recalls over at least a week — opening or replaying them doesn’t count.</p>
    </>
  );
}
