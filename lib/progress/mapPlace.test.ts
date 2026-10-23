import { describe, expect, it } from "vitest";
import { placeQuestionsForWord, type PlaceEntry } from "./map";
import { PLACE_LEMMAS } from "@/lib/games/place";

const places: PlaceEntry[] = PLACE_LEMMAS.map((lemma) => ({
  lemma, cardId: null, sentence: `Raamat on ${lemma} siin.`, form: lemma, en: null,
}));

const chair = {
  id: "1", lemma: "tool", translation: "chair", pos: "NOUN", cefr: "A1", semanticTypes: "ese_mööbel",
  examples: null,
  forms: [
    { formType: "NOM_SG", value: "tool", morphCode: null },
    { formType: "GEN_SG", value: "tooli", morphCode: null },
    { formType: "PART_SG", value: "tooli", morphCode: null },
  ],
};

describe("place questions", () => {
  it("offer the stored genitive with three different place words", () => {
    const qs = placeQuestionsForWord(chair, places, null);
    expect(qs.length).toBe(PLACE_LEMMAS.length);
    let checked = 0;
    for (const q of qs) {
      expect(q.options.length).toBe(3);
      expect(q.options.every((o) => o.text.startsWith("tooli "))).toBe(true);
      expect(new Set(q.options.map((o) => o.key)).size).toBe(3);
      expect(q.options[q.answer]!.key).toBe(q.place);
      checked += 1;
    }
    expect(checked).toBe(qs.length);
  });

  it("are not asked of a person, a word nobody classed, or a word with no picture", () => {
    expect(placeQuestionsForWord({ ...chair, semanticTypes: "in_elukutse" }, places, null)).toEqual([]);
    expect(placeQuestionsForWord({ ...chair, semanticTypes: "in_elukutse koht_asutus" }, places, null)).toEqual([]);
    expect(placeQuestionsForWord({ ...chair, semanticTypes: null }, places, null)).toEqual([]);
    expect(placeQuestionsForWord({ ...chair, lemma: "nopicture" }, places, null)).toEqual([]);
  });

  it("need three place words with a sentence to choose between", () => {
    expect(placeQuestionsForWord(chair, places.slice(0, 2), null)).toEqual([]);
  });

  it("stay inside what a module has taught", () => {
    const scope = { lemmas: ["tool", "peal", "all"], cases: ["GENITIVE"] } as unknown as Parameters<typeof placeQuestionsForWord>[2];
    expect(placeQuestionsForWord(chair, places, scope)).toEqual([]);
    const wider = { lemmas: ["tool", "peal", "all", "ees"], cases: ["GENITIVE"] } as unknown as Parameters<typeof placeQuestionsForWord>[2];
    expect(placeQuestionsForWord(chair, places, wider).length).toBeGreaterThan(0);
    const noGenitive = { lemmas: ["tool", ...PLACE_LEMMAS], cases: [] } as unknown as Parameters<typeof placeQuestionsForWord>[2];
    expect(placeQuestionsForWord(chair, places, noGenitive)).toEqual([]);
  });
});
