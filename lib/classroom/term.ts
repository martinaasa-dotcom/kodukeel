import { caseAccuracy } from "@/lib/stats/history";
import { caseAsked } from "@/lib/srs/slots";
import { MIN_CASE_CONTRIBUTORS } from "./cohort";

/**
 * WHAT ONE PRINTED PAGE SAYS ABOUT A CLASS OVER A TERM.
 *
 * The figures behind `/class/<id>/report`: how many practised each week, how
 * many answers that came to, and the cases the class as a whole was weakest
 * at, at the start of the range and at the end. No learner's name and no
 * learner's row (docs/38-third-batch.md, D4): a printed page travels further
 * than a screen, which is the argument the weekly letter already makes, so
 * the rule for a case is the letter's rule. A case is printed only where at
 * least `MIN_CASE_CONTRIBUTORS` students answered it and the class gave at
 * least `MIN_TERM_CASE_ANSWERS` answers, so no figure rests on one person.
 *
 * Pure: `lib/progress/term.ts` runs the queries and hands the counts in, as
 * grouped counts rather than rows, so a term of a large class is not a
 * hundred thousand objects in memory.
 */

/** Weeks a report covers when the teacher has not chosen. */
export const TERM_DEFAULT_WEEKS = 12;
/** The longest range one A4 page holds; past thirteen weeks the rows are fortnights. */
export const TERM_MAX_WEEKS = 26;
/** Answers a case needs across the class before it is printed as a weakness. */
export const MIN_TERM_CASE_ANSWERS = 10;
/** How many weakest cases the page names at each end. */
export const TERM_CASES = 5;

export interface TermPeriod {
  /** The first day of the period, as `YYYY-MM-DD` in the teacher's zone. */
  readonly start: string;
  /** How many members answered anything in it. */
  readonly active: number;
  /** How many answers they gave between them. */
  readonly reviews: number;
}

/** One group of answers: the same learner, the same case or slot, right or not, at one end of the range. */
export interface CaseCount {
  readonly ownerId: string;
  readonly targetCase: string | null;
  readonly slot: string | null;
  readonly ok: boolean;
  readonly count: number;
}

export interface TermCase {
  readonly grammCase: string;
  /** Accuracy at the start of the range, or null where it did not clear the floors there. */
  readonly start: number | null;
  /** Accuracy at the end, or null where it did not clear the floors there. */
  readonly end: number | null;
  /** End minus start, where both are printed. */
  readonly change: number | null;
}

export interface TermFigures {
  readonly periods: readonly TermPeriod[];
  readonly totalReviews: number;
  /** The most members active in any one period. */
  readonly peakActive: number;
  /** Members active in at least one period. */
  readonly everActive: number;
  /** The weakest cases at either end, with both figures where they cleared. */
  readonly cases: readonly TermCase[];
}

/**
 * The class's weakest cases from grouped counts, under the letter's rule: a
 * case is counted only where `MIN_CASE_CONTRIBUTORS` students answered it,
 * and printed only past `MIN_TERM_CASE_ANSWERS` answers. The same reading as
 * `classWideCases` (asserted in `term.test.ts`), taking counts rather than rows.
 */
export function classCasesFrom(counts: readonly CaseCount[]): { grammCase: string; accuracy: number; total: number }[] {
  const people = new Map<string, Set<string>>();
  const asked = counts.map((c) => ({ ...c, grammCase: caseAsked(c) }));
  for (const c of asked) {
    if (!c.grammCase) continue;
    const set = people.get(c.grammCase) ?? new Set<string>();
    set.add(c.ownerId);
    people.set(c.grammCase, set);
  }
  // caseAccuracy reads rating >= 3 as right; a count of rows stands in for the rows themselves.
  const rows: { targetCase: string | null; rating: number }[] = [];
  for (const c of asked) {
    if (!c.grammCase || (people.get(c.grammCase)?.size ?? 0) < MIN_CASE_CONTRIBUTORS) continue;
    for (let i = 0; i < c.count; i++) rows.push({ targetCase: c.grammCase, rating: c.ok ? 3 : 1 });
  }
  return caseAccuracy(rows, MIN_TERM_CASE_ANSWERS);
}

/**
 * Week periods collapse into fortnights past thirteen, so the table stays on
 * one sheet. `weekly` is one entry per week, in order, with each week's
 * distinct learners already counted; a fortnight's `active` is the larger of
 * its two weeks, since the same person in both weeks is one person.
 */
export function foldPeriods(weekly: readonly TermPeriod[]): TermPeriod[] {
  if (weekly.length <= 13) return [...weekly];
  const folded: TermPeriod[] = [];
  for (let i = 0; i < weekly.length; i += 2) {
    const a = weekly[i]!;
    const b = weekly[i + 1];
    folded.push(b ? { start: a.start, active: Math.max(a.active, b.active), reviews: a.reviews + b.reviews } : a);
  }
  return folded;
}

export function termFigures(input: {
  weekly: readonly TermPeriod[];
  everActive: number;
  startCases: readonly CaseCount[];
  endCases: readonly CaseCount[];
}): TermFigures {
  const periods = foldPeriods(input.weekly);
  const start = classCasesFrom(input.startCases);
  const end = classCasesFrom(input.endCases);
  const startBy = new Map(start.map((c) => [c.grammCase, c.accuracy]));
  const endBy = new Map(end.map((c) => [c.grammCase, c.accuracy]));
  const named = [...new Set([...end.slice(0, TERM_CASES), ...start.slice(0, TERM_CASES)].map((c) => c.grammCase))];
  const cases = named.map((grammCase): TermCase => {
    const s = startBy.get(grammCase) ?? null;
    const e = endBy.get(grammCase) ?? null;
    return { grammCase, start: s, end: e, change: s !== null && e !== null ? e - s : null };
  });
  return {
    periods,
    totalReviews: input.weekly.reduce((sum, w) => sum + w.reviews, 0),
    peakActive: Math.max(0, ...periods.map((p) => p.active)),
    everActive: input.everActive,
    cases,
  };
}

/** How many weeks at each end the start and end cases are read over: four, or half a short range. */
export function caseWindowWeeks(weeks: number): number {
  return Math.max(1, Math.min(4, Math.floor(weeks / 2)));
}

export interface TermRange {
  /** Local midnight at the start of the first week. */
  readonly from: Date;
  /** Local midnight after the last day, exclusive. */
  readonly until: Date;
  /** Local midnight at the start of each week, then `until`: the bucket edges. */
  readonly edges: readonly Date[];
  readonly weeks: number;
}

interface ClockLike {
  dayKey(date?: Date): string;
  startOfDay(date?: Date): Date;
  shiftDay(from: Date, n: number): Date;
  daysBetween(a: Date, b: Date): number;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The range a report covers, in the teacher's own days. `to` defaults to
 * today and may not be later; `from` defaults to `TERM_DEFAULT_WEEKS` before
 * it. A range is rounded out to whole weeks ending on `to` and capped at
 * `TERM_MAX_WEEKS`, so a typed date can never ask for more than one page.
 * Anything that is not a date reads as the default, since both arrive in the
 * address.
 */
export function termRange(fromKey: unknown, toKey: unknown, clock: ClockLike, now = new Date()): TermRange {
  const today = clock.startOfDay(now);
  const parse = (key: unknown): Date | null => {
    if (typeof key !== "string" || !DAY_KEY.test(key)) return null;
    const noon = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(noon.getTime())) return null;
    // Noon UTC is within a day of the key in every zone; step to the right side of midnight.
    let at = clock.startOfDay(noon);
    const landed = clock.dayKey(at);
    if (landed > key) at = clock.shiftDay(at, 1);
    else if (landed < key) at = clock.shiftDay(at, -1);
    return clock.dayKey(at) === key ? at : null;
  };
  const lastDay = (() => {
    const to = parse(toKey);
    return to && to.getTime() <= today.getTime() ? to : today;
  })();
  const until = clock.shiftDay(lastDay, -1);
  const asked = parse(fromKey);
  const span = asked && asked.getTime() < until.getTime() ? clock.daysBetween(asked, until) : TERM_DEFAULT_WEEKS * 7;
  const weeks = Math.min(TERM_MAX_WEEKS, Math.max(2, Math.ceil(span / 7)));
  const from = clock.shiftDay(until, weeks * 7);
  const edges = Array.from({ length: weeks + 1 }, (_, i) => clock.shiftDay(from, -7 * i));
  return { from, until, edges, weeks };
}
