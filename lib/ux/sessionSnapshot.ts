/**
 * A REVIEW SESSION SURVIVES THE PAGE RELOADING UNDER IT.
 *
 * Reported by a learner twenty cards into a review: they stepped away for two
 * minutes, came back, answered, and the page reloaded and started them over.
 * Nothing in the app times out. What happened is that a deploy landed while
 * they were away. `gradeCard` revalidates, a revalidation refreshes the page
 * it was called from, and the refresh came back from the new build: Next
 * compares build ids and, finding them different, loads the whole page again
 * (`server-action-reducer.js`, "Build ID mismatch"). The grade was saved; the
 * session's queue, position and counts lived in React state and went with
 * the page. A phone that suspends a backgrounded tab does the same thing by
 * another road, and both are ordinary rather than rare: this repository
 * deploys several times a day.
 *
 * `lib/ux/resumePosition.ts` already remembered which card was on screen, and
 * that answered the dictionary detour it was written for. It does not answer
 * this, because a reload hands back a fresh queue and the counts at nought,
 * which is "start over" whatever card it opens on. So the session keeps the
 * whole of its round in `sessionStorage`: the queue it froze on mount, where
 * it is in it, and what it has counted. A remount of the same page in the
 * same tab within `SNAPSHOT_MAX_AGE_MS` carries on from there.
 *
 * Per tab and short-lived on purpose. `sessionStorage` dies with the tab, a
 * new visit tomorrow starts a new round, and a snapshot older than the limit
 * is read as no snapshot, because by then the scheduler has moved and the
 * frozen queue is a list of cards that were due some time ago. Pure, so the
 * shape check is tested without a browser.
 */
export const SNAPSHOT_PREFIX = "kodukeel:round:";
export const SNAPSHOT_VERSION = 1;
/** Long enough for a coffee and a phone call, short enough not to replay yesterday. */
export const SNAPSHOT_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export interface RoundSnapshot<C extends { id: string }> {
  v: typeof SNAPSHOT_VERSION;
  savedAt: number;
  queue: C[];
  index: number;
  done: number;
  correct: number;
  met: string[];
}

export function snapshotKey(pathAndQuery: string): string {
  return `${SNAPSHOT_PREFIX}${pathAndQuery}`;
}

export function writeSnapshot<C extends { id: string }>(
  round: Omit<RoundSnapshot<C>, "v" | "savedAt">,
  now: number,
): string {
  return JSON.stringify({ v: SNAPSHOT_VERSION, savedAt: now, ...round });
}

const count = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/**
 * The round stored under a key, or null where there is none worth resuming.
 *
 * Everything is checked rather than trusted, since storage is whatever the
 * browser kept and an old build may have written it. A round already finished
 * (its position past the last card) is not resumed: the summary it would open
 * on belongs to the round that ended, not to a learner arriving fresh.
 */
export function readSnapshot<C extends { id: string }>(raw: string | null, now: number): RoundSnapshot<C> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const s = parsed as Partial<RoundSnapshot<C>>;
  if (s.v !== SNAPSHOT_VERSION) return null;
  if (typeof s.savedAt !== "number" || !Number.isFinite(s.savedAt)) return null;
  const age = now - s.savedAt;
  if (age < 0 || age > SNAPSHOT_MAX_AGE_MS) return null;
  if (!Array.isArray(s.queue) || s.queue.length === 0) return null;
  if (!s.queue.every((c) => !!c && typeof c === "object" && typeof (c as { id?: unknown }).id === "string")) return null;
  if (!count(s.index) || s.index >= s.queue.length) return null;
  if (!count(s.done) || !count(s.correct) || s.correct > s.done) return null;
  if (!Array.isArray(s.met) || !s.met.every((m) => typeof m === "string")) return null;
  return { v: SNAPSHOT_VERSION, savedAt: s.savedAt, queue: s.queue, index: s.index, done: s.done, correct: s.correct, met: s.met };
}
