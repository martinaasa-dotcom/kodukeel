/**
 * THE SHAPE OF A PLANNED PROGRAMME, AND WHY THERE IS ONE AT ALL.
 *
 * Everything this app can do is on a menu somewhere, and that is the problem
 * it was reported with. A learner opening it in the evening is handed a course
 * of 79 units, eleven practice rounds, fourteen conversations, two puzzles, a
 * dictionary and a tutor, and has to decide which of those is tonight before
 * they can start. Deciding is the expensive part of an evening's study and it
 * is the one part the app was leaving to the person least able to do it: the
 * beginner, who does not yet know what they are missing.
 *
 * So a programme is the decision made in advance. A day names the words it
 * teaches and the order it does things in, and the learner presses one button
 * until the day says it is finished. Nothing is new underneath: every step
 * opens a screen this app already had, and a day is an argument about which of
 * them, in what order, on which words.
 *
 * FOUR RULES HOLD IT TO THE REST OF THE PROJECT.
 *
 * It writes no Estonian. A day's `words` are lemmas, which is what a syllabus
 * unit already is: a *request* against the dictionary that the Ekilex harvest
 * either honors or reports (ADR-005). A day may only name words a unit it
 * declares actually teaches, asserted in `course.test.ts`, so a programme
 * cannot introduce vocabulary any more than a scene can.
 *
 * It names no screen twice. A step that opens a practice mode names that
 * mode's own href and reads its title out of `PRACTICE_MODES`, so a mode
 * renamed once is renamed here too. A step that opens something which is not a
 * mode, the grammar reference or the review queue, carries its own title, and
 * the test fails on a step that carries neither or both.
 *
 * It stores nothing it can derive. Which day you are on is the first day whose
 * steps are not all finished, worked out on each render; there is no pointer
 * column and no day counter to drift (ADR-014). Two of the steps are proved by
 * the review log alone and are never recorded at all.
 *
 * It is not a cage. A day is what the app suggests, and Learn, Practice,
 * Review and every game stay exactly where they were and work exactly as they
 * did. Somebody who wants to pick their own evening still can, and the work
 * they do that way counts toward the day they are on.
 *
 * Pure, like the rest of `lib/collections`: plain data and pure functions, no
 * React, no Prisma, no clock.
 */

import type { Level } from "@/lib/collections/syllabus";
import { modeAt } from "@/lib/ux/modes";

/**
 * What a step does to a learner, which is what decides how it is drawn and
 * whether finishing it has to be recorded.
 *
 *   meet    the day's words, walked up the Learn ladder
 *   read    the grammar point the day turns on, on the reference page
 *   drill   a round that asks those words back in one particular way
 *   game    a round that is mostly fun and asks them sideways
 *   talk    a conversation, where the words are used on somebody
 *   review  the closing round over everything due, which is the reinforcement
 *
 * `drill` and `game` differ in nothing the code reads and a great deal the
 * learner reads: a day that is four drills long is homework, and a day whose
 * middle is a game is an evening. Keeping them apart is what lets
 * `course.test.ts` assert that no day is all of one.
 */
export type StepKind = "meet" | "read" | "drill" | "game" | "talk" | "review";

/**
 * One thing a day does, named once and picked by key.
 *
 * The `why` is standing rather than per day, and that is a decision. A reason
 * written fresh for each of eleven days is eleven sentences nobody checked,
 * and what a learner wants from that line is what this round is *for*, which
 * does not change with the day. What changes with the day is the words, and
 * those the round takes from the deck.
 */
export interface ActivitySpec {
  /** Where it goes. A practice mode's own href wherever there is one. */
  href: string;
  /**
   * What it is called, for the routes that are not practice modes. Where
   * `modeAt(href)` answers, that title wins and this may not be set: one table
   * of what a mode is called, and this is not it.
   */
  title?: string;
  /** Why the day spends these minutes here. One line, to the learner. */
  why: string;
  kind: StepKind;
}

/**
 * Every activity a day may pick, once.
 *
 * Deliberately short. The app has twenty-odd rounds and a programme that drew
 * on all of them would be a tour rather than a course: what a beginner needs
 * in their first fortnight is the same handful of things done properly, and a
 * round that needs a microphone, a photograph or a pasted article is a round
 * that can fail on a Tuesday for reasons that are nothing to do with Estonian.
 */
export const ACTIVITIES = {
  match: {
    href: "/review/match", kind: "game",
    why: "Eight pairs against the clock. The meanings settle before anything asks you to produce one.",
  },
  listening: {
    href: "/review/listening", kind: "drill",
    why: "The same words with nothing written down. Reading them is not hearing them.",
  },
  sprint: {
    href: "/review/sprint", kind: "game",
    why: "Sixty seconds of endings. Speed turns a form you can work out into one you simply know.",
  },
  sentences: {
    href: "/review/sentences", kind: "drill",
    why: "Rebuild a sentence a native writer wrote, and the words land in the order Estonian uses.",
  },
  dictation: {
    href: "/review/dictation", kind: "drill",
    why: "Hear a whole sentence and write it down. This is where the long and short vowels stop being a rule.",
  },
  picture: {
    href: "/review/emoji", kind: "game",
    why: "No English on the board, so the ending is the only thing to go on.",
  },
  describe: {
    href: "/review/describe", kind: "drill",
    why: "One sentence of your own about a picture. Producing a sentence is the whole point of the words.",
  },
  sonad: {
    href: "/sonad", kind: "game",
    why: "Today's word in six circles. Three minutes, and the letters of Estonian stop being strange.",
  },
  target: {
    href: "/review/target", kind: "game",
    why: "Four forms of one word and a question word saying which. Nothing to cross out but the ending.",
  },
  conjugation: {
    href: "/review/conjugation", kind: "drill",
    why: "One verb, six persons, typed. A verb you cannot conjugate is a verb you cannot use.",
  },
  speaking: {
    href: "/review/speaking", kind: "drill",
    why: "Say it out loud and hear it back. Nothing scores you: this is for your own ear.",
  },
  write: {
    href: "/review/write", kind: "drill",
    why: "Write your own sentence using a form we name. The form is checked against the dictionary first.",
  },
  government: {
    href: "/review/government", kind: "drill",
    why: "Aitan sind, but helistan sulle. English gives you nothing to go on here, so it is learned verb by verb.",
  },
  exceptions: {
    href: "/review/exceptions", kind: "drill",
    why: "The words where the ending rule breaks down. You meet them and then write them, instead of looking them up every time.",
  },
  flash: {
    href: "/review/flashcards", kind: "drill",
    why: "Words you have already met, asked in ways review does not: heard, gapped, or built into a sentence.",
  },
} as const satisfies Record<string, ActivitySpec>;

export type ActivityKey = keyof typeof ACTIVITIES;

/** A day, as a person writes one. `day()` turns it into the thing screens read. */
export interface DaySpec {
  /** Stable for the life of the programme: a finished-step row names it. */
  id: string;
  /** Estonian. This is a course in Estonian and its days should be too. */
  title: string;
  /** English, so the title itself is never the thing blocking a beginner. */
  subtitle: string;
  /**
   * What you can do at the end of it, said about the learner.
   *
   * The unit's own, and deliberately not rewritten per evening: a unit is a
   * lesson a person wrote and its claim is the true one, so an evening that is
   * a third of it says which third rather than inventing a smaller promise.
   */
  canDo: string;
  /** The syllabus unit the words come from. Asserted to exist. */
  unitId: string;
  /** The level, which is what prices the meet step. */
  level: string;
  /**
   * The words today teaches, in teaching order, hand-picked out of that unit.
   *
   * A request against the dictionary, never a fact about it: the same
   * direction of authority the syllabus takes, so a lemma this file gets wrong
   * fails to arrive rather than becoming a wrong word.
   */
  words: readonly string[];
  /**
   * The one point today turns on, read on the reference page before the rounds.
   *
   * Two fields rather than one because the reference has two shapes of page
   * and they are different questions: `grammar` is a topic id out of
   * `lib/estonian/grammar.ts` (the present tense, negation, how numbers work),
   * and `grammarCase` is one of the fourteen cases, which has a page of its
   * own built out of the dictionary. A day may name at most one, asserted,
   * since two readings before the first round is a lesson rather than a day.
   */
  grammar?: string;
  /** A case key, upper case, as `lib/estonian/cases.ts` spells it. */
  grammarCase?: string;
  /** Activity keys, in the order the day does them. */
  practice: readonly ActivityKey[];
  /** A conversation to have at the end, where one fits. A scene id. */
  scene?: string;
}

/** A step, resolved: what it is called, where it goes, and who proves it. */
export interface CourseStep {
  /** Unique inside its day, and stored. See `stepId`. */
  id: string;
  kind: StepKind;
  title: string;
  why: string;
  href: string;
  minutes: number;
  /**
   * Whether the review log alone says this is finished.
   *
   * Two of them are: meeting the day's words leaves a mark on every one of
   * their cards, and the closing review is answers graded since the day
   * opened. Those are never recorded, because a fact with two sources drifts,
   * and this project has paid for that often enough to know.
   *
   * The rest cannot be. A `Review` row carries no note of which mode wrote it,
   * so a round of Match and a flip of the same card are one row in the log,
   * and there is no honest way to read one back as "they played Match". Those
   * steps are ticked by the learner on the day's own screen and recorded, and
   * the screen says which kind each one is rather than implying the app
   * watched.
   */
  derived: boolean;
}

export interface CourseDay extends DaySpec {
  /** 1-based, and what the screen calls it. */
  readonly index: number;
  /**
   * Which slice of its unit this is, where a unit takes more than one evening.
   *
   * A unit of twenty words is three evenings, and all three are honestly the
   * same lesson: they carry the unit's title and the unit's own `canDo`, and
   * this is what lets the screen say "part 2 of 3 toward" rather than claiming
   * the whole thing on the first night. `of` is 1 for a unit that fits in one
   * evening, and the screen then says nothing.
   */
  readonly part: { n: number; of: number };
  readonly steps: readonly CourseStep[];
  /** The sum of the steps, which is what the day claims it will take. */
  readonly minutes: number;
}

export interface ProgrammeSpec {
  id: string;
  /** Estonian, like a day's. */
  title: string;
  subtitle: string;
  level: Level;
  /** One paragraph on what finishing it means. Shown once, at the start. */
  blurb: string;
  days: readonly DaySpec[];
}

export interface Programme extends Omit<ProgrammeSpec, "days"> {
  readonly days: readonly CourseDay[];
}

/**
 * What a step is called.
 *
 * A practice mode's title comes out of `PRACTICE_MODES` and nowhere else, so
 * the programme cannot end up calling Match something Practice does not. A
 * route that is not a mode carries its own, and `course.test.ts` fails on a
 * step with neither, and on one with both.
 */
export function activityTitle(spec: ActivitySpec): string {
  return modeAt(spec.href)?.title ?? spec.title ?? spec.href;
}

/** The step ids that are the same on every day, so a caller can name one. */
export const MEET_STEP = "meet";
export const READ_STEP = "read";
export const TALK_STEP = "talk";
export const REVIEW_STEP = "review";

/**
 * How many words a day teaches, at most.
 *
 * Eight, and it is the Learn ladder's own five plus a little room rather than
 * a number chosen to look tidy. A batch is five words met, asked and produced,
 * and eight is two laps of that with the second one short, which is about
 * twelve minutes. Ten was tried on paper and is a different evening: the
 * closing review is then mostly today's words rather than the week's, which is
 * how a course turns into a treadmill.
 */
/**
 * FIFTEEN MINUTES, EVERY EVENING, AND THE WORD COUNT IS WHAT MOVES.
 *
 * A day used to be "the unit sliced into eights" and came out at anything from
 * eighteen to thirty minutes. That is the wrong thing to hold fixed. What a
 * learner can promise themselves is a quarter of an hour after dinner, every
 * day, and what makes a course keep going is that the promise is the same
 * every time: a day that is fifteen minutes on Monday and twenty-eight on
 * Tuesday is a day somebody starts skipping on Wednesday.
 *
 * So the evening is the constant and everything else is fitted to it. The
 * steps have honest costs, the day's fixed part is whatever those come to, and
 * the number of new words is what is left over. That is also the right thing
 * to vary, because meeting a word is the one part of an evening whose cost
 * scales with how far in you are.
 *
 * It is not a promise about the whole part. A1.1 is seventeen of these, not
 * fifteen minutes.
 */
export const DAY_MINUTES = 15;

/** The closing round: `CLOSING_REVIEW` cards at the app's own pace. */
export const REVIEW_MINUTES = 2;

/** One page of the grammar reference, read rather than studied. */
export const READ_MINUTES = 2;

/**
 * One round inside a planned evening.
 *
 * The same figure for all of them, which is a decision rather than laziness:
 * every round in the rotations is a short one by design, and a day whose
 * length depended on which round the rotation happened to deal would be the
 * variable evening this whole model exists to remove. The same round opened
 * from Practice runs as long as somebody wants.
 */
export const ROUND_MINUTES = 3;

/**
 * A conversation, which replaces the reading and both rounds rather than
 * joining them.
 *
 * Ten minutes is seven to ten turns with the reading and the thinking in
 * between, and it is deliberately the same as `READ_MINUTES` plus two rounds,
 * so an evening with a conversation in it is the same evening.
 */
export const TALK_MINUTES = READ_MINUTES + ROUND_MINUTES * 2;

/**
 * How long one new word takes to meet, by level.
 *
 * The Learn ladder walks a word up three rungs, met, then picked out of four,
 * then typed back into a sentence, which is about a minute for a beginner: the
 * word is a new shape, the sentence is six words they have to read one at a
 * time, and the gap is typed on a keyboard with no õ on it. It falls with the
 * level because none of that is true further up: a C1 learner meeting
 * `hoolimata` already has the stem, the case and the register and is learning
 * one thing about it.
 *
 * So a fifteen-minute evening carries five new words at A1 and seven at C1,
 * which is the honest shape of the difference. Five is also exactly the Learn
 * ladder's own batch, so a beginner's evening is one lap of it.
 */
export const MINUTES_PER_WORD: Record<string, number> = {
  A1: 1.1, A2: 1.0, B1: 0.9, B2: 0.8, C1: 0.7,
};

/** The ceiling a day may not pass whatever the arithmetic says. */
export const MAX_DAY_WORDS = 8;

/**
 * How many new words fit in what is left of the evening.
 *
 * Rounded rather than floored, and floored at three: a day that taught two
 * words would be a day whose closing review is most of it, and the slice is
 * even inside a unit so the short night is only ever one word short.
 */
export function wordsInBudget(level: string, fixedMinutes: number): number {
  const perWord = MINUTES_PER_WORD[level] ?? MINUTES_PER_WORD.A1!;
  const room = Math.max(0, DAY_MINUTES - fixedMinutes);
  return Math.min(MAX_DAY_WORDS, Math.max(3, Math.round(room / perWord)));
}

/**
 * What an evening carries: a reading, two rounds and the closing review, or a
 * conversation and the closing review, which cost the same.
 *
 * One function rather than two, because `TALK_MINUTES` is defined as exactly
 * what a conversation displaces. An evening is an evening whichever shape it
 * takes, and that is the whole point of the model.
 */
export const ordinaryWords = (level: string): number =>
  wordsInBudget(level, READ_MINUTES + ROUND_MINUTES * 2 + REVIEW_MINUTES);

/**
 * Build a day. The steps are the order, and the order is the argument.
 *
 * Meet the words first, because nothing else on the list means anything until
 * the words are in. Read the grammar second, while the forms are still strange
 * and the page has something to explain rather than to revise. Then the rounds
 * the day picked, then the conversation if it has one, because using a word on
 * somebody is the last rung and the one everything else was for. Then review,
 * always last and always there: it is the part that makes yesterday stick, and
 * a day whose closing round is optional is a course that teaches a fortnight
 * of words and keeps none of them.
 */
export function day(spec: DaySpec, index: number, part = { n: 1, of: 1 }): CourseDay {
  const steps: CourseStep[] = [];
  const perWord = MINUTES_PER_WORD[spec.level] ?? MINUTES_PER_WORD.A1!;

  steps.push({
    id: MEET_STEP,
    kind: "meet",
    title: `Meet today's ${spec.words.length} words`,
    why: "You meet each word, pick it out of four, then type it back into a sentence a native writer wrote.",
    href: "/course/learn",
    minutes: Math.max(1, Math.round(spec.words.length * perWord)),
    derived: true,
  });

  /*
    A CONVERSATION REPLACES THE READING AND BOTH ROUNDS RATHER THAN JOINING
    THEM, which is what keeps the evening fifteen minutes on the night it
    happens. `TALK_MINUTES` is defined as exactly what it displaces, so the two
    shapes of evening cost the same and carry the same number of new words. It
    was written the other way first and the conversation evening came out at
    twenty-three minutes, half as long again as every other.
  */
  const talking = Boolean(spec.scene);

  const reads = talking ? null : spec.grammar
    ? `/grammar/topic/${spec.grammar}`
    : spec.grammarCase ? `/grammar/${spec.grammarCase.toLowerCase()}` : null;
  if (reads) {
    steps.push({
      id: READ_STEP,
      kind: "read",
      title: "Read the grammar behind it",
      why: "One page on what today's words all do. Read it now, while the forms still look strange.",
      href: reads,
      minutes: READ_MINUTES,
      derived: false,
    });
  }

  for (const key of talking ? [] : spec.practice) {
    const activity: ActivitySpec = ACTIVITIES[key];
    steps.push({
      id: `do:${key}`,
      kind: activity.kind,
      title: activityTitle(activity),
      why: activity.why,
      href: activity.href,
      minutes: ROUND_MINUTES,
      derived: false,
    });
  }

  if (spec.scene) {
    steps.push({
      id: TALK_STEP,
      kind: "talk",
      title: "Have the conversation",
      why: "Somebody wants something from you and only Estonian will do. This is what the words were for.",
      href: `/situations/${spec.scene}`,
      minutes: TALK_MINUTES,
      derived: false,
    });
  }

  steps.push({
    id: REVIEW_STEP,
    kind: "review",
    title: "Quick review, and you are done",
    why: "Everything you are about to forget, today's words included. This is the part that makes them stick.",
    href: "/review",
    minutes: REVIEW_MINUTES,
    derived: true,
  });

  return {
    ...spec,
    index,
    part,
    steps,
    minutes: steps.reduce((total, step) => total + step.minutes, 0),
  };
}
