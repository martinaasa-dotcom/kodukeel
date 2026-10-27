/**
 * B1: RENTING A PLACE (docs/43-lessons.md §11.4).
 *
 * IN PREVIEW until B1 is whole (`preview.ts`). Read by the native speaker
 * where the second model pass flags a line (docs/43-lessons.md B-L7), and held
 * to the same checks as every lesson (`lessons.test.ts`, `ledger.ts`,
 * `npx tsx scripts/check-lesson-part.ts --part b1-kodu`).
 */

import type { LessonSpec, PartOfLessons } from "./types";

export const B1_KODU_PART: PartOfLessons = {
  id: "b1-kodu",
  level: "B1",
  title: "Renting a place",
  about: "Describing a flat in -tud words, house rules, things that break, the contract and the deposit.",
};

export const B1_KODU_LESSONS: readonly LessonSpec[] = [];
