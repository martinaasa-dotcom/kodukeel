import { describe, expect, it } from "vitest";
import { plainAskLine } from "./plainAsk";
import { sayLine, sayPhrase } from "./sayIt";

const thing = (lemma: string) => ({ lemma, semanticTypes: null, nomSg: lemma });
const person = (lemma: string) => ({ lemma, semanticTypes: "in_elukutse", nomSg: lemma });

describe("sayPhrase", () => {
  it("asks for the word with its ending said in English", () => {
    expect(sayLine("COMITATIVE", "bird", thing("lind"))).toBe("Say “with the bird”");
    expect(sayPhrase("INESSIVE", "room, chamber", thing("tuba"))).toBe("in the room");
    expect(sayPhrase("ILLATIVE", "house", thing("maja"))).toBe("into the house");
  });

  it("says a person the way English says a person", () => {
    expect(sayPhrase("ALLATIVE", "teacher", person("õpetaja"))).toBe("to the teacher");
    expect(sayPhrase("ALLATIVE", "table", thing("laud"))).toBe("onto the table");
  });

  it("falls back to 'it' rather than guess person or thing", () => {
    expect(sayPhrase("ALLATIVE", "teacher")).toBe("onto it, or to someone");
    expect(sayPhrase("COMITATIVE", "bird")).toBe("with the bird");
    expect(sayPhrase("COMITATIVE")).toBe("with it");
    expect(sayPhrase("PARTITIVE", "water", thing("vesi"))).toBe("some of it");
  });

  it("frames a verb only where English needs no irregular form", () => {
    expect(sayPhrase("IndPrSg1", "to meet")).toBe("I meet");
    expect(sayPhrase("IndPrSg3", "to read")).toBe("he/she reads");
    expect(sayPhrase("IndPrSg3", "to go")).toBe("he/she goes");
    expect(sayPhrase("IndPrSg3", "to study")).toBe("he/she studies");
    expect(sayPhrase("IndPrSg1", "to be")).toBe("I am");
    expect(sayPhrase("KndPrSg1", "to eat")).toBe("I would eat");
    expect(sayPhrase("IndIpfSg1")).toBe("I …, in the past");
  });

  it("has nothing to add to a question about meaning", () => {
    expect(sayPhrase("PRODUCTION", "bird")).toBeNull();
    expect(plainAskLine("PRODUCTION")).toBeNull();
  });

  it("holds no Estonian letter", () => {
    for (const slot of ["COMITATIVE", "INESSIVE", "IndPrSg1", "ImpPrPl2", "PtsPrPs"]) {
      expect(sayLine(slot) ?? "").not.toMatch(/[õäöüšž]/i);
    }
  });
});

describe("a name", () => {
  it("keeps its capital and takes no article", () => {
    expect(sayPhrase("INESSIVE", "America", { lemma: "Ameerika", semanticTypes: null, nomSg: "Ameerika" }))
      .toBe("in America");
    expect(sayPhrase("ILLATIVE", "Estonia")).toBe("into Estonia");
  });
});
