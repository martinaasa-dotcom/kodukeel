/**
 * THE CHECKS BETWEEN THE PARTS OF THE LESSONS, AND THE ONE AT THE END OF EACH LEVEL.
 *
 * The operator's call, which amends "the ladder warns about the next part
 * and never blocks it" for the lessons: a learner who started in the lessons
 * moves up by passing. Every lesson part, A1's, A2's and B1's, ends in a short
 * check of what its lessons taught (`PART_CHECK`), and the last part of a level
 * is the whole of that level (`LEVEL_CHECK`), so A2 opens on a pass at the end
 * of A1, B1 on a pass at the end of A2 and B2 on a pass at the end of B1,
 * rather than on a tick at the end of a lesson. A check is passed at `CHECK_PASS`, can be taken again as often as
 * somebody likes, and asks a different selection each time.
 *
 * What it gates is moving up from a lesson part, by any door: the next part,
 * the level picker and the module's own "skip ahead". Nothing else: a learner
 * who was placed at A2 never sat the A1 lessons and is not asked to pass
 * them, one placed at B2 is asked nothing, going back is always open, and the
 * level check is a measurement in its own right. An admin moves freely, for
 * testing (`lib/auth/admin.ts`).
 *
 * Pure: no React, no Prisma, no clock. The programmes are handed in, since
 * building them is what `PROGRAMMES` does on first read.
 */

import { LESSONS, LESSON_PARTS, isLessonLevel, type LessonSpec } from "./lessons";
import { LEVEL_CHECK, PART_CHECK, checkFor, type CheckSize } from "./lessons/practice";
import type { PracticeItem } from "./lessons/practice";
import type { Programme } from "./types";
import type { Level } from "@/lib/collections/syllabus/types";
import { LEVEL_INFO } from "@/lib/collections/syllabus";

export interface CourseCheck {
  /** `check-a1.3`, after the part it closes. */
  readonly id: string;
  /** The part it closes. */
  readonly programmeId: string;
  /** The level of the part it closes. */
  readonly level: Level;
  /** True for the last part of a level, whose check covers the whole level. */
  readonly final: boolean;
  /** The lessons it asks about, in order. */
  readonly lessons: readonly LessonSpec[];
  readonly size: CheckSize;
}

const lessonsOf = (programme: Programme): LessonSpec[] =>
  programme.days.flatMap((d) => LESSONS.filter((l) => l.id === d.lesson));

/** Every check, one per lesson part, in teaching order. */
export function courseChecks(programmes: readonly Programme[]): CourseCheck[] {
  const lessonParts = programmes.filter((p) => p.days.length > 0 && p.days.every((d) => d.lesson));
  return lessonParts.map((programme) => {
    const ofLevel = lessonParts.filter((p) => p.level === programme.level);
    const final = ofLevel[ofLevel.length - 1]?.id === programme.id;
    return {
      id: `check-${programme.id}`,
      programmeId: programme.id,
      level: programme.level,
      final,
      lessons: final ? ofLevel.flatMap(lessonsOf) : lessonsOf(programme),
      size: final ? LEVEL_CHECK : PART_CHECK,
    };
  });
}

export function checkById(programmes: readonly Programme[], id: string): CourseCheck | undefined {
  return courseChecks(programmes).find((c) => c.id === id);
}

/** The check that closes a part, or undefined for a part with none. */
export function checkAfter(programmes: readonly Programme[], programmeId: string): CourseCheck | undefined {
  return courseChecks(programmes).find((c) => c.programmeId === programmeId);
}

/**
 * The first check not yet passed between where somebody is and where they
 * asked to go, or null where the move is open.
 *
 * Open where they are on no part (a first choice is placement), where the
 * part they are on is not a lesson part (somebody placed past A2), and where
 * the move is back or sideways. Otherwise every lesson part from the one they
 * are on up to the one before the target has to have its check passed.
 */
export function blockedBy(
  programmes: readonly Programme[],
  from: Programme | null | undefined,
  to: Programme,
  passed: ReadonlySet<string>,
): CourseCheck | null {
  if (!from) return null;
  const checks = courseChecks(programmes);
  if (!checks.some((c) => c.programmeId === from.id)) return null;
  const at = programmes.findIndex((p) => p.id === from.id);
  const target = programmes.findIndex((p) => p.id === to.id);
  if (at < 0 || target <= at) return null;
  for (const programme of programmes.slice(at, target)) {
    const check = checks.find((c) => c.programmeId === programme.id);
    if (check && !passed.has(check.id)) return check;
  }
  return null;
}

/** The questions of one attempt at a check. */
export function checkPaper(check: CourseCheck, attempt: number): PracticeItem[] {
  return checkFor(LESSONS, check.lessons, `${check.id}:${attempt}`, check.size);
}

/** The ids passed, as stored: one setting, space separated. */
export function passedFrom(stored: string | null | undefined): Set<string> {
  return new Set((stored ?? "").split(/\s+/).filter((id) => /^check-[a-z0-9.]+$/.test(id)));
}

/**
 * THE END OF A LEVEL IS A THING THAT HAPPENED, in English for the edge to
 * translate. Passing the last check of a level used to read "B1.1 is open",
 * the same sentence a part's check gets, so the screen a learner reaches
 * after a hundred evenings said less than the screen after one. It is built
 * here rather than on the check page so `GET /api/v1/checks/{id}` says it too.
 */
export interface LevelEnd {
  level: string;
  /** What somebody can now do, one sentence (`LEVEL_INFO.arrival`). */
  arrival: string;
  /** The parts of the level, by name. */
  parts: string[];
  lessons: number;
  next: { level: string; title: string; summary: string; lessons: boolean } | null;
}

/** What `checkView` says about where a pass leads, kept pure for its test. */
/** What a check says about where a pass leads, for the page and the app alike. */
export function whereAPassLeads(check: CourseCheck, part: Programme, next: Programme | null): {
  nextLabel: string | null;
  levelDone: LevelEnd | null;
} {
  const nextLabel = !next ? null
    : next.level !== part.level ? next.level
    : isLessonLevel(next.level) ? next.title : next.id.toUpperCase();
  const levelDone: LevelEnd | null = !check.final ? null : {
    level: part.level,
    arrival: LEVEL_INFO[part.level].arrival,
    parts: LESSON_PARTS.filter((p) => p.level === part.level).map((p) => p.title),
    lessons: LESSONS.filter((l) => l.level === part.level).length,
    next: next ? {
      level: next.level,
      title: LEVEL_INFO[next.level].titleEn,
      summary: LEVEL_INFO[next.level].summary,
      lessons: isLessonLevel(next.level),
    } : null,
  };
  return { nextLabel, levelDone };
}
