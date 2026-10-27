import { useSyncExternalStore } from 'react';
import type {
  LangId, MascotId, Personality, Difficulty, CorrectionStyle, Speed, Level, Theme,
  VocabEntry, Session, StudioDoc, Quote,
} from './types';

export interface Profile {
  name: string;
  targetLang: LangId;
  dialect: string;
  supportLang: string;
  level: Level;
  goals: string[];
  mascot: MascotId;
  personality: Personality;
  difficulty: Difficulty;
  correction: CorrectionStyle;
  speed: Speed;
  explainInSupport: boolean;
  practiceStyle: 'relaxed' | 'structured' | 'mixed';
  feedbackTiming: 'during' | 'after';
  speechSupportMode: boolean; // communication-first mode for stuttering / speech differences
  feedbackFocus: { pace: boolean; pauses: boolean; repetitions: boolean; fillers: boolean; clarity: boolean };
  theme: Theme;
  keepRecordings: boolean;
  interests: string[];
  reduceMotion: boolean;
  handsFree: boolean;
}

export interface FillerPrefs {
  basic: 'remove' | 'highlight' | 'keep';      // um, uh, er
  discourse: 'remove' | 'highlight' | 'keep';  // like, you know (when used as fillers)
  repetitions: 'remove' | 'highlight' | 'keep';
  hesitations: 'remove' | 'highlight' | 'keep';
  spokenPunctuation: boolean;
  voiceCommands: boolean;
}

export interface ErrorPattern { key: string; label: string; count: number; lastSeen: number; example: string; fix: string }

export interface AppState {
  version: 1;
  onboarded: boolean;
  onboardingStep: number;
  profile: Profile;
  fillerPrefs: FillerPrefs;
  vocab: VocabEntry[];
  sessions: Session[];
  studioDocs: StudioDoc[];
  quotes: Quote[];
  votes: Record<string, true>;
  errorPatterns: Record<string, ErrorPattern>;
  pronAttempts: { text: string; at: number; matched: number; total: number }[];
  dailyDone: Record<string, string[]>; // date -> task ids
  micState: 'unknown' | 'granted' | 'denied' | 'unavailable';
  textOnly: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  targetLang: 'en', dialect: 'en-GB', supportLang: 'en', level: 'unsure', goals: [],
  mascot: 'kai', personality: 'relaxed', difficulty: 'adaptive', correction: 'balanced', speed: 'normal',
  explainInSupport: false, practiceStyle: 'mixed', feedbackTiming: 'after', speechSupportMode: false,
  feedbackFocus: { pace: true, pauses: true, repetitions: true, fillers: true, clarity: true },
  theme: 'system', keepRecordings: false, interests: [], reduceMotion: false, handsFree: true,
};

const SAMPLE_QUOTES: Quote[] = [
  { id: 'cq1', text: 'Every conversation is a rehearsal for a braver one.', author: 'Sample learner', kind: 'original', visibility: 'community', createdAt: Date.now() - 86400000 * 2, votes: 41, sample: true, status: 'eligible' },
  { id: 'cq2', text: 'Mistakes are proof that you’re talking, not just thinking about it.', author: 'Sample learner', kind: 'original', visibility: 'community', createdAt: Date.now() - 86400000, votes: 57, sample: true, status: 'eligible' },
  { id: 'cq3', text: 'Speak slowly; the right words are worth the wait.', author: 'Sample learner', kind: 'original', visibility: 'community', createdAt: Date.now() - 3600000 * 5, votes: 23, sample: true, status: 'eligible' },
];

export const DEFAULT_STATE: AppState = {
  version: 1, onboarded: false, onboardingStep: 0, profile: DEFAULT_PROFILE,
  fillerPrefs: { basic: 'remove', discourse: 'highlight', repetitions: 'remove', hesitations: 'highlight', spokenPunctuation: true, voiceCommands: true },
  vocab: [], sessions: [], studioDocs: [], quotes: SAMPLE_QUOTES, votes: {}, errorPatterns: {}, pronAttempts: [], dailyDone: {},
  micState: 'unknown', textOnly: false,
};

const KEY = 'speakeasy.v1';
let storageOk = true;

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE, ...parsed,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}), feedbackFocus: { ...DEFAULT_PROFILE.feedbackFocus, ...(parsed.profile?.feedbackFocus || {}) } },
      fillerPrefs: { ...DEFAULT_STATE.fillerPrefs, ...(parsed.fillerPrefs || {}) },
    };
  } catch {
    storageOk = false;
    return DEFAULT_STATE;
  }
}

let state: AppState = typeof window !== 'undefined' ? load() : DEFAULT_STATE;
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch { storageOk = false; }
}

export function getState() { return state; }
export function isStorageAvailable() { return storageOk; }
export function setState(update: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const patch = typeof update === 'function' ? update(state) : update;
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}
export function setProfile(patch: Partial<Profile>) {
  setState((s) => ({ profile: { ...s.profile, ...patch } }));
}
export function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(DEFAULT_STATE));
}
export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  state = DEFAULT_STATE;
  listeners.forEach((l) => l());
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function addSession(s: Omit<Session, 'id'>) {
  const session = { ...s, id: uid() };
  setState((st) => ({ sessions: [...st.sessions, session] }));
  return session;
}

export function recordErrors(items: { pattern: string; label: string; example: string; fix: string }[]) {
  if (!items.length) return;
  setState((s) => {
    const next = { ...s.errorPatterns };
    for (const i of items) {
      const prev = next[i.pattern];
      next[i.pattern] = { key: i.pattern, label: i.label, count: (prev?.count ?? 0) + 1, lastSeen: Date.now(), example: i.example, fix: i.fix };
    }
    return { errorPatterns: next };
  });
}

export function markDaily(task: string) {
  const d = new Date().toISOString().slice(0, 10);
  setState((s) => {
    const done = new Set(s.dailyDone[d] ?? []);
    done.add(task);
    return { dailyDone: { ...s.dailyDone, [d]: [...done] } };
  });
}
export function dailyDoneToday(s: AppState) { return s.dailyDone[new Date().toISOString().slice(0, 10)] ?? []; }
