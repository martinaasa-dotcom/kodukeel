import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EURO_LEMMA, NUMBERS_ROUND, SPOKEN, dealRound, dealable, dealableCount, everyItem, itemKey, lemmaFor,
  markNumber, numberLemmas, readAnswer, shapeOf, shown, spokenAs, unfolded, wordsFor, wordsGraded, wordsRecalled,
  type NumberItem, type NumberShape,
} from "./numbers";
import { CLOCK_LEMMA } from "@/lib/scenes/props";
import { SYLLABUS, unitById } from "@/lib/collections/syllabus";
import { numberGrades } from "@/lib/srs/numberGrades";

function seeded(seed: number): () => number {
  let n = seed >>> 0;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 0x1_0000_0000;
  };
}

const EVERY = everyItem();
const said = (item: NumberItem) => wordsFor(item)!.join(" ");
const taughtBy = (...units: string[]) =>
  new Set(units.flatMap((id) => (unitById(id)?.words ?? []).map((w) => w[0])));

describe("the words a number is said with", () => {
  it("are all lemmas the course teaches, read off the number units", () => {
    const taught = new Set(SYLLABUS.flatMap((u) => u.words.map((w) => w[0])));
    const named = new Set(EVERY.flatMap((item) => wordsFor(item) ?? []));
    expect(named.size).toBeGreaterThanOrEqual(30);
    for (const lemma of named) expect(taught.has(lemma), lemma).toBe(true);
    expect(taught.has(CLOCK_LEMMA)).toBe(true);
    expect(taught.has(EURO_LEMMA)).toBe(true);
  });

  it("covers every number the round deals, a hundred to the parts", () => {
    for (let n = 0; n <= 999; n += 1) expect(numberLemmas(n), String(n)).not.toBeNull();
    expect(numberLemmas(325)).toEqual([lemmaFor(3), lemmaFor(100), lemmaFor(20), lemmaFor(5)]);
    expect(numberLemmas(100)).toEqual([lemmaFor(100)]);
  });
});

/*
  THE ONE-ANSWER ASSERTION, OVER EVERYTHING THE ROUND CAN DEAL.

  Every item is read back as itself from each way it can honestly be given:
  the digits it is shown in, the digits TartuNLP is sent, and the course's
  own words for it. And no other item of its kind is right for its digits,
  so an answer can never be right for two things a round might ask.
*/
describe("every item the round can deal has exactly one right answer", () => {
  it("deals clocks, prices and counts", () => {
    expect(EVERY.some((i) => i.kind === "clock" && i.face === "analog")).toBe(true);
    expect(EVERY.some((i) => i.kind === "clock" && i.face === "digital")).toBe(true);
    expect(EVERY.some((i) => i.kind === "price" && i.cents % 100 !== 0)).toBe(true);
    expect(EVERY.some((i) => i.kind === "count" && i.n >= 100)).toBe(true);
    expect(new Set(EVERY.map(itemKey)).size).toBe(EVERY.length);
  });

  it("reads each item back as itself, from its digits, from what is played and from its words", () => {
    for (const item of EVERY) {
      expect(markNumber(item, shown(item)).right, `${itemKey(item)} shown ${shown(item)}`).toBe(true);
      const played = spokenAs(item);
      if (played) expect(markNumber(item, played).right, `${itemKey(item)} played ${played}`).toBe(true);
      expect(markNumber(item, said(item)).right, `${itemKey(item)} said ${said(item)}`).toBe(true);
    }
  });

  it("is right for no other item of its kind", () => {
    const byKind = new Map<string, NumberItem[]>();
    for (const item of EVERY) {
      const key = item.kind === "clock" ? `clock:${item.face}` : item.kind;
      byKind.set(key, [...(byKind.get(key) ?? []), item]);
    }
    let compared = 0;
    for (const items of byKind.values()) {
      for (const item of items) {
        const answer = shown(item);
        const right = items.filter((other) => markNumber(other, answer).right);
        expect(right.map(itemKey), answer).toEqual([itemKey(item)]);
        compared += 1;
      }
    }
    expect(compared).toBe(EVERY.length);
  });

  it("takes either reading under a clock face, and exactly the time on a timetable", () => {
    const face: NumberItem = { kind: "clock", hour: 3, minute: 0, face: "analog" };
    expect(markNumber(face, "kell kolm").right).toBe(true);
    expect(markNumber(face, "15:00").right).toBe(true);
    expect(markNumber(face, "3:00").right).toBe(true);
    expect(markNumber(face, "viisteist").right).toBe(true);
    expect(markNumber(face, "kell neli").right).toBe(false);
    const table: NumberItem = { kind: "clock", hour: 14, minute: 15, face: "digital" };
    expect(markNumber(table, "neliteist viisteist").right).toBe(true);
    expect(markNumber(table, "kell 14 15").right).toBe(true);
    expect(markNumber(table, "kaks viisteist").right).toBe(false);
    expect(markNumber(table, "kaks viisteist").read).toBe("02:15");
  });

  it("reads a price however a till says it, and a count said as its parts", () => {
    const price: NumberItem = { kind: "price", cents: 350 };
    for (const answer of ["3,50", "3.50 €", "kolm eurot viiskümmend", "kolm viiskümmend eurot", "kolm eurot ja viiskümmend senti"]) {
      expect(markNumber(price, answer).right, answer).toBe(true);
    }
    expect(markNumber(price, "kolm eurot").right).toBe(false);
    const count: NumberItem = { kind: "count", n: 235 };
    expect(markNumber(count, "kaks sada kolmkümmend viis").right).toBe(true);
    expect(markNumber(count, "kakssada kolmkümmend viis").right).toBe(true);
    expect(markNumber(count, "kakssada kolmkümmend").right).toBe(false);
  });

  it("forgives a number word typed without its diacritics, and grades it nothing", () => {
    const count: NumberItem = { kind: "count", n: 25 };
    const typed = "kakskummend viis";
    expect(unfolded(typed).folded).toEqual([lemmaFor(20)]);
    expect(markNumber(count, typed)).toMatchObject({ right: true, folded: [lemmaFor(20)] });
    expect(wordsRecalled(typed)).toEqual([lemmaFor(5)]);
  });

  it("grades the words recalled, and nothing for an answer in digits", () => {
    expect(wordsRecalled("kell neliteist viisteist")).toEqual([CLOCK_LEMMA, lemmaFor(14), lemmaFor(15)]);
    expect(wordsRecalled("kolm eurot viiskümmend")).toEqual([lemmaFor(3), EURO_LEMMA, lemmaFor(50)]);
    expect(wordsRecalled("14:15")).toEqual([]);
    expect(readAnswer({ kind: "count", n: 3 }, "")).toBeNull();
  });
});

/*
  WHAT IS PLAYED IS WHAT WAS MEASURED. `npm run measure:numbers` had
  TartuNLP read a sample of every shape, heard each clip back with the app's
  own recognizer and read it with the round's own reader. A shape the round
  plays has to have come back as the number it was sent, with nothing else in
  it, from every sample and every voice, in the very digits the round sends.
*/
describe("what TartuNLP is given to read", () => {
  const fixture = JSON.parse(readFileSync("lib/games/fixtures/number-speech.json", "utf8")) as {
    voices: string[];
    rows: { item: NumberItem; sent: string; voice: string; right: boolean; stray: string[] }[];
  };

  it("plays every shape the round deals", () => {
    const shapes = new Set(EVERY.map(shapeOf));
    for (const shape of shapes) expect(SPOKEN[shape], shape).not.toBeNull();
  });

  it("plays only what came back clean, in every voice measured", () => {
    const samples = new Map<string, NumberItem>();
    for (const row of fixture.rows) samples.set(itemKey(row.item), row.item);
    const covered = new Set<NumberShape>();
    for (const item of samples.values()) {
      const sent = spokenAs(item);
      if (!sent) continue;
      const rows = fixture.rows.filter((r) => itemKey(r.item) === itemKey(item) && r.sent === sent);
      expect(rows.length, `${itemKey(item)} sent as ${sent}`).toBe(fixture.voices.length);
      expect(rows.map((r) => r.voice).sort(), `${itemKey(item)} sent as ${sent}`).toEqual([...fixture.voices].sort());
      for (const row of rows) {
        expect(row.right && row.stray.length === 0, `${itemKey(item)} ${sent} ${row.voice}`).toBe(true);
      }
      covered.add(shapeOf(item));
    }
    for (const shape of new Set(EVERY.map(shapeOf))) expect(covered.has(shape), shape).toBe(true);
  });

  it("does not send a price as a decimal, which comes back with koma in it", () => {
    const decimal = fixture.rows.filter((r) => r.item.kind === "price" && r.item.cents % 100 !== 0 && r.sent === shown(r.item));
    expect(decimal.length).toBeGreaterThan(0);
    expect(decimal.every((r) => r.stray.length > 0)).toBe(true);
  });
});

describe("a round", () => {
  it("is ten items of every kind for somebody the module does not hold", () => {
    const round = dealRound(seeded(3), null);
    expect(round).toHaveLength(NUMBERS_ROUND);
    expect(new Set(round.map(itemKey)).size).toBe(NUMBERS_ROUND);
    expect(new Set(round.map((i) => i.kind))).toEqual(new Set(["count", "clock", "price"]));
  });

  it("waits for the time unit before a clock and for money before a price (D11)", () => {
    const numbersOnly = taughtBy("arvud");
    const round = dealRound(seeded(4), numbersOnly);
    expect(round.length).toBe(NUMBERS_ROUND);
    expect(round.every((i) => i.kind === "count")).toBe(true);
    for (const item of round) expect(wordsFor(item)!.every((w) => numbersOnly.has(w)), itemKey(item)).toBe(true);
    const withTime = taughtBy("arvud", "aeg");
    expect(dealRound(seeded(5), withTime, 40).some((i) => i.kind === "clock")).toBe(true);
    expect(dealRound(seeded(5), withTime, 40).some((i) => i.kind === "price")).toBe(false);
    const withMoney = taughtBy("arvud", "suured-arvud", "aeg", "ostmine");
    expect(dealRound(seeded(6), withMoney, 40).some((i) => i.kind === "price")).toBe(true);
  });

  it("deals nothing before a number is taught", () => {
    expect(dealableCount(new Set())).toBe(0);
    expect(dealRound(seeded(1), new Set())).toEqual([]);
    expect(dealable({ kind: "count", n: 3 }, null)).toBe(true);
  });
});

describe("what a round hands in", () => {
  it("is a Good per card, once each, and nothing else", () => {
    const batch = numberGrades([
      { id: "a", cardId: "c1" }, { id: "b", cardId: "c1" }, { id: "c", cardId: "c2", rating: 1 }, { cardId: "c3" }, null,
    ], 10, 1000);
    expect(batch).toEqual([
      { id: "a", cardId: "c1", rating: 3, durationMs: 0, reviewedAt: 1000 },
      { id: "c", cardId: "c2", rating: 3, durationMs: 0, reviewedAt: 1000 },
    ]);
    expect(numberGrades("no", 10, 0)).toEqual([]);
  });

  it("writes an answer said aloud as spoken, and only `true` as spoken", () => {
    expect(numberGrades([{ id: "a", cardId: "c1", spoken: true }, { id: "b", cardId: "c2", spoken: "yes" }], 10, 5)).toEqual([
      { id: "a", cardId: "c1", rating: 3, durationMs: 0, reviewedAt: 5, spoken: true },
      { id: "b", cardId: "c2", rating: 3, durationMs: 0, reviewedAt: 5 },
    ]);
  });
});

describe("wordsGraded", () => {
  /** A word as the recognizer hands it over, clean unless told otherwise. */
  const heard = (text: string, over: Partial<{ repaired: boolean; agreed: boolean; unsure: boolean }> = {}) => ({
    text, heard: text, unsure: over.unsure ?? false, repaired: over.repaired ?? false, agreed: over.agreed ?? true, known: true,
  });
  // Twenty-two, said as the course's own words: a ten that begins with the unit.
  const [tens, unit] = numberLemmas(22)!;

  it("grades every number word of a right answer typed in words, and nothing of a wrong one", () => {
    expect(tens!.startsWith(unit!)).toBe(true);
    expect(wordsGraded(`${tens} ${unit}`, true, null)).toEqual([tens, unit]);
    expect(wordsGraded(`${tens} ${unit}`, false, null)).toEqual([]);
  });

  it("never grades a repaired word because a longer word heard cleanly begins with it (D13)", () => {
    const words = wordsGraded(`${tens} ${unit}`, true, [heard(tens!), heard(unit!, { repaired: true })]);
    expect(words).toEqual([tens]);
  });

  it("grades euro on the ending it is said with, and only euro that way", () => {
    const price = wordsFor({ kind: "price", cents: 300 })!;
    const euros = price[0]!;
    const said = [heard(euros), heard(`${EURO_LEMMA}t`)];
    expect(wordsGraded(`${euros} ${EURO_LEMMA}t`, true, said)).toEqual([euros, EURO_LEMMA]);
  });
});
