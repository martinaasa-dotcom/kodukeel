import { describe, expect, it } from "vitest";
import {
  mergeExamples, parseExamples, sentenceContaining, sentenceWords, serialiseExamples, splitOnForm,
  teachingSentence, usableExamples,
  type Example,
} from "./examples";

const ek = (et: string, en?: string): Example => ({ et, source: "EKILEX", ...(en ? { en } : {}) });

describe("parseExamples", () => {
  it("reads what serialiseExamples wrote", () => {
    const examples = [ek("Jõin tassi kohvi.", "I drank a cup of coffee.")];
    expect(parseExamples(serialiseExamples(examples))).toEqual([
      { et: "Jõin tassi kohvi.", en: "I drank a cup of coffee.", source: "EKILEX" },
    ]);
  });

  it("treats a missing or empty column as no examples", () => {
    expect(parseExamples(null)).toEqual([]);
    expect(parseExamples("")).toEqual([]);
    expect(parseExamples("[]")).toEqual([]);
  });

  it("survives a malformed column rather than throwing on the page", () => {
    expect(parseExamples("{not json")).toEqual([]);
    expect(parseExamples('"a string"')).toEqual([]);
  });

  it("drops entries that are not sentences", () => {
    expect(parseExamples(JSON.stringify([{ source: "EKILEX" }, { et: "   " }, ek("Ta on kodus.")])))
      .toEqual([{ et: "Ta on kodus.", source: "EKILEX" }]);
  });
});

describe("usableExamples", () => {
  it("drops fragments and paragraphs", () => {
    const kept = usableExamples([
      ek("Ei."),
      ek("Jõin tassi kohvi."),
      ek("x".repeat(200)),
    ]);
    expect(kept.map((e) => e.et)).toEqual(["Jõin tassi kohvi."]);
  });

  it("drops a one-word usage, which is a compound wearing a full stop rather than a sentence", () => {
    // poeg's own recorded usages: none of the three contains "poeg" as a
    // word, and shortest-first would otherwise put "Kuningapoeg." in front
    // of a beginner who has not met "kuningas" yet.
    const kept = usableExamples([ek("Rongapoeg."), ek("Särjepoeg."), ek("Kuningapoeg."), ek("Ta on kodus.")]);
    expect(kept.map((e) => e.et)).toEqual(["Ta on kodus."]);
  });

  it("picks poeg's own real sentence over the compound (the reported case)", () => {
    // prisma/data/harvested.ts's actual usages for poeg, verbatim: a real
    // A1-simple sentence sits right beside the compound, and shortest-first
    // was reaching past it for "Kuningapoeg." because that compound is
    // shorter than any real sentence could be.
    const kept = usableExamples([
      ek("Mardi peres on kaks teismelist poega."),
      ek("Kuningapoeg."),
      ek("Neil on kaks poega ja tütar."),
      ek("Paljud Eestimaa pojad ja tütred põgenesid kommunistide eest Läände."),
    ]);
    expect(kept[0]!.et).toBe("Neil on kaks poega ja tütar.");

    const found = teachingSentence(kept, ["poeg"]);
    expect(found?.example.et).toBe("Neil on kaks poega ja tütar.");
  });

  it("puts the shortest first — a beginner reads the one-liner", () => {
    const kept = usableExamples([
      ek("Sünnipäevapeol sai hästi süüa ja juua."),
      ek("Jõin tassi kohvi."),
    ]);
    expect(kept[0]!.et).toBe("Jõin tassi kohvi.");
  });

  it("removes duplicates, ignoring case and stray whitespace", () => {
    const kept = usableExamples([ek("Jõin tassi kohvi."), ek("jõin  tassi kohvi.")]);
    expect(kept).toHaveLength(1);
  });

  it("caps how many one word can carry", () => {
    const many = Array.from({ length: 20 }, (_, i) => ek(`Ta läks sinna number ${i} korda.`));
    expect(usableExamples(many).length).toBeLessThanOrEqual(8);
  });
});

/*
  A BEGINNER'S FIRST MEETING WITH A COURSE WORD NEVER TURNS OUT TO BE A
  COMPOUND OF IT.

  poeg was one instance of a general shape: any A1 or A2 word whose recorded
  usages happen to include a compound shorter than its real sentences reaches
  a beginner as that compound, because shortest-first sorting cannot tell a
  compound from a sentence on length alone. Walked over all 703 A1/A2 words in
  the actual course harvest rather than a handful picked by hand, because a
  fault found once by reading a screenshot is a fault found a second time by
  a learner.

  Hermetic. It reads the one file `npm run db:seed` loads for the course
  vocabulary and nothing else.
*/
describe("the A1/A2 course vocabulary's first-meeting sentences", () => {
  it("never picks a one-word usage over a real sentence, and never goes empty because of it", async () => {
    const { HARVESTED } = await import("../../prisma/data/harvested");
    const { courseWords } = await import("../collections/syllabus/index");
    const courseLevel = new Map(courseWords().map((w) => [`${w.lemma}|${w.pos}`, w.level]));

    const beginnerWords = HARVESTED.filter((w) => {
      const level = w.cefr ?? courseLevel.get(`${w.lemma}|${w.pos}`) ?? "B1";
      return level === "A1" || level === "A2";
    });
    expect(beginnerWords.length).toBeGreaterThan(500); // a floor, so a broken import reads as a failure rather than an empty pass

    for (const word of beginnerWords) {
      const examples = word.usages.map((et) => ek(et));
      const usable = usableExamples(examples);

      // A word with recorded usages must still have something to show: the
      // filter drops compounds, never every usage a word happens to have.
      if (word.usages.length > 0) expect(usable.length).toBeGreaterThan(0);

      for (const example of usable) {
        expect(sentenceWords(example.et).length, `${word.lemma}: "${example.et}"`).toBeGreaterThan(1);
      }
    }
  });

  /*
    A SECOND SHAPE OF THE SAME FAULT: A "SENTENCE" THAT TRAILS OFF, SPLITS TWO
    ALTERNATIVES WITH A SLASH, OR NAMES ITSELF BEFORE ILLUSTRATING.

    sellepärast, an A1 word, was reaching a beginner as "Küsin seda
    sellepärast, et .." with nothing after the comma. The exam and the mock
    exam already refuse exactly this shape through `naturalSentence`
    (`lib/estonian/cloze.ts`); the first-meeting sentence picker never asked
    it. Walked over the whole course, not only A1/A2, because the ellipsis
    shape turned up as far out as C1 (`välispoliitika`).

    Both configurations production actually runs: `cards.ts` calls
    `teachingSentence` with no part of speech, so only the length, word-count,
    ellipsis, slash and parenthetical checks apply; `learn.ts` also has the
    lexeme's part of speech and forms handy, so it additionally catches a
    usage that opens with the word's own headword (the label pattern).
  */
  it("never picks a sentence that fails the exam's own naturalSentence rule, at any level", async () => {
    const { HARVESTED } = await import("../../prisma/data/harvested");
    const { naturalSentence, nominalOpener } = await import("../estonian/cloze");
    expect(HARVESTED.length).toBeGreaterThan(1000); // a floor against a broken import

    for (const word of HARVESTED) {
      const examples = word.usages.map((et) => ek(et));

      const noPos = teachingSentence(examples, [word.lemma]);
      if (noPos) expect(naturalSentence(noPos.example.et), `${word.lemma}: "${noPos.example.et}"`).toBe(true);

      const opener = nominalOpener(word.pos, [word.lemma, ...Object.values(word.parts)]);
      const withPos = teachingSentence(examples, [word.lemma], opener);
      if (withPos) {
        expect(naturalSentence(withPos.example.et, opener), `${word.lemma}: "${withPos.example.et}"`).toBe(true);
      }
    }
  });
});

describe("mergeExamples", () => {
  it("keeps a translation already resolved when the sentence is refetched", () => {
    const merged = mergeExamples(
      [ek("Jõin tassi kohvi.", "I drank a cup of coffee.")],
      [ek("Jõin tassi kohvi.")],
    );
    expect(merged[0]!.en).toBe("I drank a cup of coffee.");
  });

  it("adds sentences that are new", () => {
    const merged = mergeExamples([ek("Jõin tassi kohvi.")], [ek("Kitsed olid ojal joomas.")]);
    expect(merged).toHaveLength(2);
  });

  it("does not duplicate a sentence that only differs by case", () => {
    const merged = mergeExamples([ek("Jõin tassi kohvi.")], [ek("JÕIN TASSI KOHVI.")]);
    expect(merged).toHaveLength(1);
  });
});

describe("sentenceWords", () => {
  it("keeps Estonian letters and drops punctuation", () => {
    expect(sentenceWords("Jõin tassi kohvi.")).toEqual(["jõin", "tassi", "kohvi"]);
  });

  it("keeps a hyphenated word whole", () => {
    expect(sentenceWords("üle-eestiline võistlus")).toEqual(["üle-eestiline", "võistlus"]);
  });

  it("copes with quotes, dashes and numbers between words", () => {
    expect(sentenceWords("«Tere!» — ütles ta 2007. aastal")).toEqual([
      "tere", "ütles", "ta", "aastal",
    ]);
  });
});

describe("sentenceContaining", () => {
  const ex = (et: string, en?: string): Example => ({ et, en: en ?? null, source: "EKILEX" });

  it("finds a sentence holding the form as a whole word", () => {
    const found = sentenceContaining([ex("Ta istub toas ja loeb.")], "toas");
    expect(found?.et).toBe("Ta istub toas ja loeb.");
  });

  it("does not match a form that is only a substring of another word", () => {
    // `toa` is inside `toas`. Offering this sentence as an example of the
    // genitive would be teaching the inessive by accident.
    expect(sentenceContaining([ex("Ta istub toas ja loeb.")], "toa")).toBeNull();
  });

  it("ignores case, including Estonian letters", () => {
    expect(sentenceContaining([ex("Õues sajab vihma.")], "õues")?.et).toBe("Õues sajab vihma.");
  });

  it("prefers a sentence that has been translated", () => {
    const found = sentenceContaining(
      [ex("Ma ootan bussi peatuses."), ex("Bussi ei tulnud.", "The bus did not come.")],
      "bussi",
    );
    expect(found?.en).toBe("The bus did not come.");
  });

  it("returns nothing for an empty form or an empty list", () => {
    expect(sentenceContaining([ex("Ta istub toas.")], "  ")).toBeNull();
    expect(sentenceContaining([], "toas")).toBeNull();
  });
});

describe("teachingSentence", () => {
  const examples = [
    ek("Kohv on laual."),
    ek("Jõin tassi kohvi.", "I drank a cup of coffee."),
    ek("Ma ei taha täna kohvi juua."),
  ];

  it("prefers the sentence carrying the form the card is about to ask for", () => {
    // Ranked above the lemma on purpose: a learner meeting the partitive
    // learns nothing from a sentence carrying the nominative.
    const found = teachingSentence(examples, ["kohvi", "kohv"]);
    expect(found?.form).toBe("kohvi");
    expect(found?.example.et).toBe("Jõin tassi kohvi.");
  });

  it("falls back to the lemma when nothing carries the asked form", () => {
    const found = teachingSentence(examples, ["kohvile", "kohv"]);
    expect(found?.form).toBe("kohv");
    expect(found?.example.et).toBe("Kohv on laual.");
  });

  it("still offers a sentence when neither appears, and marks nothing in it", () => {
    // Worth showing: seeing a word inflected in a way you did not expect is
    // how anybody works out that Estonian inflects. Pointing at a word that is
    // not the one being taught would be worse than pointing at nothing.
    const found = teachingSentence([ek("Ilm on täna ilus.")], ["kohvi", "kohv"]);
    expect(found?.form).toBeNull();
    expect(found?.example.et).toBe("Ilm on täna ilus.");
  });

  it("has nothing to say about a word with no usable examples", () => {
    expect(teachingSentence([], ["kohv"])).toBeNull();
    expect(teachingSentence([ek("Ei.")], ["kohv"])).toBeNull();
  });

  it("skips blank and repeated candidates rather than matching on them", () => {
    const found = teachingSentence(examples, [null, "", "kohvi", "kohvi"]);
    expect(found?.form).toBe("kohvi");
  });

  it("never picks a sentence that trails off mid-thought (the reported case)", () => {
    // sellepärast's own recorded usages, verbatim: an A1 word whose first
    // meeting was reaching a learner as "Küsin seda sellepärast, et .." with
    // nothing after the comma, while a plain sentence sat right beside it.
    const found = teachingSentence(
      [ek("Sellepärast ta mulle meeldibki, et ta on nii lärmakas."), ek("Küsin seda sellepärast, et ..")],
      ["sellepärast"],
    );
    expect(found?.example.et).toBe("Sellepärast ta mulle meeldibki, et ta on nii lärmakas.");
  });

  it("never picks a sentence with a slash, a parenthetical or an unfinished list", () => {
    expect(teachingSentence([ek("Elekter läks ära / kadus."), ek("Tuli süttis toas.")], ["tuli"])?.example.et)
      .toBe("Tuli süttis toas.");
    expect(teachingSentence([ek("Viis miinus null on viis (5 – 0 = 5)."), ek("Miljon kirjutatakse kuue nulliga.")], ["null"])?.example.et)
      .toBe("Miljon kirjutatakse kuue nulliga.");
  });

  it("skips the label pattern only where it is told the word's part of speech", () => {
    // aitäh's own usages: "Aitäh, Mari!" is the entry naming itself and then
    // illustrating, which the exam already refuses through the same rule
    // (see naturalSentence). Left out, the check cannot tell a label from an
    // ordinary sentence, so only a caller that passes it gets the label caught.
    const examples = [ek("Aitäh, Mari!"), ek("Aitäh abi eest!")];
    expect(teachingSentence(examples, ["aitäh"])?.example.et).toBe("Aitäh, Mari!");

    const opener = (word: string) => word.toLowerCase() === "aitäh";
    expect(teachingSentence(examples, ["aitäh"], opener)?.example.et).toBe("Aitäh abi eest!");
  });

  it("would rather show nothing than a sentence that fails every check", () => {
    expect(teachingSentence([ek("Tsitaat kõlab minu vabatõlkes järgmiselt ..")], ["vabatõlge"])).toBeNull();
  });
});

describe("splitOnForm", () => {
  it("marks the form and leaves the rest of the sentence alone", () => {
    expect(splitOnForm("Jõin tassi kohvi.", "kohvi")).toEqual([
      { text: "Jõin tassi ", match: false },
      { text: "kohvi", match: true },
      { text: ".", match: false },
    ]);
  });

  it("marks whole words only, so a stem inside a longer form is left alone", () => {
    // The same rule sentenceContaining is built on: `toa` sits inside `toas`,
    // and marking it there would point at a case the sentence does not carry.
    expect(splitOnForm("Toas on soe.", "toa")).toEqual([{ text: "Toas on soe.", match: false }]);
  });

  it("holds the boundary on Estonian's own letters", () => {
    // `\b` is defined on ASCII word characters, so õ is a boundary to it and
    // a naive pattern would match the tail of a longer word.
    expect(splitOnForm("Sõidan tööle.", "sõida")).toEqual([{ text: "Sõidan tööle.", match: false }]);
    expect(splitOnForm("Ma sõidan.", "sõidan")).toEqual([
      { text: "Ma ", match: false },
      { text: "sõidan", match: true },
      { text: ".", match: false },
    ]);
  });

  it("marks every occurrence, whatever the case", () => {
    const runs = splitOnForm("Kohv on kohv.", "kohv");
    expect(runs.filter((r) => r.match).map((r) => r.text)).toEqual(["Kohv", "kohv"]);
  });

  it("returns the whole sentence unmarked when there is no form to mark", () => {
    expect(splitOnForm("Ilm on ilus.", null)).toEqual([{ text: "Ilm on ilus.", match: false }]);
  });

  it("treats a form with regex characters in it as text", () => {
    expect(splitOnForm("Üle-eestiline võistlus.", "üle-eestiline")).toEqual([
      { text: "Üle-eestiline", match: true },
      { text: " võistlus.", match: false },
    ]);
  });
});

/*
  THE WHOLE SHIPPED DICTIONARY, EVERY LEVEL, AND EVERY PATH A LEARNER
  ACTUALLY REACHES.

  The two faults above (poeg's compound, sellepärast's ellipsis) were each
  found and fixed by reading the course harvest alone, which is 1,453 of the
  dictionary's 6,816 entries. `flash.ts`, the government drill and the
  grammar reference's case examples each call `sentenceContaining` directly,
  with nothing downstream to catch either fault, so fixing `teachingSentence`
  alone would have left four screens still exposed. Both faults are refused
  inside `usableExamples` itself now, which is the one function every one of
  those paths already calls, so this sweep drives all of them rather than
  trusting that fixing the screen that was reported fixed the others too.

  Hermetic. It reads the two files `npm run db:seed` loads and nothing else.
*/
describe("the whole shipped dictionary's example sentences", () => {
  it("never hands sentenceContaining, or teachingSentence in either configuration, a broken usage", async () => {
    const { readFileSync } = await import("node:fs");
    const { HARVESTED } = await import("../../prisma/data/harvested");
    const { naturalSentence, nominalOpener } = await import("../estonian/cloze");

    interface ExpandedEntry {
      lemma: string;
      pos: string;
      examples: { et: string; en?: string | null }[];
    }
    const EXPANDED: ExpandedEntry[] = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8"));
    expect(EXPANDED.length).toBeGreaterThan(4000); // a floor against a broken read

    const words: { lemma: string; pos: string; usages: string[] }[] = [
      ...HARVESTED.map((w) => ({ lemma: w.lemma, pos: w.pos, usages: [...w.usages] })),
      ...EXPANDED.map((e) => ({ lemma: e.lemma, pos: e.pos, usages: e.examples.map((ex) => ex.et) })),
    ];

    for (const word of words) {
      const examples = word.usages.map((et) => ek(et));

      const noPos = teachingSentence(examples, [word.lemma]);
      if (noPos) expect(naturalSentence(noPos.example.et), `${word.lemma}: "${noPos.example.et}"`).toBe(true);

      const opener = nominalOpener(word.pos, [word.lemma]);
      const withPos = teachingSentence(examples, [word.lemma], opener);
      if (withPos) {
        expect(naturalSentence(withPos.example.et, opener), `${word.lemma}: "${withPos.example.et}"`).toBe(true);
      }

      // The path flash.ts, the government drill and caseExamples.ts actually
      // take: sentenceContaining with no downstream filter of their own.
      const direct = sentenceContaining(examples, word.lemma);
      if (direct) expect(naturalSentence(direct.et), `${word.lemma}: "${direct.et}"`).toBe(true);
    }
  });
});
