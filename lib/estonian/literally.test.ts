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
import { WORDPLAY } from "../copy/i18n/areas/wordplay";

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

/**
 * Two words with one stem: the shorter is a prefix of the longer, compared
 * over at least three letters. A short piece (нос, сон, пил) is the start of
 * the longer word built on it (носорог, сновидение, пылесос), which a fixed
 * prefix length would miss.
 */
function sameStem(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const n = Math.max(3, Math.min(short.length, 5));
  return short.length >= 3 && long.startsWith(short.slice(0, n));
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}]{3,}/gu) ?? [];
}

/*
  Russian and Ukrainian build these from the very same picture: a fridge from
  cold, a bat from a mouse, a kindergarten from children and a garden, a
  pronoun from "instead", an ambulance from quick help, a railway from
  an iron road, a dictionary from words, a rhinoceros from a nose
  and a horn, a vacuum cleaner from dust and sucking, pollen from dust,
  the spinal cord from the back and the brain, a reindeer from the north,
  allspice from pepper, and a rifle from the screw cut inside its barrel,
  which the rifle's own line says out loud. Recognizing it is the fun, there
  is no other honest reading, and the line says so where it is the joke.
*/
const SAME_IMAGE_BOTH = ["külmkapp", "uksekell", "liivakell", "silmamuna", "nahkhiir", "raamatukoi", "lasteaed", "käekell", "tolmuimeja", "kiirabi", "raudtee", "õietolm", "seljaaju", "põhjapõder", "nelkpipar", "vintpüss"];
const SAME_IMAGE: Record<"ru" | "uk", ReadonlySet<string>> = {
  // The words from hüüumärk on are the fluent reader's own Russian and
  // Ukrainian (2026-10-25): a восклицательный знак and a знак оклику, a сосед
  // по парте, a сложное слово, a гостьовий дім and a рідня are what the two
  // languages call them, built on the same picture as the Estonian.
  ru: new Set([...SAME_IMAGE_BOTH, "asesõna", "sõnaraamat", "ninasarvik", "hüüumärk", "pinginaaber", "liitsõna"]),
  uk: new Set([...SAME_IMAGE_BOTH, "ööliblikas", "lumememm", "linnapea", "sõnaraamat", "ninasarvik", "hüüumärk", "pinginaaber", "liitsõna", "võõrastemaja", "suguvõsa"]),
};

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

  /*
    Russian and Ukrainian draw lines English does not: one word is a hand and
    an arm, one root is a sleep and a dream. So the reading is held to the
    same rule in each language on its own, word against word, with the stem
    compared rather than the spelling, since a case ending is not a new word.
  */
  it("never carries the meaning's own word in its reading in Russian or Ukrainian either", () => {
    const meant = new Set(["üleeile", "ülehomme", "tulekahju", "kõhutuul", "merisiga", "jõululaupäev", "libahunt"]);
    // SAME_IMAGE is the words both languages build from the very picture
    // Estonian does, where there is no other honest reading.
    for (const locale of ["ru", "uk"] as const) {
      const giveaway = COMPOUNDS.filter((c) => {
        if (meant.has(c.word) || SAME_IMAGE[locale].has(c.word)) return false;
        const reading = words(tr(locale, c.literal, "wordplay"));
        return words(tr(locale, c.means, "wordplay")).some((w) => reading.some((r) => sameStem(r, w)));
      }).map((c) => `${locale}: ${c.word}: ${tr(locale, c.literal, "wordplay")} / ${tr(locale, c.means, "wordplay")}`);
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
    the answer printed above it. These seven are the exception and each is the
    joke itself: the brevity of the two days, the fire named after its bill,
    the wind both languages call wind, the pig English also gets wrong, the
    Christmas Eve that is called a Saturday whatever day it falls on, and the
    werewolf whose first half is already a werewolf.
  */
  it("never carries the meaning's own word in its reading, but for the seven where that is the joke", () => {
    const meant = new Set(["üleeile", "ülehomme", "tulekahju", "kõhutuul", "merisiga", "jõululaupäev", "libahunt"]);
    const sharing = COMPOUNDS.filter((c) => sharesAWord(c.literal, c.means)).map((c) => c.word);
    expect(sharing.filter((w) => !meant.has(w))).toEqual([]);
    expect([...meant].filter((w) => !sharing.includes(w))).toEqual([]);
  });

  /*
    The reading is printed right above the line, so a line that says it again
    is the same words twice. Hopping over tomorrow is the one that uses it to
    make a new picture rather than to repeat it.
  */
  it("never repeats its reading in its line, whatever the ending", () => {
    // The reading's words in a row, by their stems, is the reading said
    // again: "fish berries" under "fish berry". A line that builds a new
    // picture on the reading ("a frog that brought its own shield") is the
    // joke, and is read by a person rather than refused here.
    const repeated = COMPOUNDS.filter((c) => c.word !== "ülehomme")
      .filter((c) => {
        const reading = words(c.literal);
        const said = words(c.quip);
        return said.some((_, i) => reading.every((w, k) => said[i + k] !== undefined && sameStem(said[i + k]!, w)));
      })
      .map((c) => `${c.word}: ${c.quip}`);
    expect(repeated).toEqual([]);
  });

  /*
    A piece is turned over before the meaning is asked, so a piece whose
    Russian or Ukrainian is the answer's own word hands the answer over a
    step early. English builds many of these words the same way (a spider and
    a spiderweb), so what is held is the giveaway a translation adds: the
    piece names the answer in the translation and not in the English.
  */
  it("never turns over a piece that names the answer in translation and not in English", () => {
    const shares = (a: string, b: string) => {
      const x = words(b);
      return words(a).some((w) => x.some((y) => sameStem(w, y)));
    };
    for (const locale of ["ru", "uk"] as const) {
      const read = (s: string) => tr(locale, s, "wordplay");
      const giveaway = COMPOUNDS.filter((c) => !SAME_IMAGE[locale].has(c.word)).flatMap((c) =>
        c.parts
          .filter((part) => !shares(part.en, c.means) && shares(read(part.en), read(c.means)))
          .map((part) => `${locale}: ${c.word}: ${read(part.en)} / ${read(c.means)}`),
      );
      expect(giveaway).toEqual([]);
    }
  });

  it("files each word once and keeps every id unique", () => {
    expect(new Set(COMPOUNDS.map((c) => c.word)).size).toBe(COMPOUNDS.length);
    expect(new Set(COMPOUNDS.map((c) => c.id)).size).toBe(COMPOUNDS.length);
  });
});

describe("false friends", () => {
  /*
    A look-alike's line sits under "not “tool”" and, in the round, under "It
    means “chair”", so a line that opens by saying either again says it a
    third time. It opens on something new.
  */
  it("never opens its line by saying the meaning or the look-alike again", () => {
    const repeating = FALSE_FRIENDS.filter((f) => {
      const quip = f.quip.toLowerCase();
      const first = f.means.split(",")[0]!.trim().toLowerCase().replace(/^(a|an|the) /, "");
      const opening = quip.replace(/^(a|an|the) /, "");
      return opening.startsWith(`${first},`) || opening.startsWith(`${first}.`)
        || new RegExp(`\\bnot ${f.looksLike.toLowerCase()}\\b`).test(quip)
        || quip.includes("nothing to do with") || quip.startsWith("sounds like");
    }).map((f) => `${f.word}: ${f.quip}`);
    expect(repeating).toEqual([]);
  });

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

  it("warns about a false friend without a joke after it, and keeps a compound's line", () => {
    for (const f of FALSE_FRIENDS) expect(wordFunFor(f.word, f.means)?.quip ?? null, f.word).toBeNull();
    expect(wordFunFor("nahkhiir", "bat")?.quip).toBeTruthy();
  });

  it("says nothing about a word with nothing to say", () => {
    expect(wordFunFor("raamat", "book")).toBeNull();
  });

  it("tells the joke only about the sense the screen is showing", () => {
    expect(wordFunFor("pea", "head")?.reading).toBe("pea");
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

  /*
    Every line a reader can meet from this table is in the Russian and the
    Ukrainian, and nothing else is keyed there. A translation left behind when
    a line is rewritten is a second draft nobody reads, and it is where the
    old wording comes back from the day somebody copies the key.
  */
  it("translates every line it shows, and keeps no translation of a line it no longer has", () => {
    const live = new Set<string>();
    for (const c of COMPOUNDS) {
      for (const part of c.parts) live.add(part.en);
      live.add(c.literal);
      live.add(c.means);
      live.add(c.quip);
    }
    for (const f of FALSE_FRIENDS) {
      live.add(f.looksLike);
      live.add(f.means);
      live.add(f.quip);
    }
    expect(live.size).toBeGreaterThan(300);
    for (const locale of ["ru", "uk"] as const) {
      const keyed = Object.keys(WORDPLAY[locale] ?? {})
        .filter((k) => k.endsWith("@wordplay"))
        .map((k) => k.slice(0, -"@wordplay".length));
      expect(keyed.length, locale).toBeGreaterThan(300);
      expect(keyed.filter((k) => !live.has(k)), `${locale}: stale`).toEqual([]);
      const have = new Set(keyed);
      expect([...live].filter((l) => !have.has(l)), `${locale}: untranslated`).toEqual([]);
    }
  });
});
