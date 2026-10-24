import { decide, type Golden, type GoldenClip, type GoldenExpect } from "./golden";

/**
 * THE GOLDEN TEST, RUN ON STORED TURNS, WITH NO BROWSER, NO MODEL AND NO AUDIO
 * (docs/44-sixth-batch.md, R-5; docs/42-native-apps.md, section 5).
 *
 * `golden.json` holds what the web engine returned for each fixture clip and
 * what the pure layer decided from it. The only runner records through the
 * web engine in a browser (`npm run asr:golden`), so a native port had nothing
 * to diff its own engine against. This is that diff: hand it the golden file
 * and, optionally, a recording in the same shape made by another engine, and
 * it runs `decide` over each clip's turns and compares with the file's
 * `expect`, field by field.
 *
 * `decide` is the rule and this does not repeat any of it: it only chooses
 * whose turns go in and says which fields came out different. Pure, and in the
 * portable core, so a native port written in TypeScript runs it as it is.
 */

/** The fields of `GoldenExpect` compared, in the order a difference is reported. */
const FIELDS = ["heard", "understood", "words", "verdict", "pick"] as const satisfies readonly (keyof GoldenExpect)[];

/** A recording made by another engine: at least each clip's file, hash and turns. */
export interface GoldenRun {
  readonly engine?: string;
  readonly model?: string;
  readonly clips: readonly Pick<GoldenClip, "file" | "sha256" | "turns">[];
}

export interface ClipResult {
  readonly file: string;
  /** Empty where the clip decides exactly as the golden file expects. */
  readonly problems: readonly string[];
}

export interface GoldenReport {
  readonly clips: readonly ClipResult[];
  /** Problems with the run as a whole: the model, or a clip the golden file does not hold. */
  readonly problems: readonly string[];
  readonly passed: boolean;
}

/** Equal as data: the same keys holding equal values, arrays in the same order. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((value, i) => same(value, other[i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) if (!same(left[key], right[key])) return false;
  return true;
}

function show(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

/**
 * Runs `decide` over every clip's turns and compares with the golden file.
 *
 * Without a run, the turns are the golden file's own, which is the check that
 * the rules have not moved under the file. With a run, the turns are the
 * run's, each clip found by its file and refused where its hash is not the
 * golden file's, since a fixture regenerated under the same name is a
 * different clip rather than an engine that hears differently.
 */
export function checkGolden(golden: Golden, run?: GoldenRun): GoldenReport {
  const problems: string[] = [];
  if (run?.model !== undefined && run.model !== golden.model) {
    problems.push(`the run used model ${run.model}, and the golden file was recorded with ${golden.model}`);
  }
  if (run) {
    const known = new Set(golden.clips.map((c) => c.file));
    for (const clip of run.clips) if (!known.has(clip.file)) problems.push(`the run holds ${clip.file}, which the golden file does not`);
  }

  const clips = golden.clips.map((clip): ClipResult => {
    const turns = run ? run.clips.find((c) => c.file === clip.file) : clip;
    if (!turns) return { file: clip.file, problems: ["the run holds no turns for this clip"] };
    if (turns.sha256 !== clip.sha256) {
      return { file: clip.file, problems: [`the run decoded bytes with hash ${turns.sha256}, and the golden clip is ${clip.sha256}`] };
    }
    const got = decide(turns.turns, clip.says);
    const found: string[] = [];
    for (const field of FIELDS) {
      if (!same(got[field], clip.expect[field])) {
        found.push(`${field}: expected ${show(clip.expect[field])}, got ${show(got[field])}`);
      }
    }
    return { file: clip.file, problems: found };
  });

  return { clips, problems, passed: problems.length === 0 && clips.every((c) => c.problems.length === 0) };
}
