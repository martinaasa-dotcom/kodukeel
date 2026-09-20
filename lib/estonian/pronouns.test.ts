import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { PRONOUN_LEMMAS, isPersonalPronoun, pronounReading, twinsOf } from "./pronouns";

/**
 * The six the course teaches, in the English each role takes, and the pair.
 *
 * What is asserted is that the table answers for words the dictionary really
 * holds, that it refuses everything it was not written for, and that the two
 * spellings of one form are read off the entry rather than typed here.
 */

const entry = (lemma: string) => HARVESTED.find((w) => w.lemma === lemma);
const formsOf = (lemma: string) =>
  (entry(lemma)?.extraForms ?? []).map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value }));

describe("the table is a request against the course", () => {
  it.each(PRONOUN_LEMMAS)("%s is a word the dictionary holds", (lemma) => {
    const word = entry(lemma);
    expect(word, `${lemma} is not in the harvest`).toBeDefined();
    expect(word?.pos).toBe("PRONOUN");
  });

  it("answers for nobody else", () => {
    expect(isPersonalPronoun("see")).toBe(false);
    expect(isPersonalPronoun("kes")).toBe(false);
    expect(isPersonalPronoun("tuba")).toBe(false);
  });
});

describe("pronounReading", () => {
  it("gives English the word it actually uses for each role", () => {
    expect(pronounReading("mina", "NOMINATIVE")).toBe("I");
    expect(pronounReading("mina", "PARTITIVE")).toBe("me");
    expect(pronounReading("mina", "GENITIVE")).toBe("my");
    expect(pronounReading("mina", "ALLATIVE")).toBe("to me");
    expect(pronounReading("mina", "COMITATIVE")).toBe("with me");
  });

  /*
    The one case a course spends a fortnight on: Estonian has no verb for have,
    so the owner takes this ending. The clause is authored per person because
    the frame `caseReading` uses ("the man has it") cannot be reused over a
    pronoun: "he, she have it" is not a sentence.
  */
  it("says the have-construction as a sentence rather than a preposition", () => {
    expect(pronounReading("mina", "ADESSIVE")).toBe("I have it");
    expect(pronounReading("tema", "ADESSIVE")).toBe("he has it, she has it");
  });

  it("says nothing where the English is not one phrase", () => {
    expect(pronounReading("mina", "ELATIVE")).toBeNull();
    expect(pronounReading("mina", "TRANSLATIVE")).toBeNull();
  });

  it("says nothing about a pronoun it was not written for", () => {
    expect(pronounReading("see", "PARTITIVE")).toBeNull();
  });

  /*
    THE ONE THING ENGLISH LOST. `sulle` and `teile` are both "to you" and are
    not the same sentence: every scene in this app is answered in `teie`, so
    this is the pronoun the panel is tapped on most, and two readings that are
    identical teach a learner that the choice does not matter. Both members
    carry the note rather than only the polite one, because the contrast is
    what is being taught and a bare "you" beside a qualified one reads as the
    default rather than as the informal one.
  */
  it("tells the two you's apart, in both directions", () => {
    expect(pronounReading("sina", "NOMINATIVE")).toBe("you (one person you know)");
    expect(pronounReading("teie", "NOMINATIVE")).toBe("you (polite, or more than one)");
    expect(pronounReading("sina", "ALLATIVE")).toBe("to you (one person you know)");
    expect(pronounReading("teie", "ALLATIVE")).toBe("to you (polite, or more than one)");
  });

  /* The note rides on the end, so it reads after a preposition and after the
     have-construction alike rather than landing inside either. */
  it("keeps the note outside the frame", () => {
    expect(pronounReading("teie", "ADESSIVE")).toBe("you have it (polite, or more than one)");
    expect(pronounReading("teie", "GENITIVE")).toBe("your (polite, or more than one)");
  });

  it("marks nobody else, because nobody else is a choice", () => {
    for (const key of ["mina", "tema", "meie", "nemad"] as const) {
      expect(pronounReading(key, "NOMINATIVE")).not.toMatch(/\(/);
    }
  });
});

describe("twinsOf", () => {
  it("hands over the everyday spelling of a headword", () => {
    expect(twinsOf("PRONOUN", formsOf("mina"), "mina").shorter).toBe("ma");
    expect(twinsOf("PRONOUN", formsOf("meie"), "meie").shorter).toBe("me");
    expect(twinsOf("PRONOUN", formsOf("nemad"), "nemad").shorter).toBe("nad");
  });

  it("hands over the long one from the everyday spelling", () => {
    expect(twinsOf("PRONOUN", formsOf("mina"), "ma").longer).toBe("mina");
    expect(twinsOf("PRONOUN", formsOf("mina"), "mul").longer).toBe("minul");
    expect(twinsOf("PRONOUN", formsOf("tema"), "Ta").longer).toBe("tema");
  });

  it("has no opinion about a form with only one spelling", () => {
    expect(twinsOf("PRONOUN", formsOf("mina"), "mind")).toEqual({ shorter: null, longer: null });
  });

  /*
    A comparator that returns 0 hands the answer to whatever order the rows
    arrived in, which is the query plan rather than a fact about Estonian. No
    pronoun the dictionary holds has two parallel spellings of one length; the
    tie-break is what stops that being load-bearing.
  */
  it("settles two spellings of one length rather than taking the row order", () => {
    const forms = [
      { formType: "EKILEX:SgN", value: "xxxx" },
      { formType: "EKILEX:SgN", value: "bbb" },
      { formType: "EKILEX:SgN", value: "aaa" },
    ];
    const reversed = [...forms].reverse();
    expect(twinsOf("PRONOUN", forms, "xxxx").shorter).toBe("aaa");
    expect(twinsOf("PRONOUN", reversed, "xxxx").shorter).toBe("aaa");
  });

  /*
    A noun's parallel form is a spelling variant rather than a register, which
    is `spokenForm`'s own argument: calling one of `haigusi` and `haiguseid`
    the everyday one would be a claim about Estonian nobody has checked.
  */
  it("refuses to call one spelling of a noun the everyday one", () => {
    const forms = [
      { formType: "EKILEX:PlP", value: "haigusi" },
      { formType: "EKILEX:PlP", value: "haiguseid" },
    ];
    expect(twinsOf("NOUN", forms, "haiguseid")).toEqual({ shorter: null, longer: null });
  });
});
