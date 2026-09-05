/**
 * The narrowed question, which is the repair move a person actually makes.
 *
 * What this is really testing is that both options are true where the beat
 * would take either, and that the wrong one is genuinely wrong where the beat
 * wants a case: a choice that offered two spellings the marker both accepts
 * would be a question with no answer.
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
    Where the beat wants a case, the choice is about the ending, and the wrong
    option has to be one the marker would actually refuse: offering two
    spellings it both accepts is a question with no answer.
  */
  it("offers the case the beat wants against another case of the same word", () => {
    const asks: BeatSpec = { ...BEAT, needs: [{ kind: "case", lemma: "tuba", grammCase: "INESSIVE" }] };
    const said = choiceOf({ beat: asks, card: CARD, lexicon: LEX, roll: 0 });
    // Capitalized, like every line: it opens a sentence.
    expect(said?.toLowerCase()).toContain("toas");
    expect(said).toContain(CHOICE_WORD);
    const other = said!.replace("?", "").split(` ${CHOICE_WORD} `).find((f) => f.toLowerCase() !== "toas");
    expect(LEX.byCase.get("tuba|INESSIVE")?.has(other!.toLowerCase())).toBe(false);
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
