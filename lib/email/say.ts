/*
  A LETTER IN THE LANGUAGE ITS READER CHOSE.

  Every letter is written in English and looked up line by line in the
  interface tables (`lib/copy/locale.ts`), so a Russian or Ukrainian reader
  gets the letter in their own language and an English one gets exactly the
  bytes it always got: `tr` hands English back untouched. The lines live in
  `lib/copy/i18n/areas/letters.ts`, and a line nobody has translated yet is
  sent in English rather than as a blank, which is the rule everywhere else.

  A count is the one thing that cannot be a value dropped into a template. The
  English spells small numbers out ("three steps"), which is how a sentence
  wants them, and Russian and Ukrainian need one of three plural forms chosen
  by the number. So a counted value is built per language: spelled in English,
  a figure and the right form of the noun in the other two.

  Pure, like the rest of this directory: nothing here reads a setting. The
  locale arrives in each letter's input, resolved in `lib/progress/mailout.ts`.
*/
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { SpelledCount, spelledCount } from "@/lib/copy/values";

export type { Locale };

/** A line of this letter in its reader's language, with its values filled. */
export function sayer(locale: Locale) {
  return (english: string, values?: Readonly<Record<string, string | number>>): string =>
    values ? fill(tr(locale, english), values) : tr(locale, english);
}

/**
 * "three steps" in English, "3 шага" in Russian, "3 кроки" in Ukrainian.
 *
 * `noun` is the key of the counted table and also the English singular; the
 * English plural is given where it is not the singular plus `s`. `capital`
 * opens the English on a capital, for a count that starts a sentence.
 */
export function spelled(
  locale: Locale,
  n: number,
  noun: string,
  options: { plural?: string; capital?: boolean } = {},
): string {
  if (locale !== "en") return countOf(locale, n, noun);
  const word = options.capital ? SpelledCount(n) : spelledCount(n);
  return `${word} ${n === 1 ? noun : (options.plural ?? `${noun}s`)}`;
}

/** The same, with the figure in English as well: "212 words". */
export function figured(locale: Locale, n: number, noun: string, options: { plural?: string; always?: boolean } = {}): string {
  if (locale !== "en") return countOf(locale, n, noun);
  return `${n} ${n === 1 && !options.always ? noun : (options.plural ?? `${noun}s`)}`;
}

/** The first letter lowered, which English wants mid-sentence and the other two do not need. */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
