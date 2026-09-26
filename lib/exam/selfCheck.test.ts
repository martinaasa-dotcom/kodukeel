import { describe, expect, it } from "vitest";
import { SELF_CHECK, isWrittenKind } from "./selfCheck";
import { OFFICIAL_LEVELS, specFor } from "./spec";

describe("the self-check for a written text", () => {
  it("has questions for both written tasks", () => {
    expect(SELF_CHECK.message.length).toBeGreaterThanOrEqual(3);
    expect(SELF_CHECK.compose.length).toBeGreaterThanOrEqual(3);
  });

  it("holds no Estonian, so it cannot hand a learner a form", () => {
    for (const line of [...SELF_CHECK.message, ...SELF_CHECK.compose]) {
      expect(line).not.toMatch(/[õäöüšž]/i);
    }
  });

  it("reaches every written task the paper sets, at every examined level", () => {
    let written = 0;
    for (const level of OFFICIAL_LEVELS) {
      for (const part of specFor(level).parts) {
        for (const task of part.tasks) {
          if (isWrittenKind(task.kind)) written += 1;
        }
      }
    }
    expect(written).toBe(OFFICIAL_LEVELS.length * 2);
  });
});
