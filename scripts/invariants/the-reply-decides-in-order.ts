import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE SCENE REPLY DECIDES IN THE ORDER `docs/21-situations.md` WRITES DOWN.
 *
 * The reply is a long chain of special cases where order matters, and a new
 * case can quietly shadow an old one (D26 in `docs/41-fifth-batch.md`). So
 * the order is a table, every decision in the code carries a marker naming
 * its row, and this file fails where the two disagree.
 *
 * WHAT A MARKER IS. A line comment of the shape `// reply-row: <id>`, either
 * on the line directly above the branch or trailing on the branch's own line
 * (the second is for a `} else if (...) {` line, where the line above belongs
 * to the arm before it). Markers are comments, so they are read off the raw
 * file; the branches are found in the comment-stripped code, whose line
 * numbers match the raw file's.
 *
 * WHAT A BRANCH IS, concretely, so it can be checked. Three functions are
 * covered, in this order, which is the order a turn passes through them:
 * `readTurn` (`lib/scenes/turn.ts`), `asideFor` (`lib/scenes/aside.ts`) and
 * `replyFor` (`lib/scenes/reply.ts`). Inside each body, at any depth, every
 * `if (...)`, `else if (...)` and bare `else` is an arm, and an arm is a
 * branch when its consequent (the block, or the one statement) does one of
 * the things that function's decisions do:
 *
 *   readTurn   `return shape(`, which hands the reply a reading
 *   asideFor   `return`, which is the aside said, or nothing said
 *   replyFor   `return`, or `out.push(`, `out.splice(` or `out.pop(`
 *
 * or when the block is empty once comments are taken out, which is a
 * deliberate silence and is a decision like any other.
 *
 * WHAT IT DOES NOT COVER, said so nobody reads more into a pass. A ternary
 * inside an arm is that arm's row, not a row of its own. An `if` that only
 * assigns a variable a later push reads (the closing goodbye swapped for the
 * learner's own) is not a branch, though it may carry a marker and a row. The
 * route's own rungs (the model, the shrug, `asideOwed`) are outside these
 * three functions and outside this check. And it reads braces and parens by
 * counting, so a brace inside a string or a regular expression would throw
 * the count; the body found has to close on a line of its own at column
 * zero, which is what catches that.
 *
 * Every marker in the three files must sit inside the covered function, the
 * markers in order across the three must be the table's rows in order, and
 * no id may appear twice in either.
 */

/** Where the table is: the section heading it sits under. */
const DOC = "docs/21-situations.md";
const HEADING = /^## \d+\. The reply decides in a written order\s*$/m;
const MARKER = /\/\/\s*reply-row:\s*([a-z0-9-]+)\s*$/;

export interface Covered {
  readonly file: string;
  readonly fn: string;
  /** What a consequent has to do for its arm to be a decision. */
  readonly says: RegExp;
  /** A floor on the branches found, so a parser that stops matching cannot pass on nothing. */
  readonly floor: number;
}

const COVERED: readonly Covered[] = [
  { file: "lib/scenes/turn.ts", fn: "readTurn", says: /\breturn\s+shape\(/, floor: 12 },
  { file: "lib/scenes/aside.ts", fn: "asideFor", says: /\breturn\b/, floor: 14 },
  { file: "lib/scenes/reply.ts", fn: "replyFor", says: /\breturn\b|\bout\.(?:push|splice|pop)\(/, floor: 55 },
];

/** The fewest rows the table may hold, and the fewest markers the code may carry. */
const ROW_FLOOR = 90;

export interface Branch {
  readonly file: string;
  /** One-based, as an editor counts. */
  readonly line: number;
  readonly marker: string | null;
}

/** The index just past the bracket that closes the one opening at `open`. */
function closing(text: string, open: number, pair: "()" | "{}"): number {
  let depth = 0;
  for (let at = open; at < text.length; at += 1) {
    if (text[at] === pair[0]) depth += 1;
    else if (text[at] === pair[1] && --depth === 0) return at + 1;
  }
  throw new Error(`unbalanced ${pair} from offset ${open}`);
}

/** The index just past a single statement starting at `from`: the first `;` outside any bracket. */
function statementEnd(text: string, from: number): number {
  let depth = 0;
  for (let at = from; at < text.length; at += 1) {
    const ch = text[at]!;
    if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
    else if (ch === ";" && depth === 0) return at + 1;
  }
  throw new Error(`no end to the statement at offset ${from}`);
}

const lineAt = (text: string, offset: number) => text.slice(0, offset).split("\n").length;

/**
 * The covered function's body in the stripped code, and the lines it spans.
 * Throws where the body does not close at column zero, which is the sign a
 * brace inside a string or a pattern threw the count.
 */
function bodyOf(stripped: string, covered: Covered): { start: number; end: number } {
  const head = new RegExp(`export function ${covered.fn}\\s*\\(`).exec(stripped);
  if (!head) throw new Error(`${covered.file}: \`${covered.fn}\` is gone`);
  const paramsEnd = closing(stripped, head.index + head[0].length - 1, "()");
  const start = stripped.indexOf("{", paramsEnd);
  const end = closing(stripped, start, "{}");
  if (stripped.lastIndexOf("\n", end - 1) !== end - 2) {
    throw new Error(`${covered.file}: the body of \`${covered.fn}\` did not close at column zero, so the brace count went wrong`);
  }
  return { start, end };
}

/** Every branch in one covered function, with the marker attached to it. */
export function branchesIn(covered: Covered, code: (file: string) => string): { branches: Branch[]; markers: { id: string; line: number }[] } {
  const raw = readFileSync(covered.file, "utf8").split("\n");
  const stripped = code(covered.file);
  if (stripped.split("\n").length !== raw.length) {
    throw new Error(`${covered.file}: stripping comments changed the line count, so lines cannot be matched to markers`);
  }
  const { start, end } = bodyOf(stripped, covered);
  const body = stripped.slice(start, end);
  const branches: Branch[] = [];
  const markerOn = (line: number): string | null => {
    const own = MARKER.exec(raw[line - 1] ?? "");
    if (own) return own[1]!;
    const above = (raw[line - 2] ?? "").trim();
    const marked = /^\/\/\s*reply-row:\s*([a-z0-9-]+)\s*$/.exec(above);
    return marked ? marked[1]! : null;
  };
  for (const found of body.matchAll(/\b(?:else\s+)?if\s*\(|\belse\b(?!\s+if\b)/g)) {
    const at = found.index!;
    let after: number;
    if (/if\s*\($/.test(found[0])) after = closing(body, at + found[0].length - 1, "()");
    else after = at + found[0].length;
    let from = after;
    while (/\s/.test(body[from] ?? "")) from += 1;
    const consequent = body[from] === "{"
      ? body.slice(from, closing(body, from, "{}"))
      : body.slice(from, statementEnd(body, from));
    const silent = body[from] === "{" && consequent.slice(1, -1).trim() === "";
    if (!silent && !covered.says.test(consequent)) continue;
    const line = lineAt(stripped, start + at);
    branches.push({ file: covered.file, line, marker: markerOn(line) });
  }
  const markers: { id: string; line: number }[] = [];
  raw.forEach((text, i) => {
    const marked = MARKER.exec(text);
    if (marked) markers.push({ id: marked[1]!, line: i + 1 });
  });
  const first = lineAt(stripped, start);
  const last = lineAt(stripped, end);
  for (const marker of markers) {
    if (marker.line < first || marker.line > last) {
      throw new Error(`${covered.file}:${marker.line} carries \`reply-row: ${marker.id}\` outside \`${covered.fn}\`, where nothing reads it`);
    }
  }
  return { branches, markers };
}

/** The row ids of the table, in order. */
export function tableRows(doc: string): string[] {
  const heading = HEADING.exec(doc);
  if (!heading) throw new Error(`${DOC} has no section headed "The reply decides in a written order"`);
  const rest = doc.slice(heading.index + heading[0].length);
  const next = rest.search(/^## /m);
  const section = next < 0 ? rest : rest.slice(0, next);
  return [...section.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((row) => row[1]!);
}

export default function theReplyDecidesInOrder({ check, code }: InvariantKit) {
  /*
    Read once, inside the first check that asks, so a parse that throws fails
    a named check rather than the loader.
  */
  let memo: { rows: string[]; found: (ReturnType<typeof branchesIn> & { covered: Covered })[] } | null = null;
  const read = () => (memo ??= {
    rows: tableRows(readFileSync(DOC, "utf8")),
    found: COVERED.map((covered) => ({ covered, ...branchesIn(covered, code) })),
  });

  check("the reply's decision table is there and long enough to be the whole reply", () => {
    const { rows } = read();
    assert.ok(rows.length >= ROW_FLOOR, `${DOC} lists ${rows.length} reply rows; the floor is ${ROW_FLOOR}, so the table or its parser stopped matching`);
    const twice = rows.filter((id, i) => rows.indexOf(id) !== i);
    assert.deepEqual(twice, [], `these rows appear twice in the table: ${twice.join(", ")}`);
  });

  check("every decision in the scene reply carries a reply-row marker", () => {
    const { found } = read();
    for (const { covered, branches } of found) {
      assert.ok(branches.length >= covered.floor,
        `found ${branches.length} branches in \`${covered.fn}\`; the floor is ${covered.floor}, so the parser stopped matching`);
    }
    const bare = found.flatMap(({ branches }) => branches)
      .filter((branch) => branch.marker === null).map((branch) => `${branch.file}:${branch.line}`);
    assert.deepEqual(bare, [], `these branches name no row of ${DOC}: ${bare.join(", ")}`);
  });

  check("every reply-row marker names a row, and every row names a marker", () => {
    const { rows, found } = read();
    const markers = found.flatMap(({ covered, markers }) => markers.map((marker) => ({ ...marker, file: covered.file })));
    assert.ok(markers.length >= ROW_FLOOR, `found ${markers.length} reply-row markers; the floor is ${ROW_FLOOR}`);
    const known = new Set(rows);
    const stray = markers.filter((marker) => !known.has(marker.id)).map((marker) => `${marker.file}:${marker.line} (${marker.id})`);
    assert.deepEqual(stray, [], `these markers name no row of the table: ${stray.join(", ")}`);
    const marked = new Set(markers.map((marker) => marker.id));
    const unmarked = rows.filter((id) => !marked.has(id));
    assert.deepEqual(unmarked, [], `these rows of the table name no marker in the code: ${unmarked.join(", ")}`);
    const twice = markers.filter((marker, i) => markers.findIndex((other) => other.id === marker.id) !== i)
      .map((marker) => `${marker.file}:${marker.line} (${marker.id})`);
    assert.deepEqual(twice, [], `these markers repeat a row already marked: ${twice.join(", ")}`);
  });

  check("the scene reply decides in the order its table writes down", () => {
    const { rows, found } = read();
    const order = found.flatMap(({ markers }) => markers.map((marker) => marker.id));
    const at = order.findIndex((id, i) => id !== rows[i]);
    assert.ok(at < 0 && order.length === rows.length,
      at < 0
        ? `the code carries ${order.length} markers and the table ${rows.length} rows`
        : `row ${at + 1} of the table is \`${rows[at]}\`, and the code's marker there is \`${order[at]}\``);
  });
}
