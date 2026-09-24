import { describe, expect, it } from "vitest";
import { cleanDisplayName, DISPLAY_NAME_MAX } from "./displayName";

describe("cleanDisplayName", () => {
  it("refuses anything that is not a string", () => {
    expect(cleanDisplayName(42)).toBe("");
    expect(cleanDisplayName(undefined)).toBe("");
    expect(cleanDisplayName({ toString: () => "Kadri" })).toBe("");
  });

  it("strips the characters that render as nothing or reverse a row", () => {
    expect(cleanDisplayName("​​")).toBe("");
    expect(cleanDisplayName("Kadri‮irdak")).toBe("Kadriirdak");
    expect(cleanDisplayName("  Mari   Mets  ")).toBe("Mari Mets");
  });

  it("needs a letter or a digit", () => {
    expect(cleanDisplayName("...!!")).toBe("");
    expect(cleanDisplayName("Õie")).toBe("Õie");
  });

  it("caps the length in characters and never cuts one in half", () => {
    // Thirty-one letters and then an emoji: the emoji's two UTF-16 units sit
    // at 31 and 32, so a cut counted in units kept half of it.
    const name = `${"a".repeat(DISPLAY_NAME_MAX - 1)}😀tail`;
    const cleaned = cleanDisplayName(name);
    expect(Array.from(cleaned)).toHaveLength(DISPLAY_NAME_MAX);
    expect(cleaned.endsWith("😀")).toBe(true);
    expect(/\p{Cs}/u.test(cleaned)).toBe(false);
  });

  it("does not leave a trailing space where the cap fell", () => {
    const cleaned = cleanDisplayName(`${"a".repeat(DISPLAY_NAME_MAX - 1)} b`);
    expect(cleaned).toBe("a".repeat(DISPLAY_NAME_MAX - 1));
  });
});
