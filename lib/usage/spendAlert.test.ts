import { describe, expect, it } from "vitest";
import { SPEND_MESSAGE, thresholdCrossed } from "./spendAlert";

describe("thresholdCrossed", () => {
  it("names the one line a booking carried the total across", () => {
    expect(thresholdCrossed(40, 55, 100)).toBe(50);
    expect(thresholdCrossed(79, 81, 100)).toBe(80);
    expect(thresholdCrossed(99, 120, 100)).toBe(100);
  });

  it("names the highest where one booking crosses two", () => {
    expect(thresholdCrossed(40, 85, 100)).toBe(80);
    expect(thresholdCrossed(10, 100, 100)).toBe(100);
  });

  it("names nothing where no line was crossed", () => {
    expect(thresholdCrossed(10, 20, 100)).toBeNull();
    expect(thresholdCrossed(55, 70, 100)).toBeNull();
  });

  it("counts landing exactly on a line as crossing it, and starting on one as not", () => {
    expect(thresholdCrossed(49, 50, 100)).toBe(50);
    expect(thresholdCrossed(50, 60, 100)).toBeNull();
  });

  it("names nothing for a cap of zero or less", () => {
    expect(thresholdCrossed(0, 10, 0)).toBeNull();
    expect(thresholdCrossed(0, 10, -5)).toBeNull();
  });

  it("names nothing once the total was already over", () => {
    expect(thresholdCrossed(150, 160, 100)).toBeNull();
  });

  it("keeps every message free of a figure, since the message is the fingerprint", () => {
    for (const message of Object.values(SPEND_MESSAGE)) expect(message).not.toMatch(/\d/);
  });
});
