import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_PARTS, type LessonSpec } from "./index";
import { PREVIEW_LESSONS, PREVIEW_PARTS } from "./preview";
import { B2_LESSONS, B2_LESSON_PARTS } from "./b2";
import { B2_FASTER, B2_PREPARE, b2Band, b2RampProblems } from "./rampB2";

/**
 * B1'S RAMP TABLE, THE ROWS A MACHINE CAN READ (docs/reviews/b1-cast.md).
 *
 * `levelContractProblems` holds the retell and the writing to never falling
 * from one part to the next, which is the shape and not the table. These are
 * the table's own numbers, per part: how long the story to retell is, how
 * many words the writing asks, and the room the hidden conversation is heard
 * in. The rows no field records (two patterns combined in one rework, the
 * kinds of hear-first question, a listening that is not a conversation) are
 * the authors' rule, read when a lesson is written, and the table says so.
 */
const PARTS = LESSON_PARTS.filter((p) => p.level === "B1");
const inPart = (n: number) => LESSONS.filter((l) => l.part === PARTS[n - 1]!.id);

/** The story to retell, in sentences, by part: 4 or 5, then 5 or 6, then 6 to 8. */
const RETELL: Readonly<Record<number, readonly [number, number]>> = { 1: [4, 5], 2: [4, 5], 3: [5, 6], 4: [5, 6], 5: [6, 8], 6: [6, 8], 7: [6, 8] };
/** The least the writing asks, by part: 40, 50, 60, 70, 80, 90, 100. */
const WRITE: Readonly<Record<number, number>> = { 1: 40, 2: 50, 3: 60, 4: 70, 5: 80, 6: 90, 7: 100 };

describe("B1's ramp", () => {
  it("has the seven parts the table is written for", () => {
    expect(PARTS).toHaveLength(7);
  });

  it("retells a story of the table's length in every part", () => {
    let seen = 0;
    for (let n = 1; n <= 7; n++) {
      const [least, most] = RETELL[n]!;
      for (const lesson of inPart(n)) {
        if (!lesson.retell) continue;
        seen += 1;
        expect(lesson.retell.story.length, lesson.id).toBeGreaterThanOrEqual(least);
        expect(lesson.retell.story.length, lesson.id).toBeLessThanOrEqual(most);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(14);
  });

  it("asks at least the table's words of the writing in every part", () => {
    for (let n = 1; n <= 7; n++) {
      const writes = inPart(n).filter((l) => l.write);
      expect(writes.length, `part ${n}`).toBeGreaterThan(0);
      for (const lesson of writes) expect(lesson.write!.least, lesson.id).toBeGreaterThanOrEqual(WRITE[n]!);
    }
  });

  it("hears the conversation in a quiet room in parts 1 and 2, somewhere the story is from part 3, and sped up once a part from part 5", () => {
    for (let n = 1; n <= 7; n++) {
      const rooms = inPart(n).flatMap((l) => (l.hearing ? [l.hearing] : []));
      if (n <= 2) expect(rooms, `part ${n}`).toEqual([]);
      else expect(rooms.some((r) => r === "phone" || r === "cafe"), `part ${n}`).toBe(true);
      if (n >= 5) expect(rooms.filter((r) => r === "quick").length, `part ${n}`).toBeGreaterThanOrEqual(1);
    }
  });
});

/**
 * B2'S RAMP (docs/43-lessons.md §13.5, `rampB2.ts`), over every B2 part there
 * is, the course's and the preview's, in teaching order. With no B2 part yet
 * this asks nothing of the data, which is the state before the parts are
 * written; the rules themselves are asked both ways on parts made here, so a
 * rule that stops firing fails today rather than the day a part breaks it.
 */
describe("B2's ramp", () => {
  // The course's, `b2.ts`'s until it is in the course, and the preview's, once each.
  const once = <T extends { id: string }>(list: readonly T[]) => [...new Map(list.map((x) => [x.id, x])).values()];
  const b2Parts = once([...LESSON_PARTS, ...B2_LESSON_PARTS, ...PREVIEW_PARTS]).filter((p) => p.level === "B2");
  const b2Lessons = once([...LESSONS, ...B2_LESSONS, ...PREVIEW_LESSONS]).filter((l) => l.level === "B2");

  it("holds every B2 part written so far", () => {
    expect(b2RampProblems(b2Lessons, b2Parts)).toEqual([]);
  });

  it("leaves A1 to B1 alone", () => {
    expect(b2RampProblems(LESSONS, LESSON_PARTS)).toEqual([]);
  });

  /*
    Eight parts of two lessons each, made from a B1 lesson that is heard first
    and a B1 part's end, each set to what its band asks: the conversation's
    room, the story's hearings, the race's windows and a text to read.
  */
  const heard = LESSONS.find((l) => l.level === "B1" && l.listenFor && l.retell && !l.faster)!;
  const raced = LESSONS.find((l) => l.level === "B1" && l.faster)!;
  const end = LESSONS.find((l) => l.level === "B1" && l.kind === "partEnd")!;
  const read = { genre: "a notice", lines: [{ et: "Tere.", en: "Hello." }] };
  const parts = Array.from({ length: 8 }, (_, i) => ({ id: `t${i + 1}`, level: "B2" as const, title: `Part ${i + 1}`, about: "A test part." }));
  const room = (band: number) => (band === 1 ? undefined : band === 3 ? "half" as const : "phone" as const);
  const lessonsFor = (n: number): LessonSpec[] => {
    const band = b2Band(n);
    const base = { level: "B2" as const, part: `t${n}`, read };
    return [
      { ...heard, ...base, id: `t${n}-a`, hearing: room(band), retell: { ...heard.retell!, hearings: band === 1 ? undefined : 1 as const } },
      { ...raced, ...base, id: `t${n}-b`, retell: undefined, hearing: room(band), faster: { ...raced.faster!, seconds: band === 1 ? undefined : B2_FASTER[band], prepare: band === 4 ? B2_PREPARE : undefined } },
      { ...end, ...base, id: `t${n}-c`, hearing: room(band), read: undefined },
    ];
  };
  const good = parts.flatMap((_, i) => lessonsFor(i + 1));

  it("passes a level built to the table", () => {
    expect(b2RampProblems(good, parts)).toEqual([]);
  });

  const broken = (n: number, change: (l: LessonSpec) => LessonSpec) =>
    b2RampProblems(good.map((l) => (l.part === `t${n}` ? change(l) : l)), parts).join(" ");

  it("refuses a room in parts 1 and 2, a quiet room from part 3, and a room other than sped up or joined halfway in parts 5 and 6", () => {
    expect(broken(1, (l) => ({ ...l, hearing: "cafe" }))).toMatch(/part 1 t1, t1-a: heard cafe/);
    expect(broken(3, (l) => ({ ...l, hearing: undefined }))).toMatch(/part 3 t3, t3-a: heard in a quiet room/);
    expect(broken(5, (l) => ({ ...l, hearing: "phone" }))).toMatch(/part 5 t5, t5-a: heard phone/);
    expect(broken(6, (l) => ({ ...l, hearing: "quick" }))).toBe("");
  });

  it("refuses a story heard once in parts 1 and 2, and twice from part 3", () => {
    expect(broken(2, (l) => (l.retell ? { ...l, retell: { ...l.retell, hearings: 1 as const } } : l))).toMatch(/heard once, where parts 1 and 2 hear it twice/);
    expect(broken(4, (l) => (l.retell ? { ...l, retell: { ...l.retell, hearings: undefined } } : l))).toMatch(/from part 3 it is heard once/);
  });

  it("refuses the race's windows off the table, and the exam's preparation anywhere but parts 7 and 8", () => {
    expect(broken(3, (l) => (l.faster ? { ...l, faster: { ...l.faster, seconds: undefined } } : l))).toMatch(/runs 90, 60, 45 seconds, where part 3 runs 60, 45, 30/);
    expect(broken(7, (l) => (l.faster ? { ...l, faster: { ...l.faster, prepare: undefined } } : l))).toMatch(/give the exam's 120/);
    expect(broken(5, (l) => (l.faster ? { ...l, faster: { ...l.faster, prepare: 120 } } : l))).toMatch(/which only the exam's talk/);
  });

  it("refuses a lesson with no text to read, but not a part's last", () => {
    expect(broken(8, (l) => (l.kind === "partEnd" ? l : { ...l, read: undefined }))).toMatch(/t8-a: carries no text to read/);
    expect(broken(8, (l) => (l.kind === "partEnd" ? { ...l, read } : l))).toBe("");
  });
});
