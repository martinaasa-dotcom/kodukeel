import { describe, expect, it } from "vitest";
import { FADE_HARDER_FROM, fadePlan } from "./fade";
import { LESSONS, LESSON_PARTS } from "./index";
import type { LessonSpec } from "./types";

/** Which part of its level a lesson is in, counted from 1, as the lesson page works it out. */
const partNumber = (lesson: LessonSpec) =>
  LESSON_PARTS.filter((p) => p.level === lesson.level).findIndex((p) => p.id === lesson.part) + 1;

describe("say along, then alone", () => {
  const lesson = LESSONS.find((l) => (l.how.examples ?? []).length >= 2)!;
  const plan = fadePlan(lesson);
  const lines = plan.length / 3;

  it("says each key line three times, the first with nothing hidden and the last with everything", () => {
    expect(Number.isInteger(lines)).toBe(true);
    expect(lines).toBeGreaterThan(0);
    for (const step of plan.filter((s) => s.pass === 1)) expect(step.hidden.some(Boolean)).toBe(false);
    for (const step of plan.filter((s) => s.pass === 3)) expect(step.hidden.filter(Boolean).length).toBeGreaterThan(0);
  });

  it("hides something on the second pass, and less than the third does", () => {
    const second = plan.filter((s) => s.pass === 2);
    const third = plan.filter((s) => s.pass === 3);
    expect(second.length).toBe(third.length);
    second.forEach((s, i) => {
      const n = s.hidden.filter(Boolean).length;
      expect(n, s.et).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(third[i]!.hidden.filter(Boolean).length);
    });
  });
});

describe("the fade starts a step harder from a level's fourth part", () => {
  const b1 = LESSONS.filter((l) => l.level === "B1" && !l.extra);
  const early = b1.filter((l) => partNumber(l) < FADE_HARDER_FROM);
  const late = b1.filter((l) => partNumber(l) >= FADE_HARDER_FROM);

  it("reads the part off the lesson", () => {
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
  });

  it("hides nothing on the first pass before then, and something on every first pass after", () => {
    let early1 = 0;
    for (const lesson of early) {
      for (const s of fadePlan(lesson, partNumber(lesson)).filter((p) => p.pass === 1)) { early1 += 1; expect(s.hidden.some(Boolean)).toBe(false); }
    }
    let late1 = 0;
    for (const lesson of late) {
      for (const s of fadePlan(lesson, partNumber(lesson)).filter((p) => p.pass === 1)) { late1 += 1; expect(s.hidden.some(Boolean), `${lesson.id}: ${s.et}`).toBe(true); }
    }
    expect(early1).toBeGreaterThan(0);
    expect(late1).toBeGreaterThan(0);
  });

  it("and then each pass hides at least what the one before it did", () => {
    let compared = 0;
    for (const lesson of late) {
      const plan = fadePlan(lesson, partNumber(lesson));
      const per = plan.length / 3;
      for (let i = 0; i < per; i++) {
        const [a, b, c] = [plan[i]!, plan[i + per]!, plan[i + 2 * per]!];
        a.hidden.forEach((h, j) => { if (h) expect(b.hidden[j], `${lesson.id}: ${a.et}`).toBe(true); });
        b.hidden.forEach((h, j) => { if (h) expect(c.hidden[j]).toBe(true); });
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });
});
