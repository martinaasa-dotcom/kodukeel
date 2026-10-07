import { describe, expect, it } from "vitest";
import { isKnownForm, lemmasOfForm } from "@/lib/dict/forms";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { PICTURES, PICTURE_LEMMAS, SENTENCES_PER_PICTURE, pictureById, roundSize } from "./pictures";

const words = (text: string) => [...text.matchAll(ESTONIAN_WORD)].map((m) => m[0].toLowerCase());

describe("the pictures", () => {
  it("are twelve, each with its own key", () => {
    expect(PICTURES).toHaveLength(12);
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(12);
    expect(pictureById("market")?.title).toBe("At the market");
    expect(pictureById("nope")).toBeUndefined();
  });

  it("are rich enough to write five sentences about", () => {
    expect(SENTENCES_PER_PICTURE).toBe(5);
    for (const picture of PICTURES) {
      const drawn = picture.rows.join(" ").split(/\s+/).filter(Boolean);
      expect(drawn.length, `${picture.id} draws too little`).toBeGreaterThanOrEqual(8);
      expect(picture.things.length, `${picture.id} names too little`).toBeGreaterThanOrEqual(7);
    }
  });

  it("only name things that are drawn", () => {
    for (const picture of PICTURES) {
      const drawn = new Set(picture.rows.join(" ").split(/\s+/).filter(Boolean));
      for (const thing of picture.things) {
        expect(drawn.has(thing.emoji), `${picture.id}: ${thing.lemma} (${thing.emoji}) is not in the scene`).toBe(true);
      }
    }
  });

  it("ask only for words the dictionary's forms list knows", async () => {
    for (const lemma of PICTURE_LEMMAS) {
      expect(await isKnownForm(lemma), `${lemma} is not a word the forms list knows`).toBe(true);
    }
  });

  it("show the learner a model sentence made only of words the forms list vouches for", async () => {
    for (const picture of PICTURES) {
      const tokens = words(picture.example.et);
      expect(tokens.length, picture.id).toBeGreaterThanOrEqual(3);
      for (const word of tokens) {
        expect(await isKnownForm(word), `${picture.id}: "${word}" is not a word the forms list knows`).toBe(true);
      }
      expect(picture.example.et.trim()).toMatch(/^\p{Lu}.*[.!?]$/u);
      expect(picture.example.en).toMatch(/^[\x20-\x7E]+$/);
    }
  });

  it("show a model sentence that is about the picture it is shown with", async () => {
    for (const picture of PICTURES) {
      const lemmas = new Set(picture.things.map((t) => t.lemma));
      let about = false;
      for (const word of words(picture.example.et)) {
        if ((await lemmasOfForm(word)).some((l) => lemmas.has(l))) about = true;
      }
      expect(about, `${picture.id}: the example names nothing in the picture`).toBe(true);
    }
  });

  it("show two scenes to a beginner and three to everybody else", () => {
    expect(roundSize("A1")).toBe(2);
    expect(roundSize("A2")).toBe(2);
    expect(roundSize("B1")).toBe(3);
    expect(roundSize("C1")).toBe(3);
  });
});
