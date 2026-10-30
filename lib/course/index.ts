/**
 * THE PROGRAMS, ASSEMBLED, AND THE RULES FOR WHERE SOMEBODY IS IN ONE.
 *
 * Pure: a set of finished step ids in, a day and a next step out. There is no
 * pointer anywhere saying which day a learner is on, and there is not going to
 * be one. The day you are on is the first day whose steps are not all
 * finished, worked out on each render from rows that record what actually
 * happened, which is ADR-014's rule applied to a course rather than to a
 * chart. A stored day counter is a second source of truth that drifts, and it
 * can be advanced by something that never occurred.
 *
 * WHAT COUNTS AS FINISHED IS TWO DIFFERENT CLAIMS AND THE SCREEN SAYS WHICH.
 * A step marked `derived` is proved by the learner's own review log: meeting
 * the day's words leaves a mark on every one of their cards, and the closing
 * review is answers graded since the day opened. Those cannot be ticked and
 * cannot be faked. Every other step is the learner saying they did it, which
 * is the same class of fact as the conversation Today asks about, and it is
 * recorded the same way: append-only, one row, never edited.
 *
 * `lib/progress/course.ts` is the half that reads a database.
 */

import { SYLLABUS, unitById } from "@/lib/collections/syllabus";
import { buildProgrammes } from "./build";
import type { CourseDay, CourseStep, Programme } from "./types";

export * from "./types";
export * from "./plan";
export * from "./build";
export * from "./gate";
export * from "./focus";
export * from "./milestones";
export * from "./placement";
export * from "./adapt";
export * from "./stepText";

/*
  THE COURSE IS BUILT THE FIRST TIME SOMETHING READS IT, NOT WHEN THIS FILE LOADS.

  `app/actions.ts` imports this barrel, and the root layout reaches a Server
  Action, so every route's server bundle evaluates this file on a cold start,
  `/privacy` and `/sign-in` included. Built eagerly, that was every evening of
  the ladder assembled before the first byte of any page, measured at about
  350 ms of CPU and paid twice (milestones built its own copy). Behind this
  the routes that never read a part pay nothing, and the ones that do pay the
  build once per instance, since `buildProgrammes` keeps what it made.

  A proxy over the built list rather than a function, so the fifty readers of
  `PROGRAMMES` keep reading an array: indexing, `find`, `map`, `length` and
  iteration all reach the real list, and an element read through it is the
  real programme, so identity comparisons hold.
*/
export const PROGRAMMES: readonly Programme[] = new Proxy([] as Programme[], {
  get(_target, key) {
    const built = buildProgrammes();
    const value = Reflect.get(built, key, built);
    return typeof value === "function" ? value.bind(built) : value;
  },
  has: (_target, key) => Reflect.has(buildProgrammes(), key),
  ownKeys: () => Reflect.ownKeys(buildProgrammes()),
  getOwnPropertyDescriptor: (_target, key) => Reflect.getOwnPropertyDescriptor(buildProgrammes(), key),
});

/**
 * Where somebody with no history starts, which is the first part of A1.
 *
 * Only ever a default. `lib/progress/course.ts` opens the course past the
 * level somebody holds (`lib/course/placement.ts`), so a B1 speaker who turns
 * it on gets B2.1 rather than twelve evenings of greetings, and nobody is asked
 * to work up through a level they have already named or a paper has measured.
 *
 * A function rather than a constant for the reason `PROGRAMMES` is a proxy:
 * reading the first part is building the course.
 */
export function defaultProgramme(): Programme {
  return PROGRAMMES[0]!;
}

/**
 * The part that follows this one, which is the next part of the same level or
 * the first of the next. Null at the end of C1, where there is nothing after.
 */
export function programmeAfter(programme: Programme): Programme | undefined {
  const at = PROGRAMMES.findIndex((p) => p.id === programme.id);
  return at < 0 ? undefined : PROGRAMMES[at + 1];
}

export function programmeById(id: string): Programme | undefined {
  return PROGRAMMES.find((p) => p.id === id);
}

export function dayById(programme: Programme, dayId: string): CourseDay | undefined {
  return programme.days.find((d) => d.id === dayId);
}

/** The part and the evening a lesson is, or undefined for an id no part holds. */
export function lessonDayFor(lessonId: string): { programme: Programme; day: CourseDay } | undefined {
  for (const programme of PROGRAMMES) {
    const day = programme.days.find((d) => d.lesson === lessonId);
    if (day) return { programme, day };
  }
  return undefined;
}

/** Every unit the program draws on, in the order it first draws on each. */
export function programmeUnits(programme: Programme): string[] {
  const seen: string[] = [];
  for (const d of programme.days) if (!seen.includes(d.unitId)) seen.push(d.unitId);
  return seen;
}

/** The unit a day names, resolved, or undefined where the id is wrong. */
export const unitOf = (d: CourseDay) => unitById(d.unitId);

/**
 * THE DAY A PROGRAM IS STANDING ON, BEFORE ANYTHING IS ASKED OF THE LOG.
 *
 * The furthest day carrying a tick, and day one where there are none. That is
 * the whole pointer, and it is derived rather than stored (ADR-014): a tick is
 * a row saying somebody was on that day's screen doing that day's work.
 *
 * IT USED TO BE RECOMPUTED FROM DAY ONE AND THAT CANNOT WORK, which is the
 * fault this function exists for. Two of every day's steps are proved by the
 * review log and are written nowhere, so by ticks alone *every* day is
 * unfinished and the first unfinished one is day one, for ever. The reading
 * then had to resolve the derived steps of every day it walked past, two
 * queries each, on the screen somebody opens each morning, under a cap; past
 * the cap the learner was held on whichever day the cap fell on.
 *
 * Walking past a day is what finishing it means, and this is that sentence
 * written down: the days before the one reached are done, the one reached is
 * the one to ask the log about, and the cost is the same on the first evening
 * and the two hundredth.
 *
 * It is monotonic, which is what makes it safe: a tick is never deleted, so
 * the day reached never moves backwards. `markCourseStep` is the other half,
 * and refuses a tick for any day past the one after it, so the pointer moves
 * one evening at a time. It does not wait for the day reached to be finished:
 * a tick on the next day is "start the next one now", and walking past a day
 * is what this reading counts as finishing it.
 */
export function dayReached(programme: Programme, ticked: ReadonlySet<string>): CourseDay {
  let reached = programme.days[0]!;
  for (const d of programme.days) if (ticked.has(d.id)) reached = d;
  return reached;
}

/** How far through a day somebody is. */
export interface DayStanding {
  day: CourseDay;
  /** Step ids finished, whether proved or ticked. */
  done: ReadonlySet<string>;
  /** The first unfinished step, which is the button the screen leads with. */
  next: CourseStep | null;
  complete: boolean;
  /** Finished steps out of all of them, for the ring. */
  pct: number;
  /** Minutes left, adding up what is not done. Honest rather than cheerful. */
  minutesLeft: number;
}

/**
 * A day's standing, given what is finished.
 *
 * The next step is the first unfinished one in the day's own order rather than
 * the cheapest one left, because the order is the argument: reading the
 * grammar after the rounds is revision, and reviewing before meeting the words
 * is a round about last week.
 */
export function dayStanding(d: CourseDay, done: ReadonlySet<string>): DayStanding {
  const finished = d.steps.filter((s) => done.has(s.id));
  const next = d.steps.find((s) => !done.has(s.id)) ?? null;
  return {
    day: d,
    done,
    next,
    complete: next === null,
    pct: d.steps.length === 0 ? 100 : Math.round((finished.length / d.steps.length) * 100),
    minutesLeft: d.steps.filter((s) => !done.has(s.id)).reduce((t, s) => t + s.minutes, 0),
  };
}

/**
 * Where somebody is in the whole program.
 *
 * `current` is the first unfinished day, and it is null exactly when every day
 * is finished, which is the one state this screen gets to celebrate.
 */
export interface ProgrammeStanding {
  programme: Programme;
  current: DayStanding | null;
  /** Days with every step finished. */
  daysDone: number;
  /** The day after the current one, for "start the next one now". */
  upcoming: CourseDay | null;
  finished: boolean;
}

export function programmeStanding(
  programme: Programme,
  doneByDay: ReadonlyMap<string, ReadonlySet<string>>,
): ProgrammeStanding {
  const empty: ReadonlySet<string> = new Set();
  let current: DayStanding | null = null;
  let daysDone = 0;

  for (const d of programme.days) {
    const standing = dayStanding(d, doneByDay.get(d.id) ?? empty);
    if (standing.complete) {
      daysDone += 1;
      continue;
    }
    if (!current) current = standing;
  }

  const upcoming = current
    ? programme.days.find((d) => d.index === current!.day.index + 1) ?? null
    : null;

  return { programme, current, daysDone, upcoming, finished: current === null };
}

/**
 * Every word the program has taught up to and including a day.
 *
 * What a learner has been *given*, which is a different question from what
 * their deck holds: somebody who skipped a round still met the words. The
 * review queue is where "do you still have it" is answered.
 */
export function wordsThrough(programme: Programme, index: number): string[] {
  const words: string[] = [];
  for (const d of programme.days) {
    if (d.index > index) break;
    for (const w of d.words) if (!words.includes(w)) words.push(w);
  }
  return words;
}

/**
 * Every word the *ladder* has taught by a day, which is not the same question.
 *
 * A `Programme` is one part of eighteen, so `wordsThrough` answers about a
 * fortnight: on the first evening of a1.5 it returns that evening's eight
 * words and says nothing about the 386 the four parts before it handed over.
 * That is the right answer for a bar counting a part's own progress and the
 * wrong one for anything asking what this learner has met, which is why the
 * two are separate functions rather than a flag.
 *
 * The rule in `lib/collections/levels.ts` is the caller that cares. Drawn
 * against a part it refuses nearly every sentence a learner deep in A1 can
 * read: measured over every A1 evening, 3 of the 464 words the dictionary can
 * gap had a readable sentence against 49 once the earlier parts count, so the
 * per-part reading was throwing away 94% of them and reporting the supply as
 * the reason.
 *
 * `PROGRAMMES` is the ladder in order, so "before" is the parts ahead of this
 * one. A program that is not on the ladder is credited with nothing before
 * it rather than with everything, which is `lemmasTaughtBefore`'s rule one
 * level up: reading "I cannot place this" as "all of it has been taught" is
 * the silent failure rather than the cautious one.
 *
 * It is the course's order rather than this learner's history, which is the
 * weaker of the two claims and is deliberate, for the reason
 * `lib/progress/lessonWords.ts` gives at length about units.
 */
export function taughtThrough(programme: Programme, index: number): string[] {
  const at = PROGRAMMES.findIndex((p) => p.id === programme.id);
  const words: string[] = [];
  if (at > 0) {
    for (const before of PROGRAMMES.slice(0, at)) {
      for (const d of before.days) for (const w of d.words) if (!words.includes(w)) words.push(w);
    }
  }
  for (const w of wordsThrough(programme, index)) if (!words.includes(w)) words.push(w);
  return words;
}

/**
 * The verbs whose past forms the ladder has shown through a day, every part
 * before it included. A verb's past is asked inside the module only once it
 * is on this list (`slotWithin` in `scope.ts`).
 */
export function formsThrough(programme: Programme, index: number): string[] {
  const at = PROGRAMMES.findIndex((p) => p.id === programme.id);
  const out: string[] = [];
  const take = (d: CourseDay) => { for (const v of d.forms ?? []) if (!out.includes(v)) out.push(v); };
  if (at > 0) for (const before of PROGRAMMES.slice(0, at)) before.days.forEach(take);
  for (const d of programme.days) if (d.index <= index) take(d);
  return out;
}

/**
 * The verbs whose simple past an evening has shown through a day: every verb a
 * forms step showed (`formsThrough`) and every verb whose past a lesson taught
 * by name (`DaySpec.pasts`). Wider than `formsThrough`, which also says the
 * polite imperative was shown.
 */
export function pastsThrough(programme: Programme, index: number): string[] {
  const at = PROGRAMMES.findIndex((p) => p.id === programme.id);
  const out = formsThrough(programme, index);
  const take = (d: CourseDay) => { for (const v of d.pasts ?? []) if (!out.includes(v)) out.push(v); };
  if (at > 0) for (const before of PROGRAMMES.slice(0, at)) before.days.forEach(take);
  for (const d of programme.days) if (d.index <= index) take(d);
  return out;
}

/**
 * The units the ladder has opened through a day, every part before it
 * included, in teaching order. A conversation is dealt only once every unit
 * it declares is on this list (`course.test.ts`), so a screen offering one
 * outside the module can say which are ahead of the learner.
 */
export function unitsThrough(programme: Programme, index: number): string[] {
  const at = PROGRAMMES.findIndex((p) => p.id === programme.id);
  const out: string[] = [];
  /*
    A LESSON EVENING NAMES NO UNIT. The A1 lessons teach A1 by goal rather
    than unit by unit, so inside them no unit is opened, and the catalog's
    conversations, which declare A1 and A2 units, wait for A2; the lessons'
    own role-plays are what A1 talks in. Once the lessons are behind a
    learner, every unit of their level counts as opened. That is a claim about
    the setting a conversation declares (the cafe, the doctor), not about every
    word of the units: the lessons taught by goal, and most of a B1 unit's
    lemmas are taught by no evening. What a conversation asks a learner to say
    is checked word by word in `course.test.ts`, which names the words the
    ladder has not taught yet for B2's lessons to take up.
  */
  const take = (d: CourseDay) => {
    if (d.lesson && d.level === programme.level) return;
    const units = d.lesson ? SYLLABUS.filter((u) => u.level === d.level).map((u) => u.id) : [d.unitId];
    for (const u of units) if (!out.includes(u)) out.push(u);
  };
  if (at > 0) for (const before of PROGRAMMES.slice(0, at)) before.days.forEach(take);
  for (const d of programme.days) if (d.index <= index) take(d);
  return out;
}

/** The pages the ladder has read through a day: cases by key, topics by id. */
export interface GrammarTaught {
  cases: string[];
  topics: string[];
}

/**
 * Every grammar page the ladder has opened through a day, across the parts
 * before this one and this one's own evenings, in the order they were read.
 *
 * The other half of `taughtThrough`: a case is asked only after its page has
 * been read, so a round opened from the module needs to know which pages
 * those are, and the builder's ledger is not on the day. The day's own
 * reading counts, since it comes before the rounds.
 */
export function grammarThrough(programme: Programme, index: number): GrammarTaught {
  const at = PROGRAMMES.findIndex((p) => p.id === programme.id);
  const cases: string[] = [];
  const topics: string[] = [];
  const take = (d: CourseDay) => {
    for (const key of [d.grammarCase, ...(d.cases ?? [])]) if (key && !cases.includes(key)) cases.push(key);
    for (const topic of [d.grammar, ...(d.topics ?? [])]) if (topic && !topics.includes(topic)) topics.push(topic);
  };
  if (at > 0) for (const before of PROGRAMMES.slice(0, at)) for (const d of before.days) take(d);
  for (const d of programme.days) if (d.index <= index) take(d);
  return { cases, topics };
}
