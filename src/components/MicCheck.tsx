import { useEffect, useRef, useState } from 'react';
import { startMicMeter, micPermission, recognitionSupported, type MicMeter } from '../lib/speech';
import { useRecognizer } from './hooks';
import { setState, useStore } from '../lib/store';
import { getDialect } from '../lib/catalog';
import { Icon } from './Icon';

type Phase = 'idle' | 'asking' | 'live' | 'denied' | 'unavailable' | 'done';

export function MicCheck({ onTextOnly }: { onTextOnly?: () => void }) {
  const profile = useStore((s) => s.profile);
  const textOnly = useStore((s) => s.textOnly);
  const [phase, setPhase] = useState<Phase>('idle');
  const [perm, setPerm] = useState<string>('unknown');
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState('');
  const meter = useRef<MicMeter | null>(null);
  const { dialect } = getDialect(profile.dialect);
  const testPhrase = profile.targetLang === 'en' ? 'I’d like a coffee, please.' : dialect.greeting.natural.split(/[?？]/)[0] + '?';
  const rec = useRecognizer({ lang: dialect.recognitionLang, continuous: false, onFinal: (t) => { setHeard(t); setPhase('done'); } });

  useEffect(() => { micPermission().then(setPerm); return () => meter.current?.stop(); }, []);

  const begin = async () => {
    setPhase('asking');
    try {
      meter.current = await startMicMeter(setLevel);
      setState({ micState: 'granted', textOnly: false }); setPerm('granted'); setPhase('live');
      if (recognitionSupported()) rec.start();
    } catch (e: any) {
      if (e?.code === 'unavailable' || e?.name === 'NotFoundError') { setPhase('unavailable'); setState({ micState: 'unavailable' }); }
      else { setPhase('denied'); setPerm('denied'); setState({ micState: 'denied' }); }
    }
  };
  const end = () => { meter.current?.stop(); meter.current = null; rec.stop(); setLevel(0); if (phase === 'live') setPhase('done'); };

  return (
    <div className="stack" style={{ ['--gap' as any]: '14px' }}>
      <p className="muted" style={{ margin: 0 }}>
        We’ll only ask for your microphone when you press the button. Speech is processed live to show your transcript.
        In this demo, recognition is handled by your browser{navigator.userAgent.includes('Chrome') ? ' (Chrome sends audio to Google’s speech service)' : ''}; nothing is recorded or stored by Speakeasy.
      </p>
      <div className="row small">
        <span className="tag">{perm === 'granted' ? 'Permission: allowed' : perm === 'denied' ? 'Permission: blocked' : perm === 'prompt' ? 'Permission: not asked yet' : 'Permission: unknown'}</span>
        <span className="tag">{recognitionSupported() ? 'Speech recognition: available' : 'Speech recognition: not available in this browser'}</span>
      </div>

      {phase === 'idle' && <button className="btn primary" onClick={begin}><Icon name="mic" /> Test my microphone</button>}
      {phase === 'asking' && <p role="status">Waiting for you to allow microphone access in your browser…</p>}
      {(phase === 'live' || phase === 'done') && (
        <div className="panel stack">
          <div className="label">Input level</div>
          <div className="meter" role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}><div style={{ width: `${Math.round(level * 100)}%` }} /></div>
          <div>Say: <strong lang={profile.dialect}>“{testPhrase}”</strong></div>
          {rec.listening && <p className="muted" role="status">{rec.partial || 'Listening…'}</p>}
          {heard && <p role="status" className="tag good" style={{ display: 'inline-flex', padding: '6px 12px' }}><Icon name="check" size={16} /> We heard: “{heard}”</p>}
          {phase === 'done' && !heard && level === 0 && <p className="muted">Microphone works. {recognitionSupported() ? 'We didn’t catch any words — try again a little closer to the mic.' : 'Your browser can’t transcribe speech, so you’ll type replies instead.'}</p>}
          {rec.error && rec.error.code !== 'no-speech' && <p className="tag improve" style={{ display: 'inline-flex', padding: '6px 12px' }}>{rec.error.message}</p>}
          <div className="row">
            {phase === 'live' ? <button className="btn" onClick={end}><Icon name="stop" />Stop test</button> : <button className="btn" onClick={() => { setHeard(''); begin(); }}><Icon name="refresh" />Test again</button>}
          </div>
        </div>
      )}
      {phase === 'denied' && (
        <div className="panel tint-coral stack">
          <strong>Microphone access is blocked.</strong>
          <span>To allow it, click the lock or settings icon in your browser’s address bar, set Microphone to “Allow”, then test again. You can also continue with typing only.</span>
          <div className="row"><button className="btn" onClick={begin}>Try again</button><button className="btn" onClick={() => { setState({ textOnly: true }); onTextOnly?.(); }}><Icon name="keyboard" />Use text only</button></div>
        </div>
      )}
      {phase === 'unavailable' && (
        <div className="panel tint-coral stack">
          <strong>We couldn’t find a microphone.</strong>
          <span>Plug in a headset or check your system settings. Meanwhile, you can practise by typing.</span>
          <div className="row"><button className="btn" onClick={begin}>Try again</button><button className="btn" onClick={() => { setState({ textOnly: true }); onTextOnly?.(); }}><Icon name="keyboard" />Use text only</button></div>
        </div>
      )}
      {textOnly && <p className="small muted">Text-only mode is on. You can switch it off in Settings.</p>}
    </div>
  );
}
