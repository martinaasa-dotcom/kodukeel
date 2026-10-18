/**
 * WHAT EVERY ROUND ON PRACTICE AND GAMES IS CALLED.
 *
 * One rule at every level, the operator's: the Estonian name leads and its
 * English follows in parentheses, on a quieter second line on a tile and on
 * the same line in running text and in the command palette. A1 is not given
 * the English alone, because a name met every day is a word learned for free.
 * The rail stays in English, since it is how somebody finds their way round
 * before they have learned anything.
 *
 * Every Estonian name is a dictionary word or phrase, chosen by the operator
 * on 2026-10-18 and for the native Estonian speaker who develops this app to
 * read in the pull request (ADR-005 amendment 4's standing, for copy).
 * The frequency lists are `Levinud sõnad`, the operator's choice on
 * 2026-10-18 over `Sagedasemad sõnad`.
 *
 * Pure. `lib/ux/modes.ts` keeps what a round *is*; this keeps what it is
 * called on the two pages that offer every round side by side.
 */
export interface RoundName {
  readonly et: string;
  readonly en: string;
}

export const ROUND_NAMES: Readonly<Record<string, RoundName>> = {
  // Games
  "/sonad": { et: "Sõnad", en: "Words" },
  "/crossword": { et: "Ristsõna", en: "Crossword" },
  "/review/letters": { et: "Tähed", en: "Letters" },
  "/review/spelled": { et: "Tähthaaval", en: "Letter by letter" },
  "/review/match": { et: "Paarid", en: "Pairs" },
  "/review/sentences": { et: "Laused", en: "Sentences" },
  "/review/map": { et: "Kus? Kuhu? Kust?", en: "Where?" },
  "/review/twins": { et: "Kaksikud", en: "Twins" },
  "/review/sayings": { et: "Väljendid", en: "Expressions" },
  "/review/wordplay": { et: "Sõnamäng", en: "Wordplay" },
  "/review/twenty": { et: "20 küsimust", en: "20 Questions" },
  "/review/openers": { et: "Mis edasi?", en: "What next?" },
  // Practice
  "/review": { et: "Kordamine", en: "Review" },
  "/review/flashcards": { et: "Õppekaardid", en: "Flash cards" },
  "/review/workbook": { et: "Töövihik", en: "Workbook" },
  "/review/common": { et: "Levinud sõnad", en: "Most common words" },
  "/review/listening": { et: "Kuulamine", en: "Listening" },
  "/review/dictation": { et: "Etteütlus", en: "Dictation" },
  "/review/speaking": { et: "Hääldus", en: "Pronunciation" },
  "/review/numbers": { et: "Arvud", en: "Numbers" },
  "/quest": { et: "Päeva ülesanne", en: "Daily task" },
  "/review/describe": { et: "Pildi kirjeldamine", en: "Describing a picture" },
  "/situations": { et: "Olukorrad", en: "Situations" },
  "/review/write": { et: "Kirjutamine", en: "Writing" },
  "/review/clinic": { et: "Rasked sõnad", en: "Tricky words" },
  "/review/conjugation": { et: "Pööramine", en: "Conjugation" },
  "/review/government": { et: "Rektsioon", en: "Verb cases" },
  "/review/pairs": { et: "Välted", en: "Long or short" },
  "/review/exceptions": { et: "Erandid", en: "Exceptions" },
  "/review/cloze": { et: "Oma tekst", en: "Your own text" },
  "/review/lookups": { et: "Otsitud sõnad", en: "Words you looked up" },
};

/** The agreed name of a round. Throws on an href nobody named, which a test holds to every offered round. */
export function roundName(href: string): RoundName {
  const name = nameOf(href);
  if (!name) throw new Error(`No agreed name for ${href}`);
  return name;
}

/** The agreed name where there is one, for a caller that also lists rounds nobody named. */
export function nameOf(href: string): RoundName | undefined {
  return Object.hasOwn(ROUND_NAMES, href) ? ROUND_NAMES[href] : undefined;
}

/**
 * The name in running text: the Estonian, then the English in parentheses.
 * A screen in Russian or Ukrainian hands in its translator, so the half in
 * parentheses is in the reader's language rather than left in English.
 */
export function inlineName(name: RoundName, translate: (english: string) => string = (english) => english): string {
  return `${name.et} (${translate(name.en)})`;
}
