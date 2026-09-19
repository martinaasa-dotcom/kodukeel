import { describe, expect, it } from "vitest";
import { decoysAmong, type DecoyOption } from "./facts";

const option = (text: string, ...lemmas: string[]): DecoyOption =>
  ({ text, pos: "ADVERB", band: 0, theme: null, senses: [text], lemma: lemmas[0]!, lemmas }) as unknown as DecoyOption;

describe("decoysAmong", () => {
  /*
    `Tere!` and `tere` both read "hello" once the punctuation is off, and the
    option was filed under whichever came first. Narrowed to a module's five
    taught words that lost two of them, fell under four, and handed the first
    evening of the course the whole dictionary.
  */
  it("counts a gloss as taught when any entry behind it is", () => {
    const pool = [
      option("hello", "Tere!", "tere"), option("thank you", "Aitäh!", "aitäh"),
      option("yes", "jah"), option("no, not", "ei"), option("of course", "muidugi"),
      option("like, as", "nagu"), option("knife", "nuga"),
    ];
    const taught = ["tere", "aitäh", "jah", "ei", "muidugi"];
    const narrowed = decoysAmong(pool, taught, 4);
    expect(narrowed.map((o) => o.text)).toEqual(["hello", "thank you", "yes", "no, not", "of course"]);
  });

  it("falls back to the whole pool only where the taught words cannot fill the options", () => {
    const pool = [option("hello", "tere"), option("yes", "jah"), option("knife", "nuga")];
    expect(decoysAmong(pool, ["tere", "jah"], 4)).toHaveLength(3);
    expect(decoysAmong(pool, null, 4)).toHaveLength(3);
  });
});
