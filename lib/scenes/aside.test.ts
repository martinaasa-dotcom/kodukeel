import { describe, expect, it } from "vitest";
import { asideFor, asideOwed, asksPrice, asksToHearAgain, priceAsked, priceOffCard, shrug, shrugFits } from "./aside";
import { buildLexicon, words, type DictEntry } from "./lexicon";
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
  { lemma: "kuus", pos: "NUMERAL", cefr: "A1", parts: { NOM_SG: "kuus", GEN_SG: "kuue", PART_SG: "kuut" }, usages: [] },
  { lemma: "kus", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
  { lemma: "kas", pos: "ADVERB", cefr: "A1", parts: {}, usages: [] },
  { lemma: "mis", pos: "PRONOUN", cefr: "A1", parts: { NOM_SG: "mis", GEN_SG: "mille", PART_SG: "mida" }, usages: [] },
  {
    lemma: "sina", pos: "PRONOUN", cefr: "A1", parts: { NOM_SG: "sina", GEN_SG: "sinu", PART_SG: "sind" },
    extraForms: [{ code: "SgN", value: "sa" }, { code: "SgAd", value: "sul" }], usages: [],
  },
  { lemma: "elama", pos: "VERB", cefr: "A1", parts: { INF_MA: "elama", INF_DA: "elada", PRES_1SG: "elan", PAST_1SG: "elasin" }, usages: [] },
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

  it("never reads the new price as the day: it is theirs and it has a word, and it is not a day", () => {
    const price = { slot: "price2", card: "What it costs now.", literal: ["6"], lemmas: ["kuus"], shown: ["6 €"], value: "6", price: true as const, theirs: true as const };
    const time = CARD.props[0]!;
    const day = CARD.props[1]!;
    // A clerk asked "when?" answered `Kuuel.`, "at six", off the price.
    expect(asideFor(input({ asked: "millal", spoken: ["millal"], card: { you: "You.", props: [price, time] } }))?.text).toBe("Kell 14:30.");
    expect(asideFor(input({ asked: "millal", spoken: ["millal"], card: { you: "You.", props: [price, time, day] } }))?.text).toBe("Teisipäeval kell 14:30.");
    expect(asideFor(input({ asked: "millal", spoken: ["millal"], card: { you: "You.", props: [price] }, answered: ASKS_FOR_QUESTION }))?.text).not.toBe("Kuuel.");
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
    const line = shrug({ ...asking, already: new Set() });
    expect(line?.text).toBe("Ei tea.");
    expect(line?.provenance).toBe("attested");
  });

  it("withholds the shrug whole where the verb cannot be derived", () => {
    const thin = buildLexicon(ENTRIES.filter((e) => e.lemma !== "teadma"));
    expect(shrug(input({ asked: "miks", spoken: ["miks"], lexicon: thin }))).toBeNull();
  });

  /*
    A chatty learner who tucked small talk into four answers met `Ei tea.`
    four times, the commonest fault the keyless critic found. Once a run, and
    then the other side gets on with what they were doing.
  */
  it("shrugs once a conversation and not again", () => {
    const asking = input({ asked: "miks", spoken: ["miks"] });
    expect(shrug({ ...asking, already: new Set(["Tere!"]) })?.text).toBe("Ei tea.");
    expect(shrug({ ...asking, already: new Set(["Tere!", "Ei tea."]) })).toBeNull();
  });

  /*
    "I don't know" was said to yes-or-no questions, which it does not answer:
    `Kas siin poes müüakse ka jäätist?` to a shop assistant, `Homme?` checking
    a day. The keyless critic counted it in 47 of 60 conversations.
  */
  const said = (text: string) => input({ asked: "?", said: text, spoken: words(text) });
  it("shrugs at a question asking for information, and at nothing else", () => {
    expect(shrugFits(said("Kus on postkontor?"))).toBe(true);
    expect(shrugFits(said("Vabandust. Mis kell on?"))).toBe(true);
    // Without its mark, a question word opening the sentence still asks.
    expect(shrugFits(said("kus on pood"))).toBe(true);
    // A yes-or-no question, and a single word checked back.
    expect(shrugFits(said("Kas siin on pood?"))).toBe(false);
    expect(shrugFits(said("Teisipäev?"))).toBe(false);
    // A question word in a statement is a relative clause, not a question.
    expect(shrugFits(said("Ma elan majas, kus on pood."))).toBe(false);
    expect(shrug(said("Kas siin on pood?"))).toBeNull();
  });

  it("never shrugs at a question about the person asked", () => {
    expect(shrugFits(said("Kus sa elad?"))).toBe(false);
    expect(shrugFits(said("Mis sinu nimi on?"))).toBe(false);
    // The verb alone says who it is about.
    expect(shrugFits(said("Kus elate?"))).toBe(false);
  });

  it("shrugs at do you know, whose honest answer it is", () => {
    expect(shrugFits(said("Kas sa tead, kus pood on?"))).toBe(true);
    expect(shrugFits(said("Kas te teate?"))).toBe(true);
  });

  it("reads each sentence, so a statement ahead of the question does not decide", () => {
    expect(shrugFits(said("Ma elan siin. Kus on pood?"))).toBe(true);
    expect(shrugFits(said("Kus on pood? Kas sa elad siin?"))).toBe(true);
    expect(shrugFits(said("Ma elan majas, kus on pood. Kas siin on hea?"))).toBe(false);
  });

  /*
    "Kell 15:30 on super. Kas ma pean ID-kaardi kaasa võtma?" was answered
    `Kell 15:30.`, twice: the time read back to somebody who had agreed to it
    and asked about something else.
  */
  it("answers the time only where the question is about the clock", () => {
    const agreed = input({ asked: "kas", spoken: ["kell", "on", "hea", "kas", "ma", "pean", "midagi", "tooma"], said: "Kell 14:30 on hea. Kas ma pean midagi tooma?" });
    expect(asideFor(agreed)?.text).not.toBe("Teisipäeval kell 14:30.");
    expect(asideFor(input({ asked: "?", spoken: ["kell"], said: "Kell?", more: [] }))?.text).toBe("Teisipäeval kell 14:30.");
  });

  it("answers a time the learner checks with yes or no, and yes alone where it has been said", () => {
    expect(asideFor(input({ asked: "?", spoken: ["kell"], said: "Kell 14:30?", more: [] }))?.text).toBe("Jah, teisipäeval kell 14:30.");
    expect(asideFor(input({ asked: "?", spoken: ["kell"], said: "Kell 16:00?", more: [] }))?.text).toBe("Ei, teisipäeval kell 14:30.");
    expect(asideFor(input({ asked: "?", spoken: ["kell"], said: "Kell 14:30?", more: [], already: new Set(["Teisipäeval kell 14:30."]) }))?.text).toBe("Jah.");
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
    // "Many" is not "how much": a question about flowers released the wage.
    expect(asksPrice(["kas", "siin", "on", "palju", "lilli"], LEX)).toBe(false);
  });

  it("is answered with the price off the card, in a sentence made of course words", () => {
    const line = asideFor(input({ asked: "kui", spoken: ["kui", "palju"], card: PRICED }));
    expect(line?.text).toBe("See maksab 5 eurot.");
    expect(line?.provenance).toBe("attested");
    // And on a turn that missed the beat, where the bank's answer and "more" may not answer.
    expect(asideFor(input({ asked: "mis", spoken: ["mis", "hind", "on"], card: PRICED, missed: true }))?.text)
      .toBe("See maksab 5 eurot.");
  });

  it("is the shop's own price where the learner holds none, and never the changed price beside the learner's", () => {
    const theirs = { slot: "price", card: "What it costs.", literal: ["5"], lemmas: ["viis"], shown: ["5 €"], value: "5", price: true as const, theirs: true as const };
    // A clothes shop says its price at the till: asked, the assistant said `Ei tea.`.
    expect(asideFor(input({ asked: "kas", spoken: ["kas", "hind"], card: { ...CARD, props: [...CARD.props, theirs] } }))?.text)
      .toBe("See maksab 5 eurot.");
    // Beside the learner's own price, theirs is the curveball's and waits for it.
    const changed = { ...theirs, slot: "price2", literal: ["2"], value: "2", shown: ["2 €"], lemmas: ["kaks"] };
    expect(asideFor(input({ asked: "kui", spoken: ["kui", "palju"], card: { ...PRICED, props: [...PRICED.props, changed] } }))?.text)
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

  /*
    A reference number at a counter (`KK-3218`) was read as a price and the
    learner was told `Ei, see maksab 17 eurot.`; a departure time checked
    before the fare was read the same way. A figure is a number with a euro
    after it, a euro sign on it, or a turn that is nothing but the number.
  */
  it("reads a figure as a price only beside a euro, so a code or a clock time is not one", () => {
    expect(asideFor(input({ asked: "kui", spoken: ["mu", "number", "on", "kk", "kui", "palju"], said: "Mu number on KK-3218, kui palju?", card: PRICED }))?.text)
      .toBe("See maksab 5 eurot.");
    expect(asideFor(input({ asked: "kas", spoken: ["kell", "kas", "see", "maksab"], said: "Kell 19:30. Kas see maksab?", card: PRICED }))?.text)
      .toBe("See maksab 5 eurot.");
    expect(asideFor(input({ asked: "kas", spoken: ["kaks", "piletit", "kas", "see", "maksab"], said: "2 piletit, kas see maksab?", card: PRICED }))?.text)
      .toBe("See maksab 5 eurot.");
    expect(asideFor(input({ asked: "kas", spoken: ["kas", "5€"], said: "Kas 5€?", card: PRICED }))?.text)
      .toBe("Jah, see maksab 5 eurot.");
  });

  /*
    A learner at a returns desk said what they had paid and asked for their
    money back, and was answered `Jah, see maksab 21 eurot.`: a money word
    anywhere in the turn read as the price being asked. It is asked in a
    question clause, and the figure is read from that clause alone.
  */
  it("answers the price only where the question asks it", () => {
    const PAID: DictEntry = { lemma: "raha", pos: "NOUN", cefr: "A1", parts: { NOM_SG: "raha", GEN_SG: "raha", PART_SG: "raha" }, usages: [] };
    const lex = buildLexicon([...ENTRIES, PAID]);
    expect(priceAsked("See maksis 21 eurot, kas ma saan raha tagasi?", lex)).toBeNull();
    expect(priceAsked("Kas ma maksan kaardiga?", lex)).toBeNull();
    expect(priceAsked("Ma maksin 21 eurot.", lex)).toBeNull();
    expect(priceAsked("Kui palju see maksab?", lex)).not.toBeNull();
    expect(priceAsked("Mis hind on?", lex)).not.toBeNull();
    expect(priceAsked("Kas see maksab?", lex)).not.toBeNull();
    expect(priceAsked("Kui palju raha?", lex)).not.toBeNull();
    // A figure checked back, and the clause it is checked in, not the one before.
    expect(priceAsked("Ma tahan pileti, kas see maksab 5 eurot?", lex)).toBe("kas see maksab 5 eurot?");
    expect(priceAsked("Kell 19:30?", lex)).toBeNull();
    expect(priceAsked("Kas 2,50 eurot?", lex)).toBe("Kas 2,50 eurot?");
    const asking = input({ asked: "mis", spoken: words("See maksis 21 eurot, kas ma saan raha tagasi?"), said: "See maksis 21 eurot, kas ma saan raha tagasi?", card: PRICED, lexicon: lex });
    expect(asideFor(asking)).toBeNull();
  });

  it("reads a price said in words, and says yes alone to a price this run has already said", () => {
    const SIX: RoleCard = { ...CARD, props: [...CARD.props, { slot: "price", card: "What it costs.", literal: ["6"], lemmas: ["kuus"], shown: ["6 €"], value: "6", price: true }] };
    expect(asideFor(input({ asked: "kas", spoken: ["kuus", "eurot"], said: "Kuus eurot?", card: SIX }))?.text).toBe("Jah, see maksab 6 eurot.");
    expect(asideFor(input({ asked: "kas", spoken: ["kas", "eurot"], said: "Kas 6 eurot?", card: SIX, already: new Set(["Jah, see maksab 6 eurot."]) }))?.text).toBe("Jah.");
    // Asked again without a figure, the price is said again: they asked.
    expect(asideFor(input({ asked: "kui", spoken: ["kui", "palju"], said: "Kui palju?", card: SIX, already: new Set(["See maksab 6 eurot."]) }))?.text).toBe("See maksab 6 eurot.");
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

describe("the list as it is spoken", () => {
  it("says a pronoun by its stored short form and everything else by its headword", () => {
    const lex = buildLexicon([
      ...ENTRIES,
      {
        lemma: "mina", pos: "PRONOUN", cefr: "A1",
        parts: { NOM_SG: "mina", GEN_SG: "minu", PART_SG: "mind" },
        extraForms: [{ code: "SgN", value: "mina" }, { code: "SgN", value: "ma" }, { code: "SgG", value: "mu" }],
        usages: [],
      },
      {
        lemma: "nemad", pos: "PRONOUN", cefr: "A1", parts: {},
        extraForms: [{ code: "PlN", value: "nemad" }, { code: "PlN", value: "nad" }],
        usages: [],
      },
      { lemma: "see", pos: "PRONOUN", cefr: "A1", parts: { NOM_SG: "see", GEN_SG: "selle", PART_SG: "seda" }, usages: [] },
    ]);
    expect(lex.spoken).toContain("ma");
    expect(lex.spoken).toContain("nad");
    expect(lex.spoken).toContain("see");
    expect(lex.spoken).not.toContain("mina");
    expect(lex.spoken).not.toContain("nemad");
    expect(lex.spoken).toHaveLength(ENTRIES.length + 3);
    // The gate still vouches both spellings.
    expect(lex.forms.has("mina")).toBe(true);
    expect(lex.forms.has("ma")).toBe(true);
  });
});
