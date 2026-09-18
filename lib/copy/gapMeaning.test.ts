import { describe, expect, it } from "vitest";
import { gapMeaning } from "./gapMeaning";

const marked = (m: ReturnType<typeof gapMeaning>) =>
  m?.runs.find((run) => run.asked)?.text ?? null;
const whole = (m: ReturnType<typeof gapMeaning>) =>
  m?.runs.map((run) => run.text).join("") ?? null;

describe("gapMeaning", () => {
  it("marks the gloss inside the sentence, which is the report this was written for", () => {
    const m = gapMeaning({ en: "Let's meet at four.", answer: "neli", cue: "four" });
    expect(marked(m)).toBe("four");
    expect(whole(m)).toBe("Let's meet at four.");
    expect(m?.marked).toBe(true);
  });

  it("keeps the whole sentence, punctuation and all, around the mark", () => {
    const m = gapMeaning({ en: "The room is big.", answer: "toas", cue: "tuba, room" });
    expect(m?.runs.map((r) => [r.text, r.asked])).toEqual([
      ["The ", false], ["room", true], [" is big.", false],
    ]);
  });

  it("says nothing at all where the English carries the answer whole", () => {
    // The learn ladder's own guard, moved here rather than copied.
    expect(gapMeaning({ en: "I watched the film.", answer: "film", cue: "film" })).toBeNull();
  });

  it("draws the sentence and marks nothing where the mark would be the answer", () => {
    // `film` is not `filmi`, so `mentions` lets the line through, and a bold
    // `film` over a gap wanting `filmi` points at the answer.
    const m = gapMeaning({ en: "I watched the film.", answer: "filmi", cue: "film" });
    expect(m?.marked).toBe(false);
    expect(whole(m)).toBe("I watched the film.");
  });

  it("reads a loanword through the fold, both ways round", () => {
    expect(gapMeaning({ en: "It is August.", answer: "augustis", cue: "August" })?.marked).toBe(false);
    expect(gapMeaning({ en: "A short pause.", answer: "pausi", cue: "pause" })?.marked).toBe(false);
  });

  it("never reads a two-letter overlap as one word", () => {
    const m = gapMeaning({ en: "We go to the shop.", answer: "poodi", cue: "shop" });
    expect(marked(m)).toBe("shop");
  });

  it("prefers the longer sense over the one standing inside it", () => {
    const m = gapMeaning({ en: "She is at the post office.", answer: "postkontoris", cue: "post office, office" });
    expect(marked(m)).toBe("post office");
  });

  it("marks a word the sentence opens with", () => {
    const m = gapMeaning({ en: "Four people came.", answer: "neli", cue: "four" });
    expect(m?.runs.map((r) => [r.text, r.asked])).toEqual([["Four", true], [" people came.", false]]);
  });

  it("matches a whole word only", () => {
    // `one` inside `money` is not the word.
    const m = gapMeaning({ en: "He has no money.", answer: "üks", cue: "one" });
    expect(m?.marked).toBe(false);
  });

  it("reads Estonian's own letters as letters at a boundary", () => {
    expect(gapMeaning({ en: "õun on laual", answer: "xxx", cue: "un" })?.marked).toBe(false);
  });

  it("is nothing where no translation is stored yet", () => {
    expect(gapMeaning({ en: null, answer: "neli", cue: "four" })).toBeNull();
    expect(gapMeaning({ en: "   ", answer: "neli", cue: "four" })).toBeNull();
  });

  it("draws the sentence unmarked where the card has no cue to mark by", () => {
    const m = gapMeaning({ en: "Let's meet at four.", answer: "neli", cue: null });
    expect(m?.marked).toBe(false);
    expect(whole(m)).toBe("Let's meet at four.");
  });

  it("ignores a qualifier the course wrote to keep two words apart", () => {
    const m = gapMeaning({ en: "We ate dark bread.", answer: "leiba", cue: "bread (dark)" });
    expect(marked(m)).toBe("bread");
  });

  it("marks a verb the gloss writes with 'to'", () => {
    const m = gapMeaning({ en: "She wants to help.", answer: "aidata", cue: "to help" });
    expect(marked(m)).toBe("help");
  });
});

describe("gapMeaning, where the back carries every accepted spelling", () => {
  it("withholds the line over either of them", () => {
    expect(gapMeaning({ en: "I go into the room.", answer: "tuppa / toasse", cue: "room" })).not.toBeNull();
    expect(gapMeaning({ en: "The film was long.", answer: "film / filmi", cue: "film" })).toBeNull();
  });

  it("refuses the mark over either of them", () => {
    const m = gapMeaning({ en: "It was in August.", answer: "augustis / augustil", cue: "August" });
    expect(m?.marked).toBe(false);
  });
});

describe("gapMeaning, where the cue carries the Estonian lemma", () => {
  it("never marks the lemma inside an English sentence", () => {
    // `on` is the third person of `olema` and a word in half the English
    // sentences there are.
    const m = gapMeaning({
      en: "The book is on the table.", answer: "oli", cue: "on, is", lemma: "on",
    });
    expect(m?.runs.find((r) => r.asked)?.text).toBe("is");
  });

  it("marks the meaning and not the headword beside it", () => {
    const m = gapMeaning({
      en: "The room is big.", answer: "toas", cue: "tuba, room", lemma: "tuba",
    });
    expect(m?.runs.find((r) => r.asked)?.text).toBe("room");
  });
});

describe("gapMeaning, where the sentence is plural and the gloss is not", () => {
  it("marks the regular plural of a singular headword", () => {
    // The commonest miss there was, measured over every gap card the shipped
    // dictionary builds: the gap is plural in Estonian and a gloss is singular
    // because a dictionary headword is.
    const m = gapMeaning({ en: "I like reading books.", answer: "raamatuid", cue: "raamat, book", lemma: "raamat" });
    expect(m?.runs.find((r) => r.asked)?.text).toBe("books");
  });

  it("marks the plurals no ending reaches", () => {
    const person = gapMeaning({ en: "Young and educated people.", answer: "inimesed", cue: "person, human" });
    expect(person?.runs.find((r) => r.asked)?.text).toBe("people");
    const child = gapMeaning({ en: "There are 25 children in the class.", answer: "last", cue: "laps, child", lemma: "laps" });
    expect(child?.runs.find((r) => r.asked)?.text).toBe("children");
  });

  it("spells the plural of a sibilant and of a consonant plus y", () => {
    expect(gapMeaning({ en: "Soft and hard cheeses.", answer: "juustud", cue: "juust, cheese", lemma: "juust" })
      ?.runs.find((r) => r.asked)?.text).toBe("cheeses");
    expect(gapMeaning({ en: "The countries agreed.", answer: "riigid", cue: "riik, country", lemma: "riik" })
      ?.runs.find((r) => r.asked)?.text).toBe("countries");
  });

  it("leaves the singular marked where the sentence is singular", () => {
    const m = gapMeaning({ en: "The room is big.", answer: "toas", cue: "tuba, room", lemma: "tuba" });
    expect(m?.runs.find((r) => r.asked)?.text).toBe("room");
  });

  it("inflects nothing too short to be safe, since `us` would look for `uses`", () => {
    const m = gapMeaning({ en: "He uses it daily.", answer: "meid", cue: "us" });
    expect(m?.marked).toBe(false);
  });

  it("never prints a shape the sentence does not carry", () => {
    // The scanner's rule: a derived spelling is something to look *for*, so a
    // wrong guess matches nothing and costs a mark rather than a wrong word.
    const m = gapMeaning({ en: "The ox is in the field.", answer: "härgi", cue: "härg, ox", lemma: "härg" });
    expect(m?.runs.map((r) => r.text).join("")).toBe("The ox is in the field.");
    expect(m?.runs.find((r) => r.asked)?.text).toBe("ox");
  });
});
