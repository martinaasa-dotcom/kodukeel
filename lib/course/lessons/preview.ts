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
 * B2 IS DRAFTED HERE (docs/43-lessons.md §13). Each part author writes their
 * part in a file of its own in this directory, named for the part without the
 * marks (`b2-konekeel.ts`, `b2-too.ts`), exporting
 * `B2_<PART>_PART` and `B2_<PART>_LESSONS` the way `b1-uudised.ts` does, and
 * adds ONE line to `PARTS` below, `[B2_<PART>_PART, B2_<PART>_LESSONS],`, in
 * the teaching order of §13.3:
 *
 *   1 b2-kõnekeel   2 b2-kaudne   3 b2-pere      4 b2-tervis
 *   5 b2-töö        6 b2-riik     7 b2-kultuur   8 b2-arutelu
 *
 * The order is load-bearing: the ramp (`rampB2.ts`) reads a part's band off
 * its place here, and the recycling rule (`b2LevelProblems`) reads which B2
 * patterns came before it. Then `npx tsx scripts/check-lesson-part.ts --part
 * <id>` asks every check of that part. The day B2 becomes the course, this
 * list moves to `b2.ts` whole and this one is empty again.
 */
import type { LessonSpec, PartOfLessons } from "./types";
import { B2_RIIK_LESSONS, B2_RIIK_PART } from "./b2-riik";

const PARTS: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  // One line per B2 part, in teaching order: [B2_<PART>_PART, B2_<PART>_LESSONS],
  [B2_RIIK_PART, B2_RIIK_LESSONS],
];

export const PREVIEW_PARTS: readonly PartOfLessons[] = PARTS.map(([part]) => part);

/** The lessons in preview, in teaching order, part by part. */
export const PREVIEW_LESSONS: readonly LessonSpec[] = PARTS.flatMap(([, lessons]) => lessons);
