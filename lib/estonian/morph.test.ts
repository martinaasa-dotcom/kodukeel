import { describe, expect, it } from "vitest";
import { formLabel, formName, morphCodeFor, morphCodeOf } from "./morph";

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
