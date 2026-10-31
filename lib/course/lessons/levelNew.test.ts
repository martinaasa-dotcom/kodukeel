import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { PREVIEW_LESSONS } from "./preview";
import { lessonMinutes } from "../lessonCourse";
import { LEVEL_NEW, levelNewsFor } from "./levelNew";

describe("what is new at a level", () => {
  it("is said on the level's first lesson and nowhere else", () => {
    // A level drafted in preview says it on its first lesson there, before it is the course.
    const all = [...LESSONS, ...PREVIEW_LESSONS];
    const said = all.filter((l) => levelNewsFor(l) !== null).map((l) => l.id);
    expect(said).toEqual(Object.keys(LEVEL_NEW).map((level) => all.find((l) => l.level === level && l.n === 1 && !l.extra)!.id));
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

  it("claims only what C1's lessons do", () => {
    const c1 = LESSONS.filter((l) => l.level === "C1");
    const parts = [...new Set(c1.map((l) => l.part))];
    expect(parts.length).toBe(8);
    // "You choose the room": measured at 35 of 49 the day C1 became the course.
    expect(c1.filter((l) => l.rooms !== undefined).length).toBeGreaterThanOrEqual(35);
    // "From the second part ... a talk ... taken down as notes", and never in the first.
    const notes = c1.filter((l) => l.notes).map((l) => parts.indexOf(l.part));
    expect(notes.length).toBeGreaterThan(0);
    expect(Math.min(...notes)).toBe(1);
    // "From the third part, the text you read comes with questions", and never before.
    const asked = c1.filter((l) => (l.read?.questions?.length ?? 0) > 0).map((l) => parts.indexOf(l.part));
    expect(asked.length).toBeGreaterThan(0);
    expect(Math.min(...asked)).toBe(2);
    // "Most take about thirty-five minutes, and a writing lesson about fifty."
    const plain = c1.filter((l) => !l.write).map(lessonMinutes);
    const writing = c1.filter((l) => l.write).map(lessonMinutes);
    const near = plain.filter((m) => Math.abs(m - 35) <= 7);
    expect(near.length * 2).toBeGreaterThan(plain.length);
    for (const m of writing) expect(Math.abs(m - 50)).toBeLessThanOrEqual(7);
  });
});
