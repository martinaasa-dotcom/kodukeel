/*
  THE FILE OF SAYING SENTENCES IS A RECORD OF A CHECK, NOT A SECOND DICTIONARY.

  `npm run harvest:sayings` writes it, and only for a sentence a saying pins
  and Ekilex returns. These hold the file to that: nothing in it that the real
  dictionary now holds, nothing a saying does not use, nothing that is not a
  whole sentence, and nothing without its English.

  Hermetic. No database and no network.
*/
import { describe, expect, it } from "vitest";

import { naturalSentence } from "../estonian/cloze";
import { SAYINGS } from "../estonian/sayings";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { allSayingUsages, isVerifiedSayingUsage, sayingUsageEnglish } from "./sayingUsages";

const SHIPPED = new Set<string>();
for (const row of dictionaryRows()) for (const ex of row.examples) SHIPPED.add(ex.et);

const PINNED = new Set(SAYINGS.flatMap((s) => s.sentences.map((x) => `${x.lemma}\u0000${x.et}`)));

describe("saying usages", () => {
  const all = allSayingUsages();

  it("has sentences to check", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it("holds nothing the shipped dictionary now holds", () => {
    expect(all.filter(({ et }) => SHIPPED.has(et)).map(({ et }) => et)).toEqual([]);
  });

  it("holds nothing a saying does not pin, under the entry the saying names", () => {
    expect(all.filter(({ lemma, et }) => !PINNED.has(`${lemma}\u0000${et}`)).map(({ et }) => et)).toEqual([]);
  });

  it("holds only whole sentences", () => {
    expect(all.filter(({ et }) => !naturalSentence(et)).map(({ et }) => et)).toEqual([]);
  });

  it("ships an English line for every one", () => {
    expect(all.filter(({ et }) => !sayingUsageEnglish(et)).map(({ et }) => et)).toEqual([]);
  });

  it("answers for exactly the sentence under exactly the entry", () => {
    const first = all[0]!;
    expect(isVerifiedSayingUsage(first.lemma, first.et)).toBe(true);
    expect(isVerifiedSayingUsage("no such entry", first.et)).toBe(false);
    expect(isVerifiedSayingUsage(first.lemma, `${first.et} `)).toBe(false);
  });
});
