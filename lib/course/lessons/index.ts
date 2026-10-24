/**
 * The course as lessons (docs/43-lessons.md). One list per level, in the
 * order they are taught, which is the order the ledger walks them in.
 */
import { A1_LESSON_PARTS, A1_LESSONS } from "./a1";
import { A2_LESSON_PARTS, A2_LESSONS } from "./a2";
import type { LessonSpec, PartOfLessons } from "./types";

export * from "./types";
export * from "./ledger";
export * from "./practice";
export * from "./label";

/** Every level's lessons, in teaching order: A1, then A2. B1 to C1 are still built from units (`plan.ts`). */
export const LESSONS: readonly LessonSpec[] = [...A1_LESSONS, ...A2_LESSONS];
export const LESSON_PARTS: readonly PartOfLessons[] = [...A1_LESSON_PARTS, ...A2_LESSON_PARTS];

/** A lesson by its id, or null. */
export function lessonById(id: string): LessonSpec | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}
