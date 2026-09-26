import { describe, expect, it } from "vitest";
import { AT_LEVEL_SHARE, POOL_SIZE, drawPool, drawStablePool, eligibleFor, eligibleLevels, poolForSeed } from "./pool";
import { numberedSeed } from "./seed";

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

  const rows = Array.from({ length: 900 }, (_, i) => ({ id: `id-${i}`, cefr: ["A1", "A2", "B1"][i % 3]! }));

  it("moves at most one word of a numbered pool when the dictionary grows by one", () => {
    const before = drawStablePool(rows, "B1", "set-7");
    expect(before).toHaveLength(POOL_SIZE);
    let displaced = 0;
    for (let extra = 0; extra < 50; extra++) {
      const after = new Set(drawStablePool([...rows, { id: `new-${extra}`, cefr: extra % 2 ? "B1" : "A2" }], "B1", "set-7"));
      const lost = before.filter((id) => !after.has(id)).length;
      expect(lost).toBeLessThanOrEqual(1);
      displaced += lost;
    }
    // Checked over something: fifty words added, and some of them did get in.
    expect(displaced).toBeGreaterThan(0);
  });

  it("draws a random paper's pool exactly as it always has", () => {
    const numbered = Array.from({ length: 900 }, (_, i) => ({ id: i, cefr: ["A1", "A2", "B1"][i % 3]! }));
    const ids = numbered.map((r) => r.id);
    expect(poolForSeed(numbered, "B1", "k3j9x0a1-mzq4w2x0")).toEqual(drawPool(ids, "B1", "k3j9x0a1-mzq4w2x0"));
    const now = new Date("2026-09-25T12:00:00Z");
    expect(poolForSeed(numbered, "B1", numberedSeed(3, null, now))).toEqual(drawStablePool(numbered, "B1", "set-3"));
    expect(poolForSeed(numbered, "B1", numberedSeed(3, "reading", now))).toEqual(drawStablePool(numbered, "B1", "set-3"));
  });

  it("takes half a numbered pool from the paper's own band where the band has that many, and all of it where not", () => {
    const pool = drawStablePool(rows, "B1", "set-1");
    const own = pool.filter((id) => Number(id.slice(3)) % 3 === 2).length;
    expect(own).toBe(Math.floor(POOL_SIZE * AT_LEVEL_SHARE));
    // And never fewer than chance would give, where the band is most of the dictionary.
    const heavy = rows.map((r, i) => ({ ...r, cefr: i % 5 === 0 ? "A1" : "B1" }));
    const drawn = new Set(drawStablePool(heavy, "B1", "set-1"));
    expect(heavy.filter((r) => r.cefr === "B1" && drawn.has(r.id)).length).toBe(400);
    const thin = [...rows.filter((r) => r.cefr !== "B1"), ...Array.from({ length: 40 }, (_, i) => ({ id: `c-${i}`, cefr: "B1" }))];
    expect(drawStablePool(thin, "B1", "set-1").filter((id) => id.startsWith("c-"))).toHaveLength(40);
  });

});
