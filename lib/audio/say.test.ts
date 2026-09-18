import { describe, expect, it } from "vitest";
import { spokenText } from "./say";

/** Every letter and digit, in order, with the punctuation and spacing taken out. */
const said = (text: string) => [...text.toLowerCase()].filter((c) => /[\p{L}\p{N}]/u.test(c)).join("");

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

  it("takes off a mark that cannot finish an utterance rather than writing after it", () => {
    // The cloze round speaks a passage the learner pasted in, so a trailing
    // comma is ordinary. `Tere,.` is not punctuation anybody writes.
    expect(spokenText("Tere,")).toBe("Tere.");
    expect(spokenText("sõna -")).toBe("sõna.");
    // And a colon or a semicolon is a fragment, which is the thing this module
    // exists to stop sending.
    expect(spokenText("Ta ütles:")).toBe("Ta ütles.");
    expect(spokenText("Vanemametnikud on: 9) insener;")).toBe("Vanemametnikud on: 9) insener.");
  });

  it("only ever takes a mark off the end, never one inside the text", () => {
    expect(spokenText("üks, kaks")).toBe("üks, kaks.");
  });

  it("reads past a closing quote or bracket to find the punctuation", () => {
    expect(spokenText('Ta ütles: "Tere."')).toBe('Ta ütles: "Tere."');
    expect(spokenText("(vaata ka)")).toBe("(vaata ka).");
    expect(spokenText("„Järgne mulle!”")).toBe("„Järgne mulle!”");
  });

  it("knows Estonian closes a quotation with the glyph English opens with", () => {
    // „nii“ — U+201C is the *closing* mark here, so the sentence inside has
    // already ended and nothing may be written after it.
    expect(spokenText("Ta ütles: „Tere.“")).toBe("Ta ütles: „Tere.“");
    expect(spokenText("Rida kõlas: „Valentina ...“")).toBe("Rida kõlas: „Valentina ...“");
    // And a quotation with no sentence end inside it still needs one.
    expect(spokenText("Ta ütles: „Tere“")).toBe("Ta ütles: „Tere“.");
  });

  it("moves punctuation and never a letter (ADR-005)", () => {
    const texts = [
      "õde", "Kuidas läheb?", "kass", "Ma ei tea", "šokolaad", "ÕUN", "Tere,",
      "sõna;", "Ta ütles:", "1990", "kaks 3 neli", "(vt ka)", "üks, kaks", "sõna -",
      "Ta ütles nii ...", "„Järgne mulle!”", "aadress ja e-post",
    ];
    for (const text of texts) {
      expect(said(spokenText(text))).toBe(said(text));
    }
  });

  it("never leaves a stop after a mark that is not the end of a sentence", () => {
    for (const mark of [",", ";", ":", " ", "-"]) {
      expect(spokenText(`sõna${mark}`)).toBe("sõna.");
    }
  });

  it("says nothing about nothing, and leaves punctuation alone that has no utterance under it", () => {
    expect(spokenText("")).toBe("");
    expect(spokenText("   ")).toBe("");
    expect(spokenText(",")).toBe(",");
  });

  it("trims what the route would have trimmed", () => {
    expect(spokenText("  kohv  ")).toBe("kohv.");
  });
});
