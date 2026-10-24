import { fill, tr, translated, type Locale } from "./locale";
import { localiseReadings } from "./questionReading";
import { formLabel, morphCodeFor, VERB_SLOTS } from "@/lib/estonian/morph";
import { CASES } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";

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
  /* A name the search writes today is looked up whole in `formLabel`'s own
     table for the reader's language, which already says every name a class
     uses with its hint translated, "nimetav (1-я форма)". The reading below
     is for the older shape a scan stored before the names had hints. */
  const cut = matchedAs.lastIndexOf(" of ");
  const label = cut > 0 ? matchedAs.slice(0, cut) : matchedAs;
  const named = labelsIn(locale).get(label);
  if (named) return cut > 0 ? fill(tr(locale, "{form} of {lemma}"), { form: named, lemma: matchedAs.slice(cut + 4) }) : named;
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

/** Every form name the search can write, keyed on its English label. */
const LABELS = new Map<Locale, ReadonlyMap<string, string>>();
const NAMED_FORM_TYPES = ["GEN_SG", "PART_SG", "ILL_SG_SHORT", "NOM_PL", "PART_PL", "GEN_PL", "INF_MA", "INF_DA", "PRES_1SG", "PAST_1SG", "PART_TUD"] as const;

function labelsIn(locale: Locale): ReadonlyMap<string, string> {
  const held = LABELS.get(locale);
  if (held) return held;
  const forms: { morphCode?: string; formType?: string }[] = [];
  for (const c of CASES) {
    for (const plural of [false, true]) {
      const code = morphCodeFor(c.key as CaseKey, plural);
      if (code) forms.push({ morphCode: code });
    }
  }
  for (const code of Object.keys(VERB_SLOTS)) forms.push({ morphCode: code });
  for (const formType of NAMED_FORM_TYPES) forms.push({ formType });
  const say = (english: string) => tr(locale, english);
  const map = new Map<string, string>();
  for (const form of forms) {
    const english = formLabel(form);
    const shown = formLabel(form, say, locale);
    if (english.includes("(") && !map.has(english)) map.set(english, shown);
  }
  LABELS.set(locale, map);
  return map;
}
