import { PROGRAMMES, type Programme } from "@/lib/course";
import { blockedBy, passedFrom, type CourseCheck } from "@/lib/course/checks";
import { readSetting, writeSetting, SETTING_KEYS } from "@/lib/settings/store";
import { movesFreely } from "@/lib/auth/admin";

/**
 * The checks between the parts of A1, as one learner stands with them: which
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
  return (await movesFreely()) ? null : blocked;
}
