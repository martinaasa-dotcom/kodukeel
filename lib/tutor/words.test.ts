import { describe, expect, it } from "vitest";
import { asksForForms, casesLine, glossAnswers, glossWords, MAX_QUESTION_WORDS, personsLine, questionWords, wordLine, wordsNote, type WordFacts } from "./words";

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
    expect(line).toBe("- jalg (noun, foot, leg): jalg, genitive jala, partitive jalga, plural jalad, genitive plural jalgade, partitive plural jalgu; grade change g : ∅, which is the g in jalg dropping out in jala");
    expect(line).not.toContain("short illative");
  });

  it("prints a verb's five parts and its government", () => {
    expect(wordLine(lugema)).toBe("- lugema (verb, to read): lugema, da-infinitive lugeda, I loen, I (past) lugesin, tud-participle loetud; takes keda/mida* (partitive); present loen, loed, loeb, loeme, loete, loevad; after ei: loe");
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

describe("personsLine and casesLine", () => {
  it("prints a regular verb's present off the stored first person and olema off the stored persons", () => {
    const lugema = { lemma: "lugema", pos: "VERB", translation: "to read", government: null, gradationNote: null,
      forms: [{ formType: "PRES_1SG", value: "loen" }, { formType: "EKILEX:IndIpfSg3", value: "luges" }] };
    expect(personsLine(lugema)).toBe("present loen, loed, loeb, loeme, loete, loevad; after ei: loe; past he/she luges");
    const olema = { lemma: "olema", pos: "VERB", translation: "to be", government: null, gradationNote: null,
      forms: [{ formType: "PRES_1SG", value: "olen" }, { formType: "EKILEX:IndPrSg2", value: "oled" }, { formType: "EKILEX:IndPrSg3", value: "on" },
        { formType: "EKILEX:IndPrPl1", value: "oleme" }, { formType: "EKILEX:IndPrPl2", value: "olete" }, { formType: "EKILEX:IndPrPl3", value: "on" },
        { formType: "EKILEX:IndPrPs_", value: "ole" }, { formType: "EKILEX:IndPrPsN", value: "pole" }] };
    expect(personsLine(olema)).toBe("present olen, oled, on, oleme, olete, on; after ei: ole");
    expect(personsLine({ ...olema, forms: [{ formType: "PRES_1SG", value: "olen" }] })).toBeNull();
  });

  it("names every case after a form, with the attested short illative beside the rule's", () => {
    const tuba = { lemma: "tuba", pos: "NOUN", translation: "room", government: null, gradationNote: "b : ∅",
      forms: [{ formType: "GEN_SG", value: "toa" }, { formType: "PART_SG", value: "tuba" }, { formType: "ILL_SG_SHORT", value: "tuppa" }] };
    const line = casesLine(tuba);
    expect(line).toContain("tuppa / toasse (sisseütlev)");
    expect(line).toContain("toal (alalütlev)");
    expect(line).toContain("toas (seesütlev)");
    expect(casesLine({ ...tuba, forms: [] })).toBeNull();
  });
});

describe("glossWords and glossAnswers", () => {
  it("asks about the English of a question only where no Estonian resolved", () => {
    expect(glossWords(["say", "Tuesday"], [])).toEqual(["say", "Tuesday"]);
    expect(glossWords(["table", "olema"], [{ lemma: "olema", pos: "VERB", translation: "to be", government: null, gradationNote: null, forms: [], asked: ["olema"] }])).toEqual([]);
  });

  it("matches a gloss whole or on its first sense, a verb through its to", () => {
    expect(glossAnswers("Tuesday", "tuesday")).toBe(true);
    expect(glossAnswers("book, volume", "book")).toBe(true);
    expect(glossAnswers("to read, to count", "read")).toBe(true);
    expect(glossAnswers("library", "book")).toBe(false);
    expect(glossAnswers("volume, book", "book")).toBe(false);
  });
});

describe("asksForForms", () => {
  const user = (content: string) => [{ role: "user", content }];
  it("is true for a question about a case, an ending or a form, and false for a sentence to check", () => {
    expect(asksForForms(user("What is the genitive of 'õlu'?"))).toBe(true);
    expect(asksForForms(user("Which ending does koolis have?"))).toBe(true);
    expect(asksForForms(user("Is toas the seesütlev?"))).toBe(true);
    expect(asksForForms(user("Is this right: Ma elan Tallinnas ja töötan kool."))).toBe(false);
  });

  it("tables a nominal only where forms were asked for or the word came through its gloss", () => {
    const tuba: WordFacts = { lemma: "tuba", pos: "NOUN", translation: "room", government: null, gradationNote: null,
      forms: [{ formType: "GEN_SG", value: "toa" }, { formType: "PART_SG", value: "tuba" }, { formType: "ILL_SG_SHORT", value: "tuppa" }], asked: ["toas"] };
    expect(wordsNote([tuba])).not.toContain("; cases ");
    expect(wordsNote([tuba], true)).toContain("; cases ");
    expect(wordsNote([{ ...tuba, asked: [] }])).toContain("; cases ");
    expect(wordsNote([{ ...tuba, pos: "PRONOUN", asked: ["toas"] }])).toContain("; cases ");
  });
});
