import {
  EXCEPTION_KINDS, KIND_NOTES, type ExceptionFamily, type ExceptionKind,
} from "@/lib/estonian/exceptions";

/**
 * THE EXCEPTIONS DRILL, SPLIT INTO THE FOUR AREAS A LEARNER MEETS THEM IN.
 *
 * The drill used to draw across every kind at once, which is a fair sample of
 * the area and a poor way to learn any of it: a short illative, then a verb
 * form, then a plural, with nothing to hold one answer to the next. The report
 * was that it felt random and had no logical flow. `KIND_NOTES` already files
 * every kind under one of four families, so the families are the sections, and
 * a round is one family at a time, easiest words first.
 *
 * Pure: no React, no Prisma. Which reviews to count is the page's.
 */

/** In the order a learner meets them: the word, then its singular, plural, verb. */
export const FAMILY_ORDER: readonly ExceptionFamily[] = ["STEM", "SINGULAR", "PLURAL", "VERB"];

export function parseFamily(raw: string | null | undefined): ExceptionFamily | null {
  const upper = (raw ?? "").toUpperCase();
  return (FAMILY_ORDER as readonly string[]).includes(upper) ? (upper as ExceptionFamily) : null;
}

/** The kinds filed under one family, in the order `KIND_NOTES` lists them. */
export function kindsOf(family: ExceptionFamily): readonly ExceptionKind[] {
  return EXCEPTION_KINDS.filter((kind) => KIND_NOTES[kind].family === family);
}

/** Right this often, over at least `KNOWN_MIN` answers, and a family reads as known. */
export const KNOWN_ACCURACY = 0.8;
export const KNOWN_MIN = 8;

export type Standing =
  | { readonly state: "new" }
  | { readonly state: "learning"; readonly pct: number; readonly total: number }
  | { readonly state: "known"; readonly pct: number; readonly total: number };

/**
 * Where somebody stands in one family, off their own answers.
 *
 * Under `KNOWN_MIN` answers it says "new" or "learning" and never "known":
 * two right answers are not a pattern, and a badge on thin evidence is the
 * false confidence the readiness screen is built against.
 */
export function standingOf(right: number, total: number): Standing {
  if (total === 0) return { state: "new" };
  const pct = Math.round((right / total) * 100);
  if (total >= KNOWN_MIN && right / total >= KNOWN_ACCURACY) return { state: "known", pct, total };
  return { state: "learning", pct, total };
}
