import { describe, expect, it } from "vitest";
import { LESSON_LEVELS } from "./lessons";
import { LESSON_LEVEL_LIST } from "./lessonLevels";

describe("the light list of lesson levels", () => {
  it("names exactly the levels the lessons teach", () => {
    expect([...LESSON_LEVEL_LIST].sort()).toEqual([...LESSON_LEVELS].sort());
  });
});
