import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_PARTS } from "./index";

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
