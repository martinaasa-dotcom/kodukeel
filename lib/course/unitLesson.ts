/**
 * THE LESSON THAT TEACHES WHAT A UNIT ASKED FOR.
 *
 * Every level is lessons since C1 moved (docs/43-lessons.md §16), so a unit's
 * page sends anybody who opens it to the lessons, and a link to a unit is a
 * link that bounces. The units stay as the dictionary's request list and as
 * the thing a readiness rung, an errand or a grammar page names, so where such
 * a screen offers "the words are in this unit", the door goes to the lesson
 * that teaches most of the unit's words instead: the earliest such lesson
 * where two teach as many, and the list of lessons where no lesson teaches
 * any of them, which is honest about there being no one place.
 *
 * Read off what each lesson teaches as the dictionary heads it
 * (`lessonHeads`), against the unit's own lemmas. Server code only: it reads
 * the harvest, which no browser bundle may carry, so a client screen is handed
 * the href by its page.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { unitById } from "@/lib/collections/syllabus";
import { LESSONS, type LessonSpec } from "./lessons";
import { lessonHeads } from "./lessonHeads";

const BEST = new Map<string, LessonSpec | null>();

/** The lesson teaching most of a unit's words, or null where none teaches any, or the unit does not exist. */
export function lessonForUnit(unitId: string): LessonSpec | null {
  if (BEST.has(unitId)) return BEST.get(unitId)!;
  const unit = unitById(unitId);
  let best: LessonSpec | null = null;
  let most = 0;
  if (unit) {
    const lemmas = new Set(unit.lemmas);
    for (const lesson of LESSONS) {
      const count = lessonHeads(lesson).filter((head) => lemmas.has(head)).length;
      if (count > most) { most = count; best = lesson; }
    }
  }
  BEST.set(unitId, best);
  return best;
}

/** Where a link that names a unit goes: the lesson that teaches it, or the list of lessons. */
export function unitLessonHref(unitId: string): string {
  const lesson = lessonForUnit(unitId);
  return lesson ? `/course/lessons/${lesson.id}` : "/course/lessons";
}
