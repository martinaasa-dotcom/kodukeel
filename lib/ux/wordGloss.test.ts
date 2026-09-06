import { describe, expect, it } from "vitest";
import { DEFAULT_WORD_GLOSS, WORD_GLOSS_CHOICES, wordGlossFrom } from "./wordGloss";

describe("wordGlossFrom", () => {
  it("is on when nobody has answered", () => {
    /*
      The one that matters, and it is `letterBarFrom`'s argument pointed at a
      different setting. A missing row is everybody who used this app before
      the question existed, and reading absence as a refusal would take the
      dictionary out from under every attested sentence in the app in one
      deploy, for people who never asked for that.
    */
    expect(wordGlossFrom(undefined)).toBe("on");
    expect(wordGlossFrom(null)).toBe("on");
    expect(wordGlossFrom("")).toBe("on");
    expect(DEFAULT_WORD_GLOSS).toBe("on");
  });

  it("is off only when that is what was stored", () => {
    expect(wordGlossFrom("off")).toBe("off");
    expect(wordGlossFrom("on")).toBe("on");
  });

  it("reads anything it does not recognize as the default", () => {
    // A settings value is a string column, so a typo or a value from an older
    // shape of this setting has to land somewhere. It lands on the behavior
    // everybody already had.
    for (const junk of ["OFF", "false", "0", "hidden", "no", "none"]) {
      expect(wordGlossFrom(junk)).toBe("on");
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
