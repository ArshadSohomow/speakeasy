import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Icon } from './Icon';
import { speak, stopSpeaking, loadVoices, SPEED_RATE } from '../lib/speech';
import { getMascot, getDialect } from '../lib/catalog';
import { getState } from '../lib/store';

/* ------------------------------- Toasts ------------------------------- */
interface ToastItem { id: number; text: string; kind?: 'error' | 'info'; action?: { label: string; run: () => void } }
let toasts: ToastItem[] = []; let tid = 0; const tl = new Set<() => void>();
export function toast(text: string, opts: { kind?: 'error' | 'info'; action?: ToastItem['action']; ms?: number } = {}) {
  const t = { id: ++tid, text, kind: opts.kind, action: opts.action };
  toasts = [...toasts, t]; tl.forEach((l) => l());
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); tl.forEach((l) => l()); }, opts.ms ?? (opts.action ? 6500 : 3500));
}
export function Toasts() {
  const items = useSyncExternalStore((l) => { tl.add(l); return () => tl.delete(l); }, () => toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>
          <span>{t.text}</span>
          {t.action && <button onClick={() => { t.action!.run(); toasts = toasts.filter((x) => x.id !== t.id); tl.forEach((l) => l()); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Dialog ------------------------------- */
export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current; el?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref}>
        <div className="spread" style={{ marginBottom: 8 }}>
          <h2 id="dlg-title" style={{ margin: 0 }}>{title}</h2>
          <button className="btn ghost icon-only sm" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="stack">{children}</div>
        {footer && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: string; confirmLabel: string }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></>}>
      <p>{body}</p>
    </Dialog>
  );
}

/* ----------------------------- Audio button ----------------------------- */
let currentSpeaker: (() => void) | null = null;
const warnedNoVoice = new Set<string>();
/** Speak text in a given dialect with the profile's speed. Returns speaking state. */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { if (speaking) stopSpeaking(); }, []); // eslint-disable-line
  const say = async (text: string, dialectId: string, o: { slow?: boolean; mascot?: string; onEnd?: () => void; onBoundary?: (i: number) => void } = {}) => {
    await loadVoices();
    currentSpeaker?.();
    const { dialect } = getDialect(dialectId);
    const p = getState().profile;
    const m = o.mascot ? getMascot(o.mascot) : null;
    const rate = (o.slow ? SPEED_RATE.slow : SPEED_RATE[p.speed]) * (m ? m.voice.rate : 1);
    const res = speak(text, dialect.voiceLangs.length ? dialect.voiceLangs : [dialectId], {
      rate: Math.max(0.5, Math.min(1.4, rate)), pitch: m?.voice.pitch ?? 1,
      onStart: () => setSpeaking(true),
      onEnd: () => { setSpeaking(false); o.onEnd?.(); },
      onError: (msg) => { setSpeaking(false); if (!msg.includes('voice installed') || !warnedNoVoice.has(dialectId)) { warnedNoVoice.add(dialectId); toast(msg, { kind: 'error', ms: 6000 }); } o.onEnd?.(); },
      onBoundary: o.onBoundary,
    });
    if (res.ok) currentSpeaker = () => setSpeaking(false);
    return res;
  };
  const stop = () => { stopSpeaking(); setSpeaking(false); };
  return { speaking, say, stop };
}

export function SpeakButton({ text, dialect, slow, label, mascot, size = 'sm', variant = '' }: { text: string; dialect: string; slow?: boolean; label?: string; mascot?: string; size?: 'sm' | ''; variant?: string }) {
  const { speaking, say, stop } = useSpeaker();
  return (
    <button className={`btn ${size} ${variant}`} onClick={() => (speaking ? stop() : say(text, dialect, { slow, mascot }))} aria-label={`${speaking ? 'Stop' : 'Play'} ${label ?? 'audio'}${slow ? ' slowly' : ''}`}>
      <Icon name={speaking ? 'stop' : slow ? 'slow' : 'volume'} size={18} />
      {label !== undefined ? <span>{speaking ? 'Stop' : label}</span> : null}
    </button>
  );
}

/* ------------------------------ Misc ------------------------------ */
export function DemoNote({ children }: { children: ReactNode }) {
  return <div className="demo-banner" role="note"><Icon name="info" size={18} /><div>{children}</div></div>;
}

export function Wordmark({ to = '/' }: { to?: string }) {
  return (
    <a className="wordmark" href={to} onClick={(e) => { e.preventDefault(); import('../lib/router').then((r) => r.navigate(to)); }}>
      <svg className="mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M12 8h40a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H30l-12 10v-10h-6a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8z" fill="var(--primary)" /><circle cx="23" cy="28" r="4" fill="var(--bg)" /><circle cx="32" cy="28" r="4" fill="#FFB7A8" /><circle cx="41" cy="28" r="4" fill="#BFE9D5" /></svg>
      Speakeasy
    </a>
  );
}

export function LineChart({ points, height = 160, yLabel, format = (v: number) => String(v) }: { points: { x: string; y: number }[]; height?: number; yLabel?: string; format?: (v: number) => string }) {
  const W = 560, H = height, pl = 36, pr = 10, pt = 10, pb = 24;
  if (!points.length) return null;
  const max = Math.max(1, ...points.map((p) => p.y)) * 1.15;
  const x = (i: number) => pl + (points.length === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (points.length - 1));
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.y)}`).join(' ');
  const ticks = [0, max / 2, max];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel ?? 'Trend'}: ${points.map((p) => `${p.x} ${format(p.y)}`).join(', ')}`}>
      {ticks.map((t, i) => <g key={i}><line className="gridline" x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} /><text x={pl - 6} y={y(t) + 4} textAnchor="end">{format(Math.round(t))}</text></g>)}
      <path className="line" d={d} />
      {points.map((p, i) => <circle key={i} className="dot" cx={x(i)} cy={y(p.y)} r={3.5}><title>{`${p.x}: ${format(p.y)}`}</title></circle>)}
      {points.map((p, i) => (points.length <= 8 || i % Math.ceil(points.length / 7) === 0) && <text key={'t' + i} x={x(i)} y={H - 6} textAnchor="middle">{p.x}</text>)}
    </svg>
  );
}

export function BarChart({ points, height = 160, format = (v: number) => String(v), label }: { points: { x: string; y: number }[]; height?: number; format?: (v: number) => string; label: string }) {
  const W = 560, H = height, pl = 36, pr = 10, pt = 10, pb = 24;
  const max = Math.max(1, ...points.map((p) => p.y)) * 1.15;
  const bw = (W - pl - pr) / Math.max(1, points.length);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${points.map((p) => `${p.x} ${format(p.y)}`).join(', ')}`}>
      {[0, max / 2, max].map((t, i) => <g key={i}><line className="gridline" x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} /><text x={pl - 6} y={y(t) + 4} textAnchor="end">{format(Math.round(t))}</text></g>)}
      {points.map((p, i) => <rect key={i} className="bar" x={pl + i * bw + bw * 0.18} width={bw * 0.64} y={y(p.y)} height={Math.max(0, H - pb - y(p.y))} rx={4}><title>{`${p.x}: ${format(p.y)}`}</title></rect>)}
      {points.map((p, i) => (points.length <= 10 || i % Math.ceil(points.length / 8) === 0) && <text key={'t' + i} x={pl + i * bw + bw / 2} y={H - 6} textAnchor="middle">{p.x}</text>)}
    </svg>
  );
}

export function useInterval(fn: () => void, ms: number | null) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => { if (ms === null) return; const id = setInterval(() => ref.current(), ms); return () => clearInterval(id); }, [ms]);
}

export function download(filename: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Couldn’t copy automatically. Select the text and copy it manually.', { kind: 'error' }); }
}
