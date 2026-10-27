import { useMemo, useState } from 'react';
import { useStore, setState, uid } from '../lib/store';
import { BarChart, LineChart, DemoNote, toast } from '../components/ui';
import { Icon } from '../components/Icon';
import { Link } from '../lib/router';
import { ruleLabel } from '../lib/teaching';
import type { Session, VocabEntry } from '../lib/types';
import { PageHead } from './Shell';

const DAY = 86400000;
const RANGES = [{ id: 7, label: 'Last 7 days' }, { id: 30, label: 'Last 30 days' }, { id: 365, label: 'All time' }];

function sampleData(): { sessions: Session[]; vocab: VocabEntry[] } {
  const now = Date.now(); const sessions: Session[] = [];
  const titles = ['Chat with Kai', 'Small talk with colleagues', 'Ordering food and chatting with staff', 'Chat with Professor Theodore'];
  for (let d = 27; d >= 0; d--) {
    if (d % 3 === 1) continue;
    const t = now - d * DAY - 3600000 * 3;
    sessions.push({ id: uid(), kind: 'conversation', title: titles[d % titles.length], startedAt: t, durationSec: 240 + ((d * 37) % 300), words: 120 + ((d * 13) % 90), fillers: 0, repetitions: 0, lang: 'en', mascot: 'kai', summary: 'Sample session', errors: d % 2 ? ['en-past-simple'] : ['en-third-person-s'], sample: true });
    if (d % 4 === 0) sessions.push({ id: uid(), kind: 'speaking', title: 'One-minute talk', startedAt: t + 1800000, durationSec: 60, words: Math.round(110 + (27 - d) * 1.2), fillers: Math.max(1, Math.round(9 - (27 - d) * 0.28)), repetitions: 2, wpm: 112 + Math.round((27 - d) * 0.9), lang: 'en', sample: true, summary: 'Sample talk' });
    if (d % 5 === 0) sessions.push({ id: uid(), kind: 'pronunciation', title: 'Pronunciation: comfortable', startedAt: t + 2400000, durationSec: 15, words: 1, fillers: 0, repetitions: 0, lang: 'en', sample: true });
  }
  const vocab: VocabEntry[] = ['fair enough', 'to be up for', 'play it by ear', 'grab a bite', 'cheers'].map((text, i) => ({ id: uid(), text, meaning: 'Sample phrase', lang: 'en', dialect: 'en-GB', context: '', example: '', source: 'conversation', addedAt: now - i * 2 * DAY, status: i < 2 ? 'learning' : 'new', reviews: i < 2 ? 2 : 0, lapses: 0, ease: 2.5, intervalDays: i < 2 ? 3 : 0, nextReview: now + (i < 2 ? 2 * DAY : 0), sample: true }));
  return { sessions, vocab };
}

export function Progress() {
  const s = useStore((x) => x);
  const [range, setRange] = useState(7);
  const hasSample = s.sessions.some((x) => x.sample);
  const since = Date.now() - range * DAY;
  const sessions = s.sessions.filter((x) => x.startedAt >= since);
  const prevSessions = s.sessions.filter((x) => x.startedAt < since && x.startedAt >= since - range * DAY);
  const convo = sessions.filter((x) => x.kind === 'conversation');
  const speaking = sessions.filter((x) => x.kind === 'speaking' && x.wpm);
  const seconds = sessions.filter((x) => x.kind !== 'review').reduce((a, b) => a + b.durationSec, 0);
  const prevSeconds = prevSessions.filter((x) => x.kind !== 'review').reduce((a, b) => a + b.durationSec, 0);
  const words = sessions.reduce((a, b) => a + (b.kind === 'review' ? 0 : b.words), 0);
  const recalled = sessions.filter((x) => x.kind === 'review').reduce((a, b) => a + (b.recalled ?? 0), 0);
  const saved = s.vocab.filter((v) => v.addedAt >= since).length;
  const pron = sessions.filter((x) => x.kind === 'pronunciation').length;

  const perDay = useMemo(() => {
    const days = Math.min(range, 30);
    return Array.from({ length: days }, (_, i) => {
      const start = new Date(Date.now() - (days - 1 - i) * DAY); start.setHours(0, 0, 0, 0);
      const end = start.getTime() + DAY;
      const mins = s.sessions.filter((x) => x.startedAt >= start.getTime() && x.startedAt < end && x.kind !== 'review').reduce((a, b) => a + b.durationSec, 0) / 60;
      return { x: start.toLocaleDateString(undefined, days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }), y: Math.round(mins * 10) / 10 };
    });
  }, [s.sessions, range]);

  const wpm = speaking.map((x) => ({ x: new Date(x.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), y: x.wpm! }));
  const fpm = speaking.map((x) => ({ x: new Date(x.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), y: Math.round((x.fillers / Math.max(1, x.durationSec / 60)) * 10) / 10 }));

  const insights: string[] = [];
  if (fpm.length >= 6) {
    const last3 = fpm.slice(-3).reduce((a, b) => a + b.y, 0) / 3, prev3 = fpm.slice(-6, -3).reduce((a, b) => a + b.y, 0) / 3;
    if (last3 < prev3 - 0.3) insights.push(`You used fewer filler words in your last three speaking sessions (${last3.toFixed(1)} per minute, down from ${prev3.toFixed(1)}).`);
    else if (last3 > prev3 + 0.3) insights.push(`Filler words went up a little in your last three talks (${last3.toFixed(1)} per minute). That often happens with harder prompts.`);
  }
  if (saved) insights.push(`You saved ${saved} new expression${saved > 1 ? 's' : ''} in this period.`);
  const topError = Object.values(s.errorPatterns).sort((a, b) => b.count - a.count)[0];
  if (topError && topError.count >= 2) insights.push(`A pattern that keeps coming up: ${ruleLabel(topError.key).toLowerCase()} (${topError.count} times). For example, “${topError.example}” → “${topError.fix}”.`);
  if (hasSample) {
    const errCounts: Record<string, number> = {};
    sessions.forEach((x) => x.errors?.forEach((e) => (errCounts[e] = (errCounts[e] ?? 0) + 1)));
    const top = Object.entries(errCounts).sort((a, b) => b[1] - a[1])[0];
    if (top) insights.push(`In these sessions, “${ruleLabel(top[0])}” came up ${top[1]} times. A short conversation about yesterday is a good way to practise it.`);
  }
  if (prevSeconds && seconds) insights.push(seconds >= prevSeconds ? `You spoke for ${Math.round(seconds / 60)} minutes — more than the period before (${Math.round(prevSeconds / 60)}).` : `You spoke for ${Math.round(seconds / 60)} minutes, a bit less than the period before (${Math.round(prevSeconds / 60)}). Little and often works well.`);

  const loadSample = () => { const d = sampleData(); setState((st) => ({ sessions: [...d.sessions, ...st.sessions], vocab: [...st.vocab, ...d.vocab] })); toast('Sample data loaded — clearly labelled and removable'); };
  const clearSample = () => { setState((st) => ({ sessions: st.sessions.filter((x) => !x.sample), vocab: st.vocab.filter((v) => !v.sample) })); toast('Sample data removed'); };

  if (!s.sessions.length) {
    return (
      <>
        <PageHead title="Progress" />
        <div className="panel empty">
          <Icon name="progress" size={40} />
          <h2 style={{ marginBottom: 0 }}>No sessions yet</h2>
          <p>Your progress is built from real practice: conversations, speaking drills, pronunciation and reviews. Have a quick chat and come back.</p>
          <div className="row"><Link className="btn primary" to="/app/conversation">Start a conversation</Link><button className="btn" onClick={loadSample}>Preview with sample data</button></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="Progress" sub="Trends from your recorded sessions.">
        <div className="seg" role="group" aria-label="Time range">{RANGES.map((r) => <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}</div>
      </PageHead>
      {hasSample && <DemoNote>Some of what you see is <strong>sample data</strong> for previewing this page. <button className="btn sm" style={{ marginLeft: 8 }} onClick={clearSample}>Remove sample data</button></DemoNote>}
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><b>{Math.round(seconds / 60)}</b><span>minutes speaking</span></div>
        <div className="kpi"><b>{convo.length}</b><span>conversations</span></div>
        <div className="kpi"><b>{words.toLocaleString()}</b><span>words spoken</span></div>
        <div className="kpi"><b>{saved}</b><span>phrases saved</span></div>
        <div className="kpi"><b>{recalled}</b><span>recalled in review</span></div>
        <div className="kpi"><b>{pron}</b><span>pronunciation attempts</span></div>
      </div>

      {insights.length > 0 && (
        <section className="stack" style={{ ['--gap' as any]: '8px', marginBottom: 16 }} aria-label="Insights">
          {insights.map((t) => <div key={t} className="insight"><Icon name="sparkle" /><span>{t}</span></div>)}
        </section>
      )}

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <section className="panel">
          <h3 style={{ fontSize: 'var(--step-1)' }}>Speaking time per day</h3>
          <BarChart points={perDay} label="Minutes speaking per day" format={(v) => `${v}`} />
          <p className="small muted" style={{ marginBottom: 0 }}>Minutes. Regular short sessions tend to help more than occasional long ones.</p>
        </section>
        <section className="panel">
          <h3 style={{ fontSize: 'var(--step-1)' }}>Filler words per minute</h3>
          {fpm.length >= 2 ? <LineChart points={fpm} yLabel="Fillers per minute" /> : <p className="muted">Complete two or more speaking practice sessions to see a trend.</p>}
          <p className="small muted" style={{ marginBottom: 0 }}>From Speaking Practice. Fewer fillers usually sounds more confident — but a few are completely normal.</p>
        </section>
        <section className="panel">
          <h3 style={{ fontSize: 'var(--step-1)' }}>Speaking rate</h3>
          {wpm.length >= 2 ? <LineChart points={wpm} yLabel="Words per minute" /> : <p className="muted">Complete two or more speaking practice sessions to see a trend.</p>}
          <p className="small muted" style={{ marginBottom: 0 }}>Words per minute. Faster isn’t better — this is about finding a pace that’s comfortable to follow (often 120–160).</p>
        </section>
        <section className="panel">
          <h3 style={{ fontSize: 'var(--step-1)' }}>Things you’re working on</h3>
          {Object.values(s.errorPatterns).length ? (
            <table className="table">
              <thead><tr><th>Pattern</th><th>Times</th><th>Example</th></tr></thead>
              <tbody>{Object.values(s.errorPatterns).sort((a, b) => b.count - a.count).slice(0, 6).map((e) => <tr key={e.key}><td>{ruleLabel(e.key)}</td><td>{e.count}</td><td className="muted">“{e.example}”</td></tr>)}</tbody>
            </table>
          ) : <p className="muted">Recurring mistakes from your conversations will appear here. You can edit or delete them in Settings.</p>}
          <p className="small muted" style={{ marginBottom: 0 }}>We don’t show a pronunciation accuracy score, because the demo can’t measure pronunciation at the sound level.</p>
        </section>
      </div>

      <section className="panel">
        <h3 style={{ fontSize: 'var(--step-1)' }}>Session history</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Date</th><th>Activity</th><th>Length</th><th>Words</th><th>Notes</th></tr></thead>
            <tbody>
              {[...sessions].reverse().slice(0, 15).map((x) => (
                <tr key={x.id}><td>{new Date(x.startedAt).toLocaleDateString()}</td><td>{x.title}{x.sample ? <span className="tag" style={{ marginLeft: 6 }}>Sample</span> : null}</td><td>{Math.max(1, Math.round(x.durationSec / 60))} min</td><td>{x.words || '—'}</td><td className="muted">{x.wpm ? `${x.wpm} wpm · ` : ''}{x.summary ?? ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sessions.length && <p className="muted">No sessions in this period.</p>}
      </section>
      {!hasSample && <p className="small muted" style={{ marginTop: 12 }}><button className="btn ghost sm" onClick={loadSample}>Add sample data to preview charts</button></p>}
    </>
  );
}
