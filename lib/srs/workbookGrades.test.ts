import { describe, expect, it } from "vitest";
import { workbookGrades } from "./workbookGrades";

describe("workbookGrades", () => {
  it("lands one grade per card, the worst of its lines, with that line's slot", () => {
    const out = workbookGrades([
      { id: "a", cardId: "mina", outcome: "right", slot: "ALLATIVE" },
      { id: "b", cardId: "mina", outcome: "missed", slot: "ABLATIVE", reached: "ADESSIVE" },
      { id: "c", cardId: "mina", outcome: "second", slot: "ADESSIVE" },
      { id: "d", cardId: "tuba", outcome: "right", slot: "INESSIVE" },
    ], 32, 1000);
    expect(out).toHaveLength(2);
    const mina = out.find((g) => g.cardId === "mina")!;
    expect(mina).toMatchObject({ id: "b", rating: 1, slot: "ABLATIVE", reachedSlot: "ADESSIVE" });
    expect(out.find((g) => g.cardId === "tuba")).toMatchObject({ id: "d", rating: 3 });
  });

  it("drops what is not a grade, and stops at the limit", () => {
    expect(workbookGrades("nope", 32, 0)).toEqual([]);
    expect(workbookGrades([{ id: "x", cardId: "c", outcome: "easy" }, { cardId: "c", outcome: "right" }], 32, 0)).toEqual([]);
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `g${i}`, cardId: `c${i}`, outcome: "right" }));
    expect(workbookGrades(many, 32, 0)).toHaveLength(32);
  });

  it("keeps the first of two equally bad lines", () => {
    const out = workbookGrades([
      { id: "a", cardId: "c", outcome: "slip", slot: "INESSIVE" },
      { id: "b", cardId: "c", outcome: "second", slot: "ELATIVE" },
    ], 32, 0);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("a");
  });
});
