import { BANDS, type Band, type ItemRef, type Response, type Skill } from "./types";
import { FLOOR, PASS } from "./score";

/**
 * Which question comes next.
 *
 * The paper is laid out in ascending bands within each skill, and this is the
 * part that stops climbing. Once a band has been answered and not passed, at
 * most one more band is asked above it: they would take several more minutes
 * to confirm what the band below already said, and being walked up a ladder
 * you have visibly fallen off is a miserable way to start with an app.
 *
 * And within a band it stops as soon as the band is decided (`bandOutcome`),
 * which is what makes "I don't know" end a band rather than lengthen it.
 *
 * It is what keeps an eighty question paper from being eighty questions for
 * everybody. A learner who reads at A2 answers the A1, A2 and B1 questions and
 * is done; one who reads at C1 answers the lot, which is the paper they need.
 *
 * It is a pure function of the paper and the answers so far, so a test can walk
 * a whole session through it without a browser, and so the runner has no state
 * of its own to get out of step.
 */

export interface SessionCursor {
  /** The item to ask, or null when the paper is finished. */
  index: number | null;
  /** Items that will not now be asked, for the honest count on the result. */
  skipped: number;
}

/**
 * What a band has come to, as soon as the answers still to come cannot change it.
 *
 * **A band stops being asked the moment it is decided, not when it runs out.**
 * Six reading questions at a band is what it takes to tell a near miss from a
 * pass when the answers are mixed, and it is far more than it takes when they
 * are not: four right out of six has passed whatever the last two say, and
 * three "I don't know"s and a wrong pick out of six cannot reach half. Asking
 * the rest in either case is a minute spent measuring nothing, and for somebody
 * pressing "I don't know" it is the app making them say it again and again
 * about a band they have already told it they do not have.
 *
 * So the band is scored against its whole size with the unanswered questions
 * taken both ways: as all wrong for the lowest it can still end on, and all
 * right for the highest. Where both land in the same class, that is the
 * outcome. It is the same class the finished band would have had, and the same
 * class `levelFrom` reads off the answered part: at or above `PASS` over the
 * whole band is at or above it over the answered part, and under `FLOOR` with
 * every remaining question right is under it over the answered part too, since
 * adding right answers only raises a ratio. A skipped listening question is not
 * evidence and is left out of both counts.
 *
 * Null while it could still go more than one way.
 */
export type BandOutcome = "pass" | "near" | "fail";

export function bandOutcome(
  items: readonly ItemRef[],
  responses: readonly Response[],
  skill: Skill,
  band: Band,
): BandOutcome | null {
  const asked = items.filter((i) => i.skill === skill && i.band === band);
  if (asked.length === 0) return null;
  const own = new Set(asked.map((i) => i.id));
  const mine = responses.filter((r) => own.has(r.itemId));
  const answered = mine.filter((r) => !r.skipped);
  const remaining = asked.length - mine.length;
  const size = answered.length + remaining;
  if (answered.length === 0 || size === 0) return null;
  const credit = answered.reduce((sum, r) => sum + r.credit, 0);
  const lowest = credit / size;
  const highest = (credit + remaining) / size;
  const classOf = (ratio: number): BandOutcome => (ratio >= PASS ? "pass" : ratio >= FLOOR ? "near" : "fail");
  const low = classOf(lowest);
  return low === classOf(highest) ? low : null;
}

/**
 * Has this skill's ladder ended?
 *
 * Two rules, and the second is new because the score changed underneath it.
 * `levelFrom` now ends the climb at the first band that did not reach `PASS`,
 * so a band answered above that point cannot raise anybody's level and is
 * three more minutes spent measuring nothing. What it can still do is settle a
 * near miss, which is why one band is asked past the failure rather than none:
 * a learner who came in at 60% at B1 and then reads B2 comfortably was having
 * a bad ten questions, and that is worth finding out. Two bands past it is
 * not, and that is the confirmation stage every multi-stage placement test
 * stops at.
 *
 * The older rule stands in front of it. A band under `FLOOR` is not a near
 * miss, it is a level the learner has visibly not met, and being walked up a
 * ladder you have fallen off is a miserable way to start with an app. Nothing
 * above it is asked at all.
 *
 * And a near miss the band above has confirmed is no longer a failure, so it
 * no longer stops anything: `levelFrom` reads it as passed, and a learner who
 * just missed A2 and then passed B1 is a B1 who may be a B2, which is the
 * question the next band answers. The climb stops at the first band that is
 * not passed *and* not confirmed, the same as it always did for a band that
 * simply failed.
 *
 * Every one of those reads a band's *outcome* rather than its finished score,
 * so a band decided early ends or opens the climb as early as it was decided.
 */
export function ladderStopped(
  items: readonly ItemRef[],
  responses: readonly Response[],
  skill: Skill,
  band: Band,
): boolean {
  for (const lower of BANDS) {
    const rungs = BANDS.indexOf(band) - BANDS.indexOf(lower);
    if (rungs <= 0) break;
    const outcome = bandOutcome(items, responses, skill, lower);
    if (outcome === "fail") return true;
    if (outcome === "near" && rungs > 1 && !confirmedAbove(items, responses, skill, lower)) return true;
  }
  return false;
}

/** True when the band directly above `band` has passed, decided early or answered in full. */
function confirmedAbove(items: readonly ItemRef[], responses: readonly Response[], skill: Skill, band: Band): boolean {
  const above = BANDS[BANDS.indexOf(band) + 1];
  return !!above && bandOutcome(items, responses, skill, above) === "pass";
}

/** True when this question will not now be asked: its band is decided, or the climb ended below it. */
function notAsked(items: readonly ItemRef[], responses: readonly Response[], item: ItemRef): boolean {
  return bandOutcome(items, responses, item.skill, item.band) !== null
    || ladderStopped(items, responses, item.skill, item.band);
}

/** The next item to ask, given everything answered so far. */
export function nextCursor(items: readonly ItemRef[], responses: readonly Response[]): SessionCursor {
  const done = new Set(responses.map((r) => r.itemId));
  let skipped = 0;

  for (const [index, item] of items.entries()) {
    if (done.has(item.id)) continue;
    if (notAsked(items, responses, item)) {
      skipped += 1;
      continue;
    }
    return { index, skipped };
  }
  return { index: null, skipped };
}

/** How far through the paper the learner is, for the progress meter. */
export function progress(items: readonly ItemRef[], responses: readonly Response[]): number {
  if (items.length === 0) return 100;
  const done = responses.filter((r) => !r.skipped).length;
  const remaining = items.filter((item) => {
    const answered = responses.some((r) => r.itemId === item.id);
    return !answered && !notAsked(items, responses, item);
  }).length;
  const total = done + remaining;
  return total === 0 ? 100 : Math.round((done / total) * 100);
}
