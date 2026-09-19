import { describe, expect, it } from "vitest";
import { earlier, forgetLast, later, LOOK_BACK_MAX, openAt, remember, type SeenCard } from "./lookBack";

const seenCard = (key: string, of = key): SeenCard => ({
  key,
  of,
  label: "Fill the gap",
  question: "Ta töötab ____ õpetajana.",
  answer: "koolis",
  note: null,
  questionLang: "et",
  answerLang: "et",
  speak: "koolis",
});

describe("remember", () => {
  it("keeps showings in the order they were shown", () => {
    const seen = remember(remember([], seenCard("a")), seenCard("b"));
    expect(seen.map((s) => s.key)).toEqual(["a", "b"]);
  });

  it("drops the oldest past the ceiling rather than growing without bound", () => {
    let seen: SeenCard[] = [];
    for (let i = 0; i < LOOK_BACK_MAX + 5; i += 1) seen = remember(seen, seenCard(`k${i}`));
    expect(seen).toHaveLength(LOOK_BACK_MAX);
    expect(seen[0]?.key).toBe("k5");
    expect(seen[seen.length - 1]?.key).toBe(`k${LOOK_BACK_MAX + 4}`);
  });

  it("does not touch the list it was handed", () => {
    const before: SeenCard[] = [seenCard("a")];
    remember(before, seenCard("b"));
    expect(before).toHaveLength(1);
  });
});

describe("forgetLast", () => {
  it("takes back the most recent showing of one card, not every showing of it", () => {
    // A card answered twice in a session was genuinely shown twice, and undo
    // rewinds one grade.
    const seen = [seenCard("x#1", "x"), seenCard("y#1", "y"), seenCard("x#2", "x")];
    expect(forgetLast(seen, "x").map((s) => s.key)).toEqual(["x#1", "y#1"]);
  });

  it("leaves a list alone when the card was never recorded", () => {
    const seen = [seenCard("x#1", "x")];
    expect(forgetLast(seen, "nobody")).toEqual(seen);
  });
});

describe("where a look back opens and where it walks", () => {
  const seen = [seenCard("a"), seenCard("b"), seenCard("c")];

  it("opens on the card that just went", () => {
    expect(openAt(seen)).toBe(2);
  });

  it("has nothing to open on an empty session", () => {
    expect(openAt([])).toBeNull();
  });

  it("walks back to the oldest kept showing and stops", () => {
    expect(earlier(2, seen)).toBe(1);
    expect(earlier(1, seen)).toBe(0);
    expect(earlier(0, seen)).toBeNull();
  });

  it("walks forward, and past the newest that is the round itself", () => {
    expect(later(0, seen)).toBe(1);
    expect(later(1, seen)).toBe(2);
    expect(later(2, seen)).toBeNull();
  });

  it("answers null from a position that is not in the list", () => {
    expect(earlier(9, seen)).toBeNull();
    expect(later(9, seen)).toBeNull();
    expect(later(-1, seen)).toBeNull();
  });
});
