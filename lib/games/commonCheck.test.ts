import { describe, expect, it } from "vitest";
import { CHECK_TRIES, checkRating } from "./commonCheck";

describe("checkRating", () => {
  it("keeps the marker's grade on the first go", () => {
    expect(checkRating(3, 0)).toBe(3);
    expect(checkRating(2, 0)).toBe(2);
  });

  it("is never better than Hard on the second go", () => {
    expect(checkRating(3, 1)).toBe(2);
    expect(checkRating(2, 1)).toBe(2);
    expect(checkRating(1, 1)).toBe(1);
  });

  it("gives a word two goes", () => {
    expect(CHECK_TRIES).toBe(2);
  });
});
