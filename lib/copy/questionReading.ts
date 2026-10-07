import { questionInEnglish } from "@/lib/estonian/cases";
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
