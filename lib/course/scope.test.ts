import { describe, expect, it } from "vitest";
import { PROGRAMMES } from "./index";
import { reviewable, scopeFor } from "./scope";
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
