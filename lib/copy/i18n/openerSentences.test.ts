import { describe, expect, it } from "vitest";
import { OPENERS, OPENER_WORDS, englishFor } from "@/lib/estonian/openers";
import { OPENER_SENTENCE_KEYS, openerSentence } from "./openerSentences";

describe("Lause algus in Russian and Ukrainian", () => {
  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: has a sentence for every opener and every word, so none falls back to English`, () => {
      for (const opener of OPENERS) expect(OPENER_SENTENCE_KEYS.sentences[locale][opener.id], opener.id).toBeTruthy();
      for (const word of OPENER_WORDS) expect(OPENER_SENTENCE_KEYS.nouns[locale][word.en], word.en).toBeTruthy();
      let built = 0;
      for (const opener of OPENERS) {
        for (const word of OPENER_WORDS) {
          const said = openerSentence(locale, opener.id, word.lemma, englishFor(word, opener));
          expect(said, `${opener.id} ${word.en}`).toMatch(/[Ѐ-ӿ]/);
          expect(said, `${opener.id} ${word.en}`).not.toMatch(/[{}]|[a-z]/);
          built++;
        }
      }
      expect(built).toBe(OPENERS.length * OPENER_WORDS.length);
    });
  }

  it("hands English back exactly", () => {
    const opener = OPENERS[0]!;
    const word = OPENER_WORDS[0]!;
    expect(openerSentence("en", opener.id, word.lemma, englishFor(word, opener))).toBe(englishFor(word, opener));
  });
});
