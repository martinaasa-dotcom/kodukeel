import { describe, expect, it } from "vitest";

import { counted, nounFor } from "./values";

/*
  The cases these were written for are the ones a reader actually meets: a
  first evening with one card due, the fastest setting on a short starter
  deck, and a workplace group with one member the log cannot place.
*/
describe("a count agrees with the thing it counts", () => {
  it("says one of a thing in the singular", () => {
    expect(counted(1, "card")).toBe("1 card");
    expect(counted(1, "week")).toBe("1 week");
  });

  it("says any other number in the plural", () => {
    expect(counted(0, "card")).toBe("0 cards");
    expect(counted(2, "card")).toBe("2 cards");
    expect(counted(15, "week")).toBe("15 weeks");
  });

  /*
    Irregulars are handed over rather than worked out. A rule here would have
    to know that a person is people and a sentence is sentences, and the one
    that gets it wrong is the one nobody notices until it is on a screen.
  */
  it("takes an irregular plural rather than guessing one", () => {
    expect(counted(1, "person", "people")).toBe("1 person");
    expect(counted(4, "person", "people")).toBe("4 people");
  });

  it("gives the noun alone where the sentence puts the number elsewhere", () => {
    expect(nounFor(1, "word")).toBe("word");
    expect(nounFor(3, "word")).toBe("words");
    expect(nounFor(1, "person", "people")).toBe("person");
  });
});
