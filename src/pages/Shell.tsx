import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { Wordmark, Dialog } from '../components/ui';
import { Link, useLocation } from '../lib/router';
import { useStore } from '../lib/store';
import { getMascot, getDialect } from '../lib/catalog';
import { useOnline } from '../components/hooks';

export const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/app', label: 'Home', icon: 'home' },
  { to: '/app/conversation', label: 'Conversation Coach', icon: 'chat' },
  { to: '/app/studio', label: 'Voice Studio', icon: 'studio' },
  { to: '/app/pronunciation', label: 'Pronunciation', icon: 'pron' },
  { to: '/app/speaking', label: 'Speaking Practice', icon: 'speak' },
  { to: '/app/vocabulary', label: 'Vocabulary', icon: 'vocab' },
  { to: '/app/daily', label: 'Daily Challenge', icon: 'daily' },
  { to: '/app/progress', label: 'Progress', icon: 'progress' },
  { to: '/app/settings', label: 'Settings', icon: 'settings' },
];
const MOBILE = ['/app', '/app/conversation', '/app/studio', '/app/daily'];

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const p = useStore((s) => s.profile);
  const online = useOnline();
  const [more, setMore] = useState(false);
  const m = getMascot(p.mascot);
  const { language, dialect } = getDialect(p.dialect);
  const current = (to: string) => (to === '/app' ? pathname === '/app' : pathname.startsWith(to));
  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="sidebar" aria-label="Main navigation">
        <Wordmark to="/" />
        <nav>
          {NAV.map((n) => <Link key={n.to} to={n.to} className="nav-link" aria-current={current(n.to) ? 'page' : undefined}><Icon name={n.icon} />{n.label}</Link>)}
        </nav>
        <Link to="/app/settings" className="me" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Mascot id={m.id} size={38} />
          <div style={{ lineHeight: 1.3 }}><strong>{p.name || 'Guest'}</strong><br /><span className="muted">{language.name} · {dialect.label}</span></div>
        </Link>
      </aside>
      <div style={{ minWidth: 0 }}>
        <main className="main" id="main">
          <div className="mobile-top"><Wordmark to="/" /><Link to="/app/settings" aria-label="Settings"><Mascot id={m.id} size={36} /></Link></div>
          {!online && <div className="demo-banner" role="alert"><Icon name="info" size={18} /><div>You’re offline. Practice that runs in your browser still works; anything needing the internet (like speech recognition in Chrome) will pause until you’re back.</div></div>}
          {children}
        </main>
      </div>
      <nav className="mobile-bar" aria-label="Main navigation">
        {NAV.filter((n) => MOBILE.includes(n.to)).map((n) => (
          <Link key={n.to} to={n.to} aria-current={current(n.to) ? 'page' : undefined}><Icon name={n.icon} size={22} />{n.label.split(' ')[0] === 'Conversation' ? 'Coach' : n.label.split(' ').pop() === 'Studio' ? 'Studio' : n.label.split(' ')[0]}</Link>
        ))}
        <button onClick={() => setMore(true)} aria-haspopup="dialog"><Icon name="menu" size={22} />More</button>
      </nav>
      <Dialog open={more} onClose={() => setMore(false)} title="More">
        <div style={{ display: 'grid', gap: 4 }}>
          {NAV.filter((n) => !MOBILE.includes(n.to)).map((n) => <Link key={n.to} to={n.to} className="nav-link" onClick={() => setMore(false)} aria-current={current(n.to) ? 'page' : undefined}><Icon name={n.icon} />{n.label}</Link>)}
        </div>
      </Dialog>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
