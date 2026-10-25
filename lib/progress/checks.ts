import { PROGRAMMES, type Programme } from "@/lib/course";
import { blockedBy, passedFrom, type CourseCheck } from "@/lib/course/checks";
import { readSetting, writeSetting, SETTING_KEYS } from "@/lib/settings/store";
import { movesFreely } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

/**
 * The checks between the parts of the lessons, as one learner stands with them: which
 * are passed, and whether a move up is open (`lib/course/checks.ts` has the
 * rule; this reads and writes the one setting it keys on).
 */

export async function checksPassedFor(ownerId: string): Promise<Set<string>> {
  return passedFrom(await readSetting(ownerId, SETTING_KEYS.checksPassed));
}

/** Adds a pass. Only ever adds: a check passed once stays passed. */
export async function recordCheckPassed(ownerId: string, checkId: string): Promise<void> {
  const passed = await checksPassedFor(ownerId);
  if (passed.has(checkId)) return;
  passed.add(checkId);
  await writeSetting(ownerId, SETTING_KEYS.checksPassed, [...passed].join(" "));
}

/**
 * The check standing between `from` and `to`, or null where the move is
 * open, which it always is for somebody named an admin.
 */
export async function moveBlockedFor(
  ownerId: string, from: Programme | null | undefined, to: Programme,
): Promise<CourseCheck | null> {
  const blocked = blockedBy(PROGRAMMES, from, to, await checksPassedFor(ownerId));
  if (!blocked) return null;
  if (await movesFreely(ownerId)) return null;
  /*
    SOMEBODY WHO HAS WORKED ABOVE THE LESSONS IS NOT WALKED BACK UP THEM. A
    learner placed at B1 may take the offer to step down and refresh A2
    (`lib/course/adapt.ts`), and the checks would then hold them in A2 until
    they had passed every one of its parts, which is a refresher turned into a
    trap. The checks are for somebody climbing through the lessons; a learner
    with a ticked evening in a part the lessons do not reach has already been
    past them, and moves the way they came.
  */
  const lessonParts = PROGRAMMES.filter((p) => p.days.length > 0 && p.days.every((d) => d.lesson)).map((p) => p.id);
  const beenAbove = await prisma.courseStep.findFirst({
    where: { ownerId, programmeId: { notIn: lessonParts } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return beenAbove ? null : blocked;
}
