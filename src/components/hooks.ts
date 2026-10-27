import { useEffect, useRef, useState } from 'react';
import { getRecognitionProvider, type RecErrorCode, type RecognitionSession } from '../lib/speech';
import { setState } from '../lib/store';

export type MicUiState = 'ready' | 'listening' | 'processing' | 'speaking' | 'paused' | 'error';

/** Wraps the recognition provider with React state. Final segments are delivered in order, once. */
export function useRecognizer(opts: { lang: string; continuous?: boolean; onFinal: (text: string, at: number) => void; onSpeechStart?: () => void }) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<{ code: RecErrorCode; message: string } | null>(null);
  const session = useRef<RecognitionSession | null>(null);
  const onFinalRef = useRef(opts.onFinal); onFinalRef.current = opts.onFinal;
  const onStartRef = useRef(opts.onSpeechStart); onStartRef.current = opts.onSpeechStart;

  const start = () => {
    setError(null);
    const p = getRecognitionProvider();
    if (!p.supported()) { setError({ code: 'unsupported', message: 'Speech recognition isn’t available in this browser. Chrome, Edge and Safari support it — or you can type instead.' }); return false; }
    session.current?.abort();
    session.current = p.start(opts.lang, {
      onPartial: setPartial,
      onFinal: (t, at) => { setPartial(''); onFinalRef.current(t, at); },
      onState: (s) => { setListening(s === 'listening' || s === 'starting'); if (s === 'listening') setState({ micState: 'granted' }); },
      onError: (code, message) => {
        setError({ code, message }); setListening(false);
        if (code === 'not-allowed') setState({ micState: 'denied' });
        if (code === 'audio-capture') setState({ micState: 'unavailable' });
      },
      onSpeechStart: () => onStartRef.current?.(),
    }, { continuous: opts.continuous ?? true });
    setListening(true);
    return true;
  };
  const stop = () => { session.current?.stop(); session.current = null; setListening(false); setPartial(''); };
  useEffect(() => () => session.current?.abort(), []);
  // Browser tab suspension: stop listening when hidden so we never record in the background.
  useEffect(() => {
    const onVis = () => { if (document.hidden && session.current) { stop(); setError({ code: 'aborted', message: 'Listening paused because the tab was hidden. Tap the mic to carry on.' }); } };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  return { listening, partial, error, start, stop, clearError: () => setError(null) };
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
