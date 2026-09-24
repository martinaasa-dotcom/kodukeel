import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { canonicalZone, dayClock } from "@/lib/time/day";

/**
 * A STORED ZONE MEANS THE SAME DAY TO THE APP AND TO POSTGRES.
 *
 * The zone a learner's browser reports is stored and read twice: by
 * `dayClock` in Node, which draws the week strip, the streak and the daily
 * goal, and inside SQL by the heatmap's query in `lib/progress/summary.ts`,
 * which groups reviews by day with `AT TIME ZONE`. If the two ever cut a day
 * in different places, a review lands on one day in the chart and another in
 * the streak, and a shield is spent covering a day that was not missed.
 *
 * They did disagree, for one shape of input: `Intl` accepts a bare offset such
 * as "+05:30" and reads it east of Greenwich, and Postgres reads the same
 * string POSIX-style, west, eleven hours apart. `canonicalZone` refuses an
 * offset for that reason, and this asks the property directly rather than the
 * rule: for every zone the app will store, both sides name the same day at a
 * run of instants chosen to straddle midnight somewhere.
 *
 * The expression is the heatmap's, character for character, because a test of
 * a different expression is a test of a query the app does not run.
 */
const INSTANTS = [
  "2026-01-01T00:30:00Z", "2026-03-29T01:30:00Z", "2026-06-30T12:00:00Z",
  "2026-06-30T22:30:00Z", "2026-10-25T03:30:00Z", "2026-12-31T23:30:00Z",
];

async function postgresDays(zone: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ day: string }[]>`
    SELECT TO_CHAR((t::timestamp AT TIME ZONE 'UTC') AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day
    FROM unnest(${INSTANTS.map((i) => i.replace("T", " ").replace("Z", ""))}::text[]) WITH ORDINALITY AS u(t, n)
    ORDER BY n`;
  return rows.map((r) => r.day);
}

function appDays(zone: string): string[] {
  const clock = dayClock(zone);
  return INSTANTS.map((i) => clock.dayKey(new Date(i)));
}

describe("a stored zone", () => {
  it("cuts the day in the same place in Node and in Postgres, for every zone the app will store", async () => {
    const accepted = [...new Set(Intl.supportedValuesOf("timeZone").map((z) => canonicalZone(z)))]
      .filter((z): z is string => z !== undefined);
    expect(accepted.length).toBeGreaterThan(300);
    const disagree: string[] = [];
    for (const zone of accepted) {
      const a = appDays(zone);
      const b = await postgresDays(zone);
      if (a.join() !== b.join()) disagree.push(`${zone}: app ${a.join(" ")} / postgres ${b.join(" ")}`);
    }
    expect(disagree).toEqual([]);
  });

  it("is never a bare offset, which is the one shape the two read differently", async () => {
    // The reason, measured: the same string, two days, on the instant before midnight UTC.
    const before = "2026-06-30T22:30:00Z";
    const node = new Intl.DateTimeFormat("en-CA", { timeZone: "+05:30" }).format(new Date(before));
    const [pg] = await prisma.$queryRaw<{ day: string }[]>`
      SELECT TO_CHAR(('2026-06-30 22:30:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE '+05:30', 'YYYY-MM-DD') AS day`;
    expect(node).toBe("2026-07-01");
    expect(pg?.day).toBe("2026-06-30");

    for (const offset of ["+05:30", "-08:00", "+00:00"]) expect(canonicalZone(offset)).toBeUndefined();
  });
});
