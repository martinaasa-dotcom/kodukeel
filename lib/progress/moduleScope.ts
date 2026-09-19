/**
 * The half of the module's scope that needs the dictionary: the spellings of
 * the words the ladder has taught, so a page can ask whether a sentence is
 * made of them. `lib/course/scope.ts` is the pure half and reads no database;
 * this reads one fact off `lib/dict/facts.ts`, which on a warm instance is no
 * query at all.
 */

import { courseFormsByLemma } from "@/lib/dict/facts";
import type { ModuleScope } from "@/lib/course/scope";
import { spellingsOf } from "@/lib/progress/lessonWords";

/** Every spelling of every taught word, or null outside a module. */
export async function moduleSpellings(scope: ModuleScope | null): Promise<ReadonlySet<string> | null> {
  if (!scope) return null;
  return spellingsOf(await courseFormsByLemma(), scope.lemmas);
}
