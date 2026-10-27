import { useState } from 'react';
import { useStore } from '../lib/store';
import { getMascot, getDialect, EXPRESSIONS, type Expression } from '../lib/catalog';
import { DAILY_WORDS, PRON_ITEMS, pickDaily, itemsFor } from '../lib/content';
import { Mascot } from '../components/Mascot';
import { Icon, type IconName } from '../components/Icon';
import { Link, navigate } from '../lib/router';
import { SpeakButton } from '../components/ui';
import { ExpressionDialog } from '../components/Expression';
import { isDue } from '../lib/srs';

const QUICK: { id: string; to: string; label: string; sub: string; icon: IconName; goals: string[] }[] = [
  { id: 'free', to: '/app/conversation?scenario=free', label: 'Free conversation', sub: 'Talk about anything', icon: 'chat', goals: ['everyday', 'listening', 'slang'] },
  { id: 'five', to: '/app/speaking?mode=one-minute&quick=1', label: '5-minute practice', sub: 'One short speaking drill', icon: 'speak', goals: ['fillers'] },
  { id: 'pron', to: '/app/pronunciation', label: 'Pronunciation', sub: 'Hear it, say it, compare', icon: 'pron', goals: ['pronunciation'] },
  { id: 'small', to: '/app/conversation?scenario=colleagues', label: 'Small talk', sub: 'Monday morning chat', icon: 'chat', goals: ['smalltalk', 'work'] },
  { id: 'public', to: '/app/speaking?mode=impromptu', label: 'Public speaking', sub: 'Two-minute talk', icon: 'speak', goals: ['public', 'interviews'] },
  { id: 'dictate', to: '/app/studio', label: 'Voice dictation', sub: 'Speak, get clean text', icon: 'studio', goals: ['dictation'] },
  { id: 'vocab', to: '/app/daily', label: 'Daily vocabulary', sub: 'Today’s expression', icon: 'daily', goals: ['vocab', 'slang'] },
];

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  return `${part}${name ? ', ' + name : ''}!`;
}

export function Home() {
  const s = useStore((x) => x);
  const p = s.profile;
  const m = getMascot(p.mascot);
  const { language, dialect } = getDialect(p.dialect);
  const [expr, setExpr] = useState<Expression | null>(null);
  const exprs = EXPRESSIONS.filter((e) => e.lang === p.targetLang);
  const expression = exprs.length ? pickDaily(exprs, 3) : pickDaily(EXPRESSIONS.filter((e) => e.lang === 'en'), 3);
  const word = pickDaily(itemsFor(DAILY_WORDS, p.targetLang));
  const pron = pickDaily(itemsFor(PRON_ITEMS, p.targetLang), 1);
  const due = s.vocab.filter((v) => isDue(v)).length;
  const week = s.sessions.filter((x) => !x.sample && x.startedAt > Date.now() - 7 * 86400000);
  const minutes = Math.round(week.reduce((a, b) => a + b.durationSec, 0) / 60);
  const lastConvo = [...s.sessions].reverse().find((x) => x.kind === 'conversation' && !x.sample);
  const last = [...s.sessions].reverse().find((x) => !x.sample);
  const quick = [...QUICK].sort((a, b) => Number(b.goals.some((g) => p.goals.includes(g))) - Number(a.goals.some((g) => p.goals.includes(g))));
  const line = p.goals.includes('work') ? 'Want to warm up for the week with a bit of work small talk?'
    : p.goals.includes('travel') ? 'Fancy practising something you’d say on a trip?'
    : p.goals.includes('public') ? 'Got two minutes for a quick speaking drill?'
    : lastConvo ? `Last time we talked for ${Math.max(1, Math.round(lastConvo.durationSec / 60)) === 1 ? 'about a minute' : Math.round(lastConvo.durationSec / 60) + ' minutes'}. Shall we pick up again?`
    : 'No pressure — want to have a quick chat?';

  return (
    <>
      <section className="dash-hero" aria-label="Your coach">
        <Mascot id={m.id} size={120} mood="happy" className="bob" />
        <div className="stack" style={{ ['--gap' as any]: '14px' }}>
          <div className="bubble tail-left" style={{ fontSize: 'var(--step-1)' }}><strong>{greeting(p.name)}</strong> {line}</div>
          <div className="row">
            <button className="btn primary" onClick={() => navigate('/app/conversation')}><Icon name="mic" size={18} />{lastConvo ? 'Continue conversation' : 'Start a conversation'}</button>
            <button className="btn" onClick={() => navigate('/app/speaking?mode=one-minute&quick=1')}><Icon name="speak" size={18} />Start a quick practice</button>
          </div>
        </div>
      </section>

      <h2 className="sr-only">Quick start</h2>
      <div className="quick" style={{ marginBottom: 18 }}>
        {quick.map((q) => <Link key={q.id} to={q.to}><Icon name={q.icon} /><strong>{q.label}</strong><span className="small">{q.sub}</span></Link>)}
      </div>

      <div className="grid-3" style={{ marginBottom: 18 }}>
        <section className="panel tint-yellow stack" style={{ ['--gap' as any]: '8px' }} aria-labelledby="dc-h">
          <h3 id="dc-h" style={{ fontSize: 'var(--step-1)' }}>Today’s challenge</h3>
          <div className="big-word" style={{ fontSize: 'var(--step-3)' }} lang={word.dialect}>{word.text}</div>
          <p style={{ margin: 0 }}>{word.challenge}</p>
          <div className="row"><Link className="btn sm" to="/app/daily">Try it</Link><SpeakButton text={word.text} dialect={word.dialect} label="Hear" /></div>
        </section>
        <section className="panel stack" style={{ ['--gap' as any]: '8px' }} aria-labelledby="ex-h">
          <h3 id="ex-h" style={{ fontSize: 'var(--step-1)' }}>Expression of the day</h3>
          <div className="big-word" style={{ fontSize: 'var(--step-3)' }} lang={expression.dialect}>{expression.natural}</div>
          <p className="muted" style={{ margin: 0 }}>{expression.meaning}</p>
          <div className="row"><button className="btn sm" onClick={() => setExpr(expression)}>How people use it</button><SpeakButton text={expression.natural} dialect={expression.dialect} label="Hear" /></div>
        </section>
        <section className="panel stack" style={{ ['--gap' as any]: '8px' }} aria-labelledby="pr-h">
          <h3 id="pr-h" style={{ fontSize: 'var(--step-1)' }}>Pronunciation challenge</h3>
          <div className="big-word" style={{ fontSize: 'var(--step-3)' }} lang={pron.dialect ?? 'en-GB'}>{pron.text}</div>
          <p className="muted" style={{ margin: 0 }}>{pron.stress}</p>
          <div className="row"><Link className="btn sm" to={`/app/pronunciation?item=${encodeURIComponent(pron.text)}`}>Practise</Link><SpeakButton text={pron.text} dialect={pron.dialect ?? p.dialect} label="Hear" /></div>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel stack" aria-labelledby="ps-h">
          <div className="spread"><h3 id="ps-h" style={{ fontSize: 'var(--step-1)', margin: 0 }}>This week</h3><Link to="/app/progress" className="small">See progress</Link></div>
          <div className="kpis">
            <div className="kpi"><b>{minutes}</b><span>minutes speaking</span></div>
            <div className="kpi"><b>{week.filter((x) => x.kind === 'conversation').length}</b><span>conversations</span></div>
            <div className="kpi"><b>{s.vocab.filter((v) => !v.sample && v.addedAt > Date.now() - 7 * 86400000).length}</b><span>phrases saved</span></div>
          </div>
          {!week.length && <p className="muted small" style={{ margin: 0 }}>Nothing yet this week — your first conversation will show up here.</p>}
        </section>
        <section className="panel stack" aria-labelledby="rv-h">
          <h3 id="rv-h" style={{ fontSize: 'var(--step-1)', margin: 0 }}>Review and recent</h3>
          <div className="spread">
            <span>{due ? <><strong>{due}</strong> {due === 1 ? 'phrase is' : 'phrases are'} due for review</> : s.vocab.length ? 'No phrases due right now.' : 'Save phrases from conversations to review them here.'}</span>
            {due > 0 && <Link className="btn sm primary" to="/app/vocabulary?review=1">Review now</Link>}
          </div>
          <hr className="divider" style={{ margin: '4px 0' }} />
          {last ? (
            <div>
              <div className="small muted">{new Date(last.startedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
              <strong>{last.title}</strong>
              <p className="small" style={{ margin: '4px 0 0' }}>{last.summary ?? `${Math.max(1, Math.round(last.durationSec / 60))} min · ${last.words} words`}</p>
            </div>
          ) : <p className="muted small" style={{ margin: 0 }}>Your most recent session will appear here.</p>}
        </section>
      </div>
      <p className="small muted" style={{ marginTop: 18 }}>Practising {language.name} ({dialect.label}) with {m.name}. <Link to="/app/settings">Change</Link></p>
      <ExpressionDialog expr={expr} open={!!expr} onClose={() => setExpr(null)} />
    </>
  );
}
