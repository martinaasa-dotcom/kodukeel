/**
 * B1: WHAT EACH VERB ASKS FOR (docs/43-lessons.md §11.4).
 *
 * IN PREVIEW until B1 is whole (`preview.ts`). Read by the native speaker
 * where the second model pass flags a line (docs/43-lessons.md B-L7), and held
 * to the same checks as every lesson (`lessons.test.ts`, `ledger.ts`,
 * `npx tsx scripts/check-lesson-part.ts --part b1-rektsioon`).
 */

import type { LessonSpec, PartOfLessons } from "./types";

export const B1_REKTSIOON_PART: PartOfLessons = {
  id: "b1-rektsioon",
  level: "B1",
  title: "What each verb asks for",
  about: "The people in your life, and the case each verb wants after it: helping, liking, talking about, depending on.",
};

export const B1_REKTSIOON_LESSONS: readonly LessonSpec[] = [];
