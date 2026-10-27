import { useEffect, type ReactElement } from 'react';
import { useLocation, navigate } from './lib/router';
import { useStore } from './lib/store';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { Shell } from './pages/Shell';
import { Home } from './pages/Home';
import { Conversation } from './pages/Conversation';
import { Studio } from './pages/Studio';
import { Pronunciation } from './pages/Pronunciation';
import { Speaking } from './pages/Speaking';
import { Vocabulary } from './pages/Vocabulary';
import { Daily } from './pages/Daily';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';
import { Privacy, About } from './pages/Info';
import { Toasts } from './components/ui';
import { loadVoices } from './lib/speech';

const TITLES: Record<string, string> = {
  '/app': 'Home', '/app/conversation': 'Conversation Coach', '/app/studio': 'Voice Studio', '/app/pronunciation': 'Pronunciation',
  '/app/speaking': 'Speaking Practice', '/app/vocabulary': 'Vocabulary', '/app/daily': 'Daily Challenge', '/app/progress': 'Progress', '/app/settings': 'Settings',
  '/start': 'Get started', '/privacy': 'Privacy', '/about': 'What’s real in this demo',
};

export function App() {
  const { pathname } = useLocation();
  const onboarded = useStore((s) => s.onboarded);
  const reduceMotion = useStore((s) => s.profile.reduceMotion);

  useEffect(() => { loadVoices(); }, []);
  useEffect(() => { if (reduceMotion) document.documentElement.setAttribute('data-motion', 'reduce'); }, [reduceMotion]);
  useEffect(() => {
    document.title = TITLES[pathname] ? `${TITLES[pathname]} · Speakeasy` : 'Speakeasy — speak like a local';
    // Move focus to main content on route change for screen-reader users
    const main = document.getElementById('main');
    if (main && pathname !== '/') { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
  }, [pathname]);

  const isApp = pathname.startsWith('/app');
  useEffect(() => { if (isApp && !onboarded) navigate('/start', { replace: true }); }, [isApp, onboarded]);

  let page: ReactElement;
  if (pathname === '/start') page = <Onboarding />;
  else if (pathname === '/privacy') page = <Privacy />;
  else if (pathname === '/about') page = <About />;
  else if (isApp) {
    const inner = ({
      '/app': <Home />, '/app/conversation': <Conversation />, '/app/studio': <Studio />, '/app/pronunciation': <Pronunciation />,
      '/app/speaking': <Speaking />, '/app/vocabulary': <Vocabulary />, '/app/daily': <Daily />, '/app/progress': <Progress />, '/app/settings': <Settings />,
    } as Record<string, ReactElement>)[pathname.replace(/\/$/, '')] ?? <NotFound />;
    page = <Shell>{inner}</Shell>;
  } else if (pathname === '/' || pathname === '') page = <Landing />;
  else page = <NotFound standalone />;

  return <>{page}<Toasts /></>;
}

function NotFound({ standalone }: { standalone?: boolean }) {
  return (
    <div className="empty" style={{ minHeight: standalone ? '80vh' : undefined }}>
      <h1>We couldn’t find that page</h1>
      <p>The link may be out of date.</p>
      <button className="btn primary" onClick={() => navigate('/app')}>Go to Home</button>
    </div>
  );
}
