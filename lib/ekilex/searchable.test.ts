import { describe, expect, it } from "vitest";
import { searchableWord } from "./client";

describe("searchableWord", () => {
  it("lets a word through, hyphen, apostrophe and space included", () => {
    for (const word of ["tuba", "põhjas", "grappa'st", "e-post", "tere hommikust"]) expect(searchableWord(word)).toBe(true);
  });

  it("refuses a path segment the URL parser would resolve, and Ekilex's wildcards", () => {
    for (const word of [".", "..", " ... ", "a*", "*", "tub?", "a/b", "%2e%2e", "x#y", "", "   "]) {
      expect(searchableWord(word)).toBe(false);
    }
  });
});
