import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/course/lessons";

import { chunkNote, isChip, pointOf, sentencesOf } from "./chunks";

describe("chunkNote", () => {
  it("cuts a note into sentences, a braced question ending one", () => {
    expect(sentencesOf("{Noh} buys a second: {Noh, kuidas läheb?} {Vaata} asks somebody to listen.")).toEqual([
      "{Noh} buys a second: {Noh, kuidas läheb?}",
      "{Vaata} asks somebody to listen.",
    ]);
  });

  it("keeps a full stop inside braces with the Estonian", () => {
    expect(sentencesOf("Say {Tere. Kuidas läheb} to a friend.")).toEqual(["Say {Tere. Kuidas läheb} to a friend."]);
  });

  it("lifts a list of words after a colon onto a line of their own", () => {
    expect(pointOf("Talk takes the short forms: {ma}, {sa}, {ta} and {pole}.")).toEqual({
      text: "Talk takes the short forms:",
      items: ["ma", "sa", "ta", "pole"],
      gloss: null,
    });
  });

  it("lifts an example and its meaning", () => {
    expect(pointOf("{Ju} turns a sentence into a protest: {Ta ei käi ju kunagi kontserdil}, but he never goes to concerts.")).toEqual({
      text: "{Ju} turns a sentence into a protest:",
      items: ["Ta ei käi ju kunagi kontserdil"],
      gloss: "but he never goes to concerts",
    });
  });

  it("leaves a sentence whole where English follows the colon", () => {
    const s = "The rule is short: say {ma} with friends.";
    expect(pointOf(s)).toEqual({ text: s, items: [], gloss: null });
  });

  it("leaves a sentence whole where no colon sits before the Estonian", () => {
    const s = "{Muide} is by the way, and {täitsa} is totally.";
    expect(pointOf(s)).toEqual({ text: s, items: [], gloss: null });
  });

  it("loses no character of the note", () => {
    const note = "{Nagu} is like, the way English uses it: {nagu ikka}, same as always. {Muide} is by the way, for a new subject, and {täitsa} is totally: {täitsa veider}.";
    const chunks = chunkNote(note);
    expect(chunks).toHaveLength(2);
    const letters = (s: string) => s.replace(/[^\p{L}]/gu, "");
    const back = chunks.map((c) => c.text + c.items.join("") + (c.gloss ?? "")).join("");
    expect(letters(back)).toBe(letters(note));
  });

  it("keeps a sentence whole where the items are a choice", () => {
    const s = "Say it either way: {ma} or {mina}.";
    expect(pointOf(s)).toEqual({ text: s, items: [], gloss: null });
  });

  it("tells a word from a sentence", () => {
    expect(isChip("pole")).toBe(true);
    expect(isChip("ei ole")).toBe(true);
    expect(isChip("Noh, kuidas läheb?")).toBe(false);
  });

  it("loses no letter of any lesson's note, and lifts the Estonian out of many", () => {
    const letters = (s: string) => s.replace(/[^\p{L}]/gu, "");
    let notes = 0;
    let lifted = 0;
    for (const lesson of LESSONS) {
      for (const note of lesson.how.notes ?? []) {
        notes++;
        const chunks = chunkNote(note);
        if (chunks.some((c) => c.items.length > 0)) lifted++;
        // Sentence by sentence: where Estonian was lifted out, the "and" of
        // its list is said by the row of chips rather than written.
        sentencesOf(note).forEach((sentence, i) => {
          const c = chunks[i]!;
          const said = c.items.length > 0
            ? c.text + sentence.slice(c.text.length).replace(/\}(,?\s+and\s+)\{/g, "}{")
            : sentence;
          expect(sentence.startsWith(c.text)).toBe(true);
          expect(letters(c.text + c.items.join("") + (c.gloss ?? "")), note).toBe(letters(said));
        });
      }
    }
    expect(notes).toBeGreaterThan(500);
    expect(lifted).toBeGreaterThan(notes / 4);
  });
});
