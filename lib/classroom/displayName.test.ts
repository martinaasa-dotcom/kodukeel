import { describe, expect, it } from "vitest";

import { cleanDisplayName } from "./displayName";

describe("cleanDisplayName", () => {
  it("refuses a name made of characters nobody can see", () => {
    expect(cleanDisplayName("​​")).toBe("");
  });

  it("takes out a direction override, which can make one row read as another", () => {
    expect(cleanDisplayName("Mari‮kask")).toBe("Marikask");
  });

  it("refuses a row of punctuation, which renders as nothing too", () => {
    expect(cleanDisplayName("...!!")).toBe("");
  });

  it("stores one normalization, so a name compares as itself", () => {
    expect(cleanDisplayName("Jüri")).toBe("Jüri");
  });

  it("collapses the space inside and caps the length", () => {
    expect(cleanDisplayName("  Mari   Kask  ")).toBe("Mari Kask");
    expect(cleanDisplayName("a".repeat(50))).toHaveLength(32);
  });

  it("answers a value that is not a string with nothing, since it arrives off the wire", () => {
    expect(cleanDisplayName(42)).toBe("");
    expect(cleanDisplayName(undefined)).toBe("");
  });
});
