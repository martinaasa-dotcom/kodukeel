import { describe, expect, it } from "vitest";

import { lessonProgrammes, lessonStates } from "./lessonCourse";

const PARTS = lessonProgrammes();
const first = PARTS[0]!;
const second = PARTS[1]!;
const at = (n: number) => first.days[n]!.lesson!;

describe("lessonStates", () => {
  it("marks nothing done and the first lesson current for a learner just starting", () => {
    const states = lessonStates(PARTS, new Map(), first.id);
    expect(states.get(at(0))).toBe("current");
    expect([...states.values()].filter((s) => s === "done")).toHaveLength(0);
  });

  it("counts every evening up to the furthest tick as done, and the next one as current", () => {
    const states = lessonStates(PARTS, new Map([[first.id, new Set([first.days[2]!.id])]]), first.id);
    expect([at(0), at(1), at(2)].map((id) => states.get(id))).toEqual(["done", "done", "done"]);
    expect(states.get(at(3))).toBe("current");
    expect(states.get(at(4))).toBe("ahead");
  });

  it("names no current lesson in a part the learner is not following", () => {
    const states = lessonStates(PARTS, new Map([[first.id, new Set(first.days.map((d) => d.id))]]), second.id);
    expect(first.days.every((d) => states.get(d.lesson!) === "done")).toBe(true);
    expect(states.get(second.days[0]!.lesson!)).toBe("current");
    const current = [...states.values()].filter((s) => s === "current");
    expect(current).toHaveLength(1);
  });

  it("marks nothing for somebody following no lesson part", () => {
    const states = lessonStates(PARTS, new Map(), "c1.1");
    expect([...states.values()].every((s) => s === "ahead")).toBe(true);
    expect(states.size).toBeGreaterThan(40);
  });
});
