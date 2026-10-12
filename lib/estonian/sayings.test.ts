/*
  EVERY SAYING IS A SENTENCE SOMEBODY ELSE WROTE.

  The round teaches `läks katki` and the pins are what keep that from being
  this app writing Estonian (ADR-005). Naming a recorded sentence is choosing
  rather than writing, and it is only choosing while somebody checks the
  sentence is really there, so this reads the files `npm run db:seed` loads.

  Hermetic. No database and no network.
*/
import { describe, expect, it } from "vitest";

import { naturalSentence } from "./cloze";
import { MIN_SET, SAYINGS, SET_SIZE, sayingSet, setCount, wordsOf } from "./sayings";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { allSayingUsages } from "../dict/sayingUsages";
import { englishFor } from "../dict/exampleEnglish";

const RECORDED_UNDER = new Map<string, Set<string>>();
/** The English the shipped dictionary carries against a sentence, as the seed joins it. */
const ENGLISH = new Map<string, string>();
for (const row of dictionaryRows()) {
  for (const ex of row.examples) {
    if (ex.en) ENGLISH.set(ex.et, ex.en);
    (RECORDED_UNDER.get(ex.et) ?? RECORDED_UNDER.set(ex.et, new Set()).get(ex.et)!).add(row.lemma);
  }
}

/*
  The few the dictionary never kept, which `npm run harvest:sayings` checked
  against Ekilex itself. They count as recorded under their entry, and their
  English is the same sentence-keyed table everything else reads.
*/
for (const { lemma, et } of allSayingUsages()) {
  (RECORDED_UNDER.get(et) ?? RECORDED_UNDER.set(et, new Set()).get(et)!).add(lemma);
  const en = englishFor(et);
  if (en) ENGLISH.set(et, en);
}

const allSentences = SAYINGS.flatMap((s) => s.sentences.map((sentence) => ({ saying: s, sentence })));

describe("sayings", () => {
  it("has sayings to check", () => {
    expect(SAYINGS.length).toBeGreaterThanOrEqual(10);
    expect(allSentences.length).toBeGreaterThan(SAYINGS.length);
  });

  it("pins only sentences the shipped dictionary or the checked file holds, under the entry it names", () => {
    const missing = allSentences
      .filter(({ sentence }) => !RECORDED_UNDER.get(sentence.et)?.has(sentence.lemma))
      .map(({ saying, sentence }) => `${saying.id}: ${sentence.et} (${sentence.lemma})`);
    expect(missing).toEqual([]);
  });

  it("pins only sentences that ship with their English", () => {
    const bare = allSentences.filter(({ sentence }) => !ENGLISH.get(sentence.et)).map(({ sentence }) => sentence.et);
    expect(bare).toEqual([]);
  });

  it("pins only whole sentences", () => {
    const refused = allSentences.filter(({ sentence }) => !naturalSentence(sentence.et)).map(({ sentence }) => sentence.et);
    expect(refused).toEqual([]);
  });

  it("marks a run that is really in the sentence, made of whole words, holding the word and a form of the verb", () => {
    const bad: string[] = [];
    for (const { saying, sentence } of allSentences) {
      const at = sentence.et.indexOf(sentence.run);
      const before = at > 0 ? sentence.et[at - 1]! : " ";
      const after = sentence.et[at + sentence.run.length] ?? " ";
      const whole = at >= 0 && !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after);
      const words = wordsOf(sentence.run);
      if (!whole || !words.includes(saying.particle) || !words.some((w) => saying.verb.test(w))) bad.push(`${saying.id}: ${sentence.et}`);
    }
    expect(bad).toEqual([]);
  });

  it("prints a phrase whose every word is in the sentence it is met in", () => {
    const bad = SAYINGS.filter((s) => {
      const have = new Set(wordsOf(s.sentences[0].et));
      return !wordsOf(s.phrase).every((w) => have.has(w));
    }).map((s) => s.id);
    expect(bad).toEqual([]);
  });

  it("holds the blanked word once in a sentence it can be asked in", () => {
    const bad = SAYINGS.filter((s) => {
      const asked = s.sentences.map((x) => wordsOf(x.et).filter((w) => w === s.particle.toLowerCase()).length);
      return !asked.some((n) => n === 1);
    }).map((s) => s.id);
    expect(bad).toEqual([]);
  });

  it("gives every saying its own id, its own meaning and its own phrase", () => {
    for (const key of ["id", "means", "phrase"] as const) {
      const values = SAYINGS.map((s) => s[key].toLowerCase());
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it("never puts two sayings with one blanked word in the same sitting", () => {
    // `kinni` is in four of them and that is the language. A sitting offers each
    // saying's word as a wrong answer to the others, so two of one word in a
    // sitting would make two right answers to one blank.
    const clashes: string[] = [];
    for (let n = 0; n < setCount(); n++) {
      const seen = new Set<string>();
      for (const s of sayingSet(n)) {
        if (seen.has(s.particle.toLowerCase())) clashes.push(`set ${n}: ${s.particle}`);
        seen.add(s.particle.toLowerCase());
      }
    }
    expect(clashes).toEqual([]);
  });

  it("writes the English in English", () => {
    for (const s of SAYINGS) {
      for (const text of [s.means, s.literal]) {
        expect(text, s.id).not.toMatch(/[õäöüšž]/i);
        expect(text.length, s.id).toBeGreaterThan(3);
      }
    }
  });

  it("says what each word of the phrase means on its own, one entry a word", () => {
    for (const s of SAYINGS) {
      expect(s.parts, s.id).toHaveLength(s.phrase.split(" ").length);
      for (const part of s.parts) {
        expect(part.trim(), s.id).not.toBe("");
        expect(part, s.id).not.toMatch(/[õäöüšž]/i);
      }
    }
  });

  it("gives every saying a situation of its own, in English, that never quotes the saying", () => {
    const seen = new Set<string>();
    for (const s of SAYINGS) {
      expect(s.when.length, s.id).toBeGreaterThan(20);
      expect(s.when.length, s.id).toBeLessThanOrEqual(110);
      expect(s.when, s.id).not.toMatch(/[õäöüšž]/i);
      expect(s.when, s.id).toMatch(/[.]$/);
      // A situation that carried the saying's own words would be the answer to the question it is put as.
      // Short words are skipped: `on` is a word in both languages.
      for (const word of wordsOf(s.phrase).filter((w) => w.length >= 4)) expect(wordsOf(s.when), `${s.id}: ${word}`).not.toContain(word);
      expect(seen.has(s.when), s.id).toBe(false);
      seen.add(s.when);
      if (s.note !== undefined) {
        expect(s.note.length, s.id).toBeGreaterThan(15);
        expect(s.note, s.id).not.toMatch(/[õäöüšž]/i);
      }
    }
  });

  it("cuts the sayings into sittings of five with no sitting too small to match", () => {
    let total = 0;
    for (let n = 0; n < setCount(); n++) {
      const set = sayingSet(n);
      expect(set.length).toBeGreaterThanOrEqual(MIN_SET);
      expect(set.length).toBeLessThanOrEqual(SET_SIZE + MIN_SET - 1);
      total += set.length;
    }
    expect(total).toBe(SAYINGS.length);
    expect(sayingSet(setCount())).toEqual([]);
    expect(sayingSet(-1)).toEqual([]);
  });
});
