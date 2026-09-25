import { describe, expect, it } from "vitest";
import { NOT_A_CERTIFICATE, WHAT_PROVES_A_LEVEL, studyTotals } from "./record";

const at = (iso: string, durationMs = 5_000) => ({ reviewedAt: new Date(iso), durationMs });
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

describe("studyTotals", () => {
  it("says nothing was done when nothing was", () => {
    expect(studyTotals([], utcDay)).toEqual({ hours: 0, activeDays: 0, answers: 0, firstDay: null, lastDay: null });
  });

  it("counts days on the calendar it is handed, not on the rows' order", () => {
    const reviews = [
      at("2026-03-03T19:00:00Z"),
      at("2026-03-01T19:00:00Z"),
      at("2026-03-01T19:01:00Z"),
      at("2026-03-02T19:00:00Z"),
    ];
    const totals = studyTotals(reviews, utcDay);
    expect(totals.activeDays).toBe(3);
    expect(totals.answers).toBe(4);
    expect(totals.firstDay).toBe("2026-03-01");
    expect(totals.lastDay).toBe("2026-03-03");
  });

  it("reads a day in the learner's zone when that is the key it is given", () => {
    // 22:30 UTC is already the next day in Tallinn.
    const reviews = [at("2026-03-01T22:30:00Z"), at("2026-03-02T06:00:00Z")];
    const tallinn = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
    expect(studyTotals(reviews, utcDay).activeDays).toBe(2);
    expect(studyTotals(reviews, tallinn).activeDays).toBe(1);
  });

  it("measures hours in sittings rather than from first answer to last", () => {
    const reviews = [
      at("2026-03-01T19:00:00Z"),
      at("2026-03-01T19:10:00Z"),
      at("2026-03-10T19:00:00Z"),
    ];
    const hours = studyTotals(reviews, utcDay).hours;
    expect(hours).toBeGreaterThan(0.15);
    expect(hours).toBeLessThan(1);
  });
});

describe("what the record says about itself", () => {
  it("claims to be a record and denies being a certificate", () => {
    expect(NOT_A_CERTIFICATE).toMatch(/record of study/);
    expect(NOT_A_CERTIFICATE).toMatch(/not a certificate/);
    expect(WHAT_PROVES_A_LEVEL).toMatch(/state examination/);
  });
});
