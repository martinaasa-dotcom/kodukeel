import { describe, expect, it } from "vitest";
import { EDIT_ALARM_TURNS, editReading, recallReading, spokenTurnCounts, type LoggedAnswer, type SpokenTurn } from "./speechReport";

const turn = (band: string, glossLanguage: string, wordsHeard: number, wordsChanged: number): SpokenTurn =>
  ({ band, glossLanguage, wordsHeard, wordsChanged });

describe("the edit rate", () => {
  it("is words changed over words heard, by band and by language", () => {
    const reading = editReading([turn("A1", "en", 4, 1), turn("A1", "ru", 6, 0), turn("B1", "en", 10, 5)]);
    expect(reading.all).toMatchObject({ turns: 3, wordsHeard: 20, wordsChanged: 6, share: 0.3 });
    expect(reading.byBand.map((r) => [r.key, r.share])).toEqual([["A1", 0.1], ["B1", 0.5]]);
    expect(reading.byLanguage.map((r) => r.key)).toEqual(["en", "ru"]);
  });

  it("leads with an alarm only past a quarter over enough turns", () => {
    const few = Array.from({ length: 10 }, () => turn("A1", "en", 4, 2));
    expect(editReading(few).alarm).toBe(false);
    const many = Array.from({ length: EDIT_ALARM_TURNS }, () => turn("A1", "en", 4, 2));
    expect(editReading(many).alarm).toBe(true);
    const fine = Array.from({ length: EDIT_ALARM_TURNS }, () => turn("A1", "en", 4, 0));
    expect(editReading(fine).alarm).toBe(false);
  });

  it("reads a spoken turn's counts in either spelling, and nothing off a typed one", () => {
    expect(spokenTurnCounts({ spoken: true, wordsHeard: 3, wordsChanged: 1 })).toEqual({ wordsHeard: 3, wordsChanged: 1 });
    expect(spokenTurnCounts({ spoken: true, heardWords: 3, changedWords: 0 })).toEqual({ wordsHeard: 3, wordsChanged: 0 });
    expect(spokenTurnCounts({ spoken: false, wordsHeard: 3, wordsChanged: 1 })).toBeNull();
    expect(spokenTurnCounts({ said: "tere" })).toBeNull();
  });
});

describe("recall after a spoken answer", () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 1, 0, minutes));
  const answer = (ownerId: string, cardId: string, minute: number, rating: number, spoken: boolean): LoggedAnswer =>
    ({ ownerId, cardId, reviewedAt: at(minute), rating, spoken });

  it("pairs each answer with the next to the same card and splits them by how the first was given", () => {
    const reading = recallReading([
      answer("a", "c1", 0, 3, true), answer("a", "c1", 10, 3, false), answer("a", "c1", 20, 1, false),
      answer("a", "c2", 0, 3, false), answer("a", "c2", 5, 3, true),
      // Somebody who never spoke is not the typed baseline.
      answer("b", "c3", 0, 3, false), answer("b", "c3", 5, 1, false),
    ]);
    expect(reading.speakers).toBe(1);
    expect(reading.spoken).toEqual({ pairs: 1, recalled: 1, share: 1 });
    expect(reading.typed).toEqual({ pairs: 2, recalled: 1, share: 0.5 });
  });
});
