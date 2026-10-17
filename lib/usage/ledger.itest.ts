import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { authoriseCall, recordUsage, releaseReservation, snapshotUsage, wouldAuthorise } from "./ledger";
import { reserveMicros } from "./pricing";

/**
 * The spend cap, against the database, because the thing that was wrong with it
 * could only be wrong against a database.
 *
 * `authoriseCall` used to read four aggregates, return a verdict, and leave the
 * row to be written when the call finished. That is a check-then-act race, and
 * on a streamed answer the gap between the two is the length of the answer: ten
 * requests could each read the same "under the limit" and each go ahead. No
 * unit test can see that, because the fault is entirely in what two connections
 * do at once.
 *
 * So these run concurrently on purpose. The first is the one that matters and
 * it fails against the old shape.
 */

const MINE = "itest-owner-ledger";

async function wipe() {
  await prisma.usageEvent.deleteMany({ where: { ownerId: MINE } });
}

/** Everything spent today, ledger rows summed exactly as the quota sums them. */
async function spend(): Promise<number> {
  const agg = await prisma.usageEvent.aggregate({
    where: { ownerId: MINE },
    _sum: { costMicros: true },
  });
  return agg._sum.costMicros ?? 0;
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("authoriseCall", () => {
  it("writes the call down before returning, not after it finishes", async () => {
    const decision = await authoriseCall(MINE, "TUTOR");

    expect(decision.allowed).toBe(true);
    expect(decision.reservation).toBeDefined();
    // The point of the whole change: the next caller to read the ledger sees
    // this call, and it has not been made yet.
    expect(await prisma.usageEvent.count({ where: { ownerId: MINE } })).toBe(1);
    expect(await spend()).toBeGreaterThan(0);
  });

  it("counts concurrent authorizations against each other", async () => {
    /*
      Twelve at once from one account, which is more than the daily allowance
      for the tutor at any sane configuration. Under the old shape every one of
      them read an empty ledger and every one was allowed. Now each is written
      as it is authorized, so the ones behind see the ones in front.

      Asserted as "fewer than all of them" rather than as an exact number: the
      allowance is configurable and this test is about the race, not about
      today's limit.
    */
    const results = await Promise.all(
      Array.from({ length: 12 }, () => authoriseCall(MINE, "TUTOR")),
    );
    const allowed = results.filter((r) => r.allowed);

    expect(allowed.length).toBeLessThan(results.length);
    expect(allowed.length).toBeGreaterThan(0);
    expect(await prisma.usageEvent.count({ where: { ownerId: MINE, entry: "CALL" } }))
      .toBe(allowed.length);
  });

  it("settles to what the call actually cost, not what it was booked at", async () => {
    const decision = await authoriseCall(MINE, "GRADER");
    const reserved = await spend();
    expect(reserved).toBeGreaterThan(0);

    await recordUsage({
      ownerId: MINE, kind: "GRADER", provider: "groq", model: "gpt-4o-mini",
      inputTokens: 400, outputTokens: 60, reservation: decision.reservation,
    });

    // Two rows, and they add up to the real cost. The estimate has left no
    // trace in the total, which is the property that makes booking one safe.
    expect(await prisma.usageEvent.count({ where: { ownerId: MINE } })).toBe(2);
    const { estimateCostMicros } = await import("./pricing");
    expect(await spend()).toBe(estimateCostMicros("gpt-4o-mini", 400, 60));
  });

  it("gives a reservation back when the call never happened", async () => {
    const decision = await authoriseCall(MINE, "SCAN");
    expect(await spend()).toBeGreaterThan(0);

    await releaseReservation(decision.reservation!);

    // Nothing was spent, and the record that it was authorized stays: this is
    // a release row, not a deletion, because the table is append-only.
    expect(await spend()).toBe(0);
    expect(await prisma.usageEvent.count({ where: { ownerId: MINE } })).toBe(2);

    /*
      AND IT GIVES BACK THE CALL, NOT ONLY THE MONEY.

      The release used to be an ordinary settlement at minus the reserve, which
      returns the spend to zero and leaves the `CALL` row standing. The two
      count limits read `CALL` rows, so a deployment whose key had been
      rejected still rationed its learners by how many refusals they had
      collected: eight in a minute and the burst limit closed over answers
      nobody had received. Exactly what this function's header says it exists
      to prevent, met for one of the three limits and not the other two.
    */
    const snapshot = await snapshotUsage(MINE, "SCAN");
    expect(snapshot.dailyCalls).toBe(0);
    expect(snapshot.burstCalls).toBe(0);
  });

  it("lets a learner keep asking after a run of refusals", async () => {
    /*
      The whole reason the release exists, driven rather than reasoned about:
      a rejected key refuses every call, and the learner must still be able to
      ask once the key is fixed. Ten refusals is past the burst allowance of
      eight and past nothing else.
    */
    for (let i = 0; i < 10; i += 1) {
      const decision = await authoriseCall(MINE, "TUTOR");
      expect(decision.allowed).toBe(true);
      await releaseReservation(decision.reservation!);
    }
    expect((await authoriseCall(MINE, "TUTOR")).allowed).toBe(true);
  });

  it("does not let a settlement count as a second call", async () => {
    /*
      Spend sums every row; the call counts count `CALL` rows only. Getting
      that backwards would silently halve every allowance in the app, and it
      would look like the cap working rather than like a bug.
    */
    const decision = await authoriseCall(MINE, "GRADER");
    await recordUsage({
      ownerId: MINE, kind: "GRADER", provider: "groq", model: "gpt-4o-mini",
      inputTokens: 400, outputTokens: 60, reservation: decision.reservation,
    });

    const snapshot = await snapshotUsage(MINE, "GRADER");
    expect(snapshot.dailyCalls).toBe(1);
    expect(snapshot.burstCalls).toBe(1);
  });

  it("files a release and a settlement on the day the call was booked", async () => {
    /*
      A call booked a moment before midnight UTC and handed back a moment after
      it. The release used to be filed under the day it was written, so the day
      the call was booked kept its CALL row and its reserve for ever, and the
      next day carried a RELEASE and a negative spend it never booked: one free
      call and a slice of budget nobody had given back. The same shape moved
      every settlement that landed after midnight.
    */
    const before = new Date("2026-03-01T23:59:59.500Z");
    const after = new Date("2026-03-02T00:00:00.500Z");

    const released = await authoriseCall(MINE, "TUTOR", before);
    await releaseReservation(released.reservation!, after);

    const settled = await authoriseCall(MINE, "GRADER", before);
    await recordUsage({
      ownerId: MINE, kind: "GRADER", provider: "groq", model: "gpt-4o-mini",
      inputTokens: 400, outputTokens: 60, reservation: settled.reservation, now: after,
    });

    const { estimateCostMicros } = await import("./pricing");
    const booked = await snapshotUsage(MINE, "TUTOR", before);
    expect(booked.dailyCalls).toBe(0);
    expect(booked.dailyMicros).toBe(estimateCostMicros("gpt-4o-mini", 400, 60));

    // And the next day starts from nothing: a first call on it is a first call.
    const next = await authoriseCall(MINE, "TUTOR", new Date("2026-03-02T00:00:01.000Z"));
    const day2 = await snapshotUsage(MINE, "TUTOR", new Date("2026-03-02T00:00:02.000Z"));
    expect(day2.dailyCalls).toBe(1);
    expect(day2.dailyMicros).toBe(next.reservation!.micros);
  });

  it("charges nothing at all for a refusal", async () => {
    // A call that was never authorized is not a call. Whatever number the
    // allowance is, the ledger must not grow on the way to saying no.
    const results = await Promise.all(
      Array.from({ length: 12 }, () => authoriseCall(MINE, "TUTOR")),
    );
    const refused = results.filter((r) => !r.allowed);
    expect(refused.length).toBeGreaterThan(0);
    expect(refused.every((r) => r.reservation === undefined)).toBe(true);
  });
});

describe("wouldAuthorise", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("says yes on a fresh day and no once the day's calls are spent, and books nothing either way", async () => {
    // One call a day per learner, scaled by the scene allowance of four: four calls.
    vi.stubEnv("AI_DAILY_CALLS_PER_USER", "1");
    expect(await wouldAuthorise(MINE, "SCENE")).toBe(true);
    expect(await prisma.usageEvent.count({ where: { ownerId: MINE } })).toBe(0);
    for (let i = 0; i < 4; i += 1) expect((await authoriseCall(MINE, "SCENE")).allowed).toBe(true);
    expect((await authoriseCall(MINE, "SCENE")).allowed).toBe(false);
    const before = await prisma.usageEvent.count({ where: { ownerId: MINE } });
    expect(await wouldAuthorise(MINE, "SCENE")).toBe(false);
    expect(await prisma.usageEvent.count({ where: { ownerId: MINE } })).toBe(before);
  });
});

describe("telling the operator about the day's spend", () => {
  /*
    The error log is what keeps the record and mails the admins, and it only
    writes to the database inside Next's Node runtime, so the test says it is
    one. The cap is set from the day's real total so that one booking carries
    it across four fifths and not across the whole, whatever else this
    database has spent today.
  */
  const since = new Date();
  const spendRows = () =>
    prisma.errorEvent.count({ where: { at: "usage/spend", createdAt: { gte: since } } });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await prisma.errorEvent.deleteMany({ where: { at: "usage/spend", createdAt: { gte: since } } });
  });

  it("writes one record for the booking that crosses a line, and none when it is crossed again that day", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const { globalMicros } = await snapshotUsage(MINE, "TUTOR");
    const booking = reserveMicros("TUTOR");
    // Four fifths of the cap lands inside this one booking, and the whole cap beyond it.
    const cap = (globalMicros + booking * 0.9) / 0.8;
    vi.stubEnv("AI_DAILY_USD_GLOBAL", String(cap / 1e6));

    const first = await authoriseCall(MINE, "TUTOR");
    expect(first.allowed).toBe(true);
    const deadline = Date.now() + 5000;
    while ((await spendRows()) === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
    const rows = await prisma.errorEvent.findMany({ where: { at: "usage/spend", createdAt: { gte: since } } });
    expect(rows.map((r) => r.message)).toEqual(["Daily model spend passed four fifths of the cap"]);
    expect(rows[0]!.extra).toContain("capMicros");

    // The call never happened, so its booking comes back, which takes the
    // day's total under the line again; the next booking crosses it a second
    // time, which is the same news and is not said twice.
    await releaseReservation(first.reservation!);
    expect((await authoriseCall(MINE, "TUTOR")).allowed).toBe(true);
    await new Promise((r) => setTimeout(r, 500));
    expect(await spendRows()).toBe(1);
  });
});
