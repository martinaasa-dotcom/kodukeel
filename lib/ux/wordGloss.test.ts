import { describe, expect, it } from "vitest";
import { DEFAULT_WORD_GLOSS, WORD_GLOSS_CHOICES, wordGlossFrom } from "./wordGloss";

describe("wordGlossFrom", () => {
  it("is off when nobody has answered", () => {
    /*
      The one that matters. The underlines were reported as busy, so they are
      something a learner turns on in Settings rather than something every
      sentence carries until somebody finds the way out. Absence is everybody
      who never answered, and they get the plain sentence.
    */
    expect(wordGlossFrom(undefined)).toBe("off");
    expect(wordGlossFrom(null)).toBe("off");
    expect(wordGlossFrom("")).toBe("off");
    expect(DEFAULT_WORD_GLOSS).toBe("off");
  });

  it("is on only when that is what was stored", () => {
    expect(wordGlossFrom("on")).toBe("on");
    expect(wordGlossFrom("off")).toBe("off");
  });

  it("reads anything it does not recognize as the default", () => {
    // A settings value is a string column, so a typo or a value from an older
    // shape of this setting has to land somewhere. It lands on the quiet one.
    for (const junk of ["ON", "true", "1", "shown", "yes", "all"]) {
      expect(wordGlossFrom(junk)).toBe("off");
    }
  });
});

describe("the choice", () => {
  it("offers both answers, each with a reason", () => {
    expect(WORD_GLOSS_CHOICES.map((c) => c.value)).toEqual(["on", "off"]);
    for (const choice of WORD_GLOSS_CHOICES) {
      expect(choice.label.length).toBeGreaterThan(0);
      expect(choice.detail.length).toBeGreaterThan(20);
    }
  });

  it("says what each answer does rather than which is better", () => {
    // Both sides are stated in what happens on screen, for the reason the
    // research panel gives about itself: a card that praises one side is not a
    // choice, it is a nudge with two labels on it.
    for (const choice of WORD_GLOSS_CHOICES) {
      expect(choice.detail).toMatch(/sentence|word/i);
    }
  });
});
