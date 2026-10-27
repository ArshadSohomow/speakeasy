import type { LangId, MascotId, Personality, Difficulty } from './types';
import type { Scenario } from './catalog';
import { getDialect } from './catalog';

export interface Turn { role: 'coach' | 'user'; text: string; translation?: string; at: number; topic?: string }
export interface ConvContext {
  lang: LangId; dialect: string; mascot: MascotId; personality: Personality; difficulty: Difficulty;
  scenario?: Scenario; history: Turn[]; name?: string; level?: string;
}
export interface Reply { text: string; translation?: string; topic?: string; source: 'demo' | 'api' }

export interface ConversationEngine {
  id: 'demo' | 'api';
  opening(ctx: ConvContext): Reply;
  reply(ctx: ConvContext, user: string): Promise<Reply>;
}

/* ----------------------------- helpers ----------------------------- */

const pick = <T>(a: T[], seed: number) => a[Math.abs(seed) % a.length];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export function flipPronouns(s: string) {
  const map: Record<string, string> = { my: 'your', i: 'you', me: 'you', mine: 'yours', "i'm": "you're", am: 'are', we: 'you', our: 'your', us: 'you', myself: 'yourself', "i've": "you've", "i'll": "you'll" };
  return s.split(' ').map((w) => map[w.toLowerCase()] ?? w).join(' ');
}

const TOPICS: Record<string, RegExp> = {
  food: /\b(food|eat|ate|eating|dinner|lunch|breakfast|restaurant|cook|cooked|cooking|pizza|pasta|sushi|curry|coffee|tea|cake|meal|hungry|delicious|recipe|burger|bake|baked|ordered|takeaway)\b/i,
  music: /\b(music|song|songs|band|concert|gig|album|listen|listening|singer|guitar|piano|playlist|spotify|festival|rap|rock|pop|jazz)\b/i,
  work: /\b(work|job|office|boss|colleague|colleagues|meeting|meetings|project|deadline|client|manager|career|shift|interview|company|team)\b/i,
  study: /\b(study|studying|exam|exams|school|university|uni|college|class|classes|homework|course|lecture|teacher|essay)\b/i,
  travel: /\b(travel|travelling|traveling|trip|holiday|vacation|flight|airport|hotel|beach|abroad|visit|visited|city|country|train|tour)\b/i,
  sport: /\b(gym|run|running|ran|football|soccer|tennis|swim|swimming|yoga|walk|walked|hike|hiking|match|team|cycling|bike|workout|exercise)\b/i,
  film: /\b(film|films|movie|movies|series|show|netflix|watched|watching|episode|cinema|tv|documentary|anime)\b/i,
  friends: /\b(friend|friends|mate|mates|party|parties|birthday|wedding|hang out|hung out|catch up|girlfriend|boyfriend|partner)\b/i,
  family: /\b(family|mum|mom|dad|parents|brother|sister|kids|children|son|daughter|grandma|grandmother|grandad|cousin|aunt|uncle)\b/i,
  games: /\b(game|games|gaming|played|playstation|xbox|nintendo|switch|chess|board game)\b/i,
  weather: /\b(weather|rain|raining|sunny|cold|hot|snow|windy|freezing|warm)\b/i,
  frustration: /\b(annoying|annoyed|frustrated|frustrating|stressed|stressful|tired|exhausted|sick|ill|bad day|terrible|awful|rubbish|hate)\b/i,
  books: /\b(book|books|reading|read a|novel|author|library|podcast)\b/i,
  pets: /\b(dog|dogs|cat|cats|pet|pets|puppy|kitten)\b/i,
};

const POSITIVE = /\b(great|good|amazing|awesome|brilliant|fun|lovely|nice|fantastic|love|loved|enjoyed|excited|happy|best|cool)\b/i;
const NEGATIVE = /\b(bad|tired|boring|sad|stressed|awful|terrible|annoying|sick|ill|exhausted|difficult|hard|hate|worried|not great|not good)\b/i;
const HESITANT = /^(um+|uh+|er+|hmm+|i don'?t know|not sure|no idea|nothing|nothing much|not much|i'?m not sure|idk|pass)[.!?]*$/i;

export function detectTopic(text: string): string | null {
  for (const [k, re] of Object.entries(TOPICS)) if (re.test(text)) return k;
  return null;
}

function extractFocus(text: string): string | null {
  const t = text.replace(/[.?!]+$/, '');
  const pats: RegExp[] = [
    /\b(?:went|go|going) to (?:the |a |an )?([a-z][\w' ]{2,30}?)(?: with| and| on| at| yesterday| last|,|$)/i,
    /\b(?:watched|watching|saw|seen) (?:a |an |the )?([a-z][\w' ]{2,30}?)(?: with| and| on| at| yesterday| last|,|$)/i,
    /\b(?:ate|had|cooked|made|ordered) (?:a |an |some |the )?([a-z][\w' ]{2,30}?)(?: with| and| for| at| yesterday| last|,|$)/i,
    /\b(?:i|we) (?:really )?(?:like|love|enjoy|adore) (?:the |a |an )?([a-z][\w' ]{2,30}?)(?: and| because|,|$)/i,
    /\b(?:i'm|i am) (?:a |an )([a-z][\w' ]{2,30}?)(?: and| at| in|,|$)/i,
    /\bi work (?:as (?:a |an )?|in |at |for )([a-z][\w' ]{2,30}?)(?: and|,|$)/i,
    /\b(?:played|playing|play) ([a-z][\w' ]{2,25}?)(?: with| and| at| yesterday|,|$)/i,
    /\bmy ([a-z][\w' ]{2,20}?)(?: is| was| and|,|$)/i,
  ];
  for (const p of pats) { const m = t.match(p); if (m && m[1] && m[1].split(' ').length <= 5) return m[1].trim(); }
  return null;
}

/* ---------------------------- English bank ---------------------------- */

const FOLLOW_UPS: Record<string, string[]> = {
  food: ['What did you order?', 'Do you cook much yourself?', 'What’s your go-to comfort food?', 'Would you go back there?', 'Sweet or savoury person?'],
  music: ['Who have you been listening to lately?', 'Have you been to any gigs recently?', 'Do you play anything yourself?', 'What’s a song you never skip?'],
  work: ['What do you actually do day to day?', 'How’s the team?', 'What’s the best part of it?', 'Busy week ahead?', 'Is it the kind of job you can switch off from?'],
  study: ['What are you studying?', 'How’s it going so far?', 'Got any exams coming up?', 'What made you choose that?'],
  travel: ['Where did you go?', 'What was the highlight?', 'Where’s next on your list?', 'Do you prefer cities or somewhere quiet?'],
  sport: ['How often do you get to do that?', 'How did you get into it?', 'Do you watch it as well, or just play?'],
  film: ['What did you think of it?', 'Would you recommend it?', 'Are you more of a films or series person?', 'Seen anything good lately?'],
  friends: ['How do you know them?', 'What did you get up to?', 'Was it a good night?', 'Do you see them often?'],
  family: ['Are you close?', 'Do they live nearby?', 'What are they like?'],
  games: ['What are you playing at the moment?', 'Do you play online with friends?', 'What got you into it?'],
  weather: ['Is that normal for this time of year where you are?', 'Are you more of a summer or winter person?'],
  frustration: ['Oh no. What happened?', 'Is it getting any better?', 'What usually helps you switch off?'],
  books: ['What’s it about?', 'Would you recommend it?', 'Do you read on paper or on a screen?'],
  pets: ['What’s their name?', 'How old are they?', 'Are they more chaotic or chilled out?'],
  general: ['What have you got planned for the rest of the week?', 'What do you like doing when you’ve got a free evening?', 'What’s something you’re looking forward to?', 'Tell me something that made you smile recently.', 'Have you got any hobbies you’re really into?'],
};

const REACTIONS: Record<Personality, { pos: string[]; neg: string[]; neutral: string[] }> = {
  relaxed: { pos: ['Oh nice!', 'Ah, that sounds good.', 'Nice one.'], neg: ['Ah, that’s rough.', 'Oh no, that doesn’t sound fun.'], neutral: ['Oh right.', 'Ah, okay.', 'Fair enough.'] },
  funny: { pos: ['Okay, now I’m jealous.', 'Love that for you.', 'Nice — living your best life, then.'], neg: ['Ugh, the worst.', 'Well, that’s one way to spend a day.'], neutral: ['Ha, okay.', 'Classic.', 'Right, I see.'] },
  outgoing: { pos: ['Oh, amazing!', 'No way, that sounds great!', 'Ooh, I love that!'], neg: ['Oh no! That’s so annoying.', 'Ah, I’m sorry — that sounds stressful.'], neutral: ['Oh, interesting!', 'Ooh, tell me more.'] },
  reserved: { pos: ['Nice.', 'Sounds good.'], neg: ['That’s hard.', 'Sorry to hear that.'], neutral: ['I see.', 'Okay.'] },
  thoughtful: { pos: ['That sounds really meaningful.', 'I like that.'], neg: ['That sounds difficult. How are you feeling about it now?', 'Hmm, that’s a lot to deal with.'], neutral: ['Interesting.', 'Hmm, I hadn’t thought of it like that.'] },
  sarcastic: { pos: ['Oh, sounds absolutely terrible. (Kidding — that sounds great.)', 'Wow, what a hard life you lead. Nice!'], neg: ['Well, that sounds like a fantastic time. Not.', 'Oh brilliant. Exactly what you needed, I bet.'], neutral: ['Riveting. Go on, though.', 'Ha, okay.'] },
  encouraging: { pos: ['That’s great to hear!', 'Oh, good for you!'], neg: ['That sounds tough — you’re handling it, though.', 'Ah, I’m sorry. Hope it gets easier.'], neutral: ['Thanks for sharing that.', 'Nice, you explained that well.'] },
  professional: { pos: ['That sounds very worthwhile.', 'Excellent.'], neg: ['That sounds challenging.', 'Understood — that’s frustrating.'], neutral: ['I see.', 'Understood.', 'That makes sense.'] },
};

const ANSWERS: Record<string, string[]> = {
  food: ['Honestly? I could eat noodles every day.', 'I’m a big fan of a proper Sunday roast.', 'I’ll never say no to a good curry.'],
  music: ['I’ve had the same three albums on repeat for weeks, to be honest.', 'Lately it’s been a lot of old soul music.'],
  work: ['My job is talking to people like you, so I can’t complain!', 'Busy, but the good kind of busy.'],
  travel: ['I’d love to go to Japan one day — the food alone.', 'I’m more of a city-break person, if I’m honest.'],
  film: ['I’ll watch anything with a good twist.', 'I’m a sucker for a good documentary.'],
  general: ['Not bad at all, thanks for asking!', 'Pretty good — just chatting away, as you can see.', 'Honestly, a quiet one. Which I like.'],
};

const MASCOT_FLAVOUR: Partial<Record<MascotId, string[]>> = {
  theodore: ['Splendid.', 'How delightful.', 'Ah, now that’s a story.'],
  milo: ['Ooh, an adventure!', 'I love hearing about new places.'],
  ace: ['Nice — that’s energy I like.', 'Good. Let’s keep that momentum.'],
  sterling: ['Very good.', 'Now that is interesting.'],
};

function simplify(s: string, difficulty: Difficulty) {
  if (difficulty !== 'beginner') return s;
  return s.replace('What do you actually do day to day?', 'What do you do at work?').replace('Is it the kind of job you can switch off from?', 'Do you like your job?')
    .replace('What’s your go-to comfort food?', 'What is your favourite food?').replace('Sweet or savoury person?', 'Do you like sweet food?');
}

/* ------------------------- Other-language banks ------------------------ */

interface Bank { reactions: [string, string][]; followUps: Record<string, [string, string][]>; hesitation: [string, string][]; answer: [string, string][]; topics: Record<string, RegExp>; wrap: [string, string] }
const BANKS: Partial<Record<LangId, Bank>> = {
  es: {
    reactions: [['¡Qué bien!', 'How nice!'], ['Ah, vale.', 'Ah, okay.'], ['¡No me digas!', 'No way!'], ['Qué interesante.', 'How interesting.']],
    followUps: {
      food: [['¿Y qué pediste?', 'And what did you order?'], ['¿Cocinas mucho en casa?', 'Do you cook a lot at home?']],
      friends: [['¿Y qué tal lo pasasteis?', 'And did you have a good time?'], ['¿Quedas mucho con ellos?', 'Do you meet up with them a lot?']],
      work: [['¿Y a qué te dedicas?', 'And what do you do for work?'], ['¿Qué tal el trabajo esta semana?', 'How’s work this week?']],
      general: [['¿Qué planes tienes para el finde?', 'What are your plans for the weekend?'], ['¿Qué te gusta hacer en tu tiempo libre?', 'What do you like doing in your free time?'], ['¿Has visto alguna serie buena últimamente?', 'Have you seen any good series lately?']],
    },
    hesitation: [['Tranquilo, sin prisa. ¿Qué tal tu día hoy?', 'No rush. How has your day been?'], ['Puedes contestar con algo corto, como «bien, ¿y tú?».', 'You can answer with something short, like “good, and you?”']],
    answer: [['Yo muy bien, gracias. ¡Aquí, charlando contigo!', 'I’m very well, thanks. Here, chatting with you!']],
    topics: { food: /\b(comida|comí|cena|cenamos|restaurante|cocinar|paella|tapas|café)\b/i, friends: /\b(fiesta|amigos|amigas|quedamos|cumpleaños)\b/i, work: /\b(trabajo|oficina|jefe|reunión|curro)\b/i },
    wrap: ['¡Me ha encantado hablar contigo! ¿Seguimos otro día?', 'I loved talking to you! Shall we continue another day?'],
  },
  fr: {
    reactions: [['Ah, sympa !', 'Oh, nice!'], ["D'accord.", 'Okay.'], ['Pas mal !', 'Not bad!'], ['Ah bon ?', 'Really?']],
    followUps: {
      food: [["Qu'est-ce que tu as mangé ?", 'What did you eat?'], ['Tu cuisines souvent ?', 'Do you cook often?']],
      work: [['Tu fais quoi comme travail ?', 'What do you do for work?'], ['Ça se passe bien au boulot ?', 'Is work going well?']],
      general: [['Tu fais quoi ce week-end ?', 'What are you doing this weekend?'], ["Qu'est-ce que tu aimes faire le soir ?", 'What do you like doing in the evening?']],
    },
    hesitation: [['Pas de souci, prends ton temps. Ta journée, ça va ?', 'No worries, take your time. Is your day going okay?']],
    answer: [['Ça va bien, merci ! Je suis content de discuter avec toi.', 'I’m good, thanks! Happy to chat with you.']],
    topics: { food: /\b(manger|mangé|resto|restaurant|dîner|déjeuner|cuisine)\b/i, work: /\b(travail|boulot|bureau|réunion|patron)\b/i },
    wrap: ["C'était super de parler avec toi. À bientôt !", 'It was great talking with you. See you soon!'],
  },
  de: {
    reactions: [['Ach, schön!', 'Oh, nice!'], ['Ah, okay.', 'Ah, okay.'], ['Echt?', 'Really?'], ['Klingt gut!', 'Sounds good!']],
    followUps: {
      food: [['Was hast du gegessen?', 'What did you eat?'], ['Kochst du gern?', 'Do you like cooking?']],
      work: [['Was machst du beruflich?', 'What do you do for work?'], ['Wie läuft’s auf der Arbeit?', 'How’s work going?']],
      general: [['Was machst du am Wochenende?', 'What are you doing at the weekend?'], ['Was machst du gern in deiner Freizeit?', 'What do you like doing in your free time?']],
    },
    hesitation: [['Kein Stress, lass dir Zeit. Wie war dein Tag?', 'No stress, take your time. How was your day?']],
    answer: [['Mir geht’s gut, danke! Schön, mit dir zu quatschen.', 'I’m good, thanks! Nice to chat with you.']],
    topics: { food: /\b(essen|gegessen|restaurant|kochen|abendessen|mittagessen)\b/i, work: /\b(arbeit|büro|chef|meeting|job)\b/i },
    wrap: ['Hat Spaß gemacht! Bis zum nächsten Mal.', 'That was fun! Until next time.'],
  },
  ja: {
    reactions: [['へえ、いいね！', 'Oh, nice!'], ['そうなんだ。', 'I see.'], ['すごい！', 'Amazing!'], ['なるほど。', 'I see / makes sense.']],
    followUps: {
      food: [['何を食べたの？', 'What did you eat?'], ['料理はよくする？', 'Do you cook often?']],
      work: [['仕事は何をしてるの？', 'What do you do for work?'], ['仕事はどう？', 'How’s work?']],
      general: [['週末は何するの？', 'What are you doing at the weekend?'], ['趣味は何？', 'What are your hobbies?']],
    },
    hesitation: [['大丈夫、ゆっくりでいいよ。今日はどうだった？', 'It’s fine, take your time. How was today?']],
    answer: [['元気だよ、ありがとう！話せてうれしい。', 'I’m good, thanks! Happy to talk.']],
    topics: { food: /(食べ|ご飯|レストラン|料理|ラーメン|すし|寿司)/, work: /(仕事|会社|会議|上司)/ },
    wrap: ['話せて楽しかった！またね。', 'That was fun! See you.'],
  },
};

/* ------------------------------ Demo engine ------------------------------ */

export const demoEngine: ConversationEngine = {
  id: 'demo',
  opening(ctx) {
    const { dialect } = getDialect(ctx.dialect);
    if (ctx.scenario && ctx.scenario.opening) {
      return { text: ctx.scenario.opening, source: 'demo' };
    }
    if (ctx.lang !== 'en') return { text: dialect.greeting.natural, translation: dialect.greeting.translation, source: 'demo' };
    const name = ctx.name ? ` ${ctx.name}` : '';
    const openers: Record<MascotId, string> = {
      kai: `Hey${name}! I’m Kai. No pressure — we can talk about music, food, travel or whatever you’re into. What have you been up to today?`,
      theodore: `Good day${name}! Professor Theodore, at your service. Shall we begin gently? Tell me — how has your day been so far?`,
      milo: `Hi${name}! I’m Milo. Let’s pretend we’ve just met on a trip. Where are you from, and where would you love to travel next?`,
      ace: `Hey${name}, Ace here. Quick warm-up: tell me one good thing that happened this week. Take your time — go when you’re ready.`,
      sterling: `Good to see you${name}. Sterling. Before we talk business — how’s your week been treating you?`,
    };
    let text = openers[ctx.mascot];
    if (ctx.difficulty === 'beginner') text = text.replace(/No pressure — /, '').replace(' or whatever you’re into', '');
    return { text, source: 'demo' };
  },

  async reply(ctx, user) {
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 450)); // feels like a turn-taking pause
    const u = user.trim();
    const seed = hash(u + ctx.history.length);
    const usedCoach = ctx.history.filter((t) => t.role === 'coach').map((t) => t.text);
    const notUsed = (arr: string[]) => arr.filter((q) => !usedCoach.some((c) => c.includes(q)));

    if (ctx.lang !== 'en') return otherLanguageReply(ctx, u, seed, usedCoach);

    const userTurns = ctx.history.filter((t) => t.role === 'user').length;

    // Scenario mode: move through beats, acknowledging what was said
    if (ctx.scenario && ctx.scenario.beats.length) {
      const beatIndex = userTurns - 1;
      if (HESITANT.test(u)) return { text: `No rush. If it helps, you could try: “${pick(ctx.scenario.hints, seed)}”`, source: 'demo' };
      if (beatIndex < ctx.scenario.beats.length) return { text: ctx.scenario.beats[Math.max(0, beatIndex)], source: 'demo', topic: ctx.scenario.topic };
      return { text: 'That was really natural. Want to end here and see your summary, or run the scene again with a twist?', source: 'demo' };
    }

    if (!u) return { text: 'I didn’t quite catch that. Could you say it again?', source: 'demo' };
    if (HESITANT.test(u) || u.split(/\s+/).length <= 1) {
      const opts = ['No worries — no rush at all. Want me to suggest a topic? We could talk about food, music or your weekend.', 'That’s fine! Here’s an easy one: what did you have for breakfast today?', 'Totally fine. You can start with something short, like “Not much, just work.”'];
      return { text: pick(notUsed(opts).length ? notUsed(opts) : opts, seed), source: 'demo' };
    }
    if (/\b(slow(er)? down|too fast|speak slower|say (it|that) again|repeat)\b/i.test(u)) {
      const last = [...ctx.history].reverse().find((t) => t.role === 'coach');
      return { text: `Of course. ${last ? last.text : ''}`.trim(), source: 'demo' };
    }
    if (/\b(what does|what's|what is) .+ mean\b/i.test(u)) {
      return { text: 'Good question! Tap “Explain that” under my message and I’ll break it down. Then we can carry on.', source: 'demo' };
    }

    const topic = detectTopic(u);
    const prevTopic = [...ctx.history].reverse().find((t) => t.role === 'coach' && t.topic)?.topic;
    const isQ = /\?\s*$/.test(u) || /^(and )?(what|how|where|do|did|have|are|is|can|would) (about )?you\b/i.test(u) || /\b(and you|what about you|how about you)\??$/i.test(u);
    const tone = POSITIVE.test(u) && !NEGATIVE.test(u) ? 'pos' : NEGATIVE.test(u) ? 'neg' : 'neutral';
    const r = REACTIONS[ctx.personality] ?? REACTIONS.relaxed;
    const reaction = pick(r[tone], seed);
    const focus = extractFocus(u);

    const parts: string[] = [];
    if (isQ) {
      parts.push(pick(ANSWERS[topic ?? 'general'] ?? ANSWERS.general, seed));
    } else {
      parts.push(reaction);
      if (focus && ctx.personality !== 'reserved' && seed % 3 !== 0) {
        const f = flipPronouns(focus);
        parts.push(tone === 'neg' ? `${capitalise(f)} — that can’t have been fun.` : `${capitalise(f)}, nice.`);
      }
      if (topic && prevTopic && topic !== prevTopic && seed % 2 === 0) parts.unshift('Oh, change of subject —');
    }
    const flavour = MASCOT_FLAVOUR[ctx.mascot];
    if (flavour && seed % 4 === 0 && !isQ) parts.splice(1, 0, pick(flavour, seed >> 2));

    const bank = FOLLOW_UPS[topic ?? 'general'];
    let options = notUsed(bank);
    if (!options.length) options = notUsed(FOLLOW_UPS.general);
    if (!options.length) options = FOLLOW_UPS.general;
    let q = pick(options, seed >> 3);
    if (ctx.personality === 'thoughtful' && seed % 2 === 0) q = topic ? 'What did that mean to you, would you say?' : q;
    parts.push(simplify(q, ctx.difficulty));

    if (userTurns >= 8 && seed % 3 === 0) parts.push('(By the way, whenever you want, tap End to see your summary.)');
    let text = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (ctx.personality === 'reserved') text = text.split(/(?<=[.!?])\s/).slice(-2).join(' ');
    return { text, topic: topic ?? prevTopic, source: 'demo' };
  },
};

function capitalise(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function otherLanguageReply(ctx: ConvContext, u: string, seed: number, used: string[]): Reply {
  const bank = BANKS[ctx.lang];
  if (!bank) return { text: '…', source: 'demo' };
  if (!u || HESITANT.test(u) || u.split(/\s+/).length <= 1) { const [t, tr] = pick(bank.hesitation, seed); return { text: t, translation: tr, source: 'demo' }; }
  let topic = 'general';
  for (const [k, re] of Object.entries(bank.topics)) if (re.test(u)) { topic = k; break; }
  const isQ = /[?？]\s*$/.test(u) || /^¿/.test(u);
  const [rt, rtr] = isQ ? pick(bank.answer, seed) : pick(bank.reactions, seed);
  const fu = (bank.followUps[topic] ?? bank.followUps.general).filter(([t]) => !used.some((c) => c.includes(t)));
  const pool = fu.length ? fu : bank.followUps.general.filter(([t]) => !used.some((c) => c.includes(t)));
  if (!pool.length) return { text: bank.wrap[0], translation: bank.wrap[1], source: 'demo' };
  const [qt, qtr] = pick(pool, seed >> 2);
  return { text: `${rt} ${qt}`, translation: `${rtr} ${qtr}`, topic, source: 'demo' };
}

/* ------------------------------ API engine ------------------------------ */

/** Calls the Cloudflare Pages Function at /api/converse when a model key is configured. */
export const apiEngine: ConversationEngine = {
  id: 'api',
  opening: demoEngine.opening,
  async reply(ctx, user) {
    const res = await fetch('/api/converse', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang: ctx.lang, dialect: ctx.dialect, mascot: ctx.mascot, personality: ctx.personality, difficulty: ctx.difficulty, scenario: ctx.scenario?.id, history: ctx.history.slice(-16).map(({ role, text }) => ({ role, text })), message: user }),
    });
    if (!res.ok) throw new Error(res.status === 429 ? 'rate-limited' : `api-${res.status}`);
    const data = (await res.json()) as { text: string; translation?: string };
    return { text: data.text, translation: data.translation, source: 'api' };
  },
};

let backendChecked: Promise<boolean> | null = null;
/** True only if /api/health reports a configured model provider. */
export function backendAvailable(): Promise<boolean> {
  if (!backendChecked) {
    backendChecked = fetch('/api/health', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .then((d: any) => !!d && d.llm === true)
      .catch(() => false);
  }
  return backendChecked;
}
