import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordAttempt } from "./exam";
import type { ExamResult } from "@/lib/exam/score";

/**
 * A sitting is written once, whatever arrives.
 *
 * The seed is minted only by the redirect that opens a new paper, so a second
 * submission carrying one is the same sitting again: a double-pressed Submit,
 * a reload, the back button. Only a database can show two presses in the same
 * instant both finding nothing and both writing, which is the half a lock is
 * for.
 */

const MINE = "itest-exam-a";
const THEIRS = "itest-exam-b";

async function wipe() {
  await prisma.examAttempt.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
}

beforeEach(wipe);
afterAll(wipe);

const result = (pct: number) => ({
  level: "B1", parts: [], points: pct, maxPoints: 100, pct, passed: pct >= 60,
  band: "B1", zeroPart: null, absentParts: [],
}) as unknown as ExamResult;

const sit = (ownerId: string, seed: string, pct: number) =>
  recordAttempt({ ownerId, level: "B1", seed, startedAt: new Date(), result: result(pct) });

describe("recordAttempt", () => {
  it("writes one row for one seed however many times it arrives, at once", async () => {
    const ids = await Promise.all(Array.from({ length: 16 }, (_, i) => sit(MINE, "s1", 40 + i)));
    expect(new Set(ids.map((s) => s.id)).size).toBe(1);
    expect(await prisma.examAttempt.count({ where: { ownerId: MINE } })).toBe(1);
  });

  it("keeps the first answer and hands its id back to a later one", async () => {
    const first = await sit(MINE, "s1", 72);
    const again = await sit(MINE, "s1", 10);
    expect(again).toEqual(first);
    const row = await prisma.examAttempt.findUniqueOrThrow({ where: { id: first.id } });
    expect(row.pct).toBe(72);
  });

  it("writes a new row for a new sitting, and never shares one between learners", async () => {
    await sit(MINE, "s1", 70);
    await sit(MINE, "s2", 80);
    await sit(THEIRS, "s1", 50);
    expect(await prisma.examAttempt.count({ where: { ownerId: MINE } })).toBe(2);
    expect(await prisma.examAttempt.count({ where: { ownerId: THEIRS } })).toBe(1);
  });
});
