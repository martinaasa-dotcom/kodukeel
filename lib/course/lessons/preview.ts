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
 * C1 IS DRAFTED HERE (docs/43-lessons.md §15). Each part author writes their
 * part in a file of its own in this directory, named for the part without the
 * marks (`c1-isiksus.ts`, `c1-mote.ts`), exporting `C1_<PART>_PART` and
 * `C1_<PART>_LESSONS` the way `b2-konekeel.ts` does, and adds ONE line to
 * `PARTS` below, `[C1_<PART>_PART, C1_<PART>_LESSONS],`, in the teaching order
 * of §15.3 and `docs/reviews/c1-cast.md`:
 *
 *   1 c1-isiksus   2 c1-meedia   3 c1-kodu      4 c1-kool
 *   5 c1-juht      6 c1-uhiskond 7 c1-maa       8 c1-mote
 *
 * A part is placed by `C1_PART_ORDER` (`rampC1.ts`) rather than by where its
 * line sits, so parts written side by side can land in any order; keep the
 * lines in teaching order anyway, since the ledger walks them as listed and a
 * word one part teaches has to come before the part that uses it. Then
 * `npx tsx scripts/check-lesson-part.ts --part <id>` asks every check of that
 * part, step 9 being C1's own. The day C1 becomes the course, this list moves
 * to `c1.ts` whole and this one is empty again.
 */
import type { LessonSpec, PartOfLessons } from "./types";

const PARTS: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  // One line per C1 part, in teaching order: [C1_<PART>_PART, C1_<PART>_LESSONS],
];

export const PREVIEW_PARTS: readonly PartOfLessons[] = PARTS.map(([part]) => part);

/** The lessons in preview, in teaching order, part by part. */
export const PREVIEW_LESSONS: readonly LessonSpec[] = PARTS.flatMap(([, lessons]) => lessons);
