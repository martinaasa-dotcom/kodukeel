import { describe, expect, it } from "vitest";
import { askedCase } from "./slots";

describe("askedCase", () => {
  it("takes the case a round asked over the card's own", () => {
    // The writing round asked a seesütlev card for the sisseütlev.
    expect(askedCase({ targetCase: "INESSIVE", slot: "ILLATIVE" })).toBe("ILLATIVE");
  });

  it("falls back to the card's case where the slot is not a case", () => {
    expect(askedCase({ targetCase: "INESSIVE", slot: "RECOGNITION" })).toBe("INESSIVE");
    expect(askedCase({ targetCase: null, slot: "IndPrSg3" })).toBeNull();
    expect(askedCase({ targetCase: "PARTITIVE", slot: null })).toBe("PARTITIVE");
    expect(askedCase({ targetCase: "PARTITIVE" })).toBe("PARTITIVE");
  });
});
