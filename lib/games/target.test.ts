import { describe, expect, it } from "vitest";
import { TARGET_FLOOR_S, TARGET_START_S, shotSeconds } from "./target";
import { ROUND_PACES, multiplierFor } from "@/lib/ux/roundClock";

describe("shotSeconds", () => {
  it("is the round as written at the standard pace", () => {
    expect(shotSeconds(0, 1)).toBe(TARGET_START_S);
    expect(shotSeconds(4, 1)).toBe(7);
    expect(shotSeconds(1000, 1)).toBe(TARGET_FLOOR_S);
  });

  it("scales the start, the step and the floor by the learner's pace", () => {
    expect(shotSeconds(0, 2)).toBe(16);
    expect(shotSeconds(1, 1.5)).toBe(11.625);
    expect(shotSeconds(1000, 10)).toBe(35);
  });

  it("reaches ten times the standard at the slowest pace, which is the figure 2.2.1 names", () => {
    const slowest = Math.max(...ROUND_PACES.map((p) => multiplierFor(p.id)));
    expect(slowest).toBe(10);
    expect(shotSeconds(0, slowest)).toBe(TARGET_START_S * 10);
  });

  it("falls back to the standard pace for a multiplier that is not a pace", () => {
    expect(shotSeconds(0, 0)).toBe(TARGET_START_S);
    expect(shotSeconds(0, Number.NaN)).toBe(TARGET_START_S);
    expect(shotSeconds(-3, 1)).toBe(TARGET_START_S);
  });
});
