import { QUESTION_WORDS, questionInEnglish } from "@/lib/estonian/cases";
import { tr, type Locale } from "./locale";

/**
 * What an Estonian case question asks, in the learner's own language.
 *
 * `questionInEnglish` joins the reading of every question word into one
 * string, and the translation tables hold the readings one word at a time, so
 * a screen that translated the joined string found nothing and printed the
 * English. This reads word by word, translates each, and joins them, which in
 * English is exactly `questionInEnglish`.
 */
export function questionIn(locale: Locale, question: string | null | undefined): string | null {
  if (!question) return null;
  const readings = question.trim().split(/\s+/)
    .map((word) => questionInEnglish(word))
    .filter((x): x is string => Boolean(x));
  return readings.length > 0 ? readings.map((line) => tr(locale, line)).join(" ") : null;
}

/** Every English reading of a question word, longest first, so a reading inside another is not replaced first. */
const READINGS: readonly string[] = [...new Set(QUESTION_WORDS.map((q) => questionInEnglish(q)).filter((x): x is string => Boolean(x)))]
  .sort((a, b) => b.length - a.length);

/**
 * A line that already carries the English readings, put into the learner's
 * language. A government card's answer is written once, in English, by the
 * card builder and stored on the card (`keda/mida (whom? what?)`), so the
 * screen that draws it cannot ask the table word by word; it finds each
 * reading it knows and translates that, and leaves the Estonian beside it
 * exactly as it is.
 */
export function localiseReadings(locale: Locale, text: string): string {
  if (locale === "en" || !text) return text;
  let out = text;
  const swaps: string[] = [];
  for (const reading of READINGS) {
    if (!out.includes(reading)) continue;
    // A placeholder per reading, so a translation is never read again as English.
    out = out.split(reading).join(`\u0000${swaps.length}\u0000`);
    swaps.push(tr(locale, reading));
  }
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => swaps[Number(i)] ?? "");
}
