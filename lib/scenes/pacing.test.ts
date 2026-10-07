import { describe, expect, it } from "vitest";
import { READ_CEILING_MS, READ_FLOOR_MS, readingPause } from "./pacing";

describe("readingPause", () => {
  it("is nothing when nothing was said", () => {
    expect(readingPause([])).toBe(0);
    expect(readingPause(["  "])).toBe(0);
  });

  it("leaves even one word up for the floor", () => {
    expect(readingPause(["Hästi."])).toBe(READ_FLOOR_MS);
  });

  it("grows with the length of what was said", () => {
    const short = readingPause(["Kus sa praegu oled?"]);
    const long = readingPause(["Kus sa praegu oled?", "Ma ootan sind poe ees juba natuke aega."]);
    expect(long).toBeGreaterThan(short);
  });

  it("never stalls a long line past the ceiling", () => {
    expect(readingPause(["a".repeat(500)])).toBe(READ_CEILING_MS);
  });
});
