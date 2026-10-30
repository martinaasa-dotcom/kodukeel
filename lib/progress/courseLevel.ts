import { z } from "zod";

import { PROGRAMMES } from "@/lib/course";
import { moveBlockedFor } from "@/lib/progress/checks";
import { openingPart, openingPartFor, programmeFor } from "@/lib/progress/course";
import { goOverAgain, heldFromChoice, HELD_CHOICES, startingLevel, type HeldChoice } from "@/lib/course/placement";
import { restartPart } from "@/lib/progress/courseReset";
import { courseLevelFor, courseStandingFor, recordCourseLevel } from "@/lib/progress/level";
import { readSetting, SETTING_KEYS, writeSetting } from "@/lib/settings/store";

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
  | { ok: true; level: HeldChoice; moved: boolean }
  | { ok: false; reason: "invalid" | "blocked"; error: string };

export async function changeCourseLevel(ownerId: string, level: unknown, now: Date): Promise<CourseLevelChange> {
  const parsed = z.enum(HELD_CHOICES as [HeldChoice, ...HeldChoice[]])
    .safeParse((typeof level === "string" ? level : "").toUpperCase());
  if (!parsed.success) return { ok: false, reason: "invalid", error: "Pick a level from the list." };

  const [following, target] = await Promise.all([
    programmeFor(ownerId),
    readSetting(ownerId, SETTING_KEYS.goalTarget),
  ]);
  /*
    A LEARNER WHO STARTED AT A1 MOVES UP BY PASSING, and the picker is a door
    up like any other: from a part of the A1 lessons, a higher level waits on
    the checks between (`lib/course/checks.ts`). Going down is always open.

    Asked of where the choice SENDS them, not of the level on the chip: a level
    named is a level held and the course opens past it, so picking A1 opens A2
    and it is A2's door that has to be open.
  */
  const destination = openingPart(heldFromChoice(parsed.data), target);
  const blocked = await moveBlockedFor(ownerId, following, destination);
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
      writeSetting(ownerId, SETTING_KEYS.programmeChosenAt, now.toISOString()),
      restartPart(ownerId, opening.id),
      writeSetting(ownerId, SETTING_KEYS.adaptMovedAt, now.toISOString()),
      writeSetting(ownerId, SETTING_KEYS.adaptSnoozedUntil, ""),
    ]);
  }

  return { ok: true, level: parsed.data, moved };
}

/**
 * GO OVER THE LEVEL HELD, OR MOVE ON PAST IT.
 *
 * A level held opens the course one past it, and the chip in Settings says so.
 * Some people would rather go over the level they hold first, so this is the
 * other start: "held" puts the course on the first part of the level held, and
 * "next" puts it back where the level opens it. Worked out here off the
 * learner's own standing and target, never off a level the caller names, and
 * a start already in play moves nothing. Going over a level is going down and
 * is always open; moving on is a door up and asks the checks like any other.
 */
export type CourseStartChange =
  | { ok: true; moved: boolean }
  | { ok: false; reason: "invalid" | "blocked"; error: string };

export async function changeCourseStart(ownerId: string, which: unknown, now: Date): Promise<CourseStartChange> {
  if (which !== "held" && which !== "next") return { ok: false, reason: "invalid", error: "That isn't a start we offer." };
  const [standing, target, following] = await Promise.all([
    courseStandingFor(ownerId),
    readSetting(ownerId, SETTING_KEYS.goalTarget),
    programmeFor(ownerId),
  ]);
  const held = standing?.held ?? null;
  const again = goOverAgain(held, target);
  if (!again) return { ok: false, reason: "invalid", error: "There's no level to go over again." };
  const level = which === "held" ? again : startingLevel(held, target);
  const to = PROGRAMMES.find((p) => p.level === level);
  if (!to) return { ok: false, reason: "invalid", error: "That level has no course yet." };
  if (following?.level === to.level) return { ok: true, moved: false };
  const blocked = await moveBlockedFor(ownerId, following, to);
  if (blocked) {
    return { ok: false, reason: "blocked", error: "Pass the checks to move up a level. Each part of the lessons ends in one." };
  }
  await Promise.all([
    writeSetting(ownerId, SETTING_KEYS.programme, to.id),
    writeSetting(ownerId, SETTING_KEYS.programmeChosenAt, now.toISOString()),
    restartPart(ownerId, to.id),
    writeSetting(ownerId, SETTING_KEYS.adaptMovedAt, now.toISOString()),
    writeSetting(ownerId, SETTING_KEYS.adaptSnoozedUntil, ""),
  ]);
  return { ok: true, moved: true };
}
