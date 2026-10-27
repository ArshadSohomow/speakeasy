import { useState } from 'react';
import { useStore, setState, uid, markDaily, dailyDoneToday } from '../lib/store';
import { DAILY_WORDS, PRON_ITEMS, CURATED_QUOTES, pickDaily, itemsFor } from '../lib/content';
import { getDialect } from '../lib/catalog';
import { saveVocab } from '../lib/srs';
import { SpeakButton, toast, Dialog } from '../components/ui';
import { useRecognizer } from '../components/hooks';
import { recognitionSupported } from '../lib/speech';
import { norm } from '../lib/textProcessing';
import { Icon } from '../components/Icon';
import { Link } from '../lib/router';
import { PageHead } from './Shell';
import type { Quote } from '../lib/types';

function SpeakCheck({ target, lang, onDone, label }: { target?: string; lang: string; onDone?: (heard: string) => void; label: string }) {
  const [heard, setHeard] = useState('');
  const rec = useRecognizer({ lang, continuous: false, onFinal: (t) => { setHeard(t); onDone?.(t); } });
  const words = target ? target.split(/\s+/) : [];
  const hs = new Set(heard.split(/\s+/).map(norm));
  const pct = target && heard ? Math.round((words.filter((w) => hs.has(norm(w))).length / words.length) * 100) : null;
  if (!recognitionSupported()) return <p className="small muted">Speaking challenges need speech recognition (Chrome, Edge or Safari).</p>;
  return (
    <div className="stack" style={{ ['--gap' as any]: '8px' }}>
      <div className="row">
        <button className={`btn sm ${rec.listening ? '' : 'primary'}`} onClick={() => (rec.listening ? rec.stop() : (setHeard(''), rec.start()))}><Icon name={rec.listening ? 'stop' : 'mic'} size={16} />{rec.listening ? 'Stop' : label}</button>
        <span className="small muted" role="status">{rec.listening ? rec.partial || 'Listening…' : rec.error && rec.error.code !== 'no-speech' ? rec.error.message : ''}</span>
      </div>
      {heard && <div className="small">We heard: “{heard}” {pct !== null && <span className={`tag ${pct >= 80 ? 'good' : 'note'}`}>{pct}% of words recognised</span>}</div>}
    </div>
  );
}

export function Daily() {
  const s = useStore((x) => x);
  const p = s.profile;
  const done = dailyDoneToday(s);
  const word = pickDaily(itemsFor(DAILY_WORDS, p.targetLang));
  const pron = pickDaily(itemsFor(PRON_ITEMS, p.targetLang), 1);
  const quote = pickDaily(CURATED_QUOTES, 2);
  const { dialect } = getDialect(word.dialect);
  const [explain, setExplain] = useState(false);
  const [draft, setDraft] = useState('');
  const [author, setAuthor] = useState('');
  const [kind, setKind] = useState<'original' | 'submitted'>('original');
  const [share, setShare] = useState(false);
  const [consent, setConsent] = useState(false);
  const dictate = useRecognizer({ lang: getDialect(p.dialect).dialect.recognitionLang, onFinal: (t) => setDraft((d) => (d ? d + ' ' : '') + t) });

  const community = s.quotes.filter((q) => q.visibility === 'community' && !q.reported);
  const eligible = community.filter((q) => q.status !== 'pending');
  const featured = [...eligible].sort((a, b) => b.votes + (s.votes[b.id] ? 1 : 0) - (a.votes + (s.votes[a.id] ? 1 : 0)))[0];
  const mine = s.quotes.filter((q) => !q.sample);

  const submit = () => {
    if (!draft.trim()) return;
    const q: Quote = { id: uid(), text: draft.trim(), author: kind === 'original' ? (p.name || 'You') : author.trim() || 'Unknown', kind, visibility: share && consent ? 'community' : 'private', createdAt: Date.now(), votes: 0, status: share && consent ? 'pending' : undefined };
    setState((st) => ({ quotes: [q, ...st.quotes] }));
    setDraft(''); setAuthor(''); setShare(false); setConsent(false);
    markDaily('quote');
    toast(q.visibility === 'community' ? 'Submitted. It’s pending moderation before it can be featured.' : 'Saved privately');
  };
  const vote = (id: string) => setState((st) => { const v = { ...st.votes }; if (v[id]) delete v[id]; else v[id] = true; return { votes: v }; });
  const report = (id: string) => { setState((st) => ({ quotes: st.quotes.map((q) => (q.id === id ? { ...q, reported: true } : q)) })); toast('Reported. It’s hidden while a moderator reviews it.'); };

  return (
    <>
      <PageHead title="Daily Challenge" sub={`${done.length} of 3 done today`} />
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <section className="panel stack" style={{ ['--gap' as any]: '12px' }} aria-labelledby="dw">
          <div className="spread"><span className="tag lav">Word of the day</span>{done.includes('word') && <span className="tag good"><Icon name="check" size={14} />Done</span>}</div>
          <div className="big-word" id="dw" lang={word.dialect}>{word.text}</div>
          <div className="muted">{word.pronunciation}</div>
          <p style={{ margin: 0 }}>{word.meaning}{word.translation && word.lang !== 'en' ? <> — <em>{word.translation}</em></> : null}</p>
          <div className="nat-line" lang={word.dialect}>{word.example}</div>
          <div className="nat-line casual" lang={word.dialect}>{word.casual.map((l) => <div key={l}>{l}</div>)}</div>
          <dl className="dl"><dt>Register</dt><dd>{word.register}</dd><dt>Where</dt><dd>{word.region}</dd></dl>
          <div className="row">
            <SpeakButton text={word.text} dialect={word.dialect} label="Hear it" />
            <SpeakButton text={word.example} dialect={word.dialect} label="Example" />
            <button className="btn sm" onClick={() => { const { created } = saveVocab({ text: word.text, meaning: word.meaning, lang: word.lang, dialect: word.dialect, example: word.example, context: word.register, source: 'daily' }); toast(created ? 'Saved to your vocabulary' : 'Already saved'); }}><Icon name="bookmark" size={16} />Save</button>
          </div>
          <div className="panel tint-yellow" style={{ padding: 14 }}>
            <strong>Speaking challenge:</strong> {word.challenge}
            <div style={{ marginTop: 10 }}><SpeakCheck lang={dialect.recognitionLang} label="Answer out loud" onDone={(h) => { if (h.split(' ').length >= 3) { markDaily('word'); toast('Challenge complete'); } }} /></div>
          </div>
        </section>

        <div className="stack" style={{ ['--gap' as any]: '16px' }}>
          <section className="panel stack" style={{ ['--gap' as any]: '10px' }} aria-labelledby="dp">
            <div className="spread"><span className="tag sky">Difficult pronunciation</span>{done.includes('pron') && <span className="tag good"><Icon name="check" size={14} />Done</span>}</div>
            <div className="big-word" id="dp" style={{ fontSize: 'var(--step-4)' }} lang={pron.dialect ?? 'en'}>{pron.text}</div>
            <div className="muted small">{pron.ipa} · {pron.stress}</div>
            <div className="row">
              <SpeakButton text={pron.text} dialect={pron.dialect ?? p.dialect} label="Hear" />
              <Link className="btn sm primary" to={`/app/pronunciation?item=${encodeURIComponent(pron.text)}`} onClick={() => markDaily('pron')}>Practise with feedback</Link>
            </div>
          </section>

          <section className="panel stack" style={{ ['--gap' as any]: '10px' }} aria-labelledby="dq">
            <div className="spread"><span className="tag mint">Quote of the day</span><span className="small muted">Curated</span></div>
            <p className="quote" id="dq">“{quote.text}”</p>
            <div className="small muted">— {quote.author}{quote.note ? ` · ${quote.note}` : ''}</div>
            <div className="row">
              <SpeakButton text={quote.text} dialect="en-GB" label="Read aloud" />
              <button className="btn sm" onClick={() => setExplain(true)}><Icon name="help" size={16} />Explain</button>
            </div>
            <SpeakCheck target={quote.text} lang="en-GB" label="Say it yourself" />
          </section>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel stack" style={{ ['--gap' as any]: '12px' }} aria-labelledby="yq">
          <h2 id="yq" style={{ fontSize: 'var(--step-2)', marginBottom: 0 }}>Your own quote</h2>
          <p className="muted small" style={{ margin: 0 }}>Dictate or type a quote — your own words, or one you love (with who said it).</p>
          <div className="seg" role="group" aria-label="Quote type"><button aria-pressed={kind === 'original'} onClick={() => setKind('original')}>My own words</button><button aria-pressed={kind === 'submitted'} onClick={() => setKind('submitted')}>Someone else’s</button></div>
          <div className="textbox">
            <textarea className="input" style={{ minHeight: 90 }} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Quote text" placeholder="Speak or type your quote, then correct anything we misheard." />
          </div>
          <div className="row">
            {recognitionSupported() && <button className="btn sm" onClick={() => (dictate.listening ? dictate.stop() : dictate.start())}><Icon name={dictate.listening ? 'stop' : 'mic'} size={16} />{dictate.listening ? 'Stop dictating' : 'Dictate'}</button>}
            {draft && <SpeakButton text={draft} dialect={p.dialect} label="Hear it" />}
            {dictate.listening && <span className="small muted">{dictate.partial}</span>}
          </div>
          {kind === 'submitted' && <label className="field"><span>Who said it?</span><input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Name and, if you know it, where it’s from" /></label>}
          <label className="switch"><span>Share with the community pool</span><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /></label>
          {share && <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} /><span>I agree that this quote can be shown publicly with my display name, and confirm it contains no personal information. {kind === 'submitted' ? 'I’ve credited the original author.' : 'These are my own words.'}</span></label>}
          <button className="btn primary" onClick={submit} disabled={!draft.trim() || (share && !consent)}>{share ? 'Submit to community' : 'Save privately'}</button>
          {mine.length > 0 && (
            <div className="stack" style={{ ['--gap' as any]: '8px' }}>
              <div className="label">Your quotes</div>
              {mine.map((q) => (
                <div key={q.id} className="spread small" style={{ flexWrap: 'nowrap' }}>
                  <span>“{q.text}” <span className="muted">— {q.author}</span></span>
                  <span className="row" style={{ flexWrap: 'nowrap' }}><span className="tag">{q.visibility === 'community' ? (q.status === 'pending' ? 'Pending review' : 'Shared') : 'Private'}</span>
                    <button className="btn ghost sm icon-only" aria-label="Delete quote" onClick={() => setState((st) => ({ quotes: st.quotes.filter((x) => x.id !== q.id) }))}><Icon name="trash" size={16} /></button></span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel stack" style={{ ['--gap' as any]: '12px' }} aria-labelledby="cc">
          <h2 id="cc" style={{ fontSize: 'var(--step-2)', marginBottom: 0 }}>Community challenge</h2>
          <p className="small muted" style={{ margin: 0 }}>How the daily pick works: submissions are reviewed by a moderator first. Of the approved ones, the quote with the most votes in the last 7 days is featured. Not every submission will be picked. In this demo the pool contains sample entries and stays in your browser.</p>
          {featured && (
            <div className="panel tint-lav stack" style={{ ['--gap' as any]: '8px' }}>
              <div className="small" style={{ fontWeight: 650 }}>Today’s featured quote</div>
              <p className="quote" style={{ margin: 0 }}>“{featured.text}”</p>
              <div className="small">— {featured.author} · {featured.kind === 'original' ? 'Original submission' : 'Attributed quote'}{featured.sample ? ' · Sample' : ''}</div>
              <SpeakCheck target={featured.text} lang={getDialect(p.dialect).dialect.recognitionLang} label="Perform it" onDone={() => { markDaily('community'); }} />
            </div>
          )}
          <div className="stack" style={{ ['--gap' as any]: '8px' }}>
            {community.map((q) => (
              <div key={q.id} className="insight" style={{ alignItems: 'center' }}>
                <div className="grow">“{q.text}”<div className="small muted">— {q.author} · {q.kind === 'original' ? 'Original' : 'Attributed'}{q.sample ? ' · Sample' : ''}{q.status === 'pending' ? ' · Pending review' : ''}</div></div>
                <button className="btn sm" aria-pressed={!!s.votes[q.id]} onClick={() => vote(q.id)} aria-label={`${s.votes[q.id] ? 'Remove vote' : 'Vote'} for this quote`} disabled={q.status === 'pending'}><Icon name="heart" size={16} />{q.votes + (s.votes[q.id] ? 1 : 0)}</button>
                <button className="btn ghost sm icon-only" aria-label="Report quote" onClick={() => report(q.id)}><Icon name="flag" size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={explain} onClose={() => setExplain(false)} title="What it means">
        <p className="quote" style={{ fontSize: 'var(--step-2)' }}>“{quote.text}”</p>
        <p>{quote.meaning}</p>
        <p className="small muted">— {quote.author}{quote.note ? ` (${quote.note})` : ''}</p>
      </Dialog>
    </>
  );
}
