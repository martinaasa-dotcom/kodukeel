import { prisma } from "@/lib/db";
import { conversationCutoff } from "@/lib/tutor/lifetime";
import { usageCutoffDay } from "@/lib/usage/retention";

/**
 * THE TWO RETENTION PERIODS /privacy STATES, KEPT BY A JOB RATHER THAN BY LUCK.
 *
 * Both were promised and neither was kept by anything that runs on its own. A
 * conversation with Anu is deleted after a day only when the learner next
 * speaks to her (`forgetOldMessages`), so somebody who never comes back kept
 * yesterday's turns until erasure. And the spending ledger was said to be kept
 * for the running year while nothing ever removed a row. A notice describing a
 * deletion nobody makes is the shape of compliance that fails an audit, so the
 * daily scheduled run (`app/api/email/send/route.ts`) calls this once, and
 * `docs/25-data-retention.md` and `/privacy` describe exactly this.
 *
 * Bounded by an index each: the ledger is cut on its `day` column, which is
 * indexed and written as a UTC date, and the conversation table only ever
 * holds about a day of turns, so the cut on `createdAt` reads a day's rows.
 */

export interface PruneReport {
  messages: number;
  usageEvents: number;
}

/** Deletes every tutor turn older than a day and every ledger row older than thirteen months. */
export async function pruneExpired(now = new Date()): Promise<PruneReport> {
  const messages = await prisma.message.deleteMany({
    where: { createdAt: { lt: conversationCutoff(now) } },
  });
  const usageEvents = await prisma.usageEvent.deleteMany({
    where: { day: { lt: usageCutoffDay(now) } },
  });
  return { messages: messages.count, usageEvents: usageEvents.count };
}
