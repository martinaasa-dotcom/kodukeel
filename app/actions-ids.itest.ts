import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

/**
 * The exported actions, called the way a stranger can call them.
 *
 * Every export of `app/actions.ts` is a public endpoint and its arguments are
 * JSON off the wire, so a parameter typed `string` arrives as whatever the
 * caller sent. Handed to Prisma unchecked, an object is not a value but a
 * filter: `{ id: {} }` matches every row, so `deleteCard({})` emptied the
 * caller's whole deck, and `assignHomework({}, ...)` read the members of every
 * class on the deployment and wrote a task into each of their lists. Anything
 * else that is not a string is a `PrismaClientValidationError`, which the
 * framework answers with a 500 where the honest answer is a refusal.
 *
 * Only the session is stubbed, since that is the one thing a test cannot
 * produce; every query below runs against the real database.
 */

let who = "";
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth/session", () => ({
  requireUserId: async () => who,
  currentLearner: async () => ({ name: "A learner" }),
}));

const TEACHER = "itest-actions-teacher";
const STRANGER = "itest-actions-stranger";
const PUPIL = "itest-actions-pupil";
const OWNERS = [TEACHER, STRANGER, PUPIL];
const LEMMA = "zzactionsword";

async function wipe() {
  await prisma.task.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.scan.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.studyEvent.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.classroom.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.review.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.starredWord.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

/** A word of this test's own, spelled so nobody could mistake it for Estonian. */
async function word() {
  return prisma.lexeme.create({ data: { lemma: LEMMA, pos: "NOUN", translation: "a test word" } });
}

async function cardsFor(ownerId: string, lexemeId: string, n: number) {
  await prisma.card.createMany({
    data: Array.from({ length: n }, (_, i) => ({
      ownerId, lexemeId, cardType: "RECOGNITION", front: `f${i}`, back: "b", due: new Date(),
    })),
  });
  return prisma.card.findMany({ where: { ownerId }, orderBy: { id: "asc" } });
}

beforeEach(async () => { await wipe(); who = TEACHER; });
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("an id that is not a string", () => {
  it("does not reach another teacher's class through a filter object", async () => {
    await prisma.classroom.create({
      data: {
        name: "Mine", code: "ITACT-MINE", ownerId: TEACHER,
        members: { create: { ownerId: TEACHER, role: "TEACHER", displayName: "T" } },
      },
    });
    await prisma.classroom.create({
      data: {
        name: "Theirs", code: "ITACT-THEIRS", ownerId: STRANGER,
        members: {
          create: [
            { ownerId: STRANGER, role: "TEACHER", displayName: "S" },
            { ownerId: PUPIL, displayName: "P" },
          ],
        },
      },
    });
    const a = await import("@/app/actions");

    const homework = await a.assignHomework({} as never, "Not your homework", "");
    const unit = await a.assignUnit({ not: "" } as never, "tervitused");
    expect(homework.ok).toBe(false);
    expect(unit.ok).toBe(false);
    expect(await prisma.task.count({ where: { ownerId: { in: [STRANGER, PUPIL] } } })).toBe(0);
  });

  it("deletes, suspends and archives nothing when handed a filter object", async () => {
    const entry = await word();
    await cardsFor(TEACHER, entry.id, 3);
    await prisma.classroom.create({ data: { name: "Mine", code: "ITACT-MINE2", ownerId: TEACHER } });
    const a = await import("@/app/actions");

    await a.setCardSuspended({} as never, true);
    await a.deleteCard({} as never);
    await a.archiveClassroom({} as never);
    const left = await prisma.card.findMany({ where: { ownerId: TEACHER } });
    expect(left).toHaveLength(3);
    expect(left.every((c) => !c.suspended)).toBe(true);
    expect(await prisma.classroom.count({ where: { ownerId: TEACHER, archived: true } })).toBe(0);
  });

  it("forgets, renames and deletes none of the caller's pages, events or reminders", async () => {
    await prisma.scan.createMany({
      data: [{ ownerId: TEACHER, title: "one" }, { ownerId: TEACHER, title: "two" }],
    });
    await prisma.studyEvent.createMany({
      data: [
        { ownerId: TEACHER, title: "class", startMinute: 600 },
        { ownerId: TEACHER, title: "tutor", startMinute: 700 },
      ],
    });
    await prisma.task.createMany({
      data: [{ ownerId: TEACHER, title: "a" }, { ownerId: TEACHER, title: "b" }],
    });
    const a = await import("@/app/actions");

    await a.renameScan({} as never, "renamed");
    await a.deleteScan({} as never);
    await a.deleteStudyEvent({} as never);
    await a.deleteReminder({} as never);
    const scans = await prisma.scan.findMany({ where: { ownerId: TEACHER } });
    expect(scans.map((s) => s.title).sort()).toEqual(["one", "two"]);
    expect(await prisma.studyEvent.count({ where: { ownerId: TEACHER } })).toBe(2);
    expect(await prisma.task.count({ where: { ownerId: TEACHER } })).toBe(2);
  });

  it("refuses rather than throwing", async () => {
    const entry = await word();
    const [card] = await cardsFor(TEACHER, entry.id, 1);
    const a = await import("@/app/actions");

    const calls: [string, () => Promise<{ ok: boolean }>][] = [
      ["gradeCard", () => a.gradeCard(5 as never, 3, 0)],
      ["undoGrade", () => a.undoGrade([] as never, {} as never)],
      ["setCardSuspended", () => a.setCardSuspended(card!.id, "yes" as never)],
      ["translateExample", () => a.translateExample([] as never, "x")],
      ["addExample", () => a.addExample(7 as never, "Mingi lause siin.")],
      ["addToDeck", () => a.addToDeck({} as never, ["RECOGNITION"])],
      ["toggleStar", () => a.toggleStar(9 as never)],
      ["leaveClassroom", () => a.leaveClassroom(7 as never)],
      ["toggleTask", () => a.toggleTask(42 as never)],
      ["replayGrades null", () => a.replayGrades(null as never)],
      ["replayGrades string", () => a.replayGrades("x" as never)],
    ];
    for (const [name, call] of calls) {
      await expect(call(), name).resolves.toMatchObject({ ok: false });
    }
  });
});

describe("undoGrade", () => {
  it("refuses a state whose last review is not a date", async () => {
    const entry = await word();
    const [card] = await cardsFor(TEACHER, entry.id, 1);
    const a = await import("@/app/actions");
    const state = {
      due: "2026-10-01T00:00:00.000Z", stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 1,
      reps: 1, lapses: 0, state: 2, learningSteps: 0, lastReview: "not a date",
    };
    await expect(a.undoGrade(card!.id, state)).resolves.toMatchObject({ ok: false });
  });
});

describe("toggleStar", () => {
  it("refuses a word that is not in the dictionary rather than throwing", async () => {
    const a = await import("@/app/actions");
    await expect(a.toggleStar("no-such-word-anywhere")).resolves.toMatchObject({ ok: false });
  });

  it("survives two presses landing at once", async () => {
    const entry = await word();
    const a = await import("@/app/actions");
    const both = await Promise.allSettled([a.toggleStar(entry.id), a.toggleStar(entry.id)]);
    expect(both.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
  });

  it("does what the press asked for, whatever another tab did first", async () => {
    const entry = await word();
    const a = await import("@/app/actions");
    const star = a.toggleStar as (id: string, want?: boolean) => ReturnType<typeof a.toggleStar>;
    await star(entry.id, true);
    // A second tab still drawing the word unstarred presses to star it.
    await expect(star(entry.id, true)).resolves.toMatchObject({ ok: true, starred: true });
    expect(await prisma.starredWord.count({ where: { ownerId: TEACHER } })).toBe(1);
    await expect(star(entry.id, false)).resolves.toMatchObject({ ok: true, starred: false });
    await expect(star(entry.id, false)).resolves.toMatchObject({ ok: true, starred: false });
    expect(await prisma.starredWord.count({ where: { ownerId: TEACHER } })).toBe(0);
  });
});
