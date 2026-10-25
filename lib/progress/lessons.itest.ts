import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES } from "@/lib/course";
import { checkPaper, courseChecks } from "@/lib/course/checks";
import { writeSetting, SETTING_KEYS } from "@/lib/settings/store";
import { checksPassedFor } from "./checks";
import { checkView, finishLessonFor, submitCheckFor } from "./lessons";

/**
 * A LESSON FINISHED AND A CHECK SAT, THROUGH THE BODY BOTH DOORS CALL
 * (`finishLesson` and `submitCheck` on the web, the v1 lesson and check routes
 * for a native app). Against a real database, namespaced to synthetic owners.
 *
 *   npm run test:db
 */

const OWNER = "itest-owner-lessons";
const OFF = "itest-owner-lessons-off";
const OWNERS = [OWNER, OFF];
const part = PROGRAMMES.find((p) => p.days.length > 2 && p.days.every((d) => d.lesson))!;

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.courseStep.deleteMany({ where: { ownerId: { in: OWNERS } } });
  await prisma.setting.deleteMany({ where: { ownerId: { in: OWNERS } } });
}
beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("finishLessonFor", () => {
  it("ticks today's lesson and puts its words in the deck", async () => {
    await writeSetting(OWNER, SETTING_KEYS.programme, part.id);
    const today = part.days[0]!;
    expect(await finishLessonFor(OWNER, today.lesson!)).toEqual({ ok: true, recorded: true });
    expect(await prisma.courseStep.count({ where: { ownerId: OWNER, dayId: today.id } })).toBe(1);
    expect(await prisma.card.count({ where: { ownerId: OWNER } })).toBeGreaterThan(0);
  });

  it("records nothing and builds nothing for a lesson ahead of today", async () => {
    await writeSetting(OWNER, SETTING_KEYS.programme, part.id);
    const ahead = part.days[part.days.length - 1]!;
    expect(await finishLessonFor(OWNER, ahead.lesson!)).toEqual({ ok: true, recorded: false });
    expect(await prisma.courseStep.count({ where: { ownerId: OWNER } })).toBe(0);
    expect(await prisma.card.count({ where: { ownerId: OWNER } })).toBe(0);
  });

  it("gives a learner off the course the words and ticks nothing", async () => {
    await writeSetting(OFF, SETTING_KEYS.programme, "off");
    expect(await finishLessonFor(OFF, part.days[0]!.lesson!)).toEqual({ ok: true, recorded: false });
    expect(await prisma.courseStep.count({ where: { ownerId: OFF } })).toBe(0);
    expect(await prisma.card.count({ where: { ownerId: OFF } })).toBeGreaterThan(0);
  });

  it("refuses a lesson the course does not hold", async () => {
    expect(await finishLessonFor(OWNER, "no-such-lesson")).toMatchObject({ ok: false, reason: "not_found" });
  });
});

describe("submitCheckFor", () => {
  const check = courseChecks(PROGRAMMES)[0]!;

  it("fails an attempt, then records a pass on the next one, marked on the server", async () => {
    const first = checkPaper(check, 1);
    const failed = await submitCheckFor(OWNER, check.id, 1, first.map(() => null));
    expect(failed).toMatchObject({ ok: true, passed: false, score: 0 });
    expect((await checksPassedFor(OWNER)).has(check.id)).toBe(false);

    const second = checkPaper(check, 2);
    const passed = await submitCheckFor(OWNER, check.id, 2, second.map((item) => (item.kind === "match" ? null : item.answer)));
    expect(passed).toMatchObject({ ok: true, passed: true });
    expect((await checksPassedFor(OWNER)).has(check.id)).toBe(true);
  });

  it("refuses responses that do not fit the paper, and a check nobody holds", async () => {
    expect(await submitCheckFor(OWNER, check.id, 1, [null])).toMatchObject({ ok: false, reason: "invalid" });
    expect(await submitCheckFor(OWNER, "check-nowhere", 1, [])).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("serves the paper the marking rebuilds, with the attempt held to its range", async () => {
    const view = (await checkView(OWNER, check.id, 0))!;
    expect(view.attempt).toBe(1);
    expect(view.paper).toEqual(checkPaper(check, 1));
    expect(view.needed).toBeGreaterThan(0);
    expect((await checkView(OWNER, check.id, 99_999))!.attempt).toBe(10_000);
  });

  it("builds no paper for a check further up than the learner stands", async () => {
    await writeSetting(OWNER, SETTING_KEYS.programme, PROGRAMMES[0]!.id);
    const ahead = courseChecks(PROGRAMMES).find((c) => c.programmeId !== PROGRAMMES[0]!.id)!;
    const view = (await checkView(OWNER, ahead.id, 1))!;
    expect(view.open).toBe(false);
    expect(view.paper).toEqual([]);
    expect(await submitCheckFor(OWNER, ahead.id, 1, [])).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("keeps the first check open to a learner who turned the course off", async () => {
    await writeSetting(OFF, SETTING_KEYS.programme, "off");
    const view = (await checkView(OFF, check.id, 1))!;
    expect(view.open).toBe(true);
    expect(view.paper.length).toBeGreaterThan(0);
  });
});
