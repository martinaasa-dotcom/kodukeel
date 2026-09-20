import { describe, expect, it } from "vitest";
import { readForm, type FormRow, type WordSeen } from "./formReading";

/**
 * The one reading of a form, over the rows the seed really wrote.
 *
 * Every form here is in the shape `prisma/seed.ts` lays down — the principal
 * parts by name and the retrieved table as `EKILEX:<code>` with no `morphCode`
 * — because that is the shape the panel under a sentence is handed and the
 * shape every one of these tables used to fall past.
 */

const rows = (...pairs: [string, string][]): FormRow[] =>
  pairs.map(([formType, value]) => ({ formType, value, morphCode: null }));

const TUBA = rows(
  ["NOM_SG", "tuba"], ["GEN_SG", "toa"], ["PART_SG", "tuba"], ["ILL_SG_SHORT", "tuppa"],
);

const word = (over: Partial<WordSeen> = {}): WordSeen => ({
  lemma: "tuba", pos: "NOUN", gloss: "room", semanticTypes: null, forms: TUBA, ...over,
});

const seeded = (code: string) => ({ formType: `EKILEX:${code}`, morphCode: null });

describe("readForm", () => {
  it("reads a noun's ending the way build-a-word reads it", () => {
    expect(readForm(seeded("SgIn"), word(), "toas").reading).toBe("in the room");
    expect(readForm(seeded("SgEl"), word(), "toast").reading).toBe("out of the room");
  });

  /*
    The reading a report was filed about: the panel handed over the headword's
    whole gloss, which for `mina` is both answers at once.
  */
  it("gives a pronoun the English word this role takes", () => {
    const forms = rows(
      ["NOM_SG", "mina"], ["GEN_SG", "minu"], ["PART_SG", "mind"],
      ["EKILEX:SgN", "ma"], ["EKILEX:SgAll", "minule"], ["EKILEX:SgAll", "mulle"],
    );
    const mina = word({ lemma: "mina", pos: "PRONOUN", gloss: "I, me", forms });
    expect(readForm({ formType: "PART_SG" }, mina, "mind").reading).toBe("me");
    expect(readForm({ formType: "GEN_SG" }, mina, "minu").reading).toBe("my");
    expect(readForm(seeded("SgAll"), mina, "mulle").reading).toBe("to me");
    // The short nominative is a second spelling the case index does not hold,
    // so the form the match came back with is what answers for it.
    expect(readForm(seeded("SgN"), mina, "ma").reading).toBe("I");
  });

  it("says nothing about a pronoun English spells one way", () => {
    const see = word({
      lemma: "see", pos: "PRONOUN", gloss: "this, it",
      forms: rows(["NOM_SG", "see"], ["GEN_SG", "selle"], ["PART_SG", "seda"]),
    });
    expect(readForm({ formType: "PART_SG" }, see, "seda").reading).toBeNull();
  });

  /*
    THE RULE THAT MAKES THIS SAFE. `kohvi` is stored as the omastav of `kohv`
    and is also its osastav: a panel keyed on the row the match came back with
    read `Ma joon kohvi` as "of the coffee", which is the wrong half of a word
    the learner is looking straight at.
  */
  it("names nothing where more than one case spells the word that way", () => {
    const kohv = word({
      lemma: "kohv", pos: "NOUN", gloss: "coffee",
      forms: rows(["NOM_SG", "kohv"], ["GEN_SG", "kohvi"], ["PART_SG", "kohvi"]),
    });
    expect(readForm({ formType: "GEN_SG" }, kohv, "kohvi")).toEqual({ reading: null, clause: null });
  });

  /*
    "the man" is narrower than "man, husband" and buys an article nobody asked
    for, and the gloss is already the answer to what the headword means.
  */
  it("leaves the headword to the gloss the dictionary already wrote", () => {
    expect(readForm({ formType: "NOM_SG" }, word(), "tuba")).toEqual({ reading: null, clause: null });
    const mees = word({
      lemma: "mees", pos: "NOUN", gloss: "man, husband",
      forms: rows(["NOM_SG", "mees"], ["GEN_SG", "mehe"], ["PART_SG", "meest"]),
    });
    expect(readForm({ formType: "NOM_SG" }, mees, "Mees").reading).toBeNull();
  });

  it("reads a form only one case claims", () => {
    expect(readForm({ formType: "GEN_SG" }, word(), "toa").reading).toBe("of the room");
  });

  /*
    A frame drops one English noun into "in the %", and the gloss it is given
    is the headword's, which is singular. "in the room" over `tubades` is wrong
    in the one way a learner cannot catch.
  */
  it("leaves a plural to its name rather than reading it as one thing", () => {
    const plural = readForm(seeded("PlIn"), word(), "tubades");
    expect(plural.reading).toBeNull();
    expect(plural.clause).toBe("when something is inside it");
  });

  /*
    AND A PLURAL THE SEED NAMED ITS OWN WAY IS STILL A PLURAL.

    A principal part carries its number as a suffix (`PART_PL`) where the
    retrieved table carries it as a prefix (`PlP`), and the guard above read
    only the prefix. What saved it was `caseFromMorphCode` naming no case for
    those codes either, so a spelling the *index* settles is where it would
    have shown: `toad` is claimed as a plural by its row and by nothing in the
    singular table. `numberFromMorphCode` reads both shapes now, so the guard
    holds whichever table looks at the row first.
  */
  it("reads the seed's own plural names as plural too", () => {
    /*
      Spelled so nobody could mistake it for Estonian, because the collision is
      what is under test rather than any word: a plural stored under the seed's
      own name whose spelling the singular index also settles. `xurras` is read
      as the seesütlev of `xurr` by the index and is a partitive plural by its
      row, which is the one arrangement where the guard is load-bearing.
    */
    const forms = [
      { formType: "NOM_SG", value: "xurr", morphCode: null },
      { formType: "GEN_SG", value: "xurra", morphCode: null },
      { formType: "PART_SG", value: "xurra", morphCode: null },
      { formType: "PART_PL", value: "xurras", morphCode: null },
    ];
    const made = word({ lemma: "xurr", gloss: "widget", forms });
    expect(readForm({ formType: "EKILEX:SgIn" }, made, "xurras").reading).toBe("in the widget");
    expect(readForm({ formType: "PART_PL" }, made, "xurras").reading).toBeNull();
  });

  /*
    `caseIsUnsaidFor`'s rule, asked here so that a panel cannot say a sentence
    the rest of the app refuses to build a card out of.
  */
  it("never puts a person inside something", () => {
    const teacher = word({
      lemma: "õpetaja", pos: "NOUN", gloss: "teacher", semanticTypes: "in_elukutse",
      forms: rows(["NOM_SG", "õpetaja"], ["GEN_SG", "õpetaja"], ["PART_SG", "õpetajat"]),
    });
    expect(readForm(seeded("SgIn"), teacher, "õpetajas").reading).toBeNull();
    expect(readForm(seeded("SgAll"), teacher, "õpetajale").reading).toBe("to the teacher");
  });
});

describe("the clause under a form no phrase reads", () => {
  it("explains the case a reading is deliberately withheld from", () => {
    const raamat = word({
      lemma: "raamat", pos: "NOUN", gloss: "book",
      forms: rows(["NOM_SG", "raamat"], ["GEN_SG", "raamatu"], ["PART_SG", "raamatut"]),
    });
    expect(readForm({ formType: "PART_SG" }, raamat, "raamatut").clause)
      .toBe("when you mean some of it, or an action not finished");
  });

  it("explains a person of a verb, which no frame reads", () => {
    const lugema = word({
      lemma: "lugema", pos: "VERB", gloss: "to read",
      forms: rows(["INF_MA", "lugema"], ["PRES_1SG", "loen"]),
    });
    expect(readForm(seeded("IndPrSg3"), lugema, "loeb").clause)
      .toBe("about somebody else, happening now");
  });

  it("says nothing rather than guessing at a slot nobody wrote a sentence for", () => {
    const lugema = word({ lemma: "lugema", pos: "VERB", gloss: "to read", forms: rows(["INF_MA", "lugema"]) });
    expect(readForm(seeded("Sup"), lugema, "lugema")).toEqual({ reading: null, clause: null });
  });
});
