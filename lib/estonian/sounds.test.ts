import { describe, expect, it } from "vitest";
import { soundKey } from "./sounds";

describe("soundKey", () => {
  /*
    The three things `scripts/measure-asr.ts` measured a recognizer getting
    wrong on clean native audio, which are the three a learner gets wrong.
  */
  it("hears one length where Estonian writes two", () => {
    expect(soundKey("poiss")).toBe(soundKey("pois"));
    expect(soundKey("linna")).toBe(soundKey("lina"));
    expect(soundKey("kohvi")).toBe(soundKey("kohvi"));
  });

  it("does not hear the difference between b and p, d and t, g and k", () => {
    expect(soundKey("padi")).toBe(soundKey("pati"));
    expect(soundKey("kabi")).toBe(soundKey("kapi"));
    expect(soundKey("aeg")).toBe(soundKey("aek"));
  });

  it("folds the letters an English keyboard has no key for", () => {
    expect(soundKey("õun")).toBe(soundKey("oun"));
    expect(soundKey("käsi")).toBe(soundKey("kasi"));
    expect(soundKey("üks")).toBe(soundKey("uks"));
    expect(soundKey("šokolaad")).toBe(soundKey("sokolaat"));
  });

  it("ignores spacing and punctuation", () => {
    expect(soundKey(" Head aega! ")).toBe(soundKey("headaega"));
  });

  /*
    And the limit, which is the half that keeps this useful. Folding more would
    merge ordinary words: dropping the weak `h` merges `hind` with `ind`, and
    folding the remaining vowels merges most of the language with itself.
  */
  it("keeps words apart that a learner would not confuse", () => {
    expect(soundKey("hind")).not.toBe(soundKey("ind"));
    expect(soundKey("maja")).not.toBe(soundKey("muna"));
    expect(soundKey("kool")).not.toBe(soundKey("kord"));
  });

  /*
    `tuba` and `tuppa` fold together, and that is the answer rather than a
    collision to fix: they are the nominative and the short illative of one
    word, they differ by exactly the length contrast this exists to forgive,
    and a learner who heard "lähen tuppa" and wrote "tuba" is looking for the
    entry that holds both.
  */
  it("folds a word's own length alternation together", () => {
    expect(soundKey("tuba")).toBe(soundKey("tuppa"));
    expect(soundKey("linna")).toBe(soundKey("lina"));
  });
});
