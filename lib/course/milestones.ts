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
 * WHAT IS VERIFIED IS WORDS THE SCHEDULER HAS GRADUATED, not evenings ticked.
 * That is the whole point of putting it beside the course: an evening ticked
 * says somebody sat down, and a graduated card says they still had the word
 * days later. A bar that filled on attendance would be the same false
 * confidence the hand-off warning exists to catch, drawn as a picture.
 *
 * AND A LEVEL BEHIND THE ONE THEY STAND AT IS COUNTED WITHOUT BEING CHECKED.
 * That rule was the whole of it for a while, and on its own it told a B1
 * learner they were six percent through A1 on the morning they arrived. Every
 * word of that was true about this app's own scheduler and none of it was true
 * about the person reading it, who has been speaking Estonian for a year: the
 * screen was reporting the emptiness of a review log as though it were the
 * emptiness of somebody's Estonian. It was reported in those words, as
 * disconnected from reality, and it is, because a bar drawn from one source
 * while the course opens the learner at B1.1 is the app holding two answers to
 * where somebody is and drawing the less informed one.
 *
 * So a level below where they stand is **credited** rather than shown as
 * untouched, and the split is on the screen instead of hidden: A1 and A2 are
 * counted as theirs, the check is the part still to come, and the checked share
 * of each of those stops climbs as they actually meet the words. Nothing is
 * stored for it (ADR-014), since the standing is one read and the arithmetic is
 * here.
 *
 * WHAT THAT MAY NEVER DO IS PASS FOR A MEASUREMENT. `assumed` is its own state
 * rather than `passed` for that reason, and the difference is load-bearing one
 * module over: `lib/email/letters/milestone.ts` fires on a level the scheduler
 * graduated, so folding the two together would post somebody a congratulation
 * for a band they ticked in a dropdown. A stop says which of the two it is, in
 * words and not in a hue, and every screen drawing the credited figure draws
 * the checked one beside it.
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

/**
 * What a stop is, and the four are not two pairs.
 *
 * `passed` is the scheduler's verdict and `assumed` is the learner's own, and
 * a reader has to be able to tell them apart at a glance or the second one
 * quietly becomes the first. `here` is the level they are working through,
 * which is the one their standing puts them at rather than the first one with
 * a hole in it: a B1 learner is on B1 whatever their A1 cards say.
 */
export type MilestoneState = "passed" | "assumed" | "here" | "ahead";

/**
 * Where the app currently holds that somebody stands, and what kind of answer
 * that is. `lib/progress/level.ts` decides it, and the kind travels because a
 * band a paper measured and a band a stranger ticked in ninety seconds are the
 * same letter and are not worth the same sentence on screen.
 */
export interface LadderStanding {
  level: Level;
  kind: "measured" | "declared";
}

export interface Milestone {
  level: Level;
  /** The Estonian name of the level, which is what the stop is called. */
  title: string;
  /** One line on what arriving there means, about the learner. */
  arrival: string;
  /** Where along the whole climb this stop sits, 0 to 100. */
  at: number;
  /** How far through this level's own words the scheduler has verified, 0 to 100. */
  pct: number;
  /** Reached, credited from where they stand, being worked on now, or ahead. */
  state: MilestoneState;
  /** How many parts of the ladder this level is made of. */
  parts: number;
  /** Words this level teaches, which is the denominator of the stop. */
  words: number;
  /** Words of it the scheduler has graduated, which is never assumed. */
  verified: number;
}

/**
 * How many of a stop's own words are still to come.
 *
 * Out here rather than at the caller, because the caller got it wrong: the
 * weekly letter printed `total - known`, which is how far the *target* is,
 * under a sentence saying how far the next stop is. On somebody at A1 aiming
 * for B1 that put the distance to B1 beside the word A2. The fault was
 * arithmetic, and arithmetic belongs where a test can hold it still.
 *
 * Floored at one, because a stop that has not been reached is a stop with
 * something left in it, and "0 words away" from one reads as a bug. Rounded up
 * for the same reason.
 *
 * A credited stop is nought words away, like a passed one, because this answers
 * how far the *climb* has left to run and a level behind where somebody stands
 * is behind them. What is still unchecked about it is `words` less `verified`
 * on the stop itself, which is a different question and is asked where the
 * stop is drawn.
 */
export function wordsLeftAt(milestone: Pick<Milestone, "level" | "pct" | "state">): number {
  if (milestone.state === "passed" || milestone.state === "assumed") return 0;
  return Math.max(1, Math.ceil(ladderWordsAt(milestone.level) * (1 - milestone.pct / 100)));
}

export interface LadderProgress {
  target: Level;
  /** Where they stand and how that was arrived at, or null if nobody has said. */
  standing: LadderStanding | null;
  /** Words of the whole climb the scheduler has graduated. Never assumed. */
  verified: number;
  /** Those, plus every word of the levels behind where they stand. */
  credited: number;
  /** Words the whole climb asks for. */
  total: number;
  /** 0 to 100 of the way to the target, counting what is credited. The headline. */
  pct: number;
  /** The same climb counting only what the scheduler has checked. */
  verifiedPct: number;
  milestones: Milestone[];
  /** The stop being worked on, which is where the marker sits. */
  here: Milestone | undefined;
  /**
   * True once every word of the climb has been graduated.
   *
   * Verified and never credited, because the sentence this turns on says the
   * learner knows every word the level asks for, and an assumption cannot say
   * that about anybody. Somebody standing above their own target therefore has
   * a full bar and has not arrived, which is the honest reading of both.
   */
  arrived: boolean;
}

/**
 * The bar, given how many of each level's words the scheduler has graduated
 * and where the app holds that the learner stands.
 *
 * A stop is `passed` when its own words are, rather than when the bar has
 * swept past it, so a learner who has most of A2 but a hole in A1 can see
 * which of the two is short. A stop below their standing that is not passed is
 * `assumed`: counted toward the climb, drawn as counted, and still carrying its
 * own checked share so the evening they spend on an A1 word moves something.
 *
 * `standing` is required and nullable for the reason `NounStems.illSgShort`
 * is: a caller that has not thought about where the learner stands would draw
 * a B1 speaker at the bottom of A1 and it would look exactly like a learner
 * who has done nothing. Null is the honest answer where nobody has said, which
 * is a deployment that has never asked, and nothing is credited there.
 */
export function ladderProgress(
  target: Level,
  verifiedAt: Readonly<Record<string, number>>,
  levelTitle: (level: Level) => { title: string; arrival: string },
  standing: LadderStanding | null,
): LadderProgress {
  const levels = levelsTo(target);
  const total = levels.reduce((n, l) => n + ladderWordsAt(l), 0);

  let before = 0;
  const milestones: Milestone[] = levels.map((level) => {
    const words = ladderWordsAt(level);
    const verified = Math.min(words, Math.max(0, verifiedAt[level] ?? 0));
    const pct = words === 0 ? 100 : Math.round((verified / words) * 100);
    const behind = standing !== null && levelIndex(level) < levelIndex(standing.level);
    before += words;
    return {
      level,
      ...levelTitle(level),
      at: total === 0 ? 100 : Math.round((before / total) * 100),
      pct,
      state: (pct >= 100 ? "passed" : behind ? "assumed" : "ahead") as MilestoneState,
      parts: PARTS.filter((p) => p.level === level).length,
      words,
      verified,
    };
  });

  /*
    WHERE THE MARKER SITS IS THE FIRST STOP THAT IS NEITHER DONE NOR CREDITED.

    It used to be the first one with a hole in it, which is the same answer
    while nothing is credited and is the wrong one the moment something is: a
    B1 learner would be marked as standing at A1 on the strength of a review
    log that has never been asked about A1. The weekly letter reads this for
    its "next stop" line, so getting it wrong here posts the wrong level.
  */
  const here = milestones.find((m) => m.state === "ahead");
  if (here) here.state = "here";

  const verified = milestones.reduce((n, m) => n + m.verified, 0);
  const credited = milestones.reduce(
    (n, m) => n + (m.state === "assumed" ? m.words : m.verified), 0,
  );
  const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return {
    target,
    standing,
    verified,
    credited,
    total,
    pct: share(credited),
    verifiedPct: share(verified),
    milestones,
    here,
    arrived: milestones.every((m) => m.state === "passed"),
  };
}
