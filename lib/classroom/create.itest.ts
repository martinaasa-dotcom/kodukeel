import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createWithFreshCode } from "./create";

/**
 * Two classes created at the same moment and dealt the same join code,
 * against a database, because the collision is only visible to a unique index.
 */

const OWNERS = ["itest-owner-class-code-a", "itest-owner-class-code-b"];
const CLASH = "ZQZQZ9";

async function wipe() {
  await prisma.classroom.deleteMany({ where: { ownerId: { in: OWNERS } } });
}

/** Deals `CLASH` first and then codes of this owner's own. */
function dealer(tag: string) {
  let n = 0;
  return () => (n++ === 0 ? CLASH : `${tag}${String(n).padStart(4, "0")}`);
}

describe("createWithFreshCode", () => {
  beforeEach(wipe);
  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  it("gives the second of two colliding classes another code rather than failing", async () => {
    // Open the pool's connections first, or a cold pool serialises the two calls.
    await Promise.all(Array.from({ length: 4 }, () => prisma.$queryRaw`SELECT 1 AS x FROM pg_sleep(0.05)`));
    const made = await Promise.all(
      OWNERS.map((ownerId, i) =>
        createWithFreshCode(
          { name: "Tuesday group", ownerId, kind: "CLASS", targetLevel: "B1", displayName: "Teacher" },
          8,
          dealer(i === 0 ? "QA" : "QB"),
        ),
      ),
    );
    expect(made.every((m) => m !== null)).toBe(true);
    const codes = made.map((m) => m!.code);
    expect(new Set(codes).size).toBe(2);
    expect(codes).toContain(CLASH);
    expect(await prisma.classroom.count({ where: { ownerId: { in: OWNERS } } })).toBe(2);
  });

  it("gives up with nothing when every code it is dealt is taken", async () => {
    await prisma.classroom.create({ data: { name: "First", code: CLASH, ownerId: OWNERS[0]!, kind: "CLASS", targetLevel: "B1" } });
    const made = await createWithFreshCode(
      { name: "Second", ownerId: OWNERS[1]!, kind: "CLASS", targetLevel: "B1", displayName: "Teacher" },
      3,
      () => CLASH,
    );
    expect(made).toBeNull();
  });
});
