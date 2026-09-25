import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings/store";
import { LOOK_BACK_DAYS, mailoutRoster, mergeRoster, rosterPage } from "./mailout";

/**
 * Who the daily run considers, against a database, because the fault this
 * guards was in the SQL rather than in the arithmetic.
 *
 * The roster used to deduplicate `Review` by owner through Prisma's
 * `distinct`, which is done in the client: the database was sent the whole
 * window of reviews with no DISTINCT and no LIMIT, twice a run. What that
 * returned was right and what it cost grew with every answer anybody gave, so
 * a test of the answer alone could not have told the two apart. This pins the
 * answer, so the SQL that replaced it is held to the same one: distinct
 * learners, in owner order, paged without skipping or repeating anybody.
 *
 * The clock is set in 2090, because the roster is deployment-wide and other
 * suites share this database: inside a 45-day window that far out, the only
 * reviews are the ones written here.
 */

const NOW = new Date("2090-03-01T12:00:00.000Z");
const DAY = 86_400_000;
const OWNERS = ["itest-mail-a", "itest-mail-b", "itest-mail-c", "itest-mail-d", "itest-mail-e"];
const STALE = "itest-mail-stale";

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: [...OWNERS, STALE] } } });
}

beforeAll(async () => {
  await wipe();
  const rows = OWNERS.flatMap((ownerId, i) =>
    // Several reviews apiece, so deduplication is what the answer turns on.
    Array.from({ length: i + 2 }, (_, n) => ({
      ownerId, cardId: `itest-mail-card-${i}-${n}`, rating: 3,
      reviewedAt: new Date(NOW.getTime() - (n + 1) * DAY),
    })),
  );
  // One learner who answered only before the window, who must not appear.
  rows.push({
    ownerId: STALE, cardId: "itest-mail-card-stale", rating: 3,
    reviewedAt: new Date(NOW.getTime() - (LOOK_BACK_DAYS + 5) * DAY),
  });
  await prisma.review.createMany({ data: rows });
});

afterAll(async () => {
  await wipe();
});

describe("mailoutRoster", () => {
  it("names every learner in the window once, and nobody from before it", async () => {
    const roster = await mailoutRoster(NOW, 100);
    expect(roster).toEqual([...OWNERS].sort());
  });

  it("pages in owner order and covers everybody without repeating anybody", async () => {
    const limit = 2;
    const pages = Math.ceil(OWNERS.length / limit);
    const seen: string[] = [];
    // `rosterPage` keys on the day plus the hour of the day, so inside one day
    // one hour apart is one page apart. `rosterPage.test.ts` drives the daily
    // cadence the deployment actually has; this drives the SQL.
    for (let hour = 0; hour < pages; hour += 1) {
      const at = new Date(NOW.getTime() + hour * 3_600_000);
      const page = await mailoutRoster(at, limit);
      expect(page.length).toBeLessThanOrEqual(limit);
      expect([...page].sort()).toEqual(page);
      seen.push(...page);
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual([...OWNERS].sort());
  });

  it("starts each page where rosterPage says", () => {
    expect(rosterPage(NOW, 5, 2) % 2).toBe(0);
    expect(rosterPage(NOW, 1, 2)).toBe(0);
  });
});

/*
  The newcomers, who are who the welcome letter is written for. Dated in June
  2090, outside the window the suite above reads, so neither sees the other.
*/
describe("mailoutRoster with newcomers", () => {
  const PREFIX = "itest-mailout-";
  const LATER = new Date("2090-06-15T12:00:00Z");
  const AT = new Date("2090-06-10T12:00:00Z");

  async function wipeLater() {
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

  beforeEach(wipeLater);
  afterAll(wipeLater);

  it("names a learner once however many reviews they wrote", async () => {
    await reviewer("a", 30);
    await reviewer("b", 1);
    expect((await mailoutRoster(LATER, 10)).sort()).toEqual([PREFIX + "a", PREFIX + "b"]);
  });

  /*
    Both pages are `limit` long. Concatenated and cut, a deployment with as
    many reviewers as a run takes never reached the newcomers, who are the
    people the welcome letter is written for.
  */
  it("keeps the newcomers when the reviewers alone would fill the run", async () => {
    for (const name of ["r1", "r2", "r3"]) await reviewer(name, 2);
    for (const name of ["n1", "n2"]) await newcomer(name);
    const roster = await mailoutRoster(LATER, 3);
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
