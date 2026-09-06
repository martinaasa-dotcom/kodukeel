import { describe, expect, it } from "vitest";
import { reviewOf } from "./review";
import { startScene, type SceneState, type TurnRecord } from "./state";
import type { Slip } from "./turn";
import type { SceneSpec } from "./types";

const SCENE: SceneSpec = {
  id: "fixture", title: "A fixture", place: "Nowhere", level: "A2",
  tests: "keha-ja-tervis", units: ["tervitused"], register: "teie",
  role: "You are somebody, and it is not you.", props: [], curveballs: [],
  beats: [
    {
      id: "reason", goal: "Say what is wrong.", they: "They ask.", move: "ask", topic: ["valu"],
      needs: [{ kind: "lemma", oneOf: ["valu"] }], required: true, patience: 2, shape: "word",
    },
    {
      id: "where", goal: "Say where it hurts.", they: "They ask.", move: "ask", topic: ["pea"],
      needs: [{ kind: "case", lemma: "pea", grammCase: "INESSIVE" }], required: true, patience: 2, shape: "word",
    },
  ],
  outcomes: [{ id: "done", when: ["reason", "where"], says: "Done." }, { id: "left", when: [], says: "You left." }],
};

function turn(over: Partial<TurnRecord> = {}): TurnRecord {
  return { beatId: "reason", said: "x", reading: "complete", met: [true], helped: false, ...over };
}

function state(turns: TurnRecord[], done: string[] = ["reason", "where"]): SceneState {
  return { ...startScene(SCENE), turns, done };
}

const CASE_SLIP: Slip = { kind: "case", said: "pea", form: "peas", lemma: "pea", grammCase: "INESSIVE" };

describe("the review of a conversation", () => {
  it("leads on what landed, because that is the sentence somebody takes away", () => {
    const review = reviewOf(SCENE, state([turn(), turn(), turn()]));
    expect(review.lead).toMatch(/answered the question/);
    expect(review.lead).not.toMatch(/wrong|mistake|error/i);
  });

  /*
    Turns that answered something, not turns whose words were recognised. A
    learner who met no beat was told "19 of your 21 turns were understood"
    over a list of six things left undone: their Estonian was read, which is
    worth saying, and it is not what "understood" means to whoever reads it.
  */
  it("does not tell somebody who answered nothing that they were understood", () => {
    const missed = [turn({ reading: "offtarget", met: [false] }), turn({ reading: "offtarget", met: [false] })];
    const review = reviewOf(SCENE, state(missed, []));
    expect(review.lead).not.toMatch(/[0-9]+ of your/);
    expect(review.lead).toMatch(/Nothing landed/);
    // And it says the way in rather than a figure.
    expect(review.lead).toMatch(/word button/);
  });

  /*
    ONE, NOT "ONE OF THEM". And the line names what was actually off rather
    than hedging "ending or spelling" over a run that held only one of the two.
  */
  it("agrees with itself about one slip, and names which kind it was", () => {
    const one = reviewOf(SCENE, state([turn({ slips: [CASE_SLIP] })])).lead;
    expect(one).toContain("One ending was off, and it did not stop the conversation.");
    const spelling: Slip = { kind: "spelling", said: "korvas", form: "kõrvas", lemma: "kõrv" };
    expect(reviewOf(SCENE, state([turn({ slips: [spelling] })])).lead).toContain("One spelling was off");
    expect(reviewOf(SCENE, state([turn({ slips: [CASE_SLIP, spelling] })])).lead)
      .toContain("2 endings and spellings were off, and not one of them");
  });

  /*
    "Read every time" was printed whenever a single turn was Estonian, so a run
    where one of five was read said something true of a run nobody had.
  */
  it("does not say every time about some of the time", () => {
    const off = turn({ reading: "offtarget", met: [false] });
    const lead = reviewOf(SCENE, state([off, turn({ reading: "unrecognised", met: [false] })], [])).lead;
    expect(lead).not.toMatch(/every time/);
    expect(lead).toContain("1 of your 2 turns were read as Estonian");
  });

  it("still says their Estonian was read, where it was", () => {
    const review = reviewOf(SCENE, state([turn({ reading: "offtarget", met: [false] })], []));
    expect(review.lead).toMatch(/read every time/);
  });

  /*
    The unmet goals are ticked off in the debrief's own list and the first of
    them is the "one thing to work on" with the drill beside it, so a note here
    was the same sentence a third time. A learner reported the screen as
    unreadable and that was the loudest part of why.
  */
  it("does not say what was left undone a third time", () => {
    const review = reviewOf(SCENE, state([turn()], []));
    expect(review.notes.some((n) => n.id === "missed")).toBe(false);
    expect(review.notes.every((n) => !(n.body ?? "").includes("Say what is wrong."))).toBe(true);
  });

  it("counts turns the other side acted on, and not the ones it waited through", () => {
    const review = reviewOf(SCENE, state([turn(), turn({ reading: "fragment" }), turn({ reading: "echo" })]));
    expect(review.lead).toContain("The one thing you said");
  });

  it("says nothing came out wrong where nothing did", () => {
    expect(reviewOf(SCENE, state([turn(), turn()])).notes).toEqual([]);
  });

  /*
    THE WORD FIRST, THEN THE GUESS, THEN THE FORM THAT WAS WANTED. A learner
    read the version headed by the case and said the word itself should lead:
    a note headed "The ending for “into”" is a grammar point, and what they
    want to know is what happened to the word they wrote.
  */
  it("leads with the learner's own word and says which turn it was in", () => {
    const note = reviewOf(SCENE, state([turn(), turn({ slips: [CASE_SLIP] })])).notes[0];
    expect(note?.said).toBe("pea");
    expect(note?.form).toBe("peas");
    expect(note?.what).toBe("the ending for \u201cin\u201d");
    // Counting the learner's own turns, which is the join the transcript has.
    expect(note?.at).toBe(1);
    // The name a class uses is still there, one line down and one question word.
    expect(note?.term).toBe("seesütlev · kus?");
  });

  /*
    A principal part is not an ending, and which cases those are is read off
    `CASES.suffix` rather than branched on a key here.
  */
  it("does not call the plain form an ending", () => {
    const slip: Slip = { kind: "case", said: "kooli", form: "kool", lemma: "kool", grammCase: "NOMINATIVE" };
    const note = reviewOf(SCENE, state([turn({ slips: [slip] })])).notes[0];
    expect(note?.what).toBe("the form for \u201cthe plain word\u201d");
  });

  it("says how many times only where it was more than once", () => {
    const once = reviewOf(SCENE, state([turn({ slips: [CASE_SLIP] })])).notes[0];
    expect(once?.times).toBeUndefined();
    const twice = reviewOf(SCENE, state([turn({ slips: [CASE_SLIP] }), turn({ slips: [CASE_SLIP] })])).notes[0];
    expect(twice?.times).toBe(2);
    // And it points at the first of them, which is nearest the top.
    expect(twice?.at).toBe(0);
  });

  it("ranks the word somebody got wrong most often first", () => {
    const other: Slip = { kind: "case", said: "kohv", form: "kohvi", lemma: "kohv", grammCase: "PARTITIVE" };
    const review = reviewOf(SCENE, state([
      turn({ slips: [other] }), turn({ slips: [CASE_SLIP] }), turn({ slips: [CASE_SLIP] }),
    ]));
    expect(review.notes[0]?.said).toBe("pea");
    expect(review.notes[1]?.said).toBe("kohv");
  });

  /*
    The thing a teacher standing beside you says, marked as the guess it is.
    Derived from the transcript rather than invented: the case they reached
    for is recorded at marking time and the case the question before wanted
    is in the turn order.
  */
  it("guesses why, off the case they reached for", () => {
    const slip: Slip = { ...CASE_SLIP, said: "peal", reached: "ADESSIVE" };
    const note = reviewOf(SCENE, state([turn({ slips: [slip] })])).notes[0];
    expect(note?.hunch?.sure).toBe("likely");
    expect(note?.hunch?.says).toContain("kus?");
  });

  it("reads the case the question before wanted as the likeliest reason", () => {
    const first: Slip = { kind: "case", said: "peast", form: "peas", lemma: "pea", grammCase: "ELATIVE" };
    const second: Slip = { ...CASE_SLIP, said: "peast", reached: "ELATIVE" };
    const review = reviewOf(SCENE, state([turn({ slips: [first] }), turn({ slips: [second] })]));
    // Both turns said the same word; the note keyed on the case that was wanted.
    const note = review.notes.find((n) => n.id === "case:INESSIVE:peast");
    expect(note?.hunch?.says).toContain("the question before");
  });

  /*
    A hunch is about a habit rather than about a word, so the reading that fits
    three words is one reading, and printing it three times does not make it
    truer. What the one that keeps it adds is how many it covers, which is a
    fact the review held and never printed.

    THIS TEST WAS LOST AND CAME BACK THROUGH A MERGE. It was written when the
    dedupe was, dropped by the pass that turned a note from a case into a word,
    and another session's version of the same idea is what put it back.
  */
  it("gives one reason once, and says how many notes it covers", () => {
    const into: Slip = { kind: "case", said: "pood", form: "poodi", lemma: "pood", grammCase: "ILLATIVE", reached: "NOMINATIVE" };
    const some: Slip = { kind: "case", said: "piim", form: "piima", lemma: "piim", grammCase: "PARTITIVE", reached: "NOMINATIVE" };
    const notes = reviewOf(SCENE, state([turn({ slips: [into] }), turn({ slips: [some] })])).notes;
    expect(notes.filter((n) => n.hunch)).toHaveLength(1);
    // The notes themselves stay: each is about a different word.
    expect(notes).toHaveLength(2);
    // "Both" rather than "all two of these", which a template writes and a
    // person never does.
    expect(notes[0]?.hunch?.says).toContain("The same thing is behind both of these.");
  });

  it("leaves a reason that covers one note exactly as it was", () => {
    const note = reviewOf(SCENE, state([turn({ slips: [{ ...CASE_SLIP, reached: "NOMINATIVE" }] })])).notes[0];
    expect(note?.hunch?.says).not.toContain("The same thing is behind");
  });

  it("guesses nothing where the spelling names no case", () => {
    const note = reviewOf(SCENE, state([turn({ slips: [CASE_SLIP] })])).notes[0];
    expect(note?.hunch).toBeUndefined();
  });

  it("states the one rule that gets five forms for the price of one", () => {
    const slip: Slip = { kind: "person", said: "tulema", form: "tulen", lemma: "tulema" };
    const note = reviewOf(SCENE, state([turn({ slips: [slip] })])).notes[0];
    expect(note?.said).toBe("tulema");
    expect(note?.form).toBe("tulen");
    expect(note?.body).toContain("first");
    expect(note?.hunch?.says).toContain("dictionary lists a verb");
  });

  it("counts a turn in English without a word against it", () => {
    const note = reviewOf(SCENE, state([turn({ reading: "english" })])).notes.find((n) => n.id === "english");
    expect(note?.said).toBe("One turn in English");
    expect(note?.body).not.toMatch(/should|must|avoid/i);
  });

  /*
    Every Estonian character in a review is the learner's own word or the
    dictionary's recast, and the case names are read off `CASES`. The body of
    a note is English about Estonian, which is `lib/estonian/grammar.ts`'s own
    standing.
  */
  it("puts no Estonian in a note's body", () => {
    const slips: Slip[] = [
      CASE_SLIP,
      { kind: "person", said: "tulema", form: "tulen", lemma: "tulema" },
      { kind: "form", said: "valudeks", form: "valusid", lemma: "valu" },
      { kind: "spelling", said: "korvas", form: "kõrvas", lemma: "kõrv" },
    ];
    const review = reviewOf(SCENE, state([turn({ slips })]));
    expect(review.notes.length).toBe(4);
    for (const note of review.notes) {
      expect(note.body ?? "", note.id).not.toMatch(/[õäöüšž]/i);
    }
  });

  /*
    A hunch names cases, and the names are Estonian read off `CASES` rather
    than typed. What it may never do is state a guess as a finding.
  */
  it("marks a hunch as a guess and never as a finding", () => {
    const slip: Slip = { ...CASE_SLIP, said: "peal", reached: "ADESSIVE" };
    const note = reviewOf(SCENE, state([turn({ slips: [slip] })])).notes[0];
    expect(["likely", "possible"]).toContain(note?.hunch?.sure);
  });

  it("says something kind and true about a run where nothing was said", () => {
    const review = reviewOf(SCENE, state([], []));
    expect(review.lead).toMatch(/Nothing was said/);
    expect(review.notes).toEqual([]);
  });
});
