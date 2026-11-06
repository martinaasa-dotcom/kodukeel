/**
 * THE READS BEHIND THE FINISHED-MODULE SCREEN.
 *
 * `lib/course/moduleDone.ts` is the arithmetic and is pure; this is the
 * handful of counts it is handed, every one read off something the app keeps
 * for another reason (ADR-014): the cards the scheduler has graduated, the
 * review log with each answer's `stateBefore`, and the climb `ladderPosition`
 * already draws on Today. Nothing is stored for it.
 *
 * WHAT "TODAY" MOVED IS A CARD WHOSE OWN ANSWER TODAY GRADUATED IT. A recognition
 * card in Review now, with an answer today that found it in any other state,
 * is a word that joined the learner's known words today. A card already in
 * Review before today and answered again is a word they kept, not one they
 * gained, so it moves nothing here, which is the honest direction to err in.
 */
import { prisma } from "@/lib/db";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { ladderLemmasAt, levelsTo, type LadderProgress } from "@/lib/course/milestones";
import { levelIndex, type Level } from "@/lib/collections/syllabus";
import { ladderPosition, targetFrom } from "@/lib/progress/course";
import { daysStudied, conversationsReported } from "@/lib/progress/record";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import type { DayClock } from "@/lib/time/day";

/** The Review state a card is in once the scheduler has graduated it. */
const GRADUATED = 2;

export interface ModuleDoneFigures {
  /** The climb to the learner's own target. */
  readonly goal: LadderProgress;
  /** Whether the learner picked that target, or it is the default. */
  readonly goalChosen: boolean;
  /** The climb up to the level being walked, where that is above the target. Null where `goal` already covers it. */
  readonly levelLadder: LadderProgress | null;
  /** Ladder words graduated today, per level. */
  readonly gainedAt: Readonly<Record<string, number>>;
  /** Every word the scheduler counts as known now, any level. */
  readonly wordsKnown: number;
  /** Of those, graduated by an answer today. */
  readonly knownToday: number;
  /** Distinct words the learner has answered anything about, ever. */
  readonly wordsMet: number;
  /** The same, before today. */
  readonly wordsMetBefore: number;
  /** Answers today and ever. */
  readonly reviewsToday: number;
  readonly reviewsTotal: number;
  /** The first answer in the log, or null. */
  readonly since: Date | null;
  /** Distinct days with an answer, in the learner's zone. */
  readonly daysStudied: number;
  /** Conversations in Estonian reported on Today. */
  readonly conversations: number;
}

/** Ladder recognition cards, at one level, by the rule `ladderPosition` counts them by. */
function bandWhere(ownerId: string, band: Level, ids: readonly string[]) {
  const lemmas = ladderLemmasAt(band);
  return {
    ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: GRADUATED, id: { in: [...ids] },
    lexeme: lemmas ? { lemma: { in: [...lemmas] } } : { cefr: band },
  };
}

export async function moduleDoneFigures(
  ownerId: string, workingLevel: Level, clock: DayClock, now: Date,
): Promise<ModuleDoneFigures> {
  const dayStart = clock.startOfDay(now);
  const stored = await readSetting(ownerId, SETTING_KEYS.goalTarget);
  const target = targetFrom(stored);
  const levelAbove = levelIndex(workingLevel) > levelIndex(target);

  const [goal, levelLadder, todays, wordsKnown, met, metBefore, totals, reviewsToday, days, conversations] = await Promise.all([
    ladderPosition(ownerId, target),
    levelAbove ? ladderPosition(ownerId, workingLevel) : Promise.resolve(null),
    /* The cards an answer today found outside Review. Distinct, and owner-scoped,
       so this is bounded by one learner's own day of answers. */
    prisma.review.findMany({
      where: { ownerId, reviewedAt: { gte: dayStart }, stateBefore: { not: GRADUATED } },
      select: { cardId: true },
      distinct: ["cardId"],
      orderBy: { cardId: "asc" },
    }),
    prisma.card.count({ where: { ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: GRADUATED } }),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT "lexemeId")::int AS n FROM "Review" WHERE "ownerId" = ${ownerId} AND "lexemeId" IS NOT NULL`,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT "lexemeId")::int AS n FROM "Review"
      WHERE "ownerId" = ${ownerId} AND "lexemeId" IS NOT NULL AND "reviewedAt" < ${dayStart}`,
    prisma.review.aggregate({ where: { ownerId }, _count: { _all: true }, _min: { reviewedAt: true } }),
    prisma.review.count({ where: { ownerId, reviewedAt: { gte: dayStart } } }),
    daysStudied(ownerId, clock),
    conversationsReported(ownerId),
  ]);

  const ids = todays.map((r) => r.cardId);
  const bands = levelsTo(levelAbove ? workingLevel : target);
  const [perBand, knownToday] = ids.length === 0
    ? [bands.map(() => 0), 0]
    : await Promise.all([
      Promise.all(bands.map((band) => prisma.card.count({ where: bandWhere(ownerId, band, ids) }))),
      prisma.card.count({
        where: { ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: GRADUATED, id: { in: ids } },
      }),
    ]);

  return {
    goal,
    goalChosen: Boolean(stored?.trim()),
    levelLadder,
    gainedAt: Object.fromEntries(bands.map((band, at) => [band, perBand[at] ?? 0])),
    wordsKnown,
    knownToday,
    wordsMet: met[0]?.n ?? 0,
    wordsMetBefore: metBefore[0]?.n ?? 0,
    reviewsToday,
    reviewsTotal: totals._count._all,
    since: totals._min.reviewedAt,
    daysStudied: days,
    conversations,
  };
}
