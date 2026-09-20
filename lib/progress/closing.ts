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
 * readings could differ is therefore resolved downwards, and the three that
 * can are named on `reachable` below.
 */

import { cache } from "react";

import { prisma } from "@/lib/db";

import { MAX_SESSION, NEW_CANDIDATES, dueWhere, roomFor, unseenWhere } from "@/lib/srs/reviewQueue";
import { cardWithin, scopeFor, type ModuleScope } from "@/lib/course/scope";
import { dayById, programmeById } from "@/lib/course";
import { moduleSpellings } from "@/lib/progress/moduleScope";
import { courseLevelFor } from "@/lib/progress/level";
import { isAround } from "@/lib/collections/levels";

/**
 * The columns `cardWithin` reads, and nothing else.
 *
 * The review page selects a word's gloss, its sentences and its band because
 * it is about to draw them. This only has to decide whether a card may be
 * asked, so the rows stay four short columns and the count costs a page of
 * them rather than a page of examples.
 */
const SELECT = { cardType: true, targetCase: true, front: true, slot: true } as const;

/** The same, plus the one thing the unseen window is also chosen on. */
const UNSEEN_SELECT = { ...SELECT, lexeme: { select: { cefr: true } } } as const;

/**
 * How many answers this evening's closing round still has in it.
 *
 * The same two windows the round reads, in the same order, filtered the same
 * way, and then the same arithmetic: everything due that the evening may ask,
 * plus as many unseen words as there is room for after it.
 *
 * MEMOISED FOR THE REQUEST, because two readings want it. The module screen
 * asks `courseReading` whether the day is finished and `closingProgress` what
 * the step's own line should say, and without this that is four page-reads of
 * the deck where two will do, on the screen a learner opens every evening.
 * Keyed on the learner, the day and the instant rather than on the scope
 * object, since `scopeFor` builds a fresh one per call and an identity key
 * would never hit; the scope is rebuilt here from the two ids, which is a walk
 * over the programme in memory and no query at all.
 *
 * THREE THINGS IT DELIBERATELY READS LOW, each of which would otherwise be a
 * way for the ask to exceed what the round can give.
 *
 * The unseen window counts only words around the learner's band. The round
 * widens its own window when the first sixty rows hold nothing near their
 * level, and the widening *replaces* the window rather than adding to it
 * (`inBandPool`), so the rows the round ends up showing can be neither a
 * subset nor a superset of the ones read here. Counting the in-band ones alone
 * is at or under what the round will show in every one of those cases, where
 * counting all of them could exceed it and hand the evening straight back its
 * original fault.
 *
 * The due window is the whole deck's first sixty by due date, exactly as the
 * round reads it, and is then filtered to what tonight may ask. A learner with
 * a long backlog whose taught words sit past row sixty therefore closes the
 * evening having answered nothing. That is the round agreeing with itself
 * rather than a miscount, since the screen would show them the same nothing,
 * and it is the price of the two readings being one set of clauses.
 *
 * And the ask is recomputed on each render rather than remembered, so a card
 * answered wrongly, which comes straight back due, is counted again: the line
 * can read "1 of 3" having read "0 of 2". That is honest rather than a
 * goalpost moving, because a missed card really is another answer still to
 * give, and it is bounded by `CLOSING_REVIEW` whatever happens.
 */
const reachable = cache(async (
  ownerId: string, programmeId: string, dayId: string, nowMs: number,
): Promise<number> => {
  const programme = programmeById(programmeId);
  const day = programme ? dayById(programme, dayId) : undefined;
  if (!programme || !day) return 0;
  const scope: ModuleScope = scopeFor(programme, day);
  const now = new Date(nowMs);

  const [due, fresh, spellings, level] = await Promise.all([
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
      select: UNSEEN_SELECT,
    }),
    moduleSpellings(scope),
    courseLevelFor(ownerId),
  ]);

  const within = (card: { cardType: string; targetCase: string | null; front: string; slot: string | null }) =>
    cardWithin(scope, card, spellings);
  const dueWithin = due.filter(within).length;
  const room = roomFor(dueWithin);
  const freshWithin = fresh.filter((c) => within(c) && isAround(c.lexeme?.cefr, level)).length;
  return dueWithin + Math.min(room, freshWithin);
});

/**
 * How many answers the closing round has left, never more than `cap`.
 *
 * The cap is what keeps this cheap to act on: the step needs five answers, so
 * an answer past the fifth changes nothing and there is no reason to say how
 * many there are.
 */
export async function closingLeft(
  ownerId: string, scope: ModuleScope, cap: number, now = new Date(),
): Promise<number> {
  if (cap <= 0) return 0;
  return Math.min(cap, await reachable(ownerId, scope.programme.id, scope.day.id, now.getTime()));
}
