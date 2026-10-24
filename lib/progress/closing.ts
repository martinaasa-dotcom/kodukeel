/**
 * HOW MUCH THE MODULE'S CLOSING ROUND STILL HAS TO ASK.
 *
 * The last step of every evening is "Quick review, and you are done", and it
 * is one of the two steps nothing ticks: it is finished by five answers graded
 * since the evening opened (`CLOSING_REVIEW`). That is the right rule for a
 * deck with something in it and it was the whole rule, so an evening whose
 * closing round had nothing left to offer could not be finished at all. It was
 * reported that way, off a real screen: the module read three quarters done,
 * the last step said "1 of 5 answers in", and the round behind it said nothing
 * was due. There was no press anywhere on that page that could move it.
 *
 * SO A STEP IS FINISHED BY THE EVIDENCE IT ASKS FOR, OR BY THERE BEING NO MORE
 * EVIDENCE TO BE HAD. A closing round with nothing left to ask is a closing
 * round done: the learner has nothing further to forget tonight, and an app
 * that keeps the day open over it is inventing work it cannot supply. So what
 * the round would ask is counted, and the five becomes whatever is actually
 * reachable, never more.
 *
 * NOTHING IS STORED FOR IT (ADR-014). This is a reading of the deck on each
 * render like every other figure in `lib/progress/`, and it agrees with the
 * screen because both are the same clauses: `lib/srs/reviewQueue.ts` holds
 * what the queue asks for, the review page spreads them into its own query and
 * this spreads them into a smaller one. A second copy of the arithmetic is how
 * a number on a list and the screen it points at come apart, and here that
 * costs the learner the evening.
 *
 * AND IT MAY ONLY EVER UNDERCOUNT, which is the whole of what makes it safe.
 * Counting low ticks a step with a card or two still answerable, which the
 * learner can simply answer; counting high asks for evidence the round will
 * not produce, which is the bug this module exists to end. Every place the two
 * readings could differ is therefore resolved downwards.
 */

import { cache } from "react";

import { prisma } from "@/lib/db";

import { MODULE_SESSION, taughtWhere, tonightWhere } from "@/lib/srs/reviewQueue";
import { deferredWordIds } from "@/lib/progress/deferrals";
import { cardWithin, scopeFor, type ModuleScope } from "@/lib/course/scope";
import { dayById, programmeById } from "@/lib/course";
import { moduleSpellings } from "@/lib/progress/moduleScope";

/**
 * The columns `cardWithin` reads, and nothing else.
 *
 * The review page selects a word's gloss, its sentences and its band because
 * it is about to draw them. This only has to decide whether a card may be
 * asked, so the rows stay a few short columns rather than a page of examples.
 */
const SELECT = {
  cardType: true, targetCase: true, front: true, back: true, slot: true,
  // Which verb, since a verb's past is asked only once an evening showed it.
  lexeme: { select: { lemma: true } },
} as const;

/**
 * How many answers this evening's closing round still has in it.
 *
 * The round is today's own words (`tonightWhere`), so this is the same read,
 * filtered the same way (`cardWithin`), cut at the same size. The review page
 * also drops a bare form card it cannot ask (`askableRows`), which this does
 * not see, and that is the direction this count may err in: at or under what
 * the round shows, never over it.
 *
 * MEMOISED FOR THE REQUEST, because two readings want it. The module screen
 * asks `courseReading` whether the day is finished and `closingProgress` what
 * the step's own line should say, and without this that is two reads of the
 * deck where one will do, on the screen a learner opens every evening. Keyed
 * on the learner, the day and the instant rather than on the scope object,
 * since `scopeFor` builds a fresh one per call and an identity key would never
 * hit; the scope is rebuilt here from the two ids, which is a walk over the
 * program in memory and no query at all.
 *
 * And the ask is recomputed on each render rather than remembered, which is
 * bounded by `CLOSING_REVIEW` whatever happens.
 */
const reachable = cache(async (
  ownerId: string, programmeId: string, dayId: string, nowMs: number, openedMs: number,
): Promise<number> => {
  const programme = programmeById(programmeId);
  const day = programme ? dayById(programme, dayId) : undefined;
  if (!programme || !day) return 0;
  const scope: ModuleScope = scopeFor(programme, day);
  const now = new Date(nowMs);

  const [spellings, aside] = await Promise.all([moduleSpellings(scope), deferredWordIds(ownerId, now)]);
  const tonight = await prisma.card.findMany({
    where: { AND: [tonightWhere(ownerId, now, scope.day.words, aside, openedMs > 0 ? new Date(openedMs) : null), taughtWhere(scope)] },
    // The round's own order (`lib/progress/dailyQueue.ts`).
    orderBy: [{ due: "asc" }, { id: "asc" }],
    take: MODULE_SESSION * 2,
    select: SELECT,
  });
  return Math.min(MODULE_SESSION, tonight.filter((card) => cardWithin(scope, card, spellings)).length);
});

/**
 * How many answers the closing round has left, never more than `cap`.
 *
 * The cap is what keeps this cheap to act on: the step needs five answers, so
 * an answer past the fifth changes nothing and there is no reason to say how
 * many there are.
 */
export async function closingLeft(
  ownerId: string, scope: ModuleScope, cap: number, now = new Date(), openedAt: Date | null = null,
): Promise<number> {
  if (cap <= 0) return 0;
  return Math.min(
    cap, await reachable(ownerId, scope.programme.id, scope.day.id, now.getTime(), openedAt?.getTime() ?? 0),
  );
}
