import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { forgetSettings, readSetting, SETTING_KEYS, writeSettings } from "./store";

/**
 * SETTINGS WRITTEN TOGETHER LAND TOGETHER OR NOT AT ALL.
 *
 * The part a learner is on and the stamp saying they chose it were two
 * upserts side by side, so one could land without the other. A value
 * Postgres refuses (a NUL byte in text) stands in for a connection dropped
 * between the two: the part before it must not be written either.
 */

const OWNER = "itest-owner-write-settings";

async function wipe() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
  forgetSettings(OWNER);
}

beforeEach(wipe);
afterAll(wipe);

describe("writeSettings", () => {
  it("writes every entry", async () => {
    await writeSettings(OWNER, [[SETTING_KEYS.programme, "b1.2"], [SETTING_KEYS.programmeChosenAt, "2026-10-30T00:00:00.000Z"]]);
    forgetSettings(OWNER);
    expect(await readSetting(OWNER, SETTING_KEYS.programme)).toBe("b1.2");
    expect(await readSetting(OWNER, SETTING_KEYS.programmeChosenAt)).toBe("2026-10-30T00:00:00.000Z");
  });

  it("writes none where one of them fails", async () => {
    await expect(
      writeSettings(OWNER, [[SETTING_KEYS.programme, "b1.2"], [SETTING_KEYS.programmeChosenAt, "\0"]]),
    ).rejects.toThrow();
    const rows = await prisma.setting.findMany({ where: { ownerId: OWNER } });
    expect(rows).toEqual([]);
  });
});
