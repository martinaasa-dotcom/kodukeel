import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES } from "@/lib/course";
import { checksPassedFor, moveBlockedFor, recordCheckPassed } from "./checks";
import { choosePart, highestPartFor } from "./course";
import { forgetSettings, SETTING_KEYS, writeSetting } from "@/lib/settings/store";

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

/*
  TWO OF THESE AT ONCE ARE ONE LEARNER, NOT A RACE. Both settings are read,
  changed and written back, and written as two statements four checks passed
  at once kept one and two moves at once lowered the furthest part, on most
  rounds. `updateSettings` holds the learner's lock across the read and the
  write. Several rounds, because a race that wins once proves nothing.
*/
describe("passes and moves at once", () => {
  it("keeps every pass when several checks are passed at the same moment", async () => {
    const ids = parts.slice(0, 4).map((p) => `check-${p.id}`);
    expect(ids.length).toBe(4);
    for (let round = 0; round < 5; round += 1) {
      await wipe();
      forgetSettings(OWNER);
      await Promise.all(ids.map((id) => recordCheckPassed(OWNER, id)));
      forgetSettings(OWNER);
      expect([...(await checksPassedFor(OWNER))].sort(), `round ${round}`).toEqual([...ids].sort());
    }
  });

  it("never lowers the furthest part when two moves land at once", async () => {
    for (let round = 0; round < 5; round += 1) {
      await wipe();
      forgetSettings(OWNER);
      await writeSetting(OWNER, SETTING_KEYS.programme, "b1.1");
      await Promise.all([choosePart(OWNER, "b1.2"), choosePart(OWNER, "a2.1")]);
      forgetSettings(OWNER);
      expect((await highestPartFor(OWNER))?.id, `round ${round}`).toBe("b1.2");
    }
  });
});
