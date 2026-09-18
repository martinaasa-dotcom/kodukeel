import { describe, expect, it } from "vitest";
import { plainPhrase, sameSpelling } from "./values";

describe("a word spelled the same in both languages", () => {
  /*
    Twelve of these are taught by the course and thirty are in the shipped
    dictionary. Every screen that prints a word over its meaning printed them
    twice, which reads as a rendering fault rather than as a fact about the
    word.
  */
  it("recognizes an identical gloss", () => {
    for (const word of ["film", "number", "park", "sport", "stress", "argument", "risk"]) {
      expect(sameSpelling(word, word)).toBe(true);
    }
    expect(sameSpelling(" film ", "film")).toBe(true);
  });

  /*
    THE CAPITAL LETTER IS THE LESSON. Estonian writes its months in lower case
    and English does not, so folding case here would delete the one thing those
    five cards teach.
  */
  it("keeps a difference of case, because that is the lesson", () => {
    for (const [et, en] of [["august", "August"], ["november", "November"],
      ["september", "September"], ["islam", "Islam"], ["muslim", "Muslim"]] as const) {
      expect(sameSpelling(et, en)).toBe(false);
    }
  });

  it("says nothing about a gloss that merely contains the word", () => {
    expect(sameSpelling("norm", "norm, quota, standard")).toBe(false);
    expect(sameSpelling("sport", "sport, sports")).toBe(false);
    expect(sameSpelling("", "")).toBe(false);
  });
});

describe("a phrase dropped to the case a card teaches in", () => {
  it("lowers the capital and drops the mark", () => {
    expect(plainPhrase("Tere hommikust!")).toBe("tere hommikust");
    expect(plainPhrase("Aitäh!")).toBe("aitäh");
    expect(plainPhrase("")).toBe("");
  });

  it("keeps a mark a phrase genuinely asks with", () => {
    expect(plainPhrase("Kuidas läheb?")).toBe("kuidas läheb?");
  });

  /*
    THE REPORT THIS WAS WRITTEN FOR. `palun` is glossed as three phrases in
    one string, and reading the first character of the string lowered one of
    them and left the other two shouting: a learner met it on the ladder as
    "please / You're welcome / Here you are", which reads as a rendering fault
    rather than as three ways of saying it. `Vabandust!` was worse, since the
    mark dropped was the one at the very end and the one kept was in the
    middle.
  */
  it("reads every answer in the string, not only the first", () => {
    expect(plainPhrase("Please / You're welcome / Here you are"))
      .toBe("please / you're welcome / here you are");
    expect(plainPhrase("Sorry! / Excuse me!")).toBe("sorry / excuse me");
  });

  /*
    Splitting a string and cleaning each part has to give what cleaning the
    whole string gives, or `lib/srs/cards.ts`, which joins the accepted
    answers itself, and `prisma/repair.ts`, which cleans a back already
    joined, would write two different backs for one card.
  */
  it("agrees with cleaning each answer before they are joined", () => {
    const answers = ["Tere!", "Tere hommikust!", "Head aega!"];
    expect(plainPhrase(answers.join(" / "))).toBe(answers.map(plainPhrase).join(" / "));
  });

  /*
    ONLY THE SEPARATOR, NEVER THE COMMA. A comma separates the senses of an
    ordinary gloss and those carry capitals that are the language rather than
    the app shouting: `vist` is `probably, I think`, `bemar` is `BMW, Beamer`
    and `inglane` is `English person, Englishman`. Lowering those would be
    this app correcting English it did not write, so a sense past the first is
    left exactly as the dictionary holds it.

    THE FIRST SENSE IS STILL LOWERED AND THAT IS A SEPARATE FAULT, written
    down here rather than asserted as though it were wanted: this function
    reaches every gloss in the dictionary and not only a phrase's, so `aprill`
    is taught as `april` and `bemar` as `bMW`. Telling a sentence's own
    capital from the language's needs the part of speech, which this signature
    does not carry. It is not made worse here, and it is not fixed here.
  */
  it("leaves a sense past the first alone, and a spelling variant alone", () => {
    expect(plainPhrase("probably, I think")).toBe("probably, I think");
    expect(plainPhrase("BMW, Beamer").endsWith(", Beamer")).toBe(true);
    expect(plainPhrase("English person, Englishman").endsWith(", Englishman")).toBe(true);
    expect(plainPhrase("Favorite/favourite")).toBe("favorite/favourite");
  });
});
