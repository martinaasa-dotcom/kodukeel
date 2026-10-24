/**
 * A2, LESSON BY LESSON (docs/43-lessons.md §9).
 *
 * A2 is built round one idea and four uses of it. The idea is the [omastav]
 * (2nd form) as the stem every ending goes on, which part one teaches. The
 * uses are the six place endings whole (part two), the past whole and the
 * perfect (part three), the conditional and the rest of the endings, -ni,
 * -na, -ks and -ta (parts five to seven), each on the situations A2 is for:
 * the doctor, the station, the restaurant, the landlord, the bank, a job.
 * Part eight puts it together in what people think and plan, and ends A2 on a
 * conversation that uses every part.
 *
 * `A2_LESSONS` at the foot is every A2 lesson in teaching order, which is the
 * order the ledger walks, after the whole of A1.
 *
 * EVERY ESTONIAN LINE HERE WAS WRITTEN FOR A LEARNER AND IS READ BY THE
 * NATIVE SPEAKER IN THE PULL REQUEST THAT ADDS IT (ADR-005 amendment 6), and
 * passes the same two checks as A1: every spelling is one the forms list
 * knows, and every spelling has been taught by the lesson it is shown in.
 */

import { A2_KELLE_LESSONS, A2_KELLE_PART } from "./a2-kelle";
import { A2_KUHU_LESSONS, A2_KUHU_PART } from "./a2-kuhu";
import { A2_EILE_LESSONS, A2_EILE_PART } from "./a2-eile";
import { A2_TERVIS_LESSONS, A2_TERVIS_PART } from "./a2-tervis";
import { A2_REIS_LESSONS, A2_REIS_PART } from "./a2-reis";
import { A2_RESTORAN_LESSONS, A2_RESTORAN_PART } from "./a2-restoran";
import type { LessonSpec, PartOfLessons } from "./types";

export const A2_LESSON_PARTS: readonly PartOfLessons[] = [
  A2_KELLE_PART,
  A2_KUHU_PART,
  A2_EILE_PART,
  A2_TERVIS_PART,
  A2_REIS_PART,
  A2_RESTORAN_PART,
];

/** A2 in teaching order, part by part. */
export const A2_LESSONS: readonly LessonSpec[] = [
  ...A2_KELLE_LESSONS,
  ...A2_KUHU_LESSONS,
  ...A2_EILE_LESSONS,
  ...A2_TERVIS_LESSONS,
  ...A2_REIS_LESSONS,
  ...A2_RESTORAN_LESSONS,
];
