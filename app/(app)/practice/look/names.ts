/**
 * WHAT EVERY ROUND ON PRACTICE AND GAMES IS CALLED, AS AGREED.
 *
 * MOCKUP, and the source the real build will read. One rule at every level:
 * the Estonian name leads and its English follows in parentheses, on a
 * quieter second line on a tile and on the same line in running text. The
 * sidebar stays in English.
 *
 * Every Estonian name is a dictionary word or phrase, chosen by the operator
 * on 2026-10-18. `Sagedasemad sõnad` is in use while a native speaker
 * confirms it (`Levinud sõnad` is the alternative).
 */
interface RoundName {
  readonly et: string;
  readonly en: string;
}

export const ROUND_NAMES: Readonly<Record<string, RoundName>> = {
  // Games
  "/sonad": { et: "Sõnad", en: "Words" },
  "/crossword": { et: "Ristsõna", en: "Crossword" },
  "/review/letters": { et: "Tähed", en: "Letters" },
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
  "/review/common": { et: "Sagedasemad sõnad", en: "Most common words" },
  "/review/listening": { et: "Kuulamine", en: "Listening" },
  "/review/dictation": { et: "Etteütlus", en: "Dictation" },
  "/review/speaking": { et: "Hääldus", en: "Pronunciation" },
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

export function roundName(href: string): RoundName {
  const name = ROUND_NAMES[href];
  if (!name) throw new Error(`No agreed name for ${href}`);
  return name;
}
