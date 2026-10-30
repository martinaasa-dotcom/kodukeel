import { SNAPSHOT_PREFIX } from "@/lib/ux/sessionSnapshot";

/**
 * WHERE A LEARNER IS IN A LESSON, KEPT FOR THE TAB.
 *
 * A reload halfway through a lesson, a deploy landing, or a phone taking the
 * tab away put the learner back on step 1 with every step undone, and the
 * pills ahead of them unpressable. This is the round snapshot's shape one
 * screen over (`lib/ux/sessionSnapshot.ts`): which step, how far the learner
 * had reached, which steps were finished and whether the conversation was
 * heard, and nothing typed or marked. In `sessionStorage` under the round
 * prefix, so it goes with the tab and a sign-out on a shared machine sweeps
 * it (`lib/offline/forget.ts`); dropped after `MAX_AGE_MS`, and removed when
 * the lesson is finished. Every access is guarded, because a browser blocking
 * site data throws on the accessor itself.
 */
export interface LessonPlace {
  readonly at: number;
  readonly reached: number;
  readonly finished: readonly string[];
  readonly heard: boolean;
}

const VERSION = 1;
/** Three hours: an evening interrupted is picked up that evening, and yesterday's starts over. */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

const keyFor = (lessonId: string) => `${SNAPSHOT_PREFIX}lesson.${lessonId}`;

/** The place kept for this lesson, held to the steps it has now. */
export function loadLessonPlace(lessonId: string, steps: readonly string[], now = Date.now()): LessonPlace | null {
  try {
    const raw = window.sessionStorage.getItem(keyFor(lessonId));
    if (!raw) return null;
    const p = JSON.parse(raw) as { v?: number; at?: unknown; reached?: unknown; finished?: unknown; heard?: unknown; savedAt?: unknown };
    if (p.v !== VERSION || typeof p.savedAt !== "number" || now - p.savedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(keyFor(lessonId));
      return null;
    }
    const step = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < steps.length ? n : null);
    const at = step(p.at);
    const reached = step(p.reached);
    if (at === null || reached === null) return null;
    const finished = Array.isArray(p.finished) ? p.finished.filter((s): s is string => typeof s === "string" && steps.includes(s)) : [];
    return { at, reached: Math.max(at, reached), finished, heard: p.heard === true };
  } catch {
    return null;
  }
}

export function saveLessonPlace(lessonId: string, place: LessonPlace, now = Date.now()): void {
  try {
    window.sessionStorage.setItem(keyFor(lessonId), JSON.stringify({ v: VERSION, ...place, savedAt: now }));
  } catch {
    // Kept nowhere: the lesson still runs, from the start on a reload.
  }
}

export function forgetLessonPlace(lessonId: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(lessonId));
  } catch {
    // As above.
  }
}
