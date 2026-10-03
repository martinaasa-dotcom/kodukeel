import type { SkillKey } from "./types";

/**
 * What the Estonian state language examination actually is.
 *
 * The app mocks a real exam, so the shape of that exam is data rather than
 * something a page improvises. Everything in the plans below was read off the
 * Education and Youth Board's own page for each level
 * (harno.ee/eesti-keele-tasemeeksamid, read 2026-10-03) and is cited in
 * `docs/16-exam.md`: four parts, the minutes each one runs for, the points
 * each one carries, how many tasks each part sets and of what kind, how many
 * times a recording is played, how many options a question offers, how long
 * each piece of writing is, and what the spoken part asks of a candidate.
 *
 * TWO THINGS ARE KEPT APART HERE ON PURPOSE.
 *
 * The **frame** is the real exam: parts, durations, points, the 60 percent
 * pass mark, the clause that a zero in any one part fails the whole paper,
 * the number of plays and options, and the genre and length of each text. A
 * learner sitting this should meet the same clock, the same arithmetic and the
 * same kinds of task they will meet in the hall, at the level they chose.
 *
 * The **questions** are the app's stand-ins. The real paper sets a 400 word
 * magazine article and a live examiner; this one has a dictionary and a speech
 * synthesizer. So each task declares, in `standsFor`, which official task it
 * is standing in for, and the exam screen prints that. An imitation that does
 * not say where it stops imitating is a lie about how ready somebody is, which
 * is the one thing a mock exam must never be.
 *
 * Nothing here writes Estonian. The task specs describe shapes in English; the
 * sentences that fill them come from Ekilex by way of `./paper` (ADR-005).
 *
 * Pure: no React, no Prisma, no clock.
 */

export type ExamLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export const EXAM_LEVELS: readonly ExamLevel[] = ["A1", "A2", "B1", "B2", "C1"] as const;

/** The four levels the state actually examines at. */
export const OFFICIAL_LEVELS: readonly ExamLevel[] = ["A2", "B1", "B2", "C1"] as const;

export function isExamLevel(value: string): value is ExamLevel {
  return (EXAM_LEVELS as readonly string[]).includes(value);
}

/**
 * Which version of the paper this code builds.
 *
 * A paper is rebuilt from its seed on the server to be marked (ADR-022), so a
 * change to what the builders set changes the paper a seed stands for. The
 * screen sends the format it was handed, and `submitExam` refuses to mark a
 * sitting against a paper built to a different one: being told plainly that
 * the paper changed under you is better than answers marked against questions
 * you were never asked. Raise it whenever the questions a seed builds change.
 */
export const PAPER_FORMAT = 2;

/**
 * How many times the real paper plays a listening recording, where it plays
 * it more than once.
 *
 * Every specification says each listening text is heard twice, with a pause
 * before the task so the candidate can read the questions first. Two tasks are
 * the exception and are set to one play in the plans below, as the real paper
 * sets them: the B2 paper's short clips and the C1 paper's long conversation.
 */
export const LISTEN_PLAYS = 2;

/**
 * Seconds to read a listening task's questions before its recordings unlock,
 * where a level's specification gives no figure of its own.
 *
 * The A2 and B1 specifications describe a pause before each task without a
 * number, so thirty seconds is this app's. The B2 and C1 specifications give
 * one, and the plans below carry it. It can be ended early, which the real
 * pause cannot: the point is to teach the shape of the part, not to make
 * somebody sit through time they have already used.
 */
export const READ_QUESTIONS_SECONDS = 30;

/**
 * Minutes of the break between the written half and the spoken part.
 *
 * The Board publishes that the written parts are sat first and the spoken part
 * follows "after a short break", without putting a number on it, so ten minutes
 * is the app's own figure and is labeled as such. It can be ended early.
 */
export const BREAK_MINUTES = 10;

/** The exercise shapes the app can assemble out of attested Estonian. */
export type TaskKind =
  /** A recorded sentence with one word removed, chosen from real forms of that word. */
  | "gap-choice"
  /** The same, typed rather than chosen. */
  | "gap-type"
  /** Several gapped sentences sharing one bank of words, with spares that fit no gap. */
  | "gap-bank"
  /** Sentences matched to the words they illustrate. */
  | "match-usage"
  /** A sentence rebuilt from its own words. */
  | "order"
  /** An Estonian word, and English meanings to choose between. */
  | "gloss-choice"
  /** A word and a named case, and real forms to choose between. */
  | "form-choice"
  /** Produce a named case of a word. */
  | "case-form"
  /** Which case does this verb take? */
  | "government"
  /** Hear a word, type it back. The fallback when no sentence can be heard. */
  | "dictation"
  /** Hear a sentence, pick which one it was. */
  | "listen-choose"
  /** Hear a sentence, fill the word missing from it on the page. */
  | "listen-gap"
  /** Hear a sentence, say whether the line on the page is what it said. */
  | "listen-truefalse"
  /** The first writing task, in the genre the level sets. */
  | "message"
  /** The second writing task, in the genre the level sets. */
  | "compose"
  /** Record yourself, then mark yourself. */
  | "speak";

/**
 * The kinds of text the writing part sets, across the levels.
 *
 * Each is a genre a level's specification names. Which ones a level sets, and
 * at what length, is in the plans below.
 */
export type WritingGenre =
  /** A2: info ülekanne, a short text about the person on a business card. */
  | "card"
  /** A2, B1: teade, a note, message or invitation that has to get something done. */
  | "note"
  /** A2: kirjeldus etteantud teemal, a description of a given topic. */
  | "description"
  /** B1: jutt etteantud teemal. */
  | "story"
  /** B1: isiklik kiri. */
  | "personal-letter"
  /** B2: poolametlik kiri. */
  | "letter-semiformal"
  /** B2: mitteametlik kiri. */
  | "letter-informal"
  /** B2: lähteandmetele toetuv kokkuvõte koos omapoolse kommentaariga. */
  | "data-comment"
  /** B2: arutlev tekst. */
  | "argument"
  /** C1: üldistav lähteandmetele toetuv kokkuvõte, with no opinion of your own. */
  | "data-summary"
  /** C1: pikem arvamustekst, 220 to 260 words and not more. */
  | "opinion";

/**
 * What one spoken task asks for, which is different at every level.
 *
 * The real spoken part is a conversation with an examiner and, usually, a
 * second candidate. Each shape is the task the Board describes for that level,
 * played here by one person out loud: the screen says so on every one.
 */
export type SpeakingShape =
  /** A2: describe a picture, then answer questions on its theme. */
  | "picture"
  /** A2: ask and answer questions from an idea card. */
  | "idea-card"
  /** B1: answer the examiner's questions, then agree on a decision with a partner. */
  | "agree"
  /** B1: a phone call, asking for information and then giving it. */
  | "phone"
  /** B2: a one minute talk on a work topic, after two minutes to prepare. */
  | "talk"
  /** B2: say what you think, then debate a situation and decide together. */
  | "debate"
  /** C1: a two minute presentation, one of two topics, after three minutes to prepare. */
  | "presentation"
  /** C1: a discussion of a set topic. */
  | "discussion";

export interface TaskSpec {
  id: string;
  kind: TaskKind;
  /** How many marks this task is worth, one per item. */
  items: number;
  /** Raw marks. Equal to `items` everywhere except the written and spoken tasks. */
  raw: number;
  title: string;
  /** What the learner is asked to do, in English, as the app teaches in English. */
  instruction: string;
  /** The official task this stands in for, named the way the paper names it. */
  standsFor: string;
  /**
   * What to set instead when the dictionary cannot supply this shape.
   *
   * A task that cannot be set falls back to one built from what the dictionary
   * always has: words, forms, glosses and a speech synthesizer that needs no
   * key. The fallback is declared here rather than chosen in the builder, it is
   * recorded on the built task, and the briefing and the result both say when
   * one was used. A substitution nobody is told about would make the paper
   * quietly easier than the one it claims to imitate.
   */
  fallback?: TaskKind;
  /** Times each recording may be played, on a listening task. */
  plays?: number;
  /** Seconds to read the questions before the recordings unlock, on a listening task. */
  readSeconds?: number;
  /** Options each question offers, on a multiple choice task. Three on most real papers. */
  options?: number;
  /** Words in the bank that fit no gap, on a gap-bank task. */
  spares?: number;
  /** The genres a writing task sets, one or a choice between two. */
  genres?: readonly WritingGenre[];
  /** Words the text has to reach, and on the C1 opinion text, the most it may run to. */
  minWords?: number;
  maxWords?: number;
  /** What a spoken task asks for. */
  shape?: SpeakingShape;
  /** Seconds a spoken answer should run for. */
  seconds?: number;
  /** Seconds to prepare before speaking, where the real paper gives them. */
  prepSeconds?: number;
}

export interface PartSpec {
  skill: SkillKey;
  /** The English name used across the app. */
  label: string;
  /** The name on the real paper. */
  et: string;
  /** Minutes the real part runs for. The mock runs the same clock. */
  minutes: number;
  /** Weighted points this part contributes. */
  points: number;
  tasks: TaskSpec[];
  /**
   * What the real part sets that this one cannot, in one line, where there is
   * anything. Printed on the briefing beside the part, so a candidate knows
   * before the clock starts where the imitation stops.
   */
  notSet?: string;
}

export interface ExamSpec {
  level: ExamLevel;
  /** True for the four levels the state examines. */
  official: boolean;
  /** One line on what this paper is, shown above the start button. */
  summary: string;
  totalPoints: number;
  parts: PartSpec[];
}

/** A pass is 60 percent of the total, and no part may score zero. */
export const PASS_PCT = 60;

/**
 * Below this a candidate waits six months before sitting again.
 *
 * Not something the app enforces, obviously. It is shown after a failed paper
 * because it is the difference between "close" and "not yet", and a learner
 * deciding whether to book a real sitting is deciding exactly that.
 */
export const RETAKE_WAIT_PCT = 45;

export interface Band {
  min: number;
  label: string;
  tone: string;
}

/** The verbal assessment printed beside a real result. */
export const BANDS: readonly Band[] = [
  { min: 91, label: "very good", tone: "sky" },
  { min: 76, label: "good", tone: "sky" },
  { min: 60, label: "satisfactory", tone: "sky" },
  { min: 50, label: "poor", tone: "butter" },
  { min: 0, label: "not up to the level", tone: "blush" },
] as const;

export function bandFor(pct: number): Band {
  return BANDS.find((b) => pct >= b.min) ?? BANDS[BANDS.length - 1]!;
}

// ── The shapes, in words ─────────────────────────────────────────────────────

type Blueprint = Omit<TaskSpec, "id" | "items" | "raw">;

/**
 * What each task shape asks for, written once.
 *
 * A level overrides what is different about it (the official task a shape
 * stands for, the number of plays, the genre of a text), and nothing else, so a
 * rewrite of the shared wording is one edit rather than five chances to leave
 * one behind.
 */
const BLUEPRINTS: Record<TaskKind, Blueprint> = {
  "match-usage": {
    kind: "match-usage",
    title: "Which word is each sentence about?",
    instruction:
      "Each sentence was written by a dictionary maker to show one word in use, and that word " +
      "has been taken out. Pick its letter from the list. Each word is used once.",
    standsFor: "sobitamine, matching each piece of text to the one it belongs with",
    fallback: "gloss-choice",
  },
  "gap-choice": {
    kind: "gap-choice",
    title: "Choose the missing word",
    instruction:
      "Each sentence has a word missing. The options are all forms of that one word, so what " +
      "you're choosing is the ending the sentence needs.",
    standsFor: "valikvastustega lünkülesanne, a gapped text where you choose each missing word",
    fallback: "form-choice",
  },
  "gap-type": {
    kind: "gap-type",
    title: "Write the missing word",
    instruction: "Each sentence has a word missing. Type in the one that fits.",
    standsFor: "lünkülesanne, a gapped text filled in by hand",
  },
  "gap-bank": {
    kind: "gap-bank",
    title: "Fill the gaps from the word bank",
    instruction: bankInstruction(2),
    standsFor: "vastustepangaga lünkülesanne, filling gaps from a bank with more options than gaps",
  },
  "gloss-choice": {
    kind: "gloss-choice",
    title: "What does the word mean?",
    instruction:
      "One Estonian word, and its meaning in English among the options. Pick the right one. You're " +
      "seeing this because the dictionary didn't have the sentences to build a proper reading task.",
    standsFor: "lugemine info hankimiseks, reading to find information",
  },
  "form-choice": {
    kind: "form-choice",
    title: "Which form is it?",
    instruction:
      "Here's a word and the case it needs to go into. Pick the right form. Every option is " +
      "real Estonian, so what you're really choosing is the ending.",
    standsFor: "valikvastustega lünkülesanne, a gapped text where you choose each missing word",
  },
  order: {
    kind: "order",
    title: "Put the sentence back together",
    instruction:
      "Here's a real sentence with its words shuffled. Put them back in order. Estonian is " +
      "looser about word order than English, so another order Estonian allows counts too.",
    standsFor:
      "not a task the real paper sets: it stands in for the questions on a longer text, which " +
      "this app can't write, and tests how a sentence holds together",
  },
  /*
    THE TWO DRILLS BELOW ARE NOT TASKS ON THE REAL PAPER, and say so. The
    writing part of the state examination is two pieces of writing and nothing
    else; grammatical accuracy is a criterion the examiner marks *inside*
    those two texts. This app may not mark Estonian prose, because marking it
    would mean a model deciding whether somebody's ending was right (ADR-005,
    ADR-022), so the accuracy that carries marks in the hall is asked directly
    here instead.
  */
  "case-form": {
    kind: "case-form",
    title: "Write the form",
    instruction:
      "Write each word in the form asked for. The dictionary marks it, not an AI. On the real " +
      "paper all your time goes on the two texts above, so do these last, with whatever time " +
      "you have left.",
    standsFor:
      "not a task the real paper sets: it asks directly for the grammatical accuracy an examiner " +
      "marks inside your two texts, because no AI is allowed to mark your Estonian",
  },
  government: {
    kind: "government",
    title: "Which case does the verb take?",
    instruction:
      "Each Estonian verb wants a particular case after it, and English gives you no hint " +
      "which. Pick the right one for each verb. Like the task above, this one is ours rather " +
      "than the real paper's, so leave it till last.",
    standsFor:
      "not a task the real paper sets: it asks directly which case each verb takes, which an " +
      "examiner checks inside your two texts",
  },
  message: {
    kind: "message",
    title: "Write a short message",
    instruction:
      "The real writing part opens with this. Cover every point you're given. Your marks come " +
      "from the word count and from using the words we list. Checking that you covered every " +
      "point is up to you, because no AI here judges your Estonian.",
    standsFor: "teate koostamine, the short message the writing part opens with",
  },
  dictation: {
    kind: "dictation",
    title: "Write down the word you hear",
    instruction:
      "Play each recording and write down the word. A slow play counts as one of your plays. " +
      "A missing accent is pointed out but costs nothing, which is how the real paper marks it too.",
    standsFor: "lühivastusega ülesanne, writing down what the recording said",
  },
  "listen-choose": {
    kind: "listen-choose",
    // "Recording" rather than "sentence", because the same task is set from
    // single words wherever the dictionary holds no recorded sentence, and a
    // title that promised a sentence and delivered a word would be the paper
    // misdescribing itself. Each question says which it is.
    title: "What did you hear?",
    instruction: "Read the options during the pause. Then play each recording and pick what you heard.",
    standsFor: "valikvastustega ülesanne, choosing what you heard out of three",
  },
  "listen-gap": {
    kind: "listen-gap",
    title: "Fill the gap from the recording",
    instruction:
      "Each sentence on the page has a word missing. Play the recording and write in the word " +
      "you hear. A spelling slip that doesn't change the word costs nothing, as on the real paper.",
    standsFor: "lünkülesanne, completing sentences with the information you hear",
    fallback: "dictation",
  },
  "listen-truefalse": {
    kind: "listen-truefalse",
    title: "True or false?",
    instruction:
      "Play each recording, then decide whether the sentence printed under it is exactly what " +
      "it said. The real paper asks whether a statement about the recording is õige or vale, " +
      "right or wrong, and this is the same choice.",
    standsFor: "valikvastustega ülesanne õige/vale, deciding whether a statement matches what you heard",
  },
  compose: {
    kind: "compose",
    title: "Write a text",
    instruction:
      "The second writing task. Your marks come from the length and from using the words listed. " +
      "Anu can add a note afterwards if you ask, but it doesn't change your marks.",
    standsFor: "the second writing task",
  },
  speak: {
    kind: "speak",
    title: "Speak",
    instruction:
      "Record your answer, then listen back and mark yourself against the checklist. On the real " +
      "day this is a conversation with an examiner and another candidate; here you play every " +
      "part out loud. Nothing here scores your pronunciation, and nothing pretends to.",
    standsFor: "suuline esinemine ja dialoog, the spoken part with an examiner",
  },
};

/** What one task shape asks for, without the counts. Used when a task falls back. */
export function blueprintFor(kind: TaskKind): Blueprint {
  return BLUEPRINTS[kind];
}

/**
 * The titles, instructions and official names of the written and spoken
 * tasks, which are what differ most from one level to the next.
 */
const WRITING_FIRST: Record<"card" | "note-b1" | "letter" | "summary", Partial<Blueprint>> = {
  card: {
    title: "Write about the person on a business card",
    instruction:
      "The real writing part opens with this: a business card, and a short text about the " +
      "person on it. Use the details you need from the card. Your marks come from the word " +
      "count and from using the words on the card.",
    standsFor: "info ülekanne, writing out the details on a business card",
  },
  "note-b1": {
    standsFor:
      "teate koostamine, a short message of about 50 words. Some papers set a ten question form " +
      "to fill in instead, which this app can't set",
  },
  letter: {
    title: "Write a letter",
    instruction:
      "The real paper asks for one of these two kinds of letter, so pick one here and practice " +
      "both over time. Cover every point, write to the person the way the letter needs, and " +
      "start and end it the way that kind of letter does. Your marks come from the length and " +
      "from using the words listed.",
    standsFor: "poolametlik või mitteametlik kiri, a semi-formal or an informal letter of about 140 words",
  },
  summary: {
    title: "Summarize the figures",
    instruction:
      "Write a summary of the figures for the general public: compare them, say what changed and " +
      "what follows from it. Keep it neutral, with no opinion of your own, and pick out only the " +
      "numbers that matter. Your marks come from the length and from using the words listed.",
    standsFor:
      "lähteandmetele toetuv kokkuvõte, a general summary of figures in about 180 words, with no " +
      "opinion of your own",
  },
};

const WRITING_SECOND: Record<"note-or-description" | "story-or-letter" | "summary-or-argument" | "opinion", Partial<Blueprint>> = {
  "note-or-description": {
    title: "Write a note or a description",
    instruction:
      "The second writing task, and you choose: a note that gets something done, or a short " +
      "description of a topic. Your marks come from the length and from using the words listed.",
    standsFor:
      "teade (sõnum, kutse) või kirjeldus etteantud teemal, a note or a description, and you choose which",
  },
  "story-or-letter": {
    title: "Write a story or a personal letter",
    instruction:
      "The second writing task, and you choose: a story on the topic, or a personal letter about " +
      "it. Your marks come from the length and from using the words listed. Anu can add a note " +
      "afterwards if you ask, but it doesn't change your marks.",
    standsFor:
      "jutt või isiklik kiri etteantud teemal, a story or a personal letter of about 100 words",
  },
  "summary-or-argument": {
    title: "Write a summary or an argument",
    instruction:
      "The second writing task, and you choose: a summary of the figures with your own comment, " +
      "or an argument for or against a statement. Organize it into paragraphs and back up what " +
      "you say. Your marks come from the length and from using the words listed.",
    standsFor:
      "lähteandmetele toetuv kokkuvõte või arutlev tekst, a summary of figures with your comment, " +
      "or an argument, of about 180 words",
  },
  opinion: {
    title: "Write an opinion piece",
    instruction:
      "A longer text with a clear shape: an introduction, a development of both points you're " +
      "given, and a short conclusion. Keep it general rather than personal, and write it for the " +
      "reader the task names. 220 to 260 words, and the real paper means the upper limit too.",
    standsFor: "pikem arvamustekst, a structured opinion text of 220 to 260 words, not more",
  },
};

const SPEAKING: Record<SpeakingShape, Partial<Blueprint>> = {
  picture: {
    title: "Describe a picture",
    standsFor: "pildi kirjeldamine ja küsimustele vastamine, describing a picture and answering questions on it",
  },
  "idea-card": {
    title: "Ask and answer with an idea card",
    standsFor: "küsimuste esitamine ja vastamine ideekaardi abil, asking and answering from an idea card",
  },
  agree: {
    title: "Answer questions, then agree on a plan",
    standsFor: "küsimustele vastamine ja arutelu, answering questions and reaching an agreement",
  },
  phone: {
    title: "Ring up and ask",
    standsFor: "dialoog (rollimäng), a phone call where one of you asks and the other answers",
  },
  talk: {
    title: "Give a one minute talk",
    standsFor: "lühiettekanne, sõnavõtt või esitlus, a short talk on a work topic after two minutes to prepare",
  },
  debate: {
    title: "Discuss, argue and decide",
    standsFor: "arutelu ning väitlus ja otsustamine, a discussion and a debate that ends in a decision",
  },
  presentation: {
    title: "Give a two minute presentation",
    standsFor: "pikk monoloog, a presentation on a work topic after three minutes to prepare",
  },
  discussion: {
    title: "Hold a discussion",
    standsFor: "dialoog (diskussioon), a discussion of a set topic with a partner",
  },
};

// ── The plans, one per level ─────────────────────────────────────────────────

interface WritingPlan {
  first: { genres: readonly WritingGenre[]; minWords: number; maxWords?: number; raw: number; copy: keyof typeof WRITING_FIRST };
  second: { genres: readonly WritingGenre[]; minWords: number; maxWords?: number; raw: number; copy: keyof typeof WRITING_SECOND };
  /** Items in the two accuracy drills, which are this app's and sit last. */
  forms: number;
  government: number;
}

interface ListenPlan {
  kind: "listen-choose" | "listen-gap" | "listen-truefalse";
  items: number;
  plays: number;
  readSeconds: number;
  options?: number;
  /** The official task, where the shared wording is not specific enough. */
  standsFor?: string;
}

interface ReadPlan {
  kind: "match-usage" | "gap-choice" | "gap-bank" | "order";
  items: number;
  options?: number;
  spares?: number;
  standsFor?: string;
}

interface SpeakPlan {
  shape: SpeakingShape;
  raw: number;
  seconds: number;
  prepSeconds?: number;
}

interface LevelPlan {
  minutes: Record<SkillKey, number>;
  points: number;
  writing: WritingPlan;
  listening: readonly ListenPlan[];
  reading: readonly ReadPlan[];
  speaking: readonly [SpeakPlan, SpeakPlan];
  /** What each real part sets that this paper cannot, where there is anything. */
  notSet: Partial<Record<SkillKey, string>>;
  summary: string;
}

/*
  The counts below are the real paper's wherever the shape exists here, which
  is most of them: B1 reading is 9, 6, 10 and 8 questions, 33 in all, and so
  is this. Where a real task cannot be set, the slot is filled with the
  nearest shape this app can build and that shape says what it stands for.
*/
const PLANS: Record<ExamLevel, LevelPlan> = {
  A1: {
    minutes: { writing: 25, listening: 25, reading: 40, speaking: 12 },
    points: 20,
    writing: {
      first: { genres: ["card"], minWords: 15, raw: 5, copy: "card" },
      second: { genres: ["note", "description"], minWords: 20, raw: 8, copy: "note-or-description" },
      forms: 4, government: 3,
    },
    listening: [
      { kind: "listen-choose", items: 6, plays: 2, readSeconds: 30, options: 3 },
      { kind: "listen-truefalse", items: 5, plays: 2, readSeconds: 30 },
      { kind: "listen-gap", items: 4, plays: 2, readSeconds: 30 },
    ],
    reading: [
      { kind: "match-usage", items: 5 },
      { kind: "gap-choice", items: 6, options: 3 },
      { kind: "order", items: 4 },
    ],
    speaking: [
      { shape: "picture", raw: 4, seconds: 45 },
      { shape: "idea-card", raw: 4, seconds: 45 },
    ],
    notSet: {},
    summary:
      "There's no state exam at A1, so this paper is our own. It follows the A2 paper, one step " +
      "easier, so your first go is one you can actually pass.",
  },
  A2: {
    minutes: { writing: 30, listening: 30, reading: 50, speaking: 15 },
    points: 20,
    writing: {
      first: { genres: ["card"], minWords: 25, raw: 6, copy: "card" },
      second: { genres: ["note", "description"], minWords: 30, raw: 10, copy: "note-or-description" },
      forms: 5, government: 4,
    },
    listening: [
      { kind: "listen-choose", items: 7, plays: 2, readSeconds: 30, options: 3 },
      { kind: "listen-truefalse", items: 6, plays: 2, readSeconds: 30 },
      { kind: "listen-gap", items: 6, plays: 2, readSeconds: 30,
        standsFor: "lühivastusega ülesanne, writing a word or two you heard" },
    ],
    reading: [
      { kind: "match-usage", items: 5, standsFor: "sobitusülesanne, matching information to the notice it belongs with" },
      { kind: "gap-choice", items: 8, options: 3,
        standsFor: "valikvastustega lünkülesanne, a gapped letter where you choose each word out of three" },
      { kind: "order", items: 5 },
    ],
    speaking: [
      { shape: "picture", raw: 5, seconds: 60 },
      { shape: "idea-card", raw: 5, seconds: 60 },
    ],
    notSet: {
      listening: "The real paper also has a matching task to a two minute conversation, which this one can't set.",
      reading: "The real paper also asks you to pick everyday phrases and to read a 150 word text, which this one can't set.",
    },
    summary:
      "The first level the state examines, and enough for quite a few jobs. Eighty points, " +
      "twenty for each part, and just under two hours of written paper.",
  },
  B1: {
    minutes: { writing: 35, listening: 35, reading: 50, speaking: 15 },
    points: 25,
    writing: {
      first: { genres: ["note"], minWords: 50, raw: 8, copy: "note-b1" },
      second: { genres: ["story", "personal-letter"], minWords: 100, raw: 12, copy: "story-or-letter" },
      forms: 5, government: 4,
    },
    listening: [
      { kind: "listen-choose", items: 7, plays: 2, readSeconds: 30, options: 3 },
      { kind: "listen-choose", items: 6, plays: 2, readSeconds: 30, options: 3 },
      { kind: "listen-gap", items: 8, plays: 2, readSeconds: 30,
        standsFor: "lühivastusega lünkülesanne, completing sentences with a word you heard" },
      { kind: "listen-truefalse", items: 9, plays: 2, readSeconds: 30 },
    ],
    reading: [
      { kind: "match-usage", items: 9, standsFor: "sobitamine, matching each situation to the notice it fits" },
      { kind: "order", items: 6 },
      { kind: "gap-choice", items: 10, options: 3,
        standsFor: "valikvastustega lünkülesanne, a gapped text where you choose each word out of three" },
      // "Variante on rohkem kui lünki": more options than gaps, without a number.
      { kind: "gap-bank", items: 8, spares: 2 },
    ],
    speaking: [
      { shape: "agree", raw: 6, seconds: 90 },
      { shape: "phone", raw: 6, seconds: 90 },
    ],
    notSet: {
      reading: "The real paper's second task asks six questions on a 200 to 300 word article, which this one can't write.",
    },
    summary:
      "The level you need for citizenship. A hundred points, twenty five for each part, and " +
      "two hours of written paper.",
  },
  B2: {
    minutes: { writing: 80, listening: 40, reading: 70, speaking: 20 },
    points: 25,
    writing: {
      first: { genres: ["letter-semiformal", "letter-informal"], minWords: 140, raw: 9, copy: "letter" },
      second: { genres: ["data-comment", "argument"], minWords: 180, raw: 14, copy: "summary-or-argument" },
      forms: 6, government: 5,
    },
    listening: [
      /*
        One play, and ten seconds a question to read first: the B2 paper's
        short clips are heard once, and the pause is per question rather than
        per task. The four other tasks at B2 are heard twice after a minute.
      */
      { kind: "listen-choose", items: 5, plays: 1, readSeconds: 50, options: 3,
        standsFor: "valikvastustega ülesanne, short clips heard only once, choosing out of three" },
      { kind: "listen-choose", items: 5, plays: 2, readSeconds: 60, options: 3 },
      { kind: "listen-gap", items: 10, plays: 2, readSeconds: 60,
        standsFor: "lünkülesanne, completing sentences with a word or two you heard" },
      { kind: "listen-truefalse", items: 12, plays: 2, readSeconds: 60 },
    ],
    reading: [
      { kind: "order", items: 7 },
      { kind: "match-usage", items: 8, standsFor: "sobitamine, matching each statement to the paragraph it belongs with" },
      { kind: "gap-choice", items: 12, options: 4,
        standsFor: "valikvastustega lünkülesanne, a gapped text where you choose each word out of four" },
      // "Pangas on üks lause, mis teksti ei sobi": exactly one spare.
      { kind: "gap-bank", items: 8, spares: 1,
        standsFor: "vastustepangaga lünkülesanne, filling gaps from a bank with one entry that fits nowhere" },
    ],
    speaking: [
      { shape: "talk", raw: 7, seconds: 60, prepSeconds: 120 },
      { shape: "debate", raw: 7, seconds: 120 },
    ],
    notSet: {
      reading: "The real paper's first task asks seven questions on a 500 to 600 word article, which this one can't write.",
    },
    summary:
      "Three hours and ten minutes of writing, listening and reading, then twenty minutes of " +
      "speaking. It's the level most professional registers ask for.",
  },
  C1: {
    minutes: { writing: 90, listening: 45, reading: 60, speaking: 20 },
    points: 25,
    writing: {
      first: { genres: ["data-summary"], minWords: 180, raw: 12, copy: "summary" },
      second: { genres: ["opinion"], minWords: 220, maxWords: 260, raw: 12, copy: "opinion" },
      forms: 6, government: 5,
    },
    listening: [
      { kind: "listen-gap", items: 7, plays: 2, readSeconds: 30,
        standsFor: "avatud vastustega ülesanne, short answers from a news recording" },
      /*
        Heard once, after a minute to read: the C1 paper's second task is a
        conversation or a debate played a single time, and the questions ask
        what was meant as well as what was said.
      */
      { kind: "listen-choose", items: 10, plays: 1, readSeconds: 60, options: 3,
        standsFor: "valikvastustega ülesanne, a conversation heard only once, choosing out of three" },
    ],
    reading: [
      { kind: "match-usage", items: 12, standsFor: "väitega sobiva tekstilõigu valimine, matching each statement to the text it fits" },
      { kind: "gap-choice", items: 10, options: 3,
        standsFor: "valikvastustega lünkülesanne, choosing what fills each gap out of three" },
      { kind: "order", items: 12 },
    ],
    speaking: [
      { shape: "presentation", raw: 8, seconds: 120, prepSeconds: 180 },
      { shape: "discussion", raw: 8, seconds: 180 },
    ],
    notSet: {
      listening: "The real paper ends with a ten minute lecture, heard once, that you take notes on. This one can't set it.",
      reading: "The real paper's third task asks twelve short answers about an information text, which this one can't write.",
    },
    summary:
      "The top level the state examines. Ninety minutes of writing on its own, and the second " +
      "text runs to 220 to 260 words.",
  },
};

function task(kind: TaskKind, id: string, items: number, raw = items, over: Partial<Blueprint> = {}): TaskSpec {
  return { id, items, raw, ...BLUEPRINTS[kind], ...over, kind };
}

/** The whole paper for one level. */
export function specFor(level: ExamLevel): ExamSpec {
  const plan = PLANS[level];
  const { first, second, forms, government } = plan.writing;

  return {
    level,
    official: (OFFICIAL_LEVELS as readonly string[]).includes(level),
    summary: plan.summary,
    totalPoints: plan.points * 4,
    parts: [
      {
        skill: "writing", label: "Writing", et: "kirjutamine",
        minutes: plan.minutes.writing, points: plan.points,
        /*
          The two written texts first, in the order the real paper sets them,
          then the two accuracy drills. A learner who runs out of time should run
          out of it on the drills rather than on the letter.
        */
        tasks: [
          task("message", "w1", 1, first.raw, {
            ...WRITING_FIRST[first.copy], genres: first.genres, minWords: first.minWords, maxWords: first.maxWords,
          }),
          task("compose", "w2", 1, second.raw, {
            ...WRITING_SECOND[second.copy], genres: second.genres, minWords: second.minWords, maxWords: second.maxWords,
          }),
          task("case-form", "w3", forms),
          task("government", "w4", government),
        ],
        notSet: plan.notSet.writing,
      },
      {
        skill: "listening", label: "Listening", et: "kuulamine",
        minutes: plan.minutes.listening, points: plan.points,
        tasks: plan.listening.map((l, i) => task(l.kind, `l${i + 1}`, l.items, l.items, {
          plays: l.plays,
          readSeconds: l.readSeconds,
          ...(l.options ? { options: l.options } : {}),
          ...(l.standsFor ? { standsFor: l.standsFor } : {}),
          ...(l.plays === 1 ? { instruction: singlePlayInstruction(l.kind) } : {}),
        })),
        notSet: plan.notSet.listening,
      },
      {
        skill: "reading", label: "Reading", et: "lugemine",
        minutes: plan.minutes.reading, points: plan.points,
        tasks: plan.reading.map((r, i) => task(r.kind, `r${i + 1}`, r.items, r.items, {
          ...(r.options ? { options: r.options } : {}),
          ...(r.spares ? { spares: r.spares, instruction: bankInstruction(r.spares) } : {}),
          ...(r.standsFor ? { standsFor: r.standsFor } : {}),
        })),
        notSet: plan.notSet.reading,
      },
      {
        skill: "speaking", label: "Speaking", et: "rääkimine",
        minutes: plan.minutes.speaking, points: plan.points,
        /*
          One item each, carrying several marks. The spoken part is the one the
          learner marks themselves (ADR-018), and a criterion is worth a mark.
        */
        tasks: plan.speaking.map((s, i) => task("speak", `s${i + 1}`, 1, s.raw, {
          ...SPEAKING[s.shape],
          shape: s.shape,
          seconds: s.seconds,
          ...(s.prepSeconds ? { prepSeconds: s.prepSeconds } : {}),
        })),
      },
    ],
  };
}

function bankInstruction(spares: number): string {
  const left = spares === 1 ? "one is left over" : `${spares === 2 ? "two" : spares} are left over`;
  return "Each sentence has a word missing, and the missing words are in the bank, in the form the " +
    `sentence needs. Each one is used once, and ${left}, so the last gap can't be got by elimination.`;
}

function singlePlayInstruction(kind: ListenPlan["kind"]): string {
  return kind === "listen-choose"
    ? "Each recording plays once, as it does on the real paper. Read the options during the pause, " +
      "then play it and pick what you heard."
    : BLUEPRINTS[kind].instruction;
}

/** Total minutes of the written half, which is what a learner plans an evening around. */
export function writtenMinutes(spec: ExamSpec): number {
  return spec.parts
    .filter((p) => p.skill !== "speaking")
    .reduce((sum, p) => sum + p.minutes, 0);
}

/** Every task of one shape in a level's spec, for the tests and the briefing. */
export function tasksOf(spec: ExamSpec, kind: TaskKind): TaskSpec[] {
  return spec.parts.flatMap((p) => p.tasks.filter((t) => t.kind === kind));
}

/**
 * What a learner marks themselves against on a spoken task.
 *
 * ADR-018 forbids scoring pronunciation, and the honest consequence is that
 * somebody has to do the marking. A blank "how did that go?" gets a shrug, so
 * these are what the Board's own description of a task done well asks of that
 * task, written so that each one is answerable by listening to your own
 * recording once. A presentation is judged on its shape and a phone call on
 * whether the information was got, so one list for every task was a list that
 * fitted none of them.
 *
 * They are deliberately about things you can hear rather than things you can
 * only know: "an Estonian would have understood me the first time" is a
 * judgment a learner can make; "my pronunciation was accurate" is not.
 */
export const SPEAKING_CRITERIA: Record<SpeakingShape, readonly string[]> = {
  picture: [
    "I said what is in the picture, not just a list of words.",
    "I said where it might be and what is going on.",
    "I answered every question with a whole sentence.",
    "I joined my ideas with linking words like and, but and because.",
    "I said something about myself, not only about the picture.",
    "An Estonian would have understood me the first time.",
    "I kept going without long silences.",
    "I never slipped into English.",
  ],
  "idea-card": [
    "I asked about everything on the card.",
    "My questions were whole questions, not single words.",
    "I used question words, not only yes or no questions.",
    "I answered each question with a whole sentence.",
    "I used the words on the card.",
    "An Estonian would have understood me the first time.",
    "I kept going without long silences.",
    "I never slipped into English.",
  ],
  agree: [
    "I answered each question, and said why.",
    "I described the options, not only named them.",
    "I said which I'd prefer, and gave a reason.",
    "I weighed one option against another.",
    "I ended with a clear decision.",
    "I used more than one tense.",
    "An Estonian would have understood me the first time.",
    "I never slipped into English.",
  ],
  phone: [
    "I said who I am and why I'm calling.",
    "I asked for every piece of information on the card.",
    "I asked politely, the way you would on the phone.",
    "When I answered, I gave the facts on the second card correctly.",
    "I checked or repeated a number or a time.",
    "I ended the call properly.",
    "An Estonian would have understood me the first time.",
    "I never slipped into English.",
  ],
  talk: [
    "My talk had an opening, a main part and a short ending.",
    "I stayed on the topic on the card.",
    "I made it clear what matters most.",
    "I gave reasons, and at least one example.",
    "I kept going for about a minute without long pauses.",
    "I answered the follow-up question directly.",
    "I used words that suit a work setting.",
    "I never slipped into English.",
  ],
  debate: [
    "I gave my opinion on each question and explained it.",
    "I used arguments from the card and added one of my own.",
    "I answered the arguments on the other side, not only made my own.",
    "I backed up a point with an example.",
    "I reached a clear common position at the end.",
    "My points linked up into an argument, not a list.",
    "An Estonian would have followed my reasoning the first time.",
    "I never slipped into English.",
  ],
  presentation: [
    "I opened by addressing my listeners or saying what I'd cover.",
    "I developed the topic in a clear order.",
    "I ended with a short summary.",
    "I kept it general rather than personal.",
    "I gave reasons and examples that fit the topic.",
    "I spoke for about two minutes, without long pauses.",
    "I answered the follow-up questions briefly and to the point.",
    "I used words that suit a professional setting.",
    "I never slipped into English.",
  ],
  discussion: [
    "I got to the point quickly.",
    "I gave my view and backed it with reasons and examples.",
    "I covered every point on the card.",
    "I took a view other than my own seriously.",
    "Each turn linked to what came before, the way a real conversation does.",
    "I asked a question, so it didn't turn into a monologue.",
    "I stayed on the topic throughout.",
    "My language was varied, not the same phrases over and over.",
    "I never slipped into English.",
  ],
};

/** The first `count` criteria for a spoken task, which is how many marks it carries. */
export function speakingCriteria(shape: SpeakingShape, count: number): string[] {
  const list = SPEAKING_CRITERIA[shape];
  return list.slice(0, Math.max(1, Math.min(count, list.length)));
}
