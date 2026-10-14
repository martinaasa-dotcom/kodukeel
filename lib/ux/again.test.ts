import { describe, expect, it } from "vitest";
import { againHref, roundOf } from "./again";

describe("againHref", () => {
  it("names a round one higher than the address it was pressed on", () => {
    expect(againHref("/review/match")).toBe("/review/match?round=1");
    expect(againHref("/review/match", "round=1")).toBe("/review/match?round=2");
  });

  it("keeps every other parameter", () => {
    expect(againHref("/review/openers", "stage=2&round=4")).toBe("/review/openers?stage=2&round=5");
  });

  it("is never the address it was built on", () => {
    for (const q of ["", "round=0", "round=abc", "round=7", "x=1"]) {
      expect(againHref("/p", q)).not.toBe(q ? `/p?${q}` : "/p");
    }
  });
});

describe("roundOf", () => {
  it("reads a small whole number and nothing else", () => {
    expect(roundOf(new URLSearchParams("round=3"))).toBe(3);
    expect(roundOf(new URLSearchParams("round=-1"))).toBe(0);
    expect(roundOf(new URLSearchParams("round=1e9"))).toBe(0);
    expect(roundOf(null)).toBe(0);
  });
});
