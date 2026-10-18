import { cache } from "react";

import { prisma } from "@/lib/db";
import { courseLevelFor } from "@/lib/progress/level";
import { aroundFirst, bandsAround, isAround } from "@/lib/collections/levels";
import { offeredBand } from "@/lib/srs/defer";
import { hardWords } from "@/lib/dict/facts";
import { commonFirst } from "@/lib/collections/commonFirst";
import type { Level } from "@/lib/collections/syllabus";
import { inTeachingOrder } from "@/lib/srs/cards";
import { spaceSiblings } from "@/lib/srs/queue";
import { reviewable, type ModuleScope } from "@/lib/course/scope";
import { learnerScopeSoFar, moduleSpellings } from "@/lib/progress/moduleScope";
import {
  MAX_SESSION, MODULE_SESSION, NEW_CANDIDATES, dueWhere, roomFor, taughtWhere, tonightWhere,
  unseenWhere,
} from "@/lib/srs/reviewQueue";
import { deferredWordIds } from "@/lib/progress/deferrals";
import { closingOpenedAt } from "@/lib/progress/course";
import { askableRows, include, type CardRow } from "./cards";

/**
 * WHAT ONE SITTING OF REVIEW HOLDS, DECIDED IN ONE PLACE.
 *
 * Today printed "20 due, if you'd rather practice what you know", the learner
 * pressed it, was asked one card and told they were all caught up; Today then
 * said 19. The count was `deckSnapshot`'s tally over the whole deck and the
 * session was this page's queue, and the two disagreed in four places: the
 * unseen cards the count trickled in were never held to what the module had
 * taught, the queue read a window of sixty unseen cards and a window of 120
 * due ones *before* filtering them, so a deck whose oldest rows the gate
 * refused could serve one card while holding forty, and a bare form card with
 * no recorded sentence was dropped inside `withChoices`, after everything had
 * been counted. Each was a second reading of one question, and the one that
 * was wrong was the one nobody was looking at.
 *
 * So the queue is built here, and every screen that prints how many cards
 * Review holds counts *this list* rather than reasoning about it: Today, its
 * review strip, Practice, and the review page itself. There is no second
 * reading to drift.
 *
 * And the windows page forward rather than stop at their first read, so a
 * refused row costs a read and never a card: the gate decides which cards may
 * be asked, and how many of them there are is a fact about the deck rather
 * than about where the first page happened to end. Bounded by `PAGES`, so the
 * worst deck costs a handful of indexed reads.
 */
export interface ReviewQueue {
  /** Due cards, spaced, in the order they are asked. */
  due: CardRow[];
  /**
   * Whether more is due than one sitting holds, so a screen printing the due
   * count says "60+" rather than passing the cap off as the total.
   */
  dueMore: boolean;
  /** Unseen cards trickled in after them, in teaching order. */
  fresh: CardRow[];
  /**
   * The whole sitting: `due` then `fresh` on the daily path, and tonight's own
   * words alone inside the module, where `due` and `fresh` are empty.
   */
  cards: CardRow[];
  /** What the module has taught, which the caught-up screen reads. */
  taught: ModuleScope | null;
}

/** How many pages of each window are read before the queue settles for what it has. */
const PAGES = 6;

export const reviewQueue = cache(async (
  ownerId: string,
  /** The step's own scope where the module opened the round; null on the daily path. */
  scope: ModuleScope | null,
  now: Date,
): Promise<ReviewQueue> => {
  /*
    The daily path is held to the module too: what the module has taught so
    far, and the learner's own words beside it (see the review page's header).
  */
  const taught = scope ?? await learnerScopeSoFar(ownerId);
  const [level, spellings] = await Promise.all([courseLevelFor(ownerId), moduleSpellings(taught)]);
  const allowed = (card: CardRow) => reviewable(taught, card, spellings);

  /*
    THE MODULE'S CLOSING ROUND IS TONIGHT'S WORDS AND NOTHING ELSE.

    It used to be the whole queue narrowed to what the module had taught: due
    cards from every evening so far, then a trickle of unseen ones, and
    tonight's words only to fill what was left. So the last step of an evening
    called "a quick review" was a mix of everything the learner had ever met,
    and the operator's call is that it should be a review of the batch the
    evening taught. What else is due is still due, on Review, from Today.
    See `tonightWhere`, which the step's own count reads too.
  */
  if (scope) {
    const [aside, openedAt] = await Promise.all([
      deferredWordIds(ownerId, now), closingOpenedAt(ownerId, scope.programme, scope.day.id),
    ]);
    const tonight = await prisma.card.findMany({
      where: {
        AND: [
          tonightWhere(ownerId, now, scope.day.words, aside, openedAt),
          taughtWhere(scope),
        ],
      },
      // What is due first, then the soonest; the id settles a tie.
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: MODULE_SESSION * 2,
      include,
    });
    const cards = spaceSiblings(
      await askableRows(tonight.filter(allowed)), (card) => card.lexemeId,
    ).slice(0, MODULE_SESSION);
    return { due: [], dueMore: false, fresh: [], cards, taught };
  }

  /*
    WHAT IS DUE, read a page at a time until a sitting is full or the deck runs
    out. The id settles a tie in the order, because a word's cards share a
    `due` to the millisecond and date alone leaves the cut to the query plan.
    Each page is gated (`reviewable`) and then made askable (`askableRows`),
    so what is kept here is exactly what the session will show.
  */
  const dueWindow = MAX_SESSION * 2;
  const dueKept: CardRow[] = [];
  for (let page = 0; page < PAGES && dueKept.length <= MAX_SESSION; page++) {
    const rows = await prisma.card.findMany({
      where: { AND: [dueWhere(ownerId, now), taughtWhere(taught)] },
      orderBy: [{ due: "asc" }, { id: "asc" }],
      skip: page * dueWindow,
      take: dueWindow,
      include,
    });
    dueKept.push(...(await askableRows(rows.filter(allowed))));
    if (rows.length < dueWindow) break;
  }
  const dueWithin = dueKept.slice(0, MAX_SESSION);
  // Read one past the cap above, so this can say whether the cap bit.
  const dueMore = dueKept.length > MAX_SESSION;
  const due = spaceSiblings(dueWithin, (card) => card.lexemeId);

  /*
    ROOM IS MEASURED AGAINST WHAT THE SITTING WILL SHOW, which after the pages
    above is the kept list itself. See `roomFor`.
  */
  const room = roomFor(dueWithin.length);
  let fresh: CardRow[] = [];
  if (room > 0) {
    const [pool, raised] = await Promise.all([
      unseenPool(ownerId, now, taught?.lemmas ?? null, allowed, null),
      hardWords(),
    ]);
    const inBand = pool.some((c) => isAround(c.lexeme?.cefr, level))
      ? pool
      : await unseenPool(ownerId, now, taught?.lemmas ?? null, allowed, level);
    const ranked = atLevelFirst(inBand.length > 0 ? inBand : pool, level, raised);
    /*
      Made askable before the cut, so a bare form card held back leaves its
      place to the next word rather than a hole in the sitting.
    */
    fresh = (await askableRows(ranked)).slice(0, room);
  }
  fresh = inTeachingOrder(fresh);

  return { due, dueMore, fresh, cards: [...due, ...fresh], taught };
});

/**
 * The unseen window, gated and paged until it holds `NEW_CANDIDATES` cards a
 * session may introduce, or the deck runs out.
 *
 * `band` narrows it to the bands around the learner's level, which is the
 * second read `inBandPool` used to make (below): a window of the sixty oldest
 * unseen cards can hold nothing near the learner's level, and ordering sixty
 * A1 cards by how near A1 they are cannot help a B1 learner. The level stays
 * an ordering rather than a gate, since the caller falls back to the plain
 * window when the band holds nothing.
 *
 * Ordered by lexeme as well as by date so a word's cards stay together: they
 * share one `createdAt`, so date alone leaves them tied and the take can
 * interleave two words. `inTeachingOrder` then settles the order *within* a
 * word. And the id last, because a word's cards tie on both of those.
 */
async function unseenPool(
  ownerId: string, now: Date, only: readonly string[] | null,
  allowed: (card: CardRow) => boolean, band: Level | null,
): Promise<CardRow[]> {
  const kept: CardRow[] = [];
  for (let page = 0; page < PAGES && kept.length < NEW_CANDIDATES; page++) {
    const rows = await prisma.card.findMany({
      where: {
        // `unseenWhere` keeps its lemma filter under `AND`, so the `lexeme`
        // key here is free to carry the band without deleting it.
        ...unseenWhere(ownerId, now, only),
        ...(band ? { lexeme: { cefr: { in: [...bandsAround(band)] } } } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { lexemeId: "asc" }, { id: "asc" }],
      skip: page * NEW_CANDIDATES,
      take: NEW_CANDIDATES,
      include,
    });
    kept.push(...rows.filter(allowed));
    if (rows.length < NEW_CANDIDATES) break;
  }
  return kept;
}

/**
 * New words around the learner's level first, and the commonest of those
 * ahead of the rest.
 *
 * The one place a level can honestly reach the daily loop. What is *due* is
 * decided by FSRS and may not be reordered by anything: a card comes back when
 * the scheduler says, whatever band it is in, or the schedule is not a
 * schedule. What has never been seen has no schedule yet, and choosing which
 * of those to teach next is exactly the judgment a level is for.
 *
 * `aroundFirst` orders and never drops, and a word the learner typed in,
 * pasted or photographed carries no band at all and counts as at level, since
 * they went to the trouble of putting it there. Both of those are
 * `lib/collections/levels.ts`, which is where they can be tested.
 *
 * THE BAND IS THE OUTER ORDERING AND THE CORPUS IS THE INNER ONE, which is
 * what composing the two stable partitions in this order gets: `commonFirst`
 * runs first and `aroundFirst` runs over its answer, so a word out of band
 * never leads on the strength of being common, and inside a band the words the
 * corpus counts most lead the ones it has never heard of. Until now the tie
 * inside a band was `createdAt`, which is when a card happened to be written:
 * a deck holding a unit, a photographed handout and an afternoon of looking
 * things up taught them in assembly order, and `ja` and `aga` waited behind
 * whatever went in first. The measurement was already in the repository and
 * reached two browsing screens and not the queue.
 *
 * It is a partition rather than a rank for the reason `commonFirst` gives at
 * length, which is that a noun and a verb are counted differently and cannot
 * be ranked against each other.
 */
function atLevelFirst(
  cards: readonly CardRow[], level: Level, raised: ReadonlySet<string>,
): CardRow[] {
  /*
    THE BAND THIS DEPLOYMENT OFFERS THE WORD AT, NOT THE ONE IT RECORDS.

    A word enough learners have put aside is offered one band later, for
    everybody, which is the one lever that changes who meets it and when
    (`lib/srs/defer.ts`). Nothing is written to `Lexeme`: the entry still shows
    the band the Institute recorded, and what moved is the order words are
    taught in, which is derived on every read like every other ordering here.
  */
  const offered = (c: CardRow) =>
    offeredBand(c.lexeme?.cefr ?? null, c.lexemeId !== null && raised.has(c.lexemeId));
  return aroundFirst(commonFirst(cards, (c) => c.lexeme?.lemma), level, offered);
}



