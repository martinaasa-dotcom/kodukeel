/*
  EVERY JOKE IS A WORD THE DICTIONARY ALREADY HOLDS.

  `lib/estonian/literally.ts` names compounds and false friends and writes the
  English around them. Naming a word is choosing rather than writing only while
  somebody checks the word is really there and really built that way, so this
  reads the files `npm run db:seed` loads and Ekilex's own headword list.

  Hermetic. No database and no network.
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COMPOUNDS, FALSE_FRIENDS, compoundFor, contentWords, falseFriendFor, wordFunFor } from "./literally";
import { formValues, shippedDictionary } from "../../scripts/lib/dictionary";
import { findTells } from "../copy/voice";
import { tr } from "../copy/locale";

const ENTRIES = new Map<string, ReturnType<typeof shippedDictionary>>();
for (const e of shippedDictionary()) (ENTRIES.get(e.lemma) ?? ENTRIES.set(e.lemma, []).get(e.lemma)!).push(e);

const HEADWORDS = new Set(
  readFileSync(join(process.cwd(), "prisma/data/wordlist.txt"), "utf8").split("\n").map((w) => w.trim()).filter(Boolean),
);

function sharesAWord(a: string, b: string): boolean {
  const left = contentWords(a);
  for (const w of contentWords(b)) if (left.has(w)) return true;
  return false;
}

/** Every gloss the dictionary files under a headword, across all of its entries. */
function glossesOf(lemma: string): string {
  return (ENTRIES.get(lemma) ?? []).map((e) => e.gloss).join("; ");
}

describe("compounds", () => {
  it("has enough of them for a few sittings", () => {
    expect(COMPOUNDS.length).toBeGreaterThanOrEqual(40);
  });

  it("names only words the shipped dictionary holds", () => {
    expect(COMPOUNDS.filter((c) => !ENTRIES.has(c.word)).map((c) => c.word)).toEqual([]);
  });

  it("spells each word exactly out of its parts", () => {
    expect(COMPOUNDS.filter((c) => c.parts.map((x) => x.text).join("") !== c.word).map((c) => c.word)).toEqual([]);
  });

  it("cuts every part as a form of the entry it names, or as a headword Ekilex lists", () => {
    const wrong: string[] = [];
    for (const c of COMPOUNDS) {
      for (const part of c.parts) {
        const entries = ENTRIES.get(part.lemma);
        const asForm = entries?.some((e) => formValues(e).includes(part.text)) ?? false;
        const asHeadword = part.text === part.lemma && HEADWORDS.has(part.lemma);
        if (!asForm && !asHeadword) wrong.push(`${c.word}: ${part.text} (${part.lemma})`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("glosses every part the dictionary glosses in words that agree with it", () => {
    const disagree: string[] = [];
    for (const c of COMPOUNDS) {
      for (const part of c.parts) {
        const gloss = glossesOf(part.lemma);
        if (!gloss) continue;
        /*
          A part may be the other homonym of the entry it names, which is the
          whole of what `notThe` is for (`ase` here is a stead, the
          dictionary's is a bed). Then what has to agree with the dictionary
          is the meaning it says it is not, and the reading must not be that
          meaning, or the word-for-word line is reading the wrong word.
        */
        if (part.notThe) {
          if (!sharesAWord(gloss, part.notThe)) disagree.push(`${c.word}: ${part.lemma} is "${gloss}", not "${part.notThe}"`);
          if (sharesAWord(part.en, part.notThe)) disagree.push(`${c.word}: ${part.lemma} is read as the very sense it is marked as not`);
        } else if (!sharesAWord(gloss, part.en)) disagree.push(`${c.word}: ${part.lemma} is "${gloss}", here "${part.en}"`);
      }
    }
    expect(disagree).toEqual([]);
  });

  it("says what each word means in words that agree with the dictionary's own gloss", () => {
    const disagree = COMPOUNDS
      .filter((c) => !sharesAWord(glossesOf(c.word), c.means))
      .map((c) => `${c.word}: "${glossesOf(c.word)}" against "${c.means}"`);
    expect(disagree).toEqual([]);
  });

  it("never gives away the meaning in the word-for-word reading, in any language", () => {
    for (const locale of ["ru", "uk"] as const) {
      const giveaway = COMPOUNDS.filter(
        (c) => tr(locale, c.literal, "wordplay").toLowerCase() === tr(locale, c.means, "wordplay").toLowerCase(),
      ).map((c) => `${locale}: ${c.word}`);
      expect(giveaway).toEqual([]);
    }
  });

  it("never gives away the meaning in the word-for-word reading", () => {
    const giveaway = COMPOUNDS.filter((c) => c.literal.toLowerCase() === c.means.toLowerCase()).map((c) => c.word);
    expect(giveaway).toEqual([]);
  });

  /*
    The round asks what a word really means right under its word-for-word
    reading, so a reading carrying the answer's own word is a question with
    the answer printed above it. These five are the exception and each is the
    joke itself: the brevity of the two days, the fire named after its bill,
    the wind both languages call wind, and the pig English also gets wrong.
  */
  it("never carries the meaning's own word in its reading, but for the five where that is the joke", () => {
    const meant = new Set(["üleeile", "ülehomme", "tulekahju", "kõhutuul", "merisiga"]);
    const sharing = COMPOUNDS.filter((c) => sharesAWord(c.literal, c.means)).map((c) => c.word);
    expect(sharing.filter((w) => !meant.has(w))).toEqual([]);
    expect([...meant].filter((w) => !sharing.includes(w))).toEqual([]);
  });

  it("files each word once and keeps every id unique", () => {
    expect(new Set(COMPOUNDS.map((c) => c.word)).size).toBe(COMPOUNDS.length);
    expect(new Set(COMPOUNDS.map((c) => c.id)).size).toBe(COMPOUNDS.length);
  });
});

describe("false friends", () => {
  it("has enough of them for a few sittings", () => {
    expect(FALSE_FRIENDS.length).toBeGreaterThanOrEqual(15);
  });

  it("names only words the shipped dictionary holds", () => {
    expect(FALSE_FRIENDS.filter((f) => !ENTRIES.has(f.word)).map((f) => f.word)).toEqual([]);
  });

  it("says what each word means in words that agree with the dictionary's own gloss", () => {
    const disagree = FALSE_FRIENDS
      .filter((f) => !sharesAWord(glossesOf(f.word), f.means))
      .map((f) => `${f.word}: "${glossesOf(f.word)}" against "${f.means}"`);
    expect(disagree).toEqual([]);
  });

  it("is only a false friend where the English it looks like is not what it means", () => {
    const honest = FALSE_FRIENDS.filter((f) => sharesAWord(f.looksLike, f.means)).map((f) => f.word);
    expect(honest).toEqual([]);
  });

  it("is never also filed as a compound", () => {
    expect(FALSE_FRIENDS.filter((f) => compoundFor(f.word)).map((f) => f.word)).toEqual([]);
  });

  it("files each word once and keeps every id unique", () => {
    expect(new Set(FALSE_FRIENDS.map((f) => f.word)).size).toBe(FALSE_FRIENDS.length);
    expect(new Set(FALSE_FRIENDS.map((f) => f.id)).size).toBe(FALSE_FRIENDS.length);
  });
});

describe("the English around them", () => {
  const lines = [
    ...COMPOUNDS.flatMap((c) => [c.literal, c.means, c.quip, ...c.parts.map((x) => x.en)]),
    ...FALSE_FRIENDS.flatMap((f) => [f.looksLike, f.means, f.quip]),
  ];

  it("writes no Estonian letter, so the Russian and Ukrainian tables can carry every line whole", () => {
    expect(lines.filter((l) => /[õäöüšž]/i.test(l))).toEqual([]);
  });

  it("names no Estonian word in a line, since the screen prints the word beside it", () => {
    const words = [...COMPOUNDS.map((c) => c.word), ...COMPOUNDS.flatMap((c) => c.parts.map((x) => x.text))];
    const named = [...COMPOUNDS.map((c) => c.quip), ...FALSE_FRIENDS.map((f) => f.quip)].filter((q) =>
      words.some((w) => w.length > 3 && new RegExp(`(?<![a-z])${w}(?![a-z])`, "i").test(q)),
    );
    expect(named).toEqual([]);
  });

  it("keeps every line clear of the tells the voice table bans", () => {
    expect(lines.flatMap((l) => findTells(l).map((t) => `${l}: ${t.name}`))).toEqual([]);
  });

  it("leans on a full stop rather than an exclamation mark", () => {
    expect(lines.filter((l) => l.includes("!"))).toEqual([]);
  });

  it("keeps each line short enough to read in one breath", () => {
    const long = [...COMPOUNDS.map((c) => c.quip), ...FALSE_FRIENDS.map((f) => f.quip)].filter((q) => q.split(/\s+/).length > 26);
    expect(long).toEqual([]);
  });
});

describe("wordFunFor", () => {
  it("reads a compound as its word-for-word reading", () => {
    const fun = wordFunFor("nahkhiir", "bat")!;
    expect(fun.kind).toBe("compound");
    expect(fun.reading).toBe("leather mouse");
  });

  it("reads a false friend as the English it is not", () => {
    const fun = wordFunFor("pea", "head")!;
    expect(fun.kind).toBe("false-friend");
    expect(fun.reading).toBe("pea");
    expect(falseFriendFor("pea")?.means).toBe("head");
  });

  it("says nothing about a word with nothing to say", () => {
    expect(wordFunFor("raamat", "book")).toBeNull();
  });

  it("tells the joke only about the sense the screen is showing", () => {
    expect(wordFunFor("pea", "head")?.quip).toMatch(/doctor/);
    expect(wordFunFor("pea", "pea (the vegetable)")).toBeNull();
    expect(wordFunFor("pea", null)).toBeNull();
    expect(wordFunFor("nahkhiir", "bat")?.reading).toBe("leather mouse");
    expect(wordFunFor("nahkhiir", "something else entirely")).toBeNull();
  });

  it("matches every line against the gloss the dictionary itself prints for it", () => {
    const silent = [...COMPOUNDS.map((c) => c.word), ...FALSE_FRIENDS.map((f) => f.word)]
      .filter((w) => !(ENTRIES.get(w) ?? []).some((e) => wordFunFor(w, e.gloss)));
    expect(silent).toEqual([]);
  });
});
