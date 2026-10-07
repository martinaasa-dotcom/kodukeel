/**
 * The dictionary, read the way the question game needs it: a spelling to the
 * words it could be, with whether it is the plain dictionary shape and, where
 * the dictionary can say, which case it is.
 *
 * Built off `gapForms` and `readableSpellings`, which is the one answer the app
 * has to "what spellings does this word have", so a form the game recognises is
 * a stored form or one of the two derivations ADR-005 amendment 1 allows, and
 * this writes none of its own. Pure, so a page with a database and a unit test
 * read the same thing.
 */

import { gapForms, readableSpellings, type GapWord } from "@/lib/estonian/gapForms";
import type { Lookup, Reading } from "./twenty";

/** A form type that is the plain shape of a word, in either of the two spellings of the code. */
const BASE_FORM = /^(?:NOM_SG|NOM_PL)$|^EKILEX:(?:SgN|PlN)$/;

export type Index = Record<string, Reading[]>;

/** Spelling to readings, for the entries handed in. Serialisable, for a page to hand a browser. */
export function buildIndex(entries: readonly GapWord[]): Index {
  const index: Index = {};
  for (const entry of entries) {
    const lemma = entry.lemma.toLowerCase();
    const cases = gapForms(entry);
    const bases = new Set<string>([lemma]);
    for (const f of entry.forms) if (BASE_FORM.test(f.formType)) bases.add(f.value.toLowerCase());
    for (const spelling of readableSpellings(entry)) {
      const reading: Reading = { lemma, base: bases.has(spelling), case: cases.get(spelling) ?? null };
      const held = (index[spelling] ??= []);
      if (!held.some((r) => r.lemma === reading.lemma && r.base === reading.base && r.case === reading.case)) {
        held.push(reading);
      }
    }
  }
  return index;
}

export function lookupFrom(index: Readonly<Index>): Lookup {
  return (token) => index[token.toLowerCase()] ?? [];
}
