import { raiseBand, rankBand } from "@/lib/collections/levels";
import type { Level } from "@/lib/collections/syllabus/types";

/**
 * "THIS IS TOO COMPLICATED", AND WHAT THE APP DOES ABOUT IT.
 *
 * Every other verdict in this app is a claim about whether a learner recalled
 * something. This is the one button that is a claim about the *card*: not "I
 * got it wrong", which the scheduler already handles well, but "this is not
 * worth my evening yet". A learner meeting a word three bands past them has
 * no honest answer among Again, Hard, Good and Easy: Again says they nearly
 * had it and brings it straight back, and the leech clinic is for a word they
 * keep failing rather than one they were never ready for. So they pressed
 * Again, the card came back, and the app read the whole exchange as somebody
 * learning slowly.
 *
 * TWO OUTCOMES, AND THE WORD'S OWN BAND DECIDES WHICH.
 *
 * A word at or below the learner's level is one they are supposed to be
 * meeting, so it goes back a few days and comes round again: a bad evening is
 * a bad evening. A word *above* their level is not a scheduling problem at
 * all, it is a word that arrived early, so it waits for the band it belongs
 * to. That is the difference between "not tonight" and "not yet", and the
 * screen says which one it did.
 *
 * THE WAIT FOR A BAND STILL CARRIES A DATE, because a learner who never
 * formally levels up must not lose a word for ever. The date is the backstop
 * and reaching the band is the mechanism (`wakeForLevel`), which is why the
 * backstop is deliberately shorter than a band actually takes: see
 * `BAND_DAYS`.
 *
 * WHAT THE SCHEDULER IS TOLD: nothing. A deferral moves `Card.due` and
 * touches no FSRS column, writes no `Review` row and reports no grade. A word
 * somebody put aside is a word they did not answer, and recording it as a
 * lapse would teach the scheduler that they failed a question nobody asked
 * (ADR-014, ADR-016).
 *
 * Pure: no database, no React, no clock it was not handed. What it decides is
 * how long and why; `lib/progress/deferrals.ts` is what writes it down.
 */

/**
 * A word at or below the learner's band goes back this far. Not tonight.
 *
 * THREE DAYS, AND IT WAS THREE WEEKS, which was the wrong reading of this
 * button's own argument. The paragraph above says a bad evening is a bad
 * evening, and then the app answered one bad evening by taking the word away
 * for most of a month. A learner pressed it on `ma ei saa aru`, which is a
 * phrase the first unit of the course teaches, and read that it would be back
 * in about three weeks: three weeks is not "not tonight", it is a word out of
 * the deck for six or eight sittings, and by the time it comes round the
 * evening it was refused on has nothing to do with anything.
 *
 * What the button means is that the learner does not want this word *now*.
 * The honest answer to that is the next study day but one: long enough that
 * it is out of tonight's queue and is not the first thing back tomorrow
 * either, short enough that nobody has lost the word. Three calendar days
 * lands there on every schedule this app supports, which is why it is
 * counted in days rather than in sittings: somebody studying daily skips two
 * evenings, somebody studying three times a week gets it on their next study
 * day, and somebody studying twice a week gets it on the one after.
 *
 * It is also what makes a second press mean something. At three weeks,
 * pressing twice on one word was rare enough that `times` recorded almost
 * nothing; at three days a learner who keeps refusing a word says so
 * repeatedly, and that is the signal `tooHardForEveryone` is built out of.
 */
export const DEFER_DAYS = 3;

/**
 * And a word that arrived early goes back a term.
 *
 * DELIBERATELY SHORTER THAN A BAND TAKES, which is the whole argument for the
 * number. `lib/assessment/plan.ts` puts a band at 180 hours and up, which at
 * the five hours a week it assumes somebody finds is most of a year: a
 * backstop that honest would be a word deleted with extra steps, because
 * nobody would meet it again inside the year whatever happened to their
 * Estonian. The date is not the mechanism here. Reaching the band is
 * (`wakeForLevel`), and this is what catches the learner who never formally
 * levels up, which on a deployment where a level is a thing you tick in
 * Settings is most of them.
 *
 * So a term: long enough that the word is properly out of the way, short
 * enough that the answer to "when do I see this again" is never "next year".
 * If it comes back and is still beyond them, the button is one press away and
 * the deployment-wide count is one press better informed.
 *
 * UNCHANGED WHEN THE OTHER ONE SHRANK, because the two answer different
 * questions. "Not tonight" is about an evening and is now three days. "Not
 * yet" is about a band, and shortening it would hand somebody the word they
 * were not ready for again before anything about them had changed.
 */
export const BAND_DAYS = 84;

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
/** What a month is worth when a span is rounded into one. */
const DAYS_PER_MONTH = 30.44;
/** Past a fortnight a count of days is arithmetic rather than an answer. */
const WEEKS_FROM_DAYS = 14;
/** And past ten weeks the weeks are the arithmetic instead. */
const MONTHS_FROM_DAYS = 70;

export type DeferReason =
  /** At or below their band: a few days, and it comes back on its own. */
  | "SOON"
  /** Above their band: it waits for the band, with a date as the backstop. */
  | "BAND";

export interface Deferral {
  /** When the word comes back whatever else happens. */
  untilAt: Date;
  /** The band it is waiting for, where it is waiting for one. */
  untilLevel: string | null;
  reason: DeferReason;
  /** How long that is, in whole days, for the sentence the learner reads. */
  days: number;
}

/**
 * How long this word goes away for, and on what grounds.
 *
 * The word's *effective* band is what decides, so a word the deployment has
 * already raised a step (see `tooHardForEveryone` below) is read at the band
 * it is now offered at rather than the one the dictionary recorded. An
 * untagged word carries no claim about its difficulty at all, which is most
 * of what somebody typed in or photographed off their own homework, so it
 * takes the plain few days: the app has no grounds to say it arrived early.
 */
export function deferralFor(input: { band: string | null; level: Level; now: Date }): Deferral {
  const { band, level, now } = input;
  const above = band !== null && rankBand(band) > rankBand(level);
  const days = above ? BAND_DAYS : DEFER_DAYS;

  return {
    untilAt: new Date(now.getTime() + days * DAY_MS),
    untilLevel: above ? band : null,
    reason: above ? "BAND" : "SOON",
    days,
  };
}

/**
 * How far off a date is, in whole days, for the sentence the learner reads.
 *
 * Rounded rather than floored, and never below one: a wait already standing
 * with a few hours left on it is "1 day" rather than "0 days", which is the
 * same rule `lib/time/duration.ts` states one directory over about a figure
 * whose smaller end rounds to a zero it is not.
 */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

/**
 * A span of days, written in the unit that makes it an answer.
 *
 * The rule `lib/time/duration.ts` states about a stretch of study, applied to
 * a stretch of calendar: the unit follows the size, because the same number
 * of days is a count somebody can picture at three and arithmetic at eighty.
 * "3 days" is a fact a learner plans around. "84 days" is a sum, and "about
 * 12 weeks" is one they have to do in their head; "about 3 months" is the
 * thing a person would actually say.
 *
 * Days carry no hedge and the two coarser units do, which is not decoration:
 * three days from tonight is a date, and a span rounded into weeks or months
 * is not the date the row holds. What the row holds is what `PutAside` prints,
 * which is why that screen prints the date itself rather than any of this.
 */
export function awayIn(days: number): string {
  const safe = Math.max(1, Math.round(days));
  if (safe < WEEKS_FROM_DAYS) return safe === 1 ? "1 day" : `${safe} days`;
  if (safe < MONTHS_FROM_DAYS) return `about ${Math.round(safe / DAYS_PER_WEEK)} weeks`;
  const months = Math.round(safe / DAYS_PER_MONTH);
  return months === 1 ? "about a month" : `about ${months} months`;
}

/**
 * What the learner is told, which is what happened rather than thank you.
 *
 * Both sentences name the word and say when it comes back, because a button
 * whose whole effect is invisible for days has to describe itself or it reads
 * as having done nothing.
 */
export function deferralNote(deferral: Deferral, lemma: string): string {
  if (deferral.reason === "BAND") {
    return `Put aside. ${lemma} is a ${deferral.untilLevel} word, so it waits until you get there, or ${awayIn(deferral.days)}.`;
  }
  return `Put aside. ${lemma} comes back in ${awayIn(deferral.days)}.`;
}

/**
 * Whether a stored deferral is still holding.
 *
 * Two ways it ends and only one of them is a date. The other is the learner
 * reaching the band the word was waiting for, which is stamped on the row by
 * `wakeForLevel` at the moment the level changes rather than worked out here:
 * a dozen read paths ask this question and not one of them should have to
 * fetch a level to answer it, and the level changes about twice a year.
 */
export function inForce(
  row: { untilAt: Date; wokenAt: Date | null },
  now: Date,
): boolean {
  return row.wokenAt === null && now < row.untilAt;
}

/** True when a wait for a band is over because the learner reached it. */
export function bandReached(row: { untilLevel: string | null }, level: string): boolean {
  return row.untilLevel !== null && rankBand(level) >= rankBand(row.untilLevel);
}

// ───────────────────────── And then for everybody ──────────────────────────

/**
 * WHEN ENOUGH PEOPLE SAY IT, IT IS THE COURSE THAT IS WRONG.
 *
 * One learner putting a word aside is a fact about their evening. Forty of
 * them putting the same word aside is a fact about where that word sits in
 * the course, and leaving it for each of them to discover one at a time is
 * this app knowing something and not acting on it. So a word enough people
 * have put aside is *offered* one band later than the dictionary records it,
 * for everybody, which is the one lever that changes who meets it and when
 * (`effectiveBand`, and `atLevelFirst` on the review page).
 *
 * TWO NUMBERS, BECAUSE A HEAD COUNT ON ITS OWN IS NOT EVIDENCE. Five people
 * out of the five who have the word is the course being wrong; five out of
 * four hundred is five people having a bad week, and moving the word on that
 * would mean the busiest deployments could never hold a word still. The
 * denominator is how many learners hold a card for the word, which is the
 * only honest reading of "how many people met it", and it is the reason
 * `hardWords` in `lib/dict/facts.ts` asks `Card` about the candidates rather
 * than counting deferrals alone.
 *
 * ONE BAND AND NEVER MORE, and never over C2. A word can be moved up once and
 * then has to earn it again from the learners who meet it at the new band,
 * which is what stops a feedback loop walking a word off the top of the
 * course. And nothing is written to `Lexeme`: the band the Institute recorded
 * is the band the dictionary shows, and this changes only the order words are
 * taught in (ADR-014's rule about derived state, and ADR-005's about whose
 * data the dictionary is).
 */
export const HARD_LEARNERS = 5;
export const HARD_SHARE = 0.2;

export function tooHardForEveryone(input: { learners: number; holders: number }): boolean {
  const { learners, holders } = input;
  if (learners < HARD_LEARNERS) return false;
  // A word nobody is recorded as holding cannot have been put aside by
  // anybody, so the share is not a division by zero, it is a row to distrust.
  if (holders <= 0) return false;
  return learners >= HARD_SHARE * holders;
}

/** The band a word is offered at, which is one step up where enough have said so. */
export function offeredBand(cefr: string | null, raised: boolean): string | null {
  return raised ? raiseBand(cefr) : cefr;
}
