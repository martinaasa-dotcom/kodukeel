import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { rosterClassFor } from "@/lib/classroom/poster";
import { termRange } from "@/lib/classroom/term";
import { dayClock } from "@/lib/time/day";
import { classTermFigures } from "./term";

/**
 * The end-of-term page against a real Postgres: who may open it, and that
 * nothing about one learner leaves the queries behind it.
 *
 * The page renders `classTermFigures` and the class's own name and nothing
 * else, so the second half is asserted on that data. The two learners carry
 * names nobody would write by accident, and the whole of what the page is
 * handed is searched for them, and for their ids.
 */

const TEACHER = "itest-term-teacher";
const PUPIL_A = "itest-term-pupil-a";
const PUPIL_B = "itest-term-pupil-b";
const PUPIL_C = "itest-term-pupil-c";
const EVERYONE = [TEACHER, PUPIL_A, PUPIL_B, PUPIL_C];
const NAMES = ["Zirgulvana Quostmere", "Pelvoreth Ankvillast", "Drumolaine Vesquith"];

let classroomId = "";
let workplaceId = "";
let lexemeId = "";
const clock = dayClock("Europe/Tallinn");

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: EVERYONE } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: EVERYONE } } });
  await prisma.classroom.deleteMany({ where: { ownerId: TEACHER } });
  await prisma.lexeme.deleteMany({ where: { lemma: "itestterminsana" } });
}

async function history(ownerId: string, rating: number, targetCase: string, days: number[]) {
  const card = await prisma.card.create({
    data: { ownerId, lexemeId, cardType: "CASE_FORM", front: "f", back: "b", targetCase, state: 2 },
  });
  const now = Date.now();
  await prisma.review.createMany({
    data: days.flatMap((d) => Array.from({ length: 4 }, (_, i) => ({
      ownerId, cardId: card.id, lexemeId, rating, stateBefore: 2, targetCase,
      reviewedAt: new Date(now - d * 86_400_000 - i * 60_000),
    }))),
  });
}

beforeEach(async () => {
  await wipe();
  const lexeme = await prisma.lexeme.create({
    data: { lemma: "itestterminsana", pos: "NOUN", translation: "test word", cefr: "B1" },
  });
  lexemeId = lexeme.id;
  const members = [
    { ownerId: TEACHER, role: "TEACHER", displayName: "Teacher" },
    { ownerId: PUPIL_A, displayName: NAMES[0]! },
    { ownerId: PUPIL_B, displayName: NAMES[1]! },
    { ownerId: PUPIL_C, displayName: NAMES[2]! },
  ];
  classroomId = (await prisma.classroom.create({
    data: { name: "Term class", code: "ITTRM1", ownerId: TEACHER, members: { create: members } },
  })).id;
  workplaceId = (await prisma.classroom.create({
    data: { name: "Term group", code: "ITTRM2", ownerId: TEACHER, kind: "WORKPLACE", targetLevel: "B1", members: { create: members } },
  })).id;
  for (const pupil of [PUPIL_A, PUPIL_B, PUPIL_C]) {
    await history(pupil, 1, "PARTITIVE", [70, 75]);
    await history(pupil, 3, "PARTITIVE", [3, 5]);
  }
  await history(TEACHER, 1, "ELATIVE", [2, 4, 70, 72]);
});

afterAll(wipe);

describe("who may open a class's term report", () => {
  it("is the owner, and a member who does not run the class gets the stranger's not-found", async () => {
    expect(await rosterClassFor(TEACHER, classroomId)).not.toBeNull();
    expect(await rosterClassFor(PUPIL_A, classroomId)).toBeNull();
    expect(await rosterClassFor("itest-term-stranger", classroomId)).toBeNull();
    expect(await rosterClassFor(TEACHER, "not-a-class")).toBeNull();
  });
});

describe("what the report is handed", () => {
  it("counts the class, leaves the teacher out, and holds no learner's name or id", async () => {
    const range = termRange(undefined, undefined, clock);
    const figures = await classTermFigures(classroomId, TEACHER, range, clock, { cases: true });
    expect(figures.everActive).toBe(3);
    expect(figures.totalReviews).toBe(3 * 16);
    expect(figures.periods.reduce((s, p) => s + p.reviews, 0)).toBe(48);
    const partitive = figures.cases.find((c) => c.grammCase === "PARTITIVE");
    expect(partitive).toEqual({ grammCase: "PARTITIVE", start: 0, end: 100, change: 100 });
    // The teacher's own wrong elative answers are not the class's.
    expect(figures.cases.some((c) => c.grammCase === "ELATIVE")).toBe(false);
    const handed = JSON.stringify(figures);
    for (const needle of [...NAMES, PUPIL_A, PUPIL_B, PUPIL_C, TEACHER]) expect(handed).not.toContain(needle);
  });

  it("reads no case at all for a workplace group", async () => {
    const range = termRange(undefined, undefined, clock);
    const figures = await classTermFigures(workplaceId, TEACHER, range, clock, { cases: false });
    expect(figures.everActive).toBe(3);
    expect(figures.cases).toEqual([]);
  });
});
