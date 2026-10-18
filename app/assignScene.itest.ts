import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { doneSceneTasks, sceneHomeworkCount, sceneHomeworkDone } from "@/lib/progress/homework";

/**
 * A CONVERSATION SET AS HOMEWORK, AGAINST A REAL DATABASE (FB-6, D4).
 *
 * The task lands on every member, a run finished after it was set makes it
 * done and one finished before does not, a walked-out run is not doing it,
 * the class count moves with nobody ticking anything, and somebody who does
 * not run the class cannot set one. Only the session is stubbed.
 */

let who = "";
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth/session", () => ({
  requireUserId: async () => who,
  currentLearner: async () => ({ name: "A learner" }),
}));

const TEACHER = "itest-scenehw-teacher";
const PUPIL = "itest-scenehw-pupil";
const OTHER = "itest-scenehw-other";
const STRANGER = "itest-scenehw-stranger";
const OWNERS = [TEACHER, PUPIL, OTHER, STRANGER];
const SCENE = "poodi-piima";

async function wipe() {
  await prisma.task.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.sceneRun.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.classroom.deleteMany({ where: { ownerId: { in: OWNERS } } });
}

async function classWithMembers(): Promise<string> {
  const classroom = await prisma.classroom.create({
    data: { name: "Thursday group", code: "SCNHW1", ownerId: TEACHER, kind: "CLASS", targetLevel: "A2" },
  });
  await prisma.classroomMember.createMany({
    data: [TEACHER, PUPIL, OTHER].map((ownerId) => ({ classroomId: classroom.id, ownerId, displayName: ownerId })),
  });
  return classroom.id;
}

async function run(ownerId: string, endedAt: Date | null, outcome = '{"outcome":"done"}') {
  await prisma.sceneRun.create({
    data: { ownerId, sceneId: SCENE, seed: "s", level: "A2", difficulty: 0, outcome, startedAt: new Date(Date.now() - 600_000), endedAt },
  });
}

describe("assignScene", () => {
  beforeEach(wipe);
  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  it("puts the conversation on every member's list, as a conversation", async () => {
    const { assignScene } = await import("@/app/actions");
    const classroomId = await classWithMembers();
    who = TEACHER;
    const result = await assignScene(classroomId, SCENE);
    expect(result).toEqual({ ok: true, assigned: 3 });
    const tasks = await prisma.task.findMany({ where: { ownerId: { in: OWNERS } } });
    expect(tasks.map((t) => t.ownerId).sort()).toEqual([OTHER, PUPIL, TEACHER].sort());
    for (const task of tasks) {
      expect(task.sceneId).toBe(SCENE);
      expect(task.tag).toBe("CONVERSATION");
      expect(task.completed).toBe(false);
    }
  });

  it("refuses a stranger, a scene the catalog does not hold, and an archived class", async () => {
    const { assignScene } = await import("@/app/actions");
    const classroomId = await classWithMembers();
    who = STRANGER;
    expect((await assignScene(classroomId, SCENE)).ok).toBe(false);
    who = TEACHER;
    expect((await assignScene(classroomId, "no-such-scene")).ok).toBe(false);
    expect((await assignScene(classroomId, { id: {} })).ok).toBe(false);
    await prisma.classroom.update({ where: { id: classroomId }, data: { archived: true } });
    expect((await assignScene(classroomId, SCENE)).ok).toBe(false);
    expect(await prisma.task.count({ where: { ownerId: { in: OWNERS } } })).toBe(0);
  });

  it("is done by a run finished after it was set, and not by one before, an open one, or one walked out of", async () => {
    const { assignScene } = await import("@/app/actions");
    const classroomId = await classWithMembers();
    await run(PUPIL, new Date(Date.now() - 60_000));
    who = TEACHER;
    await assignScene(classroomId, SCENE);
    const task = await prisma.task.findFirstOrThrow({ where: { ownerId: PUPIL } });
    expect(await sceneHomeworkDone(PUPIL, task)).toBe(false);

    await run(PUPIL, null);
    await run(PUPIL, new Date(Date.now() + 1000), '{"outcome":"left"}');
    expect(await sceneHomeworkDone(PUPIL, task)).toBe(false);
    expect((await sceneHomeworkCount(classroomId, SCENE, task.createdAt)).done).toBe(0);

    await run(PUPIL, new Date(Date.now() + 2000));
    expect(await sceneHomeworkDone(PUPIL, task)).toBe(true);
    expect([...(await doneSceneTasks(PUPIL, [task]))]).toEqual([task.id]);
    const other = await prisma.task.findFirstOrThrow({ where: { ownerId: OTHER } });
    expect([...(await doneSceneTasks(OTHER, [other]))]).toEqual([]);
  });

  it("counts the class without anybody ticking anything, and counts a learner once", async () => {
    const { assignScene } = await import("@/app/actions");
    const classroomId = await classWithMembers();
    who = TEACHER;
    await assignScene(classroomId, SCENE);
    const mine = await prisma.task.findFirstOrThrow({ where: { ownerId: TEACHER } });
    expect(await sceneHomeworkCount(classroomId, SCENE, mine.createdAt)).toEqual({ done: 0, of: 3 });
    await run(PUPIL, new Date(Date.now() + 1000));
    await run(PUPIL, new Date(Date.now() + 2000));
    await run(OTHER, new Date(Date.now() + 3000));
    await run(STRANGER, new Date(Date.now() + 3000));
    expect(await sceneHomeworkCount(classroomId, SCENE, mine.createdAt)).toEqual({ done: 2, of: 3 });
    expect(await prisma.task.count({ where: { ownerId: { in: OWNERS }, completed: true } })).toBe(0);
  });
});
