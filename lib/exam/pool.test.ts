import { describe, expect, it } from "vitest";
import { POOL_SIZE, drawPool, eligibleFor, eligibleLevels } from "./pool";

describe("the exam pool rule", () => {
  it("draws a paper from its own band and every band below", () => {
    expect(eligibleLevels("A1")).toEqual(["A1"]);
    expect(eligibleLevels("B2")).toEqual(["A1", "A2", "B1", "B2"]);
    expect(eligibleFor("A2", "B1")).toBe(false);
    expect(eligibleFor("B1", "A1")).toBe(true);
  });

  it("takes an ungraded entry from B1 up and never below it", () => {
    // The rule examPool had inline: the untagged tail is mostly above B1.
    expect(eligibleFor("A1", null)).toBe(false);
    expect(eligibleFor("A2", null)).toBe(false);
    expect(eligibleFor("B1", null)).toBe(true);
    expect(eligibleFor("C1", null)).toBe(true);
  });

  it("is a function of the seed, cut at POOL_SIZE, and moves nothing it is handed", () => {
    const ids = Array.from({ length: 900 }, (_, i) => i);
    const first = drawPool(ids, "B1", "s1");
    expect(first).toHaveLength(POOL_SIZE);
    expect(drawPool(ids, "B1", "s1")).toEqual(first);
    expect(drawPool(ids, "B1", "s2")).not.toEqual(first);
    expect(drawPool(ids, "B2", "s1")).not.toEqual(first);
    expect(ids[0]).toBe(0);
    expect(new Set(first).size).toBe(POOL_SIZE);
  });
});
