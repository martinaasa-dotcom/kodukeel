import { describe, expect, it } from "vitest";
import { markPicture, spellingsToCheck, writtenWords, type PictureWord } from "./picture";

const word = (lemma: string, translation: string, forms: Record<string, string>): PictureWord => ({
  lemma, translation, pos: "NOUN", emoji: "·",
  forms: Object.entries(forms).map(([formType, value]) => ({ formType, value })),
});

const KOOK = word("kook", "cake", { NOM_SG: "kook", GEN_SG: "koogi", PART_SG: "kooki" });
const KASS = word("kass", "cat", { NOM_SG: "kass", GEN_SG: "kassi", PART_SG: "kassi" });

const KNOWN = new Set(["naine", "sööb", "kooki", "kass", "istub", "laua", "all", "ja", "on", "väga", "ilus"]);

describe("spellingsToCheck", () => {
  it("lowercases every word once and leaves out a name in the middle of a sentence", () => {
    expect(spellingsToCheck(["Naine sööb kooki.", "Naine sööb Kadriga kooki!"]).sort())
      .toEqual(["kooki", "naine", "sööb"].sort());
  });

  it("still asks about a capital that only opens a sentence", () => {
    expect(spellingsToCheck(["Kass istub. Ta on ilus."])).toContain("ta");
    expect(spellingsToCheck(["Kass istub. Ta on ilus."])).toContain("kass");
  });

  it("keeps a hyphenated word whole", () => {
    expect(writtenWords("See on Eesti-Soome piir.")).toContain("Eesti-Soome");
  });
});

describe("markPicture", () => {
  it("calls a sentence sound when it is a sentence, spelled, about the picture and new", () => {
    const mark = markPicture([KOOK, KASS], ["Naine sööb kooki."], KNOWN);
    expect(mark.sentences[0]).toMatchObject({ isSentence: true, unknown: [], mentions: ["kook"], repeated: false, tidy: true, sound: true });
    expect(mark.sound).toBe(1);
  });

  it("names a word the forms list could not place", () => {
    const mark = markPicture([KOOK], ["Naine sööb koogg."], KNOWN);
    expect(mark.sentences[0]!.unknown).toEqual(["koogg"]);
    expect(mark.sentences[0]!.sound).toBe(false);
  });

  it("does not ask about a name in the middle of a sentence", () => {
    const mark = markPicture([KOOK], ["Naine sööb Kadriga kooki."], new Set([...KNOWN, "kadriga"].filter((w) => w !== "kadriga")));
    expect(mark.sentences[0]!.unknown).toEqual([]);
  });

  it("says when a sentence is about nothing in the picture", () => {
    const mark = markPicture([KOOK], ["Ta on väga ilus."], KNOWN);
    expect(mark.sentences[0]!.mentions).toEqual([]);
    expect(mark.sentences[0]!.sound).toBe(false);
  });

  it("reads a case ending as the word", () => {
    const mark = markPicture([KASS], ["Kass istub laua all."], KNOWN);
    expect(mark.sentences[0]!.mentions).toEqual(["kass"]);
  });

  it("refuses a sentence of fewer than three words", () => {
    const mark = markPicture([KASS], ["Kass istub."], KNOWN);
    expect(mark.sentences[0]!.isSentence).toBe(false);
    expect(mark.sentences[0]!.sound).toBe(false);
  });

  it("counts the same sentence twice as one", () => {
    const mark = markPicture([KOOK], ["Naine sööb kooki.", "naine sööb kooki"], KNOWN);
    expect(mark.sentences[0]!.repeated).toBe(false);
    expect(mark.sentences[1]!.repeated).toBe(true);
    expect(mark.sound).toBe(1);
  });

  it("notes a missing capital or stop without calling it wrong", () => {
    const mark = markPicture([KOOK], ["naine sööb kooki"], KNOWN);
    expect(mark.sentences[0]!.tidy).toBe(false);
    expect(mark.sentences[0]!.sound).toBe(true);
  });

  it("lists what was talked about across the five, in the picture's order", () => {
    const mark = markPicture(
      [KOOK, KASS], ["Kass istub laua all.", "Naine sööb kooki.", "Kass on ilus.", "Ta on ilus.", "Naine on ilus."], KNOWN,
    );
    expect(mark.mentioned).toEqual(["kook", "kass"]);
    expect(mark.sound).toBe(3);
  });
});
