import { describe, expect, it } from "vitest";

import {
  everyMilestoneTold,
  ladderProgress,
  ladderWordsAt,
  milestoneMark,
  milestoneOwed,
  milestonesTold,
  stopState,
  wordsLeftAt,
} from "./milestones";

const titles = (level: string) => ({ title: level, arrival: `arriving at ${level}` });
const stop = (progress: ReturnType<typeof ladderProgress>, level: string) =>
  progress.milestones.find((m) => m.level === level)!;

describe("how far the next stop is", () => {
  /*
    The weekly letter printed `total - known` under a sentence saying how far
    the *next stop* is, so somebody at A1 aiming for B1 read the distance to B1
    beside the word A2. The letter's whole value is that its numbers are
    specific and true, so a number that is confidently wrong is worse there
    than on a chart somebody can squint at.
  */
  it("counts what is left of that stop, not what is left of the climb", () => {
    const half = wordsLeftAt({ level: "A1", pct: 50, state: "here" });
    expect(half).toBe(Math.ceil(ladderWordsAt("A1") / 2));
    // And it is a fact about A1 alone: aiming further does not change it.
    expect(half).toBeLessThan(ladderWordsAt("A1") + ladderWordsAt("A2"));
  });

  it("is nought for a stop already behind them", () => {
    expect(wordsLeftAt({ level: "A1", pct: 100, state: "passed" })).toBe(0);
  });

  it("never says a stop they have not reached is nought words away", () => {
    // Rounding is what makes this reachable: 99.9 percent of a level floors to
    // zero, and "0 words away" from a stop that has not arrived reads as a bug.
    expect(wordsLeftAt({ level: "A1", pct: 99.99, state: "here" })).toBeGreaterThanOrEqual(1);
    expect(wordsLeftAt({ level: "A1", pct: 0, state: "ahead" })).toBe(ladderWordsAt("A1"));
  });

  it("is nought for a level credited from where they stand", () => {
    // A credited stop is behind them on the climb, so the letter's "next stop"
    // line may never name it. What is unchecked about it is a different
    // question and is asked of the stop's own `verified` and `words`.
    expect(wordsLeftAt({ level: "A1", pct: 3, state: "assumed" })).toBe(0);
  });
});

/*
  THE MORNING A B1 LEARNER ARRIVES.

  This is the fault the credit was built for, and it is worth driving rather
  than describing: somebody who told the app they are B1 opened Today, read
  "6% through A1" over a course that had correctly started them at B1.1, and
  reported the whole card as disconnected from reality. Every number on it was
  true about the review log and none of it was true about them.
*/
describe("a learner who did not start at the bottom", () => {
  const fresh = () => ladderProgress("B1", {}, titles, { level: "B1", kind: "declared" });

  it("counts the levels behind them rather than drawing them empty", () => {
    const climb = fresh();
    expect(stop(climb, "A1").state).toBe("assumed");
    expect(stop(climb, "A2").state).toBe("assumed");
    expect(climb.credited).toBe(ladderWordsAt("A1") + ladderWordsAt("A2"));
    expect(climb.pct).toBeGreaterThan(0);
  });

  it("stands them on their own level, not on the first hole in the log", () => {
    // The weekly letter reads `here` for its next-stop line, so this deciding
    // by verified words alone would post A1 to somebody working through B1.
    expect(fresh().here?.level).toBe("B1");
  });

  it("never reports an assumption as a check", () => {
    const climb = fresh();
    expect(climb.verified).toBe(0);
    expect(climb.verifiedPct).toBe(0);
    expect(climb.arrived).toBe(false);
    // And no stop is `passed`, which is what the milestone letter fires on:
    // a congratulation for a band somebody ticked in a dropdown.
    expect(climb.milestones.some((m) => m.state === "passed")).toBe(false);
  });

  it("turns an assumption into a check one word at a time", () => {
    const some = ladderProgress(
      "B1", { A1: 40 }, titles, { level: "B1", kind: "declared" },
    );
    expect(stop(some, "A1").verified).toBe(40);
    expect(stop(some, "A1").state).toBe("assumed");
    expect(some.verified).toBe(40);
    // The credited figure does not move with it: those words were already
    // counted, and a bar that grew as they were checked would be counting
    // each of them twice.
    expect(some.credited).toBe(fresh().credited);
  });

  it("lets a credited level pass outright once its words really are in hand", () => {
    const done = ladderProgress(
      "B1", { A1: ladderWordsAt("A1") }, titles, { level: "B1", kind: "declared" },
    );
    expect(stop(done, "A1").state).toBe("passed");
  });
});

/*
  THE WIDTHS ARE THE PICTURE, SO THEY ARE HELD HERE.

  The strip draws one block per level as wide as `share`, which is what lets it
  answer how far somebody has come from the start of A1 rather than only how
  many stops are left. Five equal fifths would say something false about the
  shape of the course, and a share that did not add up would draw a row with a
  gap in it that no reader could account for.
*/
describe("how wide a level is", () => {
  it("is that level's own portion of the climb", () => {
    const climb = ladderProgress("B1", {}, titles, null);
    const total = climb.milestones.reduce((n, m) => n + m.share, 0);
    expect(Math.round(total)).toBe(100);
    expect(stop(climb, "A1").share).toBeGreaterThan(stop(climb, "B1").share);
  });

  it("is a fact about the climb rather than about the learner", () => {
    const empty = ladderProgress("C1", {}, titles, null);
    const placed = ladderProgress("C1", { A1: 100 }, titles, { level: "B1", kind: "measured" });
    expect(placed.milestones.map((m) => m.share)).toEqual(empty.milestones.map((m) => m.share));
  });
});

describe("a learner nobody has placed", () => {
  it("credits nothing, which is what the bar did before any of this", () => {
    const climb = ladderProgress("B1", { A1: 12 }, titles, null);
    expect(climb.credited).toBe(climb.verified);
    expect(climb.milestones.some((m) => m.state === "assumed")).toBe(false);
    expect(climb.here?.level).toBe("A1");
  });
});

describe("a learner standing above the target they picked", () => {
  it("has a full bar and has not arrived", () => {
    // `arrived` turns the copy that says they know every word of the climb,
    // and an assumption cannot say that about anybody.
    const climb = ladderProgress("A2", {}, titles, { level: "B1", kind: "measured" });
    expect(climb.pct).toBe(100);
    expect(climb.arrived).toBe(false);
    expect(climb.here).toBeUndefined();
  });
});

/*
  WHAT HAS ALREADY BEEN SAID, AND THE LEVEL A HIGH-WATER MARK USED TO SWALLOW.

  The milestone letter is the one thing in this app about somebody's memory
  rather than their attendance, and there is no second chance at a level
  somebody passes once. Crediting the levels behind where they stand is what
  makes finishing out of order ordinary, so the mark has to survive it.
*/
describe("remembering which levels have been announced", () => {
  const passedThrough = (...levels: string[]) =>
    ladderProgress("B1", Object.fromEntries(
      levels.map((l) => [l, ladderWordsAt(l)]),
    ), titles, null).milestones;

  it("reads an old single-level mark as everything under it", () => {
    expect([...milestonesTold("A2")]).toEqual(["A1", "A2"]);
    expect([...milestonesTold("")]).toEqual([]);
    expect([...milestonesTold(null)]).toEqual([]);
  });

  it("reads a list as itself, since a level left out is one nobody was told", () => {
    expect([...milestonesTold("A2,B1")]).toEqual(["A2", "B1"]);
  });

  it("ignores a value nothing wrote", () => {
    expect([...milestonesTold("nonsense")]).toEqual([]);
    expect([...milestonesTold("A1,nonsense")]).toEqual(["A1"]);
  });

  it("owes the lowest passed level nobody has been told about", () => {
    const both = passedThrough("A1", "A2");
    expect(milestoneOwed(both, "")?.level).toBe("A1");
    expect(milestoneOwed(both, "A1")?.level).toBe("A2");
    expect(milestoneOwed(both, "A2")).toBe(null);
  });

  it("still owes a level finished after a higher one", () => {
    // The fault: A2 graduates first, its letter goes, and under a high-water
    // mark A1's letter could never be sent afterwards.
    const mark = milestoneMark("", "A2");
    expect(milestoneOwed(passedThrough("A2"), mark)).toBe(null);
    expect(milestoneOwed(passedThrough("A1", "A2"), mark)?.level).toBe("A1");
  });

  it("never announces a level twice", () => {
    let mark = "";
    const said: string[] = [];
    for (let run = 0; run < 5; run += 1) {
      const owed = milestoneOwed(passedThrough("A1", "A2"), mark);
      if (!owed) break;
      said.push(owed.level);
      mark = milestoneMark(mark, owed.level);
    }
    expect(said).toEqual(["A1", "A2"]);
  });

  it("knows when the whole climb has been announced", () => {
    expect(everyMilestoneTold("B1", "A2")).toBe(false);
    expect(everyMilestoneTold("B1", "B1")).toBe(true);
    expect(everyMilestoneTold("B1", "A1,B1")).toBe(false);
  });
});

describe("a level the ladder teaches no words for", () => {
  it("is not a level anybody passed", () => {
    // No data reaches this, which is why it is driven on the rule: a level
    // with no words has no share of itself to have finished, and reading that
    // as done would post a congratulation for a band nobody has touched.
    expect(stopState(0, 100, false)).toBe("ahead");
    expect(stopState(0, 100, true)).toBe("assumed");
    expect(stopState(0, 0, false)).toBe("ahead");
  });

  it("leaves every level the ladder really has alone", () => {
    expect(stopState(493, 100, false)).toBe("passed");
    expect(stopState(493, 100, true)).toBe("passed");
    expect(stopState(493, 99, true)).toBe("assumed");
    expect(stopState(493, 99, false)).toBe("ahead");
    for (const stop of ladderProgress("C1", {}, titles, null).milestones) {
      expect(stop.words).toBeGreaterThan(0);
    }
  });
});

describe("a mark this module wrote", () => {
  it("is never read back as the old high-water one", () => {
    // The trap the leading separator exists for: a list of one level.
    const one = milestoneMark("", "A2");
    expect([...milestonesTold(one)]).toEqual(["A2"]);
    expect(milestonesTold(one).has("A1")).toBe(false);
  });

  it("round-trips whatever it is handed", () => {
    let mark = milestoneMark("", "B1");
    mark = milestoneMark(mark, "A1");
    expect([...milestonesTold(mark)]).toEqual(["A1", "B1"]);
  });
});
