import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { acceptedUses, usesRequiredWord, wordsOf, type RequiredWord } from "./written";
import { shippedDictionary } from "@/scripts/lib/dictionary";

/*
  These functions are shared between the marking and the screen somebody is
  writing on, which is the only reason they are a module of their own. So what
  is worth testing is the thing that made them shared: the same text gives the
  same answer whoever asks, including in the cases where a looser or a stricter
  rule would have been tempting.

  The words come out of the shipped dictionary rather than being typed here,
  because the forms are the whole of what decides this now, and a hand-written
  one would be this file inventing Estonian (ADR-005). Hermetic: it reads the
  file `npm run db:seed` loads and nothing else.
*/
interface SeedEntry {
  lemma: string;
  pos: string;
  forms: { formType: string; value: string }[];
}
const EXPANDED: SeedEntry[] = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8"));

function word(lemma: string): RequiredWord {
  const entry = EXPANDED.find((e) => e.lemma === lemma);
  if (!entry) throw new Error(`${lemma} is not in the shipped dictionary`);
  return { lemma: entry.lemma, pos: entry.pos, forms: entry.forms };
}

describe("counting the words of a written answer", () => {
  /*
    AND A VERB ENRICHED FROM EKILEX COUNTS, which it did not while this module
    read `PRES_1SG` off the parts itself. The seed writes the first person
    under that name and a live lookup writes it under the morph code, so a
    word the dictionary had only ever been asked about derived no person at
    all and a candidate who used one was marked as not having used the word.
  */
  it("credits a person derived from a first person Ekilex supplied", () => {
    const word = {
      lemma: "helistama",
      pos: "VERB",
      forms: [{ formType: "EKILEX:IndPrSg1", value: "helistan" }],
    };
    expect(usesRequiredWord(word, "Ma helistab sulle homme.")).toBe(true);
  });

  it("ignores the whitespace people actually type", () => {
    expect(wordsOf("  ma   olen\n\nsiin  ")).toEqual(["ma", "olen", "siin"]);
  });

  it("counts nothing in an empty answer", () => {
    expect(wordsOf("   ")).toHaveLength(0);
  });
});

describe("whether a required word was used", () => {
  it("counts a word used in its headword form", () => {
    expect(usesRequiredWord(word("raamat"), "Mul on uus raamat kodus.")).toBe(true);
  });

  it("counts a word however it was inflected, because Estonian inflects", () => {
    expect(usesRequiredWord(word("raamat"), "Ma lugesin raamatust ühe loo.")).toBe(true);
    expect(usesRequiredWord(word("jõgi"), "Me käisime jõel.")).toBe(true);
    expect(usesRequiredWord(word("aeg"), "Mul ei ole aega.")).toBe(true);
  });

  it("counts a word in a plural case, which is built on the stored genitive plural", () => {
    /*
      The plural obliques are a suffix on the genitive plural, so no entry
      stores them and only the case table reaches them. Reading the accepted
      spellings off `gapForms` alone, which walks the singular, dropped every
      one of them, and a candidate who wrote `raamatutes` was marked as not
      having used `raamat` on a mock state examination.
    */
    expect(usesRequiredWord(word("raamat"), "Seda on kirjutatud paljudes raamatutes.")).toBe(true);
    expect(usesRequiredWord(word("maja"), "Nad elavad suurtes majades.")).toBe(true);
  });

  it("counts a case the dictionary stores rather than derives", () => {
    // The short illative is lexically unpredictable and is what people say.
    expect(usesRequiredWord(word("jõgi"), "Ta hüppas jõkke.")).toBe(true);
  });

  it("counts a verb in a person the rule works out from the stored first person", () => {
    expect(usesRequiredWord(word("lugema"), "Ta loeb iga õhtu.")).toBe(true);
    expect(usesRequiredWord(word("lugema"), "Ma loeksin rohkem.")).toBe(true);
  });

  it("sees through the punctuation attached to a word", () => {
    expect(usesRequiredWord(word("raamat"), "Kus on raamat?")).toBe(true);
  });

  it("does not count a word that is not there", () => {
    expect(usesRequiredWord(word("raamat"), "Ma olen kodus ja loen.")).toBe(false);
  });

  /*
    THE ONE THAT WAS WRONG, AND WAS MARKING A REAL PAPER.

    The rule was a prefix match on the lemma minus its last letter, floored at
    three characters. `kiri` became `kir` and lit on `kirjutan`, `aeg` on
    `aeglane`, `abi` on `abikaasa`, `arv` on `arvan`. Over the shipped
    dictionary, 1,529 of its 5,363 headwords have a needle reaching a different
    headword.
  */
  it("does not count a different word that merely starts the same way", () => {
    expect(usesRequiredWord(word("kiri"), "Ma kirjutan sulle homme.")).toBe(false);
    expect(usesRequiredWord(word("aeg"), "See rong on väga aeglane.")).toBe(false);
    expect(usesRequiredWord(word("abi"), "Minu abikaasa on kodus.")).toBe(false);
    expect(usesRequiredWord(word("kool"), "Mul on koer ja kass.")).toBe(false);
  });

  it("still counts the word those sentences were standing in for", () => {
    expect(usesRequiredWord(word("kiri"), "Sain sinult kirja.")).toBe(true);
    expect(usesRequiredWord(word("abi"), "Tänan abi eest.")).toBe(true);
  });

  it("counts nothing for a word with no forms, rather than everything", () => {
    // A lemma can be empty when a task anchored to a pool that had nothing in
    // it. Matching an empty string would light every chip on the screen and
    // award the words half of the marks for a blank answer.
    expect(usesRequiredWord({ lemma: "", pos: "NOUN", forms: [] }, "ükskõik mis")).toBe(false);
  });

  it("finds nothing in an answer nobody has started", () => {
    expect(usesRequiredWord(word("raamat"), "")).toBe(false);
  });
});

describe("the forms behind the marking", () => {
  it("gives every shipped word more than its headword to be recognized by", () => {
    /*
      A set of one would mark somebody down for writing the word in a sentence
      rather than in the nominative, which is the opposite fault to the one
      this replaced.

      THE FLOOR IS WHAT WAS MEASURED, AND IT WAS ONE. The comment said the
      thinnest entry has ten and the assertion asked for more than one, so a
      change that took every noun down to three spellings passed. One did:
      moving this module onto `gapForms` dropped the plural cases, the thinnest
      entry fell from ten to three (`lugemisprillid`, which has no singular),
      a candidate who wrote `raamatutes` was marked as not having used
      `raamat`, and this printed PASS. It was caught by somebody reading the
      diff. At ten it fails on that commit.

      AND OVER THE DICTIONARY THE SEED WRITES, NOT HALF OF IT. This read
      `expanded.json` alone, which is 5,363 of the 6,153 entries: none of the
      course harvest, which is where the words a paper is built from mostly
      come from. `shippedDictionary` is the merge the seed makes. Over all of
      it every entry with principal parts accepts at least ten, and the 156
      that accept fewer are adverbs and phrases, which do not inflect and so
      accept their own spelling and whatever extra form was stored. That they
      accept at least that is asserted too, since a word accepting nothing
      would be a word nobody could use.
    */
    const THINNEST = 10;
    let thinnest = Number.POSITIVE_INFINITY;
    let thinnestWord = "";
    let checked = 0;
    for (const entry of shippedDictionary()) {
      const forms = [
        ...Object.entries(entry.parts).map(([formType, value]) => ({ formType, value: value as string })),
        ...entry.extraForms.map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
      ];
      const accepted = acceptedUses({ lemma: entry.lemma, pos: entry.pos, forms });
      // Principal parts are what every other form is built from, so an entry
      // without them does not inflect here: an adverb such as `liiga` carries
      // one stored extra form and accepts two, which is all it has.
      if (Object.keys(entry.parts).length === 0) {
        expect(accepted.size, `${entry.lemma} accepts nothing, not even itself`).toBeGreaterThan(0);
        continue;
      }
      checked += 1;
      if (accepted.size < thinnest) { thinnest = accepted.size; thinnestWord = entry.lemma; }
    }
    expect(checked, "the sweep stopped finding entries with principal parts").toBeGreaterThan(5_000);
    expect(thinnest, `${thinnestWord} is the thinnest entry with principal parts`).toBeGreaterThanOrEqual(THINNEST);
  });

  it("writes no Estonian of its own: every form comes from the entry or a suffix rule", () => {
    const kiri = acceptedUses(word("kiri"));
    expect(kiri.has("kiri")).toBe(true);
    expect(kiri.has("kirja")).toBe(true);
    expect(kiri.has("kirjas")).toBe(true);
    expect(kiri.has("kirjutan")).toBe(false);
  });
});

/*
  A PHRASE IS A REQUIRED WORD LIKE ANY OTHER, AND COULD NOT BE CREDITED.

  `tidy` strips spaces along with the punctuation, so a phrase lemma arrives in
  `acceptedUses` as one spaceless string and the comparison against single
  whitespace-delimited tokens can never match it. The course's first unit is
  twenty of these, so a candidate asked to use one wrote it correctly and was
  marked as not having used it, on a paper this app tells them to trust.
*/
describe("a required word written in more than one word", () => {
  const phrase = {
    lemma: "Kas sa räägid inglise keelt?",
    pos: "PHRASE",
    forms: [] as { formType: string; value: string }[],
  };

  it("credits the phrase when it is written out", () => {
    expect(usesRequiredWord(phrase, "Tere! Kas sa räägid inglise keelt? Ma olen uus siin.")).toBe(true);
  });

  it("credits it whatever the punctuation and case around it", () => {
    expect(usesRequiredWord(phrase, "ma küsisin kas sa räägid inglise keelt, ja ta noogutas")).toBe(true);
  });

  it("does not credit a phrase that was not written", () => {
    expect(usesRequiredWord(phrase, "Tere! Ma olen uus siin ja ma õpin eesti keelt.")).toBe(false);
  });

  it("does not credit the words of the phrase out of order", () => {
    expect(usesRequiredWord(phrase, "keelt inglise räägid sa kas")).toBe(false);
  });

  it("leaves a one-word entry deciding on single words alone", () => {
    const raamat = {
      lemma: "raamat",
      pos: "NOUN",
      forms: [{ formType: "GEN_SG", value: "raamatu" }, { formType: "PART_SG", value: "raamatut" }],
    };
    expect(usesRequiredWord(raamat, "Ma lugesin raamatut.")).toBe(true);
    expect(usesRequiredWord(raamat, "Ma kirjutan kirja.")).toBe(false);
  });
});
