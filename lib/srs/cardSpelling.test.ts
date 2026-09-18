import { describe, expect, it } from "vitest";
import { spellingFor } from "./cardSpelling";

const say = (
  cardType: "RECOGNITION" | "PRODUCTION",
  front: string, back: string,
  lemma: string, translation: string, pos: string,
) => {
  const got = spellingFor({ cardType, front, back }, { lemma, translation, pos });
  return `${got.front} | ${got.back}`;
};

describe("the spelling a card should be holding", () => {
  /*
    While `plainPhrase` read the first character of whatever it was handed, it
    lowered a capital that belongs to English or to Estonian. A card row keeps
    the text it was built with, so a deck built then still asks for `april`.
  */
  it("restores a capital the builder no longer drops", () => {
    expect(say("RECOGNITION", "aprill", "april", "aprill", "April", "NOUN"))
      .toBe("aprill | April");
    expect(say("PRODUCTION", "april", "aprill", "aprill", "April", "NOUN"))
      .toBe("April | aprill");
    expect(say("RECOGNITION", "eesti", "estonia", "Eesti", "Estonia", "NOUN"))
      .toBe("Eesti | Estonia");
    expect(say("RECOGNITION", "jaanipäev", "midsummer Day", "jaanipäev", "Midsummer Day", "NOUN"))
      .toBe("jaanipäev | Midsummer Day");
    expect(say("RECOGNITION", "ma ei saa aru", "i don't understand",
      "Ma ei saa aru", "I don't understand", "PHRASE"))
      .toBe("ma ei saa aru | I don't understand");
  });

  /*
    EACH COLUMN AGAINST ITS OWN SIDE OF THE CARD. Five shipped entries are one
    string in both languages once the case is folded, so a single pool of
    spellings lets a recognition card's Estonian front adopt the English
    gloss's capital and teach `August` as the Estonian word. Found by driving
    the rule over real shapes rather than by reading it.
  */
  it("never lets one side of the card adopt the other's spelling", () => {
    for (const [et, en] of [["august", "August"], ["november", "November"],
      ["september", "September"], ["islam", "Islam"], ["muslim", "Muslim"]] as const) {
      expect(say("RECOGNITION", et, et, et, en, "NOUN")).toBe(`${et} | ${en}`);
      expect(say("PRODUCTION", et, et, et, en, "NOUN")).toBe(`${en} | ${et}`);
    }
  });

  /* The phrase card this all started as, and the mark it used to keep. */
  it("still drops a phrase's capital and mark, every answer of it", () => {
    expect(say("RECOGNITION", "Tere hommikust!", "Good morning!",
      "Tere hommikust!", "Good morning!", "PHRASE"))
      .toBe("tere hommikust | good morning");
    expect(say("RECOGNITION", "palun", "please / You're welcome / Here you are",
      "Palun", "Please / You're welcome / Here you are", "PHRASE"))
      .toBe("palun | please / you're welcome / here you are");
    expect(say("RECOGNITION", "Vabandust!", "sorry! / Excuse me",
      "Vabandust!", "Sorry! / Excuse me!", "PHRASE"))
      .toBe("vabandust | sorry / excuse me");
  });

  /*
    It may only ever change the capitals and the mark. A card holding a
    different word is a card this has nothing to say about: rewriting one
    would be the repair deciding what a card asks, which is the builder's.
    And a back widened by `repairProductionBacks` keeps every answer it was
    widened to.
  */
  it("leaves a different answer, and a widened back, exactly as they are", () => {
    expect(say("RECOGNITION", "kohv", "something else entirely", "kohv", "coffee", "NOUN"))
      .toBe("kohv | something else entirely");
    expect(say("PRODUCTION", "and", "ja / ning", "ja", "and", "ADVERB"))
      .toBe("and | ja / ning");
  });

  it("settles on the second run", () => {
    const shapes: [Parameters<typeof say>[0], string, string, string, string, string][] = [
      ["RECOGNITION", "aprill", "april", "aprill", "April", "NOUN"],
      ["RECOGNITION", "Vabandust!", "sorry! / Excuse me", "Vabandust!", "Sorry! / Excuse me!", "PHRASE"],
      ["PRODUCTION", "august", "august", "august", "August", "NOUN"],
    ];
    for (const [type, front, back, lemma, translation, pos] of shapes) {
      const once = spellingFor({ cardType: type, front, back }, { lemma, translation, pos });
      const twice = spellingFor({ cardType: type, ...once }, { lemma, translation, pos });
      expect(twice).toEqual(once);
    }
  });
  /*
    AND A CARD WHOSE FRONT IS A SENTENCE IS NOT THIS FUNCTION'S TO TOUCH.
    Only `prisma/repair.ts`'s own `where` clause kept it away from one, in
    another file, with nothing tying the two together. Driven over the real
    shapes, a CLOZE card of a phrase entry came back as
    `tere hommikust! Kuidas läheb?`: the reported fault inside a sentence a
    lexicographer wrote. Every other card type keeps the text it had, so a
    caller that has not read the `where` clause cannot break one.
  */
  it("keeps a card it does not answer for exactly as it is", () => {
    const phrase = { lemma: "Tere hommikust!", translation: "Good morning!", pos: "PHRASE" };
    for (const cardType of ["CLOZE", "CASE_FORM", "GRADATION", "GOVERNMENT", "CONJUGATION", "WHATEVER"]) {
      const card = { cardType, front: "Tere hommikust! Kuidas läheb?", back: "Tere hommikust!" };
      expect(spellingFor(card, phrase)).toEqual({ front: card.front, back: card.back });
    }
  });

  /*
    And the two it does answer for are still answered, or the guard above
    would be a way of doing nothing at all.
  */
  it("still answers for the two the repair sends it", () => {
    expect(say("RECOGNITION", "Tere hommikust!", "Good morning!", "Tere hommikust!", "Good morning!", "PHRASE"))
      .toBe("tere hommikust | good morning");
    expect(say("PRODUCTION", "Good morning!", "Tere hommikust!", "Tere hommikust!", "Good morning!", "PHRASE"))
      .toBe("good morning | tere hommikust");
  });
});
