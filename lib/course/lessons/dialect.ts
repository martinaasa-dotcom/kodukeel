/**
 * REGIONAL SPELLINGS A TEXT MAY HOLD, EACH BESIDE ITS STANDARD WORD (C1,
 * docs/43-lessons.md §15.7).
 *
 * TartuNLP's voices speak standard Estonian, and a synthetic voice putting on
 * a Võro accent would be this app inventing a dialect, so dialect is only ever
 * read: in a text the native speaker writes or quotes (`LessonSpec.read`, or a
 * talk taken down as notes), in `c1-maa`. A dialect word cannot be held to the
 * forms list the way every other spelling of a text is. The list does not know
 * `mõtsa` (Võro for `metsa`), and it reads `vällä` (for `välja`) as a form of
 * `vald`, which would let a wrong reading through in silence.
 *
 * So each dialect spelling a text holds is a key here, lower-cased, with the
 * standard spelling it stands for, which the native speaker writes. The check
 * reads this glossary for those words and never the forms list, and holds the
 * standard spelling to the forms list instead (`formsCheckWords`). Only a line
 * of a text read or a talk heard may hold one: anywhere else a spelling is
 * held to the ledger, and a dialect word is a word nobody was taught.
 *
 * FILLED BY `c1-maa`, the one part that reads dialect, each word beside its
 * standard spelling. Pure data.
 */
export const DIALECT_WORDS: Readonly<Record<string, string>> = {
  // Võro, in the travel page of lesson 37 and the texts after it.
  aigu: "aega",
  aitüma: "aitäh",
  esä: "isa",
  hää: "hea",
  imä: "ema",
  kae: "vaata",
  kiil: "keel",
  mõts: "mets",
  om: "on",
  tulõ: "tule",
};

/** The standard spelling a dialect spelling stands for, or null for an ordinary one. Case aside. */
export function standardOf(spelling: string, glossary: Readonly<Record<string, string>> = DIALECT_WORDS): string | null {
  return glossary[spelling.toLocaleLowerCase("et")] ?? null;
}

/**
 * What is wrong with a glossary, as sentences: a key not lower-cased or not
 * one word, a standard spelling that is not one word, or a key that is its own
 * standard. Whether the standard spelling is a real one is the forms list's to
 * say, asked by the lessons test and the per-part check.
 */
export function dialectProblems(glossary: Readonly<Record<string, string>> = DIALECT_WORDS): string[] {
  const problems: string[] = [];
  const oneWord = /^\p{L}+$/u;
  for (const [key, standard] of Object.entries(glossary)) {
    if (key !== key.toLocaleLowerCase("et")) problems.push(`the dialect spelling "${key}" is lower-cased in the glossary`);
    if (!oneWord.test(key)) problems.push(`the dialect spelling "${key}" is one word`);
    if (!oneWord.test(standard)) problems.push(`the standard word for "${key}", "${standard}", is one word`);
    if (key === standard.toLocaleLowerCase("et")) problems.push(`"${key}" is its own standard word, so it is no dialect spelling`);
  }
  return problems;
}
