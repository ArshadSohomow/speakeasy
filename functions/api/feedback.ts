import { complete, handle, json, rateLimit, str, type Env } from '../_lib/llm';

/**
 * POST /api/feedback — teaching/evaluation engine, separate from conversation.
 * body: { text, lang, dialect, context? }
 * returns: { items: Feedback[] } using the same schema as src/lib/teaching.ts
 */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handle(async () => {
  await rateLimit(env, request);
  const b: any = await request.json();
  const text = str(b.text, 1000), dialect = str(b.dialect, 20), lang = str(b.lang, 5);
  const system = `You evaluate a language learner's utterance in ${dialect}. Return ONLY JSON: {"items":[{"originalText","intendedMeaning","grammarAssessment":"ok"|"needs-correction","category":"incorrect"|"unnatural"|"natural"|"informal"|"slang"|"regional"|"register","naturalnessAssessment","suggestedAlternative","explanation","confidence":"high"|"medium"|"low","affectsMeaning":boolean,"pattern"}]}.
Only include issues that affect meaning or naturalness. Do not mark valid regional expressions as incorrect. If several options are equally natural, say so. If unsure, use confidence "low" rather than inventing rules. Empty list if it sounds natural.`;
  const raw = await complete(env, system, [{ role: 'user', content: text }], 600);
  let items: any[] = [];
  try { items = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).items ?? []; } catch { items = []; }
  items = items.filter((i) => i && typeof i.suggestedAlternative === 'string').map((i, n) => ({ ...i, id: `api${Date.now()}${n}`, language: lang, dialect, matched: '' }));
  return json({ items });
});
