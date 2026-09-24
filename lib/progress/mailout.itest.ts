import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings/store";
import { mailoutRoster, mergeRoster } from "./mailout";

/**
 * Who the scheduled mail run considers, against a real database.
 *
 * Dated far in the future so the window holds these rows and nobody else's.
 */

const PREFIX = "itest-mailout-";
const NOW = new Date("2090-06-15T12:00:00Z");
const AT = new Date("2090-06-10T12:00:00Z");

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
  await prisma.setting.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
}

async function reviewer(name: string, reviews: number) {
  await prisma.review.createMany({
    data: Array.from({ length: reviews }, () => ({
      ownerId: PREFIX + name, cardId: "none", rating: 3, reviewedAt: AT, durationMs: 0, stateBefore: 0,
    })),
  });
}

async function newcomer(name: string) {
  await prisma.setting.create({
    data: { ownerId: PREFIX + name, key: SETTING_KEYS.onboardedAt, value: AT.toISOString() },
  });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("mailoutRoster", () => {
  it("names a learner once however many reviews they wrote", async () => {
    await reviewer("a", 30);
    await reviewer("b", 1);
    expect((await mailoutRoster(NOW, 10)).sort()).toEqual([PREFIX + "a", PREFIX + "b"]);
  });

  /*
    Both pages are `limit` long. Concatenated and cut, a deployment with as
    many reviewers as a run takes never reached the newcomers, who are the
    people the welcome letter is written for.
  */
  it("keeps the newcomers when the reviewers alone would fill the run", async () => {
    for (const name of ["r1", "r2", "r3"]) await reviewer(name, 2);
    for (const name of ["n1", "n2"]) await newcomer(name);
    const roster = await mailoutRoster(NOW, 3);
    expect(roster).toHaveLength(3);
    expect(roster.some((id) => id.includes("-n"))).toBe(true);
  });
});

describe("mergeRoster", () => {
  it("takes the two pages in turn and never repeats a learner", () => {
    expect(mergeRoster(["a", "b", "c"], ["x", "a"], 4)).toEqual(["x", "a", "b"].concat(["c"]));
    expect(mergeRoster(["a", "b"], [], 5)).toEqual(["a", "b"]);
    expect(mergeRoster([], ["x"], 5)).toEqual(["x"]);
  });
});
