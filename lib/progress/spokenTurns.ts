import { cache } from "react";
import { prisma } from "@/lib/db";
import { spokenTurnsOf, type SpokenTurnRow } from "@/lib/stats/spoken";

/**
 * THE LEARNER'S CONVERSATION TURNS SAID ALOUD, OVER THE LAST YEAR (VB-14).
 *
 * Read off the finished runs' own transcripts, which is where a turn is kept
 * (`finishRun` writes them), and derived on every request (ADR-014): Progress
 * reads how long a spoken answer runs month by month, and the readiness rungs
 * read the ones that answered a line only heard. Nothing is counted into a
 * column.
 *
 * A truncated read says where it cuts and ends on the id, for the reason every
 * other one here does: a slice the planner chose moves on its own. Four
 * hundred runs is more conversations than anybody has in a year, and the
 * newest are the ones both readers care about. Memoised for the render, since
 * Progress and its readiness section can both ask.
 */
export const RUNS_READ = 400;
const YEAR_MS = 365 * 86_400_000;

export const spokenTurnsFor = cache(async (ownerId: string, now = new Date()): Promise<SpokenTurnRow[]> => {
  const runs = await prisma.sceneRun.findMany({
    where: { ownerId, endedAt: { not: null }, startedAt: { gte: new Date(now.getTime() - YEAR_MS) } },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: RUNS_READ,
    select: { startedAt: true, level: true, transcript: true },
  });
  return runs.flatMap((run) => spokenTurnsOf(run.transcript, run.startedAt, run.level));
});
