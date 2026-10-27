import { describe, expect, it } from "vitest";
import { SCENES } from "@/lib/scenes/catalogue";
import { LESSONS } from "./lessons";
import { PREVIEW_LESSONS } from "./lessons/preview";
import { LESSON_SITUATIONS } from "./lessonSituations";

describe("a lesson's conversation out there", () => {
  const lessons = new Set([...LESSONS, ...PREVIEW_LESSONS].map((l) => l.id));
  const catalog = new Set(SCENES.map((s) => s.id));

  it("names a lesson and a catalog conversation, each once", () => {
    for (const [lesson, scene] of Object.entries(LESSON_SITUATIONS)) {
      expect(lessons.has(lesson), `${lesson} is no lesson`).toBe(true);
      expect(catalog.has(scene), `${scene} is no catalog conversation`).toBe(true);
    }
    const scenes = Object.values(LESSON_SITUATIONS);
    expect(new Set(scenes).size).toBe(scenes.length);
  });
});
