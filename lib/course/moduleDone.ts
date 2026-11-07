import { levelIndex, type Level } from "@/lib/collections/syllabus";
import type { LadderProgress, Milestone } from "./milestones";
import type { Programme } from "./types";

/**
 * WHAT TODAY'S MODULE MOVED, READ AS A CLIMB RATHER THAN AS "1 OF 6".
 *
 * The finished-module screen ended on a card reading "Where you are, 1 of 6"
 * over a thin bar, and it was reported as meaningless: evenings ticked in one
 * part of one level say nothing about how much Estonian somebody has, how far
 * the level they are in has come, or how much of the way to their own goal is
 * behind them. This is the arithmetic for the screen that replaced it, and it
 * is pure so every figure on that screen is unit tested.
 *
 * EVERY FIGURE IS DERIVED (ADR-014). What fills a level is a word the scheduler
 * has graduated, which is `ladderProgress`'s rule, never an evening ticked; and
 * what moved today is the graduated words whose own review today took them
 * there, read off `Review.stateBefore` by the caller. Nothing here is stored.
 *
 * AN ASSUMED LEVEL IS NEVER PASSED OFF AS CHECKED. A word graduated today in a
 * level already credited from the learner's standing moves the checked share
 * of that level and not the headline, because the headline already counted it:
 * printing "+1% today" over a figure that did not move would be the app
 * claiming a gain twice.
 */

/** One figure on the climb, exact rather than rounded, with what today added. */
export interface ClimbReading {
  readonly level: Level;
  /** 0 to 100, unrounded. The screen rounds, which is where a question about a tile belongs. */
  readonly pct: number;
  /** The same figure as it stood before today's answers. */
  readonly before: number;
  /** Percentage points today added, unrounded. */
  readonly gain: number;
  /** Words this figure is out of. */
  readonly words: number;
  /** Words counted toward it now. */
  readonly counted: number;
  /** Words still to go. */
  readonly left: number;
  /** Words today added to `counted`. */
  readonly gainedWords: number;
}

const pctOf = (n: number, of: number) => (of <= 0 ? 0 : Math.min(100, (n / of) * 100));

/**
 * How far through one level the learner is, by its own words.
 *
 * Checked words only, even where the level is credited: this is the reading of
 * the level a learner is being taught in, and "what the evenings have checked"
 * is the thing that moves on the evening. `gainedToday` is capped at the level's
 * verified count, since a caller's count can never honestly exceed it.
 */
export function levelReading(stop: Milestone, gainedToday: number): ClimbReading {
  const gained = Math.max(0, Math.min(gainedToday, stop.verified));
  const pct = pctOf(stop.verified, stop.words);
  const before = pctOf(stop.verified - gained, stop.words);
  return {
    level: stop.level,
    pct,
    before,
    gain: pct - before,
    words: stop.words,
    counted: stop.verified,
    left: Math.max(0, stop.words - stop.verified),
    gainedWords: gained,
  };
}

/**
 * How far along the climb to the learner's own target, counting what is
 * credited from where they stand, which is the headline the climb on Today
 * prints. What today added is today's graduated words at levels that are not
 * credited, since a credited level is already counted whole.
 */
export function goalReading(ladder: LadderProgress, gainedAt: Readonly<Record<string, number>>): ClimbReading {
  const gained = ladder.milestones.reduce(
    (n, m) => n + (m.state === "assumed" ? 0 : Math.max(0, Math.min(gainedAt[m.level] ?? 0, m.verified))),
    0,
  );
  const pct = pctOf(ladder.credited, ladder.total);
  const before = pctOf(ladder.credited - gained, ladder.total);
  return {
    level: ladder.target,
    pct,
    before,
    gain: pct - before,
    words: ladder.total,
    counted: ladder.credited,
    left: Math.max(0, ladder.total - ladder.credited),
    gainedWords: gained,
  };
}

/**
 * A percentage the way the screen prints it: whole where that is honest, one
 * decimal where rounding to a whole would say nothing moved or would print a
 * hundred over a figure with words left in it.
 */
export function pctLabel(pct: number): string {
  if (pct >= 100) return "100";
  if (pct > 99) return "99";
  if (pct > 0 && pct < 1) return pct.toFixed(1);
  return String(Math.round(pct));
}

/**
 * Today's gain, signed, never "+0%": a gain too small to reach a tenth of a
 * point is said as a tenth, because something did move, and nothing at all is
 * null so the screen says nothing rather than "+0".
 */
export function gainLabel(gain: number): string | null {
  if (!(gain > 0)) return null;
  if (gain < 0.1) return "+0.1";
  return `+${gain < 10 ? gain.toFixed(1) : Math.round(gain)}`;
}

/** What is still ahead in evenings, counted off the course itself. */
export interface EveningsAhead {
  /** Evenings left in the part being walked. */
  readonly inPart: number;
  /** Parts of this level after the one being walked. */
  readonly partsLeftInLevel: number;
  /** Evenings left before this level is finished, this part included. */
  readonly inLevel: number;
  /** Evenings left before the target level is finished, or null where the course is already past it. */
  readonly toTarget: number | null;
  /** Minutes those evenings to the level's end take, from each evening's own length. */
  readonly minutesInLevel: number;
}

/**
 * The evenings between today and the end of the level, and the end of the
 * target, walking the course in its own order from the part in play.
 *
 * `daysDone` is the evenings of this part already finished. A target below the
 * level being walked is behind the learner, so there is nothing to count.
 */
export function eveningsAhead(
  programmes: readonly Programme[], current: Programme, daysDone: number, target: Level,
): EveningsAhead {
  const at = programmes.findIndex((p) => p.id === current.id);
  const rest = current.days.slice(Math.max(0, daysDone));
  const later = at < 0 ? [] : programmes.slice(at + 1);
  const sameLevel = later.filter((p) => p.level === current.level);
  const levelDays = [...rest, ...sameLevel.flatMap((p) => p.days)];

  const targetAt = levelIndex(target);
  const toTarget = targetAt < levelIndex(current.level) ? null
    : rest.length + later.filter((p) => levelIndex(p.level) <= targetAt).reduce((n, p) => n + p.days.length, 0);

  return {
    inPart: rest.length,
    partsLeftInLevel: sameLevel.length,
    inLevel: levelDays.length,
    toTarget,
    minutesInLevel: levelDays.reduce((n, d) => n + d.minutes, 0),
  };
}
