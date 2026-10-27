/**
 * LESSONS BUILT AND NOT YET THE COURSE.
 *
 * A level is moved to lessons a part at a time, and a part is read and played
 * before it replaces anything (docs/43-lessons.md §11.6). Until then it lives
 * here: the ledger walks it after the course's own lessons, so it is held to
 * every check a course lesson is, and a reviewer can open it on the website
 * (`lessonView`, `allowPreview`), but no evening carries it, so finishing it
 * records nothing, and it is not in `LESSONS`, so nothing that lists the
 * course, counts it or asks it for a translation reads it.
 *
 * Empty since B1 became the course (`b1.ts`). B2 is drafted here next.
 */
import type { LessonSpec, PartOfLessons } from "./types";

export const PREVIEW_LESSONS: readonly LessonSpec[] = [];
export const PREVIEW_PARTS: readonly PartOfLessons[] = [];
