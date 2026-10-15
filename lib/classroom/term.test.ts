import { describe, expect, it } from "vitest";

import { dayClock } from "@/lib/time/day";
import { classWideCases, MIN_CASE_CONTRIBUTORS } from "./cohort";
import {
  caseWindowWeeks, classCasesFrom, foldPeriods, MIN_TERM_CASE_ANSWERS, termFigures, termRange,
  TERM_DEFAULT_WEEKS, TERM_MAX_WEEKS, type CaseCount,
} from "./term";

const clock = dayClock("Europe/Tallinn");
const NOW = new Date("2026-10-15T09:00:00Z");

describe("the range a term report covers", () => {
  it("defaults to twelve whole weeks ending today, in the teacher's own days", () => {
    const r = termRange(undefined, undefined, clock, NOW);
    expect(r.weeks).toBe(TERM_DEFAULT_WEEKS);
    expect(clock.dayKey(clock.shiftDay(r.until, 1))).toBe("2026-10-15");
    expect(r.edges).toHaveLength(TERM_DEFAULT_WEEKS + 1);
    expect(r.edges[0]).toEqual(r.from);
    expect(r.edges.at(-1)).toEqual(r.until);
    expect(clock.dayKey(r.from)).toBe("2026-07-24");
  });

  it("caps a typed range at one page, refuses a future end, and reads nonsense as the default", () => {
    expect(termRange("2020-01-01", "2026-10-01", clock, NOW).weeks).toBe(TERM_MAX_WEEKS);
    const future = termRange(undefined, "2027-01-01", clock, NOW);
    expect(clock.dayKey(clock.shiftDay(future.until, 1))).toBe("2026-10-15");
    expect(termRange("yesterday", ["x"], clock, NOW).weeks).toBe(TERM_DEFAULT_WEEKS);
    expect(termRange("2026-02-30", undefined, clock, NOW).weeks).toBe(TERM_DEFAULT_WEEKS);
  });

  it("rounds a short range out to whole weeks, never fewer than two", () => {
    expect(termRange("2026-10-12", "2026-10-15", clock, NOW).weeks).toBe(2);
    expect(termRange("2026-09-01", "2026-10-15", clock, NOW).weeks).toBe(7);
  });

  it("starts a day at local midnight in a zone far from UTC", () => {
    const chatham = dayClock("Pacific/Chatham");
    const r = termRange("2026-09-01", "2026-09-28", chatham, NOW);
    expect(chatham.dayKey(r.until)).toBe("2026-09-29");
    expect(chatham.startOfDay(r.until)).toEqual(r.until);
  });

  it("reads the cases over four weeks at each end, or half a short range", () => {
    expect(caseWindowWeeks(12)).toBe(4);
    expect(caseWindowWeeks(5)).toBe(2);
    expect(caseWindowWeeks(2)).toBe(1);
  });
});

describe("the figures on the page", () => {
  it("folds weeks into fortnights past thirteen, keeping the larger head count", () => {
    const weekly = Array.from({ length: 15 }, (_, i) => ({ start: `w${i}`, active: i % 3, reviews: 10 }));
    expect(foldPeriods(weekly.slice(0, 13))).toHaveLength(13);
    const folded = foldPeriods(weekly);
    expect(folded).toHaveLength(8);
    expect(folded[0]).toEqual({ start: "w0", active: 1, reviews: 20 });
    expect(folded.at(-1)).toEqual(weekly[14]);
    expect(folded.reduce((s, p) => s + p.reviews, 0)).toBe(150);
  });

  it("reads the class's cases exactly as the weekly letter does", () => {
    const counts: CaseCount[] = [
      { ownerId: "a", targetCase: "PARTITIVE", slot: null, ok: true, count: 6 },
      { ownerId: "a", targetCase: "PARTITIVE", slot: null, ok: false, count: 4 },
      { ownerId: "b", targetCase: "PARTITIVE", slot: null, ok: false, count: 5 },
      { ownerId: "c", targetCase: null, slot: "PARTITIVE", ok: true, count: 3 },
      { ownerId: "a", targetCase: "INESSIVE", slot: null, ok: false, count: 20 },
      { ownerId: "b", targetCase: "INESSIVE", slot: null, ok: true, count: 20 },
    ];
    const rows = counts.flatMap((c) => Array.from({ length: c.count }, () => ({
      ownerId: c.ownerId, targetCase: c.slot ?? c.targetCase, rating: c.ok ? 3 : 1,
    })));
    expect(classCasesFrom(counts)).toEqual(classWideCases(rows, null, MIN_CASE_CONTRIBUTORS).filter((c) => c.total >= MIN_TERM_CASE_ANSWERS));
    // Three students answered the partitive; two answered the inessive, so it is nobody's to print.
    expect(classCasesFrom(counts).map((c) => c.grammCase)).toEqual(["PARTITIVE"]);
  });

  it("prints a case at both ends where it cleared, and says nothing where it did not", () => {
    const people = (grammCase: string, ok: number, wrong: number): CaseCount[] => ["a", "b", "c"].flatMap((ownerId) => [
      { ownerId, targetCase: grammCase, slot: null, ok: true, count: ok },
      { ownerId, targetCase: grammCase, slot: null, ok: false, count: wrong },
    ]);
    const figures = termFigures({
      weekly: [{ start: "x", active: 3, reviews: 40 }, { start: "y", active: 2, reviews: 10 }],
      everActive: 3,
      startCases: [...people("PARTITIVE", 2, 2), ...people("ELATIVE", 1, 3)],
      endCases: [...people("PARTITIVE", 3, 1)],
    });
    expect(figures.totalReviews).toBe(50);
    expect(figures.peakActive).toBe(3);
    const partitive = figures.cases.find((c) => c.grammCase === "PARTITIVE")!;
    expect(partitive).toEqual({ grammCase: "PARTITIVE", start: 50, end: 75, change: 25 });
    const elative = figures.cases.find((c) => c.grammCase === "ELATIVE")!;
    expect(elative).toEqual({ grammCase: "ELATIVE", start: 25, end: null, change: null });
    expect(JSON.stringify(figures)).not.toMatch(/"ownerId"|"a"|"b"|"c"/);
  });
});
