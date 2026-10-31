import { describe, expect, it } from "vitest";
import { EMPTY_LEDGER, teach } from "./ledger";
import { onlyUntaught, readUntaught } from "./read";
import type { LessonSpec } from "./types";

/**
 * A TEXT TO READ UNDERLINES THE WORDS THE LESSONS HAVE NOT TAUGHT, AND ONLY
 * THOSE (`read.ts`): a word the learner was taught is drawn plain, a new one
 * keeps the dictionary under it, and a name is never new.
 */
const lesson = {
  id: "t", n: 1, level: "B2", part: "p", kind: "lesson", title: "t", goal: "t",
  cast: { Mari: "mari" }, conversation: [], teaches: [], how: { point: "p", watchOut: "w" }, answers: [],
  read: { genre: "a notice", lines: [{ et: "Homme remonditakse lifti, Mari.", en: "x" }, { et: "Homme.", en: "x" }] },
} as unknown as LessonSpec;
const ledger = teach(EMPTY_LEDGER, [{ kind: "word", et: "homme", en: "tomorrow" }], 1);

describe("a text to read", () => {
  it("names per line the words the ledger does not cover, a name aside", () => {
    expect(readUntaught(lesson, ledger).map((s) => [...s])).toEqual([["remonditakse", "lifti"], []]);
    expect(readUntaught({ ...lesson, read: undefined }, ledger)).toEqual([]);
  });

  it("keeps the dictionary under an untaught word and takes it off a taught one", () => {
    const entry = { lemma: "x" };
    const tokens = [
      { text: "Homme", word: true, entry },
      { text: " ", word: false, entry: null },
      { text: "lifti", word: true, entry },
      { text: "kuskil", word: true, entry: null },
    ];
    const kept = onlyUntaught(tokens, new Set(["lifti", "kuskil"]));
    expect(kept.map((t) => t.entry)).toEqual([null, null, entry, null]);
    // The text is never touched: joining the runs gives the line back.
    expect(kept.map((t) => t.text).join("")).toBe(tokens.map((t) => t.text).join(""));
  });
});
