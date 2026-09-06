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
]);

const BEAT: BeatSpec = {
  id: "b", goal: "Say it.", they: "They ask.", move: "ask", topic: ["tuba"],
  needs: [{ kind: "lemma", oneOf: ["valu", "palavik"] }],
  required: true, patience: 3, shape: "word",
};

const CARD: RoleCard = { you: "You.", props: [] };

describe("narrowing a question to two", () => {
  it("offers two of the beat's own words, both of which are right", () => {
    const said = choiceOf({ beat: BEAT, card: CARD, lexicon: LEX, roll: 0 });
    expect(said).toBe(`Valu ${CHOICE_WORD} palavik?`);
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
});
