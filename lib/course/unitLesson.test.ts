import { describe, expect, it } from "vitest";
import { PATH } from "@/lib/collections/syllabus";
import { lessonHeads } from "./lessonHeads";
import { lessonForUnit, unitLessonHref } from "./unitLesson";

describe("the lesson a unit's link goes to", () => {
  it("teaches some of the unit's words, for nearly every unit", () => {
    let found = 0;
    for (const unit of PATH) {
      const lesson = lessonForUnit(unit.id);
      if (!lesson) continue;
      found += 1;
      expect(lessonHeads(lesson).some((head) => unit.lemmas.includes(head)), unit.id).toBe(true);
      expect(unitLessonHref(unit.id)).toBe(`/course/lessons/${lesson.id}`);
    }
    // Measured at 101 of the 102 units when C1 became lessons; `liitverbid` alone has no lesson of its own words.
    expect(found).toBeGreaterThanOrEqual(101);
  });

  it("goes to the list of lessons for a unit nothing teaches, and one that does not exist", () => {
    expect(lessonForUnit("no-such-unit")).toBeNull();
    expect(unitLessonHref("no-such-unit")).toBe("/course/lessons");
  });
});
