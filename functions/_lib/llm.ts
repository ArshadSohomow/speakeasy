/**
 * Model-agnostic LLM adapter for Cloudflare Pages Functions.
 * Supports Anthropic and any OpenAI-compatible endpoint. Keys live in
 * Cloudflare environment variables / secrets — never in the frontend bundle.
 */
export interface Env {
  LLM_PROVIDER?: 'anthropic' | 'openai';
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_BASE_URL?: string; // for OpenAI-compatible providers
  DB?: D1Database;
  RATE_LIMIT?: KVNamespace;
}

export interface Msg { role: 'user' | 'assistant'; content: string }

export function llmConfigured(env: Env) { return !!env.LLM_API_KEY; }

export async function complete(env: Env, system: string, messages: Msg[], maxTokens = 400): Promise<string> {
  if (!env.LLM_API_KEY) throw new HttpError(503, 'LLM not configured');
  const provider = env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.LLM_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.LLM_MODEL ?? 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages }),
    });
    if (r.status === 429) throw new HttpError(429, 'rate-limited');
    if (!r.ok) throw new HttpError(502, `provider error ${r.status}`);
    const d: any = await r.json();
    return (d.content ?? []).map((c: any) => c.text ?? '').join('').trim();
  }
  const r = await fetch(`${env.LLM_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.LLM_API_KEY}` },
    body: JSON.stringify({ model: env.LLM_MODEL, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  if (r.status === 429) throw new HttpError(429, 'rate-limited');
  if (!r.ok) throw new HttpError(502, `provider error ${r.status}`);
  const d: any = await r.json();
  return (d.choices?.[0]?.message?.content ?? '').trim();
}

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export async function handle(fn: () => Promise<Response>) {
  try { return await fn(); }
  catch (e: any) { return json({ error: e?.message ?? 'error' }, e instanceof HttpError ? e.status : 500); }
}

/** Simple per-IP rate limit using KV (optional binding). */
export async function rateLimit(env: Env, req: Request, limit = 30, windowSec = 60) {
  if (!env.RATE_LIMIT) return;
  const ip = req.headers.get('cf-connecting-ip') ?? 'anon';
  const key = `rl:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = Number((await env.RATE_LIMIT.get(key)) ?? 0) + 1;
  await env.RATE_LIMIT.put(key, String(n), { expirationTtl: windowSec * 2 });
  if (n > limit) throw new HttpError(429, 'rate-limited');
}

export function str(v: unknown, max: number): string {
  if (typeof v !== 'string') throw new HttpError(400, 'invalid input');
  return v.slice(0, max);
}
