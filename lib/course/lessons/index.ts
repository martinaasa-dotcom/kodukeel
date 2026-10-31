/**
 * The course as lessons (docs/43-lessons.md). One list per level, in the
 * order they are taught, which is the order the ledger walks them in.
 */
import { A1_LESSON_PARTS, A1_LESSONS } from "./a1";
import { A2_LESSON_PARTS, A2_LESSONS } from "./a2";
import { B1_LESSON_PARTS, B1_LESSONS } from "./b1";
import { B2_LESSON_PARTS, B2_LESSONS } from "./b2";
import type { LessonSpec, PartOfLessons } from "./types";

export * from "./types";
export * from "./ledger";
export * from "./practice";
export * from "./label";

/** Every level's lessons, in teaching order: A1, A2, B1, then B2. C1 is still built from units (`plan.ts`). */
export const LESSONS: readonly LessonSpec[] = [...A1_LESSONS, ...A2_LESSONS, ...B1_LESSONS, ...B2_LESSONS];
export const LESSON_PARTS: readonly PartOfLessons[] = [...A1_LESSON_PARTS, ...A2_LESSON_PARTS, ...B1_LESSON_PARTS, ...B2_LESSON_PARTS];

/** A lesson by its id, or null. */
export function lessonById(id: string): LessonSpec | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}

/** The levels taught as lessons, whose units the course never walks. */
export const LESSON_LEVELS: ReadonlySet<string> = new Set(LESSON_PARTS.map((p) => p.level));

/** True for a level taught as lessons (A1, A2, B1 and B2), where a unit's page sends somebody to the lessons. */
export function isLessonLevel(level: string): boolean {
  return LESSON_LEVELS.has(level);
}
