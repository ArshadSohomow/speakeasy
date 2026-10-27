export type LangId = 'en' | 'es' | 'fr' | 'de' | 'ja';
export type MascotId = 'theodore' | 'milo' | 'kai' | 'ace' | 'sterling';
export type Personality =
  | 'relaxed' | 'funny' | 'outgoing' | 'reserved' | 'thoughtful' | 'sarcastic' | 'encouraging' | 'professional';
export type Difficulty = 'beginner' | 'everyday' | 'intermediate' | 'advanced' | 'adaptive';
export type CorrectionStyle = 'gentle' | 'balanced' | 'detailed';
export type Speed = 'slow' | 'normal' | 'natural';
export type Level = 'complete-beginner' | 'beginner' | 'intermediate' | 'upper-intermediate' | 'advanced' | 'unsure';
export type Theme = 'system' | 'light' | 'dark';

/** Honest description of how complete a dialect is in this build. */
export type ContentStatus = 'demo-core' | 'demo-starter' | 'preview';

export interface Dialect {
  id: string;            // BCP-47, e.g. es-ES
  label: string;         // "Spain"
  voiceLangs: string[];  // acceptable TTS voice langs, best first
  recognitionLang: string;
  registers: ('formal' | 'informal')[];
  contentStatus: ContentStatus;
  note?: string;
  greeting: { natural: string; romanised?: string; translation: string; note: string };
}

export interface Language {
  id: LangId;
  name: string;
  nativeName: string;
  mark: string; // short visual identifier
  levels: Level[];
  dialects: Dialect[];
}

export interface Mascot {
  id: MascotId;
  name: string;
  animal: string;
  oneLiner: string;
  style: string;
  sample: string;
  strengths: string[];
  teachingStyle: string;
  accent: 'lavender' | 'coral' | 'mint' | 'sky' | 'yellow';
  voice: { pitch: number; rate: number };
  defaultPersonality: Personality;
}

export type FeedbackCategory =
  | 'incorrect' | 'unnatural' | 'natural' | 'informal' | 'slang' | 'regional' | 'register';

export interface Feedback {
  id: string;
  originalText: string;
  matched: string;
  intendedMeaning: string;
  grammarAssessment: 'ok' | 'needs-correction';
  category: FeedbackCategory;
  naturalnessAssessment: string;
  suggestedAlternative: string;
  casualAlternative?: { text: string; note: string };
  explanation: string;
  language: LangId;
  dialect: string;
  register?: string;
  confidence: 'high' | 'medium' | 'low';
  affectsMeaning: boolean;
  pattern: string; // recurring-error key
}

export type VocabStatus = 'new' | 'learning' | 'familiar' | 'difficult';
export type VocabSource = 'conversation' | 'daily' | 'pronunciation' | 'explain' | 'manual' | 'studio';

export interface VocabEntry {
  id: string;
  text: string;
  meaning: string;
  lang: LangId;
  dialect: string;
  context: string;
  example: string;
  source: VocabSource;
  regional?: boolean;
  addedAt: number;
  status: VocabStatus;
  reviews: number;
  lapses: number;
  ease: number;
  intervalDays: number;
  lastReviewed?: number;
  nextReview: number;
  sample?: boolean;
}

export type SessionKind = 'conversation' | 'speaking' | 'pronunciation' | 'studio' | 'review';

export interface Session {
  id: string;
  kind: SessionKind;
  title: string;
  startedAt: number;
  durationSec: number;
  words: number;
  fillers: number;
  repetitions: number;
  wpm?: number;
  lang: LangId;
  mascot?: MascotId;
  summary?: string;
  errors?: string[]; // pattern keys
  recalled?: number;
  sample?: boolean;
}

export interface StudioDoc {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  raw: string;
  output: string;
  mode: 'verbatim' | 'clean' | 'polished';
  format: string;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  kind: 'curated' | 'submitted' | 'original';
  attribution?: string;
  visibility: 'private' | 'community';
  createdAt: number;
  votes: number;
  sample?: boolean;
  reported?: boolean;
  status?: 'pending' | 'eligible' | 'featured';
}
