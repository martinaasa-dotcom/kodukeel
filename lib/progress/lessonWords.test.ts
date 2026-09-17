import { describe, expect, it } from "vitest";
import { taughtSpellings } from "./lessonWords";
import { SYLLABUS } from "@/lib/collections/syllabus";

const FORMS = new Map<string, ReadonlySet<string>>([
  ["tere", new Set(["tere"])],
  ["aitäh", new Set(["aitäh"])],
  ["komm", new Set(["komm", "kommi"])],
]);

describe("taughtSpellings", () => {
  const first = SYLLABUS[0]!;
  const second = SYLLABUS[1]!;

  it("knows nothing before the first unit but what that sitting has reached", () => {
    expect([...taughtSpellings(FORMS, first.id, [])]).toEqual([]);
    expect([...taughtSpellings(FORMS, first.id, ["tere"])]).toEqual(["tere"]);
  });

  /*
    THE CUT IS THE SITTING, NOT THE UNIT. Every unit in the course splits into
    more than one lesson, so crediting the whole unit would let lesson 1 gap a
    sentence holding a word lesson 3 introduces.
  */
  it("credits this unit only as far as the sitting being planned", () => {
    const reached = taughtSpellings(FORMS, first.id, ["tere"]);
    expect(reached.has("tere")).toBe(true);
    expect(reached.has("aitäh")).toBe(false);
  });

  it("credits an earlier unit whole", () => {
    const reached = taughtSpellings(FORMS, second.id, []);
    // `tere` and `aitäh` are both taught by the first unit of the course.
    expect(reached.has("tere")).toBe(true);
    expect(reached.has("aitäh")).toBe(true);
  });

  /*
    A unit nobody can place contributes nothing rather than everything: at A1
    that means no sentence exercise, which is the cautious failure.
  */
  it("says nothing about a unit it cannot place", () => {
    expect([...taughtSpellings(FORMS, "no-such-unit", [])]).toEqual([]);
  });

  it("carries every spelling of a word, not only its headword", () => {
    expect([...taughtSpellings(FORMS, first.id, ["komm"])].sort()).toEqual(["komm", "kommi"]);
  });
});
