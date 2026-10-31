import { describe, expect, it } from "vitest";

import { readingParagraphs } from "./readingText";

describe("a pasted text as paragraphs of sentences", () => {
  it("splits on a stop, a question and an exclamation, and keeps every word", () => {
    const text = "Tere! Kuidas läheb? Mul läheb hästi. Aitäh.";
    const parts = readingParagraphs(text);
    expect(parts).toEqual([["Tere!", "Kuidas läheb?", "Mul läheb hästi.", "Aitäh."]]);
    expect(parts[0]!.join(" ")).toBe(text);
  });

  it("keeps a closing quote with its sentence and splits paragraphs on a blank line", () => {
    const parts = readingParagraphs("Ta ütles: „Tule homme.“ Ma tulen.\n\nTeine lõik\njätkub siin.");
    expect(parts).toEqual([["Ta ütles: „Tule homme.“", "Ma tulen."], ["Teine lõik jätkub siin."]]);
  });

  it("returns nothing for a text with nothing in it", () => {
    expect(readingParagraphs("  \n\n  ")).toEqual([]);
  });
});
