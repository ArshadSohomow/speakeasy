# Speakeasy

AI-powered language fluency, conversation and voice coaching. Practise real conversations with five AI coaches, learn how people actually speak in different regions, and turn messy speech into clean text.

**This is the demo build.** It runs fully in the browser with no paid services connected, and every feature that needs a real service has an honest fallback. See `/about` in the app for a live “what’s real” table.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite | Typed components, fast static build for Cloudflare Pages |
| Routing | Tiny history router (`src/lib/router.tsx`) | No dependency; SPA fallback is automatic on Pages |
| State | `useSyncExternalStore` store persisted to `localStorage` (`src/lib/store.ts`) | Guest demo data stays in the browser, separate from production data |
| Speech (demo) | Web Speech API recognition + `speechSynthesis` (`src/lib/speech.ts`) | Works today in Chrome, Edge, Safari; swappable provider interface |
| Backend | Cloudflare Pages Functions (`functions/api/*`) | Server-side keys, same deploy as the site |
| Database | Cloudflare D1 (`migrations/0001_init.sql`) | Relational, serverless; R2 only for opt-in recordings |

## Project structure

```
src/
  lib/            catalog (languages, dialects, mascots, scenarios), store, speech adapters,
                  textProcessing (Voice Studio pipeline), teaching (feedback engine),
                  conversation (demo + API engines), analysis (speaking metrics), srs
  components/     Mascot (SVG coaches), Icon, ui (dialogs, toasts, charts, audio), MicCheck, hooks
  pages/          Landing, Onboarding, Shell, Home, Conversation, Studio, Pronunciation,
                  Speaking, Vocabulary, Daily, Progress, Settings, Info
functions/api/    health, converse, feedback, transform (LLM adapters)
migrations/       D1 schema
tests/            unit tests (Vitest) + e2e (Playwright)
```

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests
npm run build        # outputs dist/
```

To run the API functions locally: `npx wrangler pages dev dist` (put secrets in `.dev.vars`, see `.dev.vars.example`).

E2E: `npm run build && npx vite preview --port 4173`, then `npx playwright test tests/e2e`.

## Deploying to Cloudflare Pages

**Option A — Git integration (recommended):** Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
- Build command: `npm run build`
- Build output directory: `dist`
- Functions in `functions/` deploy automatically.

**Option B — CLI:** `npx wrangler login` then `npm run deploy`.

**Option C — Direct upload:** upload the `dist` folder (or a zip of its contents) in the dashboard. Note: direct uploads from the dashboard don’t include Pages Functions, so the app stays in demo mode — which is fine for the demo.

### Turning on the real AI coach

Set these in Pages → Settings → Variables and Secrets (Production):

| Variable | Example | Notes |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` or `openai` | Any OpenAI-compatible API works with `openai` + `LLM_BASE_URL` |
| `LLM_API_KEY` | (secret) | Never committed; only read server-side |
| `LLM_MODEL` | `claude-sonnet-5-5` | Model id for your provider |
| `LLM_BASE_URL` | optional | For OpenAI-compatible providers |

Once set, `/api/health` reports `llm: true` and the Conversation Coach switches from “Demo coach (scripted)” to “Live AI” automatically, falling back to the demo engine on errors or rate limits.

Optional bindings: `DB` (D1, `wrangler d1 create speakeasy` then `wrangler d1 migrations apply speakeasy --remote`) and `RATE_LIMIT` (KV namespace for per-IP limits).

## GitHub

```bash
git init && git add . && git commit -m "Speakeasy demo"
git branch -M main
git remote add origin https://github.com/<you>/speakeasy.git
git push -u origin main
```

Then connect the repo in Cloudflare (Option A) for automatic deploys on every push.

## What works, what’s simulated, what’s next

| Feature | Works now | Simulated / needs credentials | Next |
|---|---|---|---|
| Landing, onboarding (7 steps), navigation, light/dark themes | ✅ | — | Accounts |
| Mascot and language audio | ✅ device voices; refuses to fake a missing language voice | Neural voices need a TTS provider | Licensed per-dialect voices |
| Conversation Coach | ✅ hands-free voice loop, barge-in, translation, explain, roleplays, adaptive difficulty, summaries | Replies are scripted until `LLM_API_KEY` is set | Retrieval from validated expression KB |
| Corrections / naturalness | ✅ rule engine for common EN + starter ES/FR/DE patterns, with confidence | Broad coverage via `/api/feedback` | Native-speaker review workflow |
| Voice Studio | ✅ live transcript, verbatim/clean/polished, filler rules (“I like the design” is kept), self-corrections, 12 formats, voice commands, diff accept/reject, undo/redo, export | Hard rewrites via `/api/transform` | Streaming STT provider |
| Pronunciation | ✅ reference audio, record + replay, word-level recognition check | Phoneme scoring needs a pronunciation API | — |
| Speaking practice | ✅ timer, pace, fillers, pauses (approx.), transitions, evidence | — | Acoustic measures where validated |
| Vocabulary | ✅ SM-2 style spaced review with recall/listen/use tasks | — | Cross-device sync |
| Daily + community quotes | ✅ local pool with votes, reporting, consent | Shared pool needs D1 + moderation | Moderation queue |
| Progress | ✅ from real sessions; sample data is labelled and removable | — | Server analytics |

## Required third-party accounts (production)

- Cloudflare (Pages, D1, optional KV/R2)
- An LLM provider (Anthropic or OpenAI-compatible)
- Optional: a streaming speech-to-text provider and a neural TTS provider (implement `RecognitionProvider` in `src/lib/speech.ts` behind a Worker that holds the key)
- An auth provider (e.g. Cloudflare Access, Clerk, Auth.js) for real accounts

## Privacy

Microphone is requested only on user action. Demo recognition is done by the browser (Chrome/Edge send audio to their vendor’s service). Recordings are off by default and kept only in the open tab. All guest data is in `localStorage` and can be exported or deleted from Settings.
