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
 * Written part by part in `preview.ts`, where the ledger walked them after the
 * course and every check asked them, and moved here whole the day C1 replaced
 * its three parts built from units (§15.14 step 5, §16), which left no level of
 * the course built from units. The order is load-bearing and is
 * `C1_PART_ORDER`'s: the ramp reads a part's band off its place, and the
 * recycling rule reads which C1 patterns came before it.
 */

import { C1_ISIKSUS_LESSONS, C1_ISIKSUS_PART } from "./c1-isiksus";
import { C1_MEEDIA_LESSONS, C1_MEEDIA_PART } from "./c1-meedia";
import { C1_KODU_LESSONS, C1_KODU_PART } from "./c1-kodu";
import { C1_KOOL_LESSONS, C1_KOOL_PART } from "./c1-kool";
import { C1_JUHT_LESSONS, C1_JUHT_PART } from "./c1-juht";
import { C1_UHISKOND_LESSONS, C1_UHISKOND_PART } from "./c1-uhiskond";
import { C1_MAA_LESSONS, C1_MAA_PART } from "./c1-maa";
import { C1_MOTE_LESSONS, C1_MOTE_PART } from "./c1-mote";
import type { LessonSpec, PartOfLessons } from "./types";

const PARTS: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  [C1_ISIKSUS_PART, C1_ISIKSUS_LESSONS],
  [C1_MEEDIA_PART, C1_MEEDIA_LESSONS],
  [C1_KODU_PART, C1_KODU_LESSONS],
  [C1_KOOL_PART, C1_KOOL_LESSONS],
  [C1_JUHT_PART, C1_JUHT_LESSONS],
  [C1_UHISKOND_PART, C1_UHISKOND_LESSONS],
  [C1_MAA_PART, C1_MAA_LESSONS],
  [C1_MOTE_PART, C1_MOTE_LESSONS],
];

export const C1_LESSON_PARTS: readonly PartOfLessons[] = PARTS.map(([part]) => part);

/** C1 in teaching order, part by part. */
export const C1_LESSONS: readonly LessonSpec[] = PARTS.flatMap(([, lessons]) => lessons);
