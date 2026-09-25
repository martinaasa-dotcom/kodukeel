import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings/store";
import { keepBest } from "./personalBest";

/**
 * Two rounds finishing at once, against a database, because a best lowered by
 * a slower write is invisible to anything that runs one request at a time.
 */

const MINE = "itest-owner-personal-best";

async function wipe() {
  await prisma.setting.deleteMany({ where: { ownerId: MINE } });
}

async function stored(key: string) {
  const row = await prisma.setting.findUnique({ where: { ownerId_key: { ownerId: MINE, key } } });
  return row?.value ?? null;
}

/** 1..n in an order that puts the best in the middle, not last. */
const scores = (n: number) => Array.from({ length: n }, (_, i) => ((i * 7) % n) + 1);

describe("keepBest", () => {
  beforeEach(wipe);
  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  it("never lowers a high score when rounds finish together", async () => {
    for (let round = 0; round < 3; round++) {
      await wipe();
      await Promise.all(scores(20).map((s) => keepBest(MINE, SETTING_KEYS.sprintBest, s, "higher")));
      expect(await stored(SETTING_KEYS.sprintBest)).toBe("20");
    }
  });

  it("never raises a fastest time when rounds finish together", async () => {
    for (let round = 0; round < 3; round++) {
      await wipe();
      await Promise.all(scores(20).map((s) => keepBest(MINE, SETTING_KEYS.matchBest, s, "lower")));
      expect(await stored(SETTING_KEYS.matchBest)).toBe("1");
    }
  });

  it("says which call set the best, and reports the stored best to the others", async () => {
    expect(await keepBest(MINE, SETTING_KEYS.sprintBest, 12, "higher")).toEqual({ best: 12, isNewBest: true });
    expect(await keepBest(MINE, SETTING_KEYS.sprintBest, 9, "higher")).toEqual({ best: 12, isNewBest: false });
    expect(await keepBest(MINE, SETTING_KEYS.sprintBest, 12, "higher")).toEqual({ best: 12, isNewBest: false });
    expect(await keepBest(MINE, SETTING_KEYS.matchBest, 40, "lower")).toEqual({ best: 40, isNewBest: true });
    expect(await keepBest(MINE, SETTING_KEYS.matchBest, 55, "lower")).toEqual({ best: 40, isNewBest: false });
    expect(await keepBest(MINE, SETTING_KEYS.matchBest, 31, "lower")).toEqual({ best: 31, isNewBest: true });
  });

  it("replaces a stored value nobody can read as a number", async () => {
    await prisma.setting.create({ data: { ownerId: MINE, key: SETTING_KEYS.sprintBest, value: "NaN" } });
    expect(await keepBest(MINE, SETTING_KEYS.sprintBest, 3, "higher")).toEqual({ best: 3, isNewBest: true });
    await prisma.setting.create({ data: { ownerId: MINE, key: SETTING_KEYS.matchBest, value: "0" } });
    expect(await keepBest(MINE, SETTING_KEYS.matchBest, 50, "lower")).toEqual({ best: 50, isNewBest: true });
  });
});
