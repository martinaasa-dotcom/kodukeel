import { describe, expect, it } from "vitest";
import { CASES } from "./cases";
import { caseReading } from "./caseReading";
import type { CaseSubject } from "./caseQuestion";

// The two shapes the table draws apart, out of the Institute's own codes: a
// book is a `mis` and a man is a `kes`. See lib/collections/demoWords.ts.
const thing: CaseSubject = { lemma: "raamat", semanticTypes: "esitus", nomSg: "raamat" };
const person: CaseSubject = { lemma: "mees", semanticTypes: "inimene", nomSg: "mees" };
const unknown: CaseSubject = { lemma: "raamat", semanticTypes: null, nomSg: "raamat" };

describe("caseReading", () => {
  it("says what the word means wearing the ending", () => {
    expect(caseReading("INESSIVE", "book", thing)).toBe("in the book");
    expect(caseReading("ELATIVE", "book", thing)).toBe("out of the book");
    expect(caseReading("COMITATIVE", "book", thing)).toBe("with the book");
    expect(caseReading("ABLATIVE", "book", thing)).toBe("off the book");
  });

  it("says it the way English says it about a person", () => {
    // The same three letters and not the same sentence. `mehele` is to the
    // man, and `mehel` is the have-construction turned inside out, which is
    // the one thing an English speaker has nothing to carry over for.
    expect(caseReading("ALLATIVE", "man", person)).toBe("to the man");
    expect(caseReading("ADESSIVE", "man", person)).toBe("the man has it");
    expect(caseReading("ABLATIVE", "man", person)).toBe("from the man");
    expect(caseReading("ALLATIVE", "book", thing)).toBe("onto the book");
    expect(caseReading("ADESSIVE", "book", thing)).toBe("on the book");
  });

  it("says nothing where the language does not put the word in that case", () => {
    // `sõbras` is not how anybody says it, so a reading for it would be this
    // app teaching a form nobody uses. `caseIsUnsaidFor` is the one predicate.
    expect(caseReading("INESSIVE", "man", person)).toBeNull();
    expect(caseReading("ILLATIVE", "man", person)).toBeNull();
    expect(caseReading("ELATIVE", "man", person)).toBeNull();
    // And the other way is never refused: `raamatule` is ordinary Estonian.
    expect(caseReading("ALLATIVE", "book", thing)).not.toBeNull();
  });

  it("leaves the one case English does not mark alone", () => {
    /*
      "some of the man" is a portion of a person and `Ma loen raamatut` is not
      reading some of a book. The osastav's own note says English marks none of
      this, and a frame claiming otherwise contradicts the paragraph printed
      under it on the same screen.
    */
    expect(caseReading("PARTITIVE", "book", thing)).toBeNull();
    expect(caseReading("PARTITIVE", "man", person)).toBeNull();
  });

  it("strips an article the gloss brought with it", () => {
    // 74 first senses in the shipped dictionary open with one, and the frame
    // supplies its own: "in the an american", "in the the public sphere".
    expect(caseReading("INESSIVE", "an american", thing)).toBe("in the american");
    expect(caseReading("INESSIVE", "the public sphere", thing)).toBe("in the public sphere");
    expect(caseReading("ESSIVE", "an american", thing)).toBe("as an american");
    // And the article does not eat a word of the length budget.
    expect(caseReading("INESSIVE", "a young unmarried woman", thing)).toBe("in the young unmarried woman");
  });

  it("says an by sound rather than by spelling", () => {
    // The two classes where English and the first letter disagree, measured
    // over the shipped dictionary as the whole of it: 5 senses and 32.
    expect(caseReading("ESSIVE", "hour", thing)).toBe("as an hour");
    expect(caseReading("ESSIVE", "honest", thing)).toBe("as an honest");
    expect(caseReading("ESSIVE", "university", thing)).toBe("as a university");
    expect(caseReading("ESSIVE", "euro", thing)).toBe("as a euro");
    expect(caseReading("ESSIVE", "user", thing)).toBe("as a user");
    expect(caseReading("ESSIVE", "one", thing)).toBe("as a one");
    // And the guard that keeps `uni` off the words that really do take "an".
    expect(caseReading("ESSIVE", "uninteresting", thing)).toBe("as an uninteresting");
    expect(caseReading("ESSIVE", "unimportant", thing)).toBe("as an unimportant");
    expect(caseReading("ESSIVE", "uncle", person)).toBe("as an uncle");
  });

  it("reads a gloss down to its first sense", () => {
    // `tuba` ships as "room, chamber" on the expansion. The whole list in a
    // frame is what lib/estonian/plainAsk.ts refused, and rightly.
    expect(caseReading("INESSIVE", "room, chamber", thing)).toBe("in the room");
    expect(caseReading("INESSIVE", "hand, arm", thing)).toBe("in the hand");
    // A qualifier is a note on the entry rather than part of the reading.
    expect(caseReading("INESSIVE", "bread (dark)", thing)).toBe("in the bread");
    // A sense that is a sentence is one to leave alone: 63 of 5,194 measured,
    // counted after the article is stripped, which is the order they run in.
    expect(caseReading("INESSIVE", "twilight before rising of the sun", thing)).toBeNull();
    // And an article does not push a short sense over the budget.
    expect(caseReading("INESSIVE", "a large uninhabited forest", thing))
      .toBe("in the large uninhabited forest");
  });

  it("puts an article on the two frames that introduce a role, and gets it right", () => {
    expect(caseReading("ESSIVE", "man", person)).toBe("as a man");
    expect(caseReading("TRANSLATIVE", "man", person)).toBe("becoming a man");
    expect(caseReading("ESSIVE", "engineer", person)).toBe("as an engineer");
  });

  it("says nothing rather than something nobody can read", () => {
    // A gloss that is a sentence is a gloss to leave alone: the case's own
    // explanation is on the same screen and says it properly.
    expect(caseReading("INESSIVE", "", thing)).toBeNull();
    expect(caseReading("INESSIVE", "the person who looks after a building", thing)).toBeNull();
  });

  it("answers for every case but the one it refuses on purpose", () => {
    // An unclassified word keeps the inside trio and every other case, which
    // is what `caseIsUnsaidFor` refusing to guess means one module over. A
    // missing frame would be a blank line on a row whose subject it is, so
    // the osastav is the only silence and it is a decision rather than a gap.
    const silent = CASES.filter((spec) => caseReading(spec.key, "book", unknown) === null);
    expect(silent.map((spec) => spec.key)).toEqual(["PARTITIVE"]);
  });

  it("holds no Estonian", () => {
    // The standing rule `lib/estonian/grammar.ts` is held to, one file over:
    // delete every Estonian word from the comments and the output is the same.
    // A regex cannot tell prose from a smuggled form, and Estonian of any
    // length reaches for its own letters.
    const readings = CASES.flatMap((spec) => [
      caseReading(spec.key, "book", thing),
      caseReading(spec.key, "man", person),
    ]);
    for (const reading of readings) expect(reading ?? "").not.toMatch(/[õäöüšž]/i);
  });
});
