import { describe, expect, it } from "vitest";
import { matchGrades } from "./matchGrades";

const NOW = 1_700_000_000_000;

describe("matchGrades", () => {
  it("grades a clean find Good and a find after a miss Hard, never Easy or Again", () => {
    const out = matchGrades(
      [{ id: "a", cardId: "c1", missed: false }, { id: "b", cardId: "c2", missed: true }],
      16, NOW,
    );
    expect(out).toEqual([
      { id: "a", cardId: "c1", rating: 3, durationMs: 0, reviewedAt: NOW },
      { id: "b", cardId: "c2", rating: 2, durationMs: 0, reviewedAt: NOW },
    ]);
  });

  it("reads only a literal true as a miss", () => {
    const out = matchGrades([{ id: "a", cardId: "c1", missed: "yes" }], 16, NOW);
    expect(out[0]!.rating).toBe(3);
  });

  it("drops a row with no id or no card rather than guessing", () => {
    const out = matchGrades(
      [{ cardId: "c1" }, { id: "b" }, { id: 7, cardId: "c3" }, null, "x", { id: "d", cardId: "c4" }],
      16, NOW,
    );
    expect(out.map((g) => g.id)).toEqual(["d"]);
  });

  it("cuts the list at the limit before building anything", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `g${i}`, cardId: `c${i}` }));
    expect(matchGrades(many, 16, NOW)).toHaveLength(16);
  });

  it("answers anything that is not a list with nothing", () => {
    expect(matchGrades({ id: "a", cardId: "c" }, 16, NOW)).toEqual([]);
    expect(matchGrades(undefined, 16, NOW)).toEqual([]);
  });
});
