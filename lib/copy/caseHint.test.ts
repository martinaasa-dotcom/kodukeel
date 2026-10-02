import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { endingName } from "@/lib/estonian/plainAsk";
import { readableHint } from "./caseHint";

describe("readableHint", () => {
  it("turns the Latin name on a legacy case card into the question it answers", () => {
    expect(readableHint("kaasaütlev, the comitative")).toBe("kaasaütlev: the “with” ending");
    expect(readableHint("seesütlev · the inessive")).toBe("seesütlev: the “in” ending");
  });

  it("reads a name written without its article", () => {
    expect(readableHint("omastav, genitive")).toBe("omastav: the “of” ending");
  });

  it("names every case the table holds", () => {
    for (const spec of CASES) {
      expect(readableHint(`${spec.et}, the ${spec.en.toLowerCase()}`)).toBe(endingName(spec.key));
    }
  });

  it("leaves a hint that names no case exactly as it was stored", () => {
    for (const hint of [
      "astmevaheldus, consonant gradation",
      "verb government, to help",
      "tuba, room",
      "noun",
      null,
      "",
    ]) {
      expect(readableHint(hint)).toBe(hint ? hint : null);
    }
  });

  it("holds no Estonian of its own", () => {
    expect(readableHint("kaasaütlev, the comitative")).toContain("kaasaütlev");
    expect(readableHint("the comitative")).toBe(endingName("COMITATIVE"));
  });
});
