import { describe, expect, it } from "vitest";
import { fadePlan } from "./fade";
import { LESSONS } from "./index";

describe("say along, then alone", () => {
  const lesson = LESSONS.find((l) => (l.how.examples ?? []).length >= 2)!;
  const plan = fadePlan(lesson);
  const lines = plan.length / 3;

  it("says each key line three times, the first with nothing hidden and the last with everything", () => {
    expect(Number.isInteger(lines)).toBe(true);
    expect(lines).toBeGreaterThan(0);
    for (const step of plan.filter((s) => s.pass === 1)) expect(step.hidden.some(Boolean)).toBe(false);
    for (const step of plan.filter((s) => s.pass === 3)) expect(step.hidden.filter(Boolean).length).toBeGreaterThan(0);
  });

  it("hides something on the second pass, and less than the third does", () => {
    const second = plan.filter((s) => s.pass === 2);
    const third = plan.filter((s) => s.pass === 3);
    expect(second.length).toBe(third.length);
    second.forEach((s, i) => {
      const n = s.hidden.filter(Boolean).length;
      expect(n, s.et).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(third[i]!.hidden.filter(Boolean).length);
    });
  });
});
