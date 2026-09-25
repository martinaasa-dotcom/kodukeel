/**
 * WHAT THE REVIEW QUEUE ASKS, WRITTEN DOWN ONCE.
 *
 * Two screens need the answer and they need different halves of it. The review
 * page needs the cards, with everything a first meeting draws hanging off them.
 * The planned module needs only the size, because its closing step is finished
 * by five graded answers and a step that demands five answers out of a queue
 * holding three is a module nobody can finish. That was reported live: the last
 * step of an evening said "1 of 5 answers in", the round behind it said nothing
 * was due, and the day stopped at three quarters for good.
 *
 * A count computed beside the queue rather than out of it is two readings of
 * one question, and the one that is wrong is the one nobody is looking at: too
 * low and the step ticks before anybody reviewed, too high and the learner is
 * back where they started, pressing a button that goes nowhere. So the clauses
 * live here and both callers spread them into their own query. Neither can
 * drift, because there is nothing to drift from.
 *
 * `lib/srs/` rather than a pure directory: these are Prisma fragments and say
 * so in their types.
 */

import type { Prisma } from "@prisma/client";

import { LADDER_CARD_TYPE, LADDER_STATES } from "@/lib/learn/ladder";
import { APP_CHOSE } from "@/lib/srs/sources";

/**
 * WHICH UNSEEN CARDS OF A WORD MAY BE SERVED, WHICH IS THE ONES LEARN HAS
 * FINISHED WITH.
 *
 * A word's recognition card, production card and every case card the
 * dictionary can build arrive at once, all unseen, all in one `createMany`.
 * Learn teaches the word on its recognition card and everywhere else drills
 * everything else, so the line between the two is drawn here: a word whose
 * recognition card has not graduated out of New or Learning is Learn's, and
 * none of its other cards is offered yet. The moment it graduates the rest
 * arrive in the ordinary trickle.
 *
 * `notOnLadder` is what every route that can hand out an unseen card asks:
 * the review queue's own new-card read, a case or unit drill, the frequency
 * lists and a learner's own lookups. A drill or a frequency round ignores
 * scheduling, which means it also ignores `pastTheLadder`'s own guard unless
 * it is asked for by name: a word added moments ago carries a CASE_FORM card
 * at `state: 0` from the same batch as its recognition card, and a round that
 * reads by lapses and due date alone would hand that out as a first meeting,
 * in a case, before the word's own recognition card had ever been shown — a
 * `neljaks` the learner had never been shown `neli` for.
 *
 * Only an unseen card is at risk of this, so a card already past state 0 is
 * let through unconditionally: the ladder has already had its say about it.
 * `pastTheLadder` is asked only of the ones still at `state: 0`.
 *
 * A `none` on the word's own cards rather than a second query, so this costs
 * a subquery on an indexed column instead of a round trip. `lexemeId` is
 * nullable, and a card with no dictionary entry behind it has no ladder to be
 * on, so it is let through rather than filtered out by a clause that cannot
 * see it.
 */
export function pastTheLadder(ownerId: string): Prisma.CardWhereInput {
  return {
    OR: [
      { lexemeId: null },
      {
        lexeme: {
          cards: {
            none: {
              ownerId,
              cardType: LADDER_CARD_TYPE,
              state: { in: [...LADDER_STATES] },
            },
          },
        },
      },
    ],
  };
}

export function notOnLadder(ownerId: string): Prisma.CardWhereInput {
  return { OR: [{ state: { not: 0 } }, pastTheLadder(ownerId)] };
}

/**
 * A drill of words the learner has just brought in, which may meet them.
 *
 * `notOnLadder` is right for a drill of a case or a unit, where the words are
 * ones the learner already studies. A photographed page is words added a
 * minute ago, all still on the ladder, and asking it there leaves the drill
 * empty; asking nothing handed out a case card at `state: 0` as the first
 * sight of a word whose meaning had never been shown. So the word's own ladder
 * card stays, which the session introduces as a first meeting, and its other
 * cards wait until it has left the ladder, exactly as everywhere else.
 */
export function meetingFirst(ownerId: string): Prisma.CardWhereInput {
  return { OR: [notOnLadder(ownerId), { cardType: LADDER_CARD_TYPE }] };
}

/** How many cards one sitting of the review queue holds at most. */
export const MAX_SESSION = 60;
/** How many of those may be words the learner has never seen. */
export const NEW_PER_SESSION = 10;
/**
 * How many unstarted cards are read before ten of them are chosen.
 *
 * The queue used to ask for exactly ten and show them, so which words a
 * learner met next was decided entirely by the order they were added in. That
 * is right for a deck built one unit at a time and wrong the moment anything
 * else fills it: adding a whole level, importing a class handout or
 * photographing a page puts hundreds of cards in at one `createdAt`, spanning
 * every band the dictionary has, and the ten off the front of that are whatever
 * the insert happened to order first.
 *
 * Sixty is a wide enough window for the level to have something to choose
 * between and still one query of one page of rows.
 */
export const NEW_CANDIDATES = 60;

/**
 * What is due, and the one thing that is due and still may not be asked here.
 *
 * A WORD STILL ON THE LEARN LADDER IS NOT DUE HERE. Learn walks a new word up
 * three rungs on its recognition card, and the scheduler puts that card ten
 * minutes out between them, so within one evening it comes back due. Serving
 * it here as well would have both screens teaching one word and, worse, would
 * ask for it cold on the screen that does not teach: the ladder is what holds
 * the sentence and the four options. Once the card graduates it is ordinary
 * review like everything else, which is what "moves to practice" means.
 *
 * A plain predicate on the row rather than a subquery over the word, because
 * this is the hottest read in the app and the overlap is exactly this one
 * shape.
 */
export function dueWhere(ownerId: string, now: Date): Prisma.CardWhereInput {
  return {
    ownerId, suspended: false, due: { lte: now }, state: { not: 0 },
    NOT: { cardType: LADDER_CARD_TYPE, state: 1 },
  };
}

/**
 * The unseen window, narrowed to what the module has taught where anything
 * has.
 *
 * `due` on an unseen card is the moment it was written, so the date filter
 * changes nothing for anybody until they press "too complicated": that is what
 * a deferral moves, and without it a word put aside would be introduced again
 * on the next session (`lib/srs/defer.ts`).
 *
 * `theirOwnToo` is the daily path, where the gate is over this app's own
 * material alone: a word somebody looked up, photographed or pasted in is
 * theirs and is taught whatever the module has reached. Inside the module it
 * is false, because there the round is the module's own choosing.
 *
 * UNDER `AND`, BECAUSE `pastTheLadder` IS ITSELF AN `OR` AND A SECOND ONE
 * SPREAD BESIDE IT DELETES THE FIRST. Two `...` of `{ OR }` into one object
 * literal is the later key winning, silently, and what it would silently drop
 * here is the guard that keeps a word's case card off the screen until its own
 * recognition card has graduated.
 */
export function unseenWhere(
  ownerId: string,
  now: Date,
  only: readonly string[] | null = null,
  theirOwnToo = false,
): Prisma.CardWhereInput {
  return {
    ownerId, suspended: false, state: 0, due: { lte: now },
    AND: [
      pastTheLadder(ownerId),
      ...(only
        ? [{
            OR: [
              ...(theirOwnToo ? [{ source: { notIn: [...APP_CHOSE] } }] : []),
              { lexeme: { lemma: { in: [...only] } } },
            ],
          }]
        : []),
    ],
  };
}

/**
 * HOW MANY UNSEEN CARDS A SITTING HAS ROOM FOR, GIVEN WHAT IS DUE IN IT.
 *
 * The count handed in is what the sitting will actually *show*, which is the
 * correction rather than a detail. It used to be the unfiltered due read, and
 * the two differ by exactly the cards a module's closing round refuses: a
 * learner whose deck had sixty cards due, every one of them about a case the
 * evening had not read, had `60 - 60` room for new words and was handed an
 * empty round with no way to finish the evening.
 */
export function roomFor(shownDue: number): number {
  return Math.max(0, Math.min(NEW_PER_SESSION, MAX_SESSION - shownDue));
}
