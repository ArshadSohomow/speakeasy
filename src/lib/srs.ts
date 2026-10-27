import type { VocabEntry, VocabStatus, LangId, VocabSource } from './types';
import { setState, getState, uid } from './store';

const DAY = 86400000;
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/**
 * A simplified SM-2 schedule. Opening or replaying an entry never changes it —
 * only an explicit recall attempt (graded by the learner) does.
 */
export function schedule(e: VocabEntry, grade: Grade, now = Date.now()): VocabEntry {
  let { ease, intervalDays, reviews, lapses } = e;
  reviews += 1;
  if (grade === 'again') {
    lapses += 1; intervalDays = 0; ease = Math.max(1.3, ease - 0.2);
  } else if (grade === 'hard') {
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2) || 1); ease = Math.max(1.3, ease - 0.15);
  } else if (grade === 'good') {
    intervalDays = intervalDays < 1 ? 1 : intervalDays < 3 ? 3 : Math.round(intervalDays * ease);
  } else {
    intervalDays = intervalDays < 1 ? 3 : Math.round(intervalDays * ease * 1.3); ease = Math.min(3, ease + 0.15);
  }
  const nextReview = grade === 'again' ? now + 10 * 60000 : now + intervalDays * DAY;
  return { ...e, ease, intervalDays, reviews, lapses, lastReviewed: now, nextReview, status: statusFor(intervalDays, reviews, lapses) };
}

export function statusFor(intervalDays: number, reviews: number, lapses: number): VocabStatus {
  if (lapses >= 2 && intervalDays < 7) return 'difficult';
  if (reviews === 0) return 'new';
  if (intervalDays >= 7 && reviews >= 3) return 'familiar';
  return 'learning';
}

export function isDue(e: VocabEntry, now = Date.now()) { return e.nextReview <= now; }

export function saveVocab(input: { text: string; meaning: string; lang: LangId; dialect: string; context?: string; example?: string; source: VocabSource; regional?: boolean }) {
  const existing = getState().vocab.find((v) => v.text.toLowerCase() === input.text.toLowerCase() && v.lang === input.lang);
  if (existing) return { entry: existing, created: false };
  const entry: VocabEntry = {
    id: uid(), text: input.text, meaning: input.meaning, lang: input.lang, dialect: input.dialect,
    context: input.context ?? '', example: input.example ?? '', source: input.source, regional: input.regional,
    addedAt: Date.now(), status: 'new', reviews: 0, lapses: 0, ease: 2.5, intervalDays: 0, nextReview: Date.now(),
  };
  setState((s) => ({ vocab: [entry, ...s.vocab] }));
  return { entry, created: true };
}

export function updateVocab(id: string, patch: Partial<VocabEntry>) {
  setState((s) => ({ vocab: s.vocab.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
}
export function deleteVocab(id: string) {
  setState((s) => ({ vocab: s.vocab.filter((v) => v.id !== id) }));
}
