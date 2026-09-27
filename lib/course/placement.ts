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
 * The level the learner holds, or null for somebody who holds none yet.
 *
 * A declared A1 reads as null. The chip that stores it says "just starting:
 * tere, aitäh, and not much else yet", which is a beginner, and crediting a
 * beginner with A1 would put a full bar under a level they have not started.
 * A *measured* A1 is a band a paper passed and is held; a measured result
 * under A1 is null. The caller says which, because only it knows.
 */
export function heldLevel(
  answer: { kind: "measured" | "declared"; level: string } | null,
): Level | null {
  if (!answer) return null;
  if (!isLadderLevel(answer.level)) return null;
  if (answer.kind === "declared" && answer.level === "A1") return null;
  return answer.level;
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

const isLadderLevel = (value: string): value is Level =>
  (LEVELS as readonly string[]).includes(value);
