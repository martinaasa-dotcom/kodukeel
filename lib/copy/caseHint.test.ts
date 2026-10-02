import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { readableFront, readableHint } from "./caseHint";

describe("readableHint", () => {
  it("turns the Latin name on a legacy case card into the question it answers", () => {
    expect(readableHint("kaasaütlev, the comitative")).toBe("kaasaütlev, with whom? with what?");
    expect(readableHint("seesütlev, the inessive")).toBe(
      "seesütlev, in whom? what is it in? where?",
    );
  });

  it("reads a name written without its article", () => {
    expect(readableHint("omastav, genitive")).toBe("omastav, whose? of what?");
  });

  it("names every case the table holds", () => {
    for (const spec of CASES) {
      expect(readableHint(`${spec.et}, the ${spec.en.toLowerCase()}`)).toBe(
        `${spec.et}, ${spec.questionEn}`,
      );
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
    expect(readableHint("the comitative")).toBe("with whom? with what?");
  });
});

describe("readableFront", () => {
  it("never lets a stored Latin case name reach the card", () => {
    expect(readableFront("tool → allative")).toBe("tool → millele? kuhu?");
    expect(readableFront("tuba → the Inessive")).toBe("tuba → milles? kus?");
    let walked = 0;
    for (const spec of CASES) {
      walked += 1;
      expect(readableFront(`sõna → ${spec.en}`)).not.toMatch(new RegExp(spec.en, "i"));
    }
    expect(walked).toBe(CASES.length);
  });

  it("leaves every other front exactly as it was stored", () => {
    for (const front of ["tool", "Ma istun ____.", "lugema → olevik, ta", "aitama → rektsioon", "tuba → milles? kus?"]) {
      expect(readableFront(front)).toBe(front);
    }
  });
});
