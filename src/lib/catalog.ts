import type { Language, Mascot, Personality, Difficulty, CorrectionStyle, Level, LangId } from './types';

/**
 * Language catalogue. Configurable: add a language or dialect here and the
 * onboarding, settings and previews pick it up. `contentStatus` is shown to
 * users so nobody mistakes a preview for a validated curriculum.
 */
export const LANGUAGES: Language[] = [
  {
    id: 'en', name: 'English', nativeName: 'English', mark: 'En',
    levels: ['complete-beginner', 'beginner', 'intermediate', 'upper-intermediate', 'advanced'],
    dialects: [
      {
        id: 'en-GB', label: 'United Kingdom', voiceLangs: ['en-GB'], recognitionLang: 'en-GB',
        registers: ['formal', 'informal'], contentStatus: 'demo-core',
        greeting: { natural: "Hey, how's it going? What have you been up to?", translation: "Hey, how's it going? What have you been up to?", note: '“What have you been up to?” is a friendly way to ask about someone’s recent life, not just today.' },
      },
      {
        id: 'en-US', label: 'United States', voiceLangs: ['en-US'], recognitionLang: 'en-US',
        registers: ['formal', 'informal'], contentStatus: 'demo-core',
        greeting: { natural: "Hey, how's it going? What have you been up to?", translation: "Hey, how's it going? What have you been up to?", note: 'Very common across the US. Most people answer briefly (“Not much, you?”) rather than literally.' },
      },
      {
        id: 'en-AU', label: 'Australia', voiceLangs: ['en-AU'], recognitionLang: 'en-AU',
        registers: ['formal', 'informal'], contentStatus: 'preview',
        greeting: { natural: "Hey, how are you going? What have you been up to?", translation: "Hey, how are you? What have you been up to?", note: '“How are you going?” is a common Australian way of asking how someone is.' },
      },
    ],
  },
  {
    id: 'es', name: 'Spanish', nativeName: 'Español', mark: 'Es',
    levels: ['complete-beginner', 'beginner', 'intermediate', 'upper-intermediate', 'advanced'],
    dialects: [
      {
        id: 'es-ES', label: 'Spain', voiceLangs: ['es-ES'], recognitionLang: 'es-ES',
        registers: ['formal', 'informal'], contentStatus: 'demo-starter',
        greeting: { natural: '¡Hola! ¿Qué tal? ¿Qué has estado haciendo?', translation: "Hi! How's it going? What have you been up to?", note: '“¿Qué tal?” is neutral and works almost anywhere in Spain.' },
      },
      {
        id: 'es-MX', label: 'Mexico', voiceLangs: ['es-MX', 'es-US'], recognitionLang: 'es-MX',
        registers: ['formal', 'informal'], contentStatus: 'preview',
        greeting: { natural: '¡Hola! ¿Qué onda? ¿Qué has hecho?', translation: "Hi! What's up? What have you been doing?", note: '“¿Qué onda?” is informal and strongly associated with Mexico. Use “¿Cómo estás?” with people you don’t know.' },
      },
      {
        id: 'es-AR', label: 'Argentina', voiceLangs: ['es-AR', 'es-419'], recognitionLang: 'es-AR',
        registers: ['formal', 'informal'], contentStatus: 'preview',
        greeting: { natural: '¡Hola! ¿Cómo andás? ¿Qué contás?', translation: "Hi! How are you doing? What's new?", note: 'Uses “vos” forms (andás, contás), which are standard in everyday Argentine speech.' },
      },
    ],
  },
  {
    id: 'fr', name: 'French', nativeName: 'Français', mark: 'Fr',
    levels: ['complete-beginner', 'beginner', 'intermediate', 'upper-intermediate', 'advanced'],
    dialects: [
      {
        id: 'fr-FR', label: 'France', voiceLangs: ['fr-FR'], recognitionLang: 'fr-FR',
        registers: ['formal', 'informal'], contentStatus: 'demo-starter',
        greeting: { natural: "Salut, ça va ? Qu'est-ce que tu deviens ?", translation: "Hi, how's it going? What have you been up to?", note: '“Qu’est-ce que tu deviens ?” is used with people you haven’t seen for a while.' },
      },
      {
        id: 'fr-CA', label: 'Canada (Québec)', voiceLangs: ['fr-CA'], recognitionLang: 'fr-CA',
        registers: ['formal', 'informal'], contentStatus: 'preview',
        greeting: { natural: "Allô, ça va ? Qu'est-ce que tu fais de bon ces temps-ci ?", translation: "Hi, how's it going? What have you been up to lately?", note: '“Allô” is a common informal greeting in Québec, not only on the phone.' },
      },
    ],
  },
  {
    id: 'de', name: 'German', nativeName: 'Deutsch', mark: 'De',
    levels: ['complete-beginner', 'beginner', 'intermediate', 'upper-intermediate', 'advanced'],
    dialects: [
      {
        id: 'de-DE', label: 'Germany', voiceLangs: ['de-DE'], recognitionLang: 'de-DE',
        registers: ['formal', 'informal'], contentStatus: 'demo-starter',
        greeting: { natural: 'Hey, wie geht’s? Was hast du so gemacht?', translation: "Hey, how's it going? What have you been up to?", note: 'Informal “du” form. With strangers or at work, people often start with “Sie”.' },
      },
      {
        id: 'de-AT', label: 'Austria', voiceLangs: ['de-AT'], recognitionLang: 'de-AT',
        registers: ['formal', 'informal'], contentStatus: 'preview',
        greeting: { natural: 'Servus, wie geht’s? Was hast du so getrieben?', translation: "Hi, how's it going? What have you been up to?", note: '“Servus” is a common informal hello and goodbye in Austria and southern Germany.' },
      },
      {
        id: 'de-CH', label: 'Switzerland', voiceLangs: ['de-CH'], recognitionLang: 'de-CH',
        registers: ['formal', 'informal'], contentStatus: 'preview',
        note: 'Everyday speech in Switzerland is usually Swiss German dialect, which differs a lot from written Standard German. This preview uses Swiss Standard German.',
        greeting: { natural: 'Hoi, wie geht’s dir? Was hast du so gemacht?', translation: "Hi, how are you? What have you been up to?", note: '“Hoi” is a typical informal Swiss greeting.' },
      },
    ],
  },
  {
    id: 'ja', name: 'Japanese', nativeName: '日本語', mark: '日',
    levels: ['complete-beginner', 'beginner', 'intermediate', 'upper-intermediate', 'advanced'],
    dialects: [
      {
        id: 'ja-JP', label: 'Japan (Tokyo standard)', voiceLangs: ['ja-JP'], recognitionLang: 'ja-JP',
        registers: ['formal', 'informal'], contentStatus: 'demo-starter',
        greeting: { natural: 'やあ、元気？最近どうしてた？', romanised: 'Yaa, genki? Saikin dō shiteta?', translation: "Hey, how are you? What have you been up to lately?", note: 'Casual speech for friends. With colleagues you would say 「お元気ですか？」 (O-genki desu ka?).' },
      },
      {
        id: 'ja-JP-kansai', label: 'Japan (Kansai)', voiceLangs: ['ja-JP'], recognitionLang: 'ja-JP',
        registers: ['informal'], contentStatus: 'preview',
        note: 'Device voices speak standard Japanese, so Kansai intonation in audio is approximate.',
        greeting: { natural: 'おう、元気？最近何してたん？', romanised: 'Ō, genki? Saikin nani shitetan?', translation: "Hey, how are you? What have you been up to lately?", note: '「〜してたん？」 is a Kansai-style ending. Standard Japanese would be 「〜してたの？」.' },
      },
    ],
  },
];

export const SUPPORT_LANGUAGES: { id: string; name: string }[] = [
  { id: 'en', name: 'English' }, { id: 'es', name: 'Español' }, { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' }, { id: 'ja', name: '日本語' }, { id: 'ar', name: 'العربية' },
  { id: 'hi', name: 'हिन्दी' }, { id: 'pt', name: 'Português' }, { id: 'zh', name: '中文' }, { id: 'ur', name: 'اردو' },
];

export const STATUS_LABEL: Record<string, { label: string; detail: string }> = {
  'demo-core': { label: 'Fullest demo', detail: 'Conversation, feedback and exercises all have demo content.' },
  'demo-starter': { label: 'Starter set', detail: 'A small curated set of conversation and teaching content.' },
  preview: { label: 'Preview', detail: 'Audio and onboarding only. Teaching content is awaiting native-speaker validation.' },
};

export function getLanguage(id: LangId) { return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0]; }
export function getDialect(id: string) {
  for (const l of LANGUAGES) for (const d of l.dialects) if (d.id === id) return { language: l, dialect: d };
  return { language: LANGUAGES[0], dialect: LANGUAGES[0].dialects[0] };
}

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'complete-beginner', label: 'Complete beginner', hint: 'I know a few words, if any' },
  { id: 'beginner', label: 'Beginner', hint: 'I can handle simple phrases' },
  { id: 'intermediate', label: 'Intermediate', hint: 'I understand a lot but freeze when speaking' },
  { id: 'upper-intermediate', label: 'Upper intermediate', hint: 'I get by, but don’t sound natural yet' },
  { id: 'advanced', label: 'Advanced', hint: 'I want nuance, slang and polish' },
  { id: 'unsure', label: 'Not sure yet', hint: 'I’ll figure it out as we go' },
];

export const GOALS: { id: string; label: string }[] = [
  { id: 'everyday', label: 'Speak naturally in everyday conversation' },
  { id: 'pronunciation', label: 'Improve pronunciation' },
  { id: 'listening', label: 'Improve listening comprehension' },
  { id: 'slang', label: 'Learn casual language and slang' },
  { id: 'smalltalk', label: 'Feel confident in small talk' },
  { id: 'travel', label: 'Prepare for travel' },
  { id: 'work', label: 'Communicate better at work' },
  { id: 'public', label: 'Improve public speaking' },
  { id: 'fillers', label: 'Use fewer filler words' },
  { id: 'dictation', label: 'Dictate and format speech into text' },
  { id: 'vocab', label: 'Expand vocabulary' },
  { id: 'interviews', label: 'Practise interviews or presentations' },
];

export const MASCOTS: Mascot[] = [
  {
    id: 'theodore', name: 'Professor Theodore', animal: 'Turtle',
    oneLiner: 'A patient, witty old professor who loves a precise word and a good story.',
    style: 'Unhurried, articulate and occasionally, delightfully old-fashioned.',
    sample: 'Ah, splendid to meet you. Shall we take our time and find exactly the right words?',
    strengths: ['Clear pronunciation', 'Grammar that makes sense', 'Formal and professional English', 'Storytelling'],
    teachingStyle: 'I explain the “why” behind a rule, and I’ll tell you honestly when something I say is old-fashioned rather than how people talk today.',
    accent: 'mint', voice: { pitch: 0.8, rate: 0.9 }, defaultPersonality: 'thoughtful',
  },
  {
    id: 'milo', name: 'Scout Milo', animal: 'Mouse',
    oneLiner: 'A curious explorer who makes nervous first conversations feel easy.',
    style: 'Enthusiastic, practical and full of questions about your world.',
    sample: 'Hi! I’m Milo. Lost in a new city? No problem — let’s practise asking for directions together.',
    strengths: ['Travel conversations', 'Everyday situations', 'Asking for help', 'Roleplay for beginners'],
    teachingStyle: 'We’ll act out real situations. If you get stuck, I’ll give you a hint and we keep going.',
    accent: 'coral', voice: { pitch: 1.35, rate: 1.05 }, defaultPersonality: 'encouraging',
  },
  {
    id: 'kai', name: 'Kai', animal: 'Panda',
    oneLiner: 'Relaxed and funny, like a friend who happens to be a native speaker.',
    style: 'Casual, natural rhythm, small talk and the odd joke — never forced.',
    sample: 'Hey! I’m Kai. No pressure — we can talk about music, food, whatever. What have you been up to today?',
    strengths: ['Casual speech', 'Small talk', 'Modern expressions', 'Music, food and entertainment'],
    teachingStyle: 'I keep the chat flowing and save most tips for the end, so it feels like hanging out.',
    accent: 'sky', voice: { pitch: 1.05, rate: 1.0 }, defaultPersonality: 'relaxed',
  },
  {
    id: 'ace', name: 'Ace', animal: 'Eagle',
    oneLiner: 'An energetic coach for presentations, interviews and speaking under pressure.',
    style: 'Focused, upbeat and friendly-competitive. Loves a timed challenge.',
    sample: 'Ready? You’ve got sixty seconds to tell me about something you’re proud of. Go when you’re ready.',
    strengths: ['Public speaking', 'Interviews', 'Pacing and delivery', 'Confidence under pressure'],
    teachingStyle: 'Short drills, clear targets, and one thing to improve at a time.',
    accent: 'yellow', voice: { pitch: 1.1, rate: 1.1 }, defaultPersonality: 'encouraging',
  },
  {
    id: 'sterling', name: 'Mr Sterling', animal: 'Tiger',
    oneLiner: 'A composed professional who helps you sound confident at work without sounding stiff.',
    style: 'Charismatic, strategic and quietly funny.',
    sample: 'Good to meet you. Let’s make your next meeting feel a little easier — and a little shorter.',
    strengths: ['Meetings', 'Negotiation', 'Networking', 'Professional register'],
    teachingStyle: 'I’ll show you what sounds natural at work, which is usually less formal than people expect.',
    accent: 'lavender', voice: { pitch: 0.85, rate: 0.95 }, defaultPersonality: 'professional',
  },
];
export const getMascot = (id: string) => MASCOTS.find((m) => m.id === id) ?? MASCOTS[2];

export const PERSONALITIES: { id: Personality; label: string; hint: string }[] = [
  { id: 'relaxed', label: 'Relaxed', hint: 'Easy-going, no rush' },
  { id: 'funny', label: 'Funny', hint: 'Light jokes now and then' },
  { id: 'outgoing', label: 'Outgoing', hint: 'Chatty and curious' },
  { id: 'reserved', label: 'Reserved', hint: 'Calm, fewer words' },
  { id: 'thoughtful', label: 'Thoughtful', hint: 'Asks deeper questions' },
  { id: 'sarcastic', label: 'Lightly sarcastic', hint: 'Gentle, always easy to read' },
  { id: 'encouraging', label: 'Encouraging', hint: 'Supportive, not over the top' },
  { id: 'professional', label: 'Professional', hint: 'Polished and to the point' },
];

export const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'beginner', label: 'Beginner-friendly', hint: 'Short sentences, common words' },
  { id: 'everyday', label: 'Everyday conversational', hint: 'Normal chat, some idioms' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Longer turns, more variety' },
  { id: 'advanced', label: 'Advanced', hint: 'Natural speed, nuance and slang' },
  { id: 'adaptive', label: 'Adaptive', hint: 'Adjusts as you talk' },
];

export const CORRECTIONS: { id: CorrectionStyle; label: string; hint: string }[] = [
  { id: 'gentle', label: 'Gentle', hint: 'Keep talking; feedback at the end' },
  { id: 'balanced', label: 'Balanced', hint: 'Quick tips only when they really help' },
  { id: 'detailed', label: 'Detailed', hint: 'More frequent tips and explanations' },
];

export interface Scenario {
  id: string; title: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  objectives: string[]; roles: { you: string; coach: string }; context: string;
  opening: string; hints: string[]; beats: string[]; mascot: string; topic: string;
}

export const SCENARIOS: Scenario[] = [
  { id: 'free', title: 'Free conversation', difficulty: 'Beginner', mascot: 'kai', topic: 'Anything you like',
    objectives: ['Keep a conversation going', 'Ask a follow-up question'], roles: { you: 'Yourself', coach: 'A friendly local' },
    context: 'No script. Talk about your day, food, music, work — whatever comes up.', opening: '', hints: ['Not much, you?', 'Honestly, it’s been a long week.', 'I’ve been really into…'], beats: [] },
  { id: 'friends', title: "Meeting a partner's friends", difficulty: 'Intermediate', mascot: 'kai', topic: 'Meeting new people',
    objectives: ['Introduce yourself warmly', 'Find common ground', 'Ask open questions'], roles: { you: 'The new partner', coach: 'Sam, a close friend' },
    context: 'You’re at a casual dinner and meeting your partner’s best friend for the first time.',
    opening: "Oh, you must be the famous one! I've heard loads about you. How did you two meet, then?",
    hints: ['We met through work, actually.', 'All good things, I hope!', 'How long have you known each other?'],
    beats: ['Ha, nice. So what do you do when you’re not being interrogated by me?', 'That sounds interesting. Have you been to this place before? The food’s meant to be really good.', 'We should all do something together soon. Any ideas?'] },
  { id: 'group', title: 'Joining a group conversation', difficulty: 'Intermediate', mascot: 'kai', topic: 'Group chat',
    objectives: ['Join without interrupting', 'Add to the topic'], roles: { you: 'A guest at a party', coach: 'Jo, mid-story' },
    context: 'A small group is talking about a film. You want to join in.', opening: "…and honestly, the ending just made no sense. Oh, hey! Have you seen it?",
    hints: ['Sorry, couldn’t help overhearing…', 'I have, actually!', 'Not yet — no spoilers!'],
    beats: ['Right? What did you make of it?', 'Fair enough. What kind of films are you usually into?', 'Ooh, good shout. Have you watched anything good lately?'] },
  { id: 'event', title: 'Introducing yourself at an event', difficulty: 'Beginner', mascot: 'sterling', topic: 'Networking',
    objectives: ['Give a short introduction', 'Ask about the other person'], roles: { you: 'An attendee', coach: 'Another attendee' },
    context: 'A professional meetup. People are chatting with drinks.', opening: "Hi there, I don't think we've met. I'm Alex. What brings you here tonight?",
    hints: ['Nice to meet you, I’m…', 'A colleague recommended it.', 'I work in…'],
    beats: ['Interesting. How long have you been doing that?', 'What’s the best part of it, would you say?', 'Great talking to you. Shall we swap details?'] },
  { id: 'colleagues', title: 'Small talk with colleagues', difficulty: 'Beginner', mascot: 'sterling', topic: 'Work small talk',
    objectives: ['Make relaxed small talk', 'Keep it light'], roles: { you: 'Yourself', coach: 'A colleague by the coffee machine' },
    context: 'Monday morning in the office kitchen.', opening: 'Morning! Good weekend?', hints: ['Not bad, thanks. You?', 'Pretty quiet, actually.', 'Too short, as always!'],
    beats: ['Ha, aren’t they always. Up to anything nice?', 'Lovely. Busy week ahead for you?', 'Well, good luck with it. Catch you later!'] },
  { id: 'ordering', title: 'Ordering food and chatting with staff', difficulty: 'Beginner', mascot: 'milo', topic: 'Restaurants',
    objectives: ['Order clearly', 'Ask a question about the menu'], roles: { you: 'A customer', coach: 'A friendly server' },
    context: 'A busy neighbourhood café at lunchtime.', opening: 'Hi! Are you ready to order, or do you need a minute?',
    hints: ['Could I get…?', 'What would you recommend?', 'Is there anything vegetarian?'],
    beats: ['Good choice. Anything to drink with that?', 'Sure. Is that for here or to take away?', 'Lovely, that’ll be about ten minutes. Here on holiday?'] },
  { id: 'help', title: 'Asking for help while travelling', difficulty: 'Beginner', mascot: 'milo', topic: 'Travel',
    objectives: ['Ask for directions', 'Check you understood'], roles: { you: 'A traveller', coach: 'A local on the street' },
    context: 'You’re trying to find the train station.', opening: 'You look a bit lost — can I help?',
    hints: ['Excuse me, how do I get to…?', 'Sorry, could you say that again?', 'Is it far?'],
    beats: ['Sure, it’s about ten minutes on foot. Go straight, then left at the bakery.', 'Exactly. Or you can take the number 12 bus if you’re in a hurry.', 'No problem at all. Have a good trip!'] },
  { id: 'plans', title: 'Making plans with friends', difficulty: 'Beginner', mascot: 'kai', topic: 'Weekend plans',
    objectives: ['Suggest a plan', 'Agree on a time'], roles: { you: 'Yourself', coach: 'A friend' },
    context: 'Messaging a friend about the weekend.', opening: "Are you free this weekend? We should do something.",
    hints: ['Yeah, I’m around on Saturday.', 'How about…?', 'What time works for you?'],
    beats: ['Ooh, I’m up for that. What time are you thinking?', 'Works for me. Want to grab food after?', 'Sorted. See you then!'] },
  { id: 'banter', title: 'Understanding playful banter', difficulty: 'Advanced', mascot: 'kai', topic: 'Banter',
    objectives: ['Recognise teasing', 'Respond lightly'], roles: { you: 'Yourself', coach: 'A friend who teases' },
    context: 'Your friend jokes that you’re always late.', opening: "Oh look who finally made it! Did you walk here via the scenic route again?",
    hints: ['Ha! Traffic, honestly.', 'I was fashionably late.', 'You’re one to talk!'],
    beats: ['Fashionably late, he says. Twenty minutes is a whole fashion show.', 'Fair enough, fair enough. Anyway, you’re buying the first round, right?', 'Ha, deal. Good to see you, though.'] },
  { id: 'misunderstanding', title: 'Handling a misunderstanding', difficulty: 'Intermediate', mascot: 'milo', topic: 'Misunderstandings',
    objectives: ['Notice the confusion', 'Clarify politely'], roles: { you: 'A hotel guest', coach: 'A receptionist' },
    context: 'You booked a double room, but the receptionist says twin.', opening: 'Here we are — a twin room for three nights. Two single beds, as requested.',
    hints: ['Sorry, I think there’s been a mix-up.', 'I actually booked a double.', 'Is there any way to change it?'],
    beats: ['Oh, I see. Let me check that for you. You’re right, it says double here — sorry about that.', 'I can move you to a double on the third floor. Would that be okay?', 'All sorted. Enjoy your stay!'] },
  { id: 'indirect', title: 'Responding to indirect answers', difficulty: 'Advanced', mascot: 'sterling', topic: 'Reading between the lines',
    objectives: ['Read polite “no”s', 'Respond tactfully'], roles: { you: 'A colleague', coach: 'Your manager' },
    context: 'You suggested a new idea. Your manager’s reply is… polite.', opening: "That's an interesting idea. Let's maybe revisit it after the quarter.",
    hints: ['Sure — is there anything I could do now to make it stronger?', 'Understood.', 'Would it help if I wrote it up?'],
    beats: ['Good question. A short write-up with costs would help.', 'Exactly. No rush — after the quarter is fine.', 'Thanks for raising it, genuinely.'] },
  { id: 'disagree', title: 'Making a polite disagreement', difficulty: 'Intermediate', mascot: 'sterling', topic: 'Disagreeing politely',
    objectives: ['Disagree without sounding rude', 'Offer an alternative'], roles: { you: 'Team member', coach: 'A colleague' },
    context: 'Planning a team event.', opening: "I think we should just book the same restaurant as last year. Easy.",
    hints: ['I see what you mean, but…', 'What if we tried…?', 'I’m not sure that’s the best option.'],
    beats: ['Hmm, fair point. What would you suggest?', 'I could live with that. Should we put it to a vote?', 'Good — let’s do that.'] },
  { id: 'interview', title: 'Attending a job interview', difficulty: 'Intermediate', mascot: 'ace', topic: 'Interviews',
    objectives: ['Answer with structure', 'Give an example'], roles: { you: 'Candidate', coach: 'Interviewer' },
    context: 'A first-round interview for a role you want.', opening: "Thanks for coming in. To start, could you tell me a little about yourself?",
    hints: ['Sure. I’m currently…', 'One thing I’m proud of is…', 'For example…'],
    beats: ['Thanks. Can you tell me about a time you solved a difficult problem?', 'Good example. Why are you interested in this role?', 'Great. Do you have any questions for me?'] },
  { id: 'meeting', title: 'Participating in a meeting', difficulty: 'Intermediate', mascot: 'sterling', topic: 'Meetings',
    objectives: ['Give an update', 'Ask a clarifying question'], roles: { you: 'Team member', coach: 'Meeting lead' },
    context: 'Weekly project check-in.', opening: "Let's go round the table. Could you give us a quick update on your side?",
    hints: ['Sure. This week I…', 'One thing I need help with is…', 'Just to clarify…'],
    beats: ['Thanks. Any blockers we should know about?', 'Understood. Who can help with that?', 'Great, let’s pick that up offline.'] },
  { id: 'presentation', title: 'Giving a short presentation', difficulty: 'Advanced', mascot: 'ace', topic: 'Presenting',
    objectives: ['Open clearly', 'Use transitions', 'Finish with a takeaway'], roles: { you: 'Presenter', coach: 'Audience member' },
    context: 'Two minutes to present an idea to your team.', opening: "Whenever you're ready — the floor is yours.",
    hints: ['Today I want to talk about…', 'First… Then… Finally…', 'So the key takeaway is…'],
    beats: ['Thanks! Quick question — what’s the first step?', 'Makes sense. How would we measure success?', 'Really clear. Thank you.'] },
];

/** Expression knowledge base (demo). Each entry carries a validation status. */
export interface Expression {
  phrase: string; lang: LangId; dialect: string; literal: string; meaning: string; natural: string;
  pronunciation: string; formality: 'Formal' | 'Neutral' | 'Informal' | 'Slang';
  context: string; whoUses: string; currency: 'Current' | 'Dated' | 'Regional';
  sensitivity?: string; alternative: string; example: string[];
  category: 'natural' | 'informal' | 'slang' | 'regional' | 'register';
  validation: 'curated-demo' | 'unvalidated';
}

export const EXPRESSIONS: Expression[] = [
  { phrase: "how's it going", lang: 'en', dialect: 'en-GB', literal: 'How is it progressing?', meaning: 'A casual “how are you?”', natural: "How's it going?", pronunciation: 'howz-it-GO-ing', formality: 'Informal', context: 'Greeting friends, colleagues you know, shop staff', whoUses: 'Very widely used by most age groups', currency: 'Current', alternative: 'How are you?', example: ["A: Hey, how's it going?", 'B: Not bad, you?'], category: 'informal', validation: 'curated-demo' },
  { phrase: 'what have you been up to', lang: 'en', dialect: 'en-GB', literal: 'What activities have you been doing?', meaning: 'What’s been happening in your life recently?', natural: 'What have you been up to?', pronunciation: 'wot-uv-yuh-bin-UP-too', formality: 'Informal', context: 'Catching up with someone', whoUses: 'Widely used in the UK and US', currency: 'Current', alternative: "What's new?", example: ['A: What have you been up to?', 'B: Not much — work, mostly.'], category: 'natural', validation: 'curated-demo' },
  { phrase: 'no worries', lang: 'en', dialect: 'en-GB', literal: 'There are no worries.', meaning: 'It’s fine / you’re welcome', natural: 'No worries.', pronunciation: 'no-WUR-eez', formality: 'Informal', context: 'Replying to thanks or an apology', whoUses: 'Very common in Australia and the UK, increasingly in the US', currency: 'Current', alternative: "That's fine / You're welcome", example: ['A: Sorry I’m late!', 'B: No worries.'], category: 'informal', validation: 'curated-demo' },
  { phrase: 'grab a bite', lang: 'en', dialect: 'en-GB', literal: 'Take a piece of food quickly', meaning: 'Get something to eat, usually quickly or casually', natural: 'Want to grab a bite?', pronunciation: 'grab-uh-BITE', formality: 'Informal', context: 'Suggesting food with friends or colleagues', whoUses: 'Common in the UK and US', currency: 'Current', alternative: 'Get something to eat', example: ['A: Want to grab a bite after work?', 'B: Yeah, go on then.'], category: 'informal', validation: 'curated-demo' },
  { phrase: 'catch up', lang: 'en', dialect: 'en-GB', literal: 'Reach someone who is ahead', meaning: 'Talk with someone about what’s happened since you last met', natural: "Let's catch up soon.", pronunciation: 'KATCH-up', formality: 'Neutral', context: 'Friends and colleagues', whoUses: 'Widely used', currency: 'Current', alternative: 'Talk soon', example: ['A: We should catch up properly.', 'B: Definitely. Coffee next week?'], category: 'natural', validation: 'curated-demo' },
  { phrase: 'i reckon', lang: 'en', dialect: 'en-GB', literal: 'I calculate', meaning: 'I think / I guess', natural: 'I reckon it’ll rain.', pronunciation: 'eye-REK-un', formality: 'Informal', context: 'Giving an opinion casually', whoUses: 'Common in the UK and Australia; sounds regional or rural in parts of the US', currency: 'Regional', alternative: 'I think', example: ['A: Will they come?', 'B: I reckon so.'], category: 'regional', validation: 'curated-demo' },
  { phrase: 'cheers', lang: 'en', dialect: 'en-GB', literal: 'A toast when drinking', meaning: 'Thanks (also: goodbye)', natural: 'Cheers!', pronunciation: 'CHEERZ', formality: 'Informal', context: 'Thanking someone casually in the UK', whoUses: 'Very common in the UK; in the US mostly used for toasts', currency: 'Regional', alternative: 'Thanks', example: ['A: Here’s your coffee.', 'B: Cheers!'], category: 'regional', validation: 'curated-demo' },
  { phrase: 'sounds good', lang: 'en', dialect: 'en-GB', literal: 'It has a good sound', meaning: 'That plan works for me', natural: 'Sounds good!', pronunciation: 'sownz-GOOD', formality: 'Neutral', context: 'Agreeing to a plan', whoUses: 'Widely used, including at work', currency: 'Current', alternative: 'That works for me', example: ['A: Seven o’clock?', 'B: Sounds good.'], category: 'natural', validation: 'curated-demo' },
  { phrase: 'fancy', lang: 'en', dialect: 'en-GB', literal: 'To like or desire', meaning: 'Would you like to…? (as in “Do you fancy a coffee?”)', natural: 'Fancy a coffee?', pronunciation: 'FAN-see', formality: 'Informal', context: 'Offering or suggesting something in the UK', whoUses: 'Common in the UK; uncommon in the US in this sense', currency: 'Regional', alternative: 'Would you like…?', example: ['A: Fancy a coffee?', 'B: Go on, then.'], category: 'regional', validation: 'curated-demo' },
  { phrase: 'splendid', lang: 'en', dialect: 'en-GB', literal: 'Magnificent', meaning: 'Excellent', natural: 'Splendid!', pronunciation: 'SPLEN-did', formality: 'Formal', context: 'Professor Theodore’s favourite word', whoUses: 'Sounds old-fashioned or playful today; most people would say “great”', currency: 'Dated', alternative: 'Great!', example: ['A: I finished the report.', 'B: Great, thanks!'], category: 'register', validation: 'curated-demo' },
  { phrase: 'qué tal', lang: 'es', dialect: 'es-ES', literal: 'What such?', meaning: 'How are you? / How’s it going?', natural: '¿Qué tal?', pronunciation: 'keh-TAL', formality: 'Neutral', context: 'Greeting almost anyone informally', whoUses: 'Widely used across Spain and Latin America', currency: 'Current', alternative: '¿Cómo estás?', example: ['A: ¡Hola! ¿Qué tal?', 'B: Bien, ¿y tú?'], category: 'natural', validation: 'curated-demo' },
  { phrase: 'qué pasa', lang: 'es', dialect: 'es-ES', literal: 'What is happening?', meaning: 'What’s up? (casual greeting)', natural: '¿Qué pasa?', pronunciation: 'keh-PAH-sah', formality: 'Informal', context: 'Friends; can also mean “what’s wrong?” depending on tone', whoUses: 'Common among friends in Spain', currency: 'Current', alternative: '¿Qué tal?', example: ['A: ¡Ey! ¿Qué pasa?', 'B: Nada, aquí.'], category: 'informal', validation: 'curated-demo' },
  { phrase: 'qué guay', lang: 'es', dialect: 'es-ES', literal: 'How cool', meaning: 'How cool! / Awesome!', natural: '¡Qué guay!', pronunciation: 'keh-GWHY', formality: 'Informal', context: 'Reacting with enthusiasm among friends', whoUses: 'Strongly associated with Spain; can sound foreign in Latin America', currency: 'Regional', alternative: '¡Qué bien!', example: ['A: Me voy a Lisboa el finde.', 'B: ¡Qué guay!'], category: 'regional', validation: 'curated-demo' },
  { phrase: 'estuvo genial', lang: 'es', dialect: 'es-ES', literal: 'It was brilliant', meaning: 'It was great (about an event)', natural: 'Estuvo genial.', pronunciation: 'es-TOO-boh heh-NYAL', formality: 'Neutral', context: 'Describing how an event or experience went', whoUses: 'Widely used', currency: 'Current', alternative: 'Fue increíble', example: ['A: ¿Qué tal la fiesta?', 'B: ¡Estuvo genial!'], category: 'natural', validation: 'curated-demo' },
  { phrase: 'ça va', lang: 'fr', dialect: 'fr-FR', literal: 'It goes', meaning: 'How are you? / I’m fine', natural: 'Ça va ?', pronunciation: 'sah-VAH', formality: 'Informal', context: 'Greeting friends and people you know', whoUses: 'Universal in everyday French', currency: 'Current', alternative: 'Comment allez-vous ? (formal)', example: ['A: Salut, ça va ?', 'B: Ça va, et toi ?'], category: 'informal', validation: 'curated-demo' },
  { phrase: 'wie geht’s', lang: 'de', dialect: 'de-DE', literal: 'How goes it?', meaning: 'How are you?', natural: 'Wie geht’s?', pronunciation: 'vee-GAYTS', formality: 'Informal', context: 'Friends and people you say “du” to', whoUses: 'Universal', currency: 'Current', alternative: 'Wie geht es Ihnen? (formal)', example: ['A: Hey, wie geht’s?', 'B: Gut, und dir?'], category: 'informal', validation: 'curated-demo' },
  { phrase: '元気', lang: 'ja', dialect: 'ja-JP', literal: 'Original energy', meaning: 'Are you well? / I’m fine', natural: '元気？', pronunciation: 'GEN-ki', formality: 'Informal', context: 'Friends and family', whoUses: 'Universal in casual speech', currency: 'Current', alternative: 'お元気ですか？ (polite)', example: ['A: 元気？ (Genki?)', 'B: うん、元気！(Un, genki!)'], category: 'informal', validation: 'curated-demo' },
];

export function findExpressionsIn(text: string, lang: LangId): Expression[] {
  const t = text.toLowerCase().replace(/[’']/g, "'");
  return EXPRESSIONS.filter((e) => e.lang === lang && t.includes(e.phrase.replace(/[’']/g, "'")));
}

export const SPEAKING_MODES = [
  { id: 'one-minute', label: 'One-minute talk', seconds: 60, prompts: ['Describe a place that feels like home.', 'Tell me about a skill you’d love to learn and why.', 'What’s a small thing that always improves your day?'] },
  { id: 'impromptu', label: 'Two-minute impromptu', seconds: 120, prompts: ['Should everyone learn a second language? Give your view.', 'Talk about a time a plan went wrong — and what happened next.', 'What would you change about your city?'] },
  { id: 'rehearsal', label: 'Presentation rehearsal', seconds: 180, prompts: ['Rehearse the opening of your next presentation.', 'Present a project you worked on: the problem, what you did, the result.'] },
  { id: 'interview', label: 'Interview answer', seconds: 90, prompts: ['Tell me about yourself.', 'Describe a time you handled a difficult situation at work or school.', 'Why do you want this role?'] },
  { id: 'story', label: 'Storytelling', seconds: 120, prompts: ['Tell a story about the best meal you’ve ever had.', 'Tell a story about getting lost.'] },
  { id: 'podcast', label: 'Podcast introduction', seconds: 45, prompts: ['Introduce an episode about learning languages as an adult.', 'Introduce yourself as a podcast host and today’s topic.'] },
  { id: 'pitch', label: 'Professional pitch', seconds: 60, prompts: ['Pitch an idea that would save your team time.', 'Pitch yourself to a potential client in one minute.'] },
  { id: 'free', label: 'Free speaking', seconds: 120, prompts: ['Talk about anything you like.'] },
];

export const TRANSITIONS = ['first', 'firstly', 'second', 'secondly', 'then', 'next', 'after that', 'finally', 'however', 'because', 'for example', 'for instance', 'so', 'also', 'on the other hand', 'in conclusion', 'to sum up', 'that said', 'as a result', 'meanwhile', 'in fact'];

export const CORRECTION_LABEL: Record<CorrectionStyle, string> = { gentle: 'Gentle', balanced: 'Balanced', detailed: 'Detailed' };
