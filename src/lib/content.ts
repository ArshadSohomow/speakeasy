import type { LangId } from './types';

export interface PronItem {
  text: string; lang: LangId; dialect?: string; meaning: string; ipa?: string; romanised?: string;
  syllables: string; stress: string; example: string; tip: string; level: 'beginner' | 'intermediate' | 'advanced';
}

export const PRON_ITEMS: PronItem[] = [
  { text: 'comfortable', lang: 'en', ipa: '/ˈkʌmf.tə.bəl/', meaning: 'Physically relaxed; at ease', syllables: 'comf · ta · ble', stress: 'COMF-ta-ble (3 syllables, not 4)', example: 'Make yourself comfortable.', tip: 'Most native speakers skip the “or” sound in the middle.', level: 'intermediate' },
  { text: 'thorough', lang: 'en', ipa: '/ˈθʌr.ə/ (UK) · /ˈθɝː.oʊ/ (US)', meaning: 'Complete and careful', syllables: 'thor · ough', stress: 'THOR-ough', example: 'She did a really thorough job.', tip: 'Start with the “th” in “think” — tongue lightly between your teeth.', level: 'intermediate' },
  { text: 'squirrel', lang: 'en', ipa: '/ˈskwɪr.əl/ (UK) · /ˈskwɝː.əl/ (US)', meaning: 'A small bushy-tailed animal', syllables: 'squir · rel', stress: 'SQUIR-rel', example: 'A squirrel ran across the path.', tip: 'The “skw” cluster is tricky: try “sk” + “wee” quickly.', level: 'advanced' },
  { text: 'world', lang: 'en', ipa: '/wɜːld/ (UK) · /wɝːld/ (US)', meaning: 'The earth and everyone on it', syllables: 'world (1 syllable)', stress: 'WORLD', example: 'It’s a small world.', tip: 'Keep it one syllable. Let the “r” (US) or long vowel (UK) flow straight into “ld”.', level: 'beginner' },
  { text: 'specifically', lang: 'en', ipa: '/spəˈsɪf.ɪ.kli/', meaning: 'In a particular, exact way', syllables: 'spe · ci · fic · ally', stress: 'spe-CI-fic-ally', example: 'I specifically asked for no onions.', tip: 'Say it slowly first: spuh-SIF-ik-lee. Don’t drop the middle “ific”.', level: 'intermediate' },
  { text: 'I would have gone', lang: 'en', ipa: '/aɪ ˈwʊd.əv ˈɡɒn/', meaning: 'Natural connected speech: “I’d’ve gone”', syllables: 'I · would · have · gone', stress: 'I WOULD-uv GONE', example: 'If you’d asked, I would have gone.', tip: 'In fast speech “would have” sounds like “would-uv”. Never write “would of”.', level: 'advanced' },
  { text: 'ferrocarril', lang: 'es', dialect: 'es-ES', ipa: '/fe.ro.kaˈril/', meaning: 'Railway', syllables: 'fe · rro · ca · rril', stress: 'fe-rro-ca-RRIL', example: 'El ferrocarril cruza todo el país.', tip: 'Two rolled “rr” sounds. Tap your tongue behind your top teeth several times.', level: 'intermediate' },
  { text: 'desarrollar', lang: 'es', dialect: 'es-ES', ipa: '/de.sa.roˈʎaɾ/', meaning: 'To develop', syllables: 'de · sa · rro · llar', stress: 'de-sa-rro-LLAR', example: 'Queremos desarrollar una app.', tip: 'Rolled “rr”, then a soft “ll” (often like “y” in Spain).', level: 'advanced' },
  { text: 'grenouille', lang: 'fr', dialect: 'fr-FR', ipa: '/ɡʁə.nuj/', meaning: 'Frog', syllables: 'gre · nouille', stress: 'Even stress, slight weight on the last syllable', example: 'Une grenouille dans le jardin.', tip: 'The French “r” comes from the back of the throat, like a soft gargle.', level: 'intermediate' },
  { text: 'Eichhörnchen', lang: 'de', dialect: 'de-DE', ipa: '/ˈaɪ̯çˌhœʁnçən/', meaning: 'Squirrel', syllables: 'Eich · hörn · chen', stress: 'EICH-hörn-chen', example: 'Ein Eichhörnchen sitzt im Baum.', tip: 'Two “ch” sounds like a cat’s hiss with a smile: “ich”.', level: 'advanced' },
  { text: 'すみません', lang: 'ja', dialect: 'ja-JP', romanised: 'sumimasen', ipa: '/sɯ.mi.ma.seɴ/', meaning: 'Excuse me / sorry', syllables: 'su · mi · ma · se · n', stress: 'Flat pitch, even timing for each beat', example: 'すみません、駅はどこですか？', tip: 'Japanese is timed by beats. The final ん is its own beat — don’t rush it.', level: 'beginner' },
];

export interface DailyWord {
  text: string; lang: LangId; dialect: string; meaning: string; translation?: string; pronunciation: string;
  example: string; casual: string[]; register: string; region: string; challenge: string;
}

export const DAILY_WORDS: DailyWord[] = [
  { text: 'to be up for (something)', lang: 'en', dialect: 'en-GB', meaning: 'To be willing or keen to do something', pronunciation: 'bee-UP-for', example: 'Are you up for a walk later?', casual: ['A: Pizza tonight?', 'B: I’m definitely up for that.'], register: 'Informal, but fine with most colleagues', region: 'Common in the UK and US', challenge: 'Say one thing you’re up for this weekend, and one thing you’re not.' },
  { text: 'to play it by ear', lang: 'en', dialect: 'en-GB', meaning: 'To decide as things happen instead of planning', pronunciation: 'play-it-by-EAR', example: 'We don’t have a plan for Sunday — let’s play it by ear.', casual: ['A: What time shall we meet?', 'B: Let’s play it by ear.'], register: 'Neutral', region: 'Widely used', challenge: 'Describe a trip where you played it by ear.' },
  { text: 'fair enough', lang: 'en', dialect: 'en-GB', meaning: 'That’s reasonable; I accept that', pronunciation: 'fair-ee-NUFF', example: 'You’re too tired to come? Fair enough.', casual: ['A: I can’t make it, sorry.', 'B: Fair enough — next time.'], register: 'Informal to neutral', region: 'Especially common in the UK and Australia', challenge: 'Respond to three excuses with “fair enough” plus a follow-up.' },
  { text: 'tener buena pinta', lang: 'es', dialect: 'es-ES', meaning: 'To look good (often food)', translation: 'To look good / promising', pronunciation: 'te-NER BWE-na PIN-ta', example: 'Esa paella tiene muy buena pinta.', casual: ['A: ¿Probamos este sitio?', 'B: Sí, tiene buena pinta.'], register: 'Informal, everyday', region: 'Very common in Spain', challenge: 'Say what has “buena pinta” in your kitchen right now.' },
  { text: 'avoir la flemme', lang: 'fr', dialect: 'fr-FR', meaning: 'To not be bothered to do something', translation: "Can't be bothered", pronunciation: 'ah-vwar la FLEM', example: "J'ai la flemme de faire les courses.", casual: ['A: On sort ce soir ?', "B: Bof, j'ai un peu la flemme."], register: 'Informal', region: 'Common in France', challenge: 'Name one thing you have “la flemme” to do today.' },
  { text: 'Feierabend', lang: 'de', dialect: 'de-DE', meaning: 'The end of the working day (and the free time after it)', translation: 'Finishing time / after-work', pronunciation: 'FY-er-ah-bent', example: 'Endlich Feierabend!', casual: ['A: Was machst du nach Feierabend?', 'B: Erstmal nichts.'], register: 'Neutral', region: 'Used across German-speaking countries', challenge: 'Describe your ideal Feierabend.' },
  { text: 'お疲れ様', lang: 'ja', dialect: 'ja-JP', meaning: 'Thanks for your hard work (said to colleagues, often when leaving)', translation: 'Good work / see you', pronunciation: 'otsukaresama', example: 'お疲れ様です！', casual: ['A: お先に失礼します。', 'B: お疲れ様です！'], register: 'Polite; very common at work', region: 'Used throughout Japan', challenge: 'Practise saying it as you leave work or class today.' },
];

export interface CuratedQuote { text: string; author: string; note?: string; meaning: string }
export const CURATED_QUOTES: CuratedQuote[] = [
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin', note: 'Poor Richard’s Almanack, 1737', meaning: 'Doing something matters more than talking about it. “Well done” here means “done properly”.' },
  { text: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein', note: 'Tractatus Logico-Philosophicus (English translation)', meaning: 'The words you have shape what you can think and express. Learning more language opens up more of the world.' },
  { text: 'Speak clearly, if you speak at all; carve every word before you let it fall.', author: 'Oliver Wendell Holmes Sr.', meaning: 'Think about your words before you say them, the way a sculptor carves carefully. “Let it fall” means “say it”.' },
  { text: 'We have two ears and one mouth so that we can listen twice as much as we speak.', author: 'Epictetus', note: 'Commonly attributed; wording varies between translations', meaning: 'Listening is at least as important as speaking — a useful reminder in any conversation.' },
  { text: 'If you talk to a man in a language he understands, that goes to his head. If you talk to him in his language, that goes to his heart.', author: 'Nelson Mandela', note: 'Widely attributed', meaning: 'Using someone’s own language shows respect and creates a stronger connection than just being understood.' },
  { text: 'Whatever is well conceived is clearly said, and the words to say it flow with ease.', author: 'Nicolas Boileau', note: 'L’Art poétique, 1674 (English translation)', meaning: 'If you understand your idea clearly, the words to express it come more easily.' },
];

export function dayIndex(date = new Date()) {
  const start = Date.UTC(2026, 0, 1);
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000);
}
export function pickDaily<T>(items: T[], salt = 0): T {
  const i = Math.abs(dayIndex() + salt) % items.length;
  return items[i];
}
export function itemsFor<T extends { lang: LangId }>(items: T[], lang: LangId): T[] {
  const f = items.filter((i) => i.lang === lang);
  return f.length ? f : items.filter((i) => i.lang === 'en');
}
