import { describe, expect, it } from "vitest";
import { borrowSentences, claimIndex, type BorrowEntry } from "./borrow";
import type { Homographs } from "./homographs";

/*
  The rule a word borrows by, exercised on the words that produced it. `aeg`
  and `ajama` are the pair that showed the trap: `Tolm ajas aevastama` carries
  `ajas`, which a suffix on `aja` spells as the inessive of `aeg` and which the
  sentence uses as the past of `ajama`.
*/
const entry = (over: Partial<BorrowEntry> & { lemma: string; pos: string }): BorrowEntry => ({
  key: over.lemma, forms: [], examples: [], ...over,
});

const aeg = entry({
  lemma: "aeg", pos: "NOUN",
  forms: [
    { formType: "NOM_SG", value: "aeg" },
    { formType: "GEN_SG", value: "aja" },
    { formType: "PART_SG", value: "aega" },
  ],
});
const ajama = entry({
  lemma: "ajama", pos: "VERB",
  forms: [
    { formType: "INF_MA", value: "ajama" },
    { formType: "PRES_1SG", value: "ajan" },
    { formType: "PAST_1SG", value: "ajasin" },
  ],
});
const aevastama = entry({
  lemma: "aevastama", pos: "VERB",
  forms: [{ formType: "INF_MA", value: "aevastama" }, { formType: "PRES_1SG", value: "aevastan" }],
  examples: [{ et: "Tolm ajas aevastama.", en: null, source: "EKILEX" }],
});
const ravim = entry({
  lemma: "ravim", pos: "NOUN",
  forms: [
    { formType: "NOM_SG", value: "ravim" },
    { formType: "GEN_SG", value: "ravimi" },
    { formType: "PART_SG", value: "ravimit" },
  ],
  examples: [{ et: "See ravim on väga efektiivne.", en: null, source: "EKILEX" }],
});
const haigus = entry({
  lemma: "haigus", pos: "NOUN",
  forms: [{ formType: "NOM_SG", value: "haigus" }, { formType: "GEN_SG", value: "haiguse" }],
  examples: [
    { et: "Arst kirjutas haiguse vastu ravimit.", en: "The doctor prescribed medicine for the illness.", source: "EKILEX" },
    { et: "Ta võttis ravimit kolm korda päevas kogu pika haiguse ajal.", en: null, source: "EKILEX" },
    { et: "Kas ravimit on veel?", en: null, source: "EKILEX" },
  ],
});

describe("claimIndex", () => {
  it("claims a verb's past third person off its stored first person, over-reaching on purpose", () => {
    const claims = claimIndex([aeg, ajama]);
    expect(claims.get("ajas")).toEqual(new Set(["aeg", "ajama"]));
  });

  /*
    A POSTPOSITION IS A HEADWORD WITH NO FORMS, so it claimed its own spelling
    and nothing else: `laua pealt` and `minu kõrvale` were lent to `pea` and
    `kõrv` as the ablative of a head and the allative of an ear.
  */
  it("claims a postposition's own headword and the spellings its endings make", () => {
    const pea = entry({
      lemma: "pea", pos: "NOUN",
      forms: [{ formType: "NOM_SG", value: "pea" }, { formType: "GEN_SG", value: "pea" }, { formType: "PART_SG", value: "pead" }],
    });
    const claims = claimIndex([pea, entry({ lemma: "peal", pos: "ADVERB" }), entry({ lemma: "juures", pos: "ADVERB" })]);
    for (const spelling of ["peal", "peale", "pealt"]) {
      expect(claims.get(spelling), spelling).toEqual(new Set(["pea", "peal"]));
    }
    expect(claims.get("juures")).toEqual(new Set(["juures"]));
    expect(claims.get("juurest")).toEqual(new Set(["juures"]));
  });

  it("records the spelling a loan was made for, and not one two words claim", () => {
    const pea = entry({
      lemma: "pea", pos: "NOUN",
      forms: [{ formType: "NOM_SG", value: "pea" }, { formType: "GEN_SG", value: "pea" }, { formType: "PART_SG", value: "pead" }],
    });
    const kasipidur = entry({
      lemma: "käsipidur", pos: "NOUN",
      forms: [{ formType: "NOM_SG", value: "käsipidur" }],
      examples: [{ et: "Peas valitses tühjus, nagu käsipidur olnuks peal.", en: null, source: "EKILEX" }],
    });
    const lent = borrowSentences([pea, entry({ lemma: "peal", pos: "ADVERB" }), kasipidur]).get("pea") ?? [];
    expect(lent.map((e) => e.via)).toEqual([["peas"]]);
  });
});

describe("borrowSentences", () => {
  it("lends a sentence to every word whose form it carries, and never to its owner", () => {
    const out = borrowSentences([ravim, haigus]);
    expect(out.get("ravim")?.map((e) => e.et)).toContain("Arst kirjutas haiguse vastu ravimit.");
    // `haigus` owns those sentences and `ravim`'s own sentence carries no form of it.
    expect(out.get("haigus")).toBeUndefined();
  });

  it("refuses a spelling more than one entry claims", () => {
    const out = borrowSentences([aeg, ajama, aevastama]);
    expect(out.get("aeg")).toBeUndefined();
    expect(out.get("ajama")).toBeUndefined();
  });

  it("ranks a translated sentence first and a shorter one before a longer one", () => {
    const out = borrowSentences([ravim, haigus]);
    expect(out.get("ravim")?.map((e) => e.et)).toEqual([
      "Arst kirjutas haiguse vastu ravimit.",
      "Kas ravimit on veel?",
      "Ta võttis ravimit kolm korda päevas kogu pika haiguse ajal.",
    ]);
  });

  /*
    A spelling only `jooks` claims among these entries is still not only
    `jooks`'s in the language: `aastasadade jooksul` is the postposition
    "during". Where the language gives a spelling to more than one word, a
    sentence is lent for it only to the word the sentence means, and not at
    all where nobody read the sentence.
  */
  it("lends a spelling the language gives to two words only to the word its sentence means", () => {
    const jooks = entry({
      lemma: "jooks", pos: "NOUN",
      forms: [{ formType: "NOM_SG", value: "jooks" }, { formType: "GEN_SG", value: "jooksu" }],
    });
    const kultuur = entry({
      lemma: "kultuur", pos: "NOUN",
      examples: [
        { et: "Aastasadade jooksul kujunenud kultuur.", en: null, source: "EKILEX" },
        { et: "Ta võitis jooksul medali.", en: null, source: "EKILEX" },
        { et: "Pärast jooksul puhkasime.", en: null, source: "EKILEX" },
      ],
    });
    const read: Record<string, string[]> = {
      "Aastasadade jooksul kujunenud kultuur.": ["jooksul"],
      "Ta võitis jooksul medali.": ["jooks"],
    };
    const homographs: Homographs = {
      spellings: new Set(["jooksul"]),
      reading: (sentence, spelling) => (spelling === "jooksul" ? read[sentence] : undefined),
    };
    const lent = borrowSentences([jooks, kultuur], homographs).get("jooks")?.map((e) => e.et);
    expect(lent).toEqual(["Ta võitis jooksul medali."]);
    // And with nothing marked ambiguous, all three were lent: the refusal is
    // the reading, not the fixture.
    const none: Homographs = { spellings: new Set(), reading: () => undefined };
    expect(borrowSentences([jooks, kultuur], none).get("jooks")).toHaveLength(3);
  });

  it("lends nothing a learner typed, and nothing that is not a sentence", () => {
    const owner = entry({
      lemma: "arst", pos: "NOUN",
      forms: [{ formType: "NOM_SG", value: "arst" }, { formType: "GEN_SG", value: "arsti" }],
      examples: [
        { et: "Ma ostsin ravimit.", en: null, source: "USER" },
        { et: "Ravimit ..", en: null, source: "EKILEX" },
        { et: "Ravimit / rohtu.", en: null, source: "EKILEX" },
      ],
    });
    expect(borrowSentences([ravim, owner]).get("ravim")).toBeUndefined();
  });
});
