import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { whyProblems } from "./why";
import type { LessonSpec } from "./types";

describe("why this form", () => {
  it("names real lines, holds their forms, and lands every one", () => {
    expect(LESSONS.flatMap(whyProblems)).toEqual([]);
  });

  it("is on the lessons it was written for", () => {
    expect(LESSONS.filter((l) => l.how.why).length).toBeGreaterThanOrEqual(1);
  });

  it("refuses a line that does not hold its form", () => {
    const lesson = LESSONS.find((l) => l.how.why)!;
    const broken: LessonSpec = { ...lesson, how: { ...lesson.how, why: { ...lesson.how.why!, lines: [{ ...lesson.how.why!.lines[0]!, form: "qqq" }] } } };
    expect(whyProblems(broken).join(" ")).toMatch(/does not hold qqq/);
  });
});
