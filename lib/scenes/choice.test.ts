/**
 * The narrowed question, which is the repair move a person actually makes.
 *
 * What this is really testing is that both options are true where the beat
 * would take either, and that no choice is built where the two options would
 * be one word in two cases: that is a grammar exercise in a character's
 * voice, not a question anybody asks.
 */
import { describe, expect, it } from "vitest";
import { CHOICE_WORD, choiceOf } from "./choice";
import { buildLexicon } from "./lexicon";
import type { RoleCard } from "./props";
import type { BeatSpec } from "./types";

const LEX = buildLexicon([
  { lemma: "tuba", pos: "NOUN", cefr: "A1", usages: [], parts: { NOM_SG: "tuba", GEN_SG: "toa", PART_SG: "tuba" } },
  { lemma: "valu", pos: "NOUN", cefr: "A2", usages: [], parts: { NOM_SG: "valu", GEN_SG: "valu", PART_SG: "valu" } },
  { lemma: "palavik", pos: "NOUN", cefr: "A2", usages: [], parts: { NOM_SG: "palavik", GEN_SG: "palaviku", PART_SG: "palavikku" } },
  { lemma: "valutama", pos: "VERB", cefr: "A2", usages: [], parts: { INF_MA: "valutama" } },
  { lemma: "sobima", pos: "VERB", cefr: "A2", usages: [], parts: { INF_MA: "sobima" } },
  { lemma: "jah", pos: "ADVERB", cefr: "A1", usages: [], parts: {} },
  { lemma: "ei", pos: "ADVERB", cefr: "A1", usages: [], parts: {} },
  { lemma: "Tere!", pos: "PHRASE", cefr: "A1", usages: [], parts: {} },
  { lemma: "Tere hommikust!", pos: "PHRASE", cefr: "A1", usages: [], parts: {} },
]);

const BEAT: BeatSpec = {
  id: "b", goal: "Say it.", they: "They ask.", move: "ask", topic: ["tuba"],
  needs: [{ kind: "lemma", oneOf: ["valu", "palavik"] }],
  choice: ["valu", "palavik"],
  required: true, patience: 3, shape: "word",
};

const CARD: RoleCard = { you: "You.", props: [] };

describe("narrowing a question to two", () => {
  it("offers two of the beat's own words, both of which are right", () => {
    const said = choiceOf({ beat: BEAT, card: CARD, lexicon: LEX, roll: 0 });
    expect(said).toBe(`Valu ${CHOICE_WORD} palavik?`);
  });

  /*
    A lemma can carry its own closing mark, and joined as printed two of them
    came out `Tere! või Tere hommikust!?`. That pair is no longer offered at
    all (a greeting is one thing said, below), but the join still ends the
    line in one mark whatever the options were spelled with.
  */
  it("takes each option's own closing mark off before joining them", () => {
    const lex = buildLexicon([
      { lemma: "Appi!", pos: "NOUN", cefr: "A1", usages: [], parts: {} },
      { lemma: "Tuli!", pos: "NOUN", cefr: "A1", usages: [], parts: {} },
    ]);
    const shout: BeatSpec = { ...BEAT, needs: [{ kind: "lemma", oneOf: ["Appi!", "Tuli!"] }], choice: ["Appi!", "Tuli!"] };
    expect(choiceOf({ beat: shout, card: CARD, lexicon: lex, roll: 0 })).toBe(`Appi ${CHOICE_WORD} Tuli?`);
  });

  /*
    A learner reads the same question twice while a transcript is replayed, so
    the sides may not swap under them; different beats get different rolls.
  */
  it("is stable for one roll and turns round for the next", () => {
    const a = choiceOf({ beat: BEAT, card: CARD, lexicon: LEX, roll: 2 });
    expect(choiceOf({ beat: BEAT, card: CARD, lexicon: LEX, roll: 2 })).toBe(a);
    expect(choiceOf({ beat: BEAT, card: CARD, lexicon: LEX, roll: 3 })).not.toBe(a);
  });

  /*
    A choice is two things the learner could have meant. Narrowing a case beat
    on the ending was `Poest või pood?`, which is a grammar exercise in a
    character's voice and was reported by the learner it was asked of; those
    beats get the app's own hint instead.
  */
  it("says nothing where the beat wants a case, because two cases are not two meanings", () => {
    const asks: BeatSpec = { ...BEAT, needs: [{ kind: "case", lemma: "tuba", grammCase: "INESSIVE" }] };
    expect(choiceOf({ beat: asks, card: CARD, lexicon: LEX, roll: 0 })).toBeNull();
  });

  /*
    AND NEVER ON A REQUIREMENT THEY ALREADY MET, which is `offerFor`'s rule one
    module over: a learner who said the right word and missed the rest of the
    beat was asked `Ülikool või kool?`, their own correct answer handed back as
    one of two guesses.
  */
  it("narrows on what is still missing rather than on the half they got right", () => {
    const beat: BeatSpec = {
      ...BEAT,
      needs: [{ kind: "lemma", oneOf: ["valu", "palavik"] }, { kind: "lemma", oneOf: ["tuba"] }],
    };
    expect(choiceOf({ beat, card: CARD, lexicon: LEX, roll: 0, met: [true, false] })).toBeNull();
    expect(choiceOf({ beat, card: CARD, lexicon: LEX, roll: 0, met: [false, false] }))
      .toBe(`Valu ${CHOICE_WORD} palavik?`);
  });

  it("says nothing where the beat has no two options to offer", () => {
    const asks: BeatSpec = { ...BEAT, needs: [{ kind: "question" }] };
    expect(choiceOf({ beat: asks, card: CARD, lexicon: LEX, roll: 0 })).toBeNull();
  });

  it("says nothing where the dictionary cannot spell one of them", () => {
    const asks: BeatSpec = { ...BEAT, needs: [{ kind: "lemma", oneOf: ["valu", "puudub"] }] };
    expect(choiceOf({ beat: asks, card: CARD, lexicon: LEX, roll: 0 })).toBeNull();
  });

  it("holds no Estonian of its own beyond the word between the two", () => {
    /*
      Every option is a lemma the beat named or a form off the same table every
      case card reads, so a scene cannot be made to say a word it does not
      teach; `catalogue.test.ts` checks the joining word against every scene's
      own units.
    */
    const said = choiceOf({ beat: BEAT, card: CARD, lexicon: LEX, roll: 0 })!;
    for (const word of said.replace("?", "").toLowerCase().split(" ")) {
      expect(word === CHOICE_WORD || LEX.forms.has(word), word).toBe(true);
    }
  });

  /*
    A CHOICE IS ONE THE SCENE NAMES. The beat's list is every word that would
    answer it, and two of those were offered as `Probleem või viga?`,
    `Palk või raha?` and `Arve või raha?`: one thing said two ways. Nothing
    about the list says which two are different things, so a beat that names
    no pair is narrowed on nothing, and a pair naming a word the requirement
    does not take is not offered either.
  */
  it("offers nothing off a beat's list that names no pair", () => {
    const { choice: _, ...plain } = BEAT;
    expect(choiceOf({ beat: plain, card: CARD, lexicon: LEX, roll: 0 })).toBeNull();
  });

  it("refuses a named pair the requirement does not take", () => {
    const beat: BeatSpec = { ...BEAT, choice: ["valu", "tuba"] };
    expect(choiceOf({ beat, card: CARD, lexicon: LEX, roll: 0 })).toBeNull();
  });
});
