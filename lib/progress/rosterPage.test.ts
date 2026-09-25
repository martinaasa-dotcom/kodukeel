/*
  A CAP ON A SORTED LIST IS AN EXCLUSION, NOT A CAP.

  The first version of the roster ordered on the owner id and took the first
  two thousand, every run, for ever. On a deployment with five thousand
  learners that is three thousand people who never get a letter, not because
  they are quiet or opted out but because of where their id sorts, and nothing
  anywhere would have said so: the feature would have worked, for some people,
  and the rest would have read as nobody wanting it.

  `rosterPage` is out here and pure so the walk can be driven over a day of
  runs rather than reasoned about.
*/
import { describe, expect, it } from "vitest";

import { rosterPage } from "./mailout";

const LIMIT = 2_000;
const hour = (n: number) => new Date(n * 3_600_000);

describe("the roster walk", () => {
  it("stays at the start where everybody fits in one page", () => {
    for (const total of [0, 1, LIMIT - 1, LIMIT]) {
      expect(rosterPage(hour(7), total, LIMIT)).toBe(0);
      expect(rosterPage(hour(93), total, LIMIT)).toBe(0);
    }
  });

  it("covers everybody when the run fires once a day, as it does", () => {
    /*
      Stepping by the hour, a daily run moves 24 hours a time, so wherever the
      page count divides 24 the same page came up every day. Every page count
      from two to thirty has to be covered in that many daily runs.
    */
    for (let pages = 2; pages <= 30; pages += 1) {
      const total = pages * LIMIT;
      const seen = new Set<number>();
      for (let d = 0; d < pages; d += 1) seen.add(rosterPage(hour(16 + 24 * d), total, LIMIT));
      expect(seen.size, `${pages} pages, daily runs left gaps`).toBe(pages);
    }
  });

  it("covers everybody on a deployment larger than one page", () => {
    /*
      Five thousand learners is three pages, so three consecutive runs have to
      touch every offset, here at an hourly cadence.
    */
    const total = 5_000;
    const seen = new Set<number>();
    for (let h = 0; h < 3; h += 1) seen.add(rosterPage(hour(h), total, LIMIT, 1));
    expect(seen).toEqual(new Set([0, LIMIT, 2 * LIMIT]));
  });

  it("covers everybody at an hourly cadence at the sizes this app models", () => {
    // The funding page models a hundred thousand learners. Hourly runs have to
    // reach all of them in as many runs as there are pages.
    for (const total of [5_000, 48_000, 100_000]) {
      const pages = Math.ceil(total / LIMIT);
      const seen = new Set<number>();
      for (let h = 0; h < pages; h += 1) seen.add(rosterPage(hour(h), total, LIMIT, 1));
      expect(seen.size, `${total} learners left gaps in the walk`).toBe(pages);
    }
  });

  it("never reaches past the end of the roster", () => {
    // An offset past the last row returns nothing, which is a run that
    // considers nobody rather than an error, and is still a wasted hour.
    for (const total of [3_000, 5_001, 99_999]) {
      for (let h = 0; h < 50; h += 1) {
        expect(rosterPage(hour(h), total, LIMIT)).toBeLessThan(total);
      }
    }
  });

  it("gives two runs inside one period the same page", () => {
    /*
      Deterministic on purpose, so it needs no stored cursor. Two invocations
      inside one hour look at the same learners, which is what the unique key
      on `EmailSend` is there to make harmless rather than something this
      function has to prevent.
    */
    expect(rosterPage(new Date("2026-09-18T09:00:00Z"), 5_000, LIMIT)).toBe(
      rosterPage(new Date("2026-09-18T09:59:59Z"), 5_000, LIMIT),
    );
  });
});
