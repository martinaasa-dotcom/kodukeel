import { describe, expect, it } from "vitest";
import { isExactForm } from "@/lib/dict/forms";
import { VOICES } from "@/lib/audio/voice";
import { JOKES, jokeIndexFor, jokesFor, splitLine, voiceFor } from "./jokes";

/*
  THE NAMES, AND THE TWO WORDS A JOKE IS ABOUT. The forms list holds no
  capitalised word on purpose, so a place, a person or a book is let through
  here by name, and only capitalised: the same spelling in lower case is
  checked like any other word. Each entry is a decision, not a parking space,
  and the staleness test below fails on one nothing uses any more.
*/
const NAMES = new Set([
  "Juku", "Mari", "Titanicul", "Kolumbus", "Eestis", "Ameerikat", "Napoleon",
  "Estonia", "Kalevipoja",
]);
/** Not Estonian a dictionary keeps, and the reason the joke is a joke. */
const ON_PURPOSE = new Map([
  ["jäääär", "Four of one letter in a row is what the teacher asked for; the forms list does not hold the compound."],
  ["know", "The English the English lesson is about."],
]);

const WORD = /[\p{L}\p{M}]+/gu;
const ESTONIAN_LETTER = /[õäöüšžÕÄÖÜŠŽ]/;

describe("the jokes", () => {
  it("are plenty, so a learner meets each about twice a year at most", () => {
    expect(JOKES.length).toBeGreaterThanOrEqual(180);
  });

  it("pair every Estonian line with an English one, and keep Estonian out of the English", () => {
    let lines = 0;
    for (const [i, joke] of JOKES.entries()) {
      expect(joke.length, `joke ${i} is empty`).toBeGreaterThan(0);
      for (const [et, en] of joke) {
        lines += 1;
        expect(et.trim(), `joke ${i}`).toBe(et);
        expect(en.trim().length, `joke ${i}: "${et}" has no English`).toBeGreaterThan(0);
        // A name keeps its letters (Pärnu, Emajõgi); nothing else in the English may.
        const unnamed = en.replace(/\p{Lu}[\p{L}\p{M}]*/gu, "");
        expect(ESTONIAN_LETTER.test(unnamed), `joke ${i}: "${en}" carries an Estonian letter`).toBe(false);
        // The same speaker on both sides, so the English reads as the same dialogue.
        const said = splitLine(et).by;
        expect(splitLine(en).by === null, `joke ${i}: "${et}" and "${en}" disagree about who speaks`).toBe(said === null);
      }
    }
    expect(lines).toBeGreaterThan(JOKES.length);
  });

  it("are made of words the shipped forms list knows, or of names let through by name", async () => {
    const used = new Set<string>();
    // Every spelling once, in the order the forms list keeps its shards, so the
    // check reads each shard once rather than once per word.
    const where = new Map<string, number>();
    for (const [i, joke] of JOKES.entries()) {
      for (const [et] of joke) {
        for (const match of splitLine(et).text.matchAll(WORD)) {
          const word = match[0];
          if (NAMES.has(word)) { used.add(word); continue; }
          const lower = word.toLocaleLowerCase("et");
          if (ON_PURPOSE.has(lower)) { used.add(lower); continue; }
          if (!where.has(lower)) where.set(lower, i);
        }
      }
    }
    const spellings = [...where.keys()].sort();
    expect(spellings.length).toBeGreaterThan(500);
    for (const word of spellings) {
      expect(await isExactForm(word), `joke ${where.get(word)}: "${word}" is not a spelling the forms list knows`).toBe(true);
    }
    for (const name of [...NAMES, ...ON_PURPOSE.keys()]) {
      expect(used.has(name), `${name} is let through and no joke uses it`).toBe(true);
    }
  }, 60_000);

  it("are not told twice", () => {
    const openings = JOKES.map((joke) => joke.map(([et]) => et).join(" "));
    expect(new Set(openings).size).toBe(JOKES.length);
  });

  it("carry no dash a reader would see, the way every screen here does not", () => {
    for (const joke of JOKES) {
      for (const [et, en] of joke) {
        expect(et).not.toMatch(/[–—]/);
        expect(en).not.toMatch(/[–—]/);
      }
    }
  });
});

describe("who says a line", () => {
  it("is the one capitalised word before a colon, or nobody", () => {
    expect(splitLine("Õpetaja: Juku, too näide!")).toEqual({ by: "Õpetaja", text: "Juku, too näide!" });
    expect(splitLine("Juku kirjutab: kas.")).toEqual({ by: null, text: "Juku kirjutab: kas." });
    expect(splitLine("Pärast lõunat.")).toEqual({ by: null, text: "Pärast lõunat." });
  });
});

describe("the voice a line is read in", () => {
  it("is one the speech service offers, for every speaker in every joke", () => {
    const offered = new Set(VOICES.map((v) => v.id));
    const speakers = new Set(JOKES.flatMap((joke) => joke.map(([et]) => splitLine(et).by)));
    expect(speakers.size).toBeGreaterThan(5);
    for (const by of speakers) {
      if (by === null) expect(voiceFor(by)).toBeNull();
      else expect(offered.has(voiceFor(by) ?? ""), `${by} has no voice`).toBe(true);
    }
  });

  it("is not the same for Juku and the person he is talking to", () => {
    for (const joke of JOKES) {
      const voices = new Set(joke.map(([et]) => splitLine(et).by).filter((by) => by !== null).map(voiceFor));
      const people = new Set(joke.map(([et]) => splitLine(et).by).filter((by) => by !== null));
      if (people.has("Juku") && people.size > 1) expect(voices.size, joke[0]![0]).toBeGreaterThan(1);
    }
  });
});

describe("which joke today", () => {
  it("does not repeat until every joke has been told", () => {
    const seen = new Set<number>();
    const start = Date.UTC(2026, 0, 1);
    for (let d = 0; d < JOKES.length; d++) {
      seen.add(jokeIndexFor(new Date(start + d * 86_400_000).toISOString().slice(0, 10)));
    }
    expect(seen.size).toBe(JOKES.length);
  });

  it("is the same all day, and the next ones never include it", () => {
    expect(jokeIndexFor("2026-10-14")).toBe(jokeIndexFor("2026-10-14"));
    const more = jokesFor("2026-10-14", 8);
    expect(more).toHaveLength(8);
    expect(more[0]).toBe(jokeIndexFor("2026-10-14"));
    expect(new Set(more).size).toBe(8);
  });
});
