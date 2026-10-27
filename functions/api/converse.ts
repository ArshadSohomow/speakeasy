import { complete, handle, json, rateLimit, str, HttpError, type Env, type Msg } from '../_lib/llm';

const MASCOTS: Record<string, string> = {
  theodore: 'Professor Theodore, a distinguished, patient, witty old turtle professor. Articulate and occasionally delightfully old-fashioned — but if you use a dated expression, you know it is dated.',
  milo: 'Scout Milo, a curious, adventurous mouse explorer. Great at travel roleplay and helping nervous beginners.',
  kai: 'Kai, a relaxed, funny, socially aware young panda. Sounds like a believable friend, never a caricature; no forced slang.',
  ace: 'Ace, an energetic, focused eagle coach for public speaking and interviews. Friendly-competitive, likes short challenges.',
  sterling: 'Mr Sterling, a composed, charismatic tiger in a suit. Professional but not stiff; quietly humorous.',
};

/**
 * POST /api/converse
 * body: { lang, dialect, mascot, personality, difficulty, scenario?, history: {role:'coach'|'user', text}[], message }
 * returns: { text, translation? }
 */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handle(async () => {
  await rateLimit(env, request);
  const b: any = await request.json().catch(() => { throw new HttpError(400, 'invalid json'); });
  const message = str(b.message, 2000);
  const dialect = str(b.dialect, 20);
  const history: Msg[] = (Array.isArray(b.history) ? b.history : []).slice(-16).map((t: any) => ({ role: t.role === 'user' ? 'user' : 'assistant', content: str(t.text, 2000) }));
  if (!history.length || history[history.length - 1].role !== 'user') history.push({ role: 'user', content: message });
  while (history.length && history[0].role !== 'user') history.shift();

  const system = [
    `You are ${MASCOTS[b.mascot] ?? MASCOTS.kai}`,
    `You are having a spoken conversation in ${dialect}. Use natural, current language from that region.`,
    `Personality: ${str(b.personality ?? 'relaxed', 30)}. Difficulty: ${str(b.difficulty ?? 'everyday', 30)}.`,
    b.scenario ? `You are role-playing the scenario "${str(b.scenario, 60)}".` : '',
    'Reply like a real person talking: 1–3 short sentences, then usually one follow-up question. Respond directly to what the learner said.',
    'Do NOT correct mistakes in your reply — understand the intended meaning and keep the conversation flowing. Feedback is handled separately.',
    'Never repeat a question you already asked. Keep content suitable for teenagers and adults; no profanity.',
    dialect.startsWith('en') ? '' : 'After your reply, add a line starting with "EN:" containing an English translation.',
  ].filter(Boolean).join('\n');

  const out = await complete(env, system, history, 300);
  const [text, tr] = out.split(/\n?EN:\s*/);
  return json({ text: text.trim(), translation: tr?.trim() });
});
