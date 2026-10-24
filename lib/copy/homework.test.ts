import { describe, expect, it } from "vitest";
import { PATH } from "@/lib/collections/syllabus";
import { LESSONS } from "@/lib/course/lessons";
import { lessonLevels, unitsAboveLessons } from "@/lib/curriculum/align";
import { UNIT_HOMEWORK_FROM } from "./homework";

describe("unit homework starts where the lessons stop", () => {
  it("names the level the lessons teach and the first level a unit can be set from", () => {
    const taught = [...lessonLevels(LESSONS)];
    const offered = unitsAboveLessons(PATH, LESSONS);
    expect(taught).toEqual(["A1"]);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered[0]!.level).toBe("A2");
    expect(UNIT_HOMEWORK_FROM).toContain(`${taught[0]} is taught as lessons`);
    expect(UNIT_HOMEWORK_FROM).toContain(`starts at ${offered[0]!.level}`);
  });

  it("offers no unit at a level taught as lessons", () => {
    const taught = lessonLevels(LESSONS);
    const offered = unitsAboveLessons(PATH, LESSONS);
    expect(offered.filter((u) => taught.has(u.level))).toEqual([]);
    expect(offered.length).toBe(PATH.filter((u) => !taught.has(u.level)).length);
  });
});
