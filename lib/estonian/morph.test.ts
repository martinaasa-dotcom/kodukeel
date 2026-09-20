import { describe, expect, it } from "vitest";
import { formLabel, formName, morphCodeFor, morphCodeOf, numberFromMorphCode } from "./morph";

/**
 * NAMING A FORM, ON THE ROWS THE SEED ACTUALLY WROTE.
 *
 * This table has been right since it was written and half the dictionary could
 * not reach it. `prisma/seed.ts` writes every retrieved form as
 * `EKILEX:<code>` on `formType` with no `morphCode` at all, so a seeded row
 * fell past the code branch, past the stored table, past `morphName`, and out
 * of `formLabel`'s last line as the bare code: a learner tapped `Ta` in a
 * sentence and was told it was the `SgN` of `tema`. The names were all here.
 */
describe("the shape a row is in", () => {
  it("reads the code off a live fetch", () => {
    expect(morphCodeOf({ morphCode: "SgIn", formType: "EKILEX:SgIn" })).toBe("SgIn");
  });

  it("reads the code out of the formType the seed writes", () => {
    expect(morphCodeOf({ formType: "EKILEX:SgN", morphCode: null })).toBe("SgN");
  });

  it("leaves a stored principal part as the slot it is", () => {
    expect(morphCodeOf({ formType: "GEN_SG", morphCode: null })).toBe("GEN_SG");
  });

  it("has nothing to say about a row carrying neither", () => {
    expect(morphCodeOf({})).toBeNull();
  });
});

describe("formName", () => {
  it("names a seeded retrieved form rather than printing its code", () => {
    expect(formName({ formType: "EKILEX:SgN", morphCode: null })?.et).toBe("nimetav");
    expect(formLabel({ formType: "EKILEX:SgP", morphCode: null })).toMatch(/^osastav \(/);
  });

  it("never lets an internal code reach a screen", () => {
    for (const code of ["SgN", "SgP", "SgIn", "IndPrSg3", "Inf"]) {
      expect(formLabel({ formType: `EKILEX:${code}`, morphCode: null })).not.toBe(code);
    }
  });

  it("still names a live fetch and a stored principal part", () => {
    expect(formName({ morphCode: "IndPrSg3" })?.et).toBe("olevik ta");
    expect(formName({ formType: "PRES_1SG" })?.et).toBe("olevik ma");
  });

  it("keeps a plural plural", () => {
    expect(formName({ formType: "EKILEX:PlIn", morphCode: null })?.et).toBe("mitmuse seesütlev");
  });
});

describe("morphCodeFor", () => {
  it("gives back the code its own table reads", () => {
    expect(morphCodeFor("INESSIVE")).toBe("SgIn");
    expect(morphCodeFor("INESSIVE", true)).toBe("PlIn");
  });

  /*
    The point of reading it backwards rather than typing it again: the search
    works out that `toas` is the seesütlev of `tuba` from the ending and then
    has to name the form it found, and two tables would disagree the first
    time either moved.
  */
  it("names the case the code it hands back names", () => {
    expect(formName({ morphCode: morphCodeFor("ILLATIVE") })?.et).toBe("sisseütlev");
  });
});

/*
  SINGULAR OR PLURAL, OFF EITHER SHAPE THE CODE IS WRITTEN IN.

  Ekilex carries the number as a prefix and the seed's principal parts carry it
  as a suffix, and this read only knew the first. That was a hole under
  `readForm`, which asks through `morphCodeOf` and so does see `GEN_PL`: a
  plural reported as unknown is a plural a singular frame can be printed over
  ("in the room" for `tubades`). Nothing reachable produced one, because
  `caseFromMorphCode` happens to name no case for those codes either, which is
  two tables agreeing by accident rather than a rule.
*/
describe("numberFromMorphCode", () => {
  it("reads Ekilex's own prefix", () => {
    expect(numberFromMorphCode("SgIn")).toBe("SINGULAR");
    expect(numberFromMorphCode("PlIn")).toBe("PLURAL");
  });

  it("reads the suffix the seed's principal parts carry", () => {
    expect(numberFromMorphCode("GEN_SG")).toBe("SINGULAR");
    expect(numberFromMorphCode("PART_PL")).toBe("PLURAL");
    expect(numberFromMorphCode("NOM_PL")).toBe("PLURAL");
  });

  it("reads it off the row through the one reading of a code", () => {
    expect(numberFromMorphCode(morphCodeOf({ formType: "GEN_PL", morphCode: null }))).toBe("PLURAL");
  });

  it("has nothing to say about a code carrying neither", () => {
    expect(numberFromMorphCode("Inf")).toBeNull();
    expect(numberFromMorphCode(null)).toBeNull();
  });
});

/*
  ONE WORD IS NAMED ONE WAY, WHICHEVER TABLE NAMES IT.

  A verb's present reaches a screen two ways: off the Ekilex code for the
  persons a rule derives, and off the stored principal part for the first
  person the harvest keeps. Those are two tables, and the English half of one
  was corrected to name the category rather than the person while the other
  was not, so the panel under a sentence read "olevik ta (present)" for
  `armastab` and "olevik ma (present ma)" for `elan`: the pronoun twice, and
  the second one an Estonian word inside an English gloss.
*/
describe("the two tables that name a verb's present", () => {
  it("names the category in English and the person in Estonian, both ways", () => {
    expect(formName({ formType: "PRES_1SG" })).toEqual({ et: "olevik ma", en: "present" });
    expect(formName({ formType: "EKILEX:IndPrSg3" })).toEqual({ et: "olevik ta", en: "present" });
  });

  it("never says the pronoun twice on a label", () => {
    for (const type of ["PRES_1SG", "PAST_1SG", "EKILEX:IndPrSg1", "EKILEX:IndPrSg3"]) {
      const name = formName({ formType: type })!;
      const person = name.et.split(" ")[1]!;
      expect(name.en, `${type} says ${person} in both halves`).not.toContain(person);
    }
  });
});
