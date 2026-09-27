import { describe, expect, it } from "vitest";

import { LEVELS } from "@/lib/collections/syllabus";
import { PROGRAMMES } from "./index";
import { creditedThrough, heldLevel, levelAfter, levelBefore, startingLevel } from "./placement";

/*
  WHERE A NAMED LEVEL OPENS THE COURSE.

  The report this answers: somebody chose B1 at sign-up, aiming for B2, and
  was handed B1.1. A level somebody names describes what they can already do,
  so the course opens past it, and every case below is one of the things a
  learner can tell first run.
*/
describe("the level the course opens on", () => {
  it("is the level above the one they hold", () => {
    expect(startingLevel("A2", null)).toBe("B1");
    expect(startingLevel("B1", "B2")).toBe("B2");
    expect(startingLevel("B1", "C1")).toBe("B2");
    expect(startingLevel("B2", null)).toBe("C1");
  });

  it("is the level they hold when that is the one they are aiming at", () => {
    // B1 aiming at the B1 examination: roughly there, and wanting it solid.
    expect(startingLevel("B1", "B1")).toBe("B1");
    expect(startingLevel("A2", "A2")).toBe("A2");
  });

  it("does not walk anybody down to a target below what they hold", () => {
    expect(startingLevel("B2", "B1")).toBe("C1");
  });

  it("is the first part of A1 for somebody who holds nothing yet", () => {
    expect(startingLevel(null, null)).toBe("A1");
    expect(startingLevel(null, "B1")).toBe("A1");
  });

  it("is the top of the ladder for somebody who holds the top of it", () => {
    expect(startingLevel("C1", null)).toBe("C1");
    expect(startingLevel("C1", "C1")).toBe("C1");
  });

  it("always names a level the ladder has a part for", () => {
    const held = [null, ...LEVELS];
    const targets = [null, ...LEVELS];
    let asked = 0;
    for (const h of held) {
      for (const t of targets) {
        const level = startingLevel(h, t);
        expect(PROGRAMMES.some((p) => p.level === level)).toBe(true);
        asked += 1;
      }
    }
    expect(asked).toBe(36);
  });
});

describe("what somebody holds", () => {
  it("is nothing for the beginner's chip, and a band for a paper that passed one", () => {
    // "Just starting" stores A1, and a beginner holds nothing yet.
    expect(heldLevel({ kind: "declared", level: "A1" })).toBeNull();
    // A check that passed A1 is a band somebody has.
    expect(heldLevel({ kind: "measured", level: "A1" })).toBe("A1");
    expect(heldLevel({ kind: "declared", level: "B1" })).toBe("B1");
  });

  it("is nothing under A1 and nothing where nobody has said", () => {
    expect(heldLevel({ kind: "measured", level: "pre-A1" })).toBeNull();
    expect(heldLevel(null)).toBeNull();
  });
});

describe("the neighbours of a level", () => {
  it("stop at the two ends of the ladder", () => {
    expect(levelAfter("C1")).toBeUndefined();
    expect(levelBefore("A1")).toBeUndefined();
    expect(levelAfter("B1")).toBe("B2");
    expect(levelBefore("B1")).toBe("A2");
  });

  it("read the same list the syllabus does", () => {
    // The module carries no list of its own, so a sixth level reaches it.
    expect(LEVELS.map((l) => levelAfter(l)).filter(Boolean)).toEqual(LEVELS.slice(1));
  });
});

describe("what the climb counts", () => {
  it("never reaches the level the course is teaching", () => {
    for (const held of LEVELS) {
      for (const working of LEVELS) {
        const through = creditedThrough(held, working);
        if (through !== null) expect(LEVELS.indexOf(through)).toBeLessThan(LEVELS.indexOf(working));
      }
    }
  });
});
