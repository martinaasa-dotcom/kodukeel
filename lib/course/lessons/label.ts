/**
 * What a lesson is called by number: `26`, or `26a` for a vocabulary lesson
 * after it (docs/43-lessons.md §4.9). Its own module, holding nothing but
 * this, because the lesson screen is a client component and the ledger beside
 * it reaches the conjugation tables, which have no business in a bundle.
 */

import type { LessonSpec } from "./types";

export function lessonLabel(lesson: Pick<LessonSpec, "n" | "extra">): string {
  return `${lesson.n}${lesson.extra ?? ""}`;
}
