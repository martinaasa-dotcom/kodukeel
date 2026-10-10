import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { reviewLog } from "@/lib/progress/reviewLog";

/**
 * The cached review log is the log in the database, after every way the log
 * changes.
 *
 * `lib/progress/reviewLog.ts` keeps each learner's rows between requests and
 * reads only what is new, which is what stopped the progress screens pulling a
 * learner's whole history off Supabase on every view. A cache is only worth
 * that if it is never wrong, and the ways it could be are exactly the writes
 * that do not go through `receivedAt`: a restored backup writes its history
 * with it null, an erasure deletes everything, and a test or a restore can
 * replace rows with the same number of different ones. Each is driven here
 * against a real database, and every answer is checked against a fresh read.
 */

const OWNER = "itest-owner-review-log";

let n = 0;
function row(received: Date | null, at = new Date(Date.UTC(2026, 0, 1, 12, n))) {
  n += 1;
  return {
    id: `itest-review-log-${n}`, ownerId: OWNER, cardId: `itest-card-${n % 3}`, lexemeId: null,
    rating: 1 + (n % 4), reviewedAt: at, receivedAt: received,
  };
}

async function fresh() {
  return (await prisma.review.findMany({ where: { ownerId: OWNER }, select: { id: true } }))
    .map((r) => r.id).sort();
}

async function cached() {
  return (await reviewLog(OWNER)).map((r) => r.id).sort();
}

const clear = () => prisma.review.deleteMany({ where: { ownerId: OWNER } });
beforeEach(clear);
afterAll(clear);

describe("the cached review log", () => {
  it("reads the whole log the first time and an appended answer after", async () => {
    await prisma.review.createMany({ data: [row(new Date()), row(new Date()), row(null)] });
    expect(await cached()).toEqual(await fresh());
    await prisma.review.create({ data: row(new Date()) });
    expect(await cached()).toEqual(await fresh());
    expect((await cached()).length).toBe(4);
  });

  it("sees a restored backup, whose rows carry no receivedAt", async () => {
    await prisma.review.createMany({ data: [row(new Date()), row(new Date())] });
    expect(await cached()).toEqual(await fresh());
    await prisma.review.createMany({ data: [row(null), row(null), row(null)] });
    expect(await cached()).toEqual(await fresh());
  });

  it("sees an erasure, and the same number of different rows after it", async () => {
    await prisma.review.createMany({ data: [row(null), row(null)] });
    expect(await cached()).toEqual(await fresh());
    await clear();
    expect(await cached()).toEqual([]);
    await prisma.review.createMany({ data: [row(null), row(null)] });
    expect(await cached()).toEqual(await fresh());
    await clear();
    await prisma.review.createMany({ data: [row(null), row(null)] });
    expect(await cached()).toEqual(await fresh());
  });

  it("sees a deletion that arrives with an insert in the same breath", async () => {
    await prisma.review.createMany({ data: [row(new Date()), row(new Date()), row(new Date())] });
    expect(await cached()).toEqual(await fresh());
    const first = (await fresh())[0]!;
    await prisma.review.delete({ where: { id: first } });
    await prisma.review.createMany({ data: [row(new Date()), row(new Date())] });
    expect(await cached()).toEqual(await fresh());
  });

  it("keeps the log oldest first", async () => {
    await prisma.review.createMany({
      data: [row(new Date(), new Date(Date.UTC(2026, 5, 1))), row(new Date(), new Date(Date.UTC(2026, 0, 1)))],
    });
    const times = (await reviewLog(OWNER)).map((r) => r.reviewedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
