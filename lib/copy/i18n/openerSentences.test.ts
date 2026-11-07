import { describe, expect, it } from "vitest";
import { OPENERS, OPENER_VERBS, OPENER_WORDS, englishFor, trackOf, type OpenerWord } from "@/lib/estonian/openers";
import { OPENER_SENTENCE_KEYS, openerSentence } from "./openerSentences";

describe("Lause algus in Russian and Ukrainian", () => {
  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: has a sentence for every opener and every word, so none falls back to English`, () => {
      const nounOpeners = OPENERS.filter((o) => trackOf(o) === "noun");
      for (const opener of nounOpeners) expect(OPENER_SENTENCE_KEYS.sentences[locale][opener.id], opener.id).toBeTruthy();
      for (const word of OPENER_WORDS) expect(OPENER_SENTENCE_KEYS.nouns[locale][word.en], word.en).toBeTruthy();
      let built = 0;
      for (const opener of nounOpeners) {
        for (const word of OPENER_WORDS) {
          const said = openerSentence(locale, opener.id, word.lemma, englishFor(word, opener));
          expect(said, `${opener.id} ${word.en}`).toMatch(/[Ѐ-ӿ]/);
          expect(said, `${opener.id} ${word.en}`).not.toMatch(/[{}]|[a-z]/);
          built++;
        }
      }
      expect(built).toBe(nounOpeners.length * OPENER_WORDS.length);
    });

    it(`${locale}: has a sentence for every verb opener and every verb`, () => {
      const verbOpeners = OPENERS.filter((o) => trackOf(o) === "verb");
      expect(verbOpeners.length).toBeGreaterThan(0);
      let built = 0;
      for (const opener of verbOpeners) {
        for (const v of OPENER_VERBS) {
          const word = { lemma: v.lemma, en: v.base, a: v.to, the: v.ing, pl: v.ing } as OpenerWord;
          const said = openerSentence(locale, opener.id, v.lemma, englishFor(word, opener));
          expect(said, `${opener.id} ${v.base}`).toMatch(/[Ѐ-ӿ]/);
          expect(said, `${opener.id} ${v.base}`).not.toMatch(/[{}]|[a-z]/);
          built++;
        }
      }
      expect(built).toBe(verbOpeners.length * OPENER_VERBS.length);
    });
  }

  it("hands English back exactly", () => {
    const opener = OPENERS[0]!;
    const word = OPENER_WORDS[0]!;
    expect(openerSentence("en", opener.id, word.lemma, englishFor(word, opener))).toBe(englishFor(word, opener));
  });
});
