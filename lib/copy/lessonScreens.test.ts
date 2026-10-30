import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translated, tr } from "./locale";
import { LEVEL_NEW } from "@/lib/course/lessons/levelNew";
import { NOTES, NOTE_ONE_WORD, NOTE_WITH_ON } from "@/lib/course/lessons/practice";

/**
 * THE LESSON SCREENS ARE TRANSLATED WHOLE, AND THIS IS WHAT SAYS SO.
 *
 * A line no table holds prints its English, which is the right fallback and
 * the reason a gap goes unseen: a Russian reader on a B1 rework got "Change
 * the sentence" over the question, and a screen reader in Russian heard "A
 * line, not shown yet" on every hidden line of the listening step, and every
 * check passed. So every literal the lesson screens, a part's check and the
 * microphone hand the translator is asked of both tables, read off the source
 * the way `publicPages.test.ts` reads the public pages.
 *
 * Three ways a line reaches `t()` without being written inside it, each of
 * which the first version missed: a ternary (`t(due === 1 ? "…" : "…")`), a
 * table named in the call (`t(STEP_TITLE[s])`), and a constant another module
 * exports, which is asked here by value.
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

function literals(file: string): { english: string; context?: string }[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const out: { english: string; context?: string }[] = [];
  const str = String.raw`"((?:[^"\\\n]|\\.)*)"`;
  const patterns = [
    new RegExp(String.raw`\bt\(\s*${str}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
    new RegExp(String.raw`\btr\(\s*\w+\s*,\s*${str}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) out.push({ english: JSON.parse(`"${m[1]}"`) as string, context: m[2] });
  }
  // A ternary inside the call: every literal standing as a branch, after `?` or `:`.
  for (const m of source.matchAll(/\bt\(([^"()][^()]*?\?[^()]*?)\)/g)) {
    for (const b of m[1]!.matchAll(new RegExp(String.raw`[?:]\s*${str}`, "g"))) out.push({ english: JSON.parse(`"${b[1]}"`) as string });
  }
  // A table of English the screen reads through a helper or names in the call:
  // the string values of a `Record<…, string>` constant, or one named in `t(`.
  const tables = [
    ...[...source.matchAll(/\bt\(\s*([A-Z][A-Z_]+)\b/g)].map((m) => m[1]!),
    ...[...source.matchAll(/const ([A-Z][A-Z_]+): Record<\w+, string>/g)].map((m) => m[1]!),
  ];
  for (const name of new Set(tables)) {
    const at = source.search(new RegExp(String.raw`const ${name}\b[^=]*=\s*[{[]`));
    if (at < 0) continue;
    const body = source.slice(at, source.indexOf("\n};", at) >= 0 ? source.indexOf("\n};", at) : at + 2000);
    for (const v of body.matchAll(new RegExp(String.raw`:\s*${str}`, "g"))) out.push({ english: JSON.parse(`"${v[1]}"`) as string });
  }
  return out;
}

/** Lines another module exports and a lesson screen puts through `t()`. */
const EXPORTED: { english: string }[] = [
  ...Object.values(NOTES), NOTE_ONE_WORD, NOTE_WITH_ON,
  ...Object.values(LEVEL_NEW).flatMap((n) => [n.lead, ...n.items.flatMap((i) => [i.what, i.why])]),
].map((english) => ({ english }));

function untranslated(locale: "ru" | "uk", lines: readonly { english: string; context?: string }[]): string[] {
  return [...new Set(lines
    .filter(({ english, context }) => (context ? tr(locale, english, context) === english && !translated(locale, english) : !translated(locale, english)))
    .map(({ english, context }) => (context ? `${english}@${context}` : english)))];
}

describe("the lesson screens in Russian and Ukrainian", () => {
  it("finds the lines it is asking about", () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES.flatMap(literals).length).toBeGreaterThan(200);
    // The two wider readings each find something, or they have stopped matching.
    const runner = literals("app/(app)/course/lessons/[id]/LessonRunner.tsx").map((l) => l.english);
    expect(runner).toContain("Listen");
    expect(runner.some((e) => /card is waiting/.test(e))).toBe(true);
  });

  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: translates every line the lesson screens hand the translator`, () => {
      expect(untranslated(locale, [...FILES.flatMap(literals), ...EXPORTED]), `untranslated in ${locale}`).toEqual([]);
    });
  }
});
