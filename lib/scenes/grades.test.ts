import { describe, expect, it } from "vitest";
import { advance, startScene, type SceneState } from "./state";
import { gradesFor, offerFor, stalledWords } from "./grades";
import type { Evidence, TurnReading } from "./turn";
import { buildLexicon } from "./lexicon";
import type { RoleCard } from "./props";
import type { BeatSpec, SceneSpec } from "./types";

const SCENE: SceneSpec = {
  id: "fixture", title: "A fixture", place: "Nowhere",
  tests: "keha-ja-tervis", units: ["tervitused"], register: "teie",
  role: "You are somebody, and it is not you.", props: [], curveballs: [],
  beats: [
    {
      id: "reason", goal: "Say what is wrong.", they: "They say something.", move: "ask", topic: ["valu"],
      needs: [{ kind: "lemma", oneOf: ["valu", "haigus"] }],
      required: true, patience: 3, shape: "word",
    },
    {
      id: "where", goal: "Say where.", they: "They say something.", move: "ask", topic: ["pea"],
      needs: [{ kind: "case", lemma: "pea", grammCase: "INESSIVE" }],
      required: true, patience: 3, shape: "word",
    },
    {
      id: "close", goal: "Say goodbye.", they: "They say something.", move: "close", topic: ["Head aega!"],
      needs: [{ kind: "question" }],
      required: true, patience: 2, shape: "word",
    },
  ],
  outcomes: [
    { id: "done", when: ["reason", "where", "close"], says: "Done." },
    { id: "left", when: [], says: "You left." },
  ],
};

/*
  `satisfiedBy` follows `met`, because it is what a real turn does: a
  requirement met by a word puts that word here, and a grade is written for a
  word the learner produced rather than for a beat the scene let through. The
  fixture used to leave it empty on every turn, which was harmless while
  nothing read it and wrong the moment something did.
*/
function evidence(
  reading: TurnReading,
  met: readonly boolean[],
  slips: Evidence["slips"] = [],
  satisfiedBy: readonly string[] = met.some(Boolean) ? ["x"] : [],
): Evidence {
  return { reading, met, missing: met.flatMap((ok, i) => (ok ? [] : [i])), words: [], matched: [], satisfiedBy, slips, asked: null, substituted: [], wantsEnglish: false };
}

/** Plays the turns given, in order, and hands back where it got to. */
function play(
  turns: {
    reading: TurnReading; met: boolean[]; helped?: boolean;
    slips?: Evidence["slips"]; satisfiedBy?: readonly string[];
  }[],
): SceneState {
  let state = startScene(SCENE);
  for (const turn of turns) {
    const seen = evidence(turn.reading, turn.met, turn.slips, turn.satisfiedBy);
    ({ state } = advance(SCENE, state, seen, "x", turn.helped));
  }
  return state;
}

describe("what a conversation writes into the review log", () => {
  it("grades a word the beat asked for, Good on the first attempt", () => {
    const grades = gradesFor(SCENE, play([{ reading: "complete", met: [true] }]));
    expect(grades).toEqual([
      { lemma: "valu", grammCase: null, reachedCase: null, rating: 3, beatId: "reason" },
    ]);
  });

  it("grades Hard after a repair, and never Easy", () => {
    const grades = gradesFor(SCENE, play([
      { reading: "incomplete", met: [false] },
      { reading: "complete", met: [true] },
    ]));
    expect(grades[0]?.rating, "a conversation cannot tell easy from lucky").toBe(2);
    for (const grade of grades) expect(grade.rating).toBeLessThan(4);
  });

  it("grades Hard where the word was understood with a slip, and never Again for it", () => {
    /*
      `pood` for `poodi` is the word had and the form not yet: the other side
      understood, so it is not a miss, and the form was not produced, so it
      is not a recall the scheduler should stretch an interval on.
    */
    const grades = gradesFor(SCENE, play([{
      reading: "complete", met: [true],
      slips: [{ kind: "case", said: "valu", form: "valus", lemma: "valu", grammCase: "INESSIVE" }],
    }]));
    expect(grades[0]?.rating).toBe(2);
  });

  it("grades Again where the other side handed the word over unasked", () => {
    /*
      Saying "I do not understand" and being given the word is help, exactly
      as pressing the button is, so the scheduler may not stretch an interval
      on a word it had just supplied.
    */
    const grades = gradesFor(SCENE, play([
      { reading: "lost", met: [false] },
      { reading: "complete", met: [true] },
    ]));
    expect(grades[0]?.rating).toBe(1);
  });

  it("grades Again where the app had to supply the word", () => {
    const grades = gradesFor(SCENE, play([{ reading: "complete", met: [true], helped: true }]));
    expect(grades[0]?.rating).toBe(1);
  });

  it("does not count a fragment or an echo as a repair", () => {
    /*
      Neither cost patience in `advance`, because neither was a turn: a learner
      who answered in one word, was waited at, and then said the sentence has
      not repaired anything.
    */
    const grades = gradesFor(SCENE, play([
      { reading: "fragment", met: [false] },
      { reading: "echo", met: [false] },
      { reading: "complete", met: [true] },
    ]));
    expect(grades[0]?.rating).toBe(3);
  });

  it("carries the case, so the weak-case charts see a conversation too", () => {
    let state = startScene(SCENE);
    ({ state } = advance(SCENE, state, evidence("complete", [true]), "x"));
    ({ state } = advance(SCENE, state, evidence("complete", [true]), "x"));
    const grades = gradesFor(SCENE, state);
    expect(grades).toContainEqual({
      lemma: "pea", grammCase: "INESSIVE", reachedCase: null, rating: 3, beatId: "where",
    });
  });

  /*
    And the case that came back instead travels with it, so the pair somebody
    mixes up at a counter is counted beside the pair they mix up on a card.
  */
  it("carries the case that came back instead, where exactly one case spells it", () => {
    const slip = { kind: "case" as const, said: "peast", form: "peas", lemma: "pea", grammCase: "INESSIVE" as const, reached: "ELATIVE" as const };
    let state = startScene(SCENE);
    ({ state } = advance(SCENE, state, evidence("complete", [true]), "x"));
    ({ state } = advance(SCENE, state, evidence("complete", [true], [slip]), "x"));
    const grades = gradesFor(SCENE, state);
    expect(grades.find((g) => g.lemma === "pea")?.reachedCase).toBe("ELATIVE");
    // Never the case that was asked for: that is a right answer wearing a confusion's clothes.
    const same = { ...slip, reached: "INESSIVE" as const };
    let other = startScene(SCENE);
    ({ state: other } = advance(SCENE, other, evidence("complete", [true]), "x"));
    ({ state: other } = advance(SCENE, other, evidence("complete", [true], [same]), "x"));
    expect(gradesFor(SCENE, other).find((g) => g.lemma === "pea")?.reachedCase).toBeNull();
  });

  it("writes nothing for a beat that asked for no word", () => {
    let state = startScene(SCENE);
    for (let i = 0; i < 3; i += 1) {
      ({ state } = advance(SCENE, state, evidence("complete", [true]), "x"));
    }
    // `close` asks for a question mark, which is a thing they did and not a
    // word they hold a card for.
    expect(gradesFor(SCENE, state).map((g) => g.beatId)).toEqual(["reason", "where"]);
  });

  /*
    A greeting is met by whatever the learner says back (`readTurn`), so
    grading on `met` alone would put "they recalled Tere!" into the
    append-only log about a turn that said something else entirely.
  */
  it("writes nothing for a beat that was met without the learner producing a word", () => {
    const state = play([{ reading: "complete", met: [true], satisfiedBy: [] }]);
    expect(gradesFor(SCENE, state)).toEqual([]);
  });

  it("writes nothing at all for an abandoned run", () => {
    const grades = gradesFor(SCENE, play([
      { reading: "unrecognised", met: [false] },
      { reading: "unrecognised", met: [false] },
    ]));
    expect(grades, "an abandoned scene wrote to the review log").toEqual([]);
  });

  it("grades one row per requirement, not one per word it would have taken", () => {
    // `oneOf` is a choice and the turn does not say which was taken, so a row
    // per candidate would credit a word nobody used.
    const grades = gradesFor(SCENE, play([{ reading: "complete", met: [true] }]));
    expect(grades).toHaveLength(1);
  });
});

describe("the words a run needed and the learner did not have", () => {
  it("names the words of a beat that ran out of patience", () => {
    const state = play([
      { reading: "unrecognised", met: [false] },
      { reading: "unrecognised", met: [false] },
      { reading: "unrecognised", met: [false] },
    ]);
    expect(stalledWords(SCENE, state)).toEqual(["valu", "haigus"]);
  });

  it("says nothing about a beat that was met, or one nobody reached", () => {
    expect(stalledWords(SCENE, play([{ reading: "complete", met: [true] }]))).toEqual([]);
    expect(stalledWords(SCENE, startScene(SCENE))).toEqual([]);
  });

  it("names a few of a beat's words rather than all of them", () => {
    /*
      A `lemma` requirement lists every word that would satisfy it, and for
      "say where it hurts" that is eleven body parts. Writing all of them down
      handed somebody eleven words under a heading saying the conversation had
      needed them, each with a button to put it in their deck. It had needed
      one.
    */
    const wide: SceneSpec = {
      ...SCENE,
      beats: [{
        ...SCENE.beats[0]!,
        needs: [{
          kind: "lemma",
          oneOf: ["pea", "kõrv", "käsi", "jalg", "selg", "silm", "nina", "suu"],
        }],
      }],
    };
    const stalled = stalledWords(wide, play([
      { reading: "unrecognised", met: [false] },
      { reading: "unrecognised", met: [false] },
      { reading: "unrecognised", met: [false] },
    ]));
    expect(stalled.length, "a stalled beat handed over its whole vocabulary")
      .toBeLessThanOrEqual(3);
    // And the head of the list, so what is offered is the beat's own first
    // word rather than whichever three a set happened to iterate.
    expect(stalled[0]).toBe("pea");
  });
});

/**
 * The word handed over when somebody says they are not following. It has to
 * agree with their own card, or they follow the hint and practise saying
 * something that was not true of the run they are in.
 */
/*
  A VALUE OFF THE CARD IS A WORD LIKE ANY OTHER.

  `gradesFor` wrote rows for `lemma` and `case` and nothing for `datum`, on the
  reasoning that a datum is not a word the learner holds a card for. It is one
  every time: the card named it rather than the beat. So a scene built mostly
  out of card values wrote almost nothing into the review log, which is every
  scene whose subject is telling somebody a fact about yourself.
*/
describe("a value the card dealt", () => {
  const DATUM: SceneSpec = {
    ...SCENE,
    beats: [
      {
        id: "from", goal: "Tell them where you are from.", they: "They ask.", move: "ask",
        topic: ["kodumaa"], needs: [{ kind: "datum", slot: "from" }],
        required: true, patience: 3, shape: "word",
      },
      {
        id: "to", goal: "Tell them where you are going.", they: "They ask.", move: "ask",
        topic: ["jaam"], needs: [{ kind: "datum", slot: "to", grammCase: "ILLATIVE" }],
        required: true, patience: 3, shape: "word",
      },
    ],
  };
  const card = (props: { slot: string; lemmas: string[]; value: string }[]): RoleCard => ({
    you: "You.",
    props: props.map((one) => ({
      slot: one.slot, card: one.slot, literal: [], shown: [], value: one.value, lemmas: one.lemmas,
    })),
  });
  const played = () => {
    let state = startScene(DATUM);
    ({ state } = advance(DATUM, state, evidence("complete", [true]), "Soomest"));
    ({ state } = advance(DATUM, state, evidence("complete", [true]), "jaama"));
    return state;
  };

  it("is graded as the word it named, so the beat reaches the review log", () => {
    const grades = gradesFor(DATUM, played(), card([
      { slot: "from", lemmas: ["Soome"], value: "Soome" },
      { slot: "to", lemmas: ["jaam"], value: "jaam" },
    ]));
    expect(grades.map((g) => g.lemma)).toEqual(["Soome", "jaam"]);
  });

  /*
    And where the beat named a case the row carries it, which is the whole
    reason a conversation writes to the log at all: the sisseütlev under
    pressure lands in the same chart as the sisseütlev on a card.
  */
  it("and carries the case the beat asked the value in", () => {
    const grades = gradesFor(DATUM, played(), card([
      { slot: "from", lemmas: ["Soome"], value: "Soome" },
      { slot: "to", lemmas: ["jaam"], value: "jaam" },
    ]));
    expect(grades.find((g) => g.lemma === "jaam")?.grammCase).toBe("ILLATIVE");
    expect(grades.find((g) => g.lemma === "Soome")?.grammCase).toBeNull();
  });

  /*
    A slot that could mean two words grades nothing. A floor dealt as `3`
    carries `kolm` and `kolmas` and the turn does not say which was written, so
    a row for the first would claim a recall that may never have happened, in
    the one table nothing repairs.
  */
  it("but grades nothing where the slot could have meant either of two words", () => {
    const grades = gradesFor(DATUM, played(), card([
      { slot: "from", lemmas: ["kolm", "kolmas"], value: "3" },
      { slot: "to", lemmas: ["jaam"], value: "jaam" },
    ]));
    expect(grades.map((g) => g.lemma)).toEqual(["jaam"]);
  });

  /*
    AND THE TWO-WORD SLOT IS SETTLED BY WHAT THEY WROTE, where there is a
    lexicon to ask. `kolmandal` is a form of `kolmas` and of nothing else, so
    the row is `kolmas`; the ambiguity is resolved rather than guessed at.
  */
  it("unless the words they wrote say which of the two it was", () => {
    const lexicon = buildLexicon([
      { lemma: "kolm", pos: "NUMERAL", cefr: "A1", usages: [], parts: { NOM_SG: "kolm", GEN_SG: "kolme", PART_SG: "kolme" } },
      { lemma: "kolmas", pos: "ADJECTIVE", cefr: "A1", usages: [], parts: { NOM_SG: "kolmas", GEN_SG: "kolmanda", PART_SG: "kolmandat" } },
      { lemma: "jaam", pos: "NOUN", cefr: "A1", usages: [], parts: { NOM_SG: "jaam", GEN_SG: "jaama", PART_SG: "jaama" } },
    ]);
    let state = startScene(DATUM);
    ({ state } = advance(DATUM, state, evidence("complete", [true], [], ["kolmandal"]), "kolmandal"));
    const grades = gradesFor(DATUM, state, card([
      { slot: "from", lemmas: ["kolm", "kolmas"], value: "3" },
      { slot: "to", lemmas: ["jaam"], value: "jaam" },
    ]), lexicon);
    expect(grades.map((g) => g.lemma)).toEqual(["kolmas"]);
  });

  /*
    And nothing for a literal: a time, a clock reading, a reference code. Those
    are values rather than vocabulary and nobody holds a card for one.
  */
  it("and nothing for a value that is not a word", () => {
    const grades = gradesFor(DATUM, played(), card([
      { slot: "from", lemmas: [], value: "10:30" },
      { slot: "to", lemmas: ["jaam"], value: "jaam" },
    ]));
    expect(grades.map((g) => g.lemma)).toEqual(["jaam"]);
  });

  /*
    And nothing where the run stored no card, which is what every run before
    this did for every datum it had.
  */
  it("and nothing at all where the caller has no card", () => {
    expect(gradesFor(DATUM, played())).toEqual([]);
  });

  /*
    And never where a second word for the same thing met it: the learner said
    `abikaasa` where the card dealt `mees`, and a row for the card's own word
    would tell the scheduler they produced one they never wrote. `substituted`
    is what says so and `answered` already reads it.
  */
  it("and never where a word standing in for it is what met the beat", () => {
    let state = startScene(DATUM);
    const stood: Evidence = {
      ...evidence("complete", [true]), substituted: [0],
    };
    ({ state } = advance(DATUM, state, stood, "abikaasaga"));
    const grades = gradesFor(DATUM, state, card([
      { slot: "from", lemmas: ["Soome"], value: "Soome" },
      { slot: "to", lemmas: ["jaam"], value: "jaam" },
    ]));
    expect(grades.map((g) => g.lemma)).toEqual([]);
  });
});

describe("the word the other side offers", () => {
  const beat = SCENE.beats[0]!;

  it("is the one the card dealt, where the card dealt one of the beat's own", () => {
    const card = {
      you: "You.",
      props: [{ slot: "problem", card: "What is wrong", literal: [], lemmas: ["haigus"], shown: [], value: "haigus" }],
    };
    expect(offerFor(beat, card)).toBe("haigus");
  });

  it("is the beat's own first word where the card dealt none of them", () => {
    const card = { you: "You.", props: [{ slot: "x", card: "x", literal: [], lemmas: ["tuba"], shown: [], value: "tuba" }] };
    expect(offerFor(beat, card)).toBe("valu");
    expect(offerFor(beat, null)).toBe("valu");
  });

  it("is the word a case requirement is about", () => {
    expect(offerFor(SCENE.beats[1]!)).toBe("pea");
  });

  /*
    And nothing where the beat wants a value off the card or a question: the
    answer is already in front of them, or what they need is a shape rather
    than a word, and a word that would not meet the beat is a hint that
    cannot help.
  */
  /*
    Where the answer is a value off the card there is no word that would meet
    the beat, and that used to mean nothing was said at all: somebody stuck
    got the same question back with no sign of what it was about. The beat's
    own topic says what kind of thing is wanted and gives the answer away
    nowhere, because the answer is on the card.
  */
  it("points at what the beat is about where the answer is a value off the card", () => {
    const beat = SCENE.beats[2]!;
    expect(beat.topic).toContain(offerFor(beat));
  });

  it("never points at the question word they were just asked", () => {
    const beat = { ...SCENE.beats[2]!, topic: ["kuhu", "aeg"] };
    expect(offerFor(beat, null, new Set(["kuhu"]))).toBe("aeg");
  });

  /*
    AND NEVER A WORD THEY HAVE JUST USED CORRECTLY. Asked which floor they live
    on, a learner who wrote `kolmandal korrusel` met the case and missed the
    number, and was handed `Korrus?`, the word they had said twice. A hint for
    the half they got right reads as the app not having listened, and it points
    away from what was actually wanted.
  */
  it("passes over a requirement the turn already met", () => {
    const beat = {
      ...SCENE.beats[0]!,
      needs: [
        { kind: "case", lemma: "pea", grammCase: "INESSIVE" },
        { kind: "lemma", oneOf: ["valu"] },
      ],
    } as const satisfies BeatSpec;
    expect(offerFor(beat, null, new Set(), [true, false])).toBe("valu");
    expect(offerFor(beat, null, new Set(), [false, false])).toBe("pea");
  });

  it("and falls back to the walk where the caller knows nothing about the turn", () => {
    expect(offerFor(SCENE.beats[1]!, null, new Set(), [])).toBe("pea");
    expect(offerFor(SCENE.beats[1]!, null, new Set(), [true])).toBe("pea");
  });
});
