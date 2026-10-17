import { describe, expect, it } from "vitest";
import { editCounts } from "./edits";

describe("editCounts", () => {
  it("counts nothing changed where the box was sent as heard", () => {
    expect(editCounts("kohvi palun", "Kohvi, palun.")).toEqual({ wordsHeard: 2, wordsChanged: 0 });
  });
  it("counts a word the learner rewrote", () => {
    expect(editCounts("kohvi balun", "kohvi palun")).toEqual({ wordsHeard: 2, wordsChanged: 1 });
  });
  it("counts a word said twice and kept once as one change", () => {
    expect(editCounts("jah jah see on kõik", "jah see on kõik")).toEqual({ wordsHeard: 5, wordsChanged: 1 });
  });
  it("counts a word added by hand as no change to what was heard", () => {
    expect(editCounts("kohvi", "kohvi palun")).toEqual({ wordsHeard: 1, wordsChanged: 0 });
  });
  it("is nought over nought where nothing was heard", () => {
    expect(editCounts("", "tere")).toEqual({ wordsHeard: 0, wordsChanged: 0 });
  });
});
