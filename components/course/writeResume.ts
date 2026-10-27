import { PUZZLE_KEY_PREFIX } from "@/lib/offline/forget";

/**
 * A writing evening's draft, kept on the device.
 *
 * The writing step is the longest single thing a learner types in this app,
 * fifty words or a hundred, and it lived in component state: pressing another
 * step of the lesson, which the step pills let anybody do, or a reload, or a
 * phone taking the tab away, threw the draft and the second draft away. That
 * is the loss the exam's, Sõnad's and the workbook's resume files exist to
 * prevent, so this is their shape again: what was typed and which stage it
 * was typed at, never a reading or a mark, both of which are asked of the
 * server afresh.
 *
 * Keyed on the lesson, removed when the learner presses "Done writing", and
 * dropped after `MAX_AGE_MS`. Under the puzzle prefix, so a sign-out on a
 * shared machine sweeps it with the puzzles (`lib/offline/forget.ts`): a draft
 * is somebody's own sentences about their own life. Every read and write is
 * guarded, because a browser set to block site data throws on the accessor
 * itself, and a writing step that would not open because storage is off would
 * be a worse failure than the one this fixes.
 */
export type WriteStage = "model" | "frame" | "own" | "redraft";

interface SavedWriting {
  v: 1;
  stage: WriteStage;
  /** What was typed into each gap of the frame, in order. */
  frame: string[];
  /** Whether the frame has been checked. */
  frameChecked: boolean;
  draft: string;
  second: string;
  savedAt: number;
}

const VERSION = 1;
const STAGES: readonly WriteStage[] = ["model", "frame", "own", "redraft"];
/** A week: an evening's writing interrupted is picked up later that week, and last month's is gone. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function keyFor(lessonId: string): string {
  return `${PUZZLE_KEY_PREFIX}write.${lessonId}`;
}

export function loadWriting(lessonId: string, now = Date.now()): SavedWriting | null {
  try {
    const raw = window.localStorage.getItem(keyFor(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedWriting>;
    if (parsed?.v !== VERSION || !STAGES.includes(parsed.stage as WriteStage)) return null;
    if (typeof parsed.savedAt !== "number" || now - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(keyFor(lessonId));
      return null;
    }
    if (typeof parsed.draft !== "string" || typeof parsed.second !== "string") return null;
    if (!Array.isArray(parsed.frame) || !parsed.frame.every((g) => typeof g === "string")) return null;
    return {
      v: VERSION, stage: parsed.stage as WriteStage, frame: parsed.frame, frameChecked: parsed.frameChecked === true,
      draft: parsed.draft, second: parsed.second, savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveWriting(lessonId: string, writing: Omit<SavedWriting, "v" | "savedAt">): void {
  try {
    window.localStorage.setItem(keyFor(lessonId), JSON.stringify({ ...writing, v: VERSION, savedAt: Date.now() }));
  } catch {
    // Storage full, or blocked. The step still works; only the safety net is gone.
  }
}

export function forgetWriting(lessonId: string): void {
  try {
    window.localStorage.removeItem(keyFor(lessonId));
  } catch {
    // As above.
  }
}
