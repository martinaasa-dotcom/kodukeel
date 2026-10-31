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

/* 2: the step list is kept beside the place, so a deploy that changes a lesson's steps starts it over rather than opening a different step at the same number. */
const VERSION = 2;
/** Three hours: an evening interrupted is picked up that evening, and yesterday's starts over. */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

const keyFor = (lessonId: string) => `${SNAPSHOT_PREFIX}lesson.${lessonId}`;

/** The place kept for this lesson, held to the steps it has now. */
export function loadLessonPlace(lessonId: string, steps: readonly string[], now = Date.now()): LessonPlace | null {
  try {
    const raw = window.sessionStorage.getItem(keyFor(lessonId));
    if (!raw) return null;
    const p = JSON.parse(raw) as { v?: number; at?: unknown; reached?: unknown; finished?: unknown; heard?: unknown; savedAt?: unknown; steps?: unknown };
    const sameSteps = Array.isArray(p.steps) && p.steps.length === steps.length && p.steps.every((s, i) => s === steps[i]);
    if (p.v !== VERSION || typeof p.savedAt !== "number" || now - p.savedAt > MAX_AGE_MS || !sameSteps) {
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

export function saveLessonPlace(lessonId: string, steps: readonly string[], place: LessonPlace, now = Date.now()): void {
  try {
    window.sessionStorage.setItem(keyFor(lessonId), JSON.stringify({ v: VERSION, ...place, steps, savedAt: now }));
  } catch {
    // Kept nowhere: the lesson still runs, from the start on a reload.
  }
}

export function forgetLessonPlace(lessonId: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(lessonId));
    window.sessionStorage.removeItem(notesKeyFor(lessonId));
  } catch {
    // As above.
  }
}

/**
 * A TALK'S NOTES, KEPT WITH THE PLACE (C1, `LessonSpec.notes`).
 *
 * The one thing a learner types that is kept: the notes they take while a talk
 * plays, so a reload ten minutes into a lecture heard once does not throw them
 * away. Beside them, how often the talk was heard and where it was stopped, so
 * a talk heard once is not heard again for a reload, and the answers given.
 * In the tab's `sessionStorage` with the place, under the same prefix, so a
 * sign-out sweeps it; removed with the place when the lesson is finished, and
 * never sent anywhere.
 */
export interface NotesKept {
  readonly notes: string;
  readonly plays: number;
  readonly at: number;
  readonly answers: readonly string[];
  readonly checked: boolean;
}

const notesKeyFor = (lessonId: string) => `${SNAPSHOT_PREFIX}lesson.${lessonId}.notes`;

/** The notes kept for this lesson's talk, or null. `questions` is how many the talk asks, so a changed talk starts over. */
export function loadLessonNotes(lessonId: string, questions: number, now = Date.now()): NotesKept | null {
  try {
    const raw = window.sessionStorage.getItem(notesKeyFor(lessonId));
    if (!raw) return null;
    const p = JSON.parse(raw) as { v?: number; savedAt?: unknown; notes?: unknown; plays?: unknown; at?: unknown; answers?: unknown; checked?: unknown };
    if (p.v !== VERSION || typeof p.savedAt !== "number" || now - p.savedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(notesKeyFor(lessonId));
      return null;
    }
    const count = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : 0);
    const answers = Array.isArray(p.answers) && p.answers.length === questions && p.answers.every((a) => typeof a === "string")
      ? (p.answers as string[])
      : Array.from({ length: questions }, () => "");
    return { notes: typeof p.notes === "string" ? p.notes : "", plays: count(p.plays), at: count(p.at), answers, checked: p.checked === true };
  } catch {
    return null;
  }
}

export function saveLessonNotes(lessonId: string, kept: NotesKept, now = Date.now()): void {
  try {
    window.sessionStorage.setItem(notesKeyFor(lessonId), JSON.stringify({ v: VERSION, ...kept, savedAt: now }));
  } catch {
    // Kept nowhere: the notes still work, and a reload starts them over.
  }
}
