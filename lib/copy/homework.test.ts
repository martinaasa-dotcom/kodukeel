import { describe, expect, it } from "vitest";
import { PATH } from "@/lib/collections/syllabus";
import { LESSONS } from "@/lib/course/lessons";
import { lessonLevels, unitsAboveLessons } from "@/lib/curriculum/align";
import { UNIT_HOMEWORK_FROM } from "./homework";

describe("unit homework is retired, since every level is lessons", () => {
  it("says every level is taught as lessons, and the course has no unit left to set", () => {
    const taught = [...lessonLevels(LESSONS)];
    expect(taught).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    expect(unitsAboveLessons(PATH, LESSONS)).toEqual([]);
    expect(UNIT_HOMEWORK_FROM).toMatch(/^Every level is taught as lessons/);
    expect(UNIT_HOMEWORK_FROM).toContain("rather than a unit");
  });

  it("offers no unit at a level taught as lessons", () => {
    const taught = lessonLevels(LESSONS);
    const offered = unitsAboveLessons(PATH, LESSONS);
    expect(offered.filter((u) => taught.has(u.level))).toEqual([]);
    expect(offered.length).toBe(PATH.filter((u) => !taught.has(u.level)).length);
  });
});
