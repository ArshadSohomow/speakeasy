/**
 * Speech adapters.
 *
 * Demo/default provider: the browser's Web Speech API (SpeechRecognition +
 * speechSynthesis). In Chrome/Edge, recognition audio is processed by the
 * browser vendor's service; in Safari it may run on-device. We say so in the UI.
 *
 * Production: implement `RecognitionProvider` against a streaming STT service
 * (e.g. via a WebSocket to a Worker that holds the provider key) and swap it in
 * with `setRecognitionProvider()`. The UI only talks to this interface.
 */

export type RecState = 'idle' | 'starting' | 'listening' | 'stopped' | 'error';
export interface RecResult { text: string; final: boolean; at: number }
export interface RecHandlers {
  onPartial?: (text: string) => void;
  onFinal?: (text: string, at: number) => void;
  onState?: (s: RecState) => void;
  onError?: (code: RecErrorCode, message: string) => void;
  onSpeechStart?: () => void;
}
export type RecErrorCode = 'unsupported' | 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' | 'aborted' | 'language-not-supported' | 'unknown';

export interface RecognitionSession { stop(): void; abort(): void; pause(): void; resume(): void; readonly active: boolean }
export interface RecognitionProvider {
  id: string; label: string; supported(): boolean;
  start(lang: string, h: RecHandlers, opts?: { continuous?: boolean }): RecognitionSession;
}

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

export const ERROR_TEXT: Record<RecErrorCode, string> = {
  unsupported: 'Speech recognition isn’t available in this browser. Chrome, Edge and Safari support it. You can type instead.',
  'not-allowed': 'Microphone access is blocked. Allow it in your browser’s site settings, or carry on by typing.',
  'no-speech': 'We didn’t hear anything. Check your microphone is on and try again.',
  'audio-capture': 'No microphone was found. Plug one in or switch to typing.',
  network: 'Speech recognition lost its connection. Your transcript is safe — tap the mic to try again.',
  aborted: 'Listening stopped.',
  'language-not-supported': 'Your browser can’t recognise this language or region. Try another region or type instead.',
  unknown: 'Something went wrong with speech recognition. Your transcript is safe — try again.',
};

export const webSpeechProvider: RecognitionProvider = {
  id: 'web-speech', label: 'Browser speech recognition (demo)',
  supported: () => !!SR,
  start(lang, h, opts = {}) {
    if (!SR) { h.onError?.('unsupported', ERROR_TEXT.unsupported); h.onState?.('error'); return { stop() {}, abort() {}, pause() {}, resume() {}, active: false }; }
    let rec: any = null;
    let wanted = true; let paused = false; let active = false; let restarts = 0;
    const seen = new Set<string>();

    const make = () => {
      rec = new SR();
      rec.lang = lang; rec.interimResults = true; rec.continuous = opts.continuous ?? true; rec.maxAlternatives = 1;
      rec.onstart = () => { active = true; h.onState?.('listening'); };
      rec.onspeechstart = () => h.onSpeechStart?.();
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0].transcript.trim();
          if (r.isFinal) {
            const key = `${i}:${text}:${restarts}`; // avoid duplicate segments on Android re-delivery
            if (text && !seen.has(key)) { seen.add(key); h.onFinal?.(text, Date.now()); }
          } else interim += r[0].transcript;
        }
        h.onPartial?.(interim.trim());
      };
      rec.onerror = (e: any) => {
        const code: RecErrorCode = (['not-allowed', 'service-not-allowed'].includes(e.error) ? 'not-allowed'
          : e.error === 'no-speech' ? 'no-speech' : e.error === 'audio-capture' ? 'audio-capture' : e.error === 'network' ? 'network'
          : e.error === 'aborted' ? 'aborted' : e.error === 'language-not-supported' ? 'language-not-supported' : 'unknown') as RecErrorCode;
        if (code === 'no-speech' && wanted && opts.continuous !== false) return; // keep listening quietly
        if (code === 'aborted') return;
        if (code === 'not-allowed' || code === 'audio-capture' || code === 'language-not-supported') wanted = false;
        h.onError?.(code, ERROR_TEXT[code]);
      };
      rec.onend = () => {
        active = false;
        // Chrome ends sessions after silence; restart while the user still wants to listen.
        if (wanted && !paused && opts.continuous !== false && restarts < 200) {
          restarts++;
          try { make(); rec.start(); return; } catch { /* fall through */ }
        }
        h.onPartial?.('');
        h.onState?.(paused ? 'stopped' : 'stopped');
      };
    };
    make();
    h.onState?.('starting');
    try { rec.start(); } catch (err) { h.onError?.('unknown', ERROR_TEXT.unknown); }
    return {
      stop() { wanted = false; try { rec.stop(); } catch { /* */ } },
      abort() { wanted = false; try { rec.abort(); } catch { /* */ } },
      pause() { paused = true; wanted = false; try { rec.stop(); } catch { /* */ } },
      resume() { paused = false; wanted = true; try { make(); rec.start(); } catch { /* */ } },
      get active() { return active; },
    };
  },
};

let provider: RecognitionProvider = webSpeechProvider;
export const getRecognitionProvider = () => provider;
export const setRecognitionProvider = (p: RecognitionProvider) => { provider = p; };
export const recognitionSupported = () => provider.supported();

/* ------------------------------- Synthesis ------------------------------- */

let voicesCache: SpeechSynthesisVoice[] = [];
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve([]);
  const v = speechSynthesis.getVoices();
  if (v.length) { voicesCache = v; return Promise.resolve(v); }
  return new Promise((resolve) => {
    const done = () => { voicesCache = speechSynthesis.getVoices(); resolve(voicesCache); };
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1200);
  });
}
export const ttsSupported = () => typeof speechSynthesis !== 'undefined';

/**
 * Find a voice that genuinely speaks the language. Never falls back to a
 * voice of a different language (that would fake multilingual audio).
 */
export function findVoice(langs: string[], preferIndex = 0): { voice: SpeechSynthesisVoice | null; exact: boolean } {
  const voices = voicesCache.length ? voicesCache : (typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []);
  const normal = (s: string) => s.replace('_', '-').toLowerCase();
  for (const l of langs) {
    const exact = voices.filter((v) => normal(v.lang) === l.toLowerCase());
    if (exact.length) return { voice: exact[preferIndex % exact.length], exact: true };
  }
  const base = langs[0].split('-')[0].toLowerCase();
  const same = voices.filter((v) => normal(v.lang).split('-')[0] === base);
  if (same.length) return { voice: same[preferIndex % same.length], exact: false };
  return { voice: null, exact: false };
}

export interface SpeakOpts { rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void; onError?: (msg: string) => void; onBoundary?: (charIndex: number) => void; voiceIndex?: number }
export function speak(text: string, langs: string[], opts: SpeakOpts = {}): { ok: boolean; reason?: string; voiceName?: string; exact?: boolean } {
  if (!ttsSupported()) { opts.onError?.('Speech playback isn’t supported in this browser.'); return { ok: false, reason: 'unsupported' }; }
  const { voice, exact } = findVoice(langs, opts.voiceIndex ?? 0);
  if (!voice) { opts.onError?.(`This device has no ${langs[0]} voice installed, so we won’t fake it with another language. Install one in your system’s speech settings, or read the transcript.`); return { ok: false, reason: 'no-voice' }; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang; u.rate = opts.rate ?? 1; u.pitch = opts.pitch ?? 1;
  u.onstart = () => opts.onStart?.();
  u.onend = () => opts.onEnd?.();
  u.onerror = (e: any) => { if (e.error !== 'interrupted' && e.error !== 'canceled') opts.onError?.('Audio playback failed. You can read the transcript instead.'); opts.onEnd?.(); };
  u.onboundary = (e) => opts.onBoundary?.(e.charIndex);
  speechSynthesis.speak(u);
  // Chrome bug: long utterances can stall; keep it alive.
  return { ok: true, voiceName: voice.name, exact };
}
export function stopSpeaking() { if (ttsSupported()) speechSynthesis.cancel(); }

export const SPEED_RATE = { slow: 0.75, normal: 0.95, natural: 1.08 } as const;

/* ------------------------------ Microphone ------------------------------ */

export async function micPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    const p = await (navigator as any).permissions?.query({ name: 'microphone' });
    return p?.state ?? 'unknown';
  } catch { return 'unknown'; }
}

export interface MicMeter { stop(): void; stream: MediaStream }
export async function startMicMeter(onLevel: (level: number) => void): Promise<MicMeter> {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
  const data = new Uint8Array(an.fftSize);
  let raf = 0;
  const tick = () => {
    an.getByteTimeDomainData(data);
    let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
    raf = requestAnimationFrame(tick);
  };
  tick();
  return { stream, stop() { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {}); } };
}

/** Records audio for in-session replay only. Nothing is uploaded or stored. */
export async function startRecorder(stream?: MediaStream): Promise<{ stop(): Promise<string | null>; stream: MediaStream }> {
  const s = stream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
  if (typeof MediaRecorder === 'undefined') return { stream: s, stop: async () => { if (!stream) s.getTracks().forEach((t) => t.stop()); return null; } };
  const chunks: Blob[] = [];
  const mr = new MediaRecorder(s);
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.start();
  return {
    stream: s,
    stop: () => new Promise((resolve) => {
      mr.onstop = () => { if (!stream) s.getTracks().forEach((t) => t.stop()); resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })) : null); };
      try { mr.stop(); } catch { resolve(null); }
    }),
  };
}
