import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setTaskDone } from "./tasks";

/**
 * Ticking an assigned task, against a real database, because the fault was in
 * what the row held when the press arrived: a toggle reads it and writes the
 * opposite, which is wrong the moment the screen and the row disagree.
 */

const MINE = "itest-owner-tasks";
const THEIRS = "itest-owner-tasks-other";

async function wipe() {
  await prisma.task.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

/** What the action did before: read, then write the opposite. */
async function oldToggle(ownerId: string, id: string) {
  const task = await prisma.task.findFirstOrThrow({ where: { id, ownerId }, select: { completed: true } });
  await prisma.task.update({
    where: { id },
    data: { completed: !task.completed, completedAt: task.completed ? null : new Date() },
  });
}

describe("why the tick says which state it wants", () => {
  it("a toggle from a stale screen unticks homework that was already handed in", async () => {
    const task = await prisma.task.create({ data: { ownerId: MINE, title: "Read chapter 3" } });
    await setTaskDone(MINE, task.id, true); // ticked on the phone
    await oldToggle(MINE, task.id); // the laptop still shows it undone
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).completed).toBe(false);
  });
});

describe("setTaskDone", () => {
  it("leaves a task ticked, and when it was ticked, when asked to tick it again", async () => {
    const task = await prisma.task.create({ data: { ownerId: MINE, title: "Read chapter 3" } });
    const first = new Date(Date.UTC(2026, 8, 1, 18));
    expect(await setTaskDone(MINE, task.id, true, first)).toBe(true);
    expect(await setTaskDone(MINE, task.id, true, new Date(Date.UTC(2026, 8, 2, 9)))).toBe(true);
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
      .toMatchObject({ completed: true, completedAt: first });
  });

  it("unticks and clears the time when asked to", async () => {
    const task = await prisma.task.create({ data: { ownerId: MINE, title: "Read chapter 3", completed: true, completedAt: new Date() } });
    expect(await setTaskDone(MINE, task.id, false)).toBe(true);
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
      .toMatchObject({ completed: false, completedAt: null });
  });

  it("holds under presses landing together", async () => {
    const task = await prisma.task.create({ data: { ownerId: MINE, title: "Read chapter 3" } });
    await Promise.all(Array.from({ length: 6 }, () => setTaskDone(MINE, task.id, true)));
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).completed).toBe(true);
  });

  it("touches nothing of somebody else's", async () => {
    const theirs = await prisma.task.create({ data: { ownerId: THEIRS, title: "Theirs" } });
    expect(await setTaskDone(MINE, theirs.id, true)).toBe(false);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: theirs.id } })).completed).toBe(false);
  });
});
