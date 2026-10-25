import { describe, expect, it } from "vitest";
import { plainAskLine, sayIn, sayLineIn } from "./plainAsk";
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

  it("agrees with he/she in the past as well as the present", () => {
    // A Russian screen showed "he/she think, but in the past": the past frame
    // had no -s, so the third person read like the first.
    expect(sayPhrase("IndIpfSg3", "to think")).toBe("he/she thinks, but in the past");
    expect(sayPhrase("IndIpfSg1", "to think")).toBe("I think, but in the past");
    for (const slot of ["IndPrSg3", "IndIpfSg3"]) {
      expect(sayPhrase(slot, "to read")).toMatch(/^he\/she reads\b/);
    }
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

describe("on a Russian or Ukrainian screen", () => {
  it("reads the short phrase in that language, never the English one", () => {
    const english = sayPhrase("IndIpfSg3", "to think");
    expect(sayIn("en", "IndIpfSg3", english)).toBe("he/she thinks, but in the past");
    expect(sayIn("ru", "IndIpfSg3", english)).toBe("он/она …, в прошлом");
    expect(sayIn("uk", "IndIpfSg3", english)).toBe("він/вона …, у минулому");
    expect(sayLineIn("ru", "COMITATIVE", sayLine("COMITATIVE", "bird", thing("lind")))).toBe("Скажи «с этим»");
    expect(sayLineIn("uk", "COMITATIVE", sayLine("COMITATIVE", "bird", thing("lind")))).toBe("Скажи «з цим»");
  });

  it("has no phrase where the screen had none", () => {
    expect(sayIn("ru", "COMITATIVE", null)).toBeNull();
    expect(sayLineIn("uk", "PRODUCTION", sayLine("PRODUCTION", "bird"))).toBeNull();
  });

  it("covers every slot an English phrase can be built for", () => {
    for (const slot of ["NOMINATIVE", "GENITIVE", "PARTITIVE", "ILLATIVE", "INESSIVE", "ELATIVE", "ALLATIVE",
      "ADESSIVE", "ABLATIVE", "TRANSLATIVE", "TERMINATIVE", "ESSIVE", "ABESSIVE", "COMITATIVE",
      "IndPrSg1", "IndPrSg3", "IndPrPl1", "IndPrPs_", "IndIpfSg1", "IndIpfSg3", "KndPrSg1",
      "ImpPrSg2", "ImpPrPl2", "Inf", "PtsPrPs"]) {
      for (const locale of ["ru", "uk"] as const) {
        expect(sayIn(locale, slot, "x"), `${slot} in ${locale}`).not.toBeNull();
        expect(sayIn(locale, slot, "x"), `${slot} in ${locale}`).not.toMatch(/[a-z]/i);
      }
    }
  });
});
