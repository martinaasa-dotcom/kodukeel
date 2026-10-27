import { describe, expect, it } from "vitest";
import { nativeClip } from "@/lib/audio/native";
import { compareSpelling, letterOf, spellOut, spellableWord, stepLit, SPELL_MAX } from "./spelling";

describe("spelling a text out loud", () => {
  it("names every letter of the Estonian alphabet by its own recording", () => {
    const parts = spellOut("Jüri Õunapuu");
    const letters = parts.filter((p) => p.kind === "letter");
    expect(letters).toHaveLength(11);
    expect(letters.map((p) => p.letter).join("")).toBe("JÜRIÕUNAPUU");
    for (const p of letters) expect(nativeClip(p.clip).text).toBe(p.letter);
    expect(parts.filter((p) => p.kind === "pause")).toHaveLength(1);
  });

  it("keeps õ, ä, ö and ü as letters of their own rather than folding them", () => {
    expect(["õ", "ä", "ö", "ü", "š", "ž"].map(letterOf)).toEqual(["Õ", "Ä", "Ö", "Ü", "Š", "Ž"]);
  });

  it("reads a letter Estonian has no name for, with a mark on one it has, as the bare letter", () => {
    expect(letterOf("é")).toBe("E");
    expect(letterOf("ç")).toBe("C");
    expect(letterOf("ł")).toBeNull();
  });

  it("shows and skips what has no name, and never ends or doubles a pause", () => {
    const parts = spellOut("  Anna-Liisa  3 ");
    expect(parts.map((p) => p.kind)).toEqual([
      "letter", "letter", "letter", "letter", "pause", "letter", "letter", "letter", "letter", "letter", "pause", "other",
    ]);
    expect(spellOut("x".repeat(100))).toHaveLength(SPELL_MAX);
    expect(spellOut("")).toEqual([]);
  });

  it("plays a word as a round only where it is one short word with every letter named", () => {
    expect(spellableWord("tuba")).toBe(true);
    expect(spellableWord("öö")).toBe(false);
    expect(spellableWord("tere hommikust")).toBe(false);
    expect(spellableWord("raamatukogu")).toBe(false);
  });

  it("marks a dropped mark as a wrong letter and ignores case", () => {
    expect(compareSpelling("Tuba", "tuba").exact).toBe(true);
    const missed = compareSpelling("toon", "tõõn");
    expect(missed.exact).toBe(false);
    expect(missed.letters).toEqual([true, false, false, true]);
    expect(compareSpelling("tub", "tuba").letters).toEqual([true, true, true, false]);
  });
});

describe("which spelled letter to light", () => {
  const spans = [{ from: 0, to: 0.4 }, { from: 0.6, to: 1 }, { from: 1.2, to: 1.6 }, { from: 1.8, to: 2.2 }];

  it("lights the letter being said, and nothing in a gap", () => {
    expect(stepLit(spans, 0.1, -1)).toEqual({ shown: 0, lit: 0 });
    expect(stepLit(spans, 0.5, 0)).toEqual({ shown: 0, lit: null });
    expect(stepLit(spans, 0.7, 0)).toEqual({ shown: 1, lit: 1 });
  });

  it("never skips a letter when a frame comes late, catching up one a frame", () => {
    // The clip is in the third letter and only the first was ever lit.
    let state = { shown: 0, lit: 0 as number | null };
    const lit: (number | null)[] = [];
    for (let frame = 0; frame < 3; frame++) {
      state = stepLit(spans, 1.3, state.shown);
      lit.push(state.lit);
    }
    expect(lit).toEqual([1, 2, 2]);
  });
});
