import { describe, expect, it } from "vitest";

import { SYLLABUS } from "@/lib/collections/syllabus";
import { sceneTesting } from "@/lib/scenes/catalogue";
import { PROGRAMMES } from "@/lib/course";
import { courseChecks } from "@/lib/course/checks";
import { LESSONS, LESSON_PARTS } from "@/lib/course/lessons";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { EXAM_PARTS, EXAMINED, LESSON_PART_PREPARES, PREPARES, alignCourse, courseMadeOf, lessonLevelCoverage, lessonLevels, outlineLessons } from "./align";

const aligned = alignCourse(SYLLABUS, sceneTesting);
const PARTS = new Set(EXAM_PARTS.map((p) => p.part));

describe("curriculum alignment", () => {
  it("lists every unit of the course exactly once", () => {
    const listed = aligned.flatMap((l) => l.units.map((a) => a.unit.id));
    expect(listed.length).toBe(SYLLABUS.length);
    expect(new Set(listed).size).toBe(SYLLABUS.length);
  });

  it("maps every examined unit to an exam part, and only to the four the Board sets", () => {
    let mapped = 0;
    for (const unit of SYLLABUS.filter((u) => (EXAMINED as readonly string[]).includes(u.level))) {
      const prep = PREPARES[unit.id];
      expect(prep, `${unit.id} at ${unit.level} has no exam part`).toBeDefined();
      expect(prep!.parts.length).toBeGreaterThan(0);
      for (const part of prep!.parts) expect(PARTS.has(part)).toBe(true);
      expect(prep!.why.trim().endsWith(".")).toBe(true);
      mapped++;
    }
    expect(mapped).toBeGreaterThanOrEqual(60);
  });

  it("names no unit that does not exist, and none the state does not examine", () => {
    const byId = new Map(SYLLABUS.map((u) => [u.id, u]));
    for (const id of Object.keys(PREPARES)) {
      expect(byId.has(id), `${id} is not a unit`).toBe(true);
      expect(EXAMINED as readonly string[]).toContain(byId.get(id)!.level);
    }
  });

  it("maps nothing at A1, which no paper examines", () => {
    const a1 = aligned.find((l) => l.level === "A1")!;
    expect(a1.examined).toBe(false);
    expect(a1.units.length).toBeGreaterThan(0);
    expect(a1.units.every((a) => a.preparation === null)).toBe(true);
    expect(a1.byPart).toEqual([]);
  });

  it("names a part as a gap exactly where no unit at the level is aimed at it", () => {
    let examined = 0;
    for (const level of aligned.filter((l) => l.examined)) {
      examined++;
      for (const { part, units } of level.byPart) {
        expect(level.gaps.includes(part)).toBe(units.length === 0);
      }
    }
    expect(examined).toBe(4);
    const c1 = aligned.find((l) => l.level === "C1")!;
    const speaking = c1.byPart.find((p) => p.part === "speaking")!;
    expect(c1.gaps.includes("speaking")).toBe(speaking.units.length === 0);
  });

  it("reports a part as a gap when nothing at a level is aimed at it", () => {
    const only = SYLLABUS.filter((u) => u.id === "statistika");
    const level = alignCourse(only, () => undefined)[0]!;
    expect(level.gaps).toEqual(["listening", "reading", "speaking"]);
  });

  it("links the conversation that tests a unit where one does", () => {
    const withScene = aligned.flatMap((l) => l.units).filter((a) => a.scene);
    expect(withScene.length).toBeGreaterThan(0);
    for (const a of withScene) expect(sceneTesting(a.unit.id)?.id).toBe(a.scene!.id);
  });
});

describe("the lesson levels on /curriculum, drawn from the lessons", () => {
  const outline = outlineLessons(LESSONS, LESSON_PARTS, courseChecks(PROGRAMMES), sceneForLesson);

  it("names every lesson in LESSONS exactly once, in teaching order", () => {
    const listed = outline.flatMap((p) => p.lessons.map((l) => l.id));
    expect(listed.length).toBe(LESSONS.length);
    expect(new Set(listed).size).toBe(LESSONS.length);
    expect(listed).toEqual(LESSONS.filter((l) => LESSON_PARTS.some((p) => p.id === l.part)).map((l) => l.id));
    expect(listed.length).toBeGreaterThan(0);
  });

  it("closes every part with its check, the last of each level on the whole level", () => {
    expect(outline.length).toBe(LESSON_PARTS.length);
    let checked = 0;
    for (const [i, part] of outline.entries()) {
      const lastOfLevel = outline[i + 1]?.part.level !== part.part.level;
      expect(part.check, `${part.part.id} has no check`).not.toBeNull();
      expect(part.check!.final, part.part.id).toBe(lastOfLevel);
      expect(part.check!.questions).toBeGreaterThan(0);
      if (lastOfLevel) {
        expect(part.check!.lessons, part.part.id).toBe(LESSONS.filter((l) => l.level === part.part.level).length);
      }
      checked++;
    }
    expect(checked).toBe(LESSON_PARTS.length);
  });

  it("names the live conversation of every role-play that has one", () => {
    const roleplays = outline.flatMap((p) => p.roleplays);
    expect(roleplays.length).toBe(LESSONS.filter((l) => l.roleplay).length);
    expect(roleplays.length).toBeGreaterThan(0);
    for (const r of roleplays) expect(r.scene?.id).toBe(sceneForLesson(r.lesson.id)?.id);
  });

  it("maps every part of the lessons at an examined level to an exam part, and nothing at A1", () => {
    let mapped = 0;
    for (const o of outline) {
      const examined = (EXAMINED as readonly string[]).includes(o.part.level);
      if (!examined) {
        expect(o.preparation, `${o.part.id} is at ${o.part.level}, which no paper examines`).toBeNull();
        continue;
      }
      expect(o.preparation, `${o.part.id} at ${o.part.level} has no exam part`).not.toBeNull();
      expect(o.preparation!.parts.length).toBeGreaterThan(0);
      for (const part of o.preparation!.parts) expect(PARTS.has(part)).toBe(true);
      expect(o.preparation!.why.trim().endsWith(".")).toBe(true);
      mapped++;
    }
    expect(mapped).toBe(Object.keys(LESSON_PART_PREPARES).length);
    expect(mapped).toBeGreaterThan(0);
  });

  it("names no part of the lessons that does not exist, and none the state does not examine", () => {
    const byId = new Map(LESSON_PARTS.map((p) => [p.id, p]));
    const keys = Object.keys(LESSON_PART_PREPARES);
    for (const id of keys) {
      expect(byId.has(id), `${id} is not a part of the lessons`).toBe(true);
      expect(EXAMINED as readonly string[]).toContain(byId.get(id)!.level);
    }
    expect(keys.length).toBeGreaterThan(0);
  });

  it("names a gap at a lesson level exactly where no part of its lessons is aimed at an exam part", () => {
    let levels = 0;
    for (const level of lessonLevels(LESSONS)) {
      const cover = lessonLevelCoverage(level, outline);
      if (!cover.examined) {
        expect(cover.byPart).toEqual([]);
        continue;
      }
      levels++;
      for (const { part, units } of cover.byPart) {
        expect(cover.gaps.includes(part)).toBe(units.length === 0);
      }
    }
    expect(levels).toBeGreaterThan(0);
  });

  it("counts lessons where a level is taught as lessons and units only above it", () => {
    const made = courseMadeOf(SYLLABUS, LESSONS);
    const taught = lessonLevels(LESSONS);
    expect(made.lessons).toBe(LESSONS.length);
    expect(made.units).toBe(SYLLABUS.filter((u) => !taught.has(u.level)).length);
    expect(taught.has("A1")).toBe(true);
    expect(made.through).toBe([...taught].at(-1));
    expect(made.units).toBeLessThan(SYLLABUS.length);
  });
});
