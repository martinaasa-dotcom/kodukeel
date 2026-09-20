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
 */

import { prisma } from "@/lib/db";

import { MAX_SESSION, NEW_CANDIDATES, dueWhere, roomFor, unseenWhere } from "@/lib/srs/reviewQueue";
import { cardWithin, type ModuleScope } from "@/lib/course/scope";
import { moduleSpellings } from "@/lib/progress/moduleScope";

/**
 * The columns `cardWithin` reads, and nothing else.
 *
 * The review page selects a word's gloss, its sentences and its band because
 * it is about to draw them. This only has to decide whether a card may be
 * asked, so the rows stay four short columns and the count costs a page of
 * them rather than a page of examples.
 */
const SELECT = { cardType: true, targetCase: true, front: true, slot: true } as const;

/**
 * How many cards the module's closing round would offer, capped.
 *
 * The same two windows the round reads, in the same order, filtered the same
 * way, and then the same arithmetic: everything due that the evening may ask,
 * plus as many unseen words as there is room for after it.
 *
 * The cap is what keeps this cheap to act on: the step needs five answers, so
 * an answer past the fifth changes nothing and there is no reason to know how
 * many there are.
 *
 * ONE RESIDUAL, WRITTEN DOWN RATHER THAN GUARDED. The round widens its unseen
 * window to the bands around the learner when the first sixty rows hold
 * nothing near their level (`inBandPool`), and this reads the first window
 * alone. Inside a module both are drawn from the same taught list, which is
 * tens of words rather than thousands, so the two windows are the same rows;
 * the case where they are not costs a step that ticks with a card or two still
 * in the queue, which the learner can still answer, rather than an evening
 * that cannot be finished.
 */
export async function closingLeft(
  ownerId: string, scope: ModuleScope, cap: number, now = new Date(),
): Promise<number> {
  const [due, fresh, spellings] = await Promise.all([
    prisma.card.findMany({
      where: dueWhere(ownerId, now),
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: MAX_SESSION,
      select: SELECT,
    }),
    prisma.card.findMany({
      where: unseenWhere(ownerId, now, scope.lemmas),
      orderBy: [{ createdAt: "asc" }, { lexemeId: "asc" }, { id: "asc" }],
      take: NEW_CANDIDATES,
      select: SELECT,
    }),
    moduleSpellings(scope),
  ]);

  const within = (card: typeof due[number]) => cardWithin(scope, card, spellings);
  const dueWithin = due.filter(within).length;
  const room = roomFor(dueWithin);
  return Math.min(cap, dueWithin + Math.min(room, fresh.filter(within).length));
}
