import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { forgetSettings, SETTING_KEYS, writeSetting } from "@/lib/settings/store";
import { PROGRAMMES } from "@/lib/course";
import { adaptOfferFor, adaptReadingFor } from "./adapt";
import { ladderPosition, openingPartFor, programmeFor } from "./course";
import { recordCourseLevel } from "./level";

/**
 * Where the course opens, and what it offers when the answers say the part is
 * wrong, against a database: both are decided by rows in three tables that a
 * unit test cannot hold together, the settings a learner wrote, the ticks
 * they left on the course and the answers in the review log.
 */

const MINE = "itest-owner-adapt";
const firstOf = (level: string) => PROGRAMMES.find((p) => p.level === level)!;

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: MINE } });
  await prisma.courseStep.deleteMany({ where: { ownerId: MINE } });
  await prisma.setting.deleteMany({ where: { ownerId: MINE } });
  await prisma.assessment.deleteMany({ where: { ownerId: MINE } });
  forgetSettings(MINE);
}

/** Answers in the log, `right` of them Good and the rest Again, spread over the last few days. */
async function answers(total: number, right: number, at = Date.now()) {
  await prisma.review.createMany({
    data: Array.from({ length: total }, (_, i) => ({
      ownerId: MINE,
      cardId: randomUUID(),
      rating: i < right ? 3 : 1,
      reviewedAt: new Date(at - (i + 1) * 60_000),
    })),
  });
}

/** Somebody who said B1 at sign-up, aiming for B2, as first run leaves them. */
async function placedAtB1() {
  await Promise.all([
    recordCourseLevel(MINE, "B1"),
    writeSetting(MINE, SETTING_KEYS.goalTarget, "B2"),
  ]);
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("where the course opens", () => {
  it("is the level after the one somebody says they hold", async () => {
    await placedAtB1();
    expect((await openingPartFor(MINE)).id).toBe(firstOf("B2").id);
    // With nothing stored, following the course falls back to the same part.
    expect((await programmeFor(MINE))?.id).toBe(firstOf("B2").id);
  });

  it("is the level they hold when that is what they are aiming at", async () => {
    await placedAtB1();
    await writeSetting(MINE, SETTING_KEYS.goalTarget, "B1");
    expect((await openingPartFor(MINE)).id).toBe(firstOf("B1").id);
  });

  it("stays on the part somebody was already walking when nothing was stored", async () => {
    // Led here by the old fallback, which named B1.1, with evenings ticked on it.
    await placedAtB1();
    const b1 = firstOf("B1");
    await prisma.courseStep.create({
      data: { ownerId: MINE, programmeId: b1.id, dayId: b1.days[0]!.id, stepId: "meet" },
    });
    expect((await programmeFor(MINE))?.id).toBe(b1.id);
  });

  it("is the first part of A1 for somebody just starting", async () => {
    await recordCourseLevel(MINE, "A1");
    expect((await openingPartFor(MINE)).id).toBe(PROGRAMMES[0]!.id);
  });
});

describe("the climb", () => {
  it("counts the level somebody holds once the course has moved them past it", async () => {
    await placedAtB1();
    await writeSetting(MINE, SETTING_KEYS.programme, firstOf("B2").id);
    const climb = await ladderPosition(MINE, "B2");
    expect(climb.milestones.find((m) => m.level === "B1")?.state).toBe("assumed");
    expect(climb.here?.level).toBe("B2");
  });

  it("does not count it while the course is teaching it again", async () => {
    await placedAtB1();
    await writeSetting(MINE, SETTING_KEYS.programme, firstOf("B1").id);
    const climb = await ladderPosition(MINE, "B1");
    expect(climb.milestones.find((m) => m.level === "B1")?.state).toBe("here");
  });
});

describe("what the course offers somebody struggling", () => {
  it("is the level below, onto its first part, after enough wrong answers", async () => {
    await placedAtB1();
    const b2 = firstOf("B2");
    await writeSetting(MINE, SETTING_KEYS.programme, b2.id);
    await answers(40, 16);
    const fit = await adaptOfferFor(MINE, b2);
    expect(fit.offer?.reading.kind).toBe("struggling");
    expect(fit.offer?.move).toMatchObject({ kind: "down", to: { id: firstOf("B1").id }, held: "A2" });
    expect(fit.tilt).toBe(-1);
  });

  it("is never a part they have already ticked a step of", async () => {
    await placedAtB1();
    const b1 = firstOf("B1");
    const b2 = firstOf("B2");
    await prisma.courseStep.create({
      data: { ownerId: MINE, programmeId: b1.id, dayId: b1.days[0]!.id, stepId: "meet" },
    });
    await answers(40, 10);
    const fit = await adaptOfferFor(MINE, b2);
    expect(fit.offer?.move?.to.id).not.toBe(b1.id);
  });

  it("goes quiet for a week after 'not now', and says the lean is still on", async () => {
    await placedAtB1();
    const b2 = firstOf("B2");
    await answers(40, 10);
    await writeSetting(MINE, SETTING_KEYS.adaptSnoozedUntil, new Date(Date.now() + 86_400_000).toISOString());
    const fit = await adaptOfferFor(MINE, b2);
    expect(fit.offer).toBeNull();
    expect(fit.snoozed).toBe(true);
    expect(fit.tilt).toBe(-1);
  });

  it("reads only the answers since the last move, so a step down is judged on the refresher", async () => {
    await placedAtB1();
    await answers(40, 10, Date.now() - 3_600_000);
    await writeSetting(MINE, SETTING_KEYS.adaptMovedAt, new Date(Date.now() - 60_000).toISOString());
    expect((await adaptReadingFor(MINE)).kind).toBe("unmeasured");
  });
});

describe("what the course offers somebody flying", () => {
  it("is the next part, with the lean the other way", async () => {
    await recordCourseLevel(MINE, "A2");
    const part = firstOf("B1");
    await answers(80, 80);
    const fit = await adaptOfferFor(MINE, part);
    expect(fit.offer?.reading.kind).toBe("flying");
    expect(fit.offer?.move).toMatchObject({ kind: "ahead" });
    expect(fit.tilt).toBe(1);
  });

  it("offers nothing at all to somebody steady", async () => {
    await answers(60, 48);
    const fit = await adaptOfferFor(MINE, PROGRAMMES[0]!);
    expect(fit.offer).toBeNull();
    expect(fit.tilt).toBe(0);
  });
});
