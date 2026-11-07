import { describe, expect, it } from "vitest";

import { ladderProgress, ladderWordsAt } from "./milestones";
import { eveningsAhead, gainLabel, goalReading, levelReading, pctLabel } from "./moduleDone";
import { PROGRAMMES } from "./index";

const titles = (level: string) => ({ title: level, arrival: `arriving at ${level}` });

describe("what today's module moved", () => {
  it("reads a level by its own checked words, and today's gain off them", () => {
    const words = ladderWordsAt("A2");
    const ladder = ladderProgress("B1", { A1: 0, A2: 100 }, titles, null);
    const a2 = ladder.milestones.find((m) => m.level === "A2")!;
    const read = levelReading(a2, 10);
    expect(read.counted).toBe(100);
    expect(read.pct).toBeCloseTo((100 / words) * 100);
    expect(read.before).toBeCloseTo((90 / words) * 100);
    expect(read.gain).toBeCloseTo((10 / words) * 100);
    expect(read.left).toBe(words - 100);
  });

  it("never claims more was gained today than the level has checked", () => {
    const ladder = ladderProgress("A2", { A1: 3 }, titles, null);
    const a1 = ladder.milestones.find((m) => m.level === "A1")!;
    expect(levelReading(a1, 50).gainedWords).toBe(3);
    expect(levelReading(a1, 50).before).toBe(0);
  });

  it("counts a credited level toward the goal, and today's gain there as no gain", () => {
    // Standing at B1, so A1 and A2 are credited whole: a word checked in A1
    // today moves A1's checked share, and the headline had already counted it.
    const ladder = ladderProgress("B2", { A1: 40, A2: 0, B1: 5 }, titles,
      { level: "B1", kind: "declared", through: "A2" });
    const read = goalReading(ladder, { A1: 40, B1: 5 });
    expect(read.gainedWords).toBe(5);
    expect(read.counted).toBe(ladder.credited);
    expect(read.pct).toBeCloseTo((ladder.credited / ladder.total) * 100);
    expect(read.before).toBeCloseTo(((ladder.credited - 5) / ladder.total) * 100);
  });
});

describe("how a percentage is printed", () => {
  it("never prints a hundred over a figure with something left in it", () => {
    expect(pctLabel(99.6)).toBe("99");
    expect(pctLabel(100)).toBe("100");
    expect(pctLabel(0.4)).toBe("0.4");
    expect(pctLabel(42.4)).toBe("42");
  });

  it("says nothing for no gain, and never +0", () => {
    expect(gainLabel(0)).toBeNull();
    expect(gainLabel(0.02)).toBe("+0.1");
    expect(gainLabel(0.84)).toBe("+0.8");
    expect(gainLabel(12.4)).toBe("+12");
  });
});

describe("what is still ahead", () => {
  it("walks the course from the part in play to the end of the level and the target", () => {
    const first = PROGRAMMES[0]!;
    const sameLevel = PROGRAMMES.filter((p) => p.level === first.level);
    const ahead = eveningsAhead(PROGRAMMES, first, 2, first.level);
    expect(ahead.inPart).toBe(first.days.length - 2);
    expect(ahead.partsLeftInLevel).toBe(sameLevel.length - 1);
    expect(ahead.inLevel).toBe(sameLevel.reduce((n, p) => n + p.days.length, 0) - 2);
    expect(ahead.toTarget).toBe(ahead.inLevel);
    expect(ahead.minutesInLevel).toBeGreaterThan(0);
  });

  it("has nothing to count toward a target already behind the learner", () => {
    const later = PROGRAMMES.find((p) => p.level === "B1")!;
    expect(eveningsAhead(PROGRAMMES, later, 0, "A2").toTarget).toBeNull();
  });
});
