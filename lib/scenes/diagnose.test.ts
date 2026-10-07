import { describe, expect, it } from "vitest";
import { diagnose, diagnosePerson } from "./diagnose";

const NONE = { grammCase: null };

describe("why the wrong ending came out", () => {
  it("says nothing where the case they reached for cannot be named", () => {
    // `haigla` is its own nimetav, omastav and osastav, so naming any of them
    // would be a guess, and the review says which case was wanted and no more.
    expect(diagnose("ILLATIVE", undefined, NONE, "en")).toBeNull();
  });

  it("says nothing where they used the case that was asked for", () => {
    expect(diagnose("INESSIVE", "INESSIVE", NONE, "en")).toBeNull();
  });

  /*
    The strongest of the three, because it is a fact about this conversation
    rather than a pattern about learners, and it is the one somebody
    recognises about themselves.
  */
  it("names the case the question before wanted, ahead of everything else", () => {
    const hunch = diagnose("ELATIVE", "INESSIVE", { grammCase: "INESSIVE" }, "en");
    expect(hunch?.sure).toBe("likely");
    expect(hunch?.says).toContain("the question before");
  });

  /*
    `kus?` is answered by the seesütlev and the alalütlev, so a class teaches
    them together and they are swapped. Read off `CASES`, so the pair is the
    language's own and a fifteenth case would be covered by arriving.
  */
  it("names the pair that answers one question word, and which is which", () => {
    const hunch = diagnose("INESSIVE", "ADESSIVE", NONE, "en");
    expect(hunch?.sure).toBe("likely");
    /*
      Only the one they reached for. The note's own heading already says what
      the case that was due is for, so naming both here was that heading again
      inside a longer sentence.
    */
    expect(hunch?.says).toBe("you used the alalütlev. It answers kus? too, but it means “on, at, and have”.");
  });

  it("names the same pair the other way round, with the meanings the same way round", () => {
    const hunch = diagnose("ADESSIVE", "INESSIVE", NONE, "en");
    expect(hunch?.says).toBe("you used the seesütlev. It answers kus? too, but it means “in”.");
  });

  it("covers the other two question words the same way", () => {
    expect(diagnose("ILLATIVE", "ALLATIVE", NONE, "en")?.says).toContain("kuhu?");
    expect(diagnose("ELATIVE", "ABLATIVE", NONE, "en")?.says).toContain("kust?");
  });

  it("reads the plain word as the ending not having arrived", () => {
    const hunch = diagnose("INESSIVE", "NOMINATIVE", NONE, "en");
    expect(hunch?.sure).toBe("likely");
    expect(hunch?.says).toContain("the way the dictionary lists it");
  });

  /*
    The one tier that is not `likely`, because a stem where an ending was due
    fits several stories and the honest thing is to say which one this is.
  */
  it("offers the stem reading as a possibility rather than as a finding", () => {
    for (const reached of ["GENITIVE", "PARTITIVE"] as const) {
      const hunch = diagnose("INESSIVE", reached, NONE, "en");
      expect(hunch?.sure, reached).toBe("possible");
      expect(hunch?.says, reached).toContain("the base the ending gets added to");
    }
  });

  it("gives one hunch at most, and none where nothing fits", () => {
    expect(diagnose("INESSIVE", "TRANSLATIVE", NONE, "en")).toBeNull();
  });

  it("has one answer about the verb, because there is only one", () => {
    expect(diagnosePerson("en").sure).toBe("likely");
    expect(diagnosePerson("en").says).toContain("dictionary lists a verb");
  });

  it("never states a hunch as a fact", () => {
    const all = [
      diagnose("ELATIVE", "INESSIVE", { grammCase: "INESSIVE" }, "en"),
      diagnose("INESSIVE", "ADESSIVE", NONE, "en"),
      diagnose("INESSIVE", "NOMINATIVE", NONE, "en"),
      diagnose("INESSIVE", "GENITIVE", NONE, "en"),
      diagnosePerson("en"),
    ];
    for (const hunch of all) {
      expect(hunch).toBeTruthy();
      expect(hunch!.says, hunch!.says).not.toMatch(/\byou (did|were|forgot|confused)\b/i);
    }
  });
});
