import { cache } from "react";

import { prisma } from "@/lib/db";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { courseStandingFor } from "@/lib/progress/level";
import {
  PROGRAMMES, adaptOffer, adaptReading, tiltFor, tiltedLevel,
  type AdaptOffer, type AdaptReading, type LeanEffects, type Programme, type Tilt,
} from "@/lib/course";
import { paceFrom } from "@/lib/audio/pace";

/**
 * HOW SOMEBODY IS DOING, READ OFF THEIR OWN ANSWERS.
 *
 * `lib/course/adapt.ts` is the rule and holds no database; this is the half
 * that asks one, for the reason every pure layer in this app gives about
 * itself.
 *
 * The window is the last fortnight, or since the last move the learner made
 * through an offer, whichever is later. A fortnight because that is the
 * stretch somebody can remember having and change by next week, which is the
 * argument `LADDER_WINDOW_DAYS` in `course.ts` makes one reading over; and
 * cut at the last move so a learner who stepped down to refresh a level is
 * read on the refresher, not on the hard fortnight that sent them there.
 *
 * Right is Good or Easy and a miss is Again, which is what every other reading
 * here calls them (`ladderReading`, `lib/stats/history.ts`): Hard is what a
 * hint, a slip or the right word in the wrong ending is graded, and it is
 * neither.
 */

const WINDOW_DAYS = 14;

/** How long "not now" keeps the card quiet. */
export const SNOOZE_DAYS = 7;

/**
 * The reading, memoised for the render.
 *
 * Two readers on one page is the ordinary case: the shell leans the pace a
 * clip is read at off it, and the module screen draws the card. One settings
 * read and one grouped count, and nothing else.
 */
export const adaptReadingFor = cache(async (ownerId: string): Promise<AdaptReading> => {
  const settings = await readSettings(ownerId, [SETTING_KEYS.adaptMovedAt]);
  const now = Date.now();
  const moved = Date.parse(settings[SETTING_KEYS.adaptMovedAt] ?? "");
  const since = new Date(Math.max(now - WINDOW_DAYS * 86_400_000, Number.isNaN(moved) ? 0 : moved));
  /* One grouped count rather than three, because the shell asks this on every
     signed-in page: four rows at most, one per rating, off the
     (ownerId, reviewedAt) index, pinned to one owner. */
  const byRating = await prisma.review.groupBy({
    by: ["rating"],
    where: { ownerId, reviewedAt: { gte: since } },
    _count: { _all: true },
    orderBy: { rating: "asc" },
  });
  let answers = 0;
  let right = 0;
  let missed = 0;
  for (const row of byRating) {
    const n = row._count._all;
    answers += n;
    if (row.rating >= 3) right += n;
    if (row.rating === 1) missed += n;
  }
  return adaptReading({ answers, right, missed });
});

/** Which way the delivery leans for this learner right now. */
export async function adaptTiltFor(ownerId: string): Promise<Tilt> {
  return tiltFor(await adaptReadingFor(ownerId));
}

/**
 * The parts this learner has ticked a step of, which a move may not land in.
 *
 * Grouped in Postgres, since `distinct` beside a count is the shape this
 * repository keeps finding reads every row into the process; pinned to one
 * owner, so it is bounded by one person's course however big the table grows.
 */
async function touchedParts(ownerId: string): Promise<Set<string>> {
  const rows = await prisma.courseStep.groupBy({
    by: ["programmeId"],
    where: { ownerId },
    orderBy: { programmeId: "asc" },
  });
  return new Set(rows.map((r) => r.programmeId));
}

/**
 * The offer the module screen draws, or none.
 *
 * None while it is snoozed, none for a steady learner, and none on thin
 * evidence, which is `adaptOffer` saying so. `snoozed` travels back beside it
 * because the lean still applies while the card is quiet, and the screen says
 * which of the two it is doing.
 */
export async function adaptOfferFor(
  ownerId: string, programme: Programme, now = new Date(),
): Promise<{ offer: AdaptOffer | null; tilt: Tilt; snoozed: boolean; effects: LeanEffects }> {
  const [reading, standing, touched, settings] = await Promise.all([
    adaptReadingFor(ownerId),
    courseStandingFor(ownerId),
    touchedParts(ownerId),
    readSettings(ownerId, [SETTING_KEYS.adaptSnoozedUntil, SETTING_KEYS.speechPace]),
  ]);
  const tilt = tiltFor(reading);
  const level = standing?.level ?? "A1";
  /*
    What the lean really moves for this learner, off the same two readings the
    shell and the conversation screen play off, so the card cannot claim a
    slower recording that is not playing.
  */
  const pace = settings[SETTING_KEYS.speechPace];
  const effects: LeanEffects = {
    pace: paceFrom(pace, level, tilt).id !== paceFrom(pace, level).id,
    talk: tiltedLevel(level, tilt) !== level,
  };
  const until = Date.parse(settings[SETTING_KEYS.adaptSnoozedUntil] ?? "");
  const snoozed = !Number.isNaN(until) && until > now.getTime();
  const offer = adaptOffer(reading, {
    part: { id: programme.id, level: programme.level },
    ladder: LADDER,
    // The part in play is touched whether or not a step of it has been ticked
    // yet, since moving to where somebody already is would be no move at all.
    touched: new Set([...touched, programme.id]),
    held: standing?.held ?? null,
    kind: standing?.kind ?? null,
  });
  return { offer: snoozed ? null : offer, tilt, snoozed: snoozed && offer !== null, effects };
}

/** The ladder as an offer needs it: an id and a level, in order. */
const LADDER = PROGRAMMES.map((p) => ({ id: p.id, level: p.level }));
