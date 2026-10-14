import { PUZZLE_KEY_PREFIX } from "@/lib/offline/forget";

/**
 * A workbook page half filled in, kept on the device.
 *
 * The page is dealt at random on the server, so a reload used to throw away
 * every box somebody had filled and deal a different page: eight sentences of
 * careful work gone to a phone call taking the tab away, or to a detour into a
 * word's dictionary entry and back. That is the same loss the exam's, Sõnad's
 * and the crossword's own resume files exist to prevent, so this is their
 * shape again. The sentences dealt are stored with what was typed, because the
 * point is coming back to *this* page, and nothing here is a mark anybody can
 * edit into a better one: a grade is worked out from a line's outcome in the
 * review log through `recordWorkbookGrades`, and that action refuses a card
 * that is not the learner's own.
 *
 * Keyed on the round's own address, so another page (`round=` one higher) is a
 * new page rather than this one again, and a module step and the standalone
 * round never pick up each other's work. Removed the moment the page is
 * finished, and dropped after `MAX_AGE_MS` so a page abandoned on Monday does
 * not open on Thursday. Prefixed so a sign-out on a shared machine sweeps it
 * with the puzzles (`lib/offline/forget.ts`).
 */
export interface SavedWorkbook<Exercise, Pass, Mark, Outcome> {
  v: 1;
  exercises: Exercise[];
  at: number;
  pass: Pass;
  typed: Record<string, string>;
  marks: Record<string, Mark>;
  firstMarks: Record<string, Mark>;
  checkedAs: Record<string, string>;
  outcomes: Record<string, Outcome>;
  /** Which exercises have already been sent to the review log, so a reload never sends one twice. */
  sent: number[];
  english: boolean;
  savedAt: number;
}

const VERSION = 1;
/** Half a day: long enough for an evening interrupted, short enough that last week's page is gone. */
export const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function keyFor(address: string): string {
  return `${PUZZLE_KEY_PREFIX}workbook.${address}`;
}

export function loadWorkbook<E extends { lines: { id: string }[] }, P, M, O>(
  address: string, now = Date.now(),
): SavedWorkbook<E, P, M, O> | null {
  try {
    const raw = window.localStorage.getItem(keyFor(address));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedWorkbook<E, P, M, O>;
    // A shape from another version is not worth guessing at; a page costs a few minutes, not a result.
    if (parsed?.v !== VERSION || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) return null;
    if (typeof parsed.savedAt !== "number" || now - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(keyFor(address));
      return null;
    }
    if (!parsed.exercises.every((e) => Array.isArray(e?.lines) && e.lines.every((l) => typeof l?.id === "string"))) return null;
    if (!Number.isInteger(parsed.at) || parsed.at < 0 || parsed.at >= parsed.exercises.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkbook<E, P, M, O>(
  address: string, page: Omit<SavedWorkbook<E, P, M, O>, "v" | "savedAt">,
): void {
  try {
    window.localStorage.setItem(keyFor(address), JSON.stringify({ ...page, v: VERSION, savedAt: Date.now() }));
  } catch {
    // Storage full, or blocked. The page still works; only the safety net is gone.
  }
}

export function forgetWorkbook(address: string): void {
  try {
    window.localStorage.removeItem(keyFor(address));
  } catch {
    // As above.
  }
}
