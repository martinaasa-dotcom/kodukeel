import { describe, expect, it } from "vitest";
import { checkTypedSentence } from "./sentenceCheck";

/**
 * THE REPORTED SENTENCE, READ AGAINST THE REAL DICTIONARY AND FORMS LIST.
 *
 * `lib/course/lessons/sentenceCheck.test.ts` drives the judgment over the
 * course's own entries; this is the read in front of it, which decides which
 * rows the judgment is handed. The two faults worth a database are both about
 * that read: a headword the forms list reaches by folding (`aitah` brings
 * `aitäh`), and a phrase stored with its capital (`Palun`) that has to be read
 * as the phrase rather than as "I ask".
 */
const SAMPLE = "Tere! Ma soovin raamatukogukaarti.";

describe("checkTypedSentence", () => {
  it("finds the object left in its plain form, the sentence that was reported", async () => {
    const { findings } = await checkTypedSentence("Tere! Ma soovin raamatukogukaart osta.", SAMPLE);
    expect(findings).toEqual([
      { kind: "object", word: "raamatukogukaart", verb: "osta", partitive: "raamatukogukaarti", genitive: "raamatukogukaardi" },
    ]);
  });

  it("says nothing about the sample, the whole-thing version or a polite one", async () => {
    for (const text of [SAMPLE, "Tere! Ma soovin raamatukogukaardi osta.", "Palun, ma soovin raamatukogukaarti."]) {
      expect((await checkTypedSentence(text, SAMPLE)).findings, text).toEqual([]);
    }
  });

  it("offers a dropped diacritic and a slip of the hand from the dictionary", async () => {
    const { findings } = await checkTypedSentence("Aitah! Ma soovin raamatukogukart.", SAMPLE);
    expect(findings).toEqual([
      { kind: "spelling", word: "Aitah", suggestion: "Aitäh", diacritics: true },
      { kind: "spelling", word: "raamatukogukart", suggestion: "raamatukogukaart", diacritics: false },
    ]);
  });
});
