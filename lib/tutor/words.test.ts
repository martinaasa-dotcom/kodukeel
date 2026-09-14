import { describe, expect, it } from "vitest";
import { MAX_QUESTION_WORDS, questionWords, wordLine, wordsNote, type WordFacts } from "./words";

const jalg: WordFacts = {
  lemma: "jalg", pos: "NOUN", translation: "foot, leg", government: null, gradationNote: "g : ∅",
  forms: [
    { formType: "NOM_SG", value: "jalg" }, { formType: "GEN_SG", value: "jala" }, { formType: "PART_SG", value: "jalga" },
    { formType: "ILL_SG_SHORT", value: "jalga" }, { formType: "NOM_PL", value: "jalad" }, { formType: "GEN_PL", value: "jalgade" },
    { formType: "PART_PL", value: "jalgu" },
  ],
};
const lugema: WordFacts = {
  lemma: "lugema", pos: "VERB", translation: "to read", government: "keda/mida* (partitive)", gradationNote: null,
  forms: [
    { formType: "INF_MA", value: "lugema" }, { formType: "INF_DA", value: "lugeda" }, { formType: "PRES_1SG", value: "loen" },
    { formType: "PAST_1SG", value: "lugesin" }, { formType: "PART_TUD", value: "loetud" },
  ],
};

describe("questionWords", () => {
  it("keeps the Estonian-looking words of the last two user turns and drops the English the question is made of", () => {
    const words = questionWords([
      { role: "user", content: "What case is 'raamatut'?" },
      { role: "assistant", content: "It is the osastav of raamat." },
      { role: "user", content: "and what about toas, is that the same?" },
    ]);
    expect(words).toEqual(["toas", "raamatut"]);
  });

  it("lets a quoted word past the English list, because the learner is asking about the Estonian one", () => {
    expect(questionWords([{ role: "user", content: "What is the plural of 'see'?" }])).toEqual(["see"]);
    expect(questionWords([{ role: "user", content: "I see, what about last?" }])).toEqual([]);
  });

  it("never names a case or a grammar term as a word to look up", () => {
    expect(questionWords([{ role: "user", content: "Which is the seesütlev, the inessive?" }])).toEqual([]);
  });
});

describe("wordLine and wordsNote", () => {
  it("prints a nominal's principal parts and never a short illative that spells a part already given", () => {
    const line = wordLine(jalg);
    expect(line).toBe("- jalg (noun, foot, leg): jalg, genitive jala, partitive jalga, plural jalad, genitive plural jalgade, partitive plural jalgu; grade change g : ∅");
    expect(line).not.toContain("short illative");
  });

  it("prints a verb's five parts and its government", () => {
    expect(wordLine(lugema)).toBe("- lugema (verb, to read): lugema, da-infinitive lugeda, I loen, I (past) lugesin, tud-participle loetud; takes keda/mida* (partitive)");
  });

  it("names the case of a spelling the question used, one case or the honest list, and never the lemma's own", () => {
    const tuba: WordFacts = {
      lemma: "tuba", pos: "NOUN", translation: "room", government: null, gradationNote: "b : ∅",
      forms: [
        { formType: "NOM_SG", value: "tuba" }, { formType: "GEN_SG", value: "toa" }, { formType: "PART_SG", value: "tuba" },
        { formType: "ILL_SG_SHORT", value: "tuppa" }, { formType: "NOM_PL", value: "toad" }, { formType: "PART_PL", value: "tube" },
      ],
      asked: ["toas", "Tuba"],
    };
    expect(wordLine(tuba)).toContain("toas is its seesütlev (inessive)");
    expect(wordLine(tuba)).not.toContain("tuba is its");
    const kool: WordFacts = {
      lemma: "kool", pos: "NOUN", translation: "school", government: null, gradationNote: null,
      forms: [
        { formType: "NOM_SG", value: "kool" }, { formType: "GEN_SG", value: "kooli" }, { formType: "PART_SG", value: "kooli" },
        { formType: "ILL_SG_SHORT", value: "kooli" }, { formType: "NOM_PL", value: "koolid" }, { formType: "PART_PL", value: "koole" },
      ],
      asked: ["kooli"],
    };
    expect(wordLine(kool)).toMatch(/kooli is its omastav \(genitive\), osastav \(partitive\) or sisseütlev \(illative\)/);
  });

  it("is empty where nothing matched, and capped where a paragraph did", () => {
    expect(wordsNote([])).toBe("");
    const many = Array.from({ length: MAX_QUESTION_WORDS + 3 }, (_, i) => ({ ...jalg, lemma: `w${i}` }));
    const note = wordsNote(many);
    expect(note.split("\n").filter((l) => l.startsWith("- ")).length).toBe(MAX_QUESTION_WORDS);
    expect(note).toMatch(/say so rather than guess/);
  });
});
