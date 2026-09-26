import { describe, expect, it } from "vitest";
import { OPENING_CONVERSATION } from "./warmUp";
import { GUIDE } from "./official";

describe("the opening conversation", () => {
  it("is a handful of prompts, in English, with no Estonian to recite", () => {
    expect(OPENING_CONVERSATION.length).toBeGreaterThanOrEqual(3);
    for (const line of OPENING_CONVERSATION) expect(line).not.toMatch(/[õäöüšž]/i);
  });

  it("rests on a fact the guide sources to the Board", () => {
    const facts = GUIDE.flatMap((section) => section.facts);
    const opening = facts.find((fact) => /opens with a short general conversation/.test(fact.text));
    expect(opening?.source).toBe("harnoEt");
  });
});
