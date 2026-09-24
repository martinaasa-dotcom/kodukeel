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
   * course unit. It is here rather than beside `addCommonWords`, which has no
   * allowance, because that one writes two cheap cards a word and this one
   * writes every case a noun has: the same press repeated is the expensive
   * shape, not the single press.
   */
  deepenCommonWords: { perMinute: 12 },
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
  /**
   * Builds a whole path unit's cards in one call.
   *
   * The same weight as `deepenCommonWords` and left off the table beside it
   * by the same oversight `restoreBackup` had before this file existed:
   * `addUnitToDeck` calls `addUnitsToDeck` for a unit's worth of words, every
   * card type that unit's words support, in one press. A call that repeats
   * after the words are already there settles into a no-op, and a no-op here
   * is still a transaction and an advisory lock, which is exactly the cost a
   * limit on this shelf is for.
   */
  addUnitToDeck: { perMinute: 12 },
  /**
   * Finishes a lesson, which loops `addCardsFor` once per word it taught and
   * then grades every step.
   *
   * The per-word lock is the heavier of the two builders `addUnitsToDeck`
   * refactored out of, so a lesson of a dozen words is a dozen transactions
   * before the grading even starts.
   */
  completeLesson: { perMinute: 12 },
  /**
   * Builds one evening of the guided course into the deck.
   *
   * Smaller than a whole unit and the same shape: `addPlanToDeck` over the
   * day's words, gated on `dayIsInPlay` so it can only ever build the day the
   * learner is actually standing on, which does nothing to stop that one day
   * being asked for on a loop.
   */
  startCourseDay: { perMinute: 12 },
  /**
   * The last step of first run, which builds the starter units chosen on the
   * screen before it.
   *
   * Bounded to `MAX_STARTER_UNITS` and, in the ordinary case, pressed once
   * per account for the rest of its life. Every export here is still a public
   * endpoint a script can call as fast as it likes, and a repeated call
   * writes the onboarding settings again as well as re-walking the deck
   * build, so it is charged rather than trusted to be rare.
   */
  completeOnboarding: { perMinute: 10 },
  /**
   * Turns a confirmed scanned page into cards, one `addCardsFor` per word on
   * the page.
   *
   * `saveScan`, which resolves the photograph, already has an allowance; this
   * is the write that follows it and was the one step of the scan flow with
   * nothing in front of it. Matched to `saveScan`'s own number rather than to
   * `deepenCommonWords`'s, since a scanned page is bounded by `SCAN_MAX_ITEMS`
   * rather than by a whole unit's vocabulary.
   */
  addScanToDeck: { perMinute: 15 },
  /**
   * A hundred words of one frequency list, two cards each, in one call.
   *
   * The same `addPlanToDeck` as `startCourseDay` above and ten times the
   * words, so the argument that throttles an evening's handful throttles
   * this more. Two card types a word keeps each call cheaper than
   * `deepenCommonWords`, which is why the number is higher than that one's;
   * it does not make a loop of them free, since a repeat is still the whole
   * list read under the deck lock.
   */
  addCommonWords: { perMinute: 12 },
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
