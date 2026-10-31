/**
 * B2, LESSON BY LESSON (docs/43-lessons.md §13).
 *
 * B1 ends with somebody who gets things done in Estonian when the other
 * person meets them halfway. B2 ends with somebody who lives in it: they
 * follow two Estonians talking to each other at full speed, read what arrives
 * from the school, the doctor and the state without a translator, keep a
 * conversation in Estonian when the other person switches to English, and
 * have the words for the parts of life B1 never reached.
 *
 * The same six steps as B1, so it reads as one course, each harder (§13.4):
 * the conversation is two or more people talking to each other, heard before
 * it is read and from part 3 heard somewhere (`hearing`), with a real text to
 * read after it (`read`); Practice adds working a new word out from its parts
 * (`workOut`); the story is heard once from part 3 (`Retell.hearings`) and the
 * race shortens part by part to the exam's one-minute talk (`Faster.seconds`,
 * `prepare`). Each part writes exactly one of the B2 paper's texts, recycles a
 * pattern an earlier B2 part explained, and ends on a role-play with a
 * curveball (`b2LevelProblems`, `b2RampProblems`).
 *
 * Eight parts of six lessons, in the order of §13.3: how people really talk,
 * what people say, the children's world, body and care, a working week in
 * Estonian, paper and the state, belonging, and making a case. The family's
 * second year carries all eight (`docs/reviews/b2-cast.md`).
 *
 * Written part by part in `preview.ts`, where the ledger walked them after the
 * course and every check asked them, and moved here whole the day B2 replaced
 * its three parts built from units (§13.11 step 6, §14). The order is
 * load-bearing: the ramp (`rampB2.ts`) reads a part's band off its place here,
 * and the recycling rule (`b2LevelProblems`) reads which B2 patterns came
 * before it.
 */

import { B2_KONEKEEL_LESSONS, B2_KONEKEEL_PART } from "./b2-konekeel";
import { B2_KAUDNE_LESSONS, B2_KAUDNE_PART } from "./b2-kaudne";
import { B2_PERE_LESSONS, B2_PERE_PART } from "./b2-pere";
import { B2_TERVIS_LESSONS, B2_TERVIS_PART } from "./b2-tervis";
import { B2_TOO_LESSONS, B2_TOO_PART } from "./b2-too";
import { B2_RIIK_LESSONS, B2_RIIK_PART } from "./b2-riik";
import { B2_KULTUUR_LESSONS, B2_KULTUUR_PART } from "./b2-kultuur";
import { B2_ARUTELU_LESSONS, B2_ARUTELU_PART } from "./b2-arutelu";
import type { LessonSpec, PartOfLessons } from "./types";

const PARTS: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  [B2_KONEKEEL_PART, B2_KONEKEEL_LESSONS],
  [B2_KAUDNE_PART, B2_KAUDNE_LESSONS],
  [B2_PERE_PART, B2_PERE_LESSONS],
  [B2_TERVIS_PART, B2_TERVIS_LESSONS],
  [B2_TOO_PART, B2_TOO_LESSONS],
  [B2_RIIK_PART, B2_RIIK_LESSONS],
  [B2_KULTUUR_PART, B2_KULTUUR_LESSONS],
  [B2_ARUTELU_PART, B2_ARUTELU_LESSONS],
];

export const B2_LESSON_PARTS: readonly PartOfLessons[] = PARTS.map(([part]) => part);

/** B2 in teaching order, part by part. */
export const B2_LESSONS: readonly LessonSpec[] = PARTS.flatMap(([, lessons]) => lessons);
