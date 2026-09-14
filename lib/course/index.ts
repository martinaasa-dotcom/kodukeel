/**
 * THE PROGRAMMES, ASSEMBLED, AND THE RULES FOR WHERE SOMEBODY IS IN ONE.
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

import { unitById } from "@/lib/collections/syllabus";
import { buildProgrammes } from "./build";
import type { CourseDay, CourseStep, Programme } from "./types";

export * from "./types";
export * from "./plan";
export * from "./build";
export * from "./gate";
export * from "./milestones";

export const PROGRAMMES: readonly Programme[] = buildProgrammes();

/**
 * Where somebody with no history starts, which is the first part of A1.
 *
 * Only ever a default. `lib/progress/course.ts` offers the first part *at or
 * below the learner's own level*, so a B1 speaker who turns the course on gets
 * B1.1 rather than twelve evenings of greetings, and nobody is asked to work
 * up through a level a paper has already measured them past.
 */
export const DEFAULT_PROGRAMME = PROGRAMMES[0]!;

/** Every part of a level, in order. */
export function programmesAtLevel(level: string): readonly Programme[] {
  return PROGRAMMES.filter((p) => p.level === level);
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

/** Every unit the programme draws on, in the order it first draws on each. */
export function programmeUnits(programme: Programme): string[] {
  const seen: string[] = [];
  for (const d of programme.days) if (!seen.includes(d.unitId)) seen.push(d.unitId);
  return seen;
}

/** The unit a day names, resolved, or undefined where the id is wrong. */
export const unitOf = (d: CourseDay) => unitById(d.unitId);

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
 * Where somebody is in the whole programme.
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
 * Every word the programme has taught up to and including a day.
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
