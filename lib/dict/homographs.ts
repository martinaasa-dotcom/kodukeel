import DATA from "@/prisma/data/homographs.json";

/**
 * WHICH WORD A SPELLING IN A SENTENCE IS, WHERE THE LANGUAGE GIVES IT TO MORE THAN ONE.
 *
 * Read off Vabamorf by `npm run homographs` (`scripts/build-homographs.ts`)
 * and shipped in `prisma/data/homographs.json`, in two parts: the spellings in
 * the dictionary's sentences that can belong to more than one word, and for
 * each sentence holding one, which word the disambiguator reads it as there.
 * `borrowSentences` lends a sentence for such a spelling only to the word the
 * sentence means, because a spelling unique among the dictionary's six
 * thousand entries is not unique in the language: `aastasadade jooksul` is the
 * postposition "during" rather than "on the run", `puu otsas` is the
 * postposition rather than "in the end", `Ämm on paha tujuga õel` is the
 * adjective "malicious" rather than "at the sister", and `Maksa peamised
 * funktsioonid` is the liver rather than "pay!".
 *
 * It only ever refuses, and only a loan, which is what makes reading a model
 * of the whole language safe here: no form, no answer and no sentence comes
 * off it, so it decides nothing a learner is asked (ADR-005). A word's own
 * sentences are filed under it by a lexicographer and are never checked.
 *
 * A sentence the shipped dictionary does not hold, which is a usage a live
 * Ekilex lookup brought in afterwards, has no reading here, so an ambiguous
 * spelling in one is not lent at all: a claim too many costs a sentence, and a
 * claim too few costs a wrong card. The unit suite fails when the shipped
 * sentences have moved and this has not been rebuilt.
 */
export interface Homographs {
  /** The spellings that can belong to more than one word. */
  readonly spellings: ReadonlySet<string>;
  /** Which words a spelling is in one sentence, lower-cased, or undefined where nobody read it. */
  reading(sentence: string, spelling: string): readonly string[] | undefined;
}

/**
 * A short, stable key for a sentence, shared by the build and the read.
 *
 * Two FNV-1a passes over the trimmed, lower-cased text, forty-eight bits in
 * all, because the readings are keyed on fifteen thousand sentences and the
 * text itself would be most of the file.
 */
export function sentenceKey(sentence: string): string {
  const text = sentence.trim().toLocaleLowerCase("et");
  const pass = (seed: number) => {
    let hash = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  };
  return pass(0x811c9dc5).toString(16).padStart(8, "0") + pass(0x9e3779b9).toString(16).padStart(8, "0").slice(0, 4);
}

/** The shape `prisma/data/homographs.json` takes. */
export interface HomographFile {
  readonly homographs: readonly string[];
  /** `${sentenceKey}|${spelling}` to the words it is there, space-separated. */
  readonly readings: Readonly<Record<string, string>>;
}

export function homographsFrom(file: HomographFile): Homographs {
  const spellings = new Set(file.homographs);
  return {
    spellings,
    reading(sentence, spelling) {
      const found = file.readings[`${sentenceKey(sentence)}|${spelling}`];
      return found === undefined ? undefined : found.split(" ").filter(Boolean);
    },
  };
}

/** The shipped reading. */
export const HOMOGRAPHS: Homographs = homographsFrom(DATA as HomographFile);

/**
 * Whether a sentence may be lent to `lemma` for `spelling`.
 *
 * Yes where the language gives the spelling to one word; where it gives it to
 * more, only if the sentence was read and the reading names this word.
 */
export function lendable(homographs: Homographs, sentence: string, spelling: string, lemma: string): boolean {
  if (!homographs.spellings.has(spelling)) return true;
  return homographs.reading(sentence, spelling)?.includes(lemma.toLocaleLowerCase("et")) ?? false;
}
