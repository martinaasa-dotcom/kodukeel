import { describe, expect, it } from "vitest";

import { dayClock, nextCardLine } from "@/lib/time/day";
import { CASE_GLOSS_ROWS, ENDING_GLOSS_ROWS, QUOTED_CASE_GLOSS_ROWS } from "./i18n/caseGlosses";
import { CONFIRM_WORDS, confirmWord, isConfirmed } from "./confirmWord";
import { countOf, fill, tr } from "./locale";

/*
  The places where a translation table alone could not make the sentence
  right, because the right form depends on a value the code puts in: the
  weekday after "on", a count after a preposition, the word somebody types to
  confirm, and the gloss each case is given on three screens.
*/

describe("a weekday inside a sentence", () => {
  const clock = dayClock("Europe/Tallinn");
  const now = new Date("2026-09-02T09:00:00Z"); // a Wednesday
  const days = ["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"].map((d) => new Date(`${d}T09:00:00Z`));

  it("is lower case and after its preposition, every day of the week", () => {
    expect(days.map((d) => nextCardLine(d, now, clock, "ru"))).toEqual([
      "Следующая карточка вернётся в пятницу.",
      "Следующая карточка вернётся в субботу.",
      "Следующая карточка вернётся в воскресенье.",
      "Следующая карточка вернётся в понедельник.",
      "Следующая карточка вернётся во вторник.",
    ]);
    expect(days.map((d) => nextCardLine(d, now, clock, "uk"))).toEqual([
      "Наступна картка повернеться у п'ятницю.",
      "Наступна картка повернеться у суботу.",
      "Наступна картка повернеться в неділю.",
      "Наступна картка повернеться у понеділок.",
      "Наступна картка повернеться у вівторок.",
    ]);
  });

  it("puts a count of days after «через» in the accusative", () => {
    expect(nextCardLine(new Date("2026-09-23T09:00:00Z"), now, clock, "ru")).toMatch(/21 день\.$/);
  });
});

describe("the word somebody types to confirm", () => {
  it("is asked for in the reader's language", () => {
    expect(confirmWord("delete", "ru")).toBe("удалить");
    expect(confirmWord("replace", "uk")).toBe("замінити");
    expect(confirmWord("delete", "en")).toBe("delete");
  });

  it("is accepted in any of the three, and nothing else", () => {
    for (const action of ["delete", "replace"] as const) {
      for (const word of Object.values(CONFIRM_WORDS[action])) {
        expect(isConfirmed(`  ${word.toUpperCase()} `, action)).toBe(true);
      }
    }
    expect(isConfirmed("delet", "delete")).toBe(false);
    expect(isConfirmed("replace", "delete")).toBe(false);
    expect(isConfirmed(42, "delete")).toBe(false);
  });

  it("keeps the Russian word Russian and the Ukrainian word Ukrainian", () => {
    for (const action of ["delete", "replace"] as const) {
      expect(CONFIRM_WORDS[action].ru).not.toMatch(/[іїєґ']/);
      expect(CONFIRM_WORDS[action].uk).not.toBe(CONFIRM_WORDS[action].ru);
      expect(CONFIRM_WORDS[action].uk).not.toMatch(/[ыэъё]/);
    }
  });
});

describe("what each ending means", () => {
  it("is one translation per gloss, in all three places", () => {
    const plain = new Map(CASE_GLOSS_ROWS.map(([en, ru, uk]) => [en, [ru, uk]]));
    for (const [quoted, ru, uk] of QUOTED_CASE_GLOSS_ROWS) {
      const [pr, pu] = plain.get(quoted.slice(1, -1))!;
      expect(ru).toBe(`«${pr!.replace(/[«»]/g, "")}»`);
      expect(uk).toBe(`«${pu!.replace(/[«»]/g, "")}»`);
    }
    for (const [key, ru, uk] of ENDING_GLOSS_ROWS) {
      expect(plain.get(key.replace(/@ending$/, ""))).toEqual([ru, uk]);
    }
    expect(ENDING_GLOSS_ROWS.length).toBe(11);
  });

  it("never gives two cases the same gloss in either language", () => {
    const shorts = ENDING_GLOSS_ROWS;
    for (const column of [1, 2] as const) {
      const seen = shorts.map((row) => row[column]);
      expect(new Set(seen).size).toBe(seen.length);
    }
    expect(tr("uk", "out of")).not.toBe(tr("uk", "off"));
    expect(tr("uk", "off")).not.toBe(tr("uk", "with"));
  });
});

describe("a count in the case its sentence puts it in", () => {
  it("reads right at one in the sentences that used to break there", () => {
    expect(fill(tr("ru", "{evenings}, about {minutes} each."), {
      evenings: countOf("ru", 12, "evening"),
      minutes: countOf("ru", 1, "minute", "gen"),
    })).toBe("12 вечеров, каждый около 1 минуты.");
    expect(countOf("uk", 1, "card", "acc")).toBe("1 картку");
  });
});
