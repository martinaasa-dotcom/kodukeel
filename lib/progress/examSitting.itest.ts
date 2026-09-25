import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import type { ExamResult } from "@/lib/exam/score";
import { recordAttempt, sittingOf } from "./exam";

/**
 * Integration tests: these need a real Postgres.
 *
 *   npm run test:db
 *
 * A paper is (level, seed) and is sat once. A sitting's stored result carries
 * every expected answer, so a second submission of one seed was a pass anybody
 * could copy out of the first, on the figure the rosters read.
 */

const OWNER = "itest-owner-exam-sitting";

const result = (pct: number) => ({ level: "B1", parts: [], pct, passed: pct >= 60 }) as unknown as ExamResult;

beforeEach(async () => {
  await prisma.examAttempt.deleteMany({ where: { ownerId: OWNER } });
});
afterAll(async () => {
  await prisma.examAttempt.deleteMany({ where: { ownerId: OWNER } });
  await prisma.$disconnect();
});

describe("a sat paper", () => {
  it("keeps its first result when the same seed is handed in again", async () => {
    const first = await recordAttempt({ ownerId: OWNER, level: "B1", seed: "s1", startedAt: new Date(), result: result(20) });
    const second = await recordAttempt({ ownerId: OWNER, level: "B1", seed: "s1", startedAt: new Date(), result: result(100) });
    expect(second).toEqual(first);
    expect(second.passed).toBe(false);
    expect(await prisma.examAttempt.count({ where: { ownerId: OWNER } })).toBe(1);
    expect(await sittingOf(OWNER, "B1", "s1")).toEqual(first);
  });

  it("writes one row for a Submit pressed twice at once", async () => {
    const [a, b] = await Promise.all([
      recordAttempt({ ownerId: OWNER, level: "B1", seed: "s2", startedAt: new Date(), result: result(70) }),
      recordAttempt({ ownerId: OWNER, level: "B1", seed: "s2", startedAt: new Date(), result: result(70) }),
    ]);
    expect(a.id).toBe(b.id);
    expect(await prisma.examAttempt.count({ where: { ownerId: OWNER, seed: "s2" } })).toBe(1);
  });

  it("is a different paper at another seed or level", async () => {
    await recordAttempt({ ownerId: OWNER, level: "B1", seed: "s3", startedAt: new Date(), result: result(70) });
    expect(await sittingOf(OWNER, "B1", "s4")).toBeNull();
    expect(await sittingOf(OWNER, "B2", "s3")).toBeNull();
  });
});
