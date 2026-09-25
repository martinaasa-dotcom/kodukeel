/**
 * The rows a record of study is made of. The arithmetic is `lib/stats/record.ts`.
 *
 * Every figure is read off something the app already keeps for another
 * reason, so nothing is stored for this (ADR-014): the review log, the units'
 * own progress, the level checks and the papers somebody sat, and the
 * conversations they reported. A check or a paper that came back from a
 * backup file is left out, because its levels are what the file says and
 * nothing here marked them.
 */
import { prisma } from "@/lib/db";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { historyFor } from "@/lib/progress/assessment";
import { deckSnapshot, pathWithProgress } from "@/lib/progress/summary";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { isConversation, OUTCOMES } from "@/lib/collections/errands";
import { studyTotals, summarisePapers, type PaperSummary, type StudyTotals } from "@/lib/stats/record";
import type { DayClock } from "@/lib/time/day";

/** Level checks listed on the record, most recent first. */
const LISTED = 12;
/** Sittings read to summarise the papers. A learner past this has sat a great many. */
const SITTINGS = 500;

export interface RecordCheck {
  readonly at: Date;
  readonly overall: string | null;
}

export interface StudyRecord {
  readonly name: string | null;
  /** The learner's own zone, so every date on the record is written in it. */
  readonly zone: DayClock["zone"];
  readonly totals: StudyTotals;
  /** Cards the scheduler has graduated, which is the one figure about memory rather than attendance. */
  readonly cardsKnown: number;
  readonly unitsDone: readonly { readonly title: string; readonly level: string }[];
  readonly checks: readonly RecordCheck[];
  /** One line a level: how often it was sat, the best score, whether any sitting passed. */
  readonly papers: readonly PaperSummary[];
  /** Conversations in Estonian the learner reported having, outside the app. */
  readonly conversations: number;
}

export async function studyRecord(ownerId: string): Promise<StudyRecord> {
  const conversationOutcomes = OUTCOMES.filter(isConversation);
  const [clock, name, reviews, snapshot, checks, papers, conversations] = await Promise.all([
    learnerDayClock(ownerId),
    readSetting(ownerId, SETTING_KEYS.displayName),
    prisma.review.findMany({
      where: { ownerId },
      select: { reviewedAt: true, durationMs: true },
    }),
    deckSnapshot(ownerId),
    historyFor(ownerId, LISTED, { measured: true }),
    prisma.examAttempt.findMany({
      where: { ownerId, restoredAt: null },
      orderBy: [{ finishedAt: "desc" }, { id: "asc" }],
      take: SITTINGS,
      select: { finishedAt: true, level: true, pct: true, passed: true },
    }),
    prisma.encounter.count({ where: { ownerId, outcome: { in: [...conversationOutcomes] } } }),
  ]);
  const units = await pathWithProgress(ownerId, snapshot);

  return {
    name: name?.trim() || null,
    zone: clock.zone,
    totals: studyTotals(reviews, (at) => clock.dayKey(at)),
    cardsKnown: snapshot.knownCards,
    unitsDone: units
      .filter((u) => u.state === "done")
      .map((u) => ({ title: u.unit.title, level: u.unit.level })),
    checks: checks.map((c) => ({ at: c.takenAt, overall: c.overall })),
    papers: summarisePapers(papers.map((p) => ({ at: p.finishedAt, level: p.level, pct: p.pct, passed: p.passed }))),
    conversations,
  };
}
