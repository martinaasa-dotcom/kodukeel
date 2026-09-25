import { describe, expect, it } from "vitest";
import { caseAccuracy } from "@/lib/stats/history";
import { caseAsked } from "./slots";

describe("caseAsked", () => {
  it("is the case the answer was asked in, where the slot names one", () => {
    // The flash round asks a word in a case on its production card.
    expect(caseAsked({ targetCase: null, slot: "INESSIVE" })).toBe("INESSIVE");
    // A writing answer about the comitative graded on an inessive card.
    expect(caseAsked({ targetCase: "INESSIVE", slot: "COMITATIVE" })).toBe("COMITATIVE");
  });

  it("is no case where the slot asked something else, whatever the card is about", () => {
    expect(caseAsked({ targetCase: "INESSIVE", slot: "RECOGNITION" })).toBeNull();
    expect(caseAsked({ targetCase: null, slot: "IndPrSg3" })).toBeNull();
  });

  it("keeps the card's case on a row written before the slot existed", () => {
    expect(caseAsked({ targetCase: "PARTITIVE", slot: null })).toBe("PARTITIVE");
    expect(caseAsked({ targetCase: null, slot: null })).toBeNull();
  });

  it("puts a round's answers under the case it asked, on the weakest-case figure", () => {
    const rows = [
      ...Array.from({ length: 4 }, () => ({ targetCase: null, slot: "COMITATIVE", rating: 1 })),
      ...Array.from({ length: 4 }, () => ({ targetCase: "INESSIVE", slot: "INESSIVE", rating: 3 })),
    ];
    const read = caseAccuracy(rows.map((r) => ({ targetCase: caseAsked(r), rating: r.rating })));
    expect(read.find((c) => c.grammCase === "COMITATIVE")?.accuracy).toBe(0);
    expect(read.find((c) => c.grammCase === "INESSIVE")?.accuracy).toBe(100);
  });
});
