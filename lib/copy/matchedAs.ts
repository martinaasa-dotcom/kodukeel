import { fill, tr, translated, type Locale } from "./locale";
import { localiseReadings } from "./questionReading";

/**
 * WHAT A FORM IS CALLED, IN THE LEARNER'S LANGUAGE.
 *
 * The search names the form it matched in one English string, built by
 * `lib/dict/search.ts` out of `formLabel` (`lib/estonian/morph.ts`):
 * "seesütlev (what is it in? where?) of tuba". The Estonian name leads, the
 * English half after it is what the case asks or the verb category, and the
 * headword ends it. A scan stores that string as it came (`lib/scan/items.ts`),
 * so a page scanned last month holds it too, and a screen that dropped it into
 * a Russian template printed half a sentence of English. This reads the three
 * parts back and puts each through the tables: the Estonian name is left
 * exactly as it is (a class names a case that way, and never with the Latin
 * name), the English half is translated, and the whole is one template so a
 * language orders it its own way.
 *
 * A string without the lemma (`lib/dict/glossed.ts` strips it under a
 * sentence) is read the same way, and one this cannot read is returned as it
 * stands, which is what every screen printed before this existed.
 */
export function matchedAsIn(locale: Locale, matchedAs: string): string {
  if (locale === "en" || !matchedAs) return matchedAs;
  const parts = parse(matchedAs);
  if (!parts) return matchedAs;
  const { form, english, lemma } = parts;
  const reading = english === null ? null : readingIn(locale, english);
  if (reading !== null && lemma !== null) return fill(tr(locale, "{form} ({reading}) of {lemma}"), { form, reading, lemma });
  if (reading !== null) return fill(tr(locale, "{form} ({reading})"), { form, reading });
  if (lemma !== null) return fill(tr(locale, "{form} of {lemma}"), { form, lemma });
  return form;
}

/**
 * The three parts, in the order the search writes them. The bracket is matched
 * to the last ") of ", because the osastav's own reading holds a bracket and
 * the word "of": "osastav (what? (some of it)) of tuba".
 */
function parse(text: string): { form: string; english: string | null; lemma: string | null } | null {
  const full = /^(.+?) \((.+)\) of (\S.*)$/.exec(text);
  if (full) return { form: full[1]!, english: full[2]!, lemma: full[3]! };
  const bare = /^(.+?) \((.+)\)$/.exec(text);
  if (bare) return { form: bare[1]!, english: bare[2]!, lemma: null };
  const named = /^(.+?) of (\S.*)$/.exec(text);
  if (named) return { form: named[1]!, english: null, lemma: named[2]! };
  return null;
}

/** The English half: a case's question, perhaps plural or the short one, or a verb category. */
function readingIn(locale: Locale, english: string): string {
  for (const [suffix, template] of [[", plural", "{reading}, plural"], [", the short one", "{reading}, the short one"]] as const) {
    if (english.endsWith(suffix)) {
      return fill(tr(locale, template), { reading: readingIn(locale, english.slice(0, -suffix.length)) });
    }
  }
  return translated(locale, english) ? tr(locale, english) : localiseReadings(locale, english);
}
