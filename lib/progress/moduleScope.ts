/**
 * The half of the module's scope that needs the dictionary: the spellings of
 * the words the ladder has taught, so a page can ask whether a sentence is
 * made of them. `lib/course/scope.ts` is the pure half and reads no database;
 * this reads one fact off `lib/dict/facts.ts`, which on a warm instance is no
 * query at all.
 */

import { cache } from "react";

import { grammarThrough, taughtThrough } from "@/lib/course";
import { courseFormsByLemma } from "@/lib/dict/facts";
import { moduleReached } from "@/lib/progress/course";
import type { ModuleScope } from "@/lib/course/scope";
import { spellingsOf } from "@/lib/progress/lessonWords";

/** Every spelling of every taught word, or null outside a module. */
export async function moduleSpellings(scope: ModuleScope | null): Promise<ReadonlySet<string> | null> {
  if (!scope) return null;
  return spellingsOf(await courseFormsByLemma(), scope.lemmas);
}

/**
 * WHERE THE MODULE HAS TAKEN THIS LEARNER, READ OFF THEIR OWN STANDING RATHER
 * THAN OFF AN ADDRESS.
 *
 * `moduleScopeFrom` answers for a screen the module *opened*, which is the
 * only thing a URL can say. The daily path opens no such screen and was
 * therefore held to nothing: `/review` trickles unseen cards in beside what is
 * due, and on the second evening of A1 it handed a beginner
 * `Olen ______ nõus.` — a gap in a sentence holding two words nobody had shown
 * her, under a heading saying six were due. It was reported from exactly
 * there.
 *
 * The planned module is the record of what somebody has been taught, so it is
 * what the app reads before it teaches anything else. Everything a learner
 * walks to themselves is still their own difficulty to pick, which is the line
 * `lib/course/scope.ts` already draws; what changed is that the daily trickle
 * is on the module's side of it, because nobody chose those words.
 *
 * Null for a learner who is not following a module, which is a state rather
 * than an absence: see `moduleReached`.
 */
export const learnerModuleScope = cache(async (ownerId: string): Promise<ModuleScope | null> => {
  const reached = await moduleReached(ownerId);
  if (!reached) return null;
  const { programme, day } = reached;
  return {
    programme,
    day,
    lemmas: taughtThrough(programme, day.index),
    ...grammarThrough(programme, day.index),
  };
});
