import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { forgetSettings, SETTING_KEYS, writeSetting } from "@/lib/settings/store";
import { PROGRAMMES } from "@/lib/course";
import { choosePart, forgetRehoming, highestPartFor, movedBackFrom, programmeFor } from "./course";
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
const THEIRS = "itest-owner-rehome-2";
const b1 = PROGRAMMES.filter((p) => p.level === "B1");
const a2 = PROGRAMMES.filter((p) => p.level === "A2");

async function wipe() {
  await prisma.courseStep.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
  await prisma.setting.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
  forgetSettings(MINE);
  forgetSettings(THEIRS);
  forgetRehoming();
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

  it("stays on a part they chose after their old ticks on it, without finishing the one before", async () => {
    // Sent back to B1.1, a few evenings in, then skipped ahead to B1.2 by hand or through an offer.
    await prisma.courseStep.createMany({
      data: [
        { ...oldTick(b1[1]!.id), createdAt: new Date("2026-09-01T10:00:00Z") },
        { ownerId: MINE, programmeId: b1[0]!.id, dayId: b1[0]!.days[0]!.id, stepId: b1[0]!.days[0]!.steps[0]!.id },
      ],
    });
    await writeSetting(MINE, SETTING_KEYS.programme, b1[1]!.id);
    await writeSetting(MINE, SETTING_KEYS.programmeChosenAt, new Date("2026-10-29T10:00:00Z").toISOString());
    expect((await programmeFor(MINE))?.id).toBe(b1[1]!.id);
  });

  it("but a choice older than the old ticks is not a choice made since the switch", async () => {
    await prisma.courseStep.create({ data: { ...oldTick(b1[1]!.id), createdAt: new Date("2026-09-01T10:00:00Z") } });
    await writeSetting(MINE, SETTING_KEYS.programme, b1[1]!.id);
    await writeSetting(MINE, SETTING_KEYS.programmeChosenAt, new Date("2026-08-01T10:00:00Z").toISOString());
    expect((await programmeFor(MINE))?.id).toBe(b1[0]!.id);
  });

  it("counts the old evenings as above the lessons, so a refresher in A2 is not a trap", async () => {
    await prisma.courseStep.create({ data: oldTick(b1[2]!.id) });
    // Stepping up from the first A2 part to the second would ask for its check; somebody who walked the old B1 is not asked.
    expect(await moveBlockedFor(MINE, a2[0]!, a2[1]!)).toBeNull();
  });

  it("lets a learner placed at B1 who took the A2 refresher go back up the way they came", async () => {
    // Placed at B1 and worked a lesson there, then stepped down to A2 to refresh it.
    const day = b1[0]!.days[0]!;
    await prisma.courseStep.create({ data: { ownerId: MINE, programmeId: b1[0]!.id, dayId: day.id, stepId: day.steps[0]!.id } });
    // Back up to B1 asks no A2 check: they have been there.
    expect(await moveBlockedFor(MINE, a2[0]!, b1[0]!)).toBeNull();
    // And A2's own parts on the way are not a trap either.
    expect(await moveBlockedFor(MINE, a2[0]!, a2[1]!)).toBeNull();
    // Further up than they have ever worked is still held.
    expect(await moveBlockedFor(MINE, a2[0]!, b1[2]!)).not.toBeNull();
  });

  it("lets a learner placed at B1 who stepped down before ticking anything go back up", async () => {
    // Placed on B1.1 by first run, then straight down to A2 from Settings: no tick anywhere.
    await choosePart(MINE, b1[0]!.id);
    forgetSettings(MINE);
    await choosePart(MINE, a2[0]!.id);
    forgetSettings(MINE);
    expect(await moveBlockedFor(MINE, a2[0]!, b1[0]!)).toBeNull();
    expect(await moveBlockedFor(MINE, a2[0]!, a2[1]!)).toBeNull();
    // Further up than they have ever been placed is still held.
    expect(await moveBlockedFor(MINE, a2[0]!, b1[1]!)).not.toBeNull();
  });

  it("keeps that way up once a restart of the part has deleted the ticks up there", async () => {
    const day = b1[0]!.days[0]!;
    await choosePart(MINE, b1[0]!.id);
    await prisma.courseStep.create({ data: { ownerId: MINE, programmeId: b1[0]!.id, dayId: day.id, stepId: day.steps[0]!.id } });
    forgetSettings(MINE);
    await choosePart(MINE, a2[0]!.id);
    // Going back up restarts B1.1, which deletes the very tick the old exemption read.
    await prisma.courseStep.deleteMany({ where: { ownerId: MINE, programmeId: b1[0]!.id } });
    forgetSettings(MINE);
    expect(await moveBlockedFor(MINE, a2[0]!, b1[0]!)).toBeNull();
  });

  it("never lowers the furthest part on a step down", async () => {
    await choosePart(MINE, b1[1]!.id);
    forgetSettings(MINE);
    await choosePart(MINE, a2[0]!.id);
    forgetSettings(MINE);
    expect((await highestPartFor(MINE))?.id).toBe(b1[1]!.id);
  });

  it("holds a learner who has only ever worked in A2 to its checks", async () => {
    const day = a2[0]!.days[0]!;
    await prisma.courseStep.create({ data: { ownerId: MINE, programmeId: a2[0]!.id, dayId: day.id, stepId: day.steps[0]!.id } });
    expect(await moveBlockedFor(MINE, a2[0]!, a2[1]!)).not.toBeNull();
  });

  it("settles a learner once, and asks again after their restore, and only theirs", async () => {
    for (const who of [MINE, THEIRS]) await writeSetting(who, SETTING_KEYS.programme, b1[2]!.id);
    // No old ticks: both settled where they are.
    expect((await programmeFor(MINE))?.id).toBe(b1[2]!.id);
    expect((await programmeFor(THEIRS))?.id).toBe(b1[2]!.id);
    // Old ticks arrive, as a restore brings them. Settled, neither is asked again.
    await prisma.courseStep.createMany({ data: [oldTick(b1[2]!.id), { ...oldTick(b1[2]!.id), ownerId: THEIRS }] });
    expect((await programmeFor(MINE))?.id).toBe(b1[2]!.id);
    // The restore forgets its own learner, who is moved; the other stays settled.
    forgetRehoming(MINE);
    expect((await programmeFor(MINE))?.id).toBe(b1[0]!.id);
    expect((await programmeFor(THEIRS))?.id).toBe(b1[2]!.id);
  });

  it("places a learner whose stored part no build holds, rather than reading it as off", async () => {
    await writeSetting(MINE, SETTING_KEYS.programme, "b9.9-gone");
    const part = await programmeFor(MINE);
    expect(part).not.toBeNull();
    expect(PROGRAMMES.some((p) => p.id === part!.id)).toBe(true);
  });

  it("reads a learner who never pressed Start off the part they last ticked", async () => {
    await prisma.courseStep.create({ data: { ownerId: MINE, programmeId: a2[1]!.id, dayId: a2[1]!.days[0]!.id, stepId: a2[1]!.days[0]!.steps[0]!.id } });
    expect((await programmeFor(MINE))?.id).toBe(a2[1]!.id);
  });

  it("says who was moved back and from where, and nothing for anybody else", async () => {
    await writeSetting(MINE, SETTING_KEYS.programme, b1[2]!.id);
    await prisma.courseStep.create({ data: oldTick(b1[2]!.id) });
    expect(await movedBackFrom(MINE)).toEqual({ from: b1[2], to: b1[0] });
    await writeSetting(THEIRS, SETTING_KEYS.programme, b1[2]!.id);
    expect(await movedBackFrom(THEIRS)).toBeNull();
  });
});
