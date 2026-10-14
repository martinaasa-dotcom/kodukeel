import { describe, expect, it } from "vitest";
import { applySwaps, correctionsFor, markPicture, sameWordIn, spellingsToCheck, suggestSwaps, writtenWords, type PictureWord } from "./picture";

const word = (lemma: string, translation: string, forms: Record<string, string>): PictureWord => ({
  lemma, translation, pos: "NOUN", emoji: "·",
  forms: Object.entries(forms).map(([formType, value]) => ({ formType, value })),
});

const KOOK = word("kook", "cake", { NOM_SG: "kook", GEN_SG: "koogi", PART_SG: "kooki" });
const KASS = word("kass", "cat", { NOM_SG: "kass", GEN_SG: "kassi", PART_SG: "kassi" });

const KNOWN = new Set(["ta", "naine", "sööb", "kooki", "kass", "istub", "laua", "all", "ja", "on", "väga", "ilus"]);

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

  it("does not mark a sentence down for leaving the scene, since the picture is a spark and the story is the learner's", () => {
    const mark = markPicture([KOOK], ["Ta on väga ilus."], KNOWN);
    expect(mark.sentences[0]!.mentions).toEqual([]);
    expect(mark.sentences[0]!.sound).toBe(true);
  });

  it("calls a sentence garbled only when half its words are unknown", () => {
    expect(markPicture([KOOK], ["Naine sööb koogg."], KNOWN).sentences[0]!.garbled).toBe(false);
    expect(markPicture([KOOK], ["Qwe sööb asdfg."], KNOWN).sentences[0]!.garbled).toBe(true);
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
    expect(mark.sound).toBe(5);
  });
});

describe("suggestSwaps", () => {
  const forms = ["sibulaid", "kartuleid", "tomateid", "sibul"];

  it("offers the one form the dictionary holds that is a letter away", () => {
    expect(suggestSwaps(["sibuleid"], forms)).toEqual([{ from: "sibuleid", to: "sibulaid" }]);
  });

  it("stays silent on a word nothing is near, a short word and a tie", () => {
    expect(suggestSwaps(["lennuk"], forms)).toEqual([]);
    expect(suggestSwaps(["sibu"], forms)).toEqual([]);
    expect(suggestSwaps(["kartulaid"], ["kartuleid", "kartulaid2".slice(0, 9), "kartulald"])).toEqual([]);
  });

  it("leaves a word that is already one of the forms", () => {
    expect(suggestSwaps(["sibulaid"], forms)).toEqual([]);
  });
});

describe("applySwaps", () => {
  it("puts the form into the learner's own sentence and keeps the rest", () => {
    expect(applySwaps("Neil on kartuleid, tomateid, ja sibuleid.", [{ from: "sibuleid", to: "sibulaid" }]))
      .toBe("Neil on kartuleid, tomateid, ja sibulaid.");
  });

  it("keeps a capital at the start of the word", () => {
    expect(applySwaps("Sibuleid on kaks.", [{ from: "sibuleid", to: "sibulaid" }])).toBe("Sibulaid on kaks.");
  });
});

describe("correctionsFor", () => {
  const vouched = ["sibulaid", "kartuleid", "tomateid"];
  const sentences = ["Neil on kartuleid, tomateid, ja sibuleid.", "Mees ostab sibulaid.", "Naine sööb tomateit."];
  const known = new Set(["neil", "on", "kartuleid", "tomateid", "ja", "mees", "ostab", "sibulaid", "naine", "sööb"]);
  const marks = markPicture([], sentences, known).sentences;

  it("swaps a word the list could not place for the nearest form the dictionary holds", () => {
    const out = correctionsFor(sentences, marks, vouched);
    expect(out.map((c) => c.index)).toEqual([0, 2]);
    expect(out[0]!.text).toBe("Neil on kartuleid, tomateid, ja sibulaid.");
    expect(out[1]!.text).toBe("Naine sööb tomateid.");
  });

  it("keeps a proposed swap only when the word was written and the form is vouched", () => {
    const out = correctionsFor(["Mees ostab sibul."], [marks[1]!], vouched, [[
      { wrong: "sibul", right: "sibulaid" },
      { wrong: "mees", right: "mehe" },
      { wrong: "puuduv", right: "sibulaid" },
    ]]);
    expect(out[0]!.swaps).toEqual([{ from: "sibul", to: "sibulaid" }]);
  });

  it("has no entry for a sentence with nothing to swap", () => {
    expect(correctionsFor([sentences[1]!], [marks[1]!], vouched)).toEqual([]);
  });

  it("names the words it could not put right, so a half-corrected sentence is not passed off as finished", () => {
    const text = ["Nad vaatab konsert hiljem."];
    const mark = markPicture([], text, new Set(["nad", "vaatab", "hiljem"])).sentences;
    const out = correctionsFor(text, mark, ["vaatavad"], [[{ wrong: "vaatab", right: "vaatavad" }]]);
    expect(out).toHaveLength(1);
    expect(out[0]!.text).toBe("Nad vaatavad konsert hiljem.");
    expect(out[0]!.left).toEqual(["konsert"]);
  });
});

describe("sameWordIn", () => {
  const family = new Map<string, Set<string>>([
    ["vaatab", new Set(["vaatama"])],
    ["vaatavad", new Set(["vaatama"])],
    ["ootavad", new Set(["ootama"])],
    ["buss", new Set(["buss"])],
    ["bussiga", new Set(["buss"])],
  ]);
  const same = sameWordIn(family);

  it("allows another form of the word the learner wrote", () => {
    expect(same("vaatab", "vaatavad")).toBe(true);
    expect(same("Buss", "bussiga")).toBe(true);
  });

  it("refuses a vouched form of a different word, which would be a rewrite and not a correction", () => {
    expect(same("vaatab", "ootavad")).toBe(false);
    expect(same("buss", "ootavad")).toBe(false);
  });

  it("lets a word no headword claims be put right only by a form a few letters away", () => {
    expect(same("sibuleid", "sibulaid")).toBe(true);
    expect(same("sibuleid", "vaatavad")).toBe(false);
  });

  it("drops a model's swap that changes the word, inside correctionsFor", () => {
    const out = correctionsFor(
      ["Nad vaatab rongi."],
      markPicture([], ["Nad vaatab rongi."], new Set(["nad", "vaatab", "rongi"])).sentences,
      ["vaatavad", "ootavad"],
      [[{ wrong: "vaatab", right: "ootavad" }]],
      same,
    );
    expect(out).toEqual([]);
  });
});
