import { bucketForOwner, checkRateLimit } from "./rateLimit";

/**
 * How often one learner may run the actions that do real work per call.
 *
 * THE GATE WAS ON THE WRONG DOOR, AND ONLY ON ONE OF THEM.
 *
 * Five Route Handlers call `checkRateLimit`. Every mutation a learner makes
 * here is a Server Action instead, which is a POST to a page path, and not one
 * of the forty-odd of them had a throttle. The same-origin gate and
 * `requireUserId` mean this is not reachable by an anonymous scraper, so this
 * is not the hole `/api/tutor` would be without its limiter — but sign-up is
 * open by default, and one signed-in account could call any action as fast as
 * it liked. `serverActions.bodySizeLimit` is 16 MB, raised for backup
 * restores and therefore the ceiling on *every* action's payload, so a loop
 * posting near-16 MB bodies at a database-touching action had nothing in the
 * app slowing it down.
 *
 * Not every action needs one. Grading a card, starring a word or toggling a
 * task is a single indexed write, and a person tapping quickly is a person
 * using the app: a limit there would be felt by learners and by nobody else.
 * What is listed here is the work that is genuinely per-call expensive — a
 * whole passage scanned against the dictionary, a backup parsed and written
 * row by row, a class roster read and written, a table of forms built and stored.
 *
 * The numbers are deliberately far above real use. A person importing three
 * word lists in a minute should never meet one of these; a script should meet
 * it immediately. They are a ceiling on abuse, not a pace for anybody.
 */
export const ACTION_LIMITS = {
  /** Reads the deck and scans a pasted passage against the dictionary. */
  buildCloze: { perMinute: 10 },
  /** Writes a row and a card per line of a pasted list. */
  importWords: { perMinute: 10 },
  /**
   * Deepens a batch of the commonest words into every card type they support.
   *
   * Bounded to `COMMON_BATCH` words a press, so one call is about the size of a
   * course unit. It writes every case a noun has where `addCommonWords` writes
   * two cards a word, so it has its own allowance rather than sharing one.
   */
  deepenCommonWords: { perMinute: 12 },
  /**
   * A hundred of the commonest words into the deck, two cards apiece.
   *
   * It had no allowance, on the argument that two cards a word is cheap. The
   * cards are the cheap half. `addPlanToDeck` reads every one of the hundred
   * words with its sentences, builds their cards and filters them against the
   * deck under the learner's lock on every press, and the dedupe only decides
   * what is inserted at the end, so the second press costs what the first did
   * and writes nothing. There are four lists; twelve a minute is never met.
   */
  addCommonWords: { perMinute: 12 },
  /**
   * The evening's words into the deck, which is the same bulk build on a day's
   * words. A press per evening, and a module a learner walks through quickly
   * is still a handful of presses a minute at most.
   */
  startCourseDay: { perMinute: 12 },
  /**
   * First run's deck, which is up to `MAX_STARTER_UNITS` units in one build and
   * a dozen settings written beside it.
   *
   * This is the one screen where somebody is waiting and inclined to press
   * again, so the allowance sits well above a nervous double press and far
   * under a loop. It is charged before anything is written, so a refusal here
   * really does mean nothing has changed.
   */
  completeOnboarding: { perMinute: 6 },
  /**
   * A finished lesson: a card write per word the unit teaches, each under its
   * own lock, then the grades. A lesson takes minutes to sit, so this is a
   * ceiling nobody sitting one can reach.
   */
  completeLesson: { perMinute: 12 },
  /**
   * A confirmed page into the deck, a card write per word on it. The same
   * allowance as `saveScan`, which is the press before it on the same screen.
   */
  addScanToDeck: { perMinute: 15 },
  /**
   * Finishing a level check, which appends an `Assessment` row.
   *
   * That table is append-only like `Review`, so a loop of calls is a history
   * nobody can repair rather than a cost that passes. The check takes a quarter
   * of an hour, so six a minute is a double press with room to spare.
   */
  recordAssessment: { perMinute: 6 },
  /** Writes a lexeme and its principal parts into the shared dictionary. */
  editDictionary: { perMinute: 30 },
  /** Resolves a confirmed page against the dictionary and builds cards. */
  saveScan: { perMinute: 15 },
  /** Allocates a join code, which means a uniqueness search per attempt. */
  createClassroom: { perMinute: 6 },
  /**
   * Guessing a code is the reason this one is tightest. Six characters from a
   * 29-symbol alphabet is around 600 million codes, which no human is
   * brute-forcing, and ten a minute makes it no faster than that either.
   */
  joinClassroom: { perMinute: 10 },
  /** Writes a task per member of a class. */
  assignUnit: { perMinute: 10 },
  /** Writes a task per member of a class. */
  assignHomework: { perMinute: 10 },
  /** Parses and writes a whole backup: the most expensive call in the app. */
  restoreBackup: { perMinute: 4 },
  /**
   * Parses a whole backup and writes nothing.
   *
   * `app/api/restore` limits itself and its comment said that limit was "the
   * only thing standing in front of the parse", which was true of the route
   * and not of this file: `inspectBackup` is an export of a `"use server"`
   * module, so it is an endpoint of its own, and it ran `JSON.parse` over a
   * 16 MB body plus a zod walk of every row with nothing in front of it.
   * Higher than the restore's four because looking before you leap is the
   * thing this exists to encourage, and low enough that a loop is not free.
   */
  inspectBackup: { perMinute: 10 },
  /**
   * Sending a suggested fix.
   *
   * Offered on every dead end in the app, which is what makes it the one
   * action a frustrated person can reach several times in a minute without
   * doing anything wrong. Twenty is well past that and far under a script.
   * The row it writes is small; what it is really protecting is the review
   * queue, which is read by a person and only works while its volume means
   * something.
   */
  sendSuggestion: { perMinute: 20 },
  /**
   * Acting on one, which can write to the shared dictionary.
   *
   * Higher than the rest on purpose: working through a queue is exactly the
   * case where a person clicks fast for a long time, and a limit a reviewer
   * meets is a limit that stops the queue being cleared.
   */
  reviewSuggestion: { perMinute: 120 },
  /**
   * Finishing a conversation, which re-marks every turn and writes a run.
   *
   * The expensive part is not the write, it is the rebuild: the server reads a
   * few hundred lemmas with their forms, builds the scene's closed list and
   * replays the whole transcript through the marker, because the client never
   * sends a mark (ADR-022). Six a minute is more scenes than anybody plays and
   * far under a loop.
   */
  finishScene: { perMinute: 6 },
  /**
   * Opening one, which is a different act and needed its own.
   *
   * It shared `finishScene`'s six, so somebody reading down the situations
   * list and opening a few of them spent the allowance that writes the run
   * and the grades at the end of the one they stayed in: the refusal landed
   * on the finish, which is the press that costs a learner something. Opening
   * is a draw, a count and one insert, so it is cheaper than finishing and
   * gets more of them; still nowhere near a loop.
   */
  beginScene: { perMinute: 20 },
  /**
   * The help button, which is the same rebuild without the writing.
   *
   * It is a button on a screen somebody is sitting in front of, so it is
   * pressed rather than looped, and each press costs the scene's whole closed
   * list: a few hundred lemmas with their forms, built to find out which beat
   * the run is on. Higher than `finishScene` because a conversation has a
   * dozen turns and asking on several of them is exactly what it is for; still
   * far under anything a loop would reach.
   */
  sceneHelp: { perMinute: 30 },
} as const;

export type ActionLimit = keyof typeof ACTION_LIMITS;

/**
 * The refusal, in the shape every one of these actions already returns.
 *
 * Worded for a person rather than for a log, and honest about the fact that
 * nothing was lost: somebody who hits one of these was probably clicking
 * twice, and "nothing has changed" is the sentence that stops them worrying
 * about whether half of it went through.
 */
export interface ActionRefusal {
  ok: false;
  error: string;
}

/**
 * Charges one call of `action` to `ownerId`, or returns the refusal to send.
 *
 * Charged to the learner, never to their address, for the reason the whole
 * limiter module gives: twenty-five students in one classroom are one IP.
 */
export function throttleAction(ownerId: string, action: ActionLimit): ActionRefusal | null {
  const { perMinute } = ACTION_LIMITS[action];
  const limit = checkRateLimit(`action:${action}:${bucketForOwner(ownerId)}`, perMinute, 60_000);
  if (limit.ok) return null;
  return {
    ok: false,
    error:
      `That is a lot of requests at once, so this one was not run. Nothing has changed. ` +
      `Try again in ${limit.retryAfterSec ?? 60} seconds.`,
  };
}
