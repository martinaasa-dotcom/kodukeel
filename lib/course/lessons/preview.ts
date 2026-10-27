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
 */
import { B1_OBJEKT_LESSONS, B1_OBJEKT_PART } from "./b1-objekt";
import { B1_REKTSIOON_LESSONS, B1_REKTSIOON_PART } from "./b1-rektsioon";
import { B1_RAHA_LESSONS, B1_RAHA_PART } from "./b1-raha";
import { B1_KODU_LESSONS, B1_KODU_PART } from "./b1-kodu";
import { B1_UUDISED_LESSONS, B1_UUDISED_PART } from "./b1-uudised";
import { B1_ARVAMUS_LESSONS, B1_ARVAMUS_PART } from "./b1-arvamus";
import { B1_ASJAAJAMINE_LESSONS, B1_ASJAAJAMINE_PART } from "./b1-asjaajamine";
import type { LessonSpec, PartOfLessons } from "./types";

/** B1's parts in teaching order. A part with no lessons yet is not listed. */
const B1: readonly (readonly [PartOfLessons, readonly LessonSpec[]])[] = [
  [B1_OBJEKT_PART, B1_OBJEKT_LESSONS],
  [B1_REKTSIOON_PART, B1_REKTSIOON_LESSONS],
  [B1_RAHA_PART, B1_RAHA_LESSONS],
  [B1_KODU_PART, B1_KODU_LESSONS],
  [B1_UUDISED_PART, B1_UUDISED_LESSONS],
  [B1_ARVAMUS_PART, B1_ARVAMUS_LESSONS],
  [B1_ASJAAJAMINE_PART, B1_ASJAAJAMINE_LESSONS],
];

export const PREVIEW_LESSONS: readonly LessonSpec[] = B1.flatMap(([, lessons]) => lessons);
export const PREVIEW_PARTS: readonly PartOfLessons[] = B1.filter(([, lessons]) => lessons.length > 0).map(([part]) => part);
