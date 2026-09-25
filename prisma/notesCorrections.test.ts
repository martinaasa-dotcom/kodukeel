import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readNotesCorrections } from "./expanded";

/*
  `notes-corrections.json` is what a deployment seeded before the fix is
  corrected by, and `expanded.json` is what a fresh one is seeded from. If the
  two disagreed, the same entry would carry different notes depending on when
  somebody installed the app.
*/
const entries = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as
  { lemma: string; pos: string; notes: string | null }[];
const byKey = new Map(entries.map((e) => [`${e.lemma}|${e.pos}`, e]));

describe("the notes corrections", () => {
  const corrections = readNotesCorrections();

  it("are read, all of them", () => {
    expect(corrections.length).toBe(117);
  });

  it("end on the notes the shipped file holds", () => {
    for (const c of corrections) {
      const entry = byKey.get(`${c.lemma}|${c.pos}`);
      expect(entry, `${c.lemma} is not in the file`).toBeDefined();
      expect(entry!.notes, c.lemma).toBe(c.notesTo);
    }
  });

  it("each take out at least one sense that belonged to another word", () => {
    /*
      Not "only ever narrow": the old rule spent one of its three places on the
      other word, so the first word's next sense can move up into it (`lood`
      gains "islet"). What every correction does is drop something.
    */
    for (const c of corrections) {
      const to = new Set(c.notesTo?.split("; ") ?? []);
      expect(c.notesFrom.split("; ").some((sense) => !to.has(sense)), c.lemma).toBe(true);
    }
  });
});
