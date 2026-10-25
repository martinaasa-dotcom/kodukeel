import { describe, expect, it } from "vitest";

import { LEVELS } from "@/lib/collections/syllabus";
import { PROGRAMMES } from "./index";
import {
  creditedThrough, declaredFrom, goOverAgain, HELD_CHOICES, heldFromChoice, heldLevel, isHeldChoice, levelAfter,
  levelBefore, levelHeldOnHandOff, opensOn, startingLevel,
} from "./placement";

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
  it("is nothing for A0, and the level itself for every other choice, declared or measured", () => {
    // "Just starting" is A0, and a beginner holds nothing yet.
    expect(heldLevel({ kind: "declared", level: "A0" })).toBeNull();
    // A1 is a level held whoever says so, which is what makes A2 reachable.
    expect(heldLevel({ kind: "declared", level: "A1" })).toBe("A1");
    expect(heldLevel({ kind: "measured", level: "A1" })).toBe("A1");
    expect(heldLevel({ kind: "declared", level: "B1" })).toBe("B1");
  });

  it("is nothing under A1 and nothing where nobody has said", () => {
    expect(heldLevel({ kind: "measured", level: "pre-A1" })).toBeNull();
    expect(heldLevel(null)).toBeNull();
  });
});

describe("the choices somebody can make", () => {
  it("are A0 and then the ladder, and every one opens on the level after it", () => {
    expect(HELD_CHOICES).toEqual(["A0", ...LEVELS]);
    expect(HELD_CHOICES.map((c) => opensOn(c, null))).toEqual(["A1", "A2", "B1", "B2", "C1", "C1"]);
    expect(heldFromChoice("A0")).toBeNull();
    expect(isHeldChoice("A0")).toBe(true);
    expect(isHeldChoice("pre-A1")).toBe(false);
  });

  it("put every level of the ladder in reach of some choice", () => {
    // The fault this answers: no chip opened A2.
    const reached = new Set(HELD_CHOICES.map((c) => opensOn(c, null)));
    for (const level of LEVELS) expect(reached.has(level)).toBe(true);
  });

  it("offer the level held again only where it is not already where the course opens", () => {
    expect(goOverAgain("B1", null)).toBe("B1");
    expect(goOverAgain("A1", "B2")).toBe("A1");
    expect(goOverAgain(null, null)).toBeNull();
    // Aiming at the level held already opens on it.
    expect(goOverAgain("B1", "B1")).toBeNull();
    // The top of the ladder opens on C1 anyway.
    expect(goOverAgain("C1", null)).toBeNull();
  });
});

describe("a level stated before A0 existed", () => {
  it("reads an unmarked A1 as the beginner it was, and a marked one as A1 held", () => {
    // The old bottom chip stored A1 and meant "just starting".
    expect(declaredFrom("A1", null)).toBe("A0");
    expect(declaredFrom("A1", "held")).toBe("A1");
    // Every other level meant the level held all along.
    expect(declaredFrom("B1", null)).toBe("B1");
    expect(declaredFrom("A0", "held")).toBe("A0");
    expect(declaredFrom("pre-A1", "held")).toBeNull();
    expect(declaredFrom(null, null)).toBeNull();
  });
});

describe("the neighbors of a level", () => {
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

describe("what walking out of a level says somebody holds", () => {
  it("holds the level they walked out of, once they cross into the next", () => {
    expect(levelHeldOnHandOff("A2", "B1", null)).toBe("A2");
    expect(levelHeldOnHandOff("B2", "C1", "A2")).toBe("B2");
  });

  it("writes nothing inside a level, going down, or for a jump of more than one", () => {
    expect(levelHeldOnHandOff("B1", "B1", null)).toBeNull();
    expect(levelHeldOnHandOff("B1", "A2", null)).toBeNull();
    expect(levelHeldOnHandOff("A2", "B2", null)).toBeNull();
  });

  it("never lowers what they already hold, and walking out of A1 is holding A1", () => {
    expect(levelHeldOnHandOff("A1", "A2", null)).toBe("A1");
    expect(levelHeldOnHandOff("A2", "B1", "B2")).toBeNull();
    expect(levelHeldOnHandOff("A2", "B1", "A2")).toBeNull();
    expect(levelHeldOnHandOff("A1", "A2", "A1")).toBeNull();
  });
});
