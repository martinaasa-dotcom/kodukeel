import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES } from "@/lib/course";
import { checksPassedFor, moveBlockedFor, recordCheckPassed } from "./checks";

/**
 * THE CHECKS BETWEEN THE PARTS OF A1, AGAINST A REAL DATABASE: a pass is
 * stored once and kept, and a move up waits on it (`lib/course/checks.ts`).
 */
const OWNER = "itest-owner-checks";
const parts = PROGRAMMES.filter((p) => p.level === "A1" && p.days.every((d) => d.lesson));

async function wipe() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
}
beforeEach(wipe);
afterAll(wipe);

describe("a move up from a part of the A1 lessons", () => {
  it("waits on the part's check, and opens once it is passed", async () => {
    const [first, second] = parts;
    expect((await moveBlockedFor(OWNER, first, second!))?.id).toBe(`check-${first!.id}`);
    await recordCheckPassed(OWNER, `check-${first!.id}`);
    await recordCheckPassed(OWNER, `check-${first!.id}`);
    expect([...(await checksPassedFor(OWNER))]).toEqual([`check-${first!.id}`]);
    expect(await moveBlockedFor(OWNER, first, second!)).toBeNull();
  });

  it("keeps A2 shut until the whole of A1 is passed", async () => {
    const a2 = PROGRAMMES.find((p) => p.level === "A2")!;
    for (const part of parts.slice(0, -1)) await recordCheckPassed(OWNER, `check-${part.id}`);
    expect((await moveBlockedFor(OWNER, parts[0], a2))?.final).toBe(true);
    await recordCheckPassed(OWNER, `check-${parts[parts.length - 1]!.id}`);
    expect(await moveBlockedFor(OWNER, parts[0], a2)).toBeNull();
  });
});
