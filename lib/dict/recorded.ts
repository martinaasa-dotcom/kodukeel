import { mentions } from "@/lib/estonian/cloze";
import { readCase } from "@/lib/estonian/whichCase";
import type { CaseKey } from "@/lib/estonian/types";
import { lentFor, type Example } from "@/lib/dict/examples";

/**
 * WHETHER SOMEBODY HAS WRITTEN THIS WORD IN THIS CASE.
 *
 * The one signal a round has that a form the rule builds is a form anybody
 * says: a lexicographer recorded a sentence with it, under the word itself or
 * under another entry and lent to this one for that very spelling
 * (`Example.via`). The writing round asks a place case only where this holds,
 * and Describe prefers a word it holds for.
 *
 * ONLY A SPELLING THAT IS THAT CASE AND NO OTHER COUNTS, which is `readCase`'s
 * strict rule. The short illative is spelled like the genitive for most words
 * that have one, so `päevalille` in any sentence about a sunflower's head was
 * read as somebody having written "into the sunflower", and a round asked for
 * it. `index` is the word's own `caseIndex`.
 */
export function recordsCase(
  index: ReadonlyMap<string, CaseKey[]>,
  key: CaseKey,
  forms: readonly (string | null | undefined)[],
  own: readonly Example[],
  lent: readonly Example[],
): boolean {
  return forms.some((form) => {
    if (!form) return false;
    const verdict = readCase(index, form);
    if (verdict.kind !== "one" || verdict.key !== key) return false;
    return own.some((e) => mentions(e.et, form)) || lent.some((e) => lentFor(e, form) && mentions(e.et, form));
  });
}
