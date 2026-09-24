import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { gradeWrite } from "./score";
import { assemble, BLUEPRINT, buildPaper, explainForm, explainGap, explainWrittenGap, gapFrom, listeningItems, mulberry32, readingItems, speakingItems, writingItems, type WordRow } from "./items";
import { heardIndex, meaningsHeard } from "./heard";
import { BLANK } from "@/lib/estonian/cloze";
import { BANDS, type ChoiceItem, type Item } from "./types";

/**
 * The dictionary rows a test can lean on.
 *
 * Real seeded entries, copied from prisma/data: an invented word would let a
 * builder pass a test on Estonian that does not exist, which is the exact
 * failure this whole module is arranged to prevent.
 */
const WORDS: WordRow[] = [
  {
    id: "tuba", lemma: "tuba", translation: "room, chamber", pos: "NOUN", cefr: "A1", government: null,
    forms: [
      { formType: "NOM_SG", value: "tuba" },
      { formType: "GEN_SG", value: "toa" },
      { formType: "PART_SG", value: "tuba" },
      { formType: "ILL_SG_SHORT", value: "tuppa" },
      { formType: "GEN_PL", value: "tubade" },
      { formType: "PART_PL", value: "tube" },
    ],
    examples: [{ et: "Koristasin toa ära." }, { et: "Ma olen praegu toas.", en: "I am in the room right now." }],
  },
  {
    id: "tramm", lemma: "tramm", translation: "tram", pos: "NOUN", cefr: "A1", government: null,
    forms: [
      { formType: "NOM_SG", value: "tramm" },
      { formType: "GEN_SG", value: "trammi" },
      { formType: "PART_SG", value: "trammi" },
      { formType: "GEN_PL", value: "trammide" },
      { formType: "PART_PL", value: "tramme" },
    ],
    examples: [{ et: "Sõitsin trammiga koju." }, { et: "Nõmmele ei sõida tramm ega troll." }],
  },
  {
    id: "raamat", lemma: "raamat", translation: "book", pos: "NOUN", cefr: "A2", government: null,
    forms: [
      { formType: "NOM_SG", value: "raamat" },
      { formType: "GEN_SG", value: "raamatu" },
      { formType: "PART_SG", value: "raamatut" },
      { formType: "GEN_PL", value: "raamatute" },
      { formType: "PART_PL", value: "raamatuid" },
    ],
    examples: [],
  },
  {
    id: "aken", lemma: "aken", translation: "window", pos: "NOUN", cefr: "A2", government: null,
    forms: [
      { formType: "NOM_SG", value: "aken" },
      { formType: "GEN_SG", value: "akna" },
      { formType: "PART_SG", value: "akent" },
      { formType: "GEN_PL", value: "akende" },
      { formType: "PART_PL", value: "aknaid" },
    ],
    examples: [{ et: "Hotelli aknast on näha vanalinna." }],
  },
  {
    id: "klient", lemma: "klient", translation: "client, customer", pos: "NOUN", cefr: "B1", government: null,
    forms: [
      { formType: "NOM_SG", value: "klient" },
      { formType: "GEN_SG", value: "kliendi" },
      { formType: "PART_SG", value: "klienti" },
      { formType: "GEN_PL", value: "klientide" },
      { formType: "PART_PL", value: "kliente" },
    ],
    examples: [{ et: "Rahulolev klient on iga firma unistus." }],
  },
  {
    id: "aitama", lemma: "aitama", translation: "to help", pos: "VERB", cefr: "A2",
    government: "partitive: aitan sind (I help you)",
    forms: [
      { formType: "INF_MA", value: "aitama" },
      { formType: "INF_DA", value: "aidata" },
      { formType: "PRES_1SG", value: "aitan" },
      { formType: "PAST_1SG", value: "aitasin" },
      { formType: "PART_TUD", value: "aidatud" },
    ],
    examples: [{ et: "Õpetaja aitab õpilast." }],
  },
];

/**
 * Every Estonian string an item puts on screen, one word at a time.
 *
 * A gapped sentence is checked word by word rather than whole, which is the
 * stronger question: what is left standing has to be words of the sentence a
 * lexicographer recorded, and the blank has to be the only thing missing. A
 * whole-string check would have to give up on any prompt carrying a blank,
 * which is now most of them.
 */
function estonianIn(item: Item): string[] {
  const out: string[] = [item.lemma];
  if ("et" in item && item.et) out.push(...words(item.et));
  if (item.kind === "choice" && item.estonianOptions) out.push(...item.options);
  if (item.kind === "write") out.push(...words(item.sentence), ...words(item.full), item.targetForm);
  return out;
}

const words = (text: string) =>
  text.replace(BLANK, " ").split(/[^\p{L}\p{M}'’-]+/u).filter(Boolean);

/** Everything the dictionary rows can vouch for, word by word. */
const ATTESTED = new Set(
  WORDS.flatMap((w) => [
    w.lemma,
    ...w.forms.map((f) => f.value),
    ...w.examples.flatMap((e) => words(e.et)),
  ].map((s) => s.toLowerCase())),
);

/** Regular case endings the app derives from the genitive stem. */
const DERIVABLE = /(sse|s|st|le|l|lt|ks|ni|na|ta|ga)$/;

describe("items are built out of the dictionary, never written", () => {
  it("shows no Estonian that the dictionary cannot account for", () => {
    const rng = mulberry32(7);
    const items = [
      ...readingItems(WORDS, rng),
      ...listeningItems(WORDS, rng),
      ...writingItems(WORDS, rng),
      ...speakingItems(WORDS, rng),
    ];
    expect(items.length).toBeGreaterThan(10);

    for (const item of items) {
      for (const et of estonianIn(item)) {
        const lower = et.toLowerCase();
        if (ATTESTED.has(lower)) continue;
        // Anything else has to be a stored stem plus a regular ending.
        const stem = [...ATTESTED].some((known) => lower.startsWith(known.slice(0, -1)));
        expect(stem && DERIVABLE.test(lower), `${et} in ${item.id} has no source`).toBe(true);
      }
    }
  });

  it("never asks about a case by name", () => {
    /*
      The whole point of the rewrite. Nobody sitting a real Estonian placement
      test is asked to name a case, and this module used to spend half of its
      reading section and all of its writing section doing exactly that. The
      Estonian names still appear in the explanation after an answer, which is
      a cross-reference for somebody who is also taking a course; what may not
      happen is a *question* that cannot be answered without them.
    */
    const rng = mulberry32(13);
    const asked = [
      ...readingItems(WORDS, rng),
      ...listeningItems(WORDS, rng),
      ...writingItems(WORDS, rng),
    ].map((i) => i.question);
    expect(asked.length).toBeGreaterThan(5);
    for (const question of asked) {
      for (const spec of CASES) {
        expect(question.toLowerCase(), question).not.toContain(spec.et);
        expect(question.toLowerCase(), question).not.toContain(spec.en.toLowerCase());
      }
      // And no question mark doubled by a template appending one to a case
      // question that already ended in it: "the case that answers kus??".
      expect(question, question).not.toContain("??");
    }
  });
});

describe("a question always has exactly one right answer", () => {
  it("never repeats an option and always contains the answer", () => {
    const rng = mulberry32(11);
    const items = [...readingItems(WORDS, rng), ...listeningItems(WORDS, rng)]
      .filter((i): i is ChoiceItem => i.kind === "choice");
    expect(items.length).toBeGreaterThan(5);

    for (const item of items) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options.map((o) => o.toLowerCase())).size).toBe(4);
      expect(item.options[item.answer]).toBeDefined();
    }
  });

  it("drops a question whose distractors would be as right as the answer", () => {
    // Two words, one meaning: there is no honest fourth option, so no item.
    const twins: WordRow[] = [
      { ...WORDS[0]!, id: "a", lemma: "auto", translation: "car", forms: [], examples: [] },
      { ...WORDS[0]!, id: "b", lemma: "masin", translation: "car, machine", forms: [], examples: [] },
    ];
    expect(readingItems(twins, mulberry32(1))).toHaveLength(0);
  });
});

describe("bands", () => {
  it("never puts a gap at the first band", () => {
    // Reading an A1 word is an A1 question. Choosing between four of its
    // endings is not, whatever the word, so the first band stays what it is
    // supposed to be: can you read this word at all.
    const items = [...readingItems(WORDS, mulberry32(5)), ...writingItems(WORDS, mulberry32(5))];
    const gaps = items.filter((i) => i.id.startsWith("r-gap-") || i.id.startsWith("w-"));
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(BANDS.indexOf(gap.band), gap.id).toBeGreaterThanOrEqual(BANDS.indexOf("A2"));
    }
  });

  it("never asks a listening question about a word with no audio to play", () => {
    for (const item of listeningItems(WORDS, mulberry32(2))) {
      const et = "et" in item ? item.et : "";
      expect(et.length).toBeGreaterThan(0);
    }
  });
});

describe("assemble", () => {
  it("climbs the bands and asks about a word only once", () => {
    const items = assemble(readingItems(WORDS, mulberry32(9)), { total: 8, perBand: 2 });
    const lemmas = items.map((i) => i.lemma);
    expect(new Set(lemmas).size).toBe(lemmas.length);
    const indexes = items.map((i) => BANDS.indexOf(i.band));
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
  });

  it("respects the per band cap", () => {
    const items = assemble(readingItems(WORDS, mulberry32(4)), { total: 20, perBand: 1 });
    const perBand = new Map<string, number>();
    for (const item of items) perBand.set(item.band, (perBand.get(item.band) ?? 0) + 1);
    for (const count of perBand.values()) expect(count).toBe(1);
  });
});

describe("BLUEPRINT", () => {
  it("is the size the accuracy was measured at", () => {
    /*
      Asserted rather than described because the numbers are the finding. The
      paper was two per band per skill and placed 43% of simulated learners
      correctly while putting 57% below where they were; at these it places
      between 72% and 98% depending on the level. Lowering one of these is
      lowering how much of somebody's Estonian their level was read off.
    */
    expect(BLUEPRINT.reading).toEqual({ total: 30, perBand: 6 });
    expect(BLUEPRINT.listening).toEqual({ total: 15, perBand: 3 });
    expect(BLUEPRINT.writing).toEqual({ total: 30, perBand: 6 });
    expect(BLUEPRINT.speaking).toEqual({ total: 5, perBand: 1 });

    const total = Object.values(BLUEPRINT).reduce((sum, s) => sum + s.total, 0);
    expect(total).toBe(80);
    // Every section fills every band, or a band is decided by fewer skills
    // than the one below it and the two are not comparable.
    for (const section of Object.values(BLUEPRINT)) {
      expect(section.perBand * BANDS.length).toBe(section.total);
    }
  });

  it("gives every scored skill a band size two thirds is reachable at", () => {
    /*
      `PASS` is two thirds of a band's credit, and a band of n items can only
      score in nths. At two items two thirds means a perfect score, and at four
      it means three quarters, which is a stricter bar rather than a looser
      one. Only a multiple of three lets a learner score exactly the threshold
      they are being marked against, and 4 per band measured worse than 3.
    */
    for (const skill of ["reading", "listening", "writing"] as const) {
      expect(BLUEPRINT[skill].perBand % 3).toBe(0);
    }
  });
});

describe("buildPaper", () => {
  it("orders the sections and reports what it could not fill", () => {
    const paper = buildPaper(WORDS, 42);
    const skills = [...new Set(paper.items.map((i) => i.skill))];
    expect(skills).toEqual(["reading", "listening", "writing", "speaking"]);
    expect(paper.missing).toEqual([]);
  });

  it("says which sections it could not build rather than inventing them", () => {
    // A dictionary of verbs alone: nothing to inflect, nothing to write about.
    const verbs = WORDS.filter((w) => w.pos === "VERB");
    const paper = buildPaper(verbs, 1);
    expect(paper.missing).toContain("writing");
    expect(paper.items.every((i) => i.skill !== "writing")).toBe(true);
  });

  it("is deterministic for a seed and different across seeds", () => {
    expect(buildPaper(WORDS, 3).items.map((i) => i.id)).toEqual(buildPaper(WORDS, 3).items.map((i) => i.id));
    const a = buildPaper(WORDS, 3).items.map((i) => i.id).join();
    const b = buildPaper(WORDS, 99).items.map((i) => i.id).join();
    expect(a === b).toBe(false);
  });
});

/**
 * The question from the report, with the pool it was drawn out of.
 *
 * Real rows again: the six colors the course teaches in one unit, the noun
 * that shares `hall` with the gray one, and the three far entries that turned
 * up beside "black" in the version that shipped. A learner who has never seen
 * an Estonian word can cross out a plastic bag and a C1 abstract noun from an
 * A1 question, so the answer was the only option left worth reading.
 */
const NEIGHBOURS: WordRow[] = [
  { id: "must", lemma: "must", translation: "black", pos: "ADJECTIVE", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "must" }, { formType: "GEN_SG", value: "musta" }, { formType: "PART_SG", value: "musta" }], examples: [] },
  { id: "valge", lemma: "valge", translation: "white", pos: "ADJECTIVE", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "valge" }, { formType: "GEN_SG", value: "valge" }, { formType: "PART_SG", value: "valget" }], examples: [] },
  { id: "punane", lemma: "punane", translation: "red", pos: "ADJECTIVE", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "punane" }, { formType: "GEN_SG", value: "punase" }, { formType: "PART_SG", value: "punast" }], examples: [] },
  { id: "sinine", lemma: "sinine", translation: "blue", pos: "ADJECTIVE", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "sinine" }, { formType: "GEN_SG", value: "sinise" }, { formType: "PART_SG", value: "sinist" }], examples: [] },
  { id: "roheline", lemma: "roheline", translation: "green", pos: "ADJECTIVE", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "roheline" }, { formType: "GEN_SG", value: "rohelise" }, { formType: "PART_SG", value: "rohelist" }], examples: [] },
  { id: "kollane", lemma: "kollane", translation: "yellow", pos: "ADJECTIVE", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "kollane" }, { formType: "GEN_SG", value: "kollase" }, { formType: "PART_SG", value: "kollast" }], examples: [] },
  { id: "hall", lemma: "hall", translation: "frost", pos: "NOUN", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "hall" }, { formType: "GEN_SG", value: "halli" }, { formType: "PART_SG", value: "halli" }], examples: [] },
  { id: "kilekott", lemma: "kilekott", translation: "plastic bag", pos: "NOUN", cefr: "A2", government: null,
    forms: [{ formType: "NOM_SG", value: "kilekott" }, { formType: "GEN_SG", value: "kilekoti" }, { formType: "PART_SG", value: "kilekotti" }], examples: [] },
  { id: "narkomaania", lemma: "narkomaania", translation: "narcomania, drug addiction, substance abuse", pos: "NOUN", cefr: "B2", government: null,
    forms: [{ formType: "NOM_SG", value: "narkomaania" }, { formType: "GEN_SG", value: "narkomaania" }, { formType: "PART_SG", value: "narkomaaniat" }], examples: [] },
  { id: "asula", lemma: "asula", translation: "settlement, city, town, village", pos: "NOUN", cefr: "B2", government: null,
    forms: [{ formType: "NOM_SG", value: "asula" }, { formType: "GEN_SG", value: "asula" }, { formType: "PART_SG", value: "asulat" }], examples: [] },
];

const FAR_GLOSSES = ["plastic bag", "narcomania, drug addiction, substance abuse", "settlement, city, town, village"];

describe("the wrong answers are worth reading", () => {
  it("asks what a color means among colors, at every seed", () => {
    for (let seed = 1; seed < 30; seed++) {
      const heard = listeningItems(NEIGHBOURS, mulberry32(seed))
        .find((i): i is ChoiceItem => i.id === "l-word-must");
      expect(heard, `seed ${seed} asked nothing about must`).toBeDefined();
      for (const gloss of FAR_GLOSSES) expect(heard!.options).not.toContain(gloss);
      expect(heard!.options).toContain("black");
    }
  });

  it("does not hand a beginner three C1 nouns to cross out", () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const item of readingItems(NEIGHBOURS, mulberry32(seed))) {
        if (!item.id.startsWith("r-mean-") || item.band !== "A1") continue;
        const far = item.options.filter((o) => FAR_GLOSSES.includes(o));
        expect(far, `${item.id} at seed ${seed}`).toHaveLength(0);
      }
    }
  });

});

describe("a sentence a learner is asked to read is a sentence", () => {
  /*
    Three shapes of Ekilex usage reached the screen and none of them is a
    sentence. `naturalSentence` in lib/estonian/cloze.ts is the guard and this
    is the placement check's half of it: the same words the app was reported
    on, so a regression here reads as the report rather than as a regex.
  */
  const usage = (id: string, lemma: string, pos: string, et: string): WordRow => ({
    id, lemma, translation: "something", pos, cefr: "A1", government: null,
    forms: [
      { formType: "NOM_SG", value: lemma },
      { formType: "GEN_SG", value: `${lemma}i` },
      { formType: "PART_SG", value: `${lemma}it` },
      { formType: "PART_PL", value: `${lemma}eid` },
    ],
    examples: [{ et, en: "an English rendering" }],
  });

  const sentences = (words: WordRow[]) => {
    const rng = mulberry32(5);
    return [...readingItems(words, rng), ...listeningItems(words, rng), ...writingItems(words, rng)]
      .flatMap((i) => ("et" in i ? [i.et] : []) as string[])
      .concat(
        [...writingItems(words, mulberry32(5))].map((i) => i.full),
      );
  };

  it("drops a headword standing in front of a comma as a label", () => {
    // Filed under kahvel, and about a sailing gaff rather than about a fork.
    const built = sentences([usage("kahvel", "kahvel", "NOUN", "Kahvel, lipp kukub!")]);
    expect(built.filter((t) => t.includes("lipp"))).toHaveLength(0);
  });

  it("keeps a verb standing in front of a comma, which is a main clause", () => {
    const built = sentences([usage("uskuma", "usun", "VERB", "Usun, et ta ei valeta praegu.")]);
    expect(built.some((t) => t.includes("valeta"))).toBe(true);
  });

  it("drops a usage that trails off, or offers two words round a slash", () => {
    expect(sentences([usage("naitama", "uuring", "NOUN", "Uuringud uuringut näitavad, et ..")])).toHaveLength(0);
    expect(sentences([usage("elekter", "elekter", "NOUN", "Elekter elektrit läks ära / kadus.")])).toHaveLength(0);
  });
});

/*
  A QUESTION NOBODY CAN GET WRONG IS WORSE IN A MEASUREMENT THAN ON A CARD.
  `WriteQuestion` prints the word in bold and what it means beside it above the
  gap, deliberately, because a writing band is measuring the *form*. That holds
  right up until the sentence wants the dictionary form, and then the answer is
  the boldest thing on the screen: 1,549 of the 4,294 words the shipped
  dictionary can gap were in that state. Writing is one of the three skills
  whose average is the learner's level and the noisiest of them, so a free mark
  inside a six-item band is most of the distance between two bands.
*/
describe("a writing gap never prints the answer above the box", () => {
  const row = (extra: Partial<WordRow>): WordRow => ({
    id: "x", lemma: "x", translation: "x", pos: "NOUN", cefr: "A2", government: null,
    forms: [], examples: [], ...extra,
  });

  it("refuses a sentence that wants the word's own dictionary form", () => {
    const father = row({
      id: "isa", lemma: "isa", translation: "father",
      forms: [
        { formType: "NOM_SG", value: "isa" },
        { formType: "GEN_SG", value: "isa" },
        { formType: "PART_SG", value: "isa" },
        { formType: "GEN_PL", value: "isade" },
        { formType: "PART_PL", value: "isasid" },
      ],
      examples: [{ et: "Minu isa ja ema elavad Tallinnas." }],
    });
    expect(writingItems([father], mulberry32(1))).toEqual([]);
  });

  it("refuses a sentence whose answer is spelled by the English gloss", () => {
    // `saun` is glossed "sauna" and the sentence wants `sauna`. The meaning
    // hands the answer over as completely as the word would, which is what
    // `npm run audit:questions` caught after the lemma guard alone was written.
    const sauna = row({
      id: "saun", lemma: "saun", translation: "sauna",
      forms: [
        { formType: "NOM_SG", value: "saun" },
        { formType: "GEN_SG", value: "sauna" },
        { formType: "PART_SG", value: "sauna" },
        { formType: "GEN_PL", value: "saunade" },
        { formType: "PART_PL", value: "saunu" },
      ],
      examples: [{ et: "Pärast sauna jõime teed." }],
    });
    expect(writingItems([sauna], mulberry32(1))).toEqual([]);
  });

  it("still builds an item where another sentence wants a real form", () => {
    const items = writingItems(WORDS, mulberry32(1));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const cue = `${item.lemma} ${item.translation}`.toLowerCase();
      expect(cue.split(/[^\p{L}]+/u), item.lemma).not.toContain(item.targetForm.toLowerCase());
    }
  });
});

describe("the explanation after a gap", () => {
  it("leads with the sentence and what it means, not with a label", () => {
    // `tuba` with the one sentence the shipped dictionary holds an English
    // line for, since that line is what this is about.
    const tuba: WordRow = {
      ...WORDS.find((w) => w.lemma === "tuba")!,
      examples: [{ et: "Ma olen praegu toas.", en: "I am in the room right now." }],
    };
    const explained = writingItems([tuba], mulberry32(3)).find((i) => i.because.length > 0);
    expect(explained, "no written gap was built").toBeDefined();
    /*
      Three versions of this have been reported as unreadable. The first two
      were the same fault at different lengths: "Here toas is in the seesütlev,
      the inessive.", and then a form named as three cases with three bracketed
      questions after it. The third was this paragraph opening with the whole
      sentence, on a screen that draws that same sentence in bold directly
      above it with the wanted form picked out in the accent: the sentence
      three times and the answer three times on one card.

      So the typed shape gets `explainWrittenGap`, which is what is left once
      the drawing above has had its say: what the sentence means, and which
      form it wanted. The multiple choice shape is still showing a blanked line
      when it marks, so `explainGap` keeps the sentence for it.
    */
    expect(explained!.because.startsWith(explained!.full)).toBe(false);
    expect(explained!.because).toContain("I am in the room right now.");
    expect(explained!.because).toContain("The gap takes toas rather than tuba.");
    // And the clause `lib/estonian/plainAsk.ts` holds for the slot, which is
    // what a person would say out loud rather than what a class calls it.
    expect(explained!.because).toContain("when something is inside it");
  });

  it("marks a derived case one keystroke away as the wrong case, not a slip", () => {
    // `toast` is built on the genitive stem rather than stored, so it is never
    // among the distractors a seeded entry offers, and it has to be among the
    // spellings the typed answer is marked against or it reads as a typo.
    const tuba: WordRow = {
      ...WORDS.find((w) => w.lemma === "tuba")!,
      examples: [{ et: "Ma olen praegu toas.", en: "I am in the room right now." }],
    };
    const item = writingItems([tuba], mulberry32(3)).find((i) => i.targetForm === "toas");
    expect(item, "no written gap was built").toBeDefined();
    const marked = gradeWrite(item!, "toast");
    expect(marked.right).toBe(false);
  });

  it("keeps the sentence for the shape that is still showing a blank", () => {
    /*
      The two shapes of one task, and the whole reason there are two functions.
      A reading gap marks while the blanked line is still on screen, so its
      explanation has to put the sentence back together; the typed gap draws
      the sentence itself. Asserted in both directions, because a caller
      wiring the wrong one produces a screen that reads fine until you notice
      the sentence is on it twice.
    */
    const tuba: WordRow = {
      ...WORDS.find((w) => w.lemma === "tuba")!,
      examples: [{ et: "Ma olen praegu toas.", en: "I am in the room right now." }],
    };
    const gap = gapFrom(tuba);
    expect(gap, "no gap was built").not.toBeNull();
    expect(explainGap(tuba, gap!).startsWith(gap!.full)).toBe(true);
    expect(explainWrittenGap(tuba, gap!).startsWith(gap!.full)).toBe(false);
    // Neither loses the reason, which is the half a drawing cannot carry.
    for (const text of [explainGap(tuba, gap!), explainWrittenGap(tuba, gap!)]) {
      expect(text).toContain("The gap takes toas rather than tuba.");
    }
  });

  it("says nothing about the slot when one spelling is two cases", () => {
    /*
      `kaarti` is the osastav and the short sisseütlev; `laulu` is three cases
      at once, which is what a learner reported this off. Which one a sentence
      is using is a parse this app does not have. The version before this
      listed all three and let the learner sort it out, which is a paragraph of
      grammar vocabulary that answers nothing; the sentence is the explanation
      here and the line above it stops at the form.
    */
    const kaart: WordRow = {
      id: "kaart", lemma: "kaart", translation: "map, card", pos: "NOUN", cefr: "A2", government: null,
      forms: [
        { formType: "NOM_SG", value: "kaart" },
        { formType: "GEN_SG", value: "kaardi" },
        { formType: "PART_SG", value: "kaarti" },
        { formType: "ILL_SG_SHORT", value: "kaarti" },
        { formType: "PART_PL", value: "kaarte" },
        { formType: "GEN_PL", value: "kaartide" },
      ],
      examples: [{ et: "Õpilased uurisid tunnis Euroopa kaarti." }],
    };
    const because = writingItems([kaart], mulberry32(3)).map((i) => i.because);
    expect(because.length, "no syncretic form turned up").toBeGreaterThan(0);
    for (const line of because) {
      expect(line).toContain("The gap takes kaarti rather than kaart.");
      expect(line.endsWith("The gap takes kaarti rather than kaart.")).toBe(true);
    }
  });

  it("never describes a plural as the singular's slot", () => {
    /*
      `CASE_BY_FORM_TYPE` used to translate a principal part into a case and
      throw the number away, mapping `NOM_PL`, `GEN_PL` and `PART_PL` onto the
      singular keys. 828 of the gaps the shipped dictionary builds took the
      singular's clause because of it, and the nominative plural was the one
      that was outright false: `sõbrad` was explained as "the form you use as
      the plain dictionary word", about a word whose dictionary form is
      `sõber` and is printed three words earlier in the same sentence.
    */
    const sober: WordRow = {
      id: "sober", lemma: "sõber", translation: "friend", pos: "NOUN", cefr: "A1", government: null,
      forms: [
        { formType: "NOM_SG", value: "sõber" },
        { formType: "GEN_SG", value: "sõbra" },
        { formType: "PART_SG", value: "sõpra" },
        { formType: "NOM_PL", value: "sõbrad" },
        { formType: "GEN_PL", value: "sõprade" },
        { formType: "EKILEX:PlAll", value: "sõpradele" },
      ],
      examples: [
        { et: "Minu sõbrad tulevad homme." },
        { et: "Ma kirjutasin sõpradele kirja." },
      ],
    };
    const lines = [
      ...writingItems([sober], mulberry32(3)).map((i) => i.because),
      ...readingItems([sober], mulberry32(3)).map((i) => i.because),
    ];
    const nominative = lines.filter((l) => l.includes("takes sõbrad"));
    expect(nominative.length, "no nominative plural gap was built").toBeGreaterThan(0);
    for (const line of nominative) {
      expect(line).toContain("That is the plural.");
      expect(line, "the plural is described as the dictionary word")
        .not.toContain("as the plain dictionary word");
    }
    /*
      And an oblique keeps its clause, since a plural allative is still the
      form something goes to. What it gains is the word "plural". Asked of
      `explainForm` rather than through a gap, because a word carries one gap
      per builder and which of its forms that gap wants is the sentence's
      choice rather than this test's.
    */
    const allative = explainForm(sober, "sõpradele");
    expect(allative).toContain("That is the plural, and the form you use");
    expect(allative).toContain("is given to somebody");
    expect(explainForm(sober, "sõprade")).toContain("That is the plural, and the form you use");
  });

  it("says what a verb form is asking, off a seeded principal part", () => {
    /*
      `plainAsk` is keyed on Ekilex's codes and every seeded verb carries
      `INF_DA`, `PART_TUD`, `PRES_1SG` or `PAST_1SG`, so the clause was null
      on every one of the 249 verb gaps the shipped dictionary builds and the
      explanation stopped at the form. `slotCodeOf` is the one reading of
      which slot a row is in, whichever way the row spells it.
    */
    const sooma: WordRow = {
      id: "sooma", lemma: "sööma", translation: "to eat", pos: "VERB", cefr: "A1", government: null,
      forms: [
        { formType: "INF_MA", value: "sööma" },
        { formType: "INF_DA", value: "süüa" },
        { formType: "PRES_1SG", value: "söön" },
        { formType: "PAST_1SG", value: "sõin" },
      ],
      examples: [
        { et: "Ma tahan süüa." },
        { et: "Ma söön hommikust." },
      ],
    };
    const lines = [
      ...writingItems([sooma], mulberry32(3)).map((i) => i.because),
      ...readingItems([sooma], mulberry32(3)).map((i) => i.because),
    ];
    const infinitive = lines.filter((l) => l.includes("takes süüa"));
    expect(infinitive.length, "no da-infinitive gap was built").toBeGreaterThan(0);
    for (const line of infinitive) expect(line).toContain("when you mean");
    expect(explainForm(sooma, "söön")).toContain("about yourself, happening now");
    expect(explainForm(sooma, "sõin")).toContain("about yourself, already happened");
  });

  it("never names a case, in Estonian or in Latin", () => {
    /*
      The rule this screen is held to, reported off the level check: a name is
      a thing you look up, and a learner who has just answered a question has
      neither the room nor the reason. CLAUDE.md's rule about the Estonian
      names leading is not reversed by it, since this screen names none: the
      grammar reference, the dictionary entry and every screen that does name a
      case still lead with `seesütlev`.
    */
    const explained = [
      ...writingItems(WORDS, mulberry32(3)).map((i) => i.because),
      ...readingItems(WORDS, mulberry32(3)).map((i) => i.because),
    ].filter((b) => b.includes("The gap takes"));
    expect(explained.length, "no gap explanation was built at all").toBeGreaterThan(0);
    for (const line of explained) {
      for (const spec of CASES) {
        expect(line.toLowerCase(), `the explanation names the ${spec.et}`)
          .not.toContain(spec.et.toLowerCase());
        expect(line.toLowerCase(), `the Latin name is back: ${spec.en}`)
          .not.toContain(`(${spec.en.toLowerCase()})`);
      }
    }
  });
});

describe("a word's other recorded sense is never a wrong answer", () => {
  it("does not offer gray against hall meaning frost", () => {
    const hall: WordRow[] = [
      { id: "hall-n", lemma: "hall", translation: "frost", pos: "NOUN", cefr: "A2", government: null,
        forms: [{ formType: "NOM_SG", value: "hall" }], examples: [] },
      { id: "hall-a", lemma: "hall", translation: "gray", pos: "ADJECTIVE", cefr: "A2", government: null,
        forms: [{ formType: "NOM_SG", value: "hall" }], examples: [] },
      { id: "must", lemma: "must", translation: "black", pos: "ADJECTIVE", cefr: "A1", government: null,
        forms: [{ formType: "NOM_SG", value: "must" }], examples: [] },
      { id: "valge", lemma: "valge", translation: "white", pos: "ADJECTIVE", cefr: "A1", government: null,
        forms: [{ formType: "NOM_SG", value: "valge" }], examples: [] },
      { id: "pruun", lemma: "pruun", translation: "brown", pos: "ADJECTIVE", cefr: "A1", government: null,
        forms: [{ formType: "NOM_SG", value: "pruun" }], examples: [] },
      { id: "sinine", lemma: "sinine", translation: "blue", pos: "ADJECTIVE", cefr: "A1", government: null,
        forms: [{ formType: "NOM_SG", value: "sinine" }], examples: [] },
    ];
    for (let seed = 1; seed < 30; seed++) {
      for (const item of readingItems(hall, mulberry32(seed))) {
        if (!item.id.startsWith("r-mean-hall-")) continue;
        const other = item.options[item.answer] === "frost" ? "gray" : "frost";
        expect(item.options, `${item.id} at seed ${seed}`).not.toContain(other);
      }
    }
  });
});

/**
 * Real rows again. `isa`'s first recorded usage is `Isa ja ema ei olnud
 * kodus.`, and it turned up in the measurement that found this fault: the
 * sentence was played, "father" was the answer, and "mother" stood among the
 * wrong ones. `emakeel` is here because its gloss shares a word with `ema`'s,
 * which is how the rule reaches a word the pool does not hold.
 */
const FAMILY: WordRow[] = [
  { id: "isa", lemma: "isa", translation: "father", pos: "NOUN", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "isa" }, { formType: "GEN_SG", value: "isa" }, { formType: "PART_SG", value: "isa" }, { formType: "GEN_PL", value: "isade" }, { formType: "NOM_PL", value: "isad" }, { formType: "PART_PL", value: "isasid" }],
    examples: [{ et: "Isa ja ema ei olnud kodus." }] },
  { id: "ema", lemma: "ema", translation: "mother", pos: "NOUN", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "ema" }, { formType: "GEN_SG", value: "ema" }, { formType: "PART_SG", value: "ema" }, { formType: "GEN_PL", value: "emade" }, { formType: "NOM_PL", value: "emad" }, { formType: "PART_PL", value: "emasid" }],
    examples: [{ et: "Kolme lapse ema." }] },
  { id: "emakeel", lemma: "emakeel", translation: "mother tongue", pos: "NOUN", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "emakeel" }, { formType: "GEN_SG", value: "emakeele" }, { formType: "PART_SG", value: "emakeelt" }, { formType: "ILL_SG_SHORT", value: "emakeelde" }, { formType: "GEN_PL", value: "emakeelte" }, { formType: "NOM_PL", value: "emakeeled" }, { formType: "PART_PL", value: "emakeeli" }],
    examples: [{ et: "Ta räägib ainult oma emakeelt." }] },
  { id: "kodu", lemma: "kodu", translation: "home", pos: "NOUN", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "kodu" }, { formType: "GEN_SG", value: "kodu" }, { formType: "PART_SG", value: "kodu" }, { formType: "ILL_SG_SHORT", value: "koju" }, { formType: "GEN_PL", value: "kodude" }, { formType: "NOM_PL", value: "kodud" }, { formType: "PART_PL", value: "kodusid" }],
    examples: [{ et: "Tule ruttu koju!" }] },
  { id: "vanaema", lemma: "vanaema", translation: "grandmother", pos: "NOUN", cefr: "A1", government: null,
    forms: [{ formType: "NOM_SG", value: "vanaema" }, { formType: "GEN_SG", value: "vanaema" }, { formType: "PART_SG", value: "vanaema" }, { formType: "GEN_PL", value: "vanaemade" }, { formType: "NOM_PL", value: "vanaemad" }, { formType: "PART_PL", value: "vanaemasid" }],
    examples: [{ et: "Minu vanaema ja vanaisa elavad maal." }] },
];

describe("a wrong answer may be tricky and may not be true", () => {
  const sentence = "Isa ja ema ei olnud kodus.";

  it("reads every meaning the recording holds, in whatever form the word took", () => {
    const heard = meaningsHeard(sentence, heardIndex(FAMILY));
    expect(heard).toContain("father");
    expect(heard).toContain("mother");
    // `kodus` is the seesütlev, worked out from the stem, not a stored form.
    expect(heard).toContain("home");
    expect(heard).not.toContain("grandmother");
  });

  it("never offers the meaning of another word that was in the sentence", () => {
    const pool = [...FAMILY, ...NEIGHBOURS];
    for (let seed = 1; seed < 40; seed++) {
      const item = listeningItems(pool, mulberry32(seed)).find((i): i is ChoiceItem => i.id === "l-use-isa");
      expect(item, `seed ${seed} asked nothing about isa`).toBeDefined();
      expect(item!.et).toBe(sentence);
      expect(item!.options).toContain("father");
      expect(item!.options).not.toContain("mother");
      expect(item!.options).not.toContain("home");
      expect(item!.options).not.toContain("mother tongue");
    }
  });

  it("consults the index it is handed for the words the pool does not hold", () => {
    // `ema` is in the recording and not in the pool, so nothing the pool
    // knows says "mother" was heard. The dictionary's own index does.
    const pool = FAMILY.filter((w) => w.id !== "ema").concat(NEIGHBOURS);
    const dictionary = heardIndex(FAMILY);
    let offeredWithout = 0;
    for (let seed = 1; seed < 40; seed++) {
      const bare = listeningItems(pool, mulberry32(seed)).find((i): i is ChoiceItem => i.id === "l-use-isa");
      if (bare?.options.includes("mother tongue")) offeredWithout++;
      const item = listeningItems(pool, mulberry32(seed), dictionary).find((i): i is ChoiceItem => i.id === "l-use-isa");
      expect(item, `seed ${seed} asked nothing about isa`).toBeDefined();
      expect(item!.options).not.toContain("mother tongue");
    }
    // The check has to be able to fail: without the index the option is offered.
    expect(offeredWithout).toBeGreaterThan(0);
  });

  it("reaches the paper the same way", () => {
    for (let seed = 1; seed < 20; seed++) {
      const paper = buildPaper([...FAMILY, ...NEIGHBOURS], seed);
      const item = paper.items.find((i): i is ChoiceItem => i.id === "l-use-isa");
      if (!item) continue;
      expect(item.options).not.toContain("mother");
    }
  });

  /*
    Real rows. `mina` is stored with the genitive plural `meie`, which is the
    entry `meie` in its own right, so the spelling played by the word-alone
    question belongs to two entries and both meanings are true of it. Found by
    `npm run audit:questions`, which reported `check items heard meie` showing
    "meie" and offering "I, me".
  */
  const PRONOUNS: WordRow[] = [
    { id: "meie", lemma: "meie", translation: "we, us", pos: "PRONOUN", cefr: "A1", government: null,
      forms: [{ formType: "NOM_SG", value: "meie" }, { formType: "GEN_SG", value: "meie" }, { formType: "PART_SG", value: "meid" }], examples: [] },
    { id: "mina", lemma: "mina", translation: "I, me", pos: "PRONOUN", cefr: "A1", government: null,
      forms: [{ formType: "NOM_SG", value: "mina" }, { formType: "GEN_SG", value: "minu" }, { formType: "PART_SG", value: "mind" }, { formType: "GEN_PL", value: "meie" }], examples: [] },
  ];

  it("never offers the meaning of another entry the played spelling belongs to", () => {
    const pool = [...PRONOUNS, ...FAMILY, ...NEIGHBOURS];
    for (let seed = 1; seed < 40; seed++) {
      const item = listeningItems(pool, mulberry32(seed)).find((i): i is ChoiceItem => i.id === "l-word-meie");
      expect(item, `seed ${seed} asked nothing about meie`).toBeDefined();
      expect(item!.et).toBe("meie");
      expect(item!.options).toContain("we, us");
      expect(item!.options).not.toContain("I, me");
    }
  });
});
