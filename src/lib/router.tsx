import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') window.addEventListener('popstate', notify);

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search) return;
  if (opts.replace) history.replaceState(null, '', to); else history.pushState(null, '', to);
  notify();
  if (!to.includes('#')) window.scrollTo({ top: 0 });
}

export function useLocation() {
  const path = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => location.pathname + location.search,
    () => '/',
  );
  const [pathname, search = ''] = path.split('?');
  return { pathname, query: new URLSearchParams(search) };
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={to}
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (to.startsWith('#')) return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}
