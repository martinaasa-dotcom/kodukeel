/**
 * WORK IT OUT: WHICH UNTAUGHT WORD A LESSON MAY ASK ABOUT (docs/43-lessons.md §13.6).
 *
 * The ledger's rule is that nothing untaught is ever asked. B2 changes it in
 * one narrow way: a word whose parts have all been taught may be asked about
 * for its meaning, never for its form, one to a sentence. This module is the
 * whole of what "whose parts have all been taught" means, and it is
 * mechanical: it reads the author's own split of the word and holds it to the
 * ledger, rather than splitting the word itself.
 *
 * WHY THE AUTHOR'S SPLIT AND NOT VABAMORF'S. The plan first had the parts read
 * off Vabamorf's analysis with guessing off, which marks the boundary inside a
 * compound. That analysis lives in the forms build (Python, offline), and the
 * unit suite may not run it, so a check that depended on it would be a check
 * the suite cannot ask. The split is written beside the word instead, and what
 * is checked is that it is honest: the parts joined are the word, every part
 * but the last is a spelling the ledger has taught, and the last is a taught
 * spelling or a suffix B1's derivation lesson explained. A split that is not
 * the word, or leans on a part nobody taught, fails the suite.
 *
 * THE SUFFIXES ARE ENDINGS, NOT WORDS (ADR-005). They are the latitude
 * `cases.ts` and `conjugate.ts` take: a handful of letters that build a word,
 * never a word written by the app. The word itself has to be one the forms list
 * knows (`isExactForm`, checked where the forms list is read), so what a
 * learner is shown is a word somebody wrote down, which the app only splits.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { uncovered, wordsOf, type Ledger } from "./ledger";
import type { WorkOut } from "./types";

/**
 * THE DERIVATION SUFFIXES A WORD'S LAST PART MAY BE, without their hyphen.
 *
 * B1's derivation lesson explains four by name (-ja, -mine, -lik, -tu, in
 * `b1-asjaajamine`), and the grammar reference's page names the rest of the
 * handful that make most derived words readable: -us for the quality or the
 * act, -ne for "of" or "made of", -kas for "full of", -la for the place, -ik
 * and -nik for a person or a thing, -lane for who belongs, -line for "of this
 * kind", -tus and -mus for the result, -ke for the small one. Each is the
 * suffix's base shape; a word inflected past it is split with a taught
 * spelling last instead, or a sentence holding the base shape is chosen.
 */
export const DERIVATION_SUFFIXES: ReadonlySet<string> = new Set([
  "ja", "mine", "lik", "tu", "us", "ne", "kas", "la", "ik", "nik", "lane", "line", "tus", "mus", "ke",
]);

/** How many options a work-it-out question has: three, one of them the meaning. */
export const WORK_OUT_OPTIONS = 3;

/**
 * Everything wrong with one work-it-out item, against the ledger at the end of
 * the lesson that asks it. Empty means it may be asked.
 *
 * `names` are the names the lesson may use, which the rest of the sentence is
 * read against as every other line is.
 */
export function workOutProblems(item: WorkOut, ledger: Ledger, names: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const word = item.word.toLocaleLowerCase("et");
  const parts = item.parts.map((p) => p.toLocaleLowerCase("et"));
  if (!ledger.patterns.has("derivation")) problems.push("asks a word to be worked out before the derivation pattern is explained");
  if (wordsOf(item.word).length !== 1 || wordsOf(item.word)[0]!.raw !== item.word) problems.push(`"${item.word}" is not one word`);
  if (parts.length < 2) problems.push(`"${item.word}" is split into ${parts.length} part, where working it out needs two or more`);
  if (parts.join("") !== word) problems.push(`its parts ${item.parts.join(" + ")} are not "${item.word}"`);
  if (ledger.spellings.has(word)) problems.push(`"${item.word}" is taught already, so there is nothing to work out`);
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    if (ledger.spellings.has(part)) return;
    if (last && DERIVATION_SUFFIXES.has(part)) return;
    problems.push(last
      ? `its last part "${item.parts[i]}" is neither a taught spelling nor a derivation suffix`
      : `its part "${item.parts[i]}" is not a taught spelling`);
  });
  // The word stands in the sentence once, as itself, and nothing else in the sentence is untaught.
  const standing = wordsOf(item.sentence.et).filter((w) => w.raw === item.word).length;
  if (standing !== 1) problems.push(`"${item.word}" stands ${standing} times in "${item.sentence.et}", where it stands once`);
  const missing = uncovered(item.sentence.et, ledger, new Set([...names, item.word]));
  if (missing.length > 0) problems.push(`"${item.sentence.et}" also uses ${missing.join(", ")}, not taught by now; a sentence works out one word`);
  // Three meanings, one of them the right one, none twice.
  const options = item.options.map((o) => o.trim().toLocaleLowerCase("en"));
  if (item.options.length !== WORK_OUT_OPTIONS) problems.push(`has ${item.options.length} options, where it has ${WORK_OUT_OPTIONS}`);
  if (new Set(options).size !== options.length) problems.push("lists an option twice");
  if (options.filter((o) => o === item.means.trim().toLocaleLowerCase("en")).length !== 1) problems.push(`its meaning "${item.means}" is not one of its options`);
  return problems;
}

/** Whether a word may be worked out: its split is honest and every part is taught (a convenience over `workOutProblems`). */
export function isDerivable(item: Pick<WorkOut, "word" | "parts">, ledger: Ledger): boolean {
  const word = item.word.toLocaleLowerCase("et");
  const parts = item.parts.map((p) => p.toLocaleLowerCase("et"));
  if (parts.length < 2 || parts.join("") !== word || ledger.spellings.has(word)) return false;
  return parts.every((part, i) => ledger.spellings.has(part) || (i === parts.length - 1 && DERIVATION_SUFFIXES.has(part)));
}
