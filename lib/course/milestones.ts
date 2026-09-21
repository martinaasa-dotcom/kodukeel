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

/** Two decimals, which is as fine as a percentage width on a phone can be. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * WHICH OF THE FOUR A STOP IS IN, OUT HERE SO A TEST CAN DRIVE IT.
 *
 * The one branch worth the extra function is the empty level. `pct` is a share
 * of a level's own words, so a level the ladder teaches none of has no share,
 * and reading that as a hundred would make the stop `passed`: that feeds
 * `arrived` and is what `lib/email/letters/milestone.ts` fires on, so it would
 * post a congratulation for a band nobody has done anything about and spend
 * the one mark that level will ever have. Nothing reaches it today, since all
 * five levels carry words and `targetFrom` cannot return a sixth, which is
 * exactly why the rule is testable here rather than a branch no fixture can
 * drive: it fails in the flattering direction and it would fail silently.
 */
export function stopState(words: number, pct: number, behind: boolean): MilestoneState {
  if (words > 0 && pct >= 100) return "passed";
  return behind ? "assumed" : "ahead";
}

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
  /**
   * How much of the whole climb this one level is, 0 to 100.
   *
   * A share rather than the point the stop sits at, because the strip draws
   * the levels as blocks: the picture a learner asked for is how far they have
   * come from the start of A1, and five proportional blocks say that where
   * five dots on a rail said only that there were five of something. A1 really
   * is a third of the way to C1 and the widths are how that is said.
   */
  share: number;
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
  /**
   * The credited words nobody has checked, which is `credited` less `verified`.
   *
   * Carried rather than left to the caller because two callers were each
   * subtracting it, the card and the weekly letter, which is the two-readings
   * shape this repository keeps finding: the one that drifts is the one nobody
   * is looking at, and a letter and a screen disagreeing about how much of a
   * bar is taken on trust is a bug nobody can see from inside the app.
   */
  assumed: number;
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

  const milestones: Milestone[] = levels.map((level) => {
    const words = ladderWordsAt(level);
    const verified = Math.min(words, Math.max(0, verifiedAt[level] ?? 0));
    const pct = words === 0 ? 0 : Math.round((verified / words) * 100);
    const behind = standing !== null && levelIndex(level) < levelIndex(standing.level);
    return {
      level,
      ...levelTitle(level),
      /* Rounded, because this is a CSS width and an unrounded ratio writes
         `34.47552447552448%` into the markup for a row that is 328px wide. */
      share: round2(total === 0 ? 100 / levels.length : (words / total) * 100),
      pct,
      state: stopState(words, pct, behind),
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
  const pctOf = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return {
    target,
    standing,
    verified,
    credited,
    assumed: credited - verified,
    total,
    pct: pctOf(credited),
    verifiedPct: pctOf(verified),
    milestones,
    here,
    arrived: milestones.every((m) => m.state === "passed"),
  };
}

/*
  WHICH LEVELS A LEARNER HAS ALREADY BEEN CONGRATULATED ON.

  `lib/email/letters/milestone.ts` fires on a level the scheduler graduated,
  which is the one figure in this app about somebody's memory rather than their
  attendance, and there is no second chance at a level somebody passes once. So
  what has been said has to be remembered, and it was remembered as a high-water
  mark: one level, with a later one read as covering every level under it.

  That is only true while levels are finished in order, and crediting the levels
  behind where somebody stands is exactly what stops them being. A B1 learner
  works at B1 while A1 and A2 fill in behind them at whatever rate the evenings
  happen to take, so A2 finishing first is ordinary rather than freakish, and
  under a high-water mark A2's letter set the mark past A1 and A1's letter could
  never be sent. The level was silently spent.

  A set says what a mark cannot, and the old rows keep their meaning: a stored
  value with no separator in it is one level and means what it always meant,
  every level up to and including it, so nobody is congratulated twice for a
  band they were already told about.
*/
const MARK_SEPARATOR = ",";

export function milestonesTold(stored: string | null | undefined): Set<Level> {
  const raw = (stored ?? "").trim();
  if (raw === "") return new Set();

  const known = raw
    .split(MARK_SEPARATOR)
    .map((p) => p.trim())
    .filter((p): p is Level => (LEVELS as readonly string[]).includes(p));
  if (known.length === 0) return new Set();

  /*
    A BARE LEVEL IS THE OLD MARK AND A SEPARATOR IS WHAT SAYS OTHERWISE.

    Read on the count of what parsed instead, a list holding one level would be
    indistinguishable from the old mark and would quietly claim every level
    under it as told: the very level the set exists to stop losing. So a mark
    this module wrote always carries the separator, which is what `milestoneMark`
    guarantees, and a value with none is a row written before any of this.
  */
  if (!raw.includes(MARK_SEPARATOR)) {
    const top = known[0]!;
    return new Set(LEVELS.filter((l) => levelIndex(l) <= levelIndex(top)));
  }
  return new Set(known);
}

/**
 * The next level worth a letter, which is the LOWEST passed one nobody has been
 * told about rather than the highest.
 *
 * Lowest, because the letters are then in the order the learner climbed and a
 * morning that finishes two levels at once sends one and leaves the other for
 * tomorrow rather than swallowing it.
 */
export function milestoneOwed(
  milestones: readonly Milestone[], stored: string | null | undefined,
): Milestone | null {
  const told = milestonesTold(stored);
  return milestones.find((m) => m.state === "passed" && !told.has(m.level)) ?? null;
}

/**
 * What to store once that letter has gone, which is what was told plus it.
 *
 * Always written with a leading separator, so a mark naming one level cannot be
 * read back as the old high-water mark meaning that level and everything under
 * it. That is not a detail: the first version of this returned a bare `A2`
 * after A2's letter, `milestonesTold` read it as A1 and A2, and A1's letter was
 * lost exactly as it had been before.
 */
export function milestoneMark(stored: string | null | undefined, level: Level): string {
  const told = milestonesTold(stored);
  told.add(level);
  return MARK_SEPARATOR + LEVELS.filter((l) => told.has(l)).join(MARK_SEPARATOR);
}

/** Whether every level up to the target has already been announced. */
export function everyMilestoneTold(
  target: Level, stored: string | null | undefined,
): boolean {
  const told = milestonesTold(stored);
  return levelsTo(target).every((l) => told.has(l));
}
