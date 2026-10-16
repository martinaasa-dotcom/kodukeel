/**
 * THE BANK'S LINES AS A SHEET A NATIVE SPEAKER FILLS IN, AND THE SHEET APPLIED.
 *
 * Every prepared line the other side says in a conversation is Estonian a
 * model drafted or a session typed (ADR-025 amendment 1), and the rule is that
 * the native Estonian speaker who develops this app reads it. That read used to
 * come back as a document somebody then applied by hand, line by line. This is
 * the round trip in two pure halves: `sceneSheet` writes every row nobody has
 * reviewed yet, grouped by scene in the order the conversation plays, and
 * `decideSceneSheet` plus `applyToBankFile` turn a filled sheet into edits.
 *
 * Three things a filled row can say, and what each does:
 *
 *   ok          the row gains `reviewedAt`, and leaves the next sheet;
 *   correction  the corrected line replaces the old one, and gains `reviewedAt`,
 *               but only if it passes the same gate a new line passes
 *               (`lineRefusals`, which is `gateFor` and the drafter's refusals);
 *               otherwise the row is printed with the reason and nothing is
 *               written for it;
 *   (neither)   not read yet, left alone.
 *
 * A line not found in the bank character for character is refused, never
 * matched loosely: a spreadsheet that turned a quotation mark or a dash on the
 * way is a correction to a line nobody is shown.
 *
 * NO ESTONIAN IS WRITTEN HERE. The only Estonian that reaches the bank through
 * this is what the reviewer typed into `correction` (ADR-005, amendment 1 of
 * ADR-025), and it passes the gate first.
 *
 * Pure: no React, no Next, no Prisma, no file system.
 */
import type { SceneSpec } from "@/lib/scenes/types";
import type { ScriptedLine } from "@/lib/scenes/scripted";
import { asLiteral, previousNonSpace, stringLiterals } from "./literals";

export const SCENE_SHEET_COLUMNS = ["scene", "beat", "goal", "they", "line", "ok", "correction", "why"] as const;

/** What a beat says about itself in English, for the two context columns. */
export interface BeatWords {
  readonly goal: string;
  readonly they: string;
}

/**
 * The order the conversation plays its beats in: the scene's own, an answer
 * straight after the beat it answers, then the curveballs in the order the
 * scene admits them.
 */
export function playOrder(scene: SceneSpec): string[] {
  const order: string[] = [];
  for (const beat of scene.beats) {
    order.push(beat.id, `answer:${beat.id}`);
  }
  for (const id of scene.curveballs) order.push(`hurdle:${id}`, `answer:hurdle:${id}`);
  return order;
}

/** The sheet: a header and one row per line nobody has reviewed, grouped by scene in play order. */
export function sceneSheet(
  scenes: readonly SceneSpec[],
  bank: readonly ScriptedLine[],
  words: (scene: SceneSpec, beat: string) => BeatWords | null,
): string[][] {
  const rows: string[][] = [[...SCENE_SHEET_COLUMNS]];
  for (const scene of scenes) {
    const order = playOrder(scene);
    const rank = (beat: string) => {
      const at = order.indexOf(beat);
      return at < 0 ? order.length : at;
    };
    const lines = bank
      .map((line, at) => ({ line, at }))
      .filter(({ line }) => line.scene === scene.id && !line.reviewedAt)
      .sort((a, b) => rank(a.line.beat) - rank(b.line.beat) || a.at - b.at);
    for (const { line } of lines) {
      const said = words(scene, line.beat);
      rows.push([scene.id, line.beat, said?.goal ?? "", said?.they ?? "", line.text, "", "", ""]);
    }
  }
  return rows;
}

/** One filled row of the sheet. `row` is its line number in the file, header included. */
export interface SceneSheetRow {
  readonly row: number;
  readonly scene: string;
  readonly beat: string;
  readonly line: string;
  readonly ok: boolean;
  readonly correction: string;
  readonly why: string;
}

/** The rows a parsed sheet holds, by the header's names, or what is wrong with the header. */
export function readSceneSheet(cells: readonly (readonly string[])[]): { rows: SceneSheetRow[]; problem: string | null } {
  const [header, ...body] = cells;
  const col = (name: string) => header?.findIndex((h) => h.trim().toLowerCase() === name) ?? -1;
  for (const need of ["scene", "beat", "line", "ok", "correction"]) {
    if (col(need) < 0) return { rows: [], problem: `the sheet has no "${need}" column. Is it one npm run review:scenes wrote?` };
  }
  const at = (row: readonly string[], name: string) => {
    const i = col(name);
    return i < 0 ? "" : (row[i] ?? "");
  };
  return {
    problem: null,
    rows: body.map((row, i) => ({
      row: i + 2,
      scene: at(row, "scene").trim(),
      beat: at(row, "beat").trim(),
      line: at(row, "line"),
      ok: at(row, "ok").trim() !== "",
      correction: at(row, "correction").trim(),
      why: at(row, "why").trim(),
    })),
  };
}

export type SceneDecision =
  | { readonly kind: "confirm"; readonly row: SceneSheetRow }
  | { readonly kind: "correct"; readonly row: SceneSheetRow; readonly text: string }
  | { readonly kind: "refuse"; readonly row: SceneSheetRow; readonly reason: string };

/**
 * What each filled row does. A correction wins over a tick, since writing the
 * line again is a stronger statement than passing it. `refusals` is the gate.
 */
export function decideSceneSheet(
  rows: readonly SceneSheetRow[],
  bank: readonly ScriptedLine[],
  refusals: (scene: string, beat: string, text: string) => readonly string[],
): SceneDecision[] {
  const out: SceneDecision[] = [];
  for (const row of rows) {
    if (!row.ok && !row.correction) continue;
    const held = bank.some((l) => l.scene === row.scene && l.beat === row.beat && l.text === row.line);
    if (!held) {
      out.push({ kind: "refuse", row, reason: "this line is not in the bank character for character (was it edited on the way?)" });
      continue;
    }
    if (!row.correction) {
      out.push({ kind: "confirm", row });
      continue;
    }
    if (row.correction === row.line) {
      out.push({ kind: "confirm", row });
      continue;
    }
    const why = refusals(row.scene, row.beat, row.correction);
    if (why.length > 0) {
      out.push({ kind: "refuse", row, reason: `the correction would be refused: ${why.join(", ")}` });
      continue;
    }
    out.push({ kind: "correct", row, text: row.correction });
  }
  return out;
}

/** One object row of a bank file: where it stands and the literals inside it. */
interface BankRow {
  readonly start: number;
  readonly end: number;
  readonly beat: string | null;
  readonly text: { start: number; end: number; value: string } | null;
  readonly reviewed: { start: number; end: number } | null;
}

function bankRows(source: string): BankRow[] {
  const literals = stringLiterals(source);
  const rows: BankRow[] = [];
  let i = source.indexOf("{ scene:");
  while (i >= 0) {
    const close = source.indexOf("}", i);
    if (close < 0) break;
    const inside = literals.filter((l) => l.start > i && l.end <= close);
    const keyed = (key: string) =>
      inside.find((l) => /(\w+)\s*:\s*$/.exec(source.slice(i, l.start))?.[1] === key) ?? null;
    const beat = keyed("beat");
    const text = keyed("text");
    const reviewed = keyed("reviewedAt");
    rows.push({ start: i, end: close + 1, beat: beat?.value ?? null, text, reviewed });
    i = source.indexOf("{ scene:", close);
  }
  return rows;
}

/**
 * A bank file with the decisions for its scene applied, and which decisions
 * found no row in it. Only `confirm` and `correct` are applied; a `refuse` is
 * the caller's to print.
 */
export function applyToBankFile(
  source: string,
  decisions: readonly SceneDecision[],
  today: string,
): { source: string; missing: SceneDecision[] } {
  const missing: SceneDecision[] = [];
  const edits: { start: number; end: number; text: string }[] = [];
  const rows = bankRows(source);
  for (const decision of decisions) {
    if (decision.kind === "refuse") continue;
    const matches = rows.filter((r) => r.beat === decision.row.beat && r.text?.value === decision.row.line);
    if (matches.length === 0) {
      missing.push(decision);
      continue;
    }
    for (const row of matches) {
      if (decision.kind === "correct" && row.text) {
        edits.push({ start: row.text.start, end: row.text.end, text: asLiteral(decision.text) });
      }
      if (row.reviewed) {
        edits.push({ start: row.reviewed.start, end: row.reviewed.end, text: asLiteral(today) });
      } else {
        // Before the row's closing brace, after its last field.
        const brace = row.end - 1;
        const last = previousNonSpace(source, brace);
        const at = source.slice(0, brace).search(/\s*$/);
        edits.push({ start: at, end: at, text: `${last === "," ? "" : ","} reviewedAt: ${asLiteral(today)}` });
      }
    }
  }
  // Applied from the end so an earlier edit never moves a later one.
  let out = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return { source: out, missing };
}
