import { describe, expect, it } from "vitest";
import { SCENES } from "@/lib/scenes/catalogue";
import { LESSONS } from "./lessons";
import { PREVIEW_LESSONS } from "./lessons/preview";
import { LESSON_SITUATIONS, situationsOfferedThrough } from "./lessonSituations";

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

  it("counts an offer as made from the lesson that makes it, never before", () => {
    const offers = Object.entries(LESSON_SITUATIONS);
    expect(offers.length).toBeGreaterThan(10);
    for (const [lesson, scene] of offers) {
      expect(situationsOfferedThrough(lesson).has(scene), `${lesson} offers ${scene}`).toBe(true);
      const at = LESSONS.findIndex((l) => l.id === lesson);
      const before = LESSONS[at - 1];
      if (before) expect(situationsOfferedThrough(before.id).has(scene), `${scene} before ${lesson}`).toBe(false);
    }
    expect(situationsOfferedThrough(null).size).toBe(offers.length);
    expect(situationsOfferedThrough("not-a-lesson").size).toBe(0);
  });
});
