-- Speakeasy D1 schema (production). Apply with:
--   npx wrangler d1 migrations apply speakeasy --remote
-- Audio is never stored in D1. Optional recordings go to R2 only with explicit consent.

CREATE TABLE users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, display_name TEXT, created_at INTEGER NOT NULL, deleted_at INTEGER
);
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_lang TEXT NOT NULL, dialect TEXT NOT NULL, support_lang TEXT NOT NULL, level TEXT, goals TEXT,
  mascot TEXT, personality TEXT, difficulty TEXT, correction TEXT, speed TEXT, feedback_timing TEXT,
  speech_support_mode INTEGER DEFAULT 0, feedback_focus TEXT, theme TEXT, keep_recordings INTEGER DEFAULT 0, updated_at INTEGER
);
CREATE TABLE languages (id TEXT PRIMARY KEY, name TEXT NOT NULL, native_name TEXT);
CREATE TABLE dialects (
  id TEXT PRIMARY KEY, language_id TEXT NOT NULL REFERENCES languages(id), label TEXT NOT NULL,
  voice_langs TEXT, recognition_lang TEXT, content_status TEXT NOT NULL CHECK (content_status IN ('validated','starter','preview'))
);
CREATE TABLE mascots (id TEXT PRIMARY KEY, name TEXT NOT NULL, config TEXT NOT NULL);
CREATE TABLE conversation_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, dialect TEXT, mascot TEXT, scenario TEXT,
  started_at INTEGER NOT NULL, ended_at INTEGER, summary TEXT
);
CREATE INDEX idx_conv_user ON conversation_sessions(user_id, started_at);
CREATE TABLE conversation_turns (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','coach')), text TEXT NOT NULL, translation TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX idx_turns_session ON conversation_turns(session_id, created_at);
CREATE TABLE transcripts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT, created_at INTEGER NOT NULL, updated_at INTEGER
);
CREATE TABLE transcript_revisions (
  id TEXT PRIMARY KEY, transcript_id TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('verbatim','clean','polished')), format TEXT, text TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE speaking_assessments (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, mode TEXT, prompt TEXT,
  duration_sec INTEGER, words INTEGER, wpm INTEGER, fillers INTEGER, repetitions INTEGER, long_pauses INTEGER, report TEXT,
  recording_key TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE pronunciation_attempts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item TEXT NOT NULL, dialect TEXT,
  matched INTEGER, total INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE vocabulary_entries (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, meaning TEXT,
  lang TEXT, dialect TEXT, context TEXT, example TEXT, source TEXT, regional INTEGER DEFAULT 0, status TEXT DEFAULT 'new',
  reviews INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, ease REAL DEFAULT 2.5, interval_days INTEGER DEFAULT 0,
  last_reviewed INTEGER, next_review INTEGER, created_at INTEGER NOT NULL, UNIQUE (user_id, lang, text)
);
CREATE INDEX idx_vocab_due ON vocabulary_entries(user_id, next_review);
CREATE TABLE vocabulary_reviews (
  id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE, grade TEXT NOT NULL, task TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE learning_insights (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, pattern TEXT NOT NULL, count INTEGER DEFAULT 1,
  example TEXT, fix TEXT, last_seen INTEGER, UNIQUE (user_id, pattern)
);
CREATE TABLE daily_challenges (id TEXT PRIMARY KEY, date TEXT NOT NULL, lang TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL, UNIQUE (date, lang, kind));
CREATE TABLE quote_submissions (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, text TEXT NOT NULL, author TEXT, kind TEXT NOT NULL CHECK (kind IN ('curated','submitted','original')),
  visibility TEXT NOT NULL DEFAULT 'private', status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','eligible','featured','rejected')),
  reports INTEGER DEFAULT 0, consent_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX idx_quotes_status ON quote_submissions(status, created_at);
CREATE TABLE quote_votes (quote_id TEXT NOT NULL REFERENCES quote_submissions(id) ON DELETE CASCADE, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (quote_id, user_id));
CREATE TABLE content_sources (id TEXT PRIMARY KEY, name TEXT NOT NULL, licence TEXT NOT NULL, url TEXT, notes TEXT);
CREATE TABLE expression_knowledge (
  id TEXT PRIMARY KEY, phrase TEXT NOT NULL, lang TEXT NOT NULL, dialect TEXT NOT NULL, data TEXT NOT NULL,
  source_id TEXT REFERENCES content_sources(id), validation TEXT NOT NULL DEFAULT 'unvalidated' CHECK (validation IN ('unvalidated','in-review','validated','rejected')),
  confidence REAL, last_reviewed INTEGER
);
CREATE INDEX idx_expr_lookup ON expression_knowledge(lang, dialect, validation);
CREATE TABLE user_consents (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, granted INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (user_id, kind));
CREATE TABLE usage_events (id TEXT PRIMARY KEY, user_id TEXT, kind TEXT NOT NULL, meta TEXT, at INTEGER NOT NULL);
