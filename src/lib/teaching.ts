import type { Feedback, FeedbackCategory, LangId } from './types';

/**
 * Demo teaching engine: a small, curated rule set that evaluates a learner
 * utterance against its likely intended meaning. It is intentionally
 * conservative — it only flags patterns it is confident about, and reports a
 * confidence level. Production replaces this with /api/feedback (LLM + the
 * validated expression knowledge base), using the same Feedback schema.
 */

interface Rule {
  lang: LangId;
  dialects?: string[];
  re: RegExp;
  pattern: string;
  label: string;
  category: FeedbackCategory;
  affectsMeaning: boolean;
  confidence: Feedback['confidence'];
  fix: (m: RegExpMatchArray, text: string) => string;
  intended: (m: RegExpMatchArray, text: string) => string;
  explanation: string;
  naturalness: string;
  casual?: { text: string; note: string };
  register?: string;
}

const PAST: Record<string, string> = { go: 'went', eat: 'ate', see: 'saw', have: 'had', do: 'did', make: 'made', buy: 'bought', meet: 'met', come: 'came', take: 'took', watch: 'watched', play: 'played', visit: 'visited', cook: 'cooked', work: 'worked', drink: 'drank', get: 'got', find: 'found', think: 'thought', say: 'said', tell: 'told', write: 'wrote', read: 'read', run: 'ran', sleep: 'slept', walk: 'walked', talk: 'talked', stay: 'stayed', try: 'tried', study: 'studied', listen: 'listened', spend: 'spent', leave: 'left', feel: 'felt' };
const PAST_RE = Object.keys(PAST).join('|');
const UNPAST: Record<string, string> = { went: 'go', ate: 'eat', saw: 'see', had: 'have', did: 'do', made: 'make', bought: 'buy', met: 'meet', came: 'come', took: 'take', got: 'get', found: 'find', thought: 'think', said: 'say', told: 'tell', wrote: 'write' };

const RULES: Rule[] = [
  {
    lang: 'en', re: new RegExp(`\\b(yesterday|last (?:night|week|weekend|year|month)|(?:two|three|a few) days ago)\\b([^.?!]*?)\\b(i|we|they|you)\\s+(${PAST_RE})\\b`, 'i'),
    pattern: 'en-past-simple', label: 'Past tense for finished time', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(new RegExp(`\\b${m[3]}\\s+${m[4]}\\b`, 'i'), `${m[3]} ${PAST[m[4].toLowerCase()]}`),
    intended: (m) => `Something that happened ${m[1].toLowerCase()}.`,
    explanation: 'Use the past simple for a finished time like “yesterday”: go → went, eat → ate.',
    naturalness: 'Understandable, but the verb should be in the past.',
  },
  {
    lang: 'en', re: new RegExp(`\\b(i|we|they|you)\\s+(${PAST_RE})\\b([^.?!]*?)\\b(yesterday|last (?:night|week|weekend|year|month)|(?:two|three|a few) days ago)\\b`, 'i'),
    pattern: 'en-past-simple', label: 'Past tense for finished time', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(new RegExp(`\\b${m[1]}\\s+${m[2]}\\b`, 'i'), `${m[1]} ${PAST[m[2].toLowerCase()]}`),
    intended: (m) => `Something that happened ${m[4].toLowerCase()}.`,
    explanation: 'Use the past simple for a finished time like “yesterday”: go → went, eat → ate.',
    naturalness: 'Understandable, but the verb should be in the past.',
  },
  {
    lang: 'en', re: /\bdid (you|he|she|they|we|i) (went|ate|saw|had|did|made|bought|met|came|took|got|found|thought|said|told|wrote)\b/i,
    pattern: 'en-did-base', label: '“Did” + base verb', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `did ${m[1]} ${UNPAST[m[2].toLowerCase()]}`),
    intended: () => 'A question about the past.',
    explanation: 'After “did”, use the base verb: “Did you go?”, not “Did you went?”. “Did” already shows the past.',
    naturalness: 'Clear, but grammatically incorrect.',
  },
  {
    lang: 'en', re: /\bi am agree\b|\bi'm agree\b/i, pattern: 'en-agree', label: '“I agree”, not “I am agree”', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], 'I agree'), intended: () => 'You share the same opinion.',
    explanation: '“Agree” is a verb in English, so it doesn’t need “am”.', naturalness: 'Very common learner mistake; people will understand you.',
  },
  {
    lang: 'en', re: /\bi have (\d+|twenty|thirty|forty|eighteen|nineteen) years\b(?! of)/i, pattern: 'en-age', label: 'Saying your age', category: 'incorrect', affectsMeaning: true, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `I'm ${m[1]}`), intended: (m) => `You are ${m[1]} years old.`,
    explanation: 'In English you “are” an age: “I’m 25” or “I’m 25 years old”.', naturalness: 'Understandable, but sounds like a direct translation.',
  },
  {
    lang: 'en', re: /\bpeople is\b/i, pattern: 'en-people-plural', label: '“People” is plural', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], 'people are'), intended: () => 'A statement about people in general.',
    explanation: '“People” takes a plural verb: “people are”, “people were”.', naturalness: 'Understandable, but grammatically incorrect.',
  },
  {
    lang: 'en', re: /\bmore (better|easier|bigger|faster|cheaper|harder|worse)\b/i, pattern: 'en-double-comparative', label: 'Double comparative', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], m[1]), intended: () => 'A comparison.',
    explanation: '“Better”, “easier”, etc. are already comparative, so you don’t need “more”.', naturalness: 'Understandable; sounds non-native.',
  },
  {
    lang: 'en', re: /\b(he|she|it) (go|like|want|have|do|need|work|live|play|think|know)\b(?! to\b)/i, pattern: 'en-third-person-s', label: 'He/she/it + -s', category: 'incorrect', affectsMeaning: false, confidence: 'medium',
    fix: (m, t) => t.replace(m[0], `${m[1]} ${{ go: 'goes', have: 'has', do: 'does' }[m[2].toLowerCase()] ?? m[2] + 's'}`),
    intended: () => 'Something about another person.', explanation: 'In the present simple, add -s after he/she/it: “she likes”, “he goes”, “it has”.', naturalness: 'Easy to understand; small grammar slip.',
  },
  {
    lang: 'en', re: /\bi('m| am) (so |very |really )?boring\b/i, pattern: 'en-bored-boring', label: '“Bored” vs “boring”', category: 'incorrect', affectsMeaning: true, confidence: 'medium',
    fix: (m, t) => t.replace(m[0], `I'm ${m[2] ?? ''}bored`.replace('  ', ' ')), intended: () => 'You feel bored (probably!).',
    explanation: '“I’m bored” = I feel bored. “I’m boring” = I make other people bored. If you meant how you feel, use “bored”.', naturalness: 'Changes the meaning — worth fixing.',
  },
  {
    lang: 'en', re: /\bexplain me\b/i, pattern: 'en-explain-to', label: '“Explain to me”', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], 'explain to me'), intended: () => 'Asking someone to explain something.',
    explanation: '“Explain” needs “to” before the person: “Can you explain it to me?”', naturalness: 'Understandable; sounds non-native.',
  },
  {
    lang: 'en', re: /\b(make|made|making) (a |some )?(photo|photos|picture|pictures)\b/i, pattern: 'en-take-photo', label: '“Take” a photo', category: 'unnatural', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `${{ make: 'take', made: 'took', making: 'taking' }[m[1].toLowerCase()]} ${m[2] ?? ''}${m[3]}`), intended: () => 'Using a camera.',
    explanation: 'English speakers “take” photos. “Make a photo” is understandable but sounds translated.', naturalness: 'Correct meaning, but not what most people say.',
  },
  {
    lang: 'en', re: /\b(open|close) the (light|lights|tv|television)\b/i, pattern: 'en-turn-on', label: '“Turn on/off” for devices', category: 'unnatural', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `turn ${m[1].toLowerCase() === 'open' ? 'on' : 'off'} the ${m[2]}`), intended: () => 'Switching a device on or off.',
    explanation: 'For lights and devices, English uses “turn on/off” or “switch on/off”.', naturalness: 'People will understand, but it sounds unusual.',
  },
  {
    lang: 'en', re: /\bsince (\d+|two|three|four|five|six|ten) (years|months|weeks|days)\b/i, pattern: 'en-for-since', label: '“For” a period, “since” a point', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `for ${m[1]} ${m[2]}`), intended: () => 'How long something has lasted.',
    explanation: 'Use “for” with a length of time (for three years) and “since” with a starting point (since 2021).', naturalness: 'Understandable; a common mix-up.',
  },
  {
    lang: 'en', re: /\b(it|the party|the film|the movie|the concert|the trip|the night) was very good\b/i, pattern: 'en-very-good-event', label: 'Livelier ways to say “very good”', category: 'unnatural', affectsMeaning: false, confidence: 'medium',
    fix: (m, t) => t.replace(m[0], `${m[1]} was great`), intended: () => 'You enjoyed it.',
    explanation: '“Very good” is correct, but for events people more often say “great”, “brilliant” (UK) or “amazing”.', naturalness: 'Correct but a bit flat for describing something fun.',
    casual: { text: 'It was brilliant! / It was amazing!', note: '“Brilliant” in this sense is especially British.' },
  },
  // Spanish
  {
    lang: 'es', re: /\b(fiesta|película|peli|noche|cena|concierto|viaje)\b([^.?!]*?)\bfue muy (buena|bueno)\b/i, pattern: 'es-estuvo-genial', label: 'Describing how an event went', category: 'unnatural', affectsMeaning: false, confidence: 'medium',
    fix: (m, t) => t.replace(/fue muy (buena|bueno)/i, 'estuvo genial'), intended: () => 'You enjoyed the event.',
    explanation: '“Estuvo genial” is a natural way to describe how an event went. “Fue muy buena” is understandable but less idiomatic here.',
    naturalness: 'Understandable, less idiomatic in this context.',
    casual: { text: '¡Estuvo guapísimo!', note: 'Colloquial and context-dependent; usage varies by region and age. Not a universal expression.' },
  },
  {
    lang: 'es', re: /\b(?:yo )?(soy|estoy) (\d+|veinte|treinta|cuarenta) años\b/i, pattern: 'es-tener-edad', label: 'Age uses “tener”', category: 'incorrect', affectsMeaning: true, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `tengo ${m[2]} años`), intended: (m) => `You are ${m[2]} years old.`,
    explanation: 'In Spanish you “have” years: “Tengo 25 años”.', naturalness: 'Understandable, but sounds translated.',
  },
  {
    lang: 'es', re: /\bayer (yo )?(voy|como|veo|hago|tengo)\b/i, pattern: 'es-preterito', label: 'Past tense with “ayer”', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `ayer ${({ voy: 'fui', como: 'comí', veo: 'vi', hago: 'hice', tengo: 'tuve' } as Record<string, string>)[m[2].toLowerCase()]}`), intended: () => 'Something that happened yesterday.',
    explanation: 'With “ayer”, use the preterite: voy → fui, como → comí.', naturalness: 'Understandable, but the tense is wrong.',
  },
  {
    lang: 'es', re: /\bestoy caliente\b/i, pattern: 'es-tengo-calor', label: '“Tengo calor” for feeling hot', category: 'register', affectsMeaning: true, confidence: 'high',
    fix: (m, t) => t.replace(m[0], 'tengo calor'), intended: () => 'You feel hot because of the temperature.',
    explanation: 'For the weather or temperature, say “tengo calor”. “Estoy caliente” can be understood in a very different, embarrassing way.', naturalness: 'Register-sensitive: may cause an awkward misunderstanding.',
  },
  // French
  {
    lang: 'fr', re: /\bje suis (\d+|vingt|trente) ans\b/i, pattern: 'fr-avoir-age', label: 'Age uses “avoir”', category: 'incorrect', affectsMeaning: true, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `j'ai ${m[1]} ans`), intended: (m) => `You are ${m[1]} years old.`,
    explanation: 'In French you “have” years: “J’ai 25 ans”.', naturalness: 'Understandable, but incorrect.',
  },
  {
    lang: 'fr', re: /\bà le\b/i, pattern: 'fr-au', label: '“À le” → “au”', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], 'au'), intended: () => 'Going to or being at a place.',
    explanation: '“À” + “le” always combines into “au” (au cinéma, au restaurant).', naturalness: 'Noticeable mistake.',
  },
  // German
  {
    lang: 'de', re: /\bich habe (gegangen|gefahren|gekommen|geflogen)\b/i, pattern: 'de-sein-perfekt', label: 'Movement verbs use “sein”', category: 'incorrect', affectsMeaning: false, confidence: 'high',
    fix: (m, t) => t.replace(m[0], `ich bin ${m[1]}`), intended: () => 'You went somewhere.',
    explanation: 'Verbs of movement form the perfect with “sein”: “Ich bin gegangen”.', naturalness: 'Understandable; a common mistake.',
  },
];

let counter = 0;
export function evaluateUtterance(text: string, lang: LangId, dialect: string): Feedback[] {
  const out: Feedback[] = [];
  const seen = new Set<string>();
  for (const r of RULES) {
    if (r.lang !== lang) continue;
    if (r.dialects && !r.dialects.includes(dialect)) continue;
    const m = text.match(r.re);
    if (!m || seen.has(r.pattern)) continue;
    seen.add(r.pattern);
    let fixed = r.fix(m, text).replace(/\s+/g, ' ').trim();
    fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
    if (!/[.?!]$/.test(fixed)) fixed += '.';
    out.push({
      id: `fb${++counter}`, originalText: text, matched: m[0], intendedMeaning: r.intended(m, text),
      grammarAssessment: r.category === 'incorrect' ? 'needs-correction' : 'ok', category: r.category,
      naturalnessAssessment: r.naturalness, suggestedAlternative: fixed, casualAlternative: r.casual,
      explanation: r.explanation, language: lang, dialect, register: r.register, confidence: r.confidence,
      affectsMeaning: r.affectsMeaning, pattern: r.pattern,
    });
  }
  return out;
}

export function ruleLabel(pattern: string) { return RULES.find((r) => r.pattern === pattern)?.label ?? pattern; }

export const CATEGORY_INFO: Record<FeedbackCategory, { label: string; tone: 'improve' | 'neutral' | 'positive' }> = {
  incorrect: { label: 'Needs correcting', tone: 'improve' },
  unnatural: { label: 'Correct but unnatural', tone: 'neutral' },
  natural: { label: 'Natural and neutral', tone: 'positive' },
  informal: { label: 'Informal', tone: 'neutral' },
  slang: { label: 'Slang', tone: 'neutral' },
  regional: { label: 'Regional', tone: 'neutral' },
  register: { label: 'Register-sensitive', tone: 'improve' },
};
