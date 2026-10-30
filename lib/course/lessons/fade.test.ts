import { describe, expect, it } from "vitest";
import { FADE_HARDER_FROM, fadePlan, passLead } from "./fade";
import { LESSONS, LESSON_PARTS } from "./index";
import type { LessonSpec } from "./types";

/** Which part of its level a lesson is in, counted from 1, as the lesson page works it out. */
const partNumber = (lesson: LessonSpec) =>
  LESSON_PARTS.filter((p) => p.level === lesson.level).findIndex((p) => p.id === lesson.part) + 1;

describe("say along, then alone", () => {
  const lesson = LESSONS.find((l) => (l.how.examples ?? []).length >= 2)!;
  const plan = fadePlan(lesson, 1);
  const lines = plan.length / 3;

  it("says each key line three times, the first with nothing hidden and the last with everything", () => {
    expect(Number.isInteger(lines)).toBe(true);
    expect(lines).toBeGreaterThan(0);
    for (const step of plan.filter((s) => s.pass === 1)) expect(step.hidden.some(Boolean)).toBe(false);
    for (const step of plan.filter((s) => s.pass === 3)) expect(step.hidden.filter(Boolean).length).toBeGreaterThan(0);
  });

  it("hides something on every second pass of every B1 lesson, on an easier part and a harder one, even on a line with no long word", () => {
    let seen = 0;
    for (const l of LESSONS.filter((x) => x.level === "B1")) {
      for (const partAt of [1, FADE_HARDER_FROM]) {
        for (const s of fadePlan(l, partAt).filter((p) => p.pass === 2)) { seen += 1; expect(s.hidden.some(Boolean), `${l.id}: ${s.et}`).toBe(true); }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("says what each step does to its line, and never that more is gone when nothing more is", () => {
    const lesson = LESSONS.find((l) => l.level === "B1")!;
    const words = lesson.conversation.find((c) => c.et)!.et!;
    const plan = fadePlan(lesson, FADE_HARDER_FROM);
    const leads = plan.map((_, i) => passLead(plan, i));
    expect(leads.filter((l) => l === "last").length).toBe(plan.length / 3);
    plan.forEach((step, i) => {
      if (leads[i] !== "more") return;
      const first = plan.find((p) => p.pass === 1 && p.et === step.et)!;
      expect(step.hidden.filter(Boolean).length).toBeGreaterThan(first.hidden.filter(Boolean).length);
    });
    // A line whose every word is tonight's is all hidden on the first pass of a harder part, and the second says "still".
    const allTonight = { ...lesson, teaches: words.split(/\s+/).map((w) => ({ kind: "word" as const, et: w.replace(/[^\p{L}]/gu, ""), en: "x" })), how: { ...lesson.how, examples: [lesson.conversation.findIndex((c) => c.et)] } };
    const tight = fadePlan(allTonight, FADE_HARDER_FROM);
    expect(passLead(tight, tight.findIndex((p) => p.pass === 2))).toBe("still");
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
        // And strictly more, wherever a word was still showing: a second pass that is the first again says nothing new.
        const count = (p: typeof a) => p.hidden.filter(Boolean).length;
        if (count(a) < count(c)) expect(count(b), `${lesson.id} pass 2: ${a.et}`).toBeGreaterThan(count(a));
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });
});
