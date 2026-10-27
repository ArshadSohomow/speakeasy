import { complete, handle, json, rateLimit, str, HttpError, type Env } from '../_lib/llm';

/**
 * POST /api/transform — Voice Studio rewrite for edits the on-device rules can't do well.
 * body: { text, mode: 'clean'|'polished', format, instruction? }
 * Verbatim is never sent here: it must not be rewritten.
 */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handle(async () => {
  await rateLimit(env, request);
  const b: any = await request.json();
  const mode = str(b.mode, 10);
  if (mode === 'verbatim') throw new HttpError(400, 'verbatim transcripts are not transformed');
  const system = `You turn dictated speech into text. Mode: ${mode}. ${mode === 'clean' ? 'Fix punctuation and remove clear fillers only; keep the speaker’s wording.' : 'Remove verbal clutter, resolve self-corrections (later instructions supersede earlier ones), improve structure, preserve meaning.'}
Format the result as: ${str(b.format ?? 'paragraphs', 30)}. ${b.instruction ? 'Additional instruction: ' + str(b.instruction, 200) : ''}
Never add facts. Return only the resulting text.`;
  const text = await complete(env, system, [{ role: 'user', content: str(b.text, 12000) }], 1500);
  return json({ text });
});
