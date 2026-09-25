import { describe, expect, it } from "vitest";
import { buildCheckpoint, checkpointPassed, type CheckpointWord } from "./checkpoint";
import { checkAnswer, countsAsRecalled } from "@/lib/estonian/answer";

const word = (lemma: string, extra: Partial<CheckpointWord> = {}): CheckpointWord => ({
  lemma,
  gloss: `${lemma} in English`,
  pos: "NOUN",
  examples: [],
  parts: { NOM_SG: lemma, GEN_SG: `${lemma}i`, PART_SG: `${lemma}it` },
  ...extra,
});

const WORDS: CheckpointWord[] = [
  word("maja", { examples: ["Maja on suur ja valge."], parts: { NOM_SG: "maja", GEN_SG: "maja", PART_SG: "maja" } }),
  word("tuba", { examples: ["Toas on soe."], parts: { NOM_SG: "tuba", GEN_SG: "toa", PART_SG: "tuba" } }),
  word("uks", { parts: { NOM_SG: "uks", GEN_SG: "ukse", PART_SG: "ust" } }),
  word("aken"), word("laud"), word("tool"), word("sein"), word("pilt"),
  word("klaas"), word("tass"), word("võti"), word("raamat"),
];

describe("buildCheckpoint", () => {
  it("asks only for production, never for a choice", () => {
    // Four options hand a quarter of the marks to somebody who knows nothing,
    // which is exactly the thing a level exam must not do.
    for (const q of buildCheckpoint(WORDS, 10, 1)) {
      expect(["type", "gap"]).toContain(q.kind);
    }
  });

  it("never repeats a word to reach the question count", () => {
    const questions = buildCheckpoint(WORDS, 10, 4);
    expect(new Set(questions.map((q) => q.lemma)).size).toBe(questions.length);
  });

  it("returns fewer questions rather than padding a thin level", () => {
    const questions = buildCheckpoint(WORDS.slice(0, 5), 20, 2);
    expect(questions.length).toBe(5);
  });

  /*
    A CHECKPOINT IS A MEASUREMENT AND PASSING IT MOVES A LEVEL, so a question
    nobody can get wrong is worse here than on a card. The screen prints "The
    word is X (meaning), in the form the sentence needs" under the sentence,
    which is the answer written out wherever the sentence wants the dictionary
    form: `Maja on suur ja valge.` gapped for `Maja`. 616 of the 1,354 course
    words that can carry a gap at all are in that state.
  */
  it("never gaps a form the cue above the box already spells", () => {
    const flat = word("kindlasti", {
      pos: "ADVERB", gloss: "definitely",
      examples: ["Koosolek toimub kindlasti."], parts: { NOM_SG: "kindlasti" },
    });
    // `maja` has only its own nominative sentence, `saun` is glossed "sauna"
    // and the sentence wants `sauna`, so the meaning gives that one away.
    const sauna = word("saun", {
      gloss: "sauna", examples: ["Pärast sauna jõime teed."],
      parts: { NOM_SG: "saun", GEN_SG: "sauna", PART_SG: "sauna" },
    });
    for (let seed = 1; seed <= 20; seed++) {
      for (const q of buildCheckpoint([flat, sauna, ...WORDS], 20, seed)) {
        if (q.kind !== "gap") continue;
        const cue = `${q.lemma} ${q.gloss}`.toLowerCase();
        expect(cue.split(/[^\p{L}]+/u), `${seed} ${q.lemma}`)
          .not.toContain(q.answer.toLowerCase());
      }
    }
  });

  it("asks a word it cannot gap honestly rather than dropping it", () => {
    // An adverb has one spelling, so it can never carry a gap whose answer is
    // not its own lemma. It is still asked: the typed question shows the
    // English and wants the Estonian, with nothing on screen to copy.
    const flat = word("kindlasti", {
      pos: "ADVERB", gloss: "definitely",
      examples: ["Koosolek toimub kindlasti."], parts: { NOM_SG: "kindlasti" },
    });
    const questions = buildCheckpoint([flat, ...WORDS], 20, 3);
    const asked = questions.find((q) => q.lemma === "kindlasti");
    expect(asked?.kind).toBe("type");
    expect(asked?.answer).toBe("kindlasti");
  });

  it("builds gap questions only from attested sentences", () => {
    const gaps = buildCheckpoint(WORDS, 12, 6).filter((q) => q.kind === "gap");
    // Some were built, or "only from attested sentences" is true of none.
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      const source = WORDS.find((w) => w.lemma === gap.lemma)!;
      expect(source.examples).toContain(gap.full);
      expect(gap.full).toContain(gap.answer);
      expect(gap.sentence).not.toEqual(gap.full);
    }
  });

  /*
    PASSING THIS MOVES A LEARNER UP A LEVEL, SO ANOTHER ENDING IS NOT A SLIP.
    `toast` is `toas` with one letter added, and without the word's other
    forms the typo rule read it as "One letter out." and counted it toward the
    pass. What the screen marks against is what is asserted here.
  */
  it("carries the word's other forms, so another case is marked wrong rather than close", () => {
    const gap = [1, 2, 3, 4, 5, 6, 7, 8]
      .flatMap((seed) => buildCheckpoint(WORDS, 12, seed))
      .find((q) => q.lemma === "tuba" && q.kind === "gap");
    expect(gap).toBeDefined();
    expect(gap!.answer).toBe("Toas");
    expect(gap!.rivals).toContain("toast");
    expect(gap!.rivals).not.toContain("toas");
    expect(checkAnswer("toast", gap!.answer, "et", gap!.rivals).verdict).toBe("wrong");
    expect(checkAnswer("toas", gap!.answer, "et", gap!.rivals).verdict).toBe("correct");
  });

  /*
    A CHECKPOINT REVIEWS A LEVEL ALREADY STUDIED, AND NO UNIT AT ANY LEVEL
    TEACHES HOW ESTONIAN FORMS A PLURAL. A gap wanting `sõbrad` for `sõber`
    tests the dictionary rather than the learner.
  */
  it("never gaps a plural, even where an attested sentence carries one", () => {
    const friend = word("sõber", {
      examples: ["Oleme ikka sõbrad edasi!"],
      parts: { NOM_SG: "sõber", GEN_SG: "sõbra", PART_SG: "sõpra", NOM_PL: "sõbrad" },
    });
    /*
      Asked of one word this could not fail. A checkpoint gaps
      `round(words × GAP_SHARE)` of its questions and one word rounds that to
      nought, so it never tried to build a gap at all and the loop below ran
      over nothing: the check passed with the plural rule deleted. Beside words
      with no sentence the checkpoint has to try every word that has one, and
      `tuba` is the control that says a gap is really being built, since a
      version that gapped nothing would pass the plural half as well.
    */
    const room = WORDS.find((w) => w.lemma === "tuba")!;
    const gaps = buildCheckpoint(
      [friend, room, word("aken"), word("laud"), word("tool"), word("sein")], 6, 1,
    ).filter((q) => q.kind === "gap");
    expect(gaps.map((g) => g.lemma)).toEqual(["tuba"]);
    for (const gap of gaps) expect(gap.answer.toLowerCase()).not.toBe("sõbrad");
  });

  it("marks another case of the word as wrong, not as a slip that passes", () => {
    const room = WORDS.find((w) => w.lemma === "tuba")!;
    // Two words, so the builder sets one gap and only `tuba` has a sentence.
    const gap = buildCheckpoint([room, word("aken")], 2, 1).find((q) => q.kind === "gap")!;
    expect(gap.answer.toLowerCase()).toBe("toas");
    // `toast` is one keystroke away and is the seestütlev: a checkpoint that
    // read it as a typo would count it toward passing the level.
    const typed = checkAnswer("toast", gap.answer, "et", gap.rivals);
    expect(countsAsRecalled(typed.verdict)).toBe(false);
    expect(gap.rivals).not.toContain("toas");
  });

  it("falls back to production for a word with no sentence", () => {
    const bare = buildCheckpoint(WORDS.filter((w) => w.examples.length === 0), 8, 3);
    expect(bare.length).toBeGreaterThan(0);
    expect(bare.every((q) => q.kind === "type")).toBe(true);
    for (const q of bare) expect(q.answer).toBe(q.lemma);
  });

  it("is deterministic for a seed", () => {
    expect(JSON.stringify(buildCheckpoint(WORDS, 8, 5)))
      .toBe(JSON.stringify(buildCheckpoint(WORDS, 8, 5)));
    expect(JSON.stringify(buildCheckpoint(WORDS, 8, 5)))
      .not.toBe(JSON.stringify(buildCheckpoint(WORDS, 8, 6)));
  });

  it("has nothing to ask about an empty level", () => {
    expect(buildCheckpoint([], 20, 1)).toEqual([]);
  });
});

describe("checkpointPassed", () => {
  it("passes at the mark, not above it", () => {
    expect(checkpointPassed(16, 20, 80)).toBe(true);
    expect(checkpointPassed(15, 20, 80)).toBe(false);
  });

  it("refuses to pass an exam that asked nothing", () => {
    expect(checkpointPassed(0, 0, 80)).toBe(false);
  });
});
