import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { forgetSettings, SETTING_KEYS, writeSetting } from "@/lib/settings/store";
import { PROGRAMMES } from "@/lib/course";
import { programmeFor } from "./course";
import { moveBlockedFor } from "./checks";

/**
 * A LEARNER PART WAY THROUGH THE OLD B1 WHEN IT BECAME LESSONS.
 *
 * B1's parts kept their ids and lost their days, so what says a learner was on
 * the old part is their own ticks: in that part, on day ids it no longer holds.
 * Such a learner starts B1 at its first lesson and is then wherever they have
 * worked since, and their old evenings count as having been above the lessons,
 * so the A2 checks do not hold them on a refresher.
 */

const MINE = "itest-owner-rehome";
const b1 = PROGRAMMES.filter((p) => p.level === "B1");
const a2 = PROGRAMMES.filter((p) => p.level === "A2");

async function wipe() {
  await prisma.courseStep.deleteMany({ where: { ownerId: MINE } });
  await prisma.setting.deleteMany({ where: { ownerId: MINE } });
  forgetSettings(MINE);
}

/** A tick on a day id the part held as unit-built evenings and no longer holds. */
const oldTick = (programmeId: string) => ({ ownerId: MINE, programmeId, dayId: `${programmeId}-05`, stepId: "meet" });

beforeEach(wipe);
afterAll(wipe);

describe("a learner on a part that has become lessons", () => {
  it("is a premise this test can hold: B1 is lessons, and its old day ids are gone", () => {
    expect(b1.length).toBeGreaterThan(2);
    expect(b1.every((p) => p.days.every((d) => d.lesson))).toBe(true);
    expect(b1[2]!.days.some((d) => d.id === `${b1[2]!.id}-05`)).toBe(false);
  });

  it("starts the level at its first lesson, wherever they were on the old part", async () => {
    await writeSetting(MINE, SETTING_KEYS.programme, b1[2]!.id);
    await prisma.courseStep.create({ data: oldTick(b1[2]!.id) });
    expect((await programmeFor(MINE))?.id).toBe(b1[0]!.id);
  });

  it("and is then on the furthest part they have worked in since", async () => {
    await writeSetting(MINE, SETTING_KEYS.programme, b1[2]!.id);
    await prisma.courseStep.createMany({
      data: [oldTick(b1[2]!.id), { ownerId: MINE, programmeId: b1[1]!.id, dayId: b1[1]!.days[0]!.id, stepId: b1[1]!.days[0]!.steps[0]!.id }],
    });
    expect((await programmeFor(MINE))?.id).toBe(b1[1]!.id);
  });

  it("leaves a learner alone who has worked in the new part itself", async () => {
    await writeSetting(MINE, SETTING_KEYS.programme, b1[2]!.id);
    await prisma.courseStep.createMany({
      data: [oldTick(b1[2]!.id), { ownerId: MINE, programmeId: b1[2]!.id, dayId: b1[2]!.days[0]!.id, stepId: b1[2]!.days[0]!.steps[0]!.id }],
    });
    expect((await programmeFor(MINE))?.id).toBe(b1[2]!.id);
  });

  it("stays on the part they moved to after finishing the one before it in the new lessons", async () => {
    // Old ticks on the first two parts sent them back to B1.1; they walked it to its last lesson and moved on to B1.2.
    const last = b1[0]!.days[b1[0]!.days.length - 1]!;
    await writeSetting(MINE, SETTING_KEYS.programme, b1[1]!.id);
    await prisma.courseStep.createMany({
      data: [
        oldTick(b1[0]!.id), oldTick(b1[1]!.id),
        { ownerId: MINE, programmeId: b1[0]!.id, dayId: b1[0]!.days[0]!.id, stepId: b1[0]!.days[0]!.steps[0]!.id },
        { ownerId: MINE, programmeId: b1[0]!.id, dayId: last.id, stepId: last.steps[0]!.id },
      ],
    });
    expect((await programmeFor(MINE))?.id).toBe(b1[1]!.id);
  });

  it("but not while the part before is still under way", async () => {
    await writeSetting(MINE, SETTING_KEYS.programme, b1[1]!.id);
    await prisma.courseStep.createMany({
      data: [oldTick(b1[1]!.id), { ownerId: MINE, programmeId: b1[0]!.id, dayId: b1[0]!.days[0]!.id, stepId: b1[0]!.days[0]!.steps[0]!.id }],
    });
    expect((await programmeFor(MINE))?.id).toBe(b1[0]!.id);
  });

  it("counts the old evenings as above the lessons, so a refresher in A2 is not a trap", async () => {
    await prisma.courseStep.create({ data: oldTick(b1[2]!.id) });
    // Stepping up from the first A2 part to the second would ask for its check; somebody who walked the old B1 is not asked.
    expect(await moveBlockedFor(MINE, a2[0]!, a2[1]!)).toBeNull();
  });
});
