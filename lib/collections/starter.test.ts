import { describe, expect, it } from "vitest";
import { LEVELS } from "./syllabus";
import { starterUnitsFor } from "./starter";
import { isLessonLevelName } from "@/lib/course/lessonLevels";

/*
  A level taught as lessons starts with no units: each lesson hands the deck
  its words when it is finished, and a starter deck of units would put words
  on Review the module then holds back until a lesson teaches them. It was A1
  alone for a while, after A2 and B1 had become lessons too, so a learner
  placed to open on A2 or B1 was handed units of words nobody had taught.
*/
describe("the starter deck", () => {
  it("is empty at every level taught as lessons, and units above them", () => {
    let lessonLevels = 0;
    for (const level of LEVELS) {
      const units = starterUnitsFor(level);
      if (isLessonLevelName(level)) { lessonLevels += 1; expect(units, level).toEqual([]); }
      else expect(units.length, level).toBeGreaterThan(0);
    }
    expect(lessonLevels).toBeGreaterThanOrEqual(3);
    expect(starterUnitsFor(null)).toEqual([]);
  });
});
