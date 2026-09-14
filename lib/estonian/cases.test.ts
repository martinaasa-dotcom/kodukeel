import { describe, expect, it } from "vitest";

import { CASES, QUESTION_WORDS, caseByKey, questionInEnglish } from "./cases";

/**
 * The readings are what an English speaker gets instead of the Latin name, so
 * a case with a question and no reading is a row that silently goes back to
 * being four opaque letters. Every claim here is about the table itself, which
 * is the one kind of claim a unit test can make about it.
 */
describe("what each question word is asking", () => {
  it("gives every question word in the table a reading", () => {
    for (const spec of CASES) {
      expect(spec.asksPersonEn, `${spec.key} has no reading for ${spec.asksPerson}`).toBeTruthy();
      expect(spec.asksThingEn, `${spec.key} has no reading for ${spec.asksThing}`).toBeTruthy();
      // In step rather than merely present: a case with a place adverb and no
      // reading for it, or a reading for an adverb it does not have, is the
      // pair coming apart.
      expect(Boolean(spec.asksWhereEn), `${spec.key} pairs asksWhere with asksWhereEn`)
        .toBe(Boolean(spec.asksWhere));
    }
  });

  it("reads one question word the same way wherever it occurs", () => {
    // `kuhu?` names the sisseütlev and the alaleütlev, `kus?` and `kust?` name
    // a pair each. Two readings of one word would be two answers to one
    // question, which is the fault `questionInEnglish` exists to have only one
    // of: it is keyed on the word, so the second reading would simply be lost
    // rather than argued about.
    const seen = new Map<string, string>();
    for (const spec of CASES) {
      const pairs: [string, string | null][] = [
        [spec.asksPerson, spec.asksPersonEn],
        [spec.asksThing, spec.asksThingEn],
        [spec.asksWhere ?? "", spec.asksWhereEn],
      ];
      for (const [word, english] of pairs) {
        if (!word || !english) continue;
        const held = seen.get(word);
        if (held) expect(english, `${word} reads two ways`).toBe(held);
        seen.set(word, english);
      }
    }
    expect(seen.size).toBe(QUESTION_WORDS.length);
  });

  it("never gives two cases the same reading for the same kind of word", () => {
    // Two rows reading alike would make the column useless exactly where it is
    // meant to help: the learner reading down it cannot tell the seesütlev
    // from the alalütlev if both say "what is it on?".
    const things = CASES.map((c) => c.asksThingEn);
    expect(new Set(things).size).toBe(things.length);
    const people = CASES.map((c) => c.asksPersonEn);
    expect(new Set(people).size).toBe(people.length);
  });

  it("holds no Estonian, which is what makes it English about Estonian", () => {
    // The tripwire `lib/estonian/grammar.ts` carries, for the same reason:
    // a reading is authored English about a question word, and a form
    // smuggled into one would be this app writing Estonian (ADR-005).
    const ESTONIAN = /[õäöüšž]/i;
    for (const spec of CASES) {
      for (const reading of [spec.asksPersonEn, spec.asksThingEn, spec.asksWhereEn ?? ""]) {
        expect(ESTONIAN.test(reading), `${spec.key} reads with Estonian in it: ${reading}`).toBe(false);
      }
    }
  });
});

describe("the short reading, for a label with no word in front of it", () => {
  it("is the thing question and the place adverb, and never the person one", () => {
    // A search result naming the form somebody typed and a chip under a
    // heading hold a spelling rather than a subject, so they read the `mis`
    // series: see `asksEn`. The case's whole name stays `questionEn`.
    expect(caseByKey("INESSIVE")!.asksEn).toBe("what is it in? where?");
    expect(caseByKey("COMITATIVE")!.asksEn).toBe("with what?");
    expect(caseByKey("NOMINATIVE")!.asksEn).toBe("what?");
  });

  it("is shorter than the whole name wherever the two differ", () => {
    for (const spec of CASES) {
      expect(spec.asksEn.length, spec.key).toBeLessThan(spec.questionEn.length);
      expect(spec.questionEn.endsWith(spec.asksEn), spec.key).toBe(true);
    }
  });
});

describe("reading a whole question", () => {
  it("reads a case's own name, every word of it", () => {
    const inessive = caseByKey("INESSIVE")!;
    expect(inessive.question).toBe("kelles? milles? kus?");
    expect(questionInEnglish(inessive.question)).toBe("in whom? what is it in? where?");
    expect(inessive.questionEn).toBe("in whom? what is it in? where?");
  });

  it("reads the one word a card actually prints", () => {
    expect(questionInEnglish("kuhu?")).toBe("where to?");
    expect(questionInEnglish("millena?")).toBe("what would it be as?");
    expect(questionInEnglish("kes?")).toBe("who?");
    expect(questionInEnglish("mis?")).toBe("what?");
  });

  it("says nothing rather than guessing at a question it does not know", () => {
    // `kellel on?` is the olema page's question and is not a case. A screen
    // handed null prints the Estonian on its own, which is what it did before
    // any of this existed.
    expect(questionInEnglish("kellel on?")).toBeNull();
    expect(questionInEnglish(null)).toBeNull();
    expect(questionInEnglish("")).toBeNull();
  });

  it("drops a word it does not know rather than the words it does", () => {
    expect(questionInEnglish("milles? mingi?")).toBe("what is it in?");
  });
});
