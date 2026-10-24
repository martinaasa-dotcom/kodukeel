import { z } from "zod";

import { PROGRAMMES } from "@/lib/course";
import { moveBlockedFor } from "@/lib/progress/checks";
import { openingPartFor, programmeFor } from "@/lib/progress/course";
import { restartPart } from "@/lib/progress/courseReset";
import { courseLevelFor, recordCourseLevel } from "@/lib/progress/level";
import { SETTING_KEYS, writeSetting } from "@/lib/settings/store";

/**
 * THE LEVEL THE LEARNER SAYS THEY ARE AT, CHANGED FROM EITHER DOOR (N-8, D2).
 *
 * The body `setCourseLevel` in `app/actions.ts` used to hold, moved here so the
 * web's level picker and `PATCH /api/v1/me` change a level one way: the owner
 * is a parameter, the value arrives off the wire, and the door up asks
 * `moveBlockedFor` before anything is written, so a learner on the A1 lessons
 * cannot step past an unpassed check from a phone any more than from Settings
 * (`lib/course/checks.ts`). Going down is always open. Each door keeps its
 * own refresh of the pages that read a level.
 *
 * Everything else that writes this key is a measurement: a passed checkpoint,
 * the check at `/assess`. This one is a person telling the app something it
 * has no way to find out. It is a statement rather than a claim about a score,
 * so there is nothing to re-derive: what it buys is which units the course
 * opens at and which band of words gets offered, and a learner who misstates
 * it is only choosing their own reading. Nothing in the review log moves,
 * because a level is not a score.
 */
export type CourseLevelChange =
  | { ok: true; level: "A1" | "A2" | "B1" | "B2" | "C1"; moved: boolean }
  | { ok: false; reason: "invalid" | "blocked"; error: string };

export async function changeCourseLevel(ownerId: string, level: unknown, now: Date): Promise<CourseLevelChange> {
  const parsed = z.enum(["A1", "A2", "B1", "B2", "C1"]).safeParse((typeof level === "string" ? level : "").toUpperCase());
  if (!parsed.success) return { ok: false, reason: "invalid", error: "Pick a level from the list." };

  const following = await programmeFor(ownerId);
  /*
    A LEARNER WHO STARTED AT A1 MOVES UP BY PASSING, and the picker is a door
    up like any other: from a part of the A1 lessons, a higher level waits on
    the checks between (`lib/course/checks.ts`). Going down is always open.
  */
  const firstOfLevel = PROGRAMMES.find((p) => p.level === parsed.data);
  const blocked = firstOfLevel ? await moveBlockedFor(ownerId, following, firstOfLevel) : null;
  if (blocked) {
    return { ok: false, reason: "blocked", error: "Pass the checks to move up a level. Each part of the lessons ends in one." };
  }
  // Asked before the write, since what changed is the whole question below.
  const before = await courseLevelFor(ownerId);
  await recordCourseLevel(ownerId, parsed.data, now);

  /*
    AND THE COURSE MOVES WITH IT, WHICH IS WHAT THE PICKER PROMISES.

    The part a learner is on is its own setting, and a level written here used
    to leave it alone: somebody who had been walked onto A2 and then said "A1"
    stayed on A2, and the module went on asking for the simple past of a verb
    nobody had shown them, under a screen that said A1. It was reported off
    exactly that card. So where the level now opens on a different level of
    the ladder than the part in play, the course moves to the first part of it,
    the way an accepted move on the module screen does. Re-picking the level
    already held is not asking to start again. "off" is a
    learner who picks their own evenings and is never put back on the course.
  */
  /*
    AND A NEW LEVEL STARTS THE MODULE OVER, ON ITS FIRST EVENING.

    "Going back to a part picks up where its own ticks left off" was the rule,
    and it was reported as wrong by somebody who had just changed level: the
    module resumed an old evening and Review still held eighteen cards from
    the course they had left. Changing level is a fresh start, so the course
    moves to the first part of the new level and that part's own ticks are
    cleared (`restartPart`), so it opens on its first evening. Every other
    part's ticks and the whole review log stay. Review follows on its
    own, because it asks only what the module has taught (`reviewable`), and a
    card held back keeps its schedule for the evening that reaches it.
    Re-picking the level already held is not asking to start again and moves
    nothing.
  */
  const [current, opening] = await Promise.all([programmeFor(ownerId), openingPartFor(ownerId)]);
  const moved = Boolean(current && (before !== parsed.data || current.level !== opening.level));
  if (moved) {
    await Promise.all([
      writeSetting(ownerId, SETTING_KEYS.programme, opening.id),
      restartPart(ownerId, opening.id),
      writeSetting(ownerId, SETTING_KEYS.adaptMovedAt, now.toISOString()),
      writeSetting(ownerId, SETTING_KEYS.adaptSnoozedUntil, ""),
    ]);
  }

  return { ok: true, level: parsed.data, moved };
}
