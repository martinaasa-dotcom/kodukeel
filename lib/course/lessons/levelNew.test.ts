import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { lessonMinutes } from "../lessonCourse";
import { LEVEL_NEW, levelNewsFor } from "./levelNew";

describe("what is new at a level", () => {
  it("is said on the level's first lesson and nowhere else", () => {
    const said = LESSONS.filter((l) => levelNewsFor(l) !== null).map((l) => l.id);
    expect(said).toEqual(Object.keys(LEVEL_NEW).map((level) => LESSONS.find((l) => l.level === level && l.n === 1 && !l.extra)!.id));
  });

  it("claims only what the level's lessons do", () => {
    const b1 = LESSONS.filter((l) => l.level === "B1");
    // Forty-nine core lessons and three lettered lessons of more words (20a, 34a, 41a).
    expect(b1.filter((l) => !l.extra).length).toBe(49);
    expect(b1.length).toBe(52);
    expect(b1.every((l) => l.listenFor && l.listenFor.length > 0), "every B1 lesson is heard first").toBe(true);
    expect(b1.filter((l) => !l.extra && l.kind !== "partEnd").every((l) => (l.reworks?.length ?? 0) > 0), "every core B1 lesson reworks a sentence").toBe(true);
    // A part's closing conversation talks for longer by being the whole conversation, with a turn
    // it never rehearsed; every other lesson retells a story or gives one answer faster.
    const closing = (l: (typeof b1)[number]) => l.kind !== "lesson" && l.roleplay !== undefined;
    expect(b1.filter((l) => !closing(l)).every((l) => l.retell || l.faster), "every B1 lesson talks for longer").toBe(true);
    expect(b1.filter(closing).length).toBe(7);
    // "about twenty-five minutes, and a writing lesson about forty", within five.
    const plain = b1.filter((l) => !l.write).map(lessonMinutes);
    const writing = b1.filter((l) => l.write).map(lessonMinutes);
    expect(writing.length).toBe(7);
    expect(plain.length).toBe(45);
    for (const m of plain) expect(Math.abs(m - 25)).toBeLessThanOrEqual(5);
    for (const m of writing) expect(Math.abs(m - 40)).toBeLessThanOrEqual(5);
  });
});
