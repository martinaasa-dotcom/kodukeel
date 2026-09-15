/**
 * HOW FAR ALONG THE LADDER SOMEBODY IS, AND THE STOPS ON THE WAY.
 *
 * A learner chose a target band in their first ninety seconds and then never
 * heard about it again except as a date on a plan. The one thing a course can
 * tell somebody every morning is how far between where they started and where
 * they said they were going, and a bar with nothing on it says almost nothing:
 * eleven percent of what, and when does anything happen.
 *
 * So the bar carries the levels as stops. A1 to C1 is five of them, they are
 * the names the learner already uses about themselves, and each one is a real
 * thing that arrives: a stop is reached when the words of that level are in
 * hand. Between two stops the fill moves smoothly, so a fortnight of evenings
 * is visible without anything having to be "unlocked".
 *
 * WHAT IS MEASURED IS WORDS THE SCHEDULER HAS GRADUATED, not evenings ticked.
 * That is the whole point of putting it beside the course: an evening ticked
 * says somebody sat down, and a graduated card says they still had the word
 * days later. A bar that filled on attendance would be the same false
 * confidence the hand-off warning exists to catch, drawn as a picture.
 *
 * Pure: counts in, a shape out. `lib/progress/course.ts` asks the database.
 */

import { LEVELS, levelIndex, type Level } from "@/lib/collections/syllabus";
import { PARTS } from "./plan";
import { buildProgrammes } from "./build";

/** What the ladder teaches at a level, which is the denominator of a stop. */
const WORDS_AT: Record<string, number> = (() => {
  const byLevel: Record<string, number> = {};
  for (const programme of buildProgrammes()) {
    const words = new Set(programme.days.flatMap((d) => d.words));
    byLevel[programme.level] = (byLevel[programme.level] ?? 0) + words.size;
  }
  return byLevel;
})();

export const ladderWordsAt = (level: string): number => WORDS_AT[level] ?? 0;

/** Every level up to and including a target, in order. */
export function levelsTo(target: Level): Level[] {
  return LEVELS.filter((l) => levelIndex(l) <= levelIndex(target));
}

/** Words the whole climb to a target asks for. */
export const ladderWordsTo = (target: Level): number =>
  levelsTo(target).reduce((n, l) => n + ladderWordsAt(l), 0);

export interface Milestone {
  level: Level;
  /** The Estonian name of the level, which is what the stop is called. */
  title: string;
  /** One line on what arriving there means, about the learner. */
  arrival: string;
  /** Where along the whole climb this stop sits, 0 to 100. */
  at: number;
  /** How far through this level's own words, 0 to 100. */
  pct: number;
  /** Reached, being worked on now, or still ahead. */
  state: "passed" | "here" | "ahead";
  /** How many parts of the ladder this level is made of. */
  parts: number;
}

export interface LadderProgress {
  target: Level;
  /** Words of the whole climb the scheduler has graduated. */
  known: number;
  /** Words the whole climb asks for. */
  total: number;
  /** 0 to 100 of the way to the target. */
  pct: number;
  milestones: Milestone[];
  /** The stop being worked on, which is where the marker sits. */
  here: Milestone | undefined;
  /** True once every word of the climb is in hand. */
  arrived: boolean;
}

/**
 * The bar, given how many of each level's words are in hand.
 *
 * A stop is `passed` when its own words are, rather than when the bar has
 * swept past it, so a learner who has most of A2 but a hole in A1 is standing
 * at A1 and can see why. Erring that way is deliberate: the alternative reads
 * as the app having forgotten something they did.
 */
export function ladderProgress(
  target: Level,
  knownAt: Readonly<Record<string, number>>,
  levelTitle: (level: Level) => { title: string; arrival: string },
): LadderProgress {
  const levels = levelsTo(target);
  const total = levels.reduce((n, l) => n + ladderWordsAt(l), 0);
  const known = levels.reduce((n, l) => n + Math.min(ladderWordsAt(l), knownAt[l] ?? 0), 0);

  let before = 0;
  let firstUnfinished: Level | null = null;
  const milestones: Milestone[] = levels.map((level) => {
    const words = ladderWordsAt(level);
    const have = Math.min(words, knownAt[level] ?? 0);
    const pct = words === 0 ? 100 : Math.round((have / words) * 100);
    before += words;
    if (pct < 100 && !firstUnfinished) firstUnfinished = level;
    return {
      level,
      ...levelTitle(level),
      at: total === 0 ? 100 : Math.round((before / total) * 100),
      pct,
      state: "ahead" as Milestone["state"],
      parts: PARTS.filter((p) => p.level === level).length,
    };
  });

  for (const stop of milestones) {
    stop.state = stop.pct >= 100 ? "passed" : stop.level === firstUnfinished ? "here" : "ahead";
  }

  return {
    target,
    known,
    total,
    pct: total === 0 ? 0 : Math.round((known / total) * 100),
    milestones,
    here: milestones.find((m) => m.state === "here"),
    arrived: firstUnfinished === null,
  };
}
