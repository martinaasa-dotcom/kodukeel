import { describe, expect, it } from "vitest";
import { plainPhrase, sameSpelling, SpelledCount, spelledCount } from "./values";

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
    expect(plainPhrase("Tere hommikust!", "PHRASE")).toBe("tere hommikust");
    expect(plainPhrase("Aitäh!", "PHRASE")).toBe("aitäh");
    expect(plainPhrase("", "PHRASE")).toBe("");
  });

  it("keeps a mark a phrase genuinely asks with", () => {
    expect(plainPhrase("Kuidas läheb?", "PHRASE")).toBe("kuidas läheb?");
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
    expect(plainPhrase("Please / You're welcome / Here you are", "PHRASE"))
      .toBe("please / you're welcome / here you are");
    expect(plainPhrase("Sorry! / Excuse me!", "PHRASE")).toBe("sorry / excuse me");
  });

  /*
    Splitting a string and cleaning each part has to give what cleaning the
    whole string gives, or `lib/srs/cards.ts`, which joins the accepted
    answers itself, and `prisma/repair.ts`, which cleans a back already
    joined, would write two different backs for one card.
  */
  it("agrees with cleaning each answer before they are joined", () => {
    const answers = ["Tere!", "Tere hommikust!", "Head aega!"];
    expect(plainPhrase(answers.join(" / "), "PHRASE"))
      .toBe(answers.map((a) => plainPhrase(a, "PHRASE")).join(" / "));
  });

  /*
    NEVER THE COMMA. A comma separates the senses of one gloss and a sense
    past the first is not a new sentence, so there is nothing there to lower
    even on a phrase. A slash with no spaces round it is one answer spelled
    two ways, which is how the dictionary writes `favorite/favourite`.
  */
  it("leaves a sense past the first alone, and a spelling variant alone", () => {
    expect(plainPhrase("Probably, I think", "PHRASE")).toBe("probably, I think");
    expect(plainPhrase("Favorite/favourite", "PHRASE")).toBe("favorite/favourite");
  });

  /*
    A WORD'S CAPITAL IS THE LANGUAGE'S, NOT THE APP SHOUTING. The lowering was
    argued as safe "because no phrase in it opens on a proper noun" and was
    then run over the lemma and the gloss of every word the app teaches. It
    reached 166 shipped entries and 30 of the course's own 1,514 words:
    `aprill` was taught as `april`, `jaanipäev` as `midsummer Day`, and `Eesti`
    came out as `eesti`, which is a different word.
  */
  it("leaves a word alone, whatever its capital", () => {
    for (const [gloss, pos] of [["April", "NOUN"], ["Monday", "NOUN"], ["Estonia", "NOUN"],
      ["Midsummer Day", "NOUN"], ["BMW, Beamer", "NOUN"], ["English person, Englishman", "NOUN"],
      ["I", "PRONOUN"], ["probably, I think", "ADVERB"]] as const) {
      expect(plainPhrase(gloss, pos)).toBe(gloss);
    }
    expect(plainPhrase("Eesti", "NOUN")).toBe("Eesti");
    expect(plainPhrase("Tere hommikust!", "NOUN")).toBe("Tere hommikust!");
  });

  /*
    AND A PHRASE CAN OPEN ON THE ONE ENGLISH WORD THAT IS ALWAYS CAPITAL, so
    holding the lowering to a phrase is not enough on its own: two of the
    first twenty cards anybody meets were dealt as `i don't understand` and
    `i am learning Estonian`.
  */
  it("never lowers the English pronoun", () => {
    expect(plainPhrase("I don't understand", "PHRASE")).toBe("I don't understand");
    expect(plainPhrase("I am learning Estonian", "PHRASE")).toBe("I am learning Estonian");
    expect(plainPhrase("I'm sorry", "PHRASE")).toBe("I'm sorry");
    expect(plainPhrase("I", "PHRASE")).toBe("I");
    // And it is the pronoun rather than any capital I.
    expect(plainPhrase("Ice cream, please", "PHRASE")).toBe("ice cream, please");
    expect(plainPhrase("Italy", "PHRASE")).toBe("italy");
  });

  /*
    AND THE LESSON THE CHECK ABOVE EXISTS TO PROTECT WAS BEING DELETED ONE
    FUNCTION UPSTREAM. `sameSpelling` is exact and never case-insensitive
    because Estonian writes its months in lower case and English does not, and
    the capital is the one thing those cards teach. Every screen that prints a
    word over its meaning runs both sides through `plainPhrase` first, which
    folded the case, so `august` and `November` arrived at the check as one
    string and five shipped entries printed "Spelled the same in English."
    instead of their gloss: august, november, september, islam, muslim.
  */
  it("does not fold the case that sameSpelling is measuring", () => {
    for (const [et, en] of [["august", "August"], ["november", "November"],
      ["september", "September"], ["islam", "Islam"], ["muslim", "Muslim"]] as const) {
      expect(sameSpelling(plainPhrase(et, "NOUN"), plainPhrase(en, "NOUN"))).toBe(false);
    }
    // And a word that really is spelled the same still says so.
    expect(sameSpelling(plainPhrase("film", "NOUN"), plainPhrase("film", "NOUN"))).toBe(true);
  });

  /*
    Running it twice has to give what running it once gives: `prisma/repair.ts`
    rewrites cards with it on every seed, and its own integration test asserts
    the second run changes nothing.
  */
  it("is idempotent", () => {
    for (const text of ["Tere hommikust!", "Please / You're welcome / Here you are",
      "Sorry! / Excuse me!", "I don't understand", "April"]) {
      expect(plainPhrase(plainPhrase(text, "PHRASE"), "PHRASE")).toBe(plainPhrase(text, "PHRASE"));
    }
  });
});

describe("spelledCount", () => {
  it("spells a small count and prints a large one as digits", () => {
    expect(spelledCount(0)).toBe("no");
    expect(spelledCount(4)).toBe("four");
    expect(spelledCount(14)).toBe("fourteen");
    expect(spelledCount(20)).toBe("twenty");
    expect(spelledCount(21)).toBe("21");
  });

  it("never spells what is not a count", () => {
    expect(spelledCount(-1)).toBe("-1");
    expect(spelledCount(2.5)).toBe("2.5");
  });

  it("opens a sentence on a capital", () => {
    expect(SpelledCount(2)).toBe("Two");
    expect(SpelledCount(21)).toBe("21");
  });
});
