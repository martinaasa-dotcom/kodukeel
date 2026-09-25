import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/auth/mode";
import { SYLLABUS } from "@/lib/collections/syllabus";

/**
 * The class actions, against the real functions: an argument off the wire is
 * refused rather than thrown, and an archived class takes no more work.
 * Local mode resolves the owner, so every row here is the local learner's and
 * the cleanup is keyed on this file's own class code.
 */

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { archiveClassroom, assignHomework, assignUnit, classworkHistory, leaveClassroom } = await import("./actions");

const CODE = "ZZTSTQ";

async function wipe() {
  const rooms = await prisma.classroom.findMany({ where: { code: CODE }, select: { id: true } });
  const ids = rooms.map((r) => r.id);
  await prisma.task.deleteMany({ where: { ownerId: LOCAL_USER_ID, notes: { contains: "itest-class-actions" } } });
  await prisma.classroomMember.deleteMany({ where: { classroomId: { in: ids } } });
  await prisma.classroom.deleteMany({ where: { id: { in: ids } } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

async function room(archived: boolean) {
  const created = await prisma.classroom.create({
    data: { ownerId: LOCAL_USER_ID, name: "itest class", code: CODE, archived },
  });
  await prisma.classroomMember.create({
    data: { classroomId: created.id, ownerId: LOCAL_USER_ID, displayName: "Teacher" },
  });
  return created;
}

describe("class actions", () => {
  it("refuse an argument that is not an id rather than throwing", async () => {
    expect((await leaveClassroom(42)).ok).toBe(false);
    expect((await archiveClassroom({})).ok).toBe(false);
    expect((await assignUnit(null, "x")).ok).toBe(false);
    expect((await assignHomework(7, "t", "n")).ok).toBe(false);
    expect(await classworkHistory([])).toEqual([]);
  });

  it("give an archived class no more work", async () => {
    const archived = await room(true);
    const unit = SYLLABUS[0]!.id;
    expect((await assignUnit(archived.id, unit)).ok).toBe(false);
    expect((await assignHomework(archived.id, "Read", "itest-class-actions")).ok).toBe(false);
  });
});
