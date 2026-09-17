/**
 * WHAT THE COURSE HAS TAUGHT BY THE POINT A LESSON OPENS.
 *
 * A lesson at A1 may put no Estonian on the screen that the learner has not
 * been shown, which is rule 4 in `lib/collections/lesson.ts`. That rule needs
 * one thing the planner cannot work out for itself, because the planner is
 * pure and the answer is in the dictionary: every *spelling* of every word the
 * course has reached, not just its headword. `Palun võta veel üks komm` is
 * five untaught words to a learner on unit one, and `võta` is a form of
 * `võtma` rather than a headword anybody would find by comparing lemmas.
 *
 * TWO INPUTS, BECAUSE A UNIT IS SEVERAL SITTINGS. The units before this one
 * are taught whole; this one is taught six words at a time, and every unit in
 * the course splits into more than one lesson. Read as "the whole unit is
 * taught", lesson 1 of `millal` would gap a sentence holding a word lesson 3
 * introduces, which is the fault this file exists for arriving one sitting
 * later. The cut is at the lesson boundary rather than at the word: a word met
 * later in the *same* sitting is a few minutes away and the interleave puts
 * the meetings first, where a word two sittings away is a different evening.
 *
 * WHAT "TAUGHT" MEANS HERE, AND WHAT IT DOES NOT. It is the *course's* order,
 * not this learner's history: `SYLLABUS` is the teaching order and a unit at or
 * below somebody's level is open whatever they have done (`isUnitOpen`), so a
 * learner who skips to unit 20 is credited with the nineteen before it. That is
 * deliberate and it is the weaker of the two claims. The stronger one is a
 * query over their own review log per lesson, which is a fact about a person
 * and so could not be cached across learners the way this is; and the way
 * somebody arrives at unit 20 having done nothing is by deciding to, which is
 * the case the course already declines to police. Where the two differ this
 * one is more permissive, so it is the direction to watch if the rule ever
 * needs tightening.
 *
 * The spellings come from `courseFormsByLemma`, a fact about the shared
 * dictionary read once a minute per instance. This is pure, so the page reads
 * that in the batch it was already making and decides here.
 */
import { lemmasTaughtBefore } from "@/lib/collections/syllabus";

/**
 * Every spelling the course has taught by the start of this lesson, folded to
 * lower case, for `LessonInput.taughtWords`.
 *
 * `reachedInUnit` is this unit's own lemmas up to and including the sitting
 * being planned. An unknown unit contributes nothing before it rather than
 * everything, matching `lemmasTaughtBefore`: at A1 that means no sentence
 * exercise, which is the cautious failure rather than the silent one.
 */
export function taughtSpellings(
  byLemma: ReadonlyMap<string, ReadonlySet<string>>,
  unitId: string,
  reachedInUnit: readonly string[],
): ReadonlySet<string> {
  const out = new Set<string>();
  for (const lemma of [...lemmasTaughtBefore(unitId), ...reachedInUnit]) {
    for (const spelling of byLemma.get(lemma) ?? []) out.add(spelling);
  }
  return out;
}
