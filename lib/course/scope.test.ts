import { describe, expect, it } from "vitest";
import { PROGRAMMES, grammarThrough, pastsThrough, taughtThrough } from "./index";
import {
  byRecency, cardWithin, recentLemmas, reviewable, scopeFor, scopeSoFar, slotWithin, tonightFirst, tonightsCase,
} from "./scope";
import { FORMS_STEP, MEET_STEP, READ_STEP } from "./types";
import { caseFromFront } from "@/lib/copy/caseHint";
import { CASES } from "@/lib/estonian/cases";

/*
  REVIEW REPEATS WHAT THE MODULE HAS TAUGHT AND NOTHING ELSE.

  Reported off the second evening of A1: a deck built before the module asked
  `tool → allative`, a case no A1 evening reads, on the daily review. These
  hold the rule over every A1 evening rather than the one in the report.
*/
const a1 = PROGRAMMES.filter((p) => p.level === "A1");

const card = (over: Partial<Parameters<typeof reviewable>[1]>) => ({
  cardType: "RECOGNITION", targetCase: null, front: "tool", back: "tool", slot: null, source: "COURSE",
  lexeme: { lemma: "tool" }, ...over,
});

describe("reviewable", () => {
  /*
    A1 is the lessons, and a lesson may explain an ending (decision L1 in
    docs/43-lessons.md: the partitive, the -s that means in, -ga). A case card
    is asked only once a lesson has explained that case, whoever chose the word,
    and never before.
  */
  it("asks a case card in A1 only once a lesson has explained the case, whoever chose the word", () => {
    let evenings = 0;
    let asked = 0;
    for (const programme of a1) {
      for (const day of programme.days) {
        evenings += 1;
        const scope = scopeFor(programme, day);
        for (const source of ["COURSE", "MANUAL", "DICTIONARY"]) {
          for (const spec of CASES) {
            const ok = reviewable(scope, card({
              cardType: "CASE_FORM", targetCase: spec.key, front: "tool → millele? kuhu?", source,
              lexeme: { lemma: scope.lemmas[0] ?? "tool" },
            }), new Set());
            expect(ok).toBe(scope.cases.includes(spec.key));
            if (ok) asked += 1;
          }
        }
      }
    }
    expect(a1.length).toBeGreaterThan(0);
    expect(evenings).toBeGreaterThan(20);
    // The first evening explains no ending, so nothing is asked there.
    expect(scopeFor(a1[0]!, a1[0]!.days[0]!).cases).toEqual([]);
    expect(asked).toBeGreaterThan(0);
  });

  it("asks a word this app chose only once the module has taught it", () => {
    expect(a1.length).toBeGreaterThan(0);
    const programme = a1[0]!;
    const scope = scopeFor(programme, programme.days[1]!);
    const taught = scope.lemmas[0]!;
    expect(reviewable(scope, card({ lexeme: { lemma: taught } }), new Set())).toBe(true);
    expect(reviewable(scope, card({ lexeme: { lemma: "zzz-never-taught" } }), new Set())).toBe(false);
    // A word the learner went and got is theirs, in the meaning direction.
    expect(reviewable(scope, card({ source: "LOOKUP", lexeme: { lemma: "zzz-never-taught" } }), new Set()))
      .toBe(true);
  });

  it("refuses a case card it cannot place rather than waving it through", () => {
    const programme = a1[0]!;
    const scope = scopeFor(programme, programme.days[0]!);
    expect(reviewable(scope, card({ cardType: "CASE_FORM", front: "tool → ???" }), new Set())).toBe(false);
  });

  it("holds nobody who is not following the module", () => {
    expect(reviewable(null, card({ cardType: "CASE_FORM", front: "tool → allative" }), null)).toBe(true);
  });

  /*
    The card reported two days after its sentence was refused: a `Card` row keeps
    the front it was built with, so the refusal has to hold on the read, inside
    the module and out of it, or the card comes back due for ever.
  */
  it("never asks a card cut from a refused sentence, in the module or out of it", () => {
    const refused = card({
      cardType: "CASE_FORM", targetCase: "ELATIVE", front: "Haige on ____ nõrk.", back: "palavikust",
      lexeme: { lemma: "palavik" }, source: "MANUAL",
    });
    expect(reviewable(null, refused, null)).toBe(false);
    expect(cardWithin(null, refused, null)).toBe(false);
    // The same front with another answer is a different sentence and is asked.
    expect(reviewable(null, { ...refused, back: "külmast" }, null)).toBe(true);
  });
});

describe("caseFromFront", () => {
  it("reads a case off a bare front by any name it was written in", () => {
    let read = 0;
    for (const spec of CASES) {
      read += 1;
      expect(caseFromFront(`sõna → ${spec.en}`)).toBe(spec.key);
      expect(caseFromFront(`sõna → ${spec.et}`)).toBe(spec.key);
      expect(caseFromFront(`sõna → ${spec.question}`)).toBe(spec.key);
    }
    expect(read).toBe(CASES.length);
    expect(caseFromFront("tool")).toBeNull();
    expect(caseFromFront("lugema → olevik, ta")).toBeNull();
  });
});

describe("today's case first", () => {
  it("weaves today's items through the front and keeps every item once", () => {
    const items = ["a1", "b1", "a2", "b2", "b3"];
    const out = tonightFirst(items, (x) => x.startsWith("a"));
    expect(out.slice(0, 4)).toEqual(["a1", "b1", "a2", "b2"]);
    expect([...out].sort()).toEqual([...items].sort());
  });

  it("leads with tonight where the rest are first in the caller's order", () => {
    expect(tonightFirst(["x", "y", "t"], (v) => v === "t")).toEqual(["t", "x", "y"]);
    expect(tonightFirst(["x", "y"], (v) => v === "t")).toEqual(["x", "y"]);
  });

  it("names the case an evening reads, and nothing on an evening that reads none", () => {
    const withCase = PROGRAMMES.flatMap((p) => p.days.map((d) => ({ p, d }))).find(({ d }) => d.grammarCase)!;
    expect(tonightsCase(scopeFor(withCase.p, withCase.d))).toBe(withCase.d.grammarCase);
    const first = PROGRAMMES[0]!;
    expect(tonightsCase(scopeFor(first, first.days[0]!))).toBeNull();
    expect(tonightsCase(null)).toBeNull();
  });
});

describe("the words taught most recently", () => {
  /* A B1 evening's Match was today's three words and five A1 greetings. */
  const b1 = PROGRAMMES.find((p) => p.level === "B1")!;
  const day = b1.days[3]!;
  const scope = scopeFor(b1, day);

  it("leads with today's words and works back through the evenings before", () => {
    const recent = recentLemmas(scope, 20);
    expect(recent).toHaveLength(20);
    expect(recent.slice(0, day.words.length).sort()).toEqual([...day.words].sort());
    expect(recent).not.toContain("aitäh");
  });

  it("orders rows by how recently their word was taught, keeping the rest behind in order", () => {
    const [last, earlier] = [day.words.at(-1)!, b1.days[0]!.words[0]!];
    const rows = ["aitäh", earlier, "nobody", last].map((lemma) => ({ lemma }));
    expect(byRecency(scope, rows, (r) => r.lemma).map((r) => r.lemma)).toEqual([last, earlier, "aitäh", "nobody"]);
  });
});


/*
  WHAT THE EVENINGS HAVE TAUGHT SO FAR, FOR A SCREEN THE MODULE DID NOT OPEN.

  A learner who met today's words and went straight to Practice was handed
  a "Case Sprint" in the case today's page was about to teach. These hold
  the rule over every evening of the ladder rather than the one that was seen.
*/
describe("scopeSoFar", () => {
  const all = PROGRAMMES.flatMap((programme) => programme.days.map((day) => ({ programme, day })));

  it("counts today's case and topic only once the reading is ticked", () => {
    let reading = 0;
    for (const { programme, day } of all) {
      if (!day.grammarCase && !day.grammar) continue;
      const already = grammarThrough(programme, day.index - 1);
      const before = scopeSoFar(programme, day, new Set([MEET_STEP]), day.words);
      expect(tonightsCase(before), day.id).toBeNull();
      if (day.grammarCase && !already.cases.includes(day.grammarCase)) {
        reading += 1;
        expect(before.cases, day.id).not.toContain(day.grammarCase);
      }
      if (day.grammar && !already.topics.includes(day.grammar)) {
        reading += 1;
        expect(before.topics, day.id).not.toContain(day.grammar);
      }
      const after = scopeSoFar(programme, day, new Set([MEET_STEP, READ_STEP]), day.words);
      if (day.grammarCase) {
        expect(after.cases, day.id).toContain(day.grammarCase);
        expect(tonightsCase(after), day.id).toBe(day.grammarCase);
      }
      if (day.grammar) expect(after.topics, day.id).toContain(day.grammar);
    }
    expect(reading).toBeGreaterThan(10);
  });

  it("counts a word of today's only once the ladder has asked it", () => {
    const { programme, day } = all.find(({ day }) => day.index > 1 && day.words.length >= 3)!;
    const [first, ...rest] = day.words;
    const scope = scopeSoFar(programme, day, new Set(), [first!]);
    expect(scope.lemmas).toContain(first);
    for (const word of rest) expect(scope.lemmas).not.toContain(word);
    for (const word of taughtThrough(programme, day.index - 1)) expect(scope.lemmas).toContain(word);
    expect(recentLemmas(scope)[0]).toBe(first);
  });

  it("asks a verb's past only once today's forms step has shown it", () => {
    const shown = all.filter(({ day }) => (day.forms?.length ?? 0) > 0);
    expect(shown.length).toBeGreaterThan(10);
    let checked = 0;
    let byLesson = 0;
    for (const { programme, day } of shown) {
      for (const verb of day.forms!) {
        const read = new Set([MEET_STEP, READ_STEP]);
        const before = scopeSoFar(programme, day, read, day.words);
        // The polite imperative waits for this step whoever showed the past.
        expect(slotWithin(before, "ImpPrPl", verb), `${day.id} ${verb}`).toBe(false);
        const after = scopeSoFar(programme, day, new Set([...read, FORMS_STEP]), day.words);
        expect(after.formsShown, day.id).toContain(verb);
        if (pastsThrough(programme, day.index - 1).includes(verb)) { byLesson += 1; continue; }
        expect(slotWithin(before, "IndIpfSg1", verb), day.id).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
    // A verb a lesson showed the past of still reaches a forms step, for its `-ge` form.
    expect(byLesson).toBeGreaterThan(20);
  });

  it("holds the learner's own words, behind the course's in recency, and never twice", () => {
    const { programme, day } = all.find(({ day }) => day.index > 3)!;
    const course = taughtThrough(programme, day.index - 1)[0]!;
    const scope = scopeSoFar(programme, day, new Set(), [], ["zzownword", course]);
    expect(scope.lemmas).toContain("zzownword");
    expect(scope.lemmas.filter((w) => w === course)).toHaveLength(1);
    expect(scope.lemmas.indexOf("zzownword")).toBeLessThan(scope.lemmas.indexOf(course));
    expect(recentLemmas(scope, Number.MAX_SAFE_INTEGER).at(-1)).toBe("zzownword");
  });

  it("is the step's own scope once the whole evening is done", () => {
    for (const { programme, day } of all) {
      const done = new Set(day.steps.map((s) => s.id));
      const so = scopeSoFar(programme, day, done, day.words);
      const step = scopeFor(programme, day);
      expect(so.lemmas, day.id).toEqual(step.lemmas);
      expect(so.cases, day.id).toEqual(step.cases);
      expect(so.topics, day.id).toEqual(step.topics);
      expect(so.formsShown, day.id).toEqual(step.formsShown);
      expect(tonightsCase(so), day.id).toBe(tonightsCase(step));
    }
  });
});
