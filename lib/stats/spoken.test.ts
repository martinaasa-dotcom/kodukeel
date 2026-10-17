import { describe, expect, it } from "vitest";
import { spokenThisWeek } from "./spoken";

const now = new Date("2026-10-16T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("said aloud this week", () => {
  it("counts only spoken answers inside the week, with their time", () => {
    const week = spokenThisWeek([
      { reviewedAt: ago(1), durationMs: 90_000, spoken: true },
      { reviewedAt: ago(2), durationMs: 60_000, spoken: true },
      { reviewedAt: ago(2), durationMs: 600_000, spoken: false },
      { reviewedAt: ago(9), durationMs: 60_000, spoken: true },
    ], now);
    expect(week).toEqual({ answers: 2, minutes: 3 });
  });

  it("says nothing was said, rather than rounding a few seconds up to nought", () => {
    expect(spokenThisWeek([], now)).toEqual({ answers: 0, minutes: 0 });
    expect(spokenThisWeek([{ reviewedAt: ago(0), durationMs: 4_000, spoken: true }], now)).toEqual({ answers: 1, minutes: 1 });
  });
});
