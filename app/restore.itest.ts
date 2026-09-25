import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// A Server Action revalidates on the way out, which needs a Next request.
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
// And resolves its owner off the session; this is the single local learner.
vi.mock("@/lib/auth/session", async (real) => ({
  ...(await real<typeof import("@/lib/auth/session")>()),
  requireUserId: async () => "local-single-user",
}));

import { prisma } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/auth/mode";
import { restoreBackup } from "@/app/actions";
import { readinessSignals } from "@/lib/progress/exam";
import { latestFor } from "@/lib/progress/assessment";

/**
 * A backup is a file its caller wrote, so the marks in it are claims.
 *
 * ADR-022: a result anybody can type is not a measurement. A paper is marked on
 * the server from (level, seed, answers), and a level check from its items and
 * responses. A backup carries neither the raw answers nor the paper, only the
 * marks, so nothing can mark a restored row again. What it may do is come back,
 * faithfully, as history; what it may not do is stand as evidence that a paper
 * was passed or a level measured, on the hub's confidence figure, on the level
 * the course opens at, or on the band a teacher or a sponsor reads.
 */

const ATTEMPT = "itest-restore-forged-attempt";
const CHECK = "itest-restore-forged-check";
const OWNER = LOCAL_USER_ID;

async function wipe() {
  await prisma.examAttempt.deleteMany({ where: { id: ATTEMPT } });
  await prisma.assessment.deleteMany({ where: { id: CHECK } });
}

beforeAll(wipe);
afterAll(wipe);

const at = new Date(Date.now() - 1000);

function forged(): string {
  return JSON.stringify({
    format: "kodukeel-v1",
    exportedAt: at.toISOString(),
    lexemes: [], forms: [], cards: [], reviews: [], tasks: [],
    examAttempts: [{
      id: ATTEMPT, ownerId: "somebody-else", level: "C1", seed: "forged",
      // Full marks, on a paper with no answers in it at all.
      pct: 100, passed: true,
      result: JSON.stringify({ level: "C1", parts: [], pct: 100, passed: true }),
      startedAt: at.toISOString(), finishedAt: at.toISOString(),
      // A file that says it was never restored is still a file.
      restoredAt: null,
    }],
    assessments: [{
      id: CHECK, ownerId: "somebody-else", takenAt: at.toISOString(),
      overall: "C1", ceiling: "C1", confidence: "reasonable", answered: 80,
      reading: "C1", listening: "C1", writing: "C1", speakingSelf: 4, detail: "{}",
      restoredAt: "2099-01-01T00:00:00.000Z",
    }],
  });
}

describe("a restored measurement is history, not evidence", () => {
  it("keeps the rows, as the learner's own", async () => {
    const out = await restoreBackup(forged(), "merge");
    expect(out).toEqual(expect.objectContaining({ ok: true }));

    const attempt = await prisma.examAttempt.findUnique({ where: { id: ATTEMPT } });
    const check = await prisma.assessment.findUnique({ where: { id: CHECK } });
    expect(attempt?.ownerId).toBe(OWNER);
    expect(attempt?.pct).toBe(100);
    expect(check?.ownerId).toBe(OWNER);
    // The file said it was not restored; the server is the one that knows.
    expect(attempt?.restoredAt).toBeInstanceOf(Date);
    expect(check?.restoredAt).toBeInstanceOf(Date);
  });

  it("does not stand as a sat paper or a measured level on the readiness figure", async () => {
    const signals = await readinessSignals(OWNER);
    expect(signals.attempts.some((a) => a.at === at.toISOString())).toBe(false);
    expect((await latestFor(OWNER))?.id).not.toBe(CHECK);
  });
});
