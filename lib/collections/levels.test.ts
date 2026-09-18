import { describe, expect, it } from "vitest";
import { LEVELS } from "./syllabus";
import { aroundFirst, bandsAround, challengeFirst, challengeRank, heldToTaughtWords, isAround, readableFor } from "./levels";

describe("the level window", () => {
  it("covers every level the course has", () => {
    for (const level of LEVELS) {
      expect(bandsAround(level).length).toBeGreaterThan(0);
      expect(bandsAround(level)).toContain(level);
    }
  });

  it("reaches one band up from A2, so a learner meets what is next", () => {
    expect(bandsAround("A2")).toContain("B1");
    expect(bandsAround("B1")).toContain("B2");
  });

  it("keeps a beginner inside A1, because eleven words have no next band", () => {
    // Measured on the module's second evening: an A2 verb from Sõnad and an
    // A2 conjugation table dealt to somebody who had met eleven words.
    expect(bandsAround("A1")).toEqual(["A1"]);
    expect(isAround("A2", "A1")).toBe(false);
  });

  it("leaves out what is two bands away in either direction", () => {
    expect(isAround("C1", "A1")).toBe(false);
    expect(isAround("A1", "C1")).toBe(false);
  });

  it("keeps a word the learner added themselves, whatever their level", () => {
    // Nothing typed in, pasted or photographed carries a CEFR tag, and a level
    // that hid those would hide the learner's own homework from their deck.
    for (const level of LEVELS) {
      expect(isAround(null, level)).toBe(true);
      expect(isAround("", level)).toBe(true);
    }
  });

  it("offers C2 to the one level it could be any use to", () => {
    expect(isAround("C2", "C1")).toBe(true);
    expect(isAround("C2", "B1")).toBe(false);
  });
});

describe("aroundFirst", () => {
  const deck = [
    { lemma: "far-below", cefr: "A1" },
    { lemma: "at-level", cefr: "B1" },
    { lemma: "far-above", cefr: "C1" },
    { lemma: "their-own", cefr: null },
    { lemma: "one-up", cefr: "B2" },
  ];
  const order = (level: Parameters<typeof aroundFirst>[1]) =>
    aroundFirst(deck, level, (w) => w.cefr).map((w) => w.lemma);

  it("puts what is around the level in front and drops nothing", () => {
    expect(order("B1")).toEqual(["at-level", "their-own", "one-up", "far-below", "far-above"]);
    expect(order("B1")).toHaveLength(deck.length);
  });

  it("keeps the caller's order inside each half", () => {
    // Review hands cards over in the order they were added, and that order is
    // an answer to a different question that still has to survive this one.
    expect(order("A1")).toEqual(["far-below", "their-own", "at-level", "far-above", "one-up"]);
  });

  it("returns everything however far the level is from the deck", () => {
    expect(order("C1")).toHaveLength(deck.length);
    expect(new Set(order("C1"))).toEqual(new Set(deck.map((w) => w.lemma)));
  });
});

describe("challengeFirst", () => {
  it("teaches at the level, then the band above, then their own words, then below", () => {
    const words = [
      { id: "below", cefr: "A2" },
      { id: "far", cefr: "C1" },
      { id: "own", cefr: null },
      { id: "above", cefr: "B2" },
      { id: "at", cefr: "B1" },
    ];
    expect(challengeFirst(words, "B1", (w) => w.cefr).map((w) => w.id))
      .toEqual(["at", "above", "own", "below", "far"]);
  });

  it("orders and never drops, whatever the learner set their level to", () => {
    const words = [{ cefr: "C2" }, { cefr: "A1" }];
    expect(challengeFirst(words, "B1", (w) => w.cefr)).toHaveLength(2);
  });

  it("keeps the caller's order inside a rank", () => {
    // The caller has already answered a different question with that order,
    // which for Learn is how long a card has been waiting.
    const words = [{ id: 1, cefr: "A1" }, { id: 2, cefr: "A1" }, { id: 3, cefr: "A1" }];
    expect(challengeFirst(words, "A1", (w) => w.cefr).map((w) => w.id)).toEqual([1, 2, 3]);
  });

  it("puts the band above ahead of the band below at every level", () => {
    for (const level of ["A1", "A2", "B1", "B2", "C1"] as const) {
      const window = bandsAround(level);
      const above = window[window.indexOf(level) + 1];
      const below = window[window.indexOf(level) - 1];
      if (above) expect(challengeRank(above, level)).toBe(1);
      if (below) expect(challengeRank(below, level)).toBe(3);
      expect(challengeRank(level, level)).toBe(0);
    }
  });
});

describe("readableFor", () => {
  const taught = new Set(["ma", "olen", "kodus"]);
  it("holds the module at every level and the lesson at A1", () => {
    for (const level of LEVELS) {
      expect(heldToTaughtWords(level, "module")).toBe(true);
      expect(heldToTaughtWords(level, "lesson")).toBe(level === "A1");
    }
  });
  it("lets a sentence of taught words through and refuses one word past them", () => {
    const inModule = readableFor("B1", taught, "module");
    expect(inModule("Ma olen kodus.")).toBe(true);
    expect(inModule("Ma olen tööl.")).toBe(false);
    const inLesson = readableFor("B1", taught, "lesson");
    expect(inLesson("Ma olen tööl.")).toBe(true);
    expect(readableFor("A1", taught, "lesson")("Ma olen tööl.")).toBe(false);
  });
  it("fails closed where the course could not say", () => {
    expect(readableFor("C1", null, "module")("Ma olen kodus.")).toBe(false);
    expect(readableFor("B2", null, "lesson")("Ma olen kodus.")).toBe(true);
  });
});
