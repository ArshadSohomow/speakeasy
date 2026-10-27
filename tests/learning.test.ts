import { describe, it, expect } from 'vitest';
import { schedule, statusFor } from '../src/lib/srs';
import { evaluateUtterance } from '../src/lib/teaching';
import { demoEngine, detectTopic, flipPronouns } from '../src/lib/conversation';
import { analyse, buildReport } from '../src/lib/analysis';
import type { VocabEntry } from '../src/lib/types';

const entry = (): VocabEntry => ({ id: 'x', text: 'fair enough', meaning: '', lang: 'en', dialect: 'en-GB', context: '', example: '', source: 'manual', addedAt: 0, status: 'new', reviews: 0, lapses: 0, ease: 2.5, intervalDays: 0, nextReview: 0 });

describe('spaced repetition', () => {
  it('a single recall never marks a phrase familiar', () => {
    expect(schedule(entry(), 'easy').status).not.toBe('familiar');
  });
  it('becomes familiar after spaced successful reviews', () => {
    let e = entry();
    for (let i = 0; i < 4; i++) e = schedule(e, 'good', i * 86400000 * 10);
    expect(e.status).toBe('familiar');
  });
  it('repeated lapses mark a phrase difficult', () => {
    let e = schedule(entry(), 'again'); e = schedule(e, 'again');
    expect(e.status).toBe('difficult');
    expect(statusFor(0, 0, 0)).toBe('new');
  });
});

describe('teaching engine', () => {
  it('flags the past tense example from the spec', () => {
    const fb = evaluateUtterance('Yesterday I go to the restaurant with my friends.', 'en', 'en-GB');
    expect(fb[0].suggestedAlternative).toBe('Yesterday I went to the restaurant with my friends.');
  });
  it('gives the Spanish naturalness example with a casual, context-dependent option', () => {
    const fb = evaluateUtterance('Ayer fui a una fiesta y fue muy buena.', 'es', 'es-ES');
    expect(fb[0].suggestedAlternative).toBe('Ayer fui a una fiesta y estuvo genial.');
    expect(fb[0].casualAlternative?.note).toMatch(/not a universal/i);
  });
  it('does not flag natural sentences', () => {
    expect(evaluateUtterance('I went to the cinema last night and loved it.', 'en', 'en-GB')).toHaveLength(0);
  });
});

describe('demo conversation engine', () => {
  const ctx = { lang: 'en' as const, dialect: 'en-GB', mascot: 'kai' as const, personality: 'relaxed' as const, difficulty: 'everyday' as const, history: [] as any[] };
  it('detects topics', () => { expect(detectTopic('I cooked pasta for dinner')).toBe('food'); });
  it('flips pronouns', () => { expect(flipPronouns('my friends')).toBe('your friends'); });
  it('responds to the user and does not repeat its last question', async () => {
    const r1 = await demoEngine.reply({ ...ctx, history: [{ role: 'coach', text: 'Hi', at: 0 }, { role: 'user', text: 'I made pizza', at: 1 }] }, 'I made pizza');
    const r2 = await demoEngine.reply({ ...ctx, history: [{ role: 'coach', text: r1.text, at: 2 }, { role: 'user', text: 'I made pizza', at: 3 }] }, 'I made pizza');
    expect(r1.text.length).toBeGreaterThan(5);
    expect(r2.text).not.toBe(r1.text);
  });
});

describe('speech analysis', () => {
  it('counts fillers but not meaningful "like"', () => {
    const m = analyse([{ text: 'um I like the design', start: 0, end: 2000 }, { text: 'it was like really good you know', start: 6000, end: 8000 }], 60);
    expect(m.fillers).toBe(3);
    expect(m.longPauses.length).toBe(1);
  });
  it('communication-first mode never critiques fillers', () => {
    const m = analyse([{ text: 'um um uh so um I think uh we um should go um now and um uh then we can er talk about it um', start: 0, end: 20000 }], 30);
    const r = buildReport(m, { pace: true, pauses: true, repetitions: true, fillers: true, clarity: true }, true);
    expect(r.improve).not.toMatch(/filler/i);
  });
});
