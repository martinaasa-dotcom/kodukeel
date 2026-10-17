import { describe, expect, it } from "vitest";
import { heardTurnsByLevel, MIN_TURNS_A_MONTH, spokenLengthByMonth, spokenTurnsOf, spokenThisWeek, wordsIn, type SpokenTurnRow } from "./spoken";

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
    expect(spokenThisWeek([], now)).toEqual({ answers: 0, minutes: null });
    expect(spokenThisWeek([{ reviewedAt: ago(0), durationMs: 4_000, spoken: true }], now)).toEqual({ answers: 1, minutes: 1 });
  });

  it("claims no minutes for answers nobody timed, which a conversation's grades are", () => {
    expect(spokenThisWeek([
      { reviewedAt: ago(1), durationMs: 0, spoken: true },
      { reviewedAt: ago(2), durationMs: 0, spoken: true },
    ], now)).toEqual({ answers: 2, minutes: null });
  });
});

describe("spoken turns read off a stored conversation (VB-14)", () => {
  const at = new Date("2026-09-10T18:00:00Z");
  it("reads each spoken turn's first record once, with its length, whether it was heard unseen and whether it met", () => {
    const transcript = JSON.stringify({
      persona: "x",
      turns: [
        { beatId: "greet", said: "Tere!", met: [true] },
        { beatId: "reason", said: "Mul on valu peas.", met: [true], spoken: true, wordsHeard: 4, wordsChanged: 0, unseen: true },
        { beatId: "next", said: "Mul on valu peas.", met: [false], repaired: [] },
        { beatId: "when", said: "Homme", met: [false], spoken: true, wordsHeard: 1, wordsChanged: 1 },
      ],
    });
    expect(spokenTurnsOf(transcript, at, "A2")).toEqual([
      { at, level: "A2", words: 4, unseen: true, met: true },
      { at, level: "A2", words: 1, unseen: false, met: false },
    ]);
  });

  it("reads nothing from a transcript that will not parse or holds no turns", () => {
    expect(spokenTurnsOf("{", at, "A2")).toEqual([]);
    expect(spokenTurnsOf("{}", at, "A2")).toEqual([]);
    expect(spokenTurnsOf(JSON.stringify({ turns: "x" }), at, "A2")).toEqual([]);
  });

  it("counts words as a person does", () => {
    expect(wordsIn("Mul on valu, peas!")).toBe(4);
    expect(wordsIn("Kell 14:30?")).toBe(3);
    expect(wordsIn("  ")).toBe(0);
  });
});

describe("how long a spoken answer runs, month by month", () => {
  const row = (iso: string, words: number): SpokenTurnRow => ({ at: new Date(iso), level: "A2", words, unseen: false, met: true });
  const monthOf = (d: Date) => d.toISOString().slice(0, 7);

  it("takes the median of each month with enough turns, oldest first", () => {
    const rows = [
      row("2026-08-02T10:00:00Z", 2), row("2026-08-05T10:00:00Z", 3), row("2026-08-09T10:00:00Z", 9),
      row("2026-09-01T10:00:00Z", 4), row("2026-09-02T10:00:00Z", 5), row("2026-09-03T10:00:00Z", 6), row("2026-09-04T10:00:00Z", 7),
    ];
    expect(spokenLengthByMonth(rows, monthOf)).toEqual([
      { month: "2026-08", median: 3, turns: 3 },
      { month: "2026-09", median: 6, turns: 4 },
    ]);
  });

  it("leaves out a thin month, and says nothing with one month left", () => {
    const thin = Array.from({ length: MIN_TURNS_A_MONTH - 1 }, () => row("2026-08-10T10:00:00Z", 2));
    const full = Array.from({ length: MIN_TURNS_A_MONTH }, () => row("2026-09-10T10:00:00Z", 5));
    expect(spokenLengthByMonth([...thin, ...full], monthOf)).toEqual([]);
  });

  it("files a turn under the learner's own month, not the server's", () => {
    // Half past midnight on the first in Tallinn is still the last day of the month in UTC.
    const tallinn = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn", year: "numeric", month: "2-digit" }).format(d).slice(0, 7);
    const rows = [
      ...Array.from({ length: 3 }, () => row("2026-08-31T21:30:00Z", 4)),
      ...Array.from({ length: 3 }, () => row("2026-08-20T10:00:00Z", 2)),
    ];
    expect(spokenLengthByMonth(rows, tallinn).map((m) => m.month)).toEqual(["2026-08", "2026-09"]);
  });
});

describe("turns answered by ear, by band", () => {
  it("counts only spoken turns to a line only heard that met their beat", () => {
    const at = new Date();
    const rows: SpokenTurnRow[] = [
      { at, level: "B1", words: 3, unseen: true, met: true },
      { at, level: "B1", words: 3, unseen: true, met: false },
      { at, level: "B1", words: 3, unseen: false, met: true },
      { at, level: "A2", words: 3, unseen: true, met: true },
    ];
    expect([...heardTurnsByLevel(rows)]).toEqual([["B1", 1], ["A2", 1]]);
  });
});
