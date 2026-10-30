import { describe, expect, it } from "vitest";
import { personForms, type Person } from "@/lib/estonian/conjugate";
import { tr } from "@/lib/copy/locale";
import { NOTES, fixItem, markPhrase, markRework, reworkItem, type PracticeItem } from "./practice";
import { sameSentence, type Persons } from "./sameSentence";
import { LESSONS } from "./index";
import { ledgersBefore, lessonRank, teach } from "./ledger";
import { lessonOrders, type OrderContext } from "@/lib/estonian/wordOrder";

/*
  THE VERDICT TABLE. Every row is a sentence a lesson could have written, what
  a learner typed, and the verdict the owner decided it gets: a pronoun's long
  or short spelling is right, a first- or second-person subject left out or put
  in beside a verb that agrees is right, a reason or condition moved to the
  other end is right, an order the dictionary vouches for is right, the same
  words in an order nothing can vouch for are nearly, and everything else is
  wrong. Each rule was argued once and is held here rather than reargued.
*/

/**
 * Which person each form of these verbs is, for the table's own sentences,
 * which no lesson teaches. The lessons' sentences below are read by the real
 * `personsFor` against the real ledger, and so is `marking.test.ts`.
 */
function persons(...verbs: readonly (readonly [lemma: string, first: string, past?: string])[]): Persons {
  const out: Record<string, Person[]> = {};
  for (const [lemma, first, past] of verbs) {
    for (const f of personForms({ lemma, pres1sg: first, past1sg: past ?? null })) {
      out[f.value] = [...new Set([...(out[f.value] ?? []), ...f.persons])];
    }
  }
  return out;
}

const VERBS = persons(
  ["lugema", "loen", "lugesin"], ["minema", "lähen", "läksin"], ["jääma", "jään", "jäin"], ["olema", "olen", "olin"],
  ["sorteerima", "sorteerin", "sorteerisin"], ["tahtma", "tahan", "tahtsin"], ["saama", "saan", "sain"],
  ["nägema", "näen", "nägin"], ["ostma", "ostan", "ostsin"], ["tegema", "teen", "tegin"], ["minema", "lähen"],
);

/** A reading of these test sentences the way `orderContextFor` reads the dictionary: which words are verbs. */
const FINITE = new Set([...Object.keys(VERBS), "sadas", "oli", "tuleb", "tuli", "sõi", "sõidab", "on", "teed"]);
const PLAIN = new Set(["ma", "mina", "sa", "ta", "tema", "see", "film", "lõpp", "igav", "hea", "auto", "vana", "koju", "raamatut", "raamatu", "kohvi"]);
const CTX: OrderContext = { finiteVerb: (w) => FINITE.has(w.toLowerCase()), participle: () => false, plainWord: (w) => PLAIN.has(w.toLowerCase()) };

const rework = (accept: readonly string[], from = "Vana lause.", ask = "Change it.", orders?: readonly string[]): Extract<PracticeItem, { kind: "rework" }> => ({
  kind: "rework", from: { et: from, en: "" }, ask, answer: accept[0]!, answerEn: "", accept,
  opens: /Start with \{([^{}]+)\}/.exec(ask)?.[1] ?? null, persons: VERBS,
  orders: orders ?? accept.flatMap((a) => lessonOrders(a, CTX)),
});

type Row = readonly [accept: string, typed: string, verdict: "right" | "nearly" | "wrong", note: keyof typeof NOTES];

const ROWS: readonly Row[] = [
  // Word for word.
  ["Ma lugesin raamatu läbi.", "ma lugesin raamatu läbi", "right", "right"],
  ["Ma ei ole nõus.", "Ma pole nõus.", "right", "right"],
  ["Ma ei olnud kodus.", "Ma polnud kodus.", "right", "right"],
  // The pronoun's long and short spelling are one word (D1).
  ["Ma lugesin raamatu läbi.", "Mina lugesin raamatu läbi.", "right", "right"],
  ["Mul on kiire.", "Minul on kiire.", "right", "right"],
  ["Ta tuli koju.", "Tema tuli koju.", "right", "right"],
  // Marks folded away.
  ["Ma lugesin raamatu läbi.", "Ma lugesin raamatu labi.", "nearly", "marks"],
  ["Ma ei ole nõus.", "Ma pole nous.", "nearly", "marks"],
  // A first- or second-person subject left out or put in, beside a verb that agrees.
  ["Ma lugesin raamatu läbi.", "Lugesin raamatu läbi.", "right", "pronoun"],
  ["Lugesin raamatu läbi.", "Ma lugesin raamatu läbi.", "right", "pronoun"],
  ["Sorteerime prügi, et loodust hoida.", "Me sorteerime prügi, et loodust hoida.", "right", "pronoun"],
  ["Homme lähen ma koju.", "Homme lähen koju.", "right", "pronoun"],
  ["Ma tahaks kohvi.", "Tahaks kohvi.", "right", "pronoun"],
  // A pronoun that does not agree with any verb beside it is another sentence.
  ["Sorteerime prügi, et loodust hoida.", "Ma sorteerime prügi, et loodust hoida.", "wrong", "notQuite"],
  ["Lugesin raamatu läbi.", "Sa lugesin raamatu läbi.", "wrong", "notQuite"],
  ["Lugesin raamatu läbi.", "Ma ma lugesin raamatu läbi.", "wrong", "notQuite"],
  // A possessive is not a subject.
  ["Ma nägin teie maja.", "Ma nägin maja.", "wrong", "notQuite"],
  // A third person is kept, and a negative is every person.
  ["Tema sõi õunu.", "Sõi õunu.", "wrong", "notQuite"],
  ["Ma ei ostnud mune.", "Ei ostnud mune.", "wrong", "notQuite"],
  // A reason moved to the other end (D3), the main clause as it was or inverted.
  ["Jäin koju, kuna sadas.", "Kuna sadas, jäin koju.", "right", "otherOrder"],
  ["Ma jäin koju, kuna sadas.", "Kuna sadas, jäin ma koju.", "right", "otherOrder"],
  ["Ma jäin koju, kuna sadas.", "Kuna sadas, ma jäin koju.", "right", "otherOrder"],
  ["Kuigi film oli igav, oli lõpp hea.", "Lõpp oli hea, kuigi film oli igav.", "right", "otherOrder"],
  ["Kui ma jõudsin, oli buss juba läinud.", "Buss oli juba läinud, kui ma jõudsin.", "nearly", "orderUnchecked"],
  // Halves swapped across a kuigi are a different sentence.
  ["Kuigi film oli igav, oli lõpp hea.", "Kuigi lõpp oli hea, oli film igav.", "wrong", "notQuite"],
  // The same words in an order nothing here can vouch for (D2: nearly, saying so).
  ["Ma lugesin raamatu läbi.", "Raamatu lugesin ma läbi.", "nearly", "orderUnchecked"],
  ["Ma ei ostnud mune.", "Mune ma ei ostnud.", "nearly", "orderUnchecked"],
  ["Mida sa homme teed?", "Mida sa teed homme?", "nearly", "orderUnchecked"],
  ["Ma tean, et ta homme tuleb.", "Ma tean, et homme ta tuleb.", "nearly", "orderUnchecked"],
  ["Me läheme homme koju.", "Homme läheme koju.", "nearly", "orderUnchecked"],
  // ...with a mark dropped too.
  ["Ma lugesin raamatu läbi.", "Raamatu lugesin ma labi.", "nearly", "orderMarks"],
  // A missing comma is never stricter than the comma there.
  ["Ma tean, et ta homme tuleb.", "Ma tean et ta homme tuleb.", "right", "right"],
  // What stays put: ei before its verb, a question word or kas first, a clause-opening ära.
  ["Ma ei ostnud mune.", "Ma ostnud ei mune.", "wrong", "notQuite"],
  ["Kas sa saaksid mind aidata?", "Sa kas saaksid mind aidata?", "wrong", "notQuite"],
  ["Ära mine sinna!", "Mine ära sinna!", "wrong", "notQuite"],
  // Across a comma or a relative, the words of one clause are not another's.
  ["Ma arvan, see on hea.", "See arvan, ma on hea.", "wrong", "notQuite"],
  // One letter is the whole point in a sentence, so it is never a slip.
  ["Ma lugesin raamatu läbi.", "Ma lugesin raamatut läbi.", "wrong", "notQuite"],
  ["Ma lugesin raamatu läbi.", "Raamatut lugesin ma läbi.", "wrong", "notQuite"],
  ["Ma käisin poest läbi.", "Ma käisin poes läbi.", "wrong", "notQuite"],
];

describe("the verdict table", () => {
  for (const [accept, typed, verdict, note] of ROWS) {
    it(`${typed} against ${accept}: ${verdict}`, () => {
      const mark = markRework(typed, rework([accept]));
      expect([mark.verdict, mark.note]).toEqual([verdict, NOTES[note]]);
    });
  }

  it("takes an order the dictionary vouches for as right", () => {
    const item = rework(["Ma loen täna raamatut."], "Vana lause.", "Change it.", ["Täna ma loen raamatut.", "Ma loen raamatut täna."]);
    expect(markRework("Ma loen raamatut täna.", item)).toMatchObject({ verdict: "right", note: NOTES.otherOrder });
    expect(markRework("Ma loen raamatut tana.", item)).toMatchObject({ verdict: "nearly", note: NOTES.orderMarks });
  });

  it("holds a sentence to the start its ask names", () => {
    const item = rework(["Ma ei leidnud rahakotti bussist."], "Ma leidsin rahakoti bussist.", "Say you didn't. Start with {Ma ei}.");
    expect(item.opens).toBe("Ma ei");
    expect(markRework("Ma ei leidnud rahakotti bussist.", item).verdict).toBe("right");
    expect(markRework("Rahakotti ma ei leidnud bussist.", item)).toMatchObject({ verdict: "nearly", note: NOTES.opens });
  });

  it("calls the sentence typed back unchanged what it is, however it is reordered or spelled", () => {
    const item = rework(["Ma lugesin raamatu läbi."], "Ma lugesin raamatut.");
    expect(markRework("Ma lugesin raamatut.", item).note).toBe(NOTES.asItWas);
    expect(markRework("Raamatut ma lugesin.", item).note).toBe(NOTES.asItWas);
    expect(markRework("Ma lugesin raamatut", item).note).toBe(NOTES.asItWas);
  });
});

describe("a typed word or phrase", () => {
  it("lets a joining word stand between two answers and never on the end", () => {
    expect(markPhrase("sa olid ja nad olid", ["sa olid nad olid"]).verdict).toBe("right");
    expect(markPhrase("ja palun", ["palun"]).verdict).not.toBe("right");
    expect(markPhrase("palun ja", ["palun"]).verdict).not.toBe("right");
  });

  it("forgives one letter only on one long word, never on a short one in a sentence", () => {
    expect(markPhrase("kohtumisle", ["kohtumisele"]).verdict).toBe("nearly");
    expect(markPhrase("Ma käisin poes", ["Ma käisin poest"]).verdict).toBe("wrong");
    expect(markPhrase("Ma lähen kooli", ["Ma lähen koolis"]).verdict).toBe("wrong");
    expect(markPhrase("Ma lähen kohtumisle", ["Ma lähen kohtumisele"]).verdict).toBe("nearly");
  });
});

describe("every note", () => {
  it("is in Russian and Ukrainian", () => {
    const missing = Object.values(NOTES).flatMap((note) =>
      (["ru", "uk"] as const).filter((locale) => tr(locale, note) === note).map((locale) => `${locale}: ${note}`));
    expect(missing).toEqual([]);
  });
});

describe("the lessons' own sentences, through the marker", () => {
  // Read the way a lesson reads them: everything taught by the lesson's end, through the real `personsFor`.
  const before = ledgersBefore(LESSONS);
  const items = LESSONS.flatMap((lesson) => {
    const taught = teach(before.get(lesson.id)!, lesson.teaches, lessonRank(lesson), lesson.patterns);
    return [
      ...(lesson.reworks ?? []).map((r) => ({ lesson: lesson.id, item: reworkItem(r, taught) as Extract<PracticeItem, { kind: "rework" | "fix" }> })),
      ...(lesson.fixes ?? []).map((f) => ({ lesson: lesson.id, item: fixItem(f, taught) as Extract<PracticeItem, { kind: "rework" | "fix" }> })),
    ];
  });

  it("has sentences to mark", () => {
    expect(items.length).toBeGreaterThan(200);
  });

  it("marks every accepted sentence right, and the sentence it starts from as it was", () => {
    const wrong = items.flatMap(({ lesson, item }) => [
      ...item.accept.filter((a) => markRework(a, item).verdict !== "right").map((a) => `${lesson}: ${a}`),
      ...[item.kind === "fix" ? item.shown : item.from.et].filter((s) => markRework(s, item).verdict !== "wrong").map((s) => `${lesson}: from ${s}`),
    ]);
    expect(wrong).toEqual([]);
  });

  it("never reads a sentence's starting point as one of its answers said another way", () => {
    const same = items.flatMap(({ lesson, item }) => {
      const from = item.kind === "fix" ? item.shown : item.from.et;
      return item.accept.filter((a) => sameSentence(a, from, item.persons) !== null).map((a) => `${lesson}: ${from} / ${a}`);
    });
    expect(same).toEqual([]);
  });
});
