/**
 * B1, LESSON BY LESSON (docs/43-lessons.md §11 and §12).
 *
 * B1 is A2's course one step up: the learner has the words and lacks the
 * speed, the accuracy and the ear. So every lesson is heard before it is read
 * (`listenFor`), practiced by changing a sentence rather than choosing one
 * (`reworks`) and by putting right the slip the learner keeps making
 * (`fixes`), and said longer than one line (a story retold, an answer said
 * three times faster). Each part writes one real text on its writing evening
 * (`write`) and ends on a conversation with something at stake.
 *
 * Seven parts, in the order the grammar builds: the whole object or some of
 * it, what each verb asks for, would have at work, the -tud word and agreement
 * in renting, the impersonal and had done in the news, because and the one
 * who in opinions, and the small words that finish a verb in getting things
 * done, ending B1 on its speaking exam, practiced.
 *
 * Read by the native speaker where the second model pass flags a line
 * (docs/43-lessons.md B-L7), and held to the same checks as every lesson.
 */

import { B1_OBJEKT_LESSONS, B1_OBJEKT_PART } from "./b1-objekt";
import { B1_REKTSIOON_LESSONS, B1_REKTSIOON_PART } from "./b1-rektsioon";
import { B1_RAHA_LESSONS, B1_RAHA_PART } from "./b1-raha";
import { B1_KODU_LESSONS, B1_KODU_PART } from "./b1-kodu";
import { B1_UUDISED_LESSONS, B1_UUDISED_PART } from "./b1-uudised";
import { B1_ARVAMUS_LESSONS, B1_ARVAMUS_PART } from "./b1-arvamus";
import { B1_ASJAAJAMINE_LESSONS, B1_ASJAAJAMINE_PART } from "./b1-asjaajamine";
import type { LessonSpec, PartOfLessons } from "./types";

const PARTS: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  [B1_OBJEKT_PART, B1_OBJEKT_LESSONS],
  [B1_REKTSIOON_PART, B1_REKTSIOON_LESSONS],
  [B1_RAHA_PART, B1_RAHA_LESSONS],
  [B1_KODU_PART, B1_KODU_LESSONS],
  [B1_UUDISED_PART, B1_UUDISED_LESSONS],
  [B1_ARVAMUS_PART, B1_ARVAMUS_LESSONS],
  [B1_ASJAAJAMINE_PART, B1_ASJAAJAMINE_LESSONS],
];

export const B1_LESSON_PARTS: readonly PartOfLessons[] = PARTS.map(([part]) => part);

/** B1 in teaching order, part by part. */
export const B1_LESSONS: readonly LessonSpec[] = PARTS.flatMap(([, lessons]) => lessons);
