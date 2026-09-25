import { describe, expect, it } from "vitest";
import {
  MAX_LETTERS, MIN_LETTERS, lettersOf, onTrack, ratingFor, scramble, spellable, tileForKey, tilesFor,
} from "./letters";

describe("spellable", () => {
  it("takes one word with an order to find", () => {
    expect(spellable("tere")).toBe(true);
    expect(spellable("aitäh")).toBe(true);
    // Both ends of the length rule are inside it.
    expect(spellable("abc".slice(0, MIN_LETTERS))).toBe(true);
    expect(spellable("ab".repeat(MAX_LETTERS).slice(0, MAX_LETTERS))).toBe(true);
    expect(spellable("Eesti")).toBe(true);
  });
  it("refuses two letters, a phrase, and a word of one letter repeated", () => {
    expect(spellable("ei")).toBe(false);
    expect(spellable("Tere hommikust!")).toBe(false);
    expect(spellable("aaa")).toBe(false);
    expect(spellable("a-b-c")).toBe(false);
    expect(spellable("a".repeat(MAX_LETTERS + 1) + "b")).toBe(false);
    expect(spellable("ab".repeat(2).slice(0, MIN_LETTERS - 1))).toBe(false);
  });
});

describe("scramble", () => {
  it("keeps every letter and never hands the word back in its own order", () => {
    const words = ["tere", "aitäh", "palun", "õpetaja", "kool", "abc"];
    for (const word of words) {
      for (let seed = 0; seed < 50; seed++) {
        let x = seed + 1;
        const rng = () => { x = (x * 48271) % 2147483647; return x / 2147483647; };
        const out = scramble(word, rng);
        expect([...out].sort().join("")).toBe([...lettersOf(word)].sort().join(""));
        expect(out.join("")).not.toBe(word);
      }
    }
  });
  it("keeps a precomposed letter as one tile", () => {
    expect(lettersOf("aitäh")).toHaveLength(5);
    expect(lettersOf("aitäh")).toHaveLength(5);
  });
});

describe("the board", () => {
  it("finds the first free tile for a key without regard to case", () => {
    const tiles = tilesFor("Eesti", () => 0);
    const e = tileForKey(tiles, new Set(), "e");
    expect(e?.letter.toLowerCase()).toBe("e");
    const second = tileForKey(tiles, new Set([e!.id]), "E");
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(e!.id);
    expect(tileForKey(tiles, new Set(), "z")).toBeNull();
  });
  it("knows whether the tiles placed still spell the word", () => {
    expect(onTrack("tere", ["t", "e"])).toBe(true);
    expect(onTrack("tere", ["t", "r"])).toBe(false);
    expect(onTrack("tere", [])).toBe(true);
  });
  it("grades right first time Good, after one miss Hard, and a second miss Again", () => {
    expect(ratingFor(0, true)).toBe(3);
    expect(ratingFor(1, true)).toBe(2);
    expect(ratingFor(2, false)).toBe(1);
  });
});
