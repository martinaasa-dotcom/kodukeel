import { describe, expect, it } from "vitest";
import { CHATTY_WORDS, extraWordsOf, needsComposer, type TurnNeed } from "./onRails";

/** A clean answer to the beat that was asked, with the bank holding the next line. */
const RAILS: TurnNeed = {
  turns: 3, reading: "complete", landed: true, unanswered: false, news: false,
  closingOnNews: false, extraWords: 2, bankHasLine: true,
};

describe("which turns need a person", () => {
  it("answers a clean answer from the bank", () => {
    expect(needsComposer(RAILS)).toBe(false);
  });

  it("opens the scene from the bank, since nothing has been said to answer", () => {
    expect(needsComposer({ ...RAILS, turns: 0, reading: null, landed: false, extraWords: 0 })).toBe(false);
  });

  it("asks the model wherever the bank has nothing for the move", () => {
    expect(needsComposer({ ...RAILS, bankHasLine: false })).toBe(true);
    expect(needsComposer({ ...RAILS, turns: 0, reading: null, bankHasLine: false })).toBe(true);
  });

  it("asks the model where real Estonian missed, since the question again is the machine", () => {
    for (const reading of ["offtarget", "incomplete", "fragment"] as const) {
      expect(needsComposer({ ...RAILS, reading, landed: false }), reading).toBe(true);
    }
  });

  it("asks the model for a question nothing prepared answers, news, and a goodbye after news", () => {
    expect(needsComposer({ ...RAILS, unanswered: true })).toBe(true);
    expect(needsComposer({ ...RAILS, news: true })).toBe(true);
    expect(needsComposer({ ...RAILS, closingOnNews: true })).toBe(true);
  });

  it("leaves to the prepared lines what they were written for", () => {
    // A turn nobody could read is the repair phrase, English is answered in character,
    // and a learner who says they are lost is handed the word: none of it is a person's to write.
    for (const reading of ["unrecognised", "english", "lost", "echo"] as const) {
      expect(needsComposer({ ...RAILS, reading, landed: false }), reading).toBe(false);
    }
  });

  it("keeps an answer phrased as a sentence on rails, and a turn that volunteered something off them", () => {
    expect(needsComposer({ ...RAILS, extraWords: CHATTY_WORDS - 1 })).toBe(false);
    expect(needsComposer({ ...RAILS, extraWords: CHATTY_WORDS })).toBe(true);
    // Chatter on a turn that did not land is a miss, and is decided by its reading.
    expect(needsComposer({ ...RAILS, landed: false, reading: "unrecognised", extraWords: 20 })).toBe(false);
  });
});

describe("what a turn said beyond the answer", () => {
  it("counts the words that did not meet the beat", () => {
    expect(extraWordsOf(["ma", "elan", "kolmandal", "korrusel"], ["kolmandal"], ["kolmandal"])).toBe(3);
    expect(extraWordsOf(["poodi"], ["poodi"], undefined)).toBe(0);
  });

  it("reads a row written before the fields existed as all extra, which errs toward the model", () => {
    expect(extraWordsOf(["tere", "ma", "olen", "mari"], undefined, undefined)).toBe(4);
  });

  it("is not fooled by case", () => {
    expect(extraWordsOf(["Tere"], ["tere"], undefined)).toBe(0);
  });
});
