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

/**
 * Headword to its further spellings, space separated, off the forms list
 * (`prisma/data/twenty-forms.json`). Compact because a page hands it to a browser.
 */
export type Extra = Record<string, string>;

/**
 * The dictionary's index with the forms list's spellings folded in. A spelling
 * from the forms list carries no case label, since the list holds none, and the
 * game reads such a spelling by its ending where it needs a case at all.
 */
export function withExtra(index: Readonly<Index>, extra: Readonly<Extra> | null | undefined): Index {
  if (!extra) return index as Index;
  const merged: Index = { ...index };
  for (const [lemma, forms] of Object.entries(extra)) {
    for (const spelling of forms.split(" ")) {
      if (!spelling || index[spelling]) continue;
      const held = (merged[spelling] ??= []);
      if (!held.some((r) => r.lemma === lemma)) held.push({ lemma, base: false, case: null });
    }
  }
  return merged;
}

export function lookupFrom(index: Readonly<Index>): Lookup {
  return (token) => index[token.toLowerCase()] ?? [];
}

/** Edit distance, capped: anything past `cap` is reported as `cap + 1`. */
function distance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      row.push(v);
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    prev = row;
  }
  return prev[b.length]!;
}

/**
 * A slip of the hand put right, against the spellings this game reads and
 * nothing else: one letter out on a word of four or more, two on a word of
 * eight or more, and only where exactly one spelling is that close. Two
 * candidates at the same distance is a word the game cannot be sure of, and
 * guessing would answer a question nobody asked. A diacritic dropped counts as
 * a slip, since `poder` for `põder` is the commonest one there is.
 */
export function repairFrom(index: Readonly<Index>): (token: string) => string | null {
  const spellings = Object.keys(index);
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
  const byFold = new Map<string, string[]>();
  for (const s of spellings) {
    const k = fold(s);
    const held = byFold.get(k) ?? [];
    held.push(s);
    byFold.set(k, held);
  }
  const memo = new Map<string, string | null>();
  return (raw) => {
    const token = raw.toLowerCase();
    if (memo.has(token)) return memo.get(token)!;
    let found: string | null = null;
    if (index[token]) found = token;
    else {
      const folded = byFold.get(fold(token));
      if (folded && folded.length === 1) found = folded[0]!;
      else if (token.length >= 4) {
        const cap = token.length >= 8 ? 2 : 1;
        let best = cap + 1;
        let hits: string[] = [];
        for (const s of spellings) {
          const d = distance(token, s, cap);
          if (d < best) { best = d; hits = [s]; }
          else if (d === best && d <= cap) hits.push(s);
        }
        if (best <= cap && new Set(hits.map((h) => index[h]![0]!.lemma)).size === 1) found = hits[0]!;
      }
    }
    memo.set(token, found);
    return found;
  };
}

/** One short sense, with the note in brackets taken off: "bread (dark)" is "bread". */
export function shortGloss(translation: string): string {
  const first = translation.split(/[,;]/)[0] ?? translation;
  return first.replace(/\s*\([^)]*\)/g, "").trim() || translation;
}
