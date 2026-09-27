import { describe, expect, it } from "vitest";
import { dealHeroLetters, HERO_LETTERS, MIN_GAP } from "./heroLetters";

function seeded(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe("dealing the hero's letters", () => {
  it("places all four, at most two to an edge and never bunched", () => {
    let dealt = 0;
    for (let seed = 1; seed < 400; seed++) {
      const deal = dealHeroLetters(seeded(seed));
      expect(deal.map((d) => d.letter)).toEqual([...HERO_LETTERS]);
      for (const edge of ["top", "bottom", "left", "right"]) {
        const on = deal.filter((d) => d.edge === edge).map((d) => d.at);
        dealt += on.length;
        expect(on.length).toBeLessThanOrEqual(edge === "left" || edge === "right" ? 1 : 2);
        if (on.length === 2) expect(Math.abs(on[0]! - on[1]!)).toBeGreaterThanOrEqual(MIN_GAP);
        for (const at of on) {
          expect(at).toBeGreaterThanOrEqual(0.1);
          expect(at).toBeLessThanOrEqual(0.9);
        }
      }
    }
    expect(dealt).toBe(399 * 4);
  });

  it("keeps to the top and bottom on a phone, all four placed", () => {
    for (let seed = 1; seed < 200; seed++) {
      const deal = dealHeroLetters(seeded(seed), { sides: false });
      expect(deal).toHaveLength(4);
      expect(deal.every((d) => d.edge === "top" || d.edge === "bottom")).toBe(true);
    }
  });

  it("does not deal the same card twice in a row", () => {
    const a = dealHeroLetters(seeded(7));
    const b = dealHeroLetters(seeded(8));
    expect(a).not.toEqual(b);
  });
});
