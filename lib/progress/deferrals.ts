import { cache } from "react";

import { prisma } from "@/lib/db";
import type { Level } from "@/lib/collections/syllabus/types";
import { hardWords } from "@/lib/dict/facts";
import { lockDeck } from "@/lib/srs/deck";
import { bandReached, daysBetween, deferralFor, deferralNote, inForce, offeredBand, type Deferral } from "@/lib/srs/defer";

/**
 * PUTTING A WORD ASIDE, AND GIVING IT BACK.
 *
 * `lib/srs/defer.ts` decides how long and why; this is the half that reads the
 * learner's own level, writes the row and moves the cards. It lives in
 * `lib/progress/` for the reason the conventions give: it opens Prisma, and
 * the rule it applies has to be testable without one.
 *
 * WHAT MOVES IS `Card.due` AND NOTHING ELSE.
 *
 * Every read on the daily path already filters on `due`, so a pushed card is
 * out of review, out of the day's count and out of the learn ladder with no
 * query anywhere learning a new predicate. Stability, difficulty, reps and
 * lapses are untouched, because the learner did not answer anything: the word
 * arrives in three weeks in exactly the state it was in tonight. Nothing is
 * suspended, which is deliberate: `suspended` is the leech clinic's column and
 * it means "not coming back until somebody says so", which is the opposite of
 * this.
 *
 * AND IT GIVES BACK ONLY WHAT IT TOOK. A card FSRS had already scheduled past
 * the deferral's own date is never pulled forward by an undo, because the
 * cards this moved are exactly the ones now sitting on the date it wrote. A
 * blanket `due = now` over the word would hand a learner a card the scheduler
 * had honestly put six months out, which is the schedule being overwritten by
 * a button that promised not to touch it.
 */

/** What the learner is told, and enough to draw the row on `/words/mastery`. */
export interface DeferredWord {
  lexemeId: string;
  lemma: string;
  translation: string;
  band: string | null;
  reason: string;
  /** ISO, because a Date cannot cross to a client component and this list is one. */
  untilIso: string;
  untilLevel: string | null;
  times: number;
}

/**
 * Puts one word aside for one learner.
 *
 * The band it is read at is the *offered* band, so a word this deployment has
 * already moved up a step is judged where it now sits: a learner at A2 who
 * meets an A2 word the deployment has raised to B1 is told it waits for B1,
 * which is the same answer the ordering behind the scenes has already given.
 */
export async function deferWord(
  ownerId: string,
  lexemeId: string,
  /*
    Handed in rather than read here, and not only to keep the modules apart:
    `recordCourseLevel` calls `wakeForLevel` below, so a module that also
    reached back into `lib/progress/level.ts` would be a cycle between the two
    halves of one feature.
  */
  level: Level,
  context: string | null,
  now = new Date(),
): Promise<{ ok: true; note: string; deferral: Deferral } | { ok: false; error: string }> {
  const [word, hard] = await Promise.all([
    prisma.lexeme.findUnique({ where: { id: lexemeId }, select: { lemma: true, cefr: true } }),
    hardWords(),
  ]);
  if (!word) return { ok: false as const, error: "That word is not in the dictionary." };

  const band = offeredBand(word.cefr, hard.has(lexemeId));
  const fresh = deferralFor({ band, level, now });

  const deferral = await prisma.$transaction(async (tx) => {
    /*
      Under the deck lock every builder takes. A builder reads the deferral and
      dates its new cards on it under that lock, so a push that does not take
      it runs beside a builder that has read "none" and not yet committed: the
      push cannot see the uncommitted card, and it lands dated now, bringing
      the word straight back. Taken, the push waits for the builder and moves
      what it built.
    */
    await lockDeck(tx, ownerId);
    /*
      A SECOND PRESS NEVER SHORTENS A WAIT, WHICH IS A RULE ABOUT THE CARDS
      RATHER THAN ABOUT POLITENESS.

      Everything that hands a word back, the undo and `wakeForLevel`, matches
      the cards sitting on *the date this wrote*, which is what stops either of
      them pulling forward a card the scheduler had honestly put further out.
      A press that wrote an earlier date would leave the cards standing on the
      old one, matched by nothing, so the row would read three weeks while the
      word stayed gone for a term and the way back would do nothing at all.
      That is reachable: a wait for a band, then a level rise, then the same
      word in a tab opened before it went. So where a wait is already standing
      and reaches further than tonight's would, it is the one kept, whole,
      date and grounds together, and the press counts. Saying it twice is not a
      reason to see the word sooner.
    */
    const standing = await tx.deferral.findUnique({
      where: { ownerId_lexemeId: { ownerId, lexemeId } },
      select: { untilAt: true, untilLevel: true, reason: true, wokenAt: true, priorDues: true },
    });
    const holds = standing !== null && inForce(standing, now) && standing.untilAt >= fresh.untilAt;
    const kept: Deferral = holds
      ? {
          untilAt: standing.untilAt,
          untilLevel: standing.untilLevel,
          /*
            Anything that is not a wait for a band is the plain one, which is
            what reads a row written before this column's other value was
            renamed: `"WEEKS"` was the name while the plain wait was three
            weeks long, and it is three days now. Nothing else in the app
            compares the stored string, so old rows normalise here rather than
            needing a migration for a name.
          */
          reason: standing.reason === "BAND" ? "BAND" : "SOON",
          days: daysBetween(now, standing.untilAt),
        }
      : fresh;

    /*
      WHAT THIS PUSH MOVES, AND FROM WHERE, SO THE WAY BACK CAN PUT IT THERE.

      A give-back used to set every card sitting on the wait's date to now,
      which is right for a card that was due tonight and wrong for one the
      scheduler had due in two days or in two months: it came back early, on
      the button that promised not to touch the schedule. A card already on a
      wait still standing keeps the date it had before that wait, because the
      date it has now is the wait's rather than the scheduler's.
    */
    const earlier = standing && inForce(standing, now) ? readPriorDues(standing.priorDues) : {};
    const moving = await tx.card.findMany({
      where: { ownerId, lexemeId, due: { lt: kept.untilAt } },
      select: { id: true, due: true },
    });
    // What the standing wait already moved is carried over, since a press that
    // keeps it moves nothing and would otherwise forget where those cards were.
    const priorDues: Record<string, string> = { ...earlier };
    for (const card of moving) priorDues[card.id] = earlier[card.id] ?? card.due.toISOString();

    await tx.deferral.upsert({
      where: { ownerId_lexemeId: { ownerId, lexemeId } },
      create: {
        ownerId, lexemeId, lemma: word.lemma, band, level,
        reason: kept.reason, untilAt: kept.untilAt, untilLevel: kept.untilLevel,
        context, priorDues,
      },
      /*
        A second press is the same person saying it again, so the row keeps its
        age. `times` is how loudly one learner said it and is deliberately not
        what the deployment-wide count reads: that one counts rows, so it
        counts people.
      */
      update: {
        lemma: word.lemma, band, level,
        reason: kept.reason, untilAt: kept.untilAt, untilLevel: kept.untilLevel,
        context, priorDues, times: { increment: 1 },
        // A word put aside again is put aside again, whatever happened to the
        // last wait: a stale `wokenAt` would leave the row reading as spent
        // and the deck would go on serving a word somebody just refused.
        wokenAt: null,
      },
    });
    // Never earlier than it was: a card the scheduler had already put past
    // this date is left where the scheduler put it.
    await tx.card.updateMany({
      where: { ownerId, lexemeId, due: { lt: kept.untilAt } },
      data: { due: kept.untilAt },
    });
    return kept;
  });

  return { ok: true as const, note: deferralNote(deferral, word.lemma), deferral };
}

/**
 * Gives a word back now, because the learner asked for it.
 *
 * The row goes rather than being marked spent: it is a live state, and a
 * learner who has changed their mind has not told the deployment anything
 * about how hard the word is. Leaving it to be counted would let one person's
 * undone press stand in the aggregate for ever.
 */
export async function undoDeferral(ownerId: string, lexemeId: string, now = new Date()): Promise<boolean> {
  /*
    Under the deck lock, for the reason `deferWord` takes it, pointed the other
    way: a builder that read the deferral and has not yet committed dates its
    card on `untilAt`, and an undo running beside it would hand back the cards
    it can see, delete the row, and leave that one on the old date with nothing
    left to bring it back. Read inside the lock, so the row is the one in force,
    and a second press landing in between cannot move the cards to a date this
    then fails to match.
  */
  return prisma.$transaction(async (tx) => {
    await lockDeck(tx, ownerId);
    const row = await tx.deferral.findUnique({
      where: { ownerId_lexemeId: { ownerId, lexemeId } },
      select: { untilAt: true, priorDues: true },
    });
    if (!row) return false;
    await giveBack(tx, ownerId, lexemeId, row, now);
    await tx.deferral.delete({ where: { ownerId_lexemeId: { ownerId, lexemeId } } });
    return true;
  });
}

/** The recorded prior dues, read defensively: a JSON column is whatever was put there. */
function readPriorDues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [id, iso] of Object.entries(value as Record<string, unknown>)) {
    if (typeof iso === "string" && !Number.isNaN(Date.parse(iso))) out[id] = iso;
  }
  return out;
}

/**
 * Puts a word's cards back where the wait found them.
 *
 * Only the cards still sitting on the date the wait wrote, which is what stops
 * this reaching a card the scheduler has since put somewhere else; and each
 * one to the later of now and the date it had before, so nothing the scheduler
 * had put after tonight comes back tonight. A card with no recorded date, built
 * after the press or on a row written before the column, comes back now.
 */
async function giveBack(
  tx: Pick<typeof prisma, "card">,
  ownerId: string,
  lexemeId: string,
  row: { untilAt: Date; priorDues: unknown },
  now: Date,
): Promise<void> {
  const prior = readPriorDues(row.priorDues);
  const sitting = await tx.card.findMany({
    where: { ownerId, lexemeId, due: row.untilAt },
    select: { id: true },
  });
  const byDate = new Map<number, string[]>();
  for (const card of sitting) {
    const was = prior[card.id] ? new Date(prior[card.id]!) : now;
    const back = was.getTime() > now.getTime() && was.getTime() < row.untilAt.getTime() ? was : now;
    const ids = byDate.get(back.getTime()) ?? [];
    ids.push(card.id);
    byDate.set(back.getTime(), ids);
  }
  for (const [time, ids] of byDate) {
    await tx.card.updateMany({ where: { id: { in: ids }, ownerId, due: row.untilAt }, data: { due: new Date(time) } });
  }
}

/** The words this learner has put aside and has not got back yet. */
export async function deferredFor(ownerId: string, now = new Date()): Promise<DeferredWord[]> {
  const rows = await prisma.deferral.findMany({
    where: { ownerId, wokenAt: null, untilAt: { gt: now } },
    // Total, because the list is cut at a page and a tie handed to the planner
    // is a list that reorders between two loads (`lib/progress/cases.ts`).
    orderBy: [{ untilAt: "asc" }, { id: "asc" }],
    take: 200,
  });
  if (rows.length === 0) return [];

  const words = await prisma.lexeme.findMany({
    where: { id: { in: rows.map((row) => row.lexemeId) } },
    select: { id: true, lemma: true, translation: true },
  });
  const byId = new Map(words.map((word) => [word.id, word]));

  return rows.map((row) => ({
    lexemeId: row.lexemeId,
    lemma: byId.get(row.lexemeId)?.lemma ?? row.lemma,
    translation: byId.get(row.lexemeId)?.translation ?? "",
    band: row.band,
    reason: row.reason,
    untilIso: row.untilAt.toISOString(),
    untilLevel: row.untilLevel,
    times: row.times,
  }));
}

/**
 * The words a read that ignores the schedule has to leave alone.
 *
 * Pushing `Card.due` is what takes a deferred word out of review, out of
 * Today's count and out of the new-card queue, and it is enough everywhere a
 * read asks what is due. Two reads deliberately do not: the ladder serves a
 * word part way up whatever its date, because between rungs the scheduler
 * puts it ten minutes out, and the deck snapshot counts those the same way.
 * Telling a ten minute step from a three week deferral by the size of the gap
 * would be a guess with a constant in it, so they ask instead. One indexed
 * read of a small table, beside whatever else those callers are already
 * fetching rather than in front of it.
 */
export function deferredWordIds(ownerId: string, now = new Date()): Promise<ReadonlySet<string>> {
  const slot = deferredSlot(ownerId);
  slot.read ??= readDeferredWordIds(ownerId, now);
  return slot.read;
}

/*
  ONE READ PER LEARNER PER RENDER. Today's deck snapshot, the ladder's own
  counts and the course's "have the words been met" each ask this, a few
  milliseconds apart, and each was a round trip. A slot per learner rather than
  a memo keyed on the instant, because every caller hands in its own `new
  Date()` and a key on the millisecond would never hit: the first caller's
  instant answers for the render, which is a difference of milliseconds on a
  wait measured in days. Outside a render `cache` hands back a fresh slot
  every time, so a test passing its own instant is read against that instant.
  No action puts a word aside and then asks this in the same request.
*/
const deferredSlot = cache((ownerId: string): { read?: Promise<ReadonlySet<string>> } => {
  void ownerId;
  return {};
});

async function readDeferredWordIds(ownerId: string, now: Date): Promise<ReadonlySet<string>> {
  const rows = await prisma.deferral.findMany({
    where: { ownerId, wokenAt: null, untilAt: { gt: now } },
    select: { lexemeId: true },
  });
  return new Set(rows.map((row) => row.lexemeId));
}

/**
 * AND A CARD BUILT FOR A WORD ALREADY PUT ASIDE IS BUILT PUT ASIDE.
 *
 * Pushing `due` reaches every card that exists, and the unit lesson is where a
 * word is put aside *before* there is one: the lesson teaches the unit's words
 * and `completeLesson` builds the cards at the end, so a word refused halfway
 * through would come back the next morning with a card dated today. So would
 * pressing "Add to deck" on the unit afterwards. The promise the note makes is
 * about the word rather than about the rows that happened to exist when it was
 * made, and a button that quietly stops working the moment the word is added
 * again is worse than no button.
 *
 * Takes the client it is handed, because both callers ask this inside the
 * transaction that holds the deck lock: one indexed lookup on the key the row
 * is unique by, next to a read of the deck they were doing anyway.
 */
export async function deferredDues(
  client: Pick<typeof prisma, "deferral">,
  ownerId: string,
  lexemeIds: readonly string[],
  now = new Date(),
): Promise<Map<string, Date>> {
  if (lexemeIds.length === 0) return new Map();
  const rows = await client.deferral.findMany({
    where: { ownerId, lexemeId: { in: [...lexemeIds] }, wokenAt: null, untilAt: { gt: now } },
    select: { lexemeId: true, untilAt: true },
  });
  return new Map(rows.map((row) => [row.lexemeId, row.untilAt]));
}

/**
 * Hands back every word that was waiting for a band the learner has reached.
 *
 * Called from both writers of a level, `recordCourseLevel` and a level
 * check's `saveResult`, so this runs where the fact changes rather than on a
 * read path. A word deferred to B1 by somebody who moves up to B1 in March
 * is a word they asked for: leaving it on its backstop date would mean the
 * button that says "it waits until you get there" does not.
 *
 * Only the cards still sitting on the date this wrote, exactly as an undo
 * does, and only where the wait really was for a band.
 */
export async function wakeForLevel(ownerId: string, level: string, now = new Date()): Promise<number> {
  /*
    Under the deck lock, as the undo is and for its reason: a builder that has
    read a deferral and not yet committed dates its card on `untilAt`, and a
    wake beside it would stamp the row and leave that card on the old date.
  */
  return prisma.$transaction(async (tx) => {
    await lockDeck(tx, ownerId);
    const rows = await tx.deferral.findMany({
      where: { ownerId, wokenAt: null, untilLevel: { not: null }, untilAt: { gt: now } },
      select: { id: true, lexemeId: true, untilAt: true, untilLevel: true, priorDues: true },
    });
    const reached = rows.filter((row) => bandReached(row, level));
    if (reached.length === 0) return 0;

    /*
      Only the cards still sitting on the date this wrote, each to where the
      wait found it, exactly as an undo does (`giveBack`).
    */
    for (const row of reached) await giveBack(tx, ownerId, row.lexemeId, row, now);
    /*
      The row stays and is stamped rather than deleted. What the learner said
      is still true of the evening they said it, and the deployment-wide count
      is built from exactly that; what the stamp buys is that no read path has
      to fetch a level to find out whether the wait is over.
    */
    await tx.deferral.updateMany({
      where: { id: { in: reached.map((row) => row.id) } },
      data: { wokenAt: now },
    });
    return reached.length;
  });
}
