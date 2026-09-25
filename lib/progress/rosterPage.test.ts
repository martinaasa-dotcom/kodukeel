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

  it("covers everybody on a deployment larger than one page", () => {
    /*
      The claim that matters. Five thousand learners is three pages, so three
      consecutive runs have to touch every offset; under the old code every run
      returned the same one.
    */
    const total = 5_000;
    const seen = new Set<number>();
    for (let h = 0; h < 3; h += 1) seen.add(rosterPage(hour(h), total, LIMIT));
    expect(seen).toEqual(new Set([0, LIMIT, 2 * LIMIT]));
  });

  it("covers everybody inside a day of hourly runs, up to twenty-four pages", () => {
    /*
      This used to assert a hundred thousand learners, fifty pages, inside fifty
      consecutive hours. A walk that moves a page every hour moves twenty-four
      pages a day, which is exactly what left a daily run on the same page for
      ever, and no function of the clock can promise both: the daily run is the
      schedule this deployment has, so it is the one kept whole. Beyond
      twenty-four pages an hourly run still reaches everybody, over days rather
      than hours, which the test below asserts.
    */
    for (const total of [5_000, 24_000, 48_000]) {
      const pages = Math.ceil(total / LIMIT);
      const seen = new Set<number>();
      for (let h = 0; h < pages; h += 1) seen.add(rosterPage(hour(h), total, LIMIT));
      expect(seen.size, `${total} learners left gaps in the walk`).toBe(pages);
    }
  });

  it("covers everybody on the schedule the deployment actually has", () => {
    /*
      THE TESTS ABOVE DRIVE CONSECUTIVE HOURS, AND THE DEPLOYMENT RUNS ONCE A
      DAY. `vercel.json` fires the run at 16:00 UTC, because a Hobby plan
      refuses anything more often (README, "Hourly is what this wants"). Keyed
      on the hour since the epoch, a daily run advances the key by exactly 24,
      so any page count sharing a factor with 24 lands on the same page every
      day: five thousand learners is three pages, (24d + 16) mod 3 is 1 on
      every day there is, and four thousand people were never considered.
      This drives the real cadence, and an hourly one beside it, because the
      README's way back to hourly is a scheduler outside this repository.
    */
    const day = (d: number, h: number) => new Date((d * 24 + h) * 3_600_000);
    for (const total of [3_000, 5_000, 7_000, 9_000, 13_000, 25_000, 48_000, 100_000]) {
      const pages = Math.ceil(total / LIMIT);
      const daily = new Set<number>();
      for (let d = 0; d < pages; d += 1) daily.add(rosterPage(day(d, 16), total, LIMIT));
      expect(daily.size, `${total} learners on a daily run at 16:00 left gaps`).toBe(pages);

      // Hourly, a day reaches twenty-four pages, which is everybody up to
      // forty-eight thousand learners, and beyond that nobody is excluded:
      // every page comes round within as many days as there are pages.
      const inADay = new Set<number>();
      for (let h = 0; h < 24; h += 1) inADay.add(rosterPage(day(0, h), total, LIMIT));
      expect(inADay.size, `${total} learners on one day of hourly runs`).toBe(Math.min(pages, 24));

      const eventually = new Set<number>();
      for (let h = 0; h < pages * 24; h += 1) eventually.add(rosterPage(day(0, h), total, LIMIT));
      expect(eventually.size, `${total} learners on hourly runs left somebody out for good`).toBe(pages);
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

  it("gives two runs in the same hour the same page", () => {
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
