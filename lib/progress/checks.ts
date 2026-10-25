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
  /*
    "OFF" IS NOT A WAY ROUND THE CHECKS. A learner who turns the course off is
    on no part, and `blockedBy` reads no part as a first choice, which is
    placement and open. Somebody who has ticked an evening has had their first
    choice already, so where they are is the part they last ticked a step of,
    the same reading `programmeFor` takes where nothing is stored.
  */
  const origin = from ?? await lastTickedPart(ownerId);
  const blocked = blockedBy(PROGRAMMES, origin, to, await checksPassedFor(ownerId));
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

/** The part somebody last ticked a step of, or null where they never have. */
export async function lastTickedPart(ownerId: string): Promise<Programme | null> {
  const last = await prisma.courseStep.findFirst({
    where: { ownerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { programmeId: true },
  });
  return (last && PROGRAMMES.find((p) => p.id === last.programmeId)) || null;
}

/**
 * Which of the parts a backup names the checks would let this learner reach,
 * asked from where they stand before the restore and before its transaction
 * opens, so the restore reads one answer and holds one connection.
 *
 * AN ACCOUNT THAT HAS NEVER TICKED A STEP IS STILL PLACING. First run sets a
 * part the moment somebody finishes it, so a learner who moves to a new device,
 * walks through first run and then restores their own file would otherwise be
 * held on A1.1 by checks the file cannot prove they passed, and lose every
 * evening they had done above it. Placement is open to that account already
 * (erasing it and choosing a higher level at first run is the same move), so
 * opening the restore to it grants nothing a forged file did not have another
 * door to. A learner who has ticked an evening is climbing, and the checks hold.
 */
export async function restorableParts(ownerId: string, ids: Iterable<string>): Promise<Set<string>> {
  const wanted = [...new Set(ids)].flatMap((id) => {
    const programme = PROGRAMMES.find((p) => p.id === id);
    return programme ? [programme] : [];
  });
  if (wanted.length === 0) return new Set();
  const climbing = await prisma.courseStep.findFirst({ where: { ownerId }, select: { id: true } });
  if (!climbing) return new Set(wanted.map((p) => p.id));
  const stored = await readSetting(ownerId, SETTING_KEYS.programme);
  const standing = stored ? PROGRAMMES.find((p) => p.id === stored) ?? null : null;
  const open = new Set<string>();
  for (const programme of wanted) {
    if (!await moveBlockedFor(ownerId, standing, programme)) open.add(programme.id);
  }
  return open;
}
