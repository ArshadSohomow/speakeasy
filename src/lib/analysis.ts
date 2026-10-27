import { annotate, tokenize, norm } from './textProcessing';
import { TRANSITIONS } from './catalog';

export interface TimedSegment { text: string; start: number; end: number } // ms relative to session start

export interface SpeechMetrics {
  durationSec: number; speakingSec: number; words: number; wpm: number;
  fillers: number; fillersPerMin: number; fillerExamples: { word: string; at: number }[];
  repetitions: number; repetitionExamples: { text: string; at: number }[];
  longPauses: { at: number; seconds: number }[]; avgPauseSec: number;
  sentences: number; avgSentenceWords: number; variety: number | null;
  transitions: string[]; relevance: number | null; selfCorrections: number;
}

export function analyse(segments: TimedSegment[], durationSec: number, prompt?: string, lang = 'en'): SpeechMetrics {
  let words = 0, fillers = 0, repetitions = 0, selfCorrections = 0;
  const fillerExamples: SpeechMetrics['fillerExamples'] = [];
  const repetitionExamples: SpeechMetrics['repetitionExamples'] = [];
  const vocab = new Map<string, number>();
  const all: string[] = [];
  for (const s of segments) {
    const toks = annotate(tokenize(s.text), lang);
    let prevKind: string | undefined;
    for (const t of toks) {
      if (t.kind === 'punct' || t.kind === 'break') { prevKind = undefined; continue; }
      words++;
      const w = norm(t.w); all.push(w);
      const continuation = (t.kind === 'hesitation' || t.kind === 'discourse') && prevKind === t.kind; // multi-word phrase counts once
      prevKind = t.kind;
      if (continuation) continue;
      if (t.kind === 'filler' || t.kind === 'hesitation' || (t.kind === 'discourse' && t.confidence === 'high')) { fillers++; if (fillerExamples.length < 6) fillerExamples.push({ word: t.w, at: s.start }); }
      else if (t.kind === 'repetition' || t.kind === 'false-start') { repetitions++; if (repetitionExamples.length < 4) repetitionExamples.push({ text: s.text.slice(0, 60), at: s.start }); }
      else if (t.kind === 'correction-marker') selfCorrections++;
      else if (w.length > 2) vocab.set(w, (vocab.get(w) ?? 0) + 1);
    }
  }
  const pauses: number[] = []; const longPauses: SpeechMetrics['longPauses'] = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = (segments[i].start - segments[i - 1].end) / 1000;
    if (gap > 0.25) pauses.push(gap);
    if (gap >= 3) longPauses.push({ at: segments[i - 1].end, seconds: Math.round(gap * 10) / 10 });
  }
  const speakingSec = Math.max(1, segments.reduce((a, s) => a + Math.max(0.5, (s.end - s.start) / 1000), 0));
  const text = segments.map((s) => s.text).join(' ').toLowerCase();
  const transitions = TRANSITIONS.filter((t) => new RegExp(`\\b${t}\\b`).test(text));
  const sentences = Math.max(1, segments.length);
  let relevance: number | null = null;
  if (prompt) {
    const keys = prompt.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w) => w.length > 4);
    if (keys.length) relevance = keys.filter((k) => text.includes(k.slice(0, Math.max(4, k.length - 2)))).length / keys.length;
  }
  return {
    durationSec, speakingSec, words, wpm: durationSec > 5 ? Math.round(words / (durationSec / 60)) : 0,
    fillers, fillersPerMin: durationSec > 5 ? Math.round((fillers / (durationSec / 60)) * 10) / 10 : 0, fillerExamples,
    repetitions, repetitionExamples, longPauses, avgPauseSec: pauses.length ? Math.round((pauses.reduce((a, b) => a + b, 0) / pauses.length) * 10) / 10 : 0,
    sentences, avgSentenceWords: Math.round((words / sentences) * 10) / 10,
    variety: words >= 40 ? Math.round((vocab.size / Math.max(1, words)) * 100) / 100 : null,
    transitions, relevance, selfCorrections,
  };
}

export interface Report { strongest: string; improve: string; next: string; evidence: { label: string; at?: number; text: string }[] }

export function fmtTime(ms: number) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

/** Short, evidence-backed feedback. Respects the communication-first mode. */
export function buildReport(m: SpeechMetrics, focus: { pace: boolean; pauses: boolean; repetitions: boolean; fillers: boolean; clarity: boolean }, supportMode: boolean): Report {
  const evidence: Report['evidence'] = [];
  if (m.words < 15) {
    return { strongest: 'You started — that’s the hardest part.', improve: 'We only caught a few words, so there isn’t enough to give useful feedback yet.', next: 'Try again and aim to keep talking for at least 30 seconds. It’s fine to pause and think.', evidence };
  }
  const strengths: string[] = [];
  if (m.transitions.length >= 2) strengths.push(`You linked your ideas with transitions like “${m.transitions.slice(0, 2).join('” and “')}”.`);
  if (m.relevance !== null && m.relevance >= 0.5) strengths.push('You stayed on topic and answered the prompt.');
  if (!supportMode && focus.fillers && m.fillersPerMin <= 2) strengths.push('You used very few filler words.');
  if (m.variety !== null && m.variety >= 0.5) strengths.push('You used a nice variety of words.');
  if (m.wpm >= 110 && m.wpm <= 170 && focus.pace) strengths.push(`Your pace (about ${m.wpm} words per minute) was comfortable to follow.`);
  if (!strengths.length) strengths.push('You kept going and got your ideas out — that’s what builds fluency.');

  let improve = '';
  let next = '';
  if (!supportMode && focus.fillers && m.fillersPerMin > 3) {
    improve = `You used filler words about ${m.fillersPerMin} times a minute, often when moving between ideas. A short silent pause works just as well — listeners hear it as thinking time.`;
    next = 'Repeat the same talk, and when you feel an “um” coming, pause and breathe instead.';
    m.fillerExamples.slice(0, 3).forEach((f) => evidence.push({ label: 'Filler', at: f.at, text: `“${f.word}”` }));
  } else if (focus.clarity && m.transitions.length < 2 && m.words > 60) {
    improve = 'Your ideas came across, but it wasn’t always clear when you moved to a new point.';
    next = 'Repeat it in 60 seconds using one clear transition between each point: “First…”, “Then…”, “Finally…”.';
  } else if (focus.pace && m.wpm > 185) {
    improve = `You spoke quite fast (about ${m.wpm} words per minute). That’s fine in conversation, but in a talk it can be harder to follow.`;
    next = 'Try again and pause briefly after each key sentence.';
  } else if (focus.pace && m.wpm > 0 && m.wpm < 80 && !supportMode) {
    improve = `Your pace was on the slower side (about ${m.wpm} words per minute). That isn’t a problem by itself — slower can be clearer.`;
    next = 'If you’d like more flow, try the same prompt once more now that you know what you want to say.';
  } else if (focus.pauses && m.longPauses.length >= 2 && !supportMode) {
    improve = `There were ${m.longPauses.length} long pauses (3 seconds or more). Some pausing is natural; a few of these seemed to be searching for words.`;
    next = 'Jot down three keywords before you start, then speak from them.';
    m.longPauses.slice(0, 3).forEach((p) => evidence.push({ label: 'Pause', at: p.at, text: `${p.seconds}s` }));
  } else {
    improve = supportMode ? 'Your message came through clearly. If you’d like, you can choose a specific area to get feedback on in Settings.' : 'Nothing major stood out. To stretch yourself, add a concrete example to your main point.';
    next = 'Try a longer mode, like the two-minute impromptu speech.';
  }
  if (!supportMode && focus.repetitions && m.repetitions >= 3) m.repetitionExamples.slice(0, 2).forEach((r) => evidence.push({ label: 'Repeated start', at: r.at, text: `“${r.text}…”` }));
  return { strongest: strengths[0], improve, next, evidence };
}
