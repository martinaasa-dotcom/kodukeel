import { cache } from "react";

import { prisma } from "@/lib/db";
import { deferredWordIds } from "@/lib/progress/deferrals";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { courseStandingFor } from "@/lib/progress/level";
import { LEVELS, LEVEL_INFO, type Level } from "@/lib/collections/syllabus";
import { readSetting, SETTING_KEYS, writeSettings } from "@/lib/settings/store";
import type { DayClock } from "@/lib/time/day";
import { computeStreak } from "@/lib/stats/streak";
import { closingLeft } from "@/lib/progress/closing";
import { scopeFor } from "@/lib/course/scope";
import {
  MEET_STEP, PROGRAMMES, REVIEW_STEP, dayById, dayReached, defaultProgramme, ladderLemmasAt, ladderProgress,
  creditedThrough, ladderVerdict, levelsTo, programmeById, programmeStanding, startingLevel, type CourseDay,
  type LadderProgress, type LadderVerdict, type Programme, type ProgrammeStanding,
} from "@/lib/course";
import { lessonStates, type LessonState } from "@/lib/course/lessonCourse";
import { goOverAgain } from "@/lib/course/placement";

/**
 * WHERE A LEARNER IS IN A PLANNED PROGRAM, READ RATHER THAN STORED.
 *
 * `lib/course/` is the rule and holds no database; this is the half that asks
 * one, for the reason every pure layer in this app gives about itself.
 *
 * Which day somebody is on is the furthest one carrying a tick (`dayReached`),
 * and a step is finished in one of two ways. Two of them the review log proves
 * on its own and no press may write them: meeting the day's words leaves a
 * mark on every one of their cards, and the closing review is answers graded
 * after that day's last pressed tick. Once proved they are saved by this
 * module (`latchDerived`), because a finished step that a later change to the
 * deck could take back is not finished. The rest are ticked on the course
 * screen and land in `CourseStep`, append-only, one row, the unique key making
 * a second press a no-op rather than a second row.
 *
 * The whole reading is five queries whatever the size of the program and
 * whatever evening somebody is on, which is the same rule `classRoster` states
 * about itself and is the thing the first version of this could not manage: it
 * recomputed the day from the top of the program and had to ask the log
 * about every evening it walked past.
 */

/**
 * Cards graded after the evening's last tick before the closing round counts.
 *
 * Five, which is a minute or two, and it is deliberately not the daily goal.
 * The goal is the day's whole quota and this is the last step of a lesson: a
 * learner who has just met eight words and played two rounds has earned the
 * right to finish, and a closing step that demanded fifteen more answers would
 * be the day refusing to end. What keeps the rest of the queue honest is the
 * scheduler, which will offer it tomorrow whatever happens here.
 */
export const CLOSING_REVIEW = 5;

/**
 * How many days one render asks the review log about.
 *
 * Two, and it is a fact about the shape rather than a budget. `dayReached`
 * names the day in play, so the first round is that day; resolving it can
 * finish it, and then the day it advances to is asked about as well, because
 * somebody who met tomorrow's words through Learn should not be shown tomorrow
 * at nought percent. A third round cannot happen: the day after that has no
 * ticks at all, and every day has at least one step the log cannot prove
 * (`course.test.ts`), so it can never complete unasked.
 */
const MAX_RESOLVE = 2;

/**
 * The program a learner is following, or none.
 *
 * A missing row is read as "offer it where it fits" rather than as a yes or a
 * no, because a missing row is everybody who used this app before programs
 * existed. Where it fits is at or below the program's own level: a beginner
 * is led, and somebody a paper has already measured at B1 is not handed twelve
 * evenings of greetings on the screen they open each morning. `off` is
 * somebody saying in as many words that they would rather choose their own
 * evening, and it is honored at every level.
 *
 * One function so the course screen, Today and Settings cannot end up with
 * three answers to whether anybody is on a program.
 */
export const programmeFor = cache(async (ownerId: string): Promise<Programme | null> => {
  const stored = await readSetting(ownerId, SETTING_KEYS.programme);
  if (stored === "off") return null;
  // A part id no build holds any more (renamed, or written by hand) is placed again rather than read as "off".
  if (stored) {
    const known = programmeById(stored);
    return known ? rehomed(ownerId, known) : openingPartFor(ownerId);
  }
  /*
    AND A LEARNER ALREADY PART WAY THROUGH ONE STAYS ON IT. Nothing is stored
    for somebody who was led here by this fallback without ever pressing
    Start, and they may have ticked evenings of the part it named at the time.
    The fallback's rule has changed since (a named level is held now), so
    reading it again would move them onto a different part and leave their
    ticks behind. The part they last ticked a step of is where they are.
  */
  const last = await prisma.courseStep.findFirst({
    where: { ownerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { programmeId: true },
  });
  const inFlight = last ? programmeById(last.programmeId) : undefined;
  return inFlight ? rehomed(ownerId, inFlight) : openingPartFor(ownerId);
});

/**
 * A LEARNER WHO WAS PART WAY THROUGH A PART THAT HAS SINCE BECOME LESSONS
 * STARTS ITS LEVEL AT ITS FIRST LESSON.
 *
 * When a level moves from unit-built evenings to lessons (B1 did), its parts
 * keep their ids and lose their days. Somebody stored on the old third part
 * would otherwise open on the new third part's first lesson, whose ledger
 * assumes the two parts before it: a lesson full of words they never met.
 * What says which happened is their own ticks: every one of them in this part
 * is on a day id it no longer holds, and none on a day it does. Such a learner
 * starts the level again from its first part, which is what the switch
 * promised them (docs/43-lessons.md §11.6), and is then wherever they have got
 * to in the new lessons since: the furthest of the level's parts holding a
 * tick on one of its own days. Read every time rather than written over the
 * stored part, so nothing about a learner is changed by opening a screen.
 */
/*
  Asked only of the levels that became lessons while learners were on them,
  which is B1: A1 and A2 had nobody on their unit-built parts when they moved,
  and every page calls `programmeFor`, so the two reads below would otherwise
  be a cost every learner pays on every page for a learner nobody is.
*/
const REHOMED_LEVELS: ReadonlySet<string> = new Set(["B1"]);

/*
  WHO NEEDS NO MOVING IS SETTLED FOR GOOD, so it is asked once per instance.
  A tick is append-only and is only ever written for a day the part holds now,
  so a learner with a tick on one of today's days keeps it, and one with no
  tick on a vanished day can never gain one. Either answer is "stays where
  they are" from then on, and every page calls `programmeFor`: remembering it
  takes the two reads below off every page for everybody but the few learners
  actually being moved back. A restore is the one way old ticks arrive later,
  and it forgets that learner's answer on this instance (`forgetRehoming`). Bounded, for an
  instance that lives through many learners.
*/
const SETTLED = new Set<string>();
const SETTLED_MAX = 50_000;

/** The furthest of several parts named by id, in ladder order; ids that name no part are ignored. */
export function furthestPart(ids: Iterable<string | null | undefined>): Programme | null {
  let best = -1;
  for (const id of ids) {
    const at = id ? PROGRAMMES.findIndex((p) => p.id === id) : -1;
    if (at > best) best = at;
  }
  return best >= 0 ? PROGRAMMES[best]! : null;
}

/** The furthest part a learner has ever been placed on or moved to (`SETTING_KEYS.highestPart`). */
export async function highestPartFor(ownerId: string): Promise<Programme | null> {
  return furthestPart([await readSetting(ownerId, SETTING_KEYS.highestPart)]);
}

/**
 * PUTS A LEARNER ON A PART THEY CHOSE, OR WERE PLACED ON.
 *
 * Three settings in one transaction: the part, the stamp saying it was chosen
 * (which the lessons' switch reads, `partAfterSwitch`), and the furthest part
 * they have ever been on, raised past the part they are leaving and the part
 * they are going to and never lowered. That last is what lets a learner placed
 * at B1 who steps down to refresh A2 move back up without A2's checks
 * (`moveBlockedFor`), with no tick up there to prove it and whatever a restart
 * of the part deleted. Every door that moves a learner goes through here.
 */
export async function choosePart(ownerId: string, partId: string, now: Date = new Date()): Promise<void> {
  const [stored, current] = await Promise.all([
    readSetting(ownerId, SETTING_KEYS.highestPart),
    programmeFor(ownerId),
  ]);
  const highest = furthestPart([stored, current?.id, partId]);
  await writeSettings(ownerId, [
    [SETTING_KEYS.programme, partId],
    [SETTING_KEYS.programmeChosenAt, now.toISOString()],
    ...(highest ? [[SETTING_KEYS.highestPart, highest.id] as const] : []),
  ]);
}

/**
 * The old part a learner was moved back from, and where they are now: somebody
 * who walked a part of a level before it became lessons, and has not yet
 * started the new lessons of that level, so the screen can say why they are on
 * its first lesson rather than leaving them to think the app lost their place.
 *
 * Read off what they did rather than off a difference of part ids, which said
 * nothing to a learner stored on the old first part (moved to the part with the
 * same id) and nothing after a restore, which writes the first part over the
 * one the backup named. What says it is a tick on a day id the level no longer
 * holds, or, after a restore that dropped those ticks, the part the restore
 * moved them from (`SETTING_KEYS.movedBackFrom`). It stops once they tick a
 * lesson of the level. Null for everybody else, which is nearly everybody.
 */
export async function movedBackFrom(ownerId: string): Promise<{ from: Programme; to: Programme } | null> {
  const stored = await readSetting(ownerId, SETTING_KEYS.programme);
  const at = stored && stored !== "off" ? programmeById(stored) : undefined;
  if (!at || !REHOMED_LEVELS.has(at.level)) return null;
  const [ticks, marker, to] = await Promise.all([
    levelTicks(ownerId, at.level),
    readSetting(ownerId, SETTING_KEYS.movedBackFrom),
    programmeFor(ownerId),
  ]);
  if (!to || to.level !== at.level) return null;
  const parts = lessonPartsOf(at.level);
  const days = new Set(parts.flatMap((p) => p.days.map((d) => d.id)));
  if (ticks.some((t) => days.has(t.dayId))) return null;
  const old = ticks.filter((t) => !days.has(t.dayId));
  const fromId = marker || old.sort((a, b) => tickTime(b) - tickTime(a))[0]?.programmeId;
  const from = fromId ? programmeById(fromId) : undefined;
  return from && from.level === at.level ? { from, to } : null;
}

/** The parts of a level that are lessons, in ladder order. */
function lessonPartsOf(level: string): Programme[] {
  return PROGRAMMES.filter((p) => p.level === level && p.days.length > 0 && p.days.every((d) => d.lesson));
}

/** A tick as the rule below reads it, off the database or out of a backup. */
export interface RehomeTick {
  readonly programmeId: string;
  readonly dayId: string;
  readonly createdAt?: Date | string | null;
}

const tickTime = (t: RehomeTick): number =>
  t.createdAt instanceof Date ? t.createdAt.getTime() : t.createdAt ? Date.parse(t.createdAt) : Number.NaN;

/** Every tick a learner holds on a level's parts, for the rule below. */
async function levelTicks(ownerId: string, level: string): Promise<RehomeTick[]> {
  return prisma.courseStep.findMany({
    where: { ownerId, programmeId: { in: lessonPartsOf(level).map((p) => p.id) } },
    select: { programmeId: true, dayId: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/**
 * WHERE A LEARNER STORED ON A PART OF A LEVEL THAT BECAME LESSONS IS, read off
 * their ticks and the stamp saying when they last chose a part: the one rule,
 * for a learner here (`rehomed`) and for a backup being restored
 * (`partAfterSwitch`), so a restored file lands where the live learner reads.
 *
 * `settled` says the answer cannot change by itself any more, which is what
 * lets `rehomed` remember it.
 */
export function rehomeFrom(
  part: Programme, ticks: readonly RehomeTick[], chosenAt: string | null | undefined,
): { part: Programme; settled: boolean } {
  if (!REHOMED_LEVELS.has(part.level) || part.days.length === 0 || !part.days.every((d) => d.lesson)) {
    return { part, settled: true };
  }
  const days = new Set(part.days.map((d) => d.id));
  const here = ticks.filter((t) => t.programmeId === part.id);
  const old = here.filter((t) => !days.has(t.dayId));
  if (old.length === 0 || here.some((t) => days.has(t.dayId))) return { part, settled: true };
  /*
    A PART THE LEARNER CHOSE AFTER THEIR OLD TICKS ON IT STAYS CHOSEN. Moving on
    from a finished part, taking an offer to skip ahead, and changing level all
    stamp the choice, so somebody sent back to B1.1 who then moved to B1.2 by
    any of those is not sent back again.
  */
  const chosen = chosenAt ? Date.parse(chosenAt) : Number.NaN;
  const newestOld = Math.max(...old.map(tickTime).filter(Number.isFinite));
  if (Number.isFinite(chosen) && Number.isFinite(newestOld) && chosen > newestOld) return { part, settled: true };
  const parts = lessonPartsOf(part.level);
  /*
    UNLESS THEY FINISHED THE PART BEFORE THIS ONE IN THE NEW LESSONS, which is
    how somebody moved back to B1.1 comes to be stored on B1.2 again: they
    walked it and moved on. Their old ticks on this part are still on vanished
    days and they have no new one here yet, so without this the read sends
    them back to the part they have just finished, for ever. The last lesson of
    the part before is the evidence, since the part ends there.
  */
  const before = parts[parts.findIndex((p) => p.id === part.id) - 1];
  const lastBefore = before?.days[before.days.length - 1];
  if (before && lastBefore && ticks.some((t) => t.programmeId === before.id && t.dayId === lastBefore.id)) {
    return { part, settled: true };
  }
  // Back to where they have been working since, which is the level's first part until they move on from it.
  const since = new Set(ticks.filter((t) => {
    const p = parts.find((q) => q.id === t.programmeId);
    return p ? p.days.some((d) => d.id === t.dayId) : false;
  }).map((t) => t.programmeId));
  return { part: [...parts].reverse().find((p) => since.has(p.id)) ?? parts[0] ?? part, settled: false };
}

/**
 * Forgets who was settled: everybody, for a test that walks one learner
 * through several states, or one learner, which a restore does, since a
 * backup is the one way old ticks arrive after the answer was settled.
 * Another instance learns it when it is replaced; the memo is per instance.
 */
export function forgetRehoming(ownerId?: string): void {
  if (!ownerId) { SETTLED.clear(); return; }
  for (const key of [...SETTLED]) if (key.startsWith(`${ownerId}:`)) SETTLED.delete(key);
}

/**
 * WHERE A RESTORED PART PUTS A LEARNER WHOSE BACKUP PREDATES THE SWITCH.
 *
 * The restore keeps only ticks on days a part still holds, so the old ticks
 * that `rehomed` reads as "this learner was on the old part" never arrive, and
 * a backup naming B1.3 put somebody on lesson 15 with two parts they never had.
 * So the restore asks this first, of the backup's own ticks and its own stamp:
 * `rehomeFrom`, the rule a learner here is read by, so the file lands where
 * the live learner would.
 */
export function partAfterSwitch(
  part: Programme, ticks: readonly RehomeTick[], chosenAt?: string | null,
): Programme {
  return rehomeFrom(part, ticks, chosenAt).part;
}

async function rehomed(ownerId: string, programme: Programme | null): Promise<Programme | null> {
  if (!programme || !REHOMED_LEVELS.has(programme.level)) return programme;
  if (programme.days.length === 0 || !programme.days.every((d) => d.lesson)) return programme;
  const key = `${ownerId}:${programme.id}`;
  if (SETTLED.has(key)) return programme;
  const [ticks, chosenAt] = await Promise.all([
    levelTicks(ownerId, programme.level),
    readSetting(ownerId, SETTING_KEYS.programmeChosenAt),
  ]);
  const read = rehomeFrom(programme, ticks, chosenAt);
  if (read.settled) {
    if (SETTLED.size >= SETTLED_MAX) SETTLED.clear();
    SETTLED.add(key);
  }
  return read.part;
}

/**
 * Which part of the ladder somebody starts on, given what they hold and what
 * they are aiming at.
 *
 * The first part of the level `startingLevel` names, which is the level above
 * the one they hold (`lib/course/placement.ts` has the argument): a learner
 * who says B1 opens on B2.1 rather than being walked back through B1, a
 * beginner opens on A1.1, and somebody aiming at the level they already hold
 * opens on its first part to make it solid. There is no skipping *within* a
 * level, because the parts of one level are a sequence and the later ones lean
 * on the earlier.
 *
 * Total, and that is the change from what this was: it used to answer nothing
 * for a C1 speaker, and a named level now always names a part, since holding
 * C1 opens on the top of the ladder rather than on a screen with nothing on it.
 */
export function openingPart(
  held: Level | null, target: string | null | undefined, goOver = false,
): Programme {
  // `goOver` is the learner asking to go over the level held first (`goOverAgain`).
  const level = (goOver ? goOverAgain(held, target) : null) ?? startingLevel(held, target);
  return PROGRAMMES.find((p) => p.level === level) ?? defaultProgramme();
}

/**
 * The same, read off the learner's own standing and target.
 *
 * One reader, because three screens ask it: the course, Settings and the
 * fallback above, and the one that read the level without the target would
 * open a learner aiming at their own level one part past where first run put
 * them.
 */
export async function openingPartFor(ownerId: string): Promise<Programme> {
  const [standing, target] = await Promise.all([
    courseStandingFor(ownerId),
    readSetting(ownerId, SETTING_KEYS.goalTarget),
  ]);
  return openingPart(standing?.held ?? null, target);
}

/** Whether a learner has said anything at all about programs yet. */
export async function hasChosenProgramme(ownerId: string): Promise<boolean> {
  return Boolean(await readSetting(ownerId, SETTING_KEYS.programme));
}

interface Ticks {
  /** Step ids ticked, per day. */
  byDay: Map<string, Set<string>>;
  /**
   * When that day's most recent tick landed, which is when its closing round
   * starts counting. See `closingOpensAt`.
   *
   * PER DAY, AND THAT IS NOT A DETAIL. It was one timestamp for the whole
   * program, the most recent tick anywhere, and the fault only shows up
   * across two evenings: finishing Monday's module and then ticking the first
   * round of Tuesday's moved the window forward, so Monday's closing round
   * counted nothing again, Monday stopped being finished, and the learner was
   * sent back to a day they had done.
   *
   * Per day it is also monotonic in the right direction: a day's window never
   * moves once its last step is ticked, so answers only ever accumulate and a
   * finished day stays finished.
   */
  lastAt: Map<string, Date>;
  /**
   * The steps a learner pressed, per day, without the derived ones this
   * reading saved itself (`latchDerived`). Those are a record that the log
   * proved a step once, and a day carrying nothing but them has not been
   * opened by anybody: see `latchDerived` for why that line matters.
   */
  pressed: Map<string, Set<string>>;
  /** When every tick was written, oldest first, for the run of evenings. */
  at: Date[];
}

/**
 * The two steps the review log proves. Their rows are written by this module
 * alone (`latchDerived`), never by a press, and they never move the closing
 * round's window: `lastAt` reads pressed steps only.
 */
const DERIVED_STEPS: ReadonlySet<string> = new Set([MEET_STEP, REVIEW_STEP]);

/**
 * Every tick this learner has written for this program.
 *
 * Memoised for the render, which is the rule this project already applies to
 * the settings table and to `latestFor`: the course screen asks for the
 * reading and then asks how far into the closing round the day is, and those
 * were two identical reads of the same rows a few lines apart.
 */
const ticksFor = cache(async (ownerId: string, programme: Programme): Promise<Ticks> => {
  const rows = await prisma.courseStep.findMany({
    where: { ownerId, programmeId: programme.id },
    select: { dayId: true, stepId: true, createdAt: true },
    // Total, ending on a column nothing can move: two ticks land in the same
    // millisecond when a learner presses twice, and `lastAt` decides where the
    // closing round's window opens.
    orderBy: [{ createdAt: "asc" }, { stepId: "asc" }],
  });
  const byDay = new Map<string, Set<string>>();
  const pressed = new Map<string, Set<string>>();
  const lastAt = new Map<string, Date>();
  const at = rows.map((row) => row.createdAt);
  for (const row of rows) {
    const set = byDay.get(row.dayId) ?? new Set<string>();
    set.add(row.stepId);
    byDay.set(row.dayId, set);
    /*
      A saved derived step is a record, not a press: it may not open the
      closing round's window, or saving "the words are met" halfway through
      an evening would move the window past the answers already given.
    */
    if (DERIVED_STEPS.has(row.stepId)) continue;
    const own = pressed.get(row.dayId) ?? new Set<string>();
    own.add(row.stepId);
    pressed.set(row.dayId, own);
    // The rows arrive oldest first, so the last one written wins.
    lastAt.set(row.dayId, row.createdAt);
  }
  return { byDay, pressed, lastAt, at };
});

/**
 * WHERE A DAY'S CLOSING ROUND STARTS COUNTING: that day's own last tick, and
 * nowhere at all until it has one.
 *
 * Whenever that tick was, which is the correction rather than a detail. The
 * window used to open at the later of the tick and the learner's own midnight,
 * which is the same window on the evening itself and a different one every
 * morning after: a day finished at nine last night had its window moved to
 * midnight, the five answers that finished it stopped counting, the day
 * stopped being finished, and the learner was handed a module they had already
 * done. Every test in the suite ran inside a single day and none of them could
 * see it.
 *
 * And a day nobody has ticked anything on has not had an evening, so its
 * closing round counts nothing rather than counting from midnight. Under the
 * old floor, finishing one module and pressing "start the next one now" drew
 * the next day with its closing round already satisfied by the round that had
 * just finished the last one, which is one evening's answers closing two
 * evenings. Nothing is lost by it: the closing round is the last step of a
 * day, so by the time anybody reaches it the steps in front have been ticked.
 */
const closingOpensAt = (ticks: Ticks, day: CourseDay): Date | undefined => {
  /*
    AND ONLY ONCE EVERY STEP IN FRONT OF IT HAS BEEN TICKED, which is what
    "the steps in front have been ticked" above was assuming rather than
    checking. A round is ticked at its end, by its own "Next, step 4", and it
    grades as it goes: so the listening round's five answers landed after
    Match's tick, read as the closing round's five, and the evening finished
    itself the moment the listening round ended, before anybody had pressed
    on. Measured on the first evening of A1: "A quick review, then you're
    done" was never asked at all. The window opens when the closing round is
    the next thing to do, which is the last pressed tick of a day whose every
    pressed step is in.
  */
  const pressed = ticks.pressed.get(day.id);
  const ready = day.steps.every((s) => DERIVED_STEPS.has(s.id) || Boolean(pressed?.has(s.id)));
  return ready ? ticks.lastAt.get(day.id) : undefined;
};

/**
 * THE DAY A `"use server"` EXPORT MAY WRITE ABOUT.
 *
 * Both course actions take a day id from their caller, which is JSON off the
 * wire whatever the types say, and one of them builds a deck out of that day's
 * words. Nothing checked it was the day the learner is standing on, so a
 * forged call could tick a step two hundred evenings ahead or fill somebody's
 * deck with C1 vocabulary.
 *
 * It matters more since `dayReached`: the pointer is the furthest day carrying
 * a tick, so a tick on a day nobody has reached would move the whole course
 * onto it and skip everything in between. That is the door this closes, and
 * with it closed the pointer is monotonic by construction rather than by
 * hoping the client behaves.
 *
 * A day already reached is allowed, which is what makes a second press of a
 * button on a day that has just finished a no-op rather than an error.
 */
/**
 * HOW FAR THE MODULE HAS ACTUALLY TAKEN THIS LEARNER, OR NOTHING AT ALL.
 *
 * `dayIsInPlay` below asks a permission question and `courseReading` builds a
 * whole screen. This is the one fact a round outside the module needs: which
 * evening the learner has walked as far as, so the daily path can be held to
 * what that evening has handed over.
 *
 * NOTHING TICKED IS NOTHING TO GO ON, and that is the whole of what keeps this
 * from over-reaching. `programmeFor` answers for everybody: a learner who has
 * never opened the module, and every learner who used this app before
 * programs existed, gets `openingPart` read off their level, which is an
 * offer rather than a record. Reading that as a standing would hold somebody
 * who has never touched the course to the first evening of it, which is the
 * app taking a deck away over a screen nobody opened. A tick is the learner
 * saying they are following the module, and `dayReached` is the pointer it
 * makes; with none there is no module to be held to and every round behaves
 * exactly as it did.
 *
 * BUT A TICK IN ANY PART IS A LEARNER FOLLOWING THE MODULE. Read off the part
 * in play alone, a learner who had just passed a check and moved on to the
 * next part, and not yet ticked its first lesson, held nothing: every round
 * and the daily queue let go of the hold until they did, and asked cases and
 * words nobody had taught. So where the part has no ticks and the learner has
 * one somewhere, the standing is the part's first evening, not yet entered
 * (`entered: false`): everything the parts before taught, and nothing of it.
 *
 * Memoised for the render, like `ticksFor` underneath it, because Today and
 * the round it links to both ask.
 */
export const moduleReached = cache(async (
  ownerId: string,
): Promise<{ programme: Programme; day: CourseDay; ticked: ReadonlySet<string>; entered: boolean } | null> => {
  const programme = await programmeFor(ownerId);
  if (!programme) return null;
  const ticks = await ticksFor(ownerId, programme);
  if (ticks.byDay.size === 0) {
    const first = programme.days[0];
    const followed = first && await prisma.courseStep.findFirst({ where: { ownerId }, select: { id: true }, orderBy: { id: "asc" } });
    return first && followed ? { programme, day: first, ticked: new Set<string>(), entered: false } : null;
  }
  const day = dayReached(programme, new Set(ticks.byDay.keys()));
  // The steps of that evening that carry a row, which is what tells a screen
  // the module did not open whether today's page has been read yet
  // (`scopeSoFar`). Pressed steps and latched derived ones alike.
  return { programme, day, ticked: ticks.byDay.get(day.id) ?? new Set<string>(), entered: true };
});

export async function dayIsInPlay(
  ownerId: string, programme: Programme, day: CourseDay, now = new Date(),
): Promise<boolean> {
  /*
    THE PROGRAM IS OFF THE WIRE TOO, NOT ONLY THE DAY. A part nobody has
    opened carries no ticks, so the rule below reads its first two evenings as
    reached, and a call naming the last part of C1 built a beginner's deck out
    of its words: the forged call the header above says this closes. The one
    they are following is `programmeFor`'s answer, which is the program every
    screen that draws a step hands over, so an honest press never meets this.
  */
  const followed = await programmeFor(ownerId);
  if (followed?.id !== programme.id) return false;
  const ticks = await ticksFor(ownerId, programme);
  const reached = dayReached(programme, new Set(ticks.byDay.keys()));
  if (day.index <= reached.index) return true;
  if (day.index > reached.index + 1) return false;
  /*
    THE DAY AFTER THE ONE REACHED IS IN PLAY ONCE THE ONE REACHED IS FINISHED,
    and not before. Finishing an evening is what opens the next, and nothing is
    ticked on it until somebody starts. Allowing it unconditionally was a
    ladder somebody could climb without doing anything: a tick on the next day
    makes it the day reached, so a tick on the day after that is allowed, and
    repeated calls walked the whole program one evening per request. Read
    through the same function the screen reads, so an evening the list shows
    as finished is the evening this opens the next one after.
  */
  const done = await withDerivedSteps(
    ownerId, programme, ticks, reached, ticks.byDay.get(reached.id) ?? new Set<string>(), now,
  );
  return reached.steps.every((step) => done.has(step.id));
}

/**
 * Whether the day's words have been met.
 *
 * Every word of the day the dictionary holds, in the deck and answered at least
 * once. `state
 * 0` is FSRS's New, which is exactly the ladder's `meet` rung, so a word that
 * has left it is a word somebody has been asked about and answered. Requiring
 * the rung above, produced in a sentence, was tried on paper and is the wrong
 * line: a word reaches it on the session after the one that taught it, so a
 * day could never be finished on the evening it was started.
 *
 * A word the dictionary does not hold cannot be met and cannot block a day, so
 * what is counted is every word the dictionary holds, held and answered. The
 * alternative reads as a learner failing at a gap in Ekilex.
 */
async function metWords(ownerId: string, words: readonly string[]): Promise<boolean> {
  if (words.length === 0) return true;
  return metWordsFor(ownerId, words.join("\n"));
}

/*
  MEMOISED FOR THE RENDER, ON PRIMITIVES. The course screen asks
  `courseReading` and then `closingProgress`, and both ask this of the same
  day's words: two reads of the deck a few lines apart for one answer. React's
  `cache` compares its arguments by identity, so the words travel as one string
  rather than as an array a caller may have built afresh. No action writes a
  card and then asks this again in the same request, which is the one way a
  memo here could hand back a stale answer; `ticksFor` above has stood on the
  same ground since it was written.
*/
const metWordsFor = cache(async (ownerId: string, joined: string): Promise<boolean> => {
  const words = joined.split("\n");
  const [cards, aside, known] = await Promise.all([
    prisma.card.findMany({
      where: {
        ownerId, cardType: LADDER_CARD_TYPE,
        lexeme: { lemma: { in: [...words] } },
      },
      select: { state: true, suspended: true, lexemeId: true, lexeme: { select: { lemma: true } } },
    }),
    deferredWordIds(ownerId),
    prisma.lexeme.findMany({ where: { lemma: { in: [...words] } }, select: { lemma: true } }),
  ]);
  /*
    EVERY WORD THE DICTIONARY HOLDS, NOT EVERY WORD THE DECK HAPPENS TO. This
    asked whether the cards that existed had all been answered, which is the
    same question only until somebody already holds some of today's words:
    two of a B1 evening's five came in from the frequency list, both long since
    answered, so the step read as done before anybody pressed Start, the press
    that builds the other three was gone with it, and `abielu`, `usaldama` and
    `tülitsema` were never taught. A word the dictionary holds and the deck
    does not is a word still to meet, which is what Start is for.

    A word the dictionary does not hold still cannot block the evening, since
    the ladder can build nothing for it: that is the deployment seeded before
    the unit, and the honest answer to "meet these" there is that there is
    nothing to meet.
  */
  const toMeet = new Set(known.map((k) => k.lemma));
  if (toMeet.size === 0) return true;
  /*
    AND A WORD PUT ASIDE IS NOT A WORD STILL TO MEET. The meet rung offers
    "too complicated", which moves the card's date and leaves it New, and the
    ladder serves only what is due, so the word never came back while this
    went on waiting for it to leave New: the evening stopped with no press
    anywhere that could move it, since this step is derived and neither course
    action may write a row for it. The learner said not tonight; the step
    takes them at their word, and the word returns when its wait ends. A card
    the leech clinic suspended is the same answer from another screen, and is
    not rebuilt by Start, so it counts as met rather than blocking for ever.

    PER WORD, NOT PER CARD. A word is met when one of its ladder cards has
    left New, and a second copy of it at New is not the word un-met. That copy
    used to be all it took: the dictionary can hold a lemma twice, and a deck
    built before a spelling fix holds a card whose front no longer matches
    what the builder writes, so pressing "Meet the words" again added a fresh
    card at New beside the one already answered, and an evening finished
    minutes earlier read three quarters done. Reported off a real module.
  */
  const met = new Set<string>();
  for (const c of cards) {
    const word = c.lexeme?.lemma;
    if (!word) continue;
    if (c.state !== 0 || c.suspended || (c.lexemeId !== null && aside.has(c.lexemeId))) met.add(word);
  }
  return [...toMeet].every((word) => met.has(word));
});

/**
 * Answers graded since a moment, which is what the closing round counts.
 *
 * The moment is a tick, and a tick is stamped by the server, so it is compared
 * with the time the server received each answer rather than the time the
 * device says it was given. Read against `reviewedAt`, a device clock a few
 * minutes slow dated every closing answer before the tick that opened the
 * round, and the step is derived, so no press anywhere could finish the
 * evening. A row with no `receivedAt` was written before the column existed or
 * restored from a file, and keeps the reading it always had.
 */
async function gradedSince(ownerId: string, since: Date): Promise<number> {
  return gradedSinceMs(ownerId, since.getTime());
}

/* Memoised for the render on the instant as a number, for `metWordsFor`'s
   reason: the reading and the closing line under it count the same window. */
const gradedSinceMs = cache(async (ownerId: string, sinceMs: number): Promise<number> => {
  const since = new Date(sinceMs);
  return prisma.review.count({
    where: {
      ownerId,
      OR: [
        { receivedAt: { gte: since } },
        { receivedAt: null, reviewedAt: { gte: since } },
      ],
    },
  });
});

/** Answers the server received in `[since, until)`, read the way `gradedSince` reads them. */
async function gradedBetween(ownerId: string, since: Date, until: Date): Promise<number> {
  return prisma.review.count({
    where: {
      ownerId,
      OR: [
        { receivedAt: { gte: since, lt: until } },
        { receivedAt: null, reviewedAt: { gte: since, lt: until } },
      ],
    },
  });
}

/** How far into a day's closing round the learner is. Nought before it opens. */
async function closingGraded(ownerId: string, ticks: Ticks, day: CourseDay): Promise<number> {
  const opened = closingOpensAt(ticks, day);
  return opened ? gradedSince(ownerId, opened) : 0;
}

/**
 * HOW MANY ANSWERS THIS EVENING'S CLOSING ROUND IS OWED, which is five or
 * whatever the round can actually supply.
 *
 * `CLOSING_REVIEW` is the standing ask and it was also the only ask, so a
 * closing round with nothing left to offer left the evening at three quarters
 * for good: the step is derived, so no press on any screen can tick it, and
 * the round it points at said there was nothing due. Reported off a real
 * module. A step is finished by the evidence it asks for or by there being no
 * more evidence to be had, and `closingLeft` is the second half of that
 * sentence, read off the very queue the round would draw.
 *
 * Counted only where it could change the answer. A learner already past five
 * is finished whatever the deck holds, and asking the deck about it would be
 * two queries on Today to confirm something already true.
 */
async function closingNeeded(
  ownerId: string, programme: Programme, ticks: Ticks, day: CourseDay, graded: number, now: Date,
): Promise<number> {
  if (graded >= CLOSING_REVIEW) return CLOSING_REVIEW;
  const left = await closingLeft(
    ownerId, scopeFor(programme, day), CLOSING_REVIEW - graded, now, closingOpensAt(ticks, day) ?? null,
  );
  return Math.min(CLOSING_REVIEW, graded + left);
}

/**
 * When a day's closing round opened, which is the page's way of leaving out
 * what has been asked since (`tonightWhere`). Null before it has.
 */
export async function closingOpenedAt(
  ownerId: string, programme: Programme, dayId: string,
): Promise<Date | null> {
  const day = dayById(programme, dayId);
  return day ? closingOpensAt(await ticksFor(ownerId, programme), day) ?? null : null;
}

/** Whether the closing round is the one step of the evening still outstanding. */
function onlyClosingLeft(day: CourseDay, done: ReadonlySet<string>): boolean {
  return day.steps.every((step) => step.id === REVIEW_STEP || done.has(step.id));
}

/**
 * A day's finished steps, the ticked ones and the two the review log proves.
 *
 * One function because two callers ask it and they may not disagree: the
 * reading that draws the screen, and `dayIsInPlay`, which decides whether the
 * day after the one reached may be written about yet.
 */
async function withDerivedSteps(
  ownerId: string, programme: Programme, ticks: Ticks, day: CourseDay,
  ticked: ReadonlySet<string>, now: Date,
): Promise<Set<string>> {
  /* A lesson evening has neither derived step: its one step is the lesson,
     ticked when the lesson ends, so there is nothing for the log to prove. */
  if (!day.steps.some((step) => DERIVED_STEPS.has(step.id))) return new Set(ticked);
  const [met, graded] = await Promise.all([
    ticked.has(MEET_STEP) ? Promise.resolve(true) : metWords(ownerId, day.words),
    ticked.has(REVIEW_STEP) ? Promise.resolve(CLOSING_REVIEW) : closingGraded(ownerId, ticks, day),
  ]);

  const withDerived = new Set(ticked);
  if (met) withDerived.add(MEET_STEP);
  /*
    FIVE ANSWERS, OR EVERY ANSWER THE ROUND HAS LEFT TO GIVE.

    The first is the standing ask and used to be the only one, which is what
    left an evening whose closing round had nothing to offer stuck at three
    quarters for ever: the step is derived, so nothing a learner can press
    ticks it, and the round behind it said nothing was due. See
    `closingNeeded`.

    Asked only where it is the last thing standing, which is both the honest
    reading and the cheap one. Until then there is an evening's worth of
    steps in front of it and the question is not yet "can this be finished",
    it is "what is next"; and Today would be paying two queries a render to
    answer something nobody was asking.
  */
  if (graded >= CLOSING_REVIEW) withDerived.add(REVIEW_STEP);
  else if (onlyClosingLeft(day, withDerived)
    && graded >= await closingNeeded(ownerId, programme, ticks, day, graded, now)) {
    withDerived.add(REVIEW_STEP);
  }
  await latchDerived(ownerId, programme, ticks, day, withDerived);
  return withDerived;
}

/**
 * A STEP THE LOG HAS PROVED ONCE STAYS PROVED.
 *
 * The two derived steps used to be read afresh on every render and saved
 * nowhere, so they could be true on the module screen and false a minute
 * later on Today: "the words are met" is a fact about cards, and anything
 * that adds a fresh card for one of the day's words at New took the step
 * back. A learner finished every step, saw the evening done, opened Today
 * and read 75 percent, with the first step waiting to be done again.
 * Finishing a step is a thing that happened, and a thing that happened is
 * written down.
 *
 * Written here rather than by a press, so the rule `markCourseStep` and
 * `advanceCourseStep` keep is unchanged: no client may tick a derived step.
 * The server writes the row only after proving the step itself, and the row
 * is idempotent on the unique key, so a second render writes nothing.
 *
 * ONLY ON A DAY SOMEBODY HAS PRESSED A STEP OF. The day reached is the
 * furthest day carrying a tick, so a saved row on the day after the one
 * finished would move the course onto it and take "Today's module is done"
 * with it. A day with a pressed step is already the day reached, so a row
 * there moves nothing. And the rows never open the closing round's window,
 * since `lastAt` reads pressed steps alone.
 */
async function latchDerived(
  ownerId: string, programme: Programme, ticks: Ticks, day: CourseDay, done: ReadonlySet<string>,
): Promise<void> {
  if (!ticks.pressed.get(day.id)?.size) return;
  const have = ticks.byDay.get(day.id) ?? new Set<string>();
  const fresh = day.steps
    .filter((step) => DERIVED_STEPS.has(step.id) && done.has(step.id) && !have.has(step.id))
    .map((step) => step.id);
  if (fresh.length === 0) return;
  await prisma.courseStep.createMany({
    data: fresh.map((stepId) => ({ ownerId, programmeId: programme.id, dayId: day.id, stepId })),
    skipDuplicates: true,
  });
  // The render's own copy, so the rest of it reads what was just written.
  const set = ticks.byDay.get(day.id) ?? new Set<string>();
  for (const id of fresh) set.add(id);
  ticks.byDay.set(day.id, set);
}

export interface CourseReading extends ProgrammeStanding {
  /** True where the current day's last step was finished today. */
  finishedToday: boolean;
  /**
   * True where an evening of this program was finished today, including one
   * this render walked past because a step of the next was already ticked.
   *
   * Not `finishedToday`, which is the screen's "come back tomorrow" and is
   * rightly false once somebody has pressed "start the next one now": the
   * screen is then about the next module. The evening letter asks a different
   * question, whether today's evening is done, and somebody who finished one
   * and carried on has done it.
   */
  eveningDoneToday: boolean;
  /**
   * Whether this learner has ticked anything in the program at all. With
   * nothing ticked the program is `openingPart` read off their level, which
   * is an offer rather than a course they chose; see `moduleReached`.
   */
  started: boolean;
  /**
   * How many evenings in a row this program has been worked on, counting
   * today where today has a tick and yesterday where it does not, which is
   * `computeStreak`'s own rule and the same midnight the review streak breaks
   * at. Derived from the step log on every read (ADR-014).
   */
  eveningsInARow: number;
}

/**
 * The whole reading, for the course screen and for Today.
 *
 * The derived steps are resolved for the *current* day alone rather than for
 * all twelve, and that is what keeps this three queries rather than
 * twenty-five: a day the learner has already walked past is finished by
 * definition, since walking past it is what finishing it means. The two
 * proofs are asked in parallel, because neither needs the other's answer.
 */
export async function courseReading(
  ownerId: string, programme: Programme, clock: DayClock, now = new Date(),
): Promise<CourseReading> {
  const ticks = await ticksFor(ownerId, programme);

  /*
    THE DAY IN PLAY IS THE FURTHEST ONE CARRYING A TICK, AND EVERY DAY BEFORE
    IT IS DONE. Walking past a day is what finishing it means, and `dayReached`
    is that sentence written down; see its own header for the reading this
    replaced and why that one could not survive a fortnight.
  */
  const reached = dayReached(programme, new Set(ticks.byDay.keys()));
  const done = new Map<string, ReadonlySet<string>>();
  for (const d of programme.days) {
    if (d.index < reached.index) done.set(d.id, new Set(d.steps.map((s) => s.id)));
    else if (d.index === reached.index) done.set(d.id, ticks.byDay.get(d.id) ?? new Set<string>());
  }
  let standing = programmeStanding(programme, done);

  /*
    AND THE TWO STEPS THE LOG PROVES ARE ASKED ABOUT, FOR THE DAY IN PLAY AND
    FOR THE DAY IT ADVANCES TO.

    The second half of that was a fault found by driving two evenings rather
    than by reading: resolving a day can finish it, and the day after was then
    drawn with its own two derived steps unknown, so somebody who had met
    tomorrow's words through Learn saw tomorrow at nought percent with "meet
    the words" waiting for them.
  */
  let justFinished: string | null = null;
  for (let round = 0; round < MAX_RESOLVE; round += 1) {
    const day = standing.current?.day;
    if (!day) break;

    const withDerived = await withDerivedSteps(
      ownerId, programme, ticks, day, done.get(day.id) ?? new Set<string>(), now,
    );
    done.set(day.id, withDerived);
    standing = programmeStanding(programme, done);

    /* Still on it, so there is nothing further to ask about: the day after is
       only worth a query once this one has actually finished. */
    if (standing.current?.day.id === day.id) break;
    /* And this render is what finished it, which is what "come back tomorrow"
       is a claim about. The day it advances to is resolved as well and must
       not overwrite that. */
    justFinished = day.id;
  }

  /*
    AND A DAY ANOTHER RENDER FINISHED IS STILL FINISHED. The derived steps are
    saved the moment a render proves them (`latchDerived`), and the render that
    proves the closing round is very often not this screen's: the module's own
    bar asks for today's steps as the round ends, so by the time the learner
    presses "Finish today's module" the day in play is already whole by its ticks,
    the loop above starts on the next day, and nothing here had finished
    anything. Measured on the first evening: the course opened on evening two,
    "Learn today's 6 new words", a minute after the fifth answer. A day
    reached that is whole, with nothing ticked on the one after it, is the day
    that finished; whether that was today is the same question as below.
  */
  if (!justFinished && standing.current && standing.current.day.index > reached.index) {
    justFinished = reached.id;
  }
  /*
    And the same of a part's LAST evening, where there is no day after it to
    stand on: a whole part has no current day at all, so the rule above could
    never fire and a part finished tonight read as finished on some other day.
    Today then skipped "done for today" and offered the next part at once,
    which is the evening not ending.
  */
  if (!justFinished && standing.finished) justFinished = reached.id;

  /*
    "Come back tomorrow" is a claim about a day that finished *today*, so it is
    read off the day this render just settled rather than off the first day of
    the program, which is where it used to be read and which made the
    sentence reachable on day one alone. A day finished by its closing round
    alone still carries a tick, because the round before it was ticked, and a
    day with no ticks cannot finish: every day has a step the log cannot prove.
  */
  const lastTick = justFinished ? ticks.lastAt.get(justFinished) : undefined;
  const midnight = clock.startOfDay(now);
  let finishedToday = Boolean(lastTick && lastTick >= midnight);
  /*
    AND A DAY WHOSE LAST TICK WAS YESTERDAY CAN STILL HAVE FINISHED TODAY,
    because the closing round is the one step nobody ticks: its answers are
    the proof, and they can land the morning after the steps in front of it.
    Read off the tick alone, a round left two answers in last night and
    finished tonight read as an evening done yesterday, and the learner who
    had just finished it was handed the next module as though tonight had
    held nothing. So the round finished today where it was not yet whole at
    midnight and answers arrived since. Asked only on that path, which is two
    counts on a render that has just advanced a day.
  */
  if (
    !finishedToday && lastTick && justFinished && !ticks.pressed.get(justFinished)?.has(REVIEW_STEP)
    // A lesson evening has no closing round: its one tick is the whole evening.
    && Boolean(dayById(programme, justFinished)?.steps.some((s) => s.id === REVIEW_STEP))
  ) {
    const [before, since] = await Promise.all([
      gradedBetween(ownerId, lastTick, midnight),
      gradedSince(ownerId, midnight),
    ]);
    finishedToday = before < CLOSING_REVIEW && since > 0;
  }

  /*
    THE RUN OF EVENINGS, off the same rows. A tick is a fact about an evening
    the way a review row is a fact about a sitting, so the evenings are the
    distinct days carrying one. Every tick rather than each day's last, since
    an evening spent on a day that finished the next night is still an
    evening somebody turned up for.
  */
  const eveningsInARow = computeStreak(ticks.at, now, clock);

  /*
    AN EVENING DONE TODAY, WHICHEVER RENDER NOTICED. The day before the one
    reached has been walked past, which is what finishing it means, so its
    last tick landing today is an evening finished today even though this
    render did not finish it.
  */
  const before = programme.days[programme.days.indexOf(reached) - 1];
  const beforeLast = before ? ticks.lastAt.get(before.id) : undefined;
  const eveningDoneToday = finishedToday
    || Boolean(beforeLast && beforeLast >= midnight);

  /*
    AND AN EVENING STARTED SINCE IS THE ONE THE SCREEN IS ABOUT. "Come back
    tomorrow" stands until a step of the next day is ticked, and meeting its
    words ticks nothing, since that step is read off the deck: so a learner who
    pressed "start the next one now", met three words and went back to the
    module was shown last night's "Today's module is done" over the evening they
    were half way through. The next day's words given cards since the last
    tick is that evening begun, because Start is what builds them. Asked only
    on the path that would say "done", and never of `eveningDoneToday`, which
    the evening letter reads and which this does not make false.
  */
  let begunNext = false;
  const next = standing.current?.day;
  if (finishedToday && lastTick && next && next.id !== justFinished) {
    begunNext = await prisma.card.count({
      where: {
        ownerId, cardType: LADDER_CARD_TYPE, createdAt: { gt: lastTick },
        lexeme: { lemma: { in: [...next.words] } },
      },
    }) > 0;
  }

  return {
    ...standing, finishedToday: finishedToday && !begunNext, eveningDoneToday,
    started: ticks.byDay.size > 0, eveningsInARow,
  };
}

/**
 * How many of the closing round's answers are in, for the screen that asks.
 *
 * Read separately rather than returned above, because only one screen prints
 * it and the reading above is on Today.
 */
export async function closingProgress(
  ownerId: string, programme: Programme, dayId: string, now = new Date(),
): Promise<{ graded: number; needed: number }> {
  const ticks = await ticksFor(ownerId, programme);
  const day = dayById(programme, dayId);
  /* A closing round the log already proved, and saved, is finished, whatever
     the deck says now. See `latchDerived`. */
  if (ticks.byDay.get(dayId)?.has(REVIEW_STEP)) return { graded: CLOSING_REVIEW, needed: CLOSING_REVIEW };
  const graded = day ? await closingGraded(ownerId, ticks, day) : 0;
  /* The same number the step itself is finished against, or the list would
     promise five answers while the reading behind it settles for two. That
     includes the reading's condition: it settles for less only once the
     closing round is the one step left, so the line does too, or it reads
     "2 of 2 answers in" over a step that is not finished. The meet step is
     proved off the deck, so it is asked the same way the reading asks it, and
     only where it is the one thing between this and the closing round. */
  const ticked = ticks.byDay.get(dayId);
  let lastStanding = false;
  if (day && ticked) {
    const done = new Set(ticked);
    if (onlyClosingLeft(day, new Set([...done, MEET_STEP]))) {
      lastStanding = done.has(MEET_STEP) || await metWords(ownerId, day.words);
    }
  }
  const needed = day && lastStanding
    ? await closingNeeded(ownerId, programme, ticks, day, graded, now)
    : CLOSING_REVIEW;
  return { graded: Math.min(needed, graded), needed };
}

/** Which of a day's words the deck does not hold yet, for the screen to say so. */
export async function missingWords(ownerId: string, day: CourseDay): Promise<string[]> {
  const held = await prisma.card.findMany({
    where: {
      ownerId, cardType: LADDER_CARD_TYPE,
      lexeme: { lemma: { in: [...day.words] } },
    },
    select: { lexeme: { select: { lemma: true } } },
  });
  const have = new Set(held.map((c) => c.lexeme?.lemma));
  return day.words.filter((w) => !have.has(w));
}

/**
 * How far back the accuracy half of the ladder reading looks.
 *
 * A fortnight, which is the stretch a learner can still remember having and
 * the one they can change by next week. All of time would hold somebody's bad
 * first month against them for ever, which is the opposite of what a warning
 * before the next part is for.
 */
const LADDER_WINDOW_DAYS = 14;

/**
 * WHETHER THE LOG SUPPORTS THE NEXT PART, READ OFF THE ONE JUST FINISHED.
 *
 * `lib/course/gate.ts` is the rule and holds no database; this is the half
 * that asks one. Three reads, none of which needs another's answer.
 *
 * Retention is counted over the words that part actually taught, matched by
 * lemma, and "known" is the scheduler's own verdict rather than ours: a card
 * in FSRS Review state is one it has stopped treating as new, which is the
 * same line `unitProgress` draws for a finished unit. A word the dictionary
 * could not supply is in no count either way, because a learner failing at a
 * gap in Ekilex is not a learner failing.
 */
export async function ladderReading(
  ownerId: string, finished: Programme, now = new Date(),
): Promise<LadderVerdict> {
  const words = [...new Set(finished.days.flatMap((d) => d.words))];
  const since = new Date(now.getTime() - LADDER_WINDOW_DAYS * 86_400_000);

  const [taught, known, answers, right] = await Promise.all([
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE,
        lexeme: { lemma: { in: words } },
      },
    }),
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE,
        // FSRS Review: the scheduler has stopped treating the word as new.
        state: 2,
        lexeme: { lemma: { in: words } },
      },
    }),
    prisma.review.count({ where: { ownerId, reviewedAt: { gte: since } } }),
    /* Good or Easy, which is what every other reading here calls recalled
       (`lib/stats/history.ts`, `lib/readiness/evidence.ts`, `lib/srs/mastery.ts`).
       Hard is what a hint, a slip or the right word in the wrong ending is
       graded, and counting it here read a fortnight of near misses as a
       fortnight of right answers and handed the next part over on them. */
    prisma.review.count({ where: { ownerId, reviewedAt: { gte: since }, rating: { gte: 3 } } }),
  ]);

  return ladderVerdict({ taught, known, answers, right });
}

/**
 * Where each A1 lesson stands for this learner, for the list of lessons:
 * done, the one to do next, or ahead (`lessonStates`). One read of their ticks
 * on the lesson parts, beside the part they are following.
 */
export async function lessonListStates(ownerId: string): Promise<Map<string, LessonState>> {
  const parts = PROGRAMMES.filter((p) => p.days.some((d) => d.lesson));
  const [following, rows] = await Promise.all([
    programmeFor(ownerId),
    prisma.courseStep.findMany({
      where: { ownerId, programmeId: { in: parts.map((p) => p.id) } },
      select: { programmeId: true, dayId: true },
      orderBy: { id: "asc" },
    }),
  ]);
  const ticked = new Map<string, Set<string>>();
  for (const row of rows) {
    const days = ticked.get(row.programmeId) ?? new Set<string>();
    days.add(row.dayId);
    ticked.set(row.programmeId, days);
  }
  return lessonStates(parts, ticked, following?.id ?? null);
}

/**
 * HOW FAR ALONG THE LADDER SOMEBODY IS, FOR THE BAR ON TODAY.
 *
 * `lib/course/milestones.ts` is the rule; this counts the words. One grouped
 * query rather than one per level, because it runs on the screen everybody
 * opens each morning.
 *
 * WHAT IS COUNTED IS A CARD THE SCHEDULER HAS GRADUATED, which is FSRS Review
 * state: it has stopped treating the word as new, which is the same line
 * `unitProgress` draws for a finished unit and the only reading that means
 * "they still had it days later". A bar that filled on evenings ticked would
 * be attendance drawn as attainment.
 *
 * The band is the dictionary's own `cefr`, so a word somebody learned outside
 * the course counts toward the level it belongs to. That is the honest reading
 * of "how close to B1 am I": a B1 word is a B1 word however it arrived. It can
 * over-count where a learner has graduated words the ladder does not teach,
 * which is why each level is clamped to what the ladder asks for rather than
 * summed raw.
 *
 * AND WHERE THEY STAND IS READ HERE RATHER THAN THREADED IN, because there are
 * three callers and the one that forgot would draw a B1 speaker at the bottom
 * of A1. `courseStandingFor` is the same answer the course opens at, so the
 * bar and the evening cannot disagree about which band somebody is on. It is
 * two memoised reads on a screen that has already asked for both.
 *
 * MEMOISED, BECAUSE THE NIGHTLY RUN ASKS FOR IT TWICE PER LEARNER. `candidateFor`
 * reads it to find out whether a milestone letter is owed and `letterInputFor`
 * reads it again to build whichever letter that decided on, which is ten
 * counts and two standing reads where five and one will do, once for every
 * learner on the deployment. It is the rule this file already applies to
 * `ticksFor` and `moduleReached`: a fact about one learner that is wanted
 * twice in one pass is held for that pass.
 */
export const ladderPosition = cache(async (
  ownerId: string, target: Level,
): Promise<LadderProgress> => {
  const bands = levelsTo(target);

  /*
    One count per band, asked at once. Five at the very most, each an indexed
    read, and none of them needs another's answer. A `groupBy` over the words
    would be one statement and then a second read to find out which band each
    word is in, which is more work for a smaller number of round trips on a
    query that is already cheap.
  */
  const [counts, standing, working] = await Promise.all([
    Promise.all(bands.map((band) => prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 2,
        // A lesson level by what its lessons taught, every other level by the dictionary's band (`ladderLemmasAt`).
        lexeme: ladderLemmasAt(band) ? { lemma: { in: [...ladderLemmasAt(band)!] } } : { cefr: band },
      },
    }))),
    courseStandingFor(ownerId),
    programmeFor(ownerId),
  ]);
  const verifiedAt = Object.fromEntries(bands.map((band, at) => [band, counts[at]!]));

  /*
    WHAT IS COUNTED AS THEIRS IS WHAT THEY HOLD, BELOW WHAT THEY ARE BEING
    TAUGHT. A learner who says B1 is credited B1 itself, since the course has
    opened on B2.1 for them; one aiming at B1 and walking B1's parts again is
    not, or the bar would call a level done over an evening teaching it.
  */
  return ladderProgress(
    target,
    verifiedAt,
    (level) => ({ title: LEVEL_INFO[level].title, arrival: LEVEL_INFO[level].arrival }),
    standing && {
      level: standing.level,
      kind: standing.kind,
      through: creditedThrough(standing.held, working?.level ?? null),
    },
  );
});

/** The band a learner said they were aiming at, or the top of the ladder. */
export function targetFrom(stored: string | null | undefined): Level {
  const wanted = (stored ?? "").trim().toUpperCase();
  return (LEVELS as readonly string[]).includes(wanted) ? (wanted as Level) : "B1";
}
