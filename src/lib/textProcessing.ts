/**
 * Voice Studio text pipeline (demo engine, runs entirely in the browser).
 *
 * Verbatim, clean and polished are deliberately different operations:
 *  - verbatim keeps every spoken word (only spoken punctuation commands are applied)
 *  - clean removes clear fillers and stutter-repeats, adds punctuation, keeps wording
 *  - polished also resolves self-corrections and hesitation phrases
 *
 * Production can swap `transform()` for the /api/transform endpoint (LLM-backed)
 * while keeping these heuristics for low-latency live previews.
 */

export type TokenKind =
  | 'filler' | 'discourse' | 'hesitation' | 'repetition' | 'false-start'
  | 'correction-old' | 'correction-marker' | 'punct' | 'break';

export interface Token {
  w: string;            // original surface form
  kind?: TokenKind;
  confidence?: 'high' | 'possible';
  note?: string;
}

export interface Segment { text: string; locked?: boolean }

export interface FillerPrefs {
  basic: 'remove' | 'highlight' | 'keep';
  discourse: 'remove' | 'highlight' | 'keep';
  repetitions: 'remove' | 'highlight' | 'keep';
  hesitations: 'remove' | 'highlight' | 'keep';
  spokenPunctuation: boolean;
}

export const DEFAULT_PREFS: FillerPrefs = { basic: 'remove', discourse: 'highlight', repetitions: 'remove', hesitations: 'highlight', spokenPunctuation: true };

export type Mode = 'verbatim' | 'clean' | 'polished';

const BASIC_FILLERS = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'uhm', 'hmm', 'mm', 'eh', 'ehm', 'euh', 'äh', 'ähm', 'えーと', 'あの', 'ええと', 'eto', 'este']);
const LANG_DISCOURSE: Record<string, string[]> = {
  en: [], es: ['o sea', 'pues', 'bueno'], fr: ['du coup', 'genre', 'bah', 'ben'], de: ['halt', 'also'], ja: ['なんか'],
};
const HESITATIONS = ['let me think', 'how do i put this', "what's the word", 'what is the word', 'how can i say', 'how do you say', 'let me see', 'where was i'];
const REPEAT_OK = new Set(['had had', 'that that', 'very very', 'no no', 'bye bye', 'so so', 'now now', 'really really']);

const LIKE_VERB_PREV = new Set(['i', 'you', 'we', 'they', 'would', "i'd", "you'd", "we'd", "they'd", 'do', "don't", 'did', "didn't", 'does', "doesn't", 'really', 'also', 'still', 'look', 'looks', 'looked', 'sound', 'sounds', 'sounded', 'seem', 'seems', 'feel', 'feels', 'felt', 'something', 'nothing', 'anything', 'everything', 'more', 'much', 'exactly', 'not', 'just', "i'll", 'might', 'will', 'to', 'people', 'kids', 'friends', 'what']);
const LIKE_FILLER_PREV = new Set(['and', 'but', 'so', 'was', 'were', "it's", "it was", 'is', 'um', 'uh', 'er', 'then', "i'm", "that's", 'like', "he's", "she's", "they're", "we're", 'been']);
const LIKE_FILLER_NEXT = new Set(['really', 'so', 'totally', 'literally', 'super', 'um', 'uh', 'er', 'five', 'ten', 'twenty', 'a', 'an', 'the', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'very', 'kind', 'sort', 'just', 'basically', 'honestly', 'insane', 'amazing']);
const YK_MEANINGFUL_PREV = new Set(['do', "don't", 'did', "didn't", 'if', 'as', 'what', 'how', 'would', 'will', 'should', "you'd", 'might', 'did', 'whether']);
const YK_MEANINGFUL_NEXT = new Set(['the', 'a', 'an', 'what', 'how', 'why', 'where', 'when', 'who', 'that', 'him', 'her', 'them', 'me', 'about', 'it', 'my', 'your', 'his', 'their', 'our', 'this', 'these', 'those', 'everything', 'anything', 'something', 'nothing', 'which', 'whether', 'if']);

const CORRECTION_MARKERS: { words: string[]; strength: 'strong' | 'anchor' | 'scratch' }[] = [
  { words: ['actually', 'make', 'that'], strength: 'strong' },
  { words: ['actually', 'no'], strength: 'strong' },
  { words: ['no', 'wait'], strength: 'strong' },
  { words: ['or', 'rather'], strength: 'strong' },
  { words: ['make', 'that'], strength: 'strong' },
  { words: ['scratch', 'that'], strength: 'scratch' },
  { words: ['sorry', 'i', 'mean'], strength: 'strong' },
  { words: ['i', 'mean'], strength: 'anchor' },
  { words: ['no', 'sorry'], strength: 'strong' },
  { words: ['sorry'], strength: 'anchor' },
];
const ANCHOR_WORDS = new Set(['to', 'on', 'at', 'in', 'for', 'with', 'from', 'the', 'a', 'an', 'by', 'about', 'until', 'before', 'after']);
const APOLOGY_PREV = new Set(["i'm", 'am', 'so', 'really', 'very', 'was', 'were', 'feel', 'be', "we're", "they're"]);
const CLAUSE_STOP =new Set(['and', 'but', 'then', 'so', 'because']);

export const norm = (w: string) => w.toLowerCase().replace(/[’]/g, "'").replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');

/** Apply spoken punctuation commands ("comma", "full stop", "new paragraph"…). */
export function applySpokenPunctuation(text: string): string {
  let t = ' ' + text + ' ';
  t = t.replace(/\s(new paragraph|next paragraph)\s/gi, ' ¶ ');
  t = t.replace(/\s(new line|next line)\s/gi, ' ↵ ');
  t = t.replace(/\s(full stop)(?=\s)/gi, ' .');
  t = t.replace(/\s(period)\s*$/gi, ' .');
  t = t.replace(/\s(period)(?=\s¶|\s↵)/gi, ' .');
  t = t.replace(/\s(question mark)(?=\s)/gi, ' ?');
  t = t.replace(/\s(exclamation (mark|point))(?=\s)/gi, ' !');
  t = t.replace(/\s(comma)(?=\s)/gi, ' ,');
  t = t.replace(/\s(colon)(?=\s)/gi, ' :');
  return t.trim();
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const parts = text.split(/\s+/).filter(Boolean);
  for (const p of parts) {
    if (p === '¶' || p === '↵') { out.push({ w: p, kind: 'break' }); continue; }
    if (/^[.,!?:;]+$/.test(p)) { out.push({ w: p, kind: 'punct' }); continue; }
    const m = p.match(/^(.*?)([.,!?:;]+)$/);
    if (m && m[1]) { out.push({ w: m[1] }); out.push({ w: m[2], kind: 'punct' }); }
    else out.push({ w: p });
  }
  return out;
}

const isWord = (t?: Token) => !!t && t.kind !== 'punct' && t.kind !== 'break';
function prevWord(tokens: Token[], i: number) { for (let j = i - 1; j >= 0; j--) { if (tokens[j].kind === 'punct' || tokens[j].kind === 'break') return ','; if (isWord(tokens[j])) return norm(tokens[j].w); } return '^'; }
function nextWord(tokens: Token[], i: number) { for (let j = i + 1; j < tokens.length; j++) { if (tokens[j].kind === 'punct' || tokens[j].kind === 'break') return '$'; if (isWord(tokens[j])) return norm(tokens[j].w); } return '$'; }

/** Annotate fillers, repetitions, hesitations and self-corrections. */
export function annotate(tokens: Token[], lang = 'en'): Token[] {
  const t = tokens.map((x) => ({ ...x }));
  const n = t.length;

  // Multi-word hesitation phrases
  for (let i = 0; i < n; i++) {
    for (const h of HESITATIONS) {
      const hw = h.split(' ');
      if (hw.every((w, k) => t[i + k] && norm(t[i + k].w) === w)) {
        for (let k = 0; k < hw.length; k++) t[i + k] = { ...t[i + k], kind: 'hesitation', confidence: 'high', note: 'Hesitation phrase' };
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const tok = t[i];
    if (!isWord(tok) || tok.kind) continue;
    const w = norm(tok.w);
    if (BASIC_FILLERS.has(w)) { tok.kind = 'filler'; tok.confidence = 'high'; tok.note = 'Filler sound'; continue; }
    if (/^[\p{L}]{1,6}-$/u.test(tok.w)) { tok.kind = 'false-start'; tok.confidence = 'high'; tok.note = 'Cut-off word'; continue; }

    if (lang === 'en' && w === 'like') {
      const p = prevWord(t, i), nx = nextWord(t, i);
      if (LIKE_VERB_PREV.has(p)) continue; // "I like", "looks like", "something like"
      if (p === ',' && (nx === '$' || nx === ',')) { tok.kind = 'discourse'; tok.confidence = 'high'; tok.note = '“like” used as a filler'; continue; }
      if ((LIKE_FILLER_PREV.has(p) || p === '^' || p === ',') && (LIKE_FILLER_NEXT.has(nx) || nx === ',')) {
        // "it was like really good", "and like the whole place"
        tok.kind = 'discourse';
        tok.confidence = LIKE_FILLER_NEXT.has(nx) && ['really', 'so', 'totally', 'literally', 'super', 'um', 'uh', 'er', 'very', 'basically', 'honestly', 'just'].includes(nx) ? 'high' : 'possible';
        tok.note = tok.confidence === 'high' ? '“like” used as a filler' : '“like” might be a filler here';
      }
      continue;
    }

    if (lang === 'en' && w === 'you' && t[i + 1] && norm(t[i + 1].w) === 'know') {
      const p = prevWord(t, i), nx = nextWord(t, i + 1);
      if (YK_MEANINGFUL_PREV.has(p) || YK_MEANINGFUL_NEXT.has(nx)) continue; // "you know the answer"
      const high = nx === '$' || nx === ',' || ['like', 'um', 'uh', 'so', 'and', 'but', 'i', 'we', 'they', 'he', 'she'].includes(nx);
      const conf = high ? 'high' : 'possible';
      t[i] = { ...tok, kind: 'discourse', confidence: conf, note: '“you know” used as a filler' };
      t[i + 1] = { ...t[i + 1], kind: 'discourse', confidence: conf, note: '“you know” used as a filler' };
      i++;
      continue;
    }

    const extra = LANG_DISCOURSE[lang] || [];
    for (const d of extra) {
      const dw = d.split(' ');
      if (dw.every((x, k) => t[i + k] && norm(t[i + k].w) === x)) {
        for (let k = 0; k < dw.length; k++) t[i + k] = { ...t[i + k], kind: 'discourse', confidence: 'possible', note: 'Possible filler expression' };
      }
    }
  }

  // Repetitions: single words and repeated 2–3 word starts ("I want to I want to go")
  for (let i = 0; i < n; i++) {
    if (!isWord(t[i]) || t[i].kind) continue;
    for (const size of [3, 2, 1]) {
      const a = t.slice(i, i + size), b = t.slice(i + size, i + size * 2);
      if (a.length < size || b.length < size) continue;
      if (!a.every(isWord) || !b.every(isWord)) continue;
      if (a.some((x) => x.kind) || b.some((x) => x.kind)) continue;
      const as = a.map((x) => norm(x.w)).join(' '), bs = b.map((x) => norm(x.w)).join(' ');
      if (as === bs && as.length > 0 && !(size === 1 && REPEAT_OK.has(as + ' ' + bs))) {
        for (let k = 0; k < size; k++) t[i + k] = { ...t[i + k], kind: 'repetition', confidence: 'high', note: size === 1 ? 'Repeated word' : 'Repeated start' };
        break;
      }
    }
  }

  // Self-corrections
  for (let i = 0; i < n; i++) {
    if (!isWord(t[i])) continue;
    for (const m of CORRECTION_MARKERS) {
      const len = m.words.length;
      const window = t.slice(i, i + len);
      if (window.length < len || !window.every((x, k) => isWord(x) && norm(x.w) === m.words[k])) continue;
      if (window.some((x) => x.kind && x.kind !== 'discourse')) continue;
      // replacement R
      const r: number[] = [];
      for (let j = i + len; j < n && r.length < 6; j++) {
        if (t[j].kind === 'punct' && r.length) break;
        if (t[j].kind === 'punct' || t[j].kind === 'break') { if (r.length) break; else continue; }
        if (CLAUSE_STOP.has(norm(t[j].w)) && r.length) break;
        r.push(j);
      }
      // previous words (up to a sentence boundary)
      const before: number[] = [];
      for (let j = i - 1; j >= 0 && before.length < 8; j--) {
        if (t[j].kind === 'punct' && /[.?!]/.test(t[j].w)) break;
        if (t[j].kind === 'break') break;
        if (isWord(t[j]) && !t[j].kind) before.unshift(j);
      }
      if (!before.length) continue;
      if (m.strength === 'scratch') {
        // drop the clause before "scratch that"
        before.forEach((j) => (t[j] = { ...t[j], kind: 'correction-old', confidence: 'high', note: 'Removed by “scratch that”' }));
        window.forEach((_, k) => (t[i + k] = { ...t[i + k], kind: 'correction-marker', confidence: 'high', note: 'Spoken correction' }));
        break;
      }
      if (!r.length) continue;
      const r0 = norm(t[r[0]].w);
      if (m.strength === 'anchor') {
        // "sorry"/"I mean" only count as corrections when they repeat a structural word ("to John, I mean to Sarah")
        const pw = norm(t[before[before.length - 1]].w);
        if (!ANCHOR_WORDS.has(r0) && !/^\d+$/.test(r0)) continue;
        if (APOLOGY_PREV.has(pw)) continue;
      }
      let anchor = -1;
      for (let k = before.length - 1; k >= 0; k--) if (norm(t[before[k]].w) === r0) { anchor = k; break; }
      let replaced: number[];
      if (anchor >= 0) replaced = before.slice(anchor);
      else if (m.strength === 'anchor') continue; // "I mean"/"sorry" without an anchor is too ambiguous
      else replaced = before.slice(Math.max(0, before.length - r.length));
      if (!replaced.length) continue;
      replaced.forEach((j) => (t[j] = { ...t[j], kind: 'correction-old', confidence: 'high', note: `Replaced by “${r.map((x) => t[x].w).join(' ')}”` }));
      window.forEach((_, k) => (t[i + k] = { ...t[i + k], kind: 'correction-marker', confidence: 'high', note: 'Spoken correction' }));
      // swallow punctuation directly around the marker (e.g. "two, actually, make that three")
      break;
    }
  }

  // Remaining "I mean" without a correction anchor → possible discourse filler
  for (let i = 0; i < n - 1; i++) {
    if (!t[i].kind && !t[i + 1].kind && norm(t[i].w) === 'i' && norm(t[i + 1].w) === 'mean' && (prevWord(t, i) === ',' || prevWord(t, i) === '^')) {
      const nx = nextWord(t, i + 1);
      if (nx === ',' || nx === '$' || ['like', 'um', 'uh', 'it', 'i', 'you', 'we', 'they', 'the', 'that'].includes(nx)) {
        t[i] = { ...t[i], kind: 'discourse', confidence: 'possible', note: '“I mean” used as a filler' };
        t[i + 1] = { ...t[i + 1], kind: 'discourse', confidence: 'possible', note: '“I mean” used as a filler' };
      }
    }
  }
  return t;
}

const QUESTION_START = new Set(['who', 'what', 'when', 'where', 'why', 'how', 'which', 'whose', 'can', 'could', 'would', 'will', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'have', 'has', 'shall', 'may', 'am', "isn't", "aren't", "don't", "doesn't", "can't", "won't", "wouldn't", "couldn't", "shouldn't"]);
const PRONOUNS = new Set(['i', 'we', 'they', 'he', 'she', 'it', 'you', 'my', 'our', 'the']);

export function isQuestion(words: string[]): boolean {
  const ws = words.map(norm).filter(Boolean);
  if (!ws.length) return false;
  const [a, b] = ws;
  if (['¿'].some((c) => words[0]?.startsWith(c))) return true;
  if (/[?？]$/.test(words[words.length - 1] || '')) return true;
  if (!QUESTION_START.has(a)) {
    const tail = ws.slice(-2).join(' ');
    return ['right', "isn't it", "aren't you", "don't you", 'ok', 'okay'].some((x) => tail.endsWith(x)) && ws.length > 3 && tail.endsWith('right');
  }
  if (['who', 'what', 'when', 'where', 'why', 'how', 'which', 'whose'].includes(a) && b && PRONOUNS.has(b) && a !== 'how') return false; // "When I got home…"
  if (a === 'how' && b && ['i', 'we', 'they', 'he', 'she'].includes(b)) return false;
  return true;
}

function shouldDrop(tok: Token, mode: Mode, prefs: FillerPrefs): boolean {
  if (!tok.kind || tok.kind === 'punct' || tok.kind === 'break') return false;
  if (mode === 'verbatim') return false;
  switch (tok.kind) {
    case 'filler': return mode === 'polished' || prefs.basic === 'remove';
    case 'false-start': return mode === 'polished' || prefs.repetitions === 'remove';
    case 'repetition': return mode === 'polished' || prefs.repetitions === 'remove';
    case 'discourse': return tok.confidence === 'high' && (mode === 'polished' || prefs.discourse === 'remove');
    case 'hesitation': return mode === 'polished' || prefs.hesitations === 'remove';
    case 'correction-old':
    case 'correction-marker': return mode === 'polished';
  }
  return false;
}

const POLISH_REPLACEMENTS: [RegExp, string][] = [
  [/\bgonna\b/gi, 'going to'], [/\bwanna\b/gi, 'want to'], [/\bkinda\b/gi, 'kind of'], [/\bgotta\b/gi, 'have to'], [/\bdunno\b/gi, "don't know"],
  [/\b(and|but) (and|but)\b/gi, '$1'],
];

export interface ProcessResult {
  annotated: Token[][];       // per segment, for highlighting
  paragraphs: string[][];     // sentences grouped into paragraphs
  text: string;               // plain output
  stats: { fillers: number; repetitions: number; corrections: number; words: number };
}

/** Run the full pipeline for one of the three modes. */
export function processTranscript(segments: Segment[], mode: Mode, prefs: FillerPrefs = DEFAULT_PREFS, lang = 'en'): ProcessResult {
  const annotated: Token[][] = [];
  const paragraphs: string[][] = [[]];
  let fillers = 0, repetitions = 0, corrections = 0, words = 0;

  for (const seg of segments) {
    const raw = prefs.spokenPunctuation ? applySpokenPunctuation(seg.text) : seg.text;
    const toks = annotate(tokenize(raw), lang);
    annotated.push(toks);
    for (const tk of toks) {
      if (!isWord(tk)) continue;
      words++;
      if (tk.kind === 'filler' || (tk.kind === 'discourse' && tk.confidence === 'high') || tk.kind === 'hesitation') fillers++;
      if (tk.kind === 'repetition' || tk.kind === 'false-start') repetitions++;
      if (tk.kind === 'correction-marker') corrections++;
    }
    const effMode: Mode = seg.locked ? 'verbatim' : mode;

    // Build sentences from tokens
    let current: string[] = [];
    const flush = (end?: string) => {
      const ws = current.filter(Boolean);
      current = [];
      if (!ws.length) return;
      let s = ws.join(' ').replace(/\s+([,.!?:;])/g, '$1').replace(/,+/g, ',').replace(/^[,\s]+/, '').replace(/[,\s]+$/, '');
      if (!s) return;
      if (effMode === 'polished') {
        for (const [re, rep] of POLISH_REPLACEMENTS) s = s.replace(re, rep);
        s = s.replace(/^(so|okay so|ok so|well|right so|anyway)[, ]+/i, '');
      }
      if (effMode !== 'verbatim' || true) {
        s = s.replace(/\bi\b/g, 'I').replace(/\bi'(m|ve|ll|d)\b/gi, (_, x) => `I'${x}`);
        s = s.charAt(0).toUpperCase() + s.slice(1);
      }
      if (!/[.!?。？！]$/.test(s)) {
        const q = end === '?' || (end !== '.' && end !== '!' && isQuestion(s.split(' ')));
        s += end && /[.!?]/.test(end) ? end : q ? (lang === 'ja' ? '？' : '?') : lang === 'ja' ? '。' : '.';
      }
      paragraphs[paragraphs.length - 1].push(s);
    };

    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (tk.kind === 'break') { flush(); if (tk.w === '¶') paragraphs.push([]); continue; }
      if (tk.kind === 'punct') {
        if (/[.!?]/.test(tk.w)) { flush(tk.w); continue; }
        // drop a comma that would directly follow a dropped token run or start a sentence
        if (!current.length) continue;
        const prev = current[current.length - 1];
        if (prev.endsWith(',')) continue;
        current[current.length - 1] = prev + tk.w;
        continue;
      }
      if (shouldDrop(tk, effMode, prefs)) {
        // remove a comma that was attached to dropped filler (", like,")
        continue;
      }
      current.push(tk.w);
    }
    flush();
  }

  const cleaned = paragraphs.filter((p) => p.length);
  return {
    annotated,
    paragraphs: cleaned.length ? cleaned : [[]],
    text: cleaned.map((p) => p.join(' ')).join('\n\n'),
    stats: { fillers, repetitions, corrections, words },
  };
}

/* ------------------------------ Formatting ------------------------------ */

export const FORMATS = [
  { id: 'paragraphs', label: 'Paragraphs' },
  { id: 'notes', label: 'Plain notes' },
  { id: 'email', label: 'Email' },
  { id: 'pro-email', label: 'Professional email' },
  { id: 'message', label: 'Casual message' },
  { id: 'meeting', label: 'Meeting notes' },
  { id: 'bullets', label: 'Bullet points' },
  { id: 'numbered', label: 'Numbered list' },
  { id: 'speech', label: 'Speech draft' },
  { id: 'podcast', label: 'Podcast script' },
  { id: 'actions', label: 'Action list' },
  { id: 'brainstorm', label: 'Brainstorming notes' },
] as const;
export type FormatId = (typeof FORMATS)[number]['id'];

const ACTION_RE = /\b(need to|needs to|have to|has to|will|i'll|we'll|should|let's|lets|can you|could you|please|make sure|remember to|don't forget to|follow up|send|schedule|book|call|email|buy|pick up|finish|prepare|review|update|check)\b/i;

export function toImperative(s: string): string {
  let x = s.replace(/[.?!]$/, '');
  x = x.replace(/^(and |also |then |so )/i, '');
  x = x.replace(/^(can|could|would|will) you (please )?/i, '');
  x = x.replace(/^please /i, '');
  x = x.replace(/^(we|i|you) (need to|have to|should|must|will|'ll) /i, '');
  x = x.replace(/^(i'll|we'll|you'll|i will|we will) /i, '');
  x = x.replace(/^(let's|lets|let us) /i, '');
  x = x.replace(/^(make sure|remember|don't forget) (to |that )?/i, (m) => (/don't forget/i.test(m) ? '' : m.startsWith('make') ? 'Make sure ' : ''));
  x = x.replace(/^(we|i) /i, '');
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/** Split a sentence that is clearly a list ("eggs, milk, bread and coffee"). */
export function listItems(sentence: string): string[] | null {
  const body = sentence.replace(/[.?!]$/, '');
  const m = body.match(/^(.*?\b(?:need|buy|get|bring|pack|grab|include|are|is|:)\s)(.+)$/i);
  const target = m ? m[2] : body;
  const parts = target.split(/,\s*|\s+and\s+(?=[^,]+$)/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3 && parts.every((p) => p.split(' ').length <= 6)) return parts.map((p) => p.replace(/^and /i, ''));
  return null;
}

const FORMAL_MAP: [RegExp, string][] = [
  [/\bcan't\b/gi, 'cannot'], [/\bwon't\b/gi, 'will not'], [/\bdon't\b/gi, 'do not'], [/\bdoesn't\b/gi, 'does not'], [/\bdidn't\b/gi, 'did not'],
  [/\bisn't\b/gi, 'is not'], [/\baren't\b/gi, 'are not'], [/\bI'm\b/g, 'I am'], [/\bI'll\b/g, 'I will'], [/\bI've\b/g, 'I have'], [/\bwe'll\b/gi, 'we will'],
  [/\bit's\b/gi, 'it is'], [/\bthat's\b/gi, 'that is'], [/\blet's\b/gi, 'let us'], [/\byeah\b/gi, 'yes'], [/\bnope\b/gi, 'no'], [/\bguys\b/gi, 'everyone'],
  [/\bthanks\b/gi, 'thank you'], [/\bASAP\b/g, 'as soon as possible'], [/\bstuff\b/gi, 'items'], [/\bget back to\b/gi, 'respond to'], [/\bhey\b/gi, 'hello'],
  [/\ba lot of\b/gi, 'many'], [/\bpretty\s(?=\w)/gi, 'quite '], [/\bsuper\s(?=\w)/gi, 'very '], [/\bokay\b/gi, 'acceptable'],
];
const CASUAL_MAP: [RegExp, string][] = [
  [/\bdo not\b/gi, "don't"], [/\bcannot\b/gi, "can't"], [/\bwill not\b/gi, "won't"], [/\bI am\b/g, "I'm"], [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
  [/\bthank you\b/gi, 'thanks'], [/\bhello\b/gi, 'hey'], [/\bregarding\b/gi, 'about'], [/\bplease find\b/gi, 'here’s'],
];
export function makeFormal(s: string) { let x = s; for (const [re, r] of FORMAL_MAP) x = x.replace(re, (m) => (m[0] === m[0].toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r)); return x; }
export function makeCasual(s: string) { let x = s; for (const [re, r] of CASUAL_MAP) x = x.replace(re, (m) => (m[0] === m[0].toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r)); return x; }

function guessRecipient(text: string): string | null {
  const m = text.match(/\b(?:hi|hey|hello|dear|email to|message to|tell|ask|remind)\s+([A-Z][a-z]+)/);
  return m ? m[1] : null;
}
function stripSalutation(sentences: string[]) {
  return sentences.filter((s, i) => !(i === 0 && /^(hi|hey|hello|dear)\b[\w\s]{0,20}[.!,]?$/i.test(s)));
}

export function formatOutput(paragraphs: string[][], format: FormatId, opts: { date?: string } = {}): string {
  const sentences = paragraphs.flat().filter(Boolean);
  if (!sentences.length) return '';
  const all = sentences.join(' ');
  const date = opts.date ?? new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const bulletsFrom = (ss: string[]) => ss.flatMap((s) => listItems(s) ?? [s.replace(/[.]$/, '')]);
  const actions = sentences.filter((s) => ACTION_RE.test(s));
  const nonActions = sentences.filter((s) => !ACTION_RE.test(s));
  const paras = () => {
    if (paragraphs.length > 1) return paragraphs.map((p) => p.join(' ')).join('\n\n');
    const out: string[] = []; let cur: string[] = [];
    sentences.forEach((s, i) => { cur.push(s); if (cur.length >= 3 || /^(so|but|however|anyway|finally|next|also)\b/i.test(sentences[i + 1] || '')) { out.push(cur.join(' ')); cur = []; } });
    if (cur.length) out.push(cur.join(' '));
    return out.join('\n\n');
  };

  switch (format) {
    case 'paragraphs': return paras();
    case 'notes': return sentences.map((s) => s.replace(/[.]$/, '')).join('\n');
    case 'bullets': return bulletsFrom(sentences).map((b) => `• ${b}`).join('\n');
    case 'numbered': return bulletsFrom(sentences).map((b, i) => `${i + 1}. ${b}`).join('\n');
    case 'actions': {
      const list = (actions.length ? actions : sentences).flatMap((s) => (listItems(s) ? listItems(s)! : [toImperative(s)]));
      return list.map((a) => `☐ ${a.replace(/[.?!]$/, '')}`).join('\n');
    }
    case 'email': {
      const name = guessRecipient(all);
      const body = stripSalutation(sentences);
      return `Hi${name ? ' ' + name : ''},\n\n${paragraphsOf(body)}\n\nThanks,\n[Your name]`;
    }
    case 'pro-email': {
      const name = guessRecipient(all);
      const body = stripSalutation(sentences).map(makeFormal);
      return `Dear ${name ?? '[Name]'},\n\n${paragraphsOf(body)}\n\nKind regards,\n[Your name]`;
    }
    case 'message': {
      return stripSalutation(sentences).map(makeCasual).join(' ').replace(/\.$/, '');
    }
    case 'meeting': {
      const disc = nonActions.length ? nonActions : sentences;
      return [`Meeting notes · ${date}`, '', 'Discussion', ...disc.map((s) => `• ${s.replace(/[.]$/, '')}`), '', 'Action items',
        ...(actions.length ? actions.map((a) => `☐ ${toImperative(a).replace(/[.?!]$/, '')}`) : ['☐ None recorded'])].join('\n');
    }
    case 'speech': {
      return paras().split('\n\n').map((p, i, arr) => (i === arr.length - 1 && arr.length > 1 ? p : p + '\n[pause]')).join('\n\n');
    }
    case 'podcast': {
      const n = sentences.length;
      const intro = sentences.slice(0, Math.max(1, Math.ceil(n * 0.2)));
      const outro = n > 3 ? sentences.slice(-1) : [];
      const main = sentences.slice(intro.length, n - outro.length);
      return ['[Intro]', `HOST: ${intro.join(' ')}`, '', '[Main segment]', ...(main.length ? chunk(main, 3).map((c) => `HOST: ${c.join(' ')}`) : ['HOST: …']), '', '[Outro]', `HOST: ${outro.length ? outro.join(' ') : 'Thanks for listening.'}`].join('\n');
    }
    case 'brainstorm': {
      const qs = sentences.filter((s) => s.endsWith('?'));
      const ideas = bulletsFrom(sentences.filter((s) => !s.endsWith('?')));
      return ['Ideas', ...ideas.map((i) => `• ${i}`), ...(qs.length ? ['', 'Open questions', ...qs.map((q) => `• ${q}`)] : [])].join('\n');
    }
  }
  return all;
}
function chunk<T>(a: T[], n: number) { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
function paragraphsOf(ss: string[]) { return chunk(ss, 3).map((c) => c.join(' ')).join('\n\n'); }

/* ---------------------------- Voice commands ---------------------------- */

export type CommandId = 'delete-last' | 'undo' | 'new-paragraph' | 'formal' | 'casual' | 'lock-last' | 'remove-fillers' | 'repeat' | 'stop' | 'save' | 'switch-conversation' | 'read-back';
export const COMMANDS: { id: CommandId; re: RegExp; label: string; destructive?: boolean }[] = [
  { id: 'delete-last', re: /^(please )?(delete|remove|scratch) (the )?last sentence$/, label: 'Delete the last sentence', destructive: true },
  { id: 'undo', re: /^undo( that| the last change)?$/, label: 'Undo' },
  { id: 'new-paragraph', re: /^(start a )?new paragraph$/, label: 'New paragraph' },
  { id: 'formal', re: /^make (that|it|this) (more )?(formal|professional)$/, label: 'Make it more formal' },
  { id: 'casual', re: /^make (that|it|this) (more )?(casual|relaxed|friendly)$/, label: 'Make it more casual' },
  { id: 'lock-last', re: /^keep (the )?last sentence( exactly)?( as i said it)?$/, label: 'Keep the last sentence exactly as said' },
  { id: 'remove-fillers', re: /^remove (the |all )?(the )?filler( words)?$/, label: 'Remove the filler words' },
  { id: 'repeat', re: /^repeat (the )?last (instruction|command)$/, label: 'Repeat the last instruction' },
  { id: 'stop', re: /^stop (recording|dictation|dictating|listening)$/, label: 'Stop recording' },
  { id: 'save', re: /^save (this|that|it)$/, label: 'Save this' },
  { id: 'switch-conversation', re: /^(switch|go) to conversation( mode)?$/, label: 'Switch to conversation mode' },
  { id: 'read-back', re: /^(read|play) (that|it) back$/, label: 'Read it back' },
];

/** Only short, whole-utterance matches count as commands, so dictated sentences that merely contain these words are never treated as instructions. */
export function parseCommand(utterance: string): { id: CommandId; label: string; destructive?: boolean } | null {
  const u = utterance.toLowerCase().replace(/[’]/g, "'").replace(/[.,!?]/g, '').replace(/^(speakeasy|okay speakeasy|hey speakeasy)\s+/, '').trim();
  if (!u || u.split(/\s+/).length > 8) return null;
  for (const c of COMMANDS) if (c.re.test(u)) return { id: c.id, label: c.label, destructive: c.destructive };
  return null;
}

/* --------------------------------- Diff --------------------------------- */

export interface DiffOp { type: 'same' | 'del' | 'ins'; text: string }
export function diffWords(a: string, b: string): DiffOp[] {
  const A = a.split(/(\s+)/).filter((x) => x.trim()), B = b.split(/(\s+)/).filter((x) => x.trim());
  const n = A.length, m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  const push = (type: DiffOp['type'], text: string) => { const last = ops[ops.length - 1]; if (last && last.type === type) last.text += ' ' + text; else ops.push({ type, text }); };
  while (i < n && j < m) {
    if (A[i] === B[j]) { push('same', A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('del', A[i]); i++; }
    else { push('ins', B[j]); j++; }
  }
  while (i < n) push('del', A[i++]);
  while (j < m) push('ins', B[j++]);
  return ops;
}

/** Group diff ops into hunks the user can accept or reject. */
export interface Hunk { id: number; del: string; ins: string }
export function hunksFrom(ops: DiffOp[]): { parts: (DiffOp | Hunk)[]; hunks: Hunk[] } {
  const parts: (DiffOp | Hunk)[] = []; const hunks: Hunk[] = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.type === 'same') { parts.push(op); continue; }
    const h: Hunk = { id: hunks.length, del: '', ins: '' };
    while (k < ops.length && ops[k].type !== 'same') { if (ops[k].type === 'del') h.del += (h.del ? ' ' : '') + ops[k].text; else h.ins += (h.ins ? ' ' : '') + ops[k].text; k++; }
    k--; hunks.push(h); parts.push(h);
  }
  return { parts, hunks };
}
export function applyHunks(parts: (DiffOp | Hunk)[], rejected: Set<number>): string {
  return parts.map((p) => ('type' in p ? p.text : rejected.has(p.id) ? p.del : p.ins)).filter(Boolean).join(' ').replace(/\s+([,.!?])/g, '$1');
}
