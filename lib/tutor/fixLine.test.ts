import { describe, expect, it } from "vitest";
import { dropStrayFixes, isStrayFix } from "./fixLine";

describe("isStrayFix", () => {
  it("keeps a correction of a sentence the learner wrote", () => {
    expect(isStrayFix("Ma elan Tallinnas ja töötan koolis.", "Is this right: Ma elan Tallinnas ja töötan kool.", 5)).toBe(false);
    expect(isStrayFix("Ta helistas **mulle** eile.", "Please correct: Ta helistas mind eile.", 4)).toBe(false);
  });

  it("drops the line under a question that had no sentence to correct", () => {
    expect(isStrayFix("Lugesin raamatut", "Why is it 'Lugesin raamatut' and not 'Lugesin raamatu'?", 2)).toBe(true);
    expect(isStrayFix("Mul ei ole aega.", "How do I say 'I don't have time'?", 0)).toBe(true);
  });

  it("drops a line that hands the learner's own sentence back, whatever the punctuation or bold", () => {
    expect(isStrayFix("**Mul on kaks last.**", "Why is it 'Mul on kaks last' and not 'kaks lapsed'?", 4)).toBe(true);
    expect(isStrayFix("Ma joon kohvi.", "Is this correct: Ma joon kohvi.", 3)).toBe(true);
  });

  it("drops a one-word line, which is a form and not a sentence", () => {
    expect(isStrayFix("sõbraga", "How do you say 'with a friend'?", 1)).toBe(true);
    expect(isStrayFix("tuppa", "Ma lähen tuba, on see õige?", 4)).toBe(true);
  });
});

describe("dropStrayFixes", () => {
  it("takes out only the stray lines and leaves everything else byte for byte", () => {
    const reply = "**Lugesin raamatut** is right.\nFIX: Lugesin raamatut\nVOCAB: raamat | book";
    expect(dropStrayFixes(reply, "Why is it 'Lugesin raamatut'?", 2)).toBe("**Lugesin raamatut** is right.\nVOCAB: raamat | book");
    const kept = "No, it wants the seesütlev.\nFIX: Ma töötan koolis.";
    expect(dropStrayFixes(kept, "Is this ok: Ma töötan kool.", 3)).toBe(kept);
  });
});
