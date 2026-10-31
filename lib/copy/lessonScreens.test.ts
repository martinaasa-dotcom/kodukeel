import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translated, tr } from "./locale";
import { LEVEL_NEW } from "@/lib/course/lessons/levelNew";
import { NOTES, NOTE_ONE_WORD, NOTE_WITH_ON } from "@/lib/course/lessons/practice";
import { nameOf } from "@/lib/ux/roundNames";

/**
 * THE LESSON SCREENS ARE TRANSLATED WHOLE, AND THIS IS WHAT SAYS SO.
 *
 * A line no table holds prints its English, which is the right fallback and
 * the reason a gap goes unseen: a Russian reader on a B1 rework got "Change
 * the sentence" over the question, and a screen reader in Russian heard "A
 * line, not shown yet" on every hidden line of the listening step, and every
 * check passed. So every line the lesson screens, a part's check and the
 * microphone hand the translator is asked of both tables, read off the source
 * the way `publicPages.test.ts` reads the public pages.
 *
 * The ways a line reaches `t()` without being written inside it in double
 * quotes, each of which an earlier version missed, and each of which "finds
 * the lines it is asking about" holds to finding something:
 *
 * - a literal in single quotes, which is how a line holding a double quote is
 *   written (`t('Hear "{text}" in Estonian')`);
 * - a ternary inside the call (`t(due === 1 ? "…" : "…")`);
 * - a table named in the call (`t(STEP_TITLE[s])`), or one typed
 *   `Record<…, string>`;
 * - a helper the call goes through (`t(titleOf(s))`), whose branches are read;
 * - a field of a constant (`t(WORKBOOK_NAME.en)`), read off its declaration
 *   and off the round name it is looked up from;
 * - a refusal a server action returns and the screen shows through `t()`
 *   (`t(r.error)`), read off the bodies of the actions these screens import,
 *   and one call further where the action passes on what it was told;
 * - and a constant another module exports, which is asked here by value.
 */
const ROOT = process.cwd();
const DIRS = ["app/(app)/course/lessons", "app/(app)/course/check", "components/course", "components/speech", "components/sounds"];
const ONE = ["components/TemplateNodes.tsx", "components/RuleNote.tsx", "components/Speak.tsx"];

function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((f) => {
    const path = `${dir}/${f}`;
    if (statSync(join(ROOT, path)).isDirectory()) return walk(path);
    return path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

const FILES = [...DIRS.flatMap(walk), ...ONE];

/** A string literal in either quote, its body in group 1 (double) or 2 (single). */
const STR = String.raw`(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)')`;
/** The text of a literal matched by `STR` at groups `at` and `at + 1`. */
function unquote(m: RegExpMatchArray, at: number): string {
  const double = m[at];
  if (double !== undefined) return JSON.parse(`"${double}"`) as string;
  const single = m[at + 1] ?? "";
  return JSON.parse(`"${single.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`) as string;
}

type Line = { english: string; context?: string; how: string };

/** The body of a declaration starting at `at`: to the line closing a block, or the end of the statement. */
function bodyAt(source: string, at: number): string {
  const block = source.indexOf("\n}", at);
  const semi = source.indexOf(";\n", at);
  const ends = [block, semi].filter((n) => n >= 0);
  return source.slice(at, ends.length ? Math.min(...ends) + 2 : at + 2000);
}

function literals(file: string): Line[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const out: Line[] = [];
  const patterns = [
    new RegExp(String.raw`\bt\(\s*${STR}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
    new RegExp(String.raw`\btr\(\s*\w+\s*,\s*${STR}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) out.push({ english: unquote(m, 1), context: m[3], how: m[1] === undefined ? "single" : "literal" });
  }
  // A ternary inside the call: every literal standing as a branch, after `?` or `:`.
  for (const m of source.matchAll(/\bt\(([^"'()][^()]*?\?[^()]*?)\)/g)) {
    for (const b of m[1]!.matchAll(new RegExp(String.raw`[?:]\s*${STR}`, "g"))) out.push({ english: unquote(b, 1), how: "ternary" });
  }
  // A table of English the screen reads through a helper or names in the call:
  // the string values of a `Record<…, string>` constant, or one named in `t(`.
  const tables = [
    ...[...source.matchAll(/\bt\(\s*([A-Z][A-Z_]+)\[/g)].map((m) => m[1]!),
    ...[...source.matchAll(/const ([A-Z][A-Z_]+): Record<\w+, string>/g)].map((m) => m[1]!),
  ];
  for (const name of new Set(tables)) {
    const at = source.search(new RegExp(String.raw`const ${name}\b[^=]*=\s*[{[]`));
    if (at < 0) continue;
    const body = source.slice(at, source.indexOf("\n};", at) >= 0 ? source.indexOf("\n};", at) : at + 2000);
    for (const v of body.matchAll(new RegExp(String.raw`:\s*${STR}`, "g"))) out.push({ english: unquote(v, 1), how: "table" });
  }
  // A helper the call goes through, `t(titleOf(s))`: its literal branches, and any table it names.
  for (const name of new Set([...source.matchAll(/\bt\(\s*([a-z]\w*)\(/g)].map((m) => m[1]!))) {
    const at = source.search(new RegExp(String.raw`(?:const ${name}\s*=|function ${name}\s*\()`));
    if (at < 0) continue;
    const body = bodyAt(source, at);
    for (const b of body.matchAll(new RegExp(String.raw`(?:[?:]|return)\s*${STR}`, "g"))) out.push({ english: unquote(b, 1), how: "helper" });
  }
  // A field of a constant, `t(WORKBOOK_NAME.en)`: the literal in its declaration, and the round name it looks up.
  for (const m of new Set([...source.matchAll(/\bt\(\s*([A-Z][A-Z_]+)\.(\w+)\s*\)/g)].map((x) => `${x[1]}.${x[2]}`))) {
    const [name, field] = m.split(".") as [string, string];
    const at = source.search(new RegExp(String.raw`const ${name}\b`));
    if (at < 0) continue;
    const body = bodyAt(source, at);
    for (const v of body.matchAll(new RegExp(String.raw`\b${field}:\s*${STR}`, "g"))) out.push({ english: unquote(v, 1), how: "field" });
    for (const r of body.matchAll(/nameOf\("([^"]+)"\)/g)) {
      const named = nameOf(r[1]!) as Record<string, string> | undefined;
      if (named?.[field]) out.push({ english: named[field]!, how: "field" });
    }
  }
  return out;
}

/** The refusals a server action these screens import returns, and those it passes on from the function it calls. */
function refusals(): Line[] {
  const actions = readFileSync(join(ROOT, "app/actions.ts"), "utf8");
  const imported = new Set(FILES.flatMap((file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    return [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/app\/actions"/g)].flatMap((m) => m[1]!.split(",").map((n) => n.trim()).filter(Boolean));
  }));
  const bodyOf = (source: string, name: string) => {
    const at = source.search(new RegExp(String.raw`export async function ${name}\(`));
    if (at < 0) return null;
    const next = source.indexOf("\nexport ", at + 1);
    return source.slice(at, next < 0 ? source.length : next);
  };
  const errorsIn = (body: string) => [...body.matchAll(new RegExp(String.raw`\berror:\s*${STR}`, "g"))].map((m) => unquote(m, 1));
  const out: Line[] = [];
  for (const name of imported) {
    const body = bodyOf(actions, name);
    if (!body) continue;
    for (const english of errorsIn(body)) out.push({ english, how: "refusal" });
    // One call further: `const result = await finishLessonFor(...)` passed on as `result.error`.
    for (const call of body.matchAll(/const (\w+) = await (\w+)\(/g)) {
      if (!new RegExp(String.raw`error:\s*${call[1]}\.error`).test(body)) continue;
      const from = new RegExp(String.raw`import\s*\{[^}]*\b${call[2]}\b[^}]*\}\s*from\s*"@\/([^"]+)"`).exec(actions)?.[1];
      const path = from ? [`${from}.ts`, `${from}.tsx`].find((p) => existsSync(join(ROOT, p))) : undefined;
      const inner = path ? bodyOf(readFileSync(join(ROOT, path), "utf8"), call[2]!) : null;
      if (inner) for (const english of errorsIn(inner)) out.push({ english, how: "refusal" });
    }
  }
  return out;
}

/** Lines another module exports and a lesson screen puts through `t()`. */
const EXPORTED: Line[] = [
  ...Object.values(NOTES), NOTE_ONE_WORD, NOTE_WITH_ON,
  ...Object.values(LEVEL_NEW).flatMap((n) => [n.lead, ...n.items.flatMap((i) => [i.what, i.why])]),
].map((english) => ({ english, how: "exported" }));

function untranslated(locale: "ru" | "uk", lines: readonly Line[]): string[] {
  return [...new Set(lines
    .filter(({ english, context }) => (context ? tr(locale, english, context) === english && !translated(locale, english) : !translated(locale, english)))
    .map(({ english, context }) => (context ? `${english}@${context}` : english)))];
}

const ALL = (): Line[] => [...FILES.flatMap(literals), ...refusals(), ...EXPORTED];

describe("the lesson screens in Russian and Ukrainian", () => {
  it("finds the lines it is asking about, by every reading", () => {
    expect(FILES.length).toBeGreaterThan(20);
    const all = ALL();
    expect(all.length).toBeGreaterThan(200);
    const by = (how: string) => all.filter((l) => l.how === how).map((l) => l.english);
    // Each wider reading finds something, or it has stopped matching.
    const runner = literals("app/(app)/course/lessons/[id]/LessonRunner.tsx");
    expect(runner.filter((l) => l.how === "table").map((l) => l.english)).toContain("Listen");
    expect(runner.some((l) => /card is waiting/.test(l.english))).toBe(true);
    expect(by("single")).toContain('Hear "{text}" in Estonian');
    expect(by("single")).toContain('Hear "{text}", {tag}, in Estonian');
    expect(by("helper")).toContain("Conversation");
    expect(by("field")).toContain("Workbook");
    expect(by("refusal")).toContain("Write something first.");
    expect(by("refusal")).toContain("That lesson isn't part of the course.");
  });

  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: translates every line the lesson screens hand the translator`, () => {
      expect(untranslated(locale, ALL()), `untranslated in ${locale}`).toEqual([]);
    });
  }

  it("names whoever speaks first in Russian and Ukrainian without a gender", () => {
    // Most of the people a role-play is with are women, and an ordinal beside the name has a gender.
    const line = "This is the whole conversation, with you in it. {who} speaks first and you answer as yourself, out loud or typed, one turn at a time. Each turn is added to the conversation, so by the end you've held all of it.";
    for (const locale of ["ru", "uk"] as const) {
      const said = tr(locale, line);
      expect(said).not.toBe(line);
      expect(said).not.toMatch(/Перв(?:ым|ой)|Перш(?:им|ою)/);
      expect(said).toContain("{who}");
    }
  });
});
