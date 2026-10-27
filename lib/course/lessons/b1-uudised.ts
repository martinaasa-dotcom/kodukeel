/**
 * B1: WHAT HAPPENED, NOT WHO DID IT (docs/43-lessons.md §11.4).
 *
 * IN PREVIEW until B1 is whole (`preview.ts`). Read by the native speaker
 * where the second model pass flags a line (docs/43-lessons.md B-L7), and held
 * to the same checks as every lesson (`lessons.test.ts`, `ledger.ts`,
 * `npx tsx scripts/check-lesson-part.ts --part b1-uudised`).
 */

import type { LessonSpec, PartOfLessons } from "./types";

export const B1_UUDISED_PART: PartOfLessons = {
  id: "b1-uudised",
  level: "B1",
  title: "What happened, not who did it",
  about: "The news and the workplace: what people do, what was done, and what had happened before.",
};

export const B1_UUDISED_LESSONS: readonly LessonSpec[] = [];
