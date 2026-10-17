import { describe, expect, it } from "vitest";
import { MAX_THINGS, THINGS_PROMPT, orderEntries, parseThingsReply, tidyName } from "./things";

describe("the things in a photo, named in English", () => {
  it("reads the English names out of a reply, tidied, each once", () => {
    expect(parseThingsReply('{"things":["Table","a chair","the Window.","chair","coffee cup"]}'))
      .toEqual(["table", "chair", "window", "coffee cup"]);
  });

  it("reads a reply in a code fence or with prose around it", () => {
    expect(parseThingsReply('Here you go:\n```json\n{"things":["lamp"]}\n```')).toEqual(["lamp"]);
    expect(parseThingsReply('Sure! {"objects":["book","pen"]} Hope that helps.')).toEqual(["book", "pen"]);
  });

  it("drops anything that is not plain English, so the model's Estonian adds nothing", () => {
    expect(parseThingsReply('{"things":["laud","tool","külmkapp","стол","2 cups","a big red sofa by the window","x", 7, null, "fridge"]}'))
      .toEqual(["laud", "tool", "fridge"]);
  });

  it("stops at twelve", () => {
    const names = Array.from({ length: 20 }, (_, i) => `thing${String.fromCharCode(97 + i)}`);
    expect(parseThingsReply(JSON.stringify({ things: names }))).toHaveLength(MAX_THINGS);
    expect(MAX_THINGS).toBe(12);
  });

  it("gives nothing for a reply that is not the shape asked for", () => {
    expect(parseThingsReply("I can see a table and a chair.")).toEqual([]);
    expect(parseThingsReply('{"words":[{"et":"laud"}]}')).toEqual([]);
  });

  it("asks for English only, and writes no Estonian itself", () => {
    expect(THINGS_PROMPT).toMatch(/English only/);
    expect(THINGS_PROMPT).not.toMatch(/[õäöüšž]/i);
    expect(tidyName("  The   Kettle!")).toBe("kettle");
  });
});

describe("which entry leads when a name could be several words", () => {
  const entry = (lemma: string, pos: string, sense: "first" | "later", cefr: string | null = "A1") =>
    ({ lexemeId: lemma, lemma, translation: "", pos, cefr, sense });

  it("leads with the entry whose first sense is the thing, as a noun", () => {
    const ordered = orderEntries([
      entry("tabel", "NOUN", "later"),
      entry("laud", "NOUN", "first"),
      entry("lauda", "VERB", "first"),
    ]);
    expect(ordered.map((e) => e.lemma)).toEqual(["laud", "lauda", "tabel"]);
  });

  it("keeps every entry, so nothing is picked silently", () => {
    const ordered = orderEntries([entry("a", "NOUN", "later", null), entry("b", "NOUN", "later")]);
    expect(ordered.map((e) => e.lemma)).toEqual(["b", "a"]);
    expect(ordered[0]).not.toHaveProperty("sense");
  });
});
