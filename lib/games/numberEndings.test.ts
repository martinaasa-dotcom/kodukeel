import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isExactForm } from "@/lib/dict/forms";
import { rng } from "@/lib/random/seeded";
import {
  MONTHS, ROUND_SHAPE, SAME_POOL, YEAR_POOL, dealEndings, digitsFor, englishFor, everyFrame, hearCard,
  SILENT_JOBS, markHeard, sameNumberCard, sentenceFor, yearCard, type HearCard,
} from "./numberEndings";

const WORD = /[\p{L}]+/gu;

describe("the number endings frames", () => {
  it("are made of words the forms list holds, every one of them (ADR-005 amendment 8)", async () => {
    let words = 0;
    for (const frame of everyFrame()) {
      for (const part of [frame.before, frame.after]) {
        for (const word of part.match(WORD) ?? []) {
          words += 1;
          expect(await isExactForm(word.toLocaleLowerCase("et")), `"${word}" in "${frame.before} … ${frame.after}"`).toBe(true);
        }
      }
    }
    expect(words).toBeGreaterThan(40);
  });

  it("keep Estonian letters out of the English", () => {
    for (const frame of everyFrame()) expect(frame.en, frame.job).not.toMatch(/[õäöüšž]/i);
    for (const m of MONTHS) expect(m.en).not.toMatch(/[õäöüšž]/i);
  });

  it("read as a course says them", () => {
    const r = rng(1);
    const year = yearCard(1992, "year-in", r);
    expect(year.parts.map((p) => p.answer).join(" ")).toBe("tuhande üheksasaja üheksakümne teisel");
    expect(year.others.map((o) => o.et)).toContain("Aasta oli tuhat üheksasada üheksakümmend kaks.");
    expect(yearCard(2000, "year-in", r).parts).toHaveLength(1);
    expect(sentenceFor(everyFrame().find((f) => f.job === "floor")!, 17)).toBe("Ma elan seitsmeteistkümnendal korrusel.");
    expect(sentenceFor(everyFrame().find((f) => f.job === "with")!, 3)).toBe("Ma tulin kolme sõbraga.");
    expect(sentenceFor(everyFrame().find((f) => f.job === "age")!, 17)).toBe("Ma olen seitseteist.");
    expect(sentenceFor(everyFrame().find((f) => f.job === "until-hour")!, 5)).toBe("Pood on lahti kella viieni.");
    expect(digitsFor(everyFrame().find((f) => f.job === "floor")!, 17)).toBe("17.");
    expect(digitsFor(everyFrame().find((f) => f.job === "age")!, 17)).toBe("17");
    expect(englishFor(everyFrame().find((f) => f.job === "floor")!, 17)).toBe("I live on floor 17.");
    expect(englishFor(everyFrame().find((f) => f.job === "decade")!, 90)).toBe("My grandmother was born in the 90s.");
  });
});

describe("a same-number card", () => {
  it("offers tiles that differ, one for each form its sentences need", () => {
    let cards = 0;
    for (const n of SAME_POOL) {
      const card = sameNumberCard(n, rng(n));
      cards += 1;
      expect(new Set(card.tiles).size).toBe(card.tiles.length);
      expect(card.tiles.length).toBeGreaterThanOrEqual(3);
      for (const row of card.rows) expect(card.tiles).toContain(row.answer);
      // The date is a real date: no 31st of April.
      const date = card.rows.find((r) => r.job === "date")!;
      const month = MONTHS.find((m) => date.after.startsWith(m.ade))!;
      expect(month.days).toBeGreaterThanOrEqual(n);
    }
    expect(cards).toBe(SAME_POOL.length);
  });
});

describe("a year card", () => {
  it("lays out a part per group, each a plain word against the needed one", () => {
    let checked = 0;
    for (const n of YEAR_POOL) {
      for (const job of ["year-in", "year-since", "year-until", "year-by"] as const) {
        const card = yearCard(n, job, rng(n));
        checked += 1;
        for (const part of card.parts) expect(part.options).toContain(part.answer);
        expect(card.others).toHaveLength(4);
      }
    }
    expect(checked).toBe(YEAR_POOL.length * 4);
  });
});

describe("a round", () => {
  it("deals the three steps in order, and never one number twice", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const round = dealEndings(rng(seed));
      expect(round.map((c) => c.kind)).toEqual([
        ...Array(ROUND_SHAPE.same).fill("same"), ...Array(ROUND_SHAPE.year).fill("year"), ...Array(ROUND_SHAPE.hear).fill("hear"),
      ]);
      const numbers = round.map((c) => c.n);
      expect(new Set(numbers).size).toBe(numbers.length);
      const jobs = round.filter((c): c is HearCard => c.kind === "hear").map((c) => c.job);
      expect(new Set(jobs).size).toBe(jobs.length);
    }
  });

  it("is not always the same numbers, and reaches the tricky ones", () => {
    const seen = new Set<number>();
    const years = new Set<number>();
    for (let seed = 1; seed <= 300; seed += 1) {
      for (const card of dealEndings(rng(seed))) {
        seen.add(card.n);
        if (card.kind === "year") years.add(card.n);
      }
    }
    expect(seen.size).toBeGreaterThan(300);
    for (const tricky of [2, 3, 11, 12, 21, 22, 23, 31]) expect(seen, `${tricky} never dealt`).toContain(tricky);
    expect([...years].some((y) => y >= 2000)).toBe(true);
    expect([...years].some((y) => y < 1900)).toBe(true);
    expect(years).toContain(2000);
  });
});

describe("marking a heard number", () => {
  const floor = hearCard("floor", 17, rng(1));
  const count = hearCard("count", 17, rng(1));
  const hour = hearCard("until-hour", 5, rng(1));
  const decade = hearCard("decade", 90, rng(1));

  it("takes the number, and names the dot where it is wrong", () => {
    expect(markHeard(floor, "17.")).toEqual({ right: true, dotWrong: false, read: "17." });
    expect(markHeard(floor, "17")).toEqual({ right: true, dotWrong: true, read: "17" });
    expect(markHeard(floor, "18.").right).toBe(false);
    expect(markHeard(count, "17")).toEqual({ right: true, dotWrong: false, read: "17" });
    expect(markHeard(count, "17.").dotWrong).toBe(true);
    expect(markHeard(count, "").read).toBeNull();
  });

  it("takes either half of the day for an hour, and a decade with or without its century", () => {
    expect(markHeard(hour, "5").right).toBe(true);
    expect(markHeard(hour, "17").right).toBe(true);
    expect(markHeard(hour, "6").right).toBe(false);
    expect(markHeard(decade, "90").right).toBe(true);
    expect(markHeard(decade, "1990").right).toBe(true);
    expect(markHeard(decade, "90s").right).toBe(true);
    expect(markHeard(decade, "80").right).toBe(false);
  });
});

describe("what the speech service was heard saying (npm run measure:endings)", () => {
  // Joined rather than written out: the file does not exist until `npm run measure:endings` writes it.
  const FIXTURE = join("lib/games/fixtures", "number-endings-speech.json");
  it("reads aloud no job whose sentences came back wrong on every voice", () => {
    if (!existsSync(FIXTURE)) {
      // Not measured yet: the service was down the day this mode shipped. Nothing is silenced until it is.
      expect(SILENT_JOBS.size).toBe(0);
      return;
    }
    const rows = (JSON.parse(readFileSync(FIXTURE, "utf8")) as { rows: { job: string; clean: boolean }[] }).rows;
    expect(rows.length).toBeGreaterThan(50);
    const bad = rows.filter((r) => !r.clean);
    // Not every sentence failing, which would be the service down rather than the sentences wrong.
    expect(bad.length).toBeLessThan(rows.length);
    const failing = new Set(bad.map((r) => r.job));
    for (const job of failing) expect(SILENT_JOBS.has(job as never), `${job} came back wrong and is still read aloud`).toBe(true);
    for (const job of SILENT_JOBS) expect(failing.has(job), `${job} is silenced and every sentence of it came back intact`).toBe(true);
  });
});
