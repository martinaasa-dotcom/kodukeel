import { describe, expect, it } from "vitest";
import { pointsHeard, retellListensOn, retellMayStop, RETELL_DONE_QUIET_MS } from "./retell";

describe("a retelling", () => {
  const retell = {
    points: [
      { en: "the roof", any: ["katus", "katuse"] },
      { en: "it was fixed", any: ["oli parandatud"] },
    ],
  };

  it("lights a point on any of its words, whole and in any case", () => {
    expect(pointsHeard(retell, "Katus oli katki.")).toEqual([true, false]);
    expect(pointsHeard(retell, "nad parandasid katuse ära")).toEqual([true, false]);
  });

  it("asks a phrase to stand together, and a word to be the whole word", () => {
    expect(pointsHeard(retell, "see oli juba parandatud")).toEqual([false, false]);
    expect(pointsHeard(retell, "katus oli parandatud")).toEqual([true, true]);
    expect(pointsHeard(retell, "katusel")).toEqual([false, false]);
  });
});

describe("the microphone on a retelling", () => {
  it("never closes itself while a point is still dark, however long the pause", () => {
    expect(retellMayStop([true, false, true], 60_000)).toBe(false);
    expect(retellMayStop([], 60_000)).toBe(false);
  });

  it("closes once every point is lit and the learner has stopped talking", () => {
    expect(retellMayStop([true, true], RETELL_DONE_QUIET_MS - 1)).toBe(false);
    expect(retellMayStop([true, true], RETELL_DONE_QUIET_MS)).toBe(true);
  });

  it("carries on past the length cap with a point still dark, and never past a press", () => {
    expect(retellListensOn("too-long", [true, false])).toBe(true);
    expect(retellListensOn("too-long", [true, true])).toBe(false);
    expect(retellListensOn("pressed", [true, false])).toBe(false);
  });
});
