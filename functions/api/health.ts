import { json, llmConfigured, type Env } from '../_lib/llm';

/** GET /api/health — tells the frontend which services are configured. */
export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({ ok: true, llm: llmConfigured(env), db: !!env.DB, provider: env.LLM_PROVIDER ?? (env.LLM_API_KEY ? 'anthropic' : null) });
