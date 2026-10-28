import { describe, expect, it } from "vitest";
import { FASTER_SECONDS, goOf } from "./faster";

describe("again, faster", () => {
  it("is three windows, each shorter than the last", () => {
    expect(FASTER_SECONDS).toHaveLength(3);
    for (let i = 1; i < FASTER_SECONDS.length; i++) expect(FASTER_SECONDS[i]!).toBeLessThan(FASTER_SECONDS[i - 1]!);
  });

  it("counts words and reckons a minute on the time spoken", () => {
    expect(goOf("Ma parandasin auto ära.", 30, 90)).toEqual({ window: 90, words: 4, perMinute: 8 });
    expect(goOf("", 0, 60).perMinute).toBe(0);
    // A word said in a second is not sixty words a minute.
    expect(goOf("Jah", 1, 45).perMinute).toBe(12);
    // Time past the window counts as the window.
    expect(goOf("üks kaks kolm", 500, 45).perMinute).toBe(4);
  });
});
