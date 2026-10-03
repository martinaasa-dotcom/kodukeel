import { describe, expect, it } from "vitest";
import { PROGRAMMES } from "@/lib/course";
import { scopeFor } from "@/lib/course/scope";
import { caseQuestion } from "./target";

/*
  TARGET ASKS AN ENDING ON THE EVENINGS IT IS DEALT.

  The builder deals Target once four case pages have been read, counting the
  genitive and the partitive, and the question builder skipped both: A2's
  adessive evening had read the genitive, the inessive, the elative, the
  partitive and the adessive, left three cases to build four options from,
  and asked thirty meaning questions and not one ending.
*/
const a2 = PROGRAMMES.find((p) => p.id === "a2.1")!;
const adessive = a2.days.find((d) => d.grammarCase === "ADESSIVE")!;

const raamat = {
  lemma: "raamat",
  translation: "book",
  semanticTypes: "ese",
  forms: [
    { formType: "NOM_SG", morphCode: null, value: "raamat" },
    { formType: "GEN_SG", morphCode: null, value: "raamatu" },
    { formType: "PART_SG", morphCode: null, value: "raamatut" },
  ],
};

describe("a Target question inside the module", () => {
  it("builds on the evening that reads the adessive, from the cases read so far", () => {
    const scope = scopeFor(a2, adessive);
    const read = new Set(scope.cases);
    for (let i = 0; i < 20; i++) {
      const q = caseQuestion(raamat, "card", scope);
      expect(q, "no case question could be built").not.toBeNull();
      expect(read.has(q!.caseKey!)).toBe(true);
      expect(q!.options).toHaveLength(4);
      expect(q!.options).not.toContain("raamat");
    }
  });
});
