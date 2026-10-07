import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildRound, englishFor, formsFor, markPick, markTyped, MIXED_STAGE, OPENER_SLOTS, OPENER_WORDS,
  OPENERS, openersIn, openerSlot, STAGES, suits, wantingInstead, type OpenerWord,
} from "./openers";
import { isKnownSlot, slotLabel } from "@/lib/srs/slots";

interface Entry { lemma: string; pos: string; forms: { formType: string; value: string }[] }
const shipped = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as Entry[];

/** The words as the seed stores them, which is what the page reads. */
const words: OpenerWord[] = OPENER_WORDS.flatMap((spec) => {
  const entry = shipped.find((e) => e.lemma === spec.lemma && e.pos === "NOUN");
  if (!entry) return [];
  const f = (t: string) => entry.forms.find((x) => x.formType === t)?.value ?? null;
  return [{ ...spec, lexemeId: spec.lemma, nom: f("NOM_SG") ?? spec.lemma, part: f("PART_SG")!, nomPl: f("NOM_PL"), partPl: f("PART_PL") }];
});
const keep = <T,>(xs: readonly T[]) => [...xs];

describe("the openers table", () => {
  it("has unique ids, a stage inside the ladder and a slot the log accepts", () => {
    expect(new Set(OPENERS.map((o) => o.id)).size).toBe(OPENERS.length);
    for (const o of OPENERS) {
      expect(o.stage).toBeGreaterThanOrEqual(1);
      expect(o.stage).toBeLessThan(MIXED_STAGE);
      expect(isKnownSlot(openerSlot(o.id))).toBe(true);
      expect(slotLabel(openerSlot(o.id))).toBe(o.text);
    }
    expect(OPENER_SLOTS.length).toBe(OPENERS.length);
    expect(isKnownSlot("OP_nothing")).toBe(false);
  });

  it("gives every stage something to ask, and no stage is the mixed one", () => {
    for (const s of STAGES.filter((s) => s.n < MIXED_STAGE)) expect(openersIn(s.n).length).toBeGreaterThanOrEqual(4);
    expect(openersIn(MIXED_STAGE).length).toBe(OPENERS.length);
  });

  it("names no case anywhere a learner reads", () => {
    const names = /\b(nominative|genitive|partitive|accusative|inessive|illative|allative|nimetav|omastav|osastav)\b/i;
    for (const o of OPENERS) {
      expect(o.why).not.toMatch(names);
      expect(o.en).not.toMatch(names);
    }
  });

  it("writes every English sentence from the word, with nothing left unfilled", () => {
    for (const o of OPENERS) for (const w of OPENER_WORDS) {
      expect(englishFor(w, o)).not.toMatch(/[{}]/);
    }
  });
});

describe("the words", () => {
  it("are all in the shipped dictionary with two different forms in each number", () => {
    expect(words.map((w) => w.lemma)).toEqual(OPENER_WORDS.map((w) => w.lemma));
    for (const w of words) {
      expect(w.nom.toLowerCase(), w.lemma).not.toBe(w.part.toLowerCase());
      expect(w.nomPl, w.lemma).toBeTruthy();
      expect(w.partPl, w.lemma).toBeTruthy();
      expect(w.nomPl!.toLowerCase(), w.lemma).not.toBe(w.partPl!.toLowerCase());
    }
  });

  it("restrict an opener only to words the table holds", () => {
    const lemmas = new Set(OPENER_WORDS.map((w) => w.lemma));
    for (const o of OPENERS) for (const l of o.only ?? []) expect(lemmas.has(l), `${o.id} names ${l}`).toBe(true);
  });
});

describe("formsFor", () => {
  const book = words.find((w) => w.lemma === "raamat")!;
  it("takes the stored forms, and swaps them for the opposite opener", () => {
    const want = OPENERS.find((o) => o.id === "want")!;
    const have = OPENERS.find((o) => o.id === "have")!;
    expect(formsFor(book, want)).toEqual({ answer: book.part, other: book.nom });
    expect(formsFor(book, have)).toEqual({ answer: book.nom, other: book.part });
  });
  it("uses the plural forms for a plural opener", () => {
    const pl = OPENERS.find((o) => o.id === "pl-want")!;
    expect(formsFor(book, pl)).toEqual({ answer: book.partPl, other: book.nomPl });
  });
  it("drops a word whose two forms are spelled alike", () => {
    const same: OpenerWord = { ...book, part: book.nom };
    expect(formsFor(same, OPENERS[0]!)).toBeNull();
  });
});

describe("buildRound", () => {
  const order = <T,>(xs: readonly T[]) => keep(xs);

  it("fills every stage, on one word, with the two forms of that word", () => {
    for (const s of STAGES.filter((s) => s.n < MIXED_STAGE)) {
      const round = buildRound(s.n, words, order);
      expect(round.length, `stage ${s.n}`).toBeGreaterThanOrEqual(4);
      expect(new Set(round.map((q) => q.lemma)).size, `stage ${s.n}`).toBe(1);
      for (const q of round) {
        expect(q.stage).toBe(s.n);
        expect(q.answer).not.toBe(q.other);
        expect(q.options).toContain(q.answer);
        expect(q.options).toContain(q.other);
      }
    }
  });

  it("only offers an opener a word suits", () => {
    for (const s of STAGES) {
      for (const q of buildRound(s.n, words, order)) {
        const opener = OPENERS.find((o) => o.id === q.id)!;
        expect(suits({ lemma: q.lemma }, opener)).toBe(true);
      }
    }
  });

  it("draws a fresh word for each question in the mixed stage", () => {
    const round = buildRound(MIXED_STAGE, words, (xs) => [...xs].reverse());
    expect(round.length).toBeGreaterThan(0);
    expect(round.length).toBeLessThanOrEqual(8);
  });

  it("builds nothing from nothing", () => {
    expect(buildRound(1, [], order)).toEqual([]);
  });
});

describe("where a wrong form would have been right", () => {
  it("points at an opener that wants the opposite ending", () => {
    for (const o of OPENERS) {
      const other = wantingInstead(o, o.stage);
      if (!other) continue;
      expect(other.ending).not.toBe(o.ending);
      expect(other.number).toBe(o.number);
    }
  });
});

describe("marking", () => {
  const book = words.find((w) => w.lemma === "raamat")!;
  const round = buildRound(1, [book], <T,>(xs: readonly T[]) => keep(xs));
  const want = round.find((q) => q.id === "want")!;
  const have = round.find((q) => q.id === "have")!;

  it("marks a pick against the stored form", () => {
    expect(markPick(want, want.answer).right).toBe(true);
    const miss = markPick(want, want.other);
    expect(miss.right).toBe(false);
    expect(miss.note).toContain(want.answer);
    expect(want.elsewhere).toBeTruthy();
    expect(miss.note).toContain(want.elsewhere!);
    expect(have.elsewhere).toBeTruthy();
  });

  it("marks a typed answer, and never reads the other ending as a slip", () => {
    expect(markTyped(want, ` ${want.answer} `).rating).toBe(3);
    const rival = markTyped(want, want.other);
    expect(rival.right).toBe(false);
    expect(rival.rating).toBe(1);
    expect(rival.wrote).toBe("other");
    expect(markTyped(want, "").right).toBe(false);
  });

  it("calls a dropped diacritic Hard", () => {
    const apple = words.find((w) => w.lemma === "õun")!;
    const q = buildRound(1, [apple], <T,>(xs: readonly T[]) => keep(xs)).find((x) => x.id === "want")!;
    const slip = markTyped(q, q.answer.replace("õ", "o"));
    expect(slip.rating).toBe(2);
    expect(slip.right).toBe(false);
  });
});
