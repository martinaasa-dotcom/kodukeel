import { describe, expect, it } from "vitest";
import { asideFor, asideOwed, asksPrice, asksToHearAgain, priceOffCard, shrug } from "./aside";
import { buildLexicon, type DictEntry } from "./lexicon";
import type { RoleCard } from "./props";
import type { BeatSpec } from "./types";

/**
 * The other side, caught off guard by a question, against a fixture. Every
 * word here is a course word and every form is the dictionary's.
 */
const ENTRIES: DictEntry[] = [
  { lemma: "teadma", pos: "VERB", cefr: "A1", parts: { INF_MA: "teadma", INF_DA: "teada", PRES_1SG: "tean", PAST_1SG: "teadsin" }, usages: [] },
  { lemma: "minema", pos: "VERB", cefr: "A1", parts: { INF_MA: "minema", INF_DA: "minna", PRES_1SG: "lähen", PAST_1SG: "läksin" }, usages: [] },
  { lemma: "ei", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
  { lemma: "hästi", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
  { lemma: "aitäh", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
  { lemma: "kell", pos: "NOUN", cefr: "A1", parts: { NOM_SG: "kell", GEN_SG: "kella", PART_SG: "kella" }, usages: [] },
  { lemma: "teisipäev", pos: "NOUN", cefr: "A1", parts: { NOM_SG: "teisipäev", GEN_SG: "teisipäeva", PART_SG: "teisipäeva" }, usages: [] },
  { lemma: "jah", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
  { lemma: "see", pos: "PRONOUN", cefr: "A1", parts: { NOM_SG: "see", GEN_SG: "selle", PART_SG: "seda" }, usages: [] },
  { lemma: "maksma", pos: "VERB", cefr: "A1", parts: { INF_MA: "maksma", INF_DA: "maksta", PRES_1SG: "maksan", PAST_1SG: "maksin" }, usages: [] },
  { lemma: "euro", pos: "NOUN", cefr: "A1", parts: { NOM_SG: "euro", GEN_SG: "euro", PART_SG: "eurot" }, usages: [] },
  { lemma: "hind", pos: "NOUN", cefr: "A1", parts: { NOM_SG: "hind", GEN_SG: "hinna", PART_SG: "hinda" }, usages: [] },
  { lemma: "palju", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
];
const LEX = buildLexicon(ENTRIES);

const INSTRUCT: BeatSpec = {
  id: "way", goal: "Say the directions back.", they: "They tell you the way.", move: "instruct",
  topic: ["otse"], needs: [{ kind: "lemma", oneOf: ["otse"] }], required: true, patience: 2, shape: "word",
};
const ASKS_FOR_QUESTION: BeatSpec = {
  ...INSTRUCT, id: "far", goal: "Ask whether it is near.", they: "They wait.", move: "confirm",
  needs: [{ kind: "question" }],
};
const CARD: RoleCard = {
  you: "You.",
  props: [
    { slot: "time", card: "The time", literal: ["14:30"], lemmas: [], shown: [], value: "14:30" },
    { slot: "day", card: "The day", literal: [], lemmas: ["teisipäev"], shown: [], value: "teisipäev", theirs: true },
  ],
};

function input(over: Partial<Parameters<typeof asideFor>[0]> = {}) {
  return {
    asked: "kuhu", spoken: ["ja", "kuhu", "siis"], answered: INSTRUCT, card: CARD, lexicon: LEX,
    more: [], answers: [], ...over,
  };
}

describe("a question the scene did not anticipate", () => {
  it("is nothing where nothing was asked", () => {
    expect(asideFor(input({ asked: null }))).toBeNull();
    expect(asideOwed(input({ asked: null }))).toBe(false);
  });

  it("answers how are you with the two course words", () => {
    const line = asideFor(input({ asked: "kuidas", spoken: ["kuidas", "läheb"] }));
    expect(line?.text).toBe("Hästi, aitäh.");
    // `Kuidas?` on its own is somebody asking to hear it again, not small talk.
    expect(asideFor(input({ asked: "kuidas", spoken: ["kuidas"], more: [] }))).toBeNull();
  });

  it("answers when with the day and the time off the card, the day in the adessive", () => {
    const line = asideFor(input({ asked: "millal", spoken: ["millal"] }));
    expect(line?.text).toBe("Teisipäeval kell 14:30.");
    expect(line?.provenance).toBe("attested");
  });

  it("answers a question after directions with more of the directions", () => {
    const line = asideFor(input({ more: ["Otse edasi ja siis vasakule."] }));
    expect(line).toEqual({ text: "Otse edasi ja siis vasakule.", provenance: "scripted" });
  });

  it("does not answer a question after a greeting with a second greeting", () => {
    const greet: BeatSpec = { ...INSTRUCT, id: "greet", move: "greet" };
    expect(asideFor(input({ answered: greet, more: ["Tere hommikust!"] }))).toBeNull();
    expect(asideOwed(input({ answered: greet }))).toBe(true);
  });

  it("answers a question the beat asked for with the beat's own banked answer", () => {
    const line = asideFor(input({ asked: "kas", answered: ASKS_FOR_QUESTION, answers: ["Jah, see on lähedal."] }));
    expect(line).toEqual({ text: "Jah, see on lähedal.", provenance: "scripted" });
  });

  it("owes nothing for a question the beat says the next move answers", () => {
    const next: BeatSpec = { ...ASKS_FOR_QUESTION, answeredNext: true };
    const asking = input({ asked: "kus", answered: next, answers: [] });
    expect(asideFor(asking)).toBeNull();
    // The directions are the answer to "where is it"; a shrug here would be a person contradicting themselves.
    expect(asideOwed(asking)).toBe(false);
  });

  /*
    AND OWES ONE WHERE THE BEAT SAYS NOTHING OF THE KIND. "Ask about the pay"
    is not answered by "when could you start", and for seven of the eleven
    beats whose goal is to ask something this returned null and reported that
    nothing was owed, so the model was never asked and the shrug never said:
    the learner's question was dropped on the floor and the next question put
    to them instead. Three times running, on the run this was written for.
  */
  it("owes an answer for a question the beat asked for and nothing answered", () => {
    const asking = input({ asked: "kui", answered: ASKS_FOR_QUESTION, answers: [] });
    expect(asideFor(asking)).toBeNull();
    expect(asideOwed(asking)).toBe(true);
  });

  it("owes an answer for a question nothing else can supply, and the shrug is off the course", () => {
    const asking = input({ asked: "miks", spoken: ["miks"], more: [] });
    expect(asideFor(asking)).toBeNull();
    expect(asideOwed(asking)).toBe(true);
    const line = shrug(LEX);
    expect(line?.text).toBe("Ei tea.");
    expect(line?.provenance).toBe("attested");
  });

  it("withholds the shrug whole where the verb cannot be derived", () => {
    const thin = buildLexicon(ENTRIES.filter((e) => e.lemma !== "teadma"));
    expect(shrug(thin)).toBeNull();
  });
});

/*
  A CURVEBALL THAT CHANGES A FACT CARRIES THE FACT. "Kui palju?" at a ticket
  window was answered `Ei tea.`, because no scene dealt a price and nothing
  could say one. The card the aside reads is the one in play, so once the
  price has changed the answer is the new price.
*/
describe("a question about the price", () => {
  const PRICED: RoleCard = {
    ...CARD,
    props: [...CARD.props, { slot: "price", card: "What it costs, in euros.", literal: ["5"], lemmas: ["viis"], shown: ["5 \u20ac"], value: "5", price: true }],
  };

  it("is recognised by a money word or by how much, and by nothing else", () => {
    expect(asksPrice(["kui", "palju"], LEX)).toBe(true);
    expect(asksPrice(["mis", "hind", "on"], LEX)).toBe(true);
    expect(asksPrice(["kas", "see", "maksab"], LEX)).toBe(true);
    expect(asksPrice(["kas", "eurot"], LEX)).toBe(true);
    expect(asksPrice(["kuhu", "siis"], LEX)).toBe(false);
  });

  it("is answered with the price off the card, in a sentence made of course words", () => {
    const line = asideFor(input({ asked: "kui", spoken: ["kui", "palju"], card: PRICED }));
    expect(line?.text).toBe("See maksab 5 eurot.");
    expect(line?.provenance).toBe("attested");
    // And on a turn that missed the beat, where the bank's answer and "more" may not answer.
    expect(asideFor(input({ asked: "mis", spoken: ["mis", "hind", "on"], card: PRICED, missed: true }))?.text)
      .toBe("See maksab 5 eurot.");
  });

  it("is nothing where the scene deals no price, so the question falls through as before", () => {
    expect(asideFor(input({ asked: "kui", spoken: ["kui", "palju"] }))).toBeNull();
    expect(priceOffCard(CARD, LEX)).toBeNull();
  });

  /*
    `Kas 5 eurot?` and `5?` are somebody checking what they heard, and the
    answer to that is yes or no and then the price, not the price stated as
    though nothing had been asked. Whole digit runs, so `15` is not `5`.
  */
  it("answers a price the learner named with yes or no", () => {
    expect(asideFor(input({ asked: "kas", spoken: ["kas", "eurot"], said: "Kas 5 eurot?", card: PRICED }))?.text)
      .toBe("Jah, see maksab 5 eurot.");
    expect(asideFor(input({ asked: "?", spoken: [], said: "4?", card: PRICED, missed: true }))?.text)
      .toBe("Ei, see maksab 5 eurot.");
    expect(asideFor(input({ asked: "?", spoken: [], said: "15?", card: PRICED }))?.text)
      .toBe("Ei, see maksab 5 eurot.");
  });

  it("on a turn that missed, only a fact may answer", () => {
    const more = ["Otse edasi ja siis vasakule."];
    expect(asideFor(input({ more }))?.text).toBe(more[0]);
    expect(asideFor(input({ more, missed: true }))).toBeNull();
    const banked = ["Jah, see on lähedal."];
    expect(asideFor(input({ asked: "kas", answered: ASKS_FOR_QUESTION, answers: banked, missed: true }))).toBeNull();
  });
});

describe("sorry, what?", () => {
  const questions = new Set(["mis", "mida", "kuidas", "kus"]);
  const lex = buildLexicon([...ENTRIES, { lemma: "Vabandust!", pos: "PHRASE", cefr: "A1", parts: {}, usages: [] }]);

  it("is a request to hear the line again, and never owed a shrug", () => {
    expect(asksToHearAgain(["vabandust", "mida"], questions, lex)).toBe(true);
    expect(asksToHearAgain(["mida"], questions, lex)).toBe(true);
    expect(asksToHearAgain(["kuidas"], questions, lex)).toBe(true);
    expect(asksToHearAgain(["mis", "hind", "on"], questions, lex)).toBe(false);
    expect(asksToHearAgain(["vabandust"], questions, lex)).toBe(false);
    expect(asksToHearAgain([], questions, lex)).toBe(false);
  });
});
