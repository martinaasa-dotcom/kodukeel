import { describe, expect, it } from "vitest";

import { COUNT_CASES, COUNTED_NOUNS, countOf, countedNoun, type CountCase } from "./locale";

/*
  Every counted noun at the numbers that catch a plural rule out: nought, the
  singular, the two that look alike in English and do not here (11 and 21),
  the few forms past twenty, and a fraction, which takes the genitive singular
  in both languages and is the one a three-form table cannot hold.
*/
const NUMBERS = [0, 1, 2, 5, 11, 21, 22, 25, 1.5] as const;
const CASES: readonly CountCase[] = ["nom", "acc", "gen"];

describe("every counted noun, at every number that matters, in every case", () => {
  it("has its genitive and accusative singular written out in both languages", () => {
    const missing = COUNTED_NOUNS.filter((noun) => !COUNT_CASES[noun]);
    expect(missing).toEqual([]);
    expect(COUNTED_NOUNS.length).toBeGreaterThan(30);
  });

  it("renders in Russian and Ukrainian without falling back to English", () => {
    let rendered = 0;
    for (const locale of ["ru", "uk"] as const) {
      for (const noun of COUNTED_NOUNS) {
        for (const grammaticalCase of CASES) {
          for (const n of NUMBERS) {
            const line = countOf(locale, n, noun, grammaticalCase);
            rendered += 1;
            expect(line, `${locale} ${noun} ${n} ${grammaticalCase}`).toMatch(/^[0-9]+(,5)? [\p{Script=Cyrillic}' ]+$/u);
          }
        }
      }
    }
    expect(rendered).toBe(2 * COUNTED_NOUNS.length * CASES.length * NUMBERS.length);
  });

  it("puts a feminine noun in the accusative after a preposition, and only at one", () => {
    expect(NUMBERS.map((n) => countOf("ru", n, "minute", "acc"))).toEqual([
      "0 минут", "1 минуту", "2 минуты", "5 минут", "11 минут", "21 минуту", "22 минуты", "25 минут", "1,5 минуты",
    ]);
    expect(NUMBERS.map((n) => countOf("uk", n, "week", "acc"))).toEqual([
      "0 тижнів", "1 тиждень", "2 тижні", "5 тижнів", "11 тижнів", "21 тиждень", "22 тижні", "25 тижнів", "1,5 тижня",
    ]);
  });

  it("puts the whole count in the genitive where the sentence asks for it", () => {
    expect(NUMBERS.map((n) => countOf("ru", n, "word", "gen"))).toEqual([
      "0 слов", "1 слова", "2 слов", "5 слов", "11 слов", "21 слова", "22 слов", "25 слов", "1,5 слова",
    ]);
    expect(NUMBERS.map((n) => countOf("uk", n, "card", "gen"))).toEqual([
      "0 карток", "1 картки", "2 карток", "5 карток", "11 карток", "21 картки", "22 карток", "25 карток", "1,5 картки",
    ]);
  });

  it("takes the genitive singular for a fraction, which in Ukrainian is not the few form", () => {
    expect(countOf("uk", 1.5, "day")).toBe("1,5 дня");
    expect(countOf("uk", 2, "day")).toBe("2 дні");
    expect(countOf("ru", 1.5, "hour")).toBe("1,5 часа");
    expect(countedNoun("ru", 1.5, "new word")).toBe("нового слова");
  });

  it("leaves the nominative exactly as the three-form tables have it", () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => countOf("ru", n, "card"))).toEqual([
      "1 карточка", "2 карточки", "5 карточек", "11 карточек", "21 карточка", "22 карточки", "25 карточек",
    ]);
  });

  it("gives an animate noun its genitive for the accusative singular", () => {
    expect(countOf("ru", 1, "learner", "acc")).toBe("1 ученика");
    expect(countOf("uk", 21, "learner", "acc")).toBe("21 учня");
  });
});
