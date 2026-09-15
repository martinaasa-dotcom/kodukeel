import { describe, expect, it } from "vitest";
import { CASES, caseByKey } from "@/lib/estonian/cases";
import { ENDING_OPTIONS, endingOptions } from "./caseEndings";

const spec = (key: string) => caseByKey(key)!;

describe("endingOptions", () => {
  it("leads with the answer", () => {
    expect(endingOptions(spec("INESSIVE"))[0]?.key).toBe("INESSIVE");
  });

  it("offers four, and four different endings", () => {
    for (const answer of CASES.filter((c) => !c.principal)) {
      const options = endingOptions(answer);
      expect(options, answer.key).toHaveLength(ENDING_OPTIONS);
      expect(new Set(options.map((o) => o.suffix)).size, answer.key).toBe(ENDING_OPTIONS);
    }
  });

  it("never offers a case that has no ending", () => {
    // The question is which ending goes on the stem. A principal part is the
    // answer to a different question and would be a free option here.
    for (const answer of CASES.filter((c) => !c.principal)) {
      expect(endingOptions(answer).some((o) => o.principal), answer.key).toBe(false);
    }
  });

  it("offers the near ending rather than a stranger", () => {
    // -s against -st and -sse, which is what a learner actually mixes up, and
    // the whole reason this is ranked rather than drawn.
    const offered = endingOptions(spec("INESSIVE")).map((o) => o.suffix);
    expect(offered).toContain("st");
    expect(offered).toContain("sse");
  });

  it("answers the same way twice", () => {
    // A total comparator, so which three rivals are offered is not decided by
    // ties falling out of the order CASES lists them in.
    expect(endingOptions(spec("ADESSIVE")).map((o) => o.key))
      .toEqual(endingOptions(spec("ADESSIVE")).map((o) => o.key));
  });

  it("asks for fewer where a caller wants fewer, and never fewer than the answer", () => {
    expect(endingOptions(spec("COMITATIVE"), 2)).toHaveLength(2);
    expect(endingOptions(spec("COMITATIVE"), 0)).toHaveLength(1);
  });
});
