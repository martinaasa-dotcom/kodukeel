import { describe, expect, it, vi } from "vitest";

// The table counts in step with memory, the way Postgres would for one caller.
const counts = new Map<string, number>();
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: async (_s: TemplateStringsArray, bucket: string) => {
      const next = (counts.get(bucket) ?? 0) + 1;
      counts.set(bucket, next);
      return [{ count: next }];
    },
    $executeRaw: async () => 0,
    rateLimit: { deleteMany: async () => ({ count: 0 }) },
  },
}));

const { throttleShared } = await import("./sharedThrottle");
const { ACTION_LIMITS } = await import("@/lib/security/actionLimits");

describe("throttleShared", () => {
  it("allows exactly the stated allowance, counted once per press", async () => {
    const owner = `owner-${Math.random()}`;
    const allowed = ACTION_LIMITS.restoreBackup.perMinute;
    const results: boolean[] = [];
    for (let i = 0; i < allowed + 1; i += 1) results.push((await throttleShared(owner, "restoreBackup")) === null);
    expect(results.filter(Boolean)).toHaveLength(allowed);
    expect(results[allowed]).toBe(false);
  });
});
