import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  A pinned entry is one whose Wiktionary page holds more than one word, and its
  notes were that page's other senses: `kurk` pinned to the throat carried
  "cucumber", `maks` the liver "tax, payment", `vaht` the foam "guard", and the
  dictionary entry printed them as further meanings of the word it is about.
  Fourteen of the fifteen pinned entries carried one. The file ships none now,
  `scripts/audit-homonyms.ts` writes none when it applies a pin, and the seed
  clears what an earlier file left on a deployment (`clearPinnedNotes`).
*/
const pins = JSON.parse(readFileSync("prisma/data/homonym-pins.json", "utf8")) as Record<string, number>;
const entries = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as
  { lemma: string; pos: string; notes?: string | null; ekilexWordId: number }[];

describe("a pinned homonym", () => {
  const pinned = entries.filter((e) => `${e.lemma}|${e.pos}` in pins);

  it("is in the file, one entry per pin", () => {
    expect(pinned.length).toBe(Object.keys(pins).length);
  });

  it("carries no notes, which would be the other word's senses", () => {
    expect(pinned.filter((e) => e.notes != null).map((e) => `${e.lemma}: ${e.notes}`)).toEqual([]);
  });

  it("is the word it is pinned to", () => {
    for (const e of pinned) expect(e.ekilexWordId).toBe(pins[`${e.lemma}|${e.pos}`]);
  });
});
