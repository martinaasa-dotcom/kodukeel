import { describe, expect, it } from "vitest";
import type { Hearing, HeardWord } from "@/lib/speech/reconcile";
import {
  beginnerLine, checkSpoken, dealSpeaking, ratingFor, spokenVerdict, stepGrades, stepsFor,
  type SpeakingCandidate,
} from "./speaking";
import { repairedInAnswer } from "@/lib/speech/verdict";

function word(text: string, over: Partial<HeardWord> = {}): HeardWord {
  return { text, heard: text, unsure: false, repaired: false, agreed: true, known: true, ...over };
}

function hearing(words: HeardWord[]): Hearing {
  const understood = words.map((w) => w.text).join(" ");
  return { heard: words.map((w) => w.heard).join(" "), understood, words, repairs: [], seconds: 1 };
}

function candidate(over: Partial<SpeakingCandidate> & Pick<SpeakingCandidate, "lemma">): SpeakingCandidate {
  return {
    source: "deck", cardId: `card-${over.lemma}`, lexemeId: `lex-${over.lemma}`, pos: "NOUN",
    meaning: "a thing", sentence: null, formSlot: null, starred: false, ...over,
  };
}

describe("the deal", () => {
  it("takes the deck first, then phrase entries, then attested usages, one line per word", () => {
    const round = dealSpeaking([
      candidate({ lemma: "Head aega!", source: "phrase", pos: "PHRASE", cardId: null }),
      candidate({ lemma: "kohv", source: "usage", sentence: { et: "Ma joon kohvi.", en: "I drink coffee.", form: "kohvi" } }),
      candidate({ lemma: "tuba" }),
      candidate({ lemma: "tuba", source: "usage", sentence: { et: "Ma olen toas.", en: "I am in the room.", form: "toas" } }),
    ], { size: 10, beginner: false });
    expect(round.map((item) => [item.source, item.et])).toEqual([
      ["deck", "tuba"],
      ["phrase", "Head aega!"],
      ["usage", "Ma joon kohvi."],
    ]);
  });

  it("stops at the size of the round", () => {
    const round = dealSpeaking(["a", "b", "c", "d"].map((lemma) => candidate({ lemma })), { size: 2, beginner: false });
    expect(round).toHaveLength(2);
  });

  it("marks a sentence on the asked form and a word on itself", () => {
    const [line, bare] = dealSpeaking([
      candidate({ lemma: "tuba", sentence: { et: "Ma olen toas.", en: "I am in the room.", form: "toas" } }),
      candidate({ lemma: "kass" }),
    ], { size: 5, beginner: false });
    expect(line).toMatchObject({ et: "Ma olen toas.", en: "I am in the room.", target: "toas", isSentence: true });
    expect(bare).toMatchObject({ et: "kass", en: "a thing", target: "kass", isSentence: false });
  });
});

describe("the A1 narrowing", () => {
  const room = candidate({ lemma: "tuba", sentence: { et: "Ma olen toas.", en: "I am in the room.", form: "toas" } });
  const reads = candidate({
    lemma: "lugema", pos: "VERB", formSlot: "IndPrSg3",
    sentence: { et: "Ta loeb raamatut.", en: "She reads a book.", form: "loeb" },
  });
  const read = candidate({
    lemma: "lugema", pos: "VERB", formSlot: "IndIpfSg3",
    sentence: { et: "Ta luges raamatut.", en: "She read a book.", form: "luges" },
  });

  it("asks a beginner a word alone where the sentence wants a case", () => {
    expect(beginnerLine(room)).toBe(false);
    const [item] = dealSpeaking([room], { size: 5, beginner: true });
    expect(item).toMatchObject({ et: "tuba", target: "tuba", isSentence: false });
  });

  it("asks a beginner the present persons of a verb and nothing past them", () => {
    expect(beginnerLine(reads)).toBe(true);
    expect(beginnerLine(read)).toBe(false);
    expect(dealSpeaking([reads], { size: 5, beginner: true })[0]!.target).toBe("loeb");
    expect(dealSpeaking([read], { size: 5, beginner: true })[0]!.target).toBe("lugema");
  });

  it("leaves everybody past A1 the sentence", () => {
    expect(dealSpeaking([room], { size: 5, beginner: false })[0]!.isSentence).toBe(true);
  });
});

describe("the steps", () => {
  it("runs three steps, and hands-free only the first two", () => {
    expect(stepsFor(false)).toEqual(["along", "back", "meaning"]);
    expect(stepsFor(true)).toEqual(["along", "back"]);
  });

  it("grades only the recall from the meaning, and nothing hands-free", () => {
    expect(stepGrades("along", false)).toBe(false);
    expect(stepGrades("back", false)).toBe(false);
    expect(stepGrades("meaning", false)).toBe(true);
    for (const step of stepsFor(true)) expect(stepGrades(step, true)).toBe(false);
    expect(stepGrades("meaning", true)).toBe(false);
  });
});

describe("a spoken recall, only ever up", () => {
  const [line] = dealSpeaking([candidate({ lemma: "tuba", sentence: { et: "Ma olen toas.", en: "I am in the room.", form: "toas" } })], { size: 1, beginner: false });
  const [bare] = dealSpeaking([candidate({ lemma: "kohv" })], { size: 1, beginner: false });

  it("is Good where the word was heard as it is spelled", () => {
    expect(spokenVerdict(bare!, hearing([word("kohv")]))).toEqual({ kind: "good" });
    expect(spokenVerdict(line!, hearing([word("ma"), word("olen"), word("toas")]))).toEqual({ kind: "good" });
  });

  it("fills the box where it was not, and never says anything worse", () => {
    expect(spokenVerdict(bare!, hearing([word("kohvi")])).kind).toBe("fill");
    expect(spokenVerdict(line!, hearing([word("ma"), word("olen"), word("toast")])).kind).toBe("fill");
    // A repaired or unsure word is not heard as spelled, even where it is the answer.
    expect(spokenVerdict(bare!, hearing([word("kohv", { repaired: true, heard: "kohf" })])).kind).toBe("fill");
    expect(spokenVerdict(bare!, hearing([word("kohv", { agreed: false })])).kind).toBe("fill");
  });

  it("writes nothing for a missed recall, and the marker's grade otherwise", () => {
    expect(ratingFor(checkSpoken(bare!, "tee"), false)).toBeNull();
    expect(ratingFor(checkSpoken(bare!, "kohv"), false)).toBe(3);
    expect(ratingFor(checkSpoken(line!, "Ma olen toas"), false)).toBe(3);
    expect(ratingFor(checkSpoken(line!, "Ma olen toast"), false)).toBeNull();
  });

  it("writes nothing where a word the dictionary repaired is still in the box (D13)", () => {
    const heard = hearing([word("kohv", { repaired: true, heard: "kohf" })]);
    expect(repairedInAnswer(heard, "kohv")).toBe(true);
    expect(ratingFor(checkSpoken(bare!, "kohv"), repairedInAnswer(heard, "kohv"))).toBeNull();
    // Changed by the learner, it is their own typing and marks as typed.
    expect(repairedInAnswer(heard, "kohvi")).toBe(false);
    expect(repairedInAnswer(null, "kohv")).toBe(false);
  });
});
