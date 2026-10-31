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
 * Empty since C1 became the course (`c1.ts`, docs/43-lessons.md §16), which
 * left no level to draft: every level from A1 to C1 is lessons and there is no
 * C2 (C1-10). The list stays, and the paths that read it, for a part written
 * beside the course before it replaces one, in a file of its own with one line
 * in a `PARTS` list, in teaching order, the way B2's and C1's were.
 */
import type { LessonSpec, PartOfLessons } from "./types";

export const PREVIEW_LESSONS: readonly LessonSpec[] = [];
export const PREVIEW_PARTS: readonly PartOfLessons[] = [];
