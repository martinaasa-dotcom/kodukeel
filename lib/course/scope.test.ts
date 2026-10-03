import { describe, expect, it } from "vitest";
import { PROGRAMMES } from "./index";
import { byRecency, recentLemmas, reviewable, scopeFor, tonightFirst, tonightsCase } from "./scope";
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
  cardType: "RECOGNITION", targetCase: null, front: "tool", slot: null, source: "COURSE",
  lexeme: { lemma: "tool" }, ...over,
});

describe("reviewable", () => {
  it("asks no case card on any evening of A1, whoever chose the word", () => {
    let evenings = 0;
    for (const programme of a1) {
      for (const day of programme.days) {
        evenings += 1;
        const scope = scopeFor(programme, day);
        for (const source of ["COURSE", "MANUAL", "DICTIONARY"]) {
          for (const spec of CASES) {
            expect(reviewable(scope, card({
              cardType: "CASE_FORM", targetCase: spec.key, front: "tool → millele? kuhu?", source,
              lexeme: { lemma: scope.lemmas[0] ?? "tool" },
            }), new Set())).toBe(false);
          }
          // An old card that names its case on the front alone is read too.
          expect(reviewable(scope, card({ cardType: "CASE_FORM", front: "tool → allative", source }), new Set()))
            .toBe(false);
        }
      }
    }
    expect(a1.length).toBeGreaterThan(0);
    expect(evenings).toBeGreaterThan(20);
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

describe("tonight's case first", () => {
  it("weaves tonight's items through the front and keeps every item once", () => {
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
  /* A B1 evening's Match was tonight's three words and five A1 greetings. */
  const b1 = PROGRAMMES.find((p) => p.level === "B1")!;
  const day = b1.days[3]!;
  const scope = scopeFor(b1, day);

  it("leads with tonight's words and works back through the evenings before", () => {
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

