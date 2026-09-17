/**
 * WHAT THE COURSE HAS TAUGHT BY THE END OF A UNIT.
 *
 * A lesson at A1 may put no Estonian on the screen that the learner has not
 * been shown, which is rule 4 in `lib/collections/lesson.ts`. That rule needs
 * one thing the planner cannot work out for itself, because the planner is
 * pure and the answer is in the dictionary: every *spelling* of every word the
 * course has reached, not just its headword. `Palun võta veel üks komm` is
 * five untaught words to a learner on unit one, and `võta` is a form of
 * `võtma` rather than a headword anybody would find by comparing lemmas.
 *
 * The lemmas come from the syllabus, which is the teaching order, and the
 * spellings from `courseFormsByLemma`, which is a fact about the shared
 * dictionary and so is read once a minute per instance rather than once per
 * lesson. Building the union costs a few thousand string inserts over a map
 * already in memory: at A1 the widest it gets is the level's own 464 words.
 *
 * Nothing here is scoped to a learner. Which unit they are on is, and that is
 * the caller's; what the course teaches by that point is the same for
 * everybody, which is why this can sit on top of a shared cache at all.
 */
import { courseFormsByLemma } from "@/lib/dict/facts";
import { lemmasTaughtUpTo } from "@/lib/collections/syllabus";

/**
 * Every spelling the course has taught by the end of `unitId`, folded to lower
 * case, for `LessonInput.taughtWords`.
 *
 * An unknown unit returns an empty set rather than everything, matching
 * `lemmasTaughtUpTo`: at A1 that means no sentence exercises, which is the
 * cautious failure rather than the silent one.
 */
export async function taughtWords(unitId: string): Promise<ReadonlySet<string>> {
  const byLemma = await courseFormsByLemma();
  const out = new Set<string>();
  for (const lemma of lemmasTaughtUpTo(unitId)) {
    for (const spelling of byLemma.get(lemma) ?? []) out.add(spelling);
  }
  return out;
}
