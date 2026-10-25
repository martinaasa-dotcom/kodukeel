import { LEVELS, type Level } from "@/lib/collections/syllabus/types";

/**
 * WHERE THE COURSE OPENS FOR SOMEBODY, GIVEN WHAT THEY SAY THEY ALREADY HAVE.
 *
 * A level somebody names is a level they hold, and that is the whole of this
 * module. The chips in first run describe what a person can already do ("B1,
 * conversational: a clear conversation, and holding your own side of it"),
 * and a level check reports the highest band passed. Both are claims about
 * ground already covered. Opening the course on the first part of that same
 * level walked a B1 speaker back through B1, which reads as the app not
 * believing them, on the one screen where it is asking to be trusted.
 *
 * So the course opens on the first part of the level above the one held, with
 * two exceptions, each a thing the learner told us:
 *
 * - **Nothing held.** "Just starting" and a check that found nothing yet are
 *   the same beginner, and they open on the first part of A1.
 * - **Aiming at the level they already hold.** Somebody at B1 who wants the B1
 *   examination is saying they are roughly there and want it solid, so they
 *   open on the first part of B1. Aiming *below* what they hold is somebody
 *   with a certificate to collect and the language already in hand, and
 *   walking them down to it would be the same disbelief again, so that case
 *   moves on like any other.
 *
 * And the top of the ladder is C1, so somebody who holds C1 opens on the
 * first part of C1: there is nothing above it to offer, and the shades of
 * meaning it teaches are what that learner said they came for.
 *
 * WHY IT IS A LEVEL AND NOT A PART. The wizard is a client component and the
 * ladder of parts is built out of the whole course harvest, which a client
 * may never import (`lib/course/focus.ts` says why). A level is a string both
 * sides already hold, and "the first part of this level" is one `find` on
 * either side of the wire. Pure, and imports nothing but the list of levels.
 */

/**
 * WHAT SOMEBODY CAN SAY THEY HOLD: NOTHING YET, OR A LEVEL OF THE LADDER.
 *
 * A0 is "nothing yet", and it is a choice of its own rather than a reading of
 * A1. Without it the bottom chip had to mean "just starting" while every chip
 * above it meant "I have this", so picking A1 opened A1 and picking A2 opened
 * B1, and A2 was a level nobody could pick their way onto. With A0 every chip
 * means the same thing: the level held, and the course opens on the next one.
 * A0 is not a CEFR band and the course has no part for it; it is the answer
 * "I hold none of them", which is what a beginner says.
 */
export const NOTHING_HELD = "A0" as const;
export type HeldChoice = typeof NOTHING_HELD | Level;
export const HELD_CHOICES: readonly HeldChoice[] = [NOTHING_HELD, ...LEVELS];

export function isHeldChoice(value: unknown): value is HeldChoice {
  return typeof value === "string" && (HELD_CHOICES as readonly string[]).includes(value);
}

/** The marker every write of a declaration carries now (`SETTING_KEYS.cefrPlacementMeaning`). */
export const HELD_MEANING = "held";

/**
 * A stored declaration, read under the rule it was written under.
 *
 * The bottom chip used to store A1 and mean "just starting", because there was
 * no A0 to pick. A stored A1 with no "held" marker beside it was written that
 * way, so it reads as A0 and the beginner who ticked it is not moved to A2 by
 * this change. Every other stored level meant the level held all along.
 */
export function declaredFrom(stored: string | null | undefined, meaning: string | null | undefined): HeldChoice | null {
  if (!isHeldChoice(stored)) return null;
  if (stored === "A1" && meaning !== HELD_MEANING) return NOTHING_HELD;
  return stored;
}

/** The level a choice holds, or null for A0. */
export function heldFromChoice(choice: HeldChoice): Level | null {
  return choice === NOTHING_HELD ? null : choice;
}

/**
 * The level the learner holds, or null for somebody who holds none yet.
 *
 * A declared A0 and a measured result under A1 are both nothing held. Every
 * other level, declared or measured, is a level held. (A declared A1 used to
 * read as "just starting", because there was no A0 to pick; rows written that
 * way are read as A0 by `currentLevelAnswer`, so this rule has no exception.)
 */
export function heldLevel(
  answer: { kind: "measured" | "declared"; level: string } | null,
): Level | null {
  if (!answer) return null;
  if (!isLadderLevel(answer.level)) return null;
  return answer.level;
}

/** Where a choice opens the course: `startingLevel` for the level it holds. */
export function opensOn(choice: HeldChoice, target: string | null | undefined): Level {
  return startingLevel(heldFromChoice(choice), target);
}

/**
 * THE LEVEL "GO OVER IT AGAIN" OPENS, OR NONE WHERE THERE IS NOTHING TO OFFER.
 *
 * A level held opens the course one past it, and some people would rather go
 * over the level they hold before moving on: a certificate taken two years ago,
 * a class that went faster than they did. So the level held is offered as a
 * second start, and only where it differs from the first: nobody who holds
 * nothing has a level to go over, and somebody aiming at the level they hold,
 * or holding C1, is already opened on it.
 */
export function goOverAgain(held: Level | null, target: string | null | undefined): Level | null {
  if (held === null) return null;
  return startingLevel(held, target) === held ? null : held;
}

/** The level whose first part the course opens on. */
export function startingLevel(held: Level | null, target: string | null | undefined): Level {
  if (held === null) return LEVELS[0]!;
  if (target === held) return held;
  return levelAfter(held) ?? held;
}

/** The level above this one, or none at the top of the ladder. */
export function levelAfter(level: Level): Level | undefined {
  return LEVELS[LEVELS.indexOf(level) + 1];
}

/** The level below this one, or none at the bottom. */
export function levelBefore(level: Level): Level | undefined {
  const at = LEVELS.indexOf(level);
  return at > 0 ? LEVELS[at - 1] : undefined;
}

/**
 * The highest level the climb on Today may count as the learner's own.
 *
 * What they hold, and never the level they are working on: a learner aiming at
 * the level they already hold is walking its parts again, and a bar showing
 * that level counted as done while the course is teaching it is two answers to
 * one question on one screen. So it is capped below the level of the part in
 * play, where there is one.
 *
 * Null is "nothing is counted", which is a beginner and a deployment that has
 * never asked.
 */
export function creditedThrough(held: Level | null, working: Level | null): Level | null {
  if (held === null) return null;
  if (working === null) return held;
  if (LEVELS.indexOf(held) < LEVELS.indexOf(working)) return held;
  return levelBefore(working) ?? null;
}

/**
 * WHAT WALKING OUT OF A LEVEL SAYS SOMEBODY HOLDS, OR NOTHING TO WRITE.
 *
 * Finishing a part and pressing on wrote the part and never the level, so a
 * learner who walked the course from the first evening was still a beginner
 * to everything that reads one: the speed a recording plays at, the band a
 * conversation opens at, Anu's briefing and the bands the standalone rounds
 * draw from, all of it still pitched at A1 on the first evening of C1. Moving
 * from the last part of a level into the first of the next is the learner
 * walking out of that level, so they hold it, as a level check or the picker
 * in Settings would have said; the module's own hand-off warning is still what
 * says whether the log agrees, and a level is still theirs to change.
 *
 * Only ever up and only one step: a jump in Settings to a part far above is
 * somebody looking, not somebody who has walked anything, and going back down
 * to refresh a level says nothing about what they hold. Walking out of A1 is
 * holding A1, now that a beginner says A0 rather than A1.
 */
export function levelHeldOnHandOff(
  from: Level, to: Level, held: Level | null,
): Level | null {
  if (levelAfter(from) !== to) return null;
  if (held !== null && LEVELS.indexOf(held) >= LEVELS.indexOf(from)) return null;
  return from;
}

const isLadderLevel = (value: string): value is Level =>
  (LEVELS as readonly string[]).includes(value);
