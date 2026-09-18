import { describe, expect, it } from "vitest";
import { spokenText } from "./say";

describe("spokenText", () => {
  it("finishes a bare word, which is what most of this app speaks", () => {
    expect(spokenText("õde")).toBe("õde.");
    expect(spokenText("raamatusse")).toBe("raamatusse.");
  });

  it("leaves a sentence that already ends alone", () => {
    expect(spokenText("Ma lähen poodi.")).toBe("Ma lähen poodi.");
    expect(spokenText("Kuidas läheb?")).toBe("Kuidas läheb?");
    expect(spokenText("Tere hommikust!")).toBe("Tere hommikust!");
    expect(spokenText("Ta ütles nii ...")).toBe("Ta ütles nii ...");
  });

  it("does not turn a question into a statement", () => {
    expect(spokenText("Kus sa oled?")).not.toContain("?.");
  });

  it("reads past a closing quote or bracket to find the punctuation", () => {
    expect(spokenText('Ta ütles: "Tere."')).toBe('Ta ütles: "Tere."');
    expect(spokenText("(vaata ka)")).toBe("(vaata ka).");
  });

  it("changes no letter of the Estonian, only ever appending one stop", () => {
    for (const text of ["õde", "Kuidas läheb?", "kass", "Ma ei tea", "šokolaad", "ÕUN"]) {
      const said = spokenText(text);
      expect(said.startsWith(text.trim())).toBe(true);
      expect(said.length - text.trim().length).toBeLessThanOrEqual(1);
      expect(said.replace(/\.$/u, "")).toBe(text.trim());
    }
  });

  it("says nothing about nothing", () => {
    expect(spokenText("")).toBe("");
    expect(spokenText("   ")).toBe("");
  });

  it("trims what the route would have trimmed", () => {
    expect(spokenText("  kohv  ")).toBe("kohv.");
  });
});
