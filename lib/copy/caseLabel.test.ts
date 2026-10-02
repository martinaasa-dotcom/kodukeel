import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { caseLabelFor, caseLabelOf } from "./caseLabel";

describe("caseLabelOf", () => {
  it("reads the reported hint as one case, whatever separator it was stored with", () => {
    for (const raw of [
      "alaleütlev , millele? kuhu?", "alaleütlev, millele? kuhu?", "alaleütlev · millele? kuhu?",
      "alaleütlev — millele? kuhu?", "alaleütlev · the allative", "millele? kuhu?",
    ]) {
      const read = caseLabelOf(raw);
      expect(read?.key).toBe("ALLATIVE");
      expect(read?.et).toBe("alaleütlev");
      expect(read?.question).toBe("millele? kuhu?");
      expect(read?.rest).toBeNull();
    }
  });

  it("reads every case by its Estonian name and its question", () => {
    let walked = 0;
    for (const spec of CASES) {
      walked += 1;
      expect(caseLabelOf(`${spec.et}, ${spec.question}`)?.key).toBe(spec.key);
    }
    expect(walked).toBe(CASES.length);
  });

  it("leaves a string that names no case alone", () => {
    for (const raw of ["tuba, room", "astmevaheldus, consonant gradation", "noun", "", null]) {
      expect(caseLabelOf(raw)).toBeNull();
    }
  });

  it("keeps what else the string held", () => {
    expect(caseLabelOf("tool, chair, alaleütlev")?.rest).toBe("tool, chair");
  });

  it("builds a label from a key", () => {
    expect(caseLabelFor("INESSIVE")).toEqual({ key: "INESSIVE", et: "seesütlev", question: "milles? kus?", rest: null });
    expect(caseLabelFor("NOPE")).toBeNull();
  });
});
