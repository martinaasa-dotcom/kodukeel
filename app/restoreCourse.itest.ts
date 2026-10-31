import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
// This file restores more often than a minute's allowance; what it asks is where the course lands, not the throttle.
vi.mock("@/lib/usage/sharedThrottle", () => ({ throttleShared: async () => null }));
const OWNER = "itest-restore-course";
vi.mock("@/lib/auth/session", async (real) => ({
  ...(await real<typeof import("@/lib/auth/session")>()),
  requireUserId: async () => OWNER,
}));

import { prisma } from "@/lib/db";
import { restoreBackup } from "@/app/actions";
import { forgetSettings, SETTING_KEYS } from "@/lib/settings/store";
import { PROGRAMMES, programmeById } from "@/lib/course";
import { moveBlockedFor } from "@/lib/progress/checks";
import { forgetRehoming, movedBackFrom } from "@/lib/progress/course";

/**
 * A backup's place in the course is held to the checks, from where the learner
 * stood before the restore. Somebody still placing (no evening ever ticked) is
 * open, as first run is; somebody climbing the lessons is not, or a file is a
 * way past every check at once.
 */

async function wipe() {
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
}

beforeEach(wipe);
afterAll(wipe);

const at = new Date(Date.now() - 60_000).toISOString();

function file(): string {
  return JSON.stringify({
    format: "kodukeel-v1",
    exportedAt: at,
    lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
    settings: [{ ownerId: "x", key: SETTING_KEYS.programme, value: "a1.3" }],
    courseSteps: [
      { ownerId: "x", programmeId: "a1.1", dayId: "a1-01-hello", stepId: "lesson", createdAt: at },
      { ownerId: "x", programmeId: "a1.3", dayId: "a1-18-days", stepId: "lesson", createdAt: at },
    ],
  });
}

async function setting(key: string) {
  return (await prisma.setting.findUnique({ where: { ownerId_key: { ownerId: OWNER, key } } }))?.value ?? null;
}

async function part() {
  return setting(SETTING_KEYS.programme);
}

describe("a restored place in the course", () => {
  it("comes back whole onto an account that has only been through first run", async () => {
    // First run sets the first part and nothing else.
    await prisma.setting.create({ data: { ownerId: OWNER, key: SETTING_KEYS.programme, value: "a1.1" } });
    const out = await restoreBackup(file(), "merge");
    expect(out).toEqual(expect.objectContaining({ ok: true }));
    expect(await part()).toBe("a1.3");
    const ticks = await prisma.courseStep.findMany({ where: { ownerId: OWNER }, select: { programmeId: true } });
    expect(ticks.map((t) => t.programmeId).sort()).toEqual(["a1.1", "a1.3"]);
  });

  it("moves a backup made on the old B1 back to the first lesson of B1, as a learner already here would be", async () => {
    // A backup from before B1 became lessons: the part the learner was on, and ticks on day ids it no longer has.
    const old = JSON.stringify({
      format: "kodukeel-v1",
      exportedAt: at,
      lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
      settings: [{ ownerId: "x", key: SETTING_KEYS.programme, value: "b1.3" }],
      courseSteps: [{ ownerId: "x", programmeId: "b1.3", dayId: "b1.3-05", stepId: "meet", createdAt: at }],
    });
    const out = await restoreBackup(old, "replace");
    expect(out).toEqual(expect.objectContaining({ ok: true }));
    // Not b1.3, whose lessons assume two parts the learner never had.
    expect(await part()).toBe("b1.1");
    // And the old part is kept as how far they got, since its ticks are not: a
    // refresher in A2 does not then hold them behind A2's checks.
    expect(await setting(SETTING_KEYS.highestPart)).toBe("b1.3");
    forgetSettings(OWNER);
    const a2 = PROGRAMMES.filter((p) => p.level === "A2");
    expect(await moveBlockedFor(OWNER, a2[0]!, programmeById("b1.1")!)).toBeNull();
  });

  it("moves a backup made on the old B2 back to the first lesson of B2, the same way", async () => {
    // B2 became lessons after B1 did, and its old parts were b2.1 to b2.3.
    const old = JSON.stringify({
      format: "kodukeel-v1",
      exportedAt: at,
      lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
      settings: [{ ownerId: "x", key: SETTING_KEYS.programme, value: "b2.3" }],
      courseSteps: [{ ownerId: "x", programmeId: "b2.3", dayId: "b2.3-05", stepId: "meet", createdAt: at }],
    });
    const out = await restoreBackup(old, "replace");
    expect(out).toEqual(expect.objectContaining({ ok: true }));
    expect(await part()).toBe("b2.1");
    expect(await setting(SETTING_KEYS.highestPart)).toBe("b2.3");
  });

  it("tells the learner a restore moved back why they are on the first lesson", async () => {
    const old = JSON.stringify({
      format: "kodukeel-v1",
      exportedAt: at,
      lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
      settings: [{ ownerId: "x", key: SETTING_KEYS.programme, value: "b1.3" }],
      courseSteps: [{ ownerId: "x", programmeId: "b1.3", dayId: "b1.3-05", stepId: "meet", createdAt: at }],
    });
    expect(await restoreBackup(old, "replace")).toEqual(expect.objectContaining({ ok: true }));
    forgetSettings(OWNER);
    forgetRehoming();
    expect(await movedBackFrom(OWNER)).toEqual({ from: programmeById("b1.3"), to: programmeById("b1.1") });
  });

  it("reads a backup from before the switch by the rule a learner here is read by", async () => {
    // A part chosen after the old ticks on it stays chosen, in a file as in the app.
    const later = new Date(Date.now() - 30_000).toISOString();
    const chosen = JSON.stringify({
      format: "kodukeel-v1",
      exportedAt: at,
      lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
      settings: [
        { ownerId: "x", key: SETTING_KEYS.programme, value: "b1.3" },
        { ownerId: "x", key: SETTING_KEYS.programmeChosenAt, value: later },
      ],
      courseSteps: [{ ownerId: "x", programmeId: "b1.3", dayId: "b1.3-05", stepId: "meet", createdAt: at }],
    });
    expect(await restoreBackup(chosen, "replace")).toEqual(expect.objectContaining({ ok: true }));
    expect(await part()).toBe("b1.3");
    await wipe();
    // And somebody who finished the part before it in the new lessons stays where they moved on to.
    const b11 = programmeById("b1.1")!;
    const lastDay = b11.days.at(-1)!;
    const finished = JSON.stringify({
      format: "kodukeel-v1",
      exportedAt: at,
      lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
      settings: [{ ownerId: "x", key: SETTING_KEYS.programme, value: "b1.2" }],
      courseSteps: [
        { ownerId: "x", programmeId: "b1.2", dayId: "b1.2-05", stepId: "meet", createdAt: at },
        { ownerId: "x", programmeId: "b1.1", dayId: lastDay.id, stepId: lastDay.steps[0]!.id, createdAt: at },
      ],
    });
    expect(await restoreBackup(finished, "replace")).toEqual(expect.objectContaining({ ok: true }));
    expect(await part()).toBe("b1.2");
  });

  it("does not take a file's furthest part past the checks", async () => {
    await prisma.setting.create({ data: { ownerId: OWNER, key: SETTING_KEYS.programme, value: "a1.1" } });
    await prisma.courseStep.create({ data: { ownerId: OWNER, programmeId: "a1.1", dayId: "a1-01-hello", stepId: "lesson" } });
    const forged = JSON.stringify({
      format: "kodukeel-v1",
      exportedAt: at,
      lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
      settings: [{ ownerId: "x", key: SETTING_KEYS.highestPart, value: "c1.1" }],
      courseSteps: [],
    });
    expect(await restoreBackup(forged, "merge")).toEqual(expect.objectContaining({ ok: true }));
    expect(await setting(SETTING_KEYS.highestPart)).not.toBe("c1.1");
  });

  it("is held to the checks for somebody already climbing", async () => {
    await prisma.setting.create({ data: { ownerId: OWNER, key: SETTING_KEYS.programme, value: "a1.1" } });
    await prisma.courseStep.create({ data: { ownerId: OWNER, programmeId: "a1.1", dayId: "a1-01-hello", stepId: "lesson" } });
    const out = await restoreBackup(file(), "merge");
    expect(out).toEqual(expect.objectContaining({ ok: true }));
    expect(await part()).toBe("a1.1");
    const ticks = await prisma.courseStep.findMany({ where: { ownerId: OWNER }, select: { programmeId: true } });
    expect(ticks.map((t) => t.programmeId)).toEqual(["a1.1"]);
  });
});
