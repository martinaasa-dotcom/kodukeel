import { describe, expect, it } from "vitest";
import { clip } from "./clip";

describe("clip", () => {
  it("leaves text under the cap exactly as it was", () => {
    expect(clip("Tere hommikust", 60)).toBe("Tere hommikust");
    expect(clip("", 5)).toBe("");
  });

  it("cuts to the cap counted in characters", () => {
    expect(clip("abcdef", 3)).toBe("abc");
    expect(clip("õäöüšž", 4)).toBe("õäöü");
  });

  it("never keeps half of a character outside the BMP", () => {
    // Four letters and an emoji: in UTF-16 units the emoji sits at 4 and 5,
    // so a unit cut at five kept a lone high surrogate.
    const cut = clip("abcd😀ef", 5);
    expect(cut).toBe("abcd😀");
    expect(/\p{Cs}/u.test(cut)).toBe(false);
  });
});
