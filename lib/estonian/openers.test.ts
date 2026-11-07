import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildRound, englishFor, formsFor, markPick, markTyped, MIXED_STAGE, OPENER_SLOTS, OPENER_WORDS,
  OPENERS, openersIn, openerSlot, STAGES, suits, wantingInstead, type OpenerWord,
  OPENER_VERBS, trackOf, VERB_MIXED_STAGE, VERB_STAGES, WORDS_PER_ROUND,
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
    expect(openersIn(MIXED_STAGE).length).toBe(OPENERS.filter((o) => trackOf(o) === "noun").length);
    for (const s of VERB_STAGES.filter((s) => s.n < VERB_MIXED_STAGE)) expect(openersIn(s.n, "verb").length).toBeGreaterThanOrEqual(4);
    expect(openersIn(VERB_MIXED_STAGE, "verb").length).toBe(OPENERS.filter((o) => trackOf(o) === "verb").length);
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
    const lemmas = new Set([...OPENER_WORDS.map((w) => w.lemma), ...OPENER_VERBS.map((v) => v.lemma)]);
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

describe("the copy a learner reads", () => {
  const sentences = (text: string) =>
    text.split(/(?<=[.!?])\s+/).map((x) => x.trim().toLowerCase().replace(/[^\p{L}\s]/gu, "")).filter(Boolean);

  /**
   * Whether a text says one thing twice: a quoted phrase used twice, or two
   * sentences most of whose words are shared. The first version of this
   * compared sentences for equality and would have passed the very defect it
   * was written for, where the second sentence only restated the first.
   */
  const repeats = (text: string): boolean => {
    const quoted = [...text.matchAll(/\u201c([^\u201d]+)\u201d/g)].map((m) => m[1]!.toLowerCase());
    if (new Set(quoted).size !== quoted.length) return true;
    const parts = sentences(text).map((x) => new Set(x.split(/\s+/)));
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i]!, b = parts[j]!;
      const shared = [...a].filter((w) => b.has(w)).length;
      if (shared / Math.min(a.size, b.size) >= 0.75) return true;
    }
    return false;
  };

  it("knows a repeat when it sees one", () => {
    expect(repeats("Something you are after takes the \u201csome of it\u201d ending. The thing takes the \u201csome of it\u201d ending.")).toBe(true);
    expect(repeats("After a no, the thing takes the ending. After a no, the thing takes the ending.")).toBe(true);
    expect(repeats("Things you are after take the \u201csome of them\u201d ending.")).toBe(false);
  });

  it("never says one thing twice in an explanation or an English line", () => {
    let walked = 0;
    for (const o of OPENERS) {
      for (const text of [o.why, o.en]) {
        walked += sentences(text).length;
        expect(repeats(text), `${o.id}: ${text}`).toBe(false);
      }
    }
    expect(walked).toBeGreaterThan(OPENERS.length);
  });

  it("gives an explanation that agrees with the ending the opener wants", () => {
    for (const o of OPENERS) {
      if (o.ending === "ma") expect(o.why, o.id).toMatch(/ma-tegevusnimi \(-ma\)/);
      else if (o.ending === "da") expect(o.why, o.id).toMatch(/da-tegevusnimi \(-da\)/);
      else if (o.ending === "plain") expect(o.why, o.id).toMatch(/dictionary form/);
      else expect(o.why, o.id).toMatch(/some of (it|them)/);
    }
  });

  it("says a plural row in the plural and a singular row in the singular", () => {
    for (const o of OPENERS) {
      if (o.number === "pl") expect(o.why, o.id).not.toMatch(/some of it/);
      if (o.number === "sg") expect(o.why, o.id).not.toMatch(/some of them|plural/);
    }
  });

  it("puts no past form in a stage that is not the past, and no stage 4 opener outside it", () => {
    const past = new Set(["wanted", "notwanted", "had", "hadnot", "liked"]);
    for (const o of OPENERS) expect(o.stage === 4, o.id).toBe(past.has(o.id));
  });

  it("never names a gender for a pronoun that has none", () => {
    for (const o of OPENERS) if (/^(Tal|Ta) /.test(o.text)) expect(o.en, o.id).not.toMatch(/^She /);
  });

  it("uses one quote style and no dash", () => {
    for (const o of OPENERS) for (const text of [o.why, o.en]) {
      expect(text, o.id).not.toMatch(/['"]/);
      expect(text, o.id).not.toMatch(/[\u2013\u2014]/);
    }
  });
});

/** The verbs as the seed stores them: both infinitives are stored principal parts. */
const verbs: OpenerWord[] = OPENER_VERBS.flatMap((spec) => {
  const entry = shipped.find((e) => e.lemma === spec.lemma && e.pos === "VERB");
  if (!entry) return [];
  const f = (t: string) => entry.forms.find((x) => x.formType === t)?.value ?? null;
  const da = f("INF_DA");
  if (!da) return [];
  return [{
    kind: "verb" as const, lemma: spec.lemma, en: spec.base, a: spec.to, the: spec.ing, pl: spec.ing,
    lexemeId: spec.lemma, nom: f("INF_MA") ?? spec.lemma, part: da, nomPl: null, partPl: null,
  }];
});

describe("the verb lane", () => {
  it("finds both infinitives of nearly every verb it names in the shipped dictionary", () => {
    expect(verbs.length).toBeGreaterThanOrEqual(OPENER_VERBS.length - 2);
  });

  it("answers -ma openers with the -ma form and -da openers with the -da form, never a noun", () => {
    let asked = 0;
    for (const s of VERB_STAGES) {
      const round = buildRound(s.n, [...verbs, ...words], keep, 8, "verb");
      expect(round.length, `verb stage ${s.n}`).toBe(8);
      for (const q of round) {
        const w = verbs.find((v) => v.lemma === q.lemma)!;
        expect(w, q.lemma).toBeTruthy();
        expect(q.answer).toBe(q.ending === "ma" ? w.nom : w.part);
        expect(q.other).toBe(q.ending === "ma" ? w.part : w.nom);
        asked++;
      }
    }
    expect(asked).toBeGreaterThan(0);
  });

  it("builds a stage round on two verbs, and never puts a verb after a noun opener", () => {
    const round = buildRound(1, verbs, keep, 8, "verb");
    expect(new Set(round.map((q) => q.lemma)).size).toBe(WORDS_PER_ROUND.verb);
    for (const s of STAGES) expect(buildRound(s.n, verbs, keep).length, `noun stage ${s.n}`).toBe(0);
  });

  it("points a wrong verb form at a verb opener", () => {
    let checked = 0;
    for (const o of OPENERS.filter((o) => trackOf(o) === "verb")) {
      const other = wantingInstead(o, o.stage);
      expect(other && trackOf(other), o.id).toBe("verb");
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
