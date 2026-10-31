/**
 * C1, LESSON BY LESSON (docs/43-lessons.md §15).
 *
 * B2 ends with somebody who lives in Estonian. C1 ends with somebody who is
 * themselves in it: as funny, as precise, as kind and as firm as they are in
 * their own language. The same six steps as B2, so it reads as one course,
 * each harder (§15.5): three or four people who interrupt each other, heard
 * first and always somewhere (`hearing`), questions on what was meant
 * (`Gist.meant`), and from part 2 a talk taken down as notes (`notes`); a real
 * text read after it, asked about from part 3 in the paper's three shapes
 * (`read.questions`); which room in Practice (`rooms`); a story heard once and
 * a single timed go, from part 5 on one of two topics (`Faster.topics`). Each
 * part writes exactly one real text, recycles a C1 pattern of an earlier part
 * and a B2 pattern, and ends on a role-play whose scene admits a curveball
 * (`c1LevelProblems`, `c1RampProblems`).
 *
 * Eight parts in the order of §15.3 (`C1_PART_ORDER` in `rampC1.ts`): being
 * yourself, understanding everything, buying a home, the school from the
 * inside, leading, taking part, Estonia beyond Tallinn, and ideas, books and
 * the exam. The family's third year carries all eight
 * (`docs/reviews/c1-cast.md`).
 *
 * EMPTY UNTIL C1 BECOMES THE COURSE. The parts are written in `preview.ts`,
 * where the ledger walks them after the course and every check asks them, and
 * move here whole the day C1 replaces its parts built from units (§15.14 step
 * 5), the way B2's did (`b2.ts`). The order is load-bearing: the ramp reads a
 * part's band off its place, and the recycling rule reads which C1 patterns
 * came before it.
 */

import type { LessonSpec, PartOfLessons } from "./types";

const PARTS: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  // One line per C1 part, in teaching order, on the day C1 becomes the course: [C1_<PART>_PART, C1_<PART>_LESSONS],
];

export const C1_LESSON_PARTS: readonly PartOfLessons[] = PARTS.map(([part]) => part);

/** C1 in teaching order, part by part. */
export const C1_LESSONS: readonly LessonSpec[] = PARTS.flatMap(([, lessons]) => lessons);
