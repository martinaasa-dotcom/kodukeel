import { describe, expect, it } from "vitest";
import { cleanDisplayName } from "./displayName";

/*
  The roster is the one screen where a stranger's text sits beside real
  pupils' names, so what CLAUDE.md says about it is tested rather than
  described: invisible names, a name that reverses its neighbour, and an
  argument that is not a string at all.
*/
describe("cleanDisplayName", () => {
  it("refuses a name made of zero-width spaces", () => {
    expect(cleanDisplayName("​​")).toBe("");
  });

  it("strips a right-to-left override rather than keeping it", () => {
    expect(cleanDisplayName("Kadri‮")).toBe("Kadri");
    expect(cleanDisplayName("Ka‮dri")).toBe("Kadri");
  });

  it("refuses a row of punctuation, which renders as nothing to read", () => {
    expect(cleanDisplayName("...")).toBe("");
  });

  it("normalises to NFC, so one name is stored one way", () => {
    expect(cleanDisplayName("Mãrt")).toBe("Mãrt");
  });

  it("answers a value that is not a string with nothing, rather than throwing", () => {
    expect(cleanDisplayName(42)).toBe("");
    expect(cleanDisplayName(null)).toBe("");
  });

  it("keeps an ordinary name, collapsed and capped at thirty-two", () => {
    expect(cleanDisplayName("  Mari   Tamm  ")).toBe("Mari Tamm");
    expect(cleanDisplayName("x".repeat(40))).toHaveLength(32);
  });
});
