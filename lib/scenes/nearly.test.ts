import { describe, expect, it } from "vitest";
import {
  COMPOUND_MODIFIER, MIN_STEM, MIN_TYPO_LENGTH, compoundOf, nearlyInflected, nearlySpelled,
} from "./nearly";

/**
 * The three readings of "close enough", at their own edges.
 *
 * Every rule here is stated in words in CLAUDE.md ("one letter out on a word of
 * five or more", "four or more opening characters", "a modifier of at least
 * three"), and until this file nothing tested any of them directly: they were
 * reached through the turn marker, which never lands on an edge. Flipping each
 * `<` to `<=` passed the whole suite. The fixtures are invented spellings,
 * because what is under test is the arithmetic on letters rather than a claim
 * about any Estonian word.
 */
describe("nearlySpelled", () => {
  it("reads one letter out as a slip on a word of exactly the floor", () => {
    const word = "abcde";
    expect(word).toHaveLength(MIN_TYPO_LENGTH);
    expect(nearlySpelled("abxde", new Set([word]))).toBe(word);
  });

  it("leaves a word one letter under the floor alone, where one letter is another word", () => {
    expect(nearlySpelled("abxd", new Set(["abcd"]))).toBeNull();
  });

  it("reads a letter added or dropped as one letter out, and two as a different word", () => {
    expect(nearlySpelled("abcdde", new Set(["abcde"]))).toBe("abcde");
    expect(nearlySpelled("abcddde", new Set(["abcde"]))).toBeNull();
  });
});

describe("nearlyInflected", () => {
  const nothing = () => false;

  it("reads a word sharing exactly the floor of opening letters as that word", () => {
    const word = "abcd";
    expect(word).toHaveLength(MIN_STEM);
    expect(nearlyInflected(word, new Set(["abcdef"]), nothing)).toBe("abcdef");
  });

  it("needs the shared opening to be at least half of what was said", () => {
    expect(nearlyInflected("abcdxxxxx", new Set(["abcdef"]), nothing)).toBeNull();
  });

  it("never reads a word the language vouches for as a mangled other one", () => {
    expect(nearlyInflected("abcdx", new Set(["abcdef"]), () => true)).toBeNull();
  });
});

describe("compoundOf", () => {
  const anyWord = () => true;

  it("reads a modifier of exactly the floor in front of the word as that word", () => {
    const modifier = "x".repeat(COMPOUND_MODIFIER);
    expect(compoundOf(`${modifier}pilet`, new Set(["pilet"]), anyWord)).toBe("pilet");
  });

  it("refuses a modifier one letter short, which is letters glued on rather than a word", () => {
    const modifier = "x".repeat(COMPOUND_MODIFIER - 1);
    expect(compoundOf(`${modifier}pilet`, new Set(["pilet"]), anyWord)).toBeNull();
  });

  it("refuses a spelling the forms list cannot vouch for, however it ends", () => {
    expect(compoundOf("xyzzypilet", new Set(["pilet"]), () => false)).toBeNull();
  });
});
