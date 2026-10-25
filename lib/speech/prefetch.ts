/**
 * WHETHER THE VOICE MODEL MAY DOWNLOAD ON ITS OWN (docs/44-sixth-batch.md, D10).
 *
 * The model is 71 MB. The fifth batch fetched it in the background on every
 * device a few seconds after sign-in (docs/41-fifth-batch.md, section 8b), and
 * on a phone on a prepaid plan that is money spent unasked, for a microphone
 * somebody may never press. So the background download runs only where the
 * browser says the connection is Wi-Fi or wired, or on a computer whose
 * browser says nothing at all. Everywhere else it waits for the first press of
 * a microphone, or for "Download now" in Settings, and nothing is asked either
 * way: a press is not a question.
 *
 * Pure, so every combination is a unit test rather than a guess about a
 * phone. The browser half (`navigator.connection`, which Safari and Firefox do
 * not have, and the pointer media query) lives in `components/speech/useSpeech.tsx`.
 */

/** What the browser can say about the device and its connection, read defensively. */
export interface PrefetchConditions {
  /** `navigator.connection.type`, or null where the browser does not say (every Safari, every Firefox). */
  readonly type: string | null;
  /** `navigator.connection.saveData`: the learner asked the browser to spend less data. */
  readonly saveData: boolean;
  /** `(pointer: coarse)` matches: a phone or a tablet, every iPhone included. */
  readonly coarsePointer: boolean;
}

/** The connection types a browser reports that cost nothing per megabyte. */
const UNMETERED: ReadonlySet<string> = new Set(["wifi", "ethernet"]);

/**
 * A type that says nothing. `unknown` is the specification's own word for a
 * browser that has a `type` and cannot fill it, which is a browser saying
 * nothing in a longer form.
 */
const SILENT: ReadonlySet<string> = new Set(["unknown"]);

/**
 * May the background download run under these conditions?
 *
 * Save-Data: never, whatever the connection. Wi-Fi or wired: yes. A type that
 * says nothing: yes on a fine pointer (a computer) and no on a coarse one,
 * since a phone that cannot say is as likely to be on mobile data as not.
 * Any other type the browser names (`cellular`, but also `bluetooth`, which is
 * a phone's data shared, `wimax`, `mixed`, `other`, `none`) is a connection the
 * browser did not call free, so it waits.
 */
export function mayPrefetch({ type, saveData, coarsePointer }: PrefetchConditions): boolean {
  if (saveData) return false;
  const said = type === null ? null : type.trim().toLowerCase();
  if (said === null || said === "" || SILENT.has(said)) return !coarsePointer;
  return UNMETERED.has(said);
}
