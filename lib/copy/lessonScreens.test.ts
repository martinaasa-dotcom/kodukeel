import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translated, tr } from "./locale";

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
 */
const ROOT = process.cwd();
const DIRS = ["app/(app)/course/lessons", "app/(app)/course/check", "components/course"];
const ONE = ["components/speech/MicButton.tsx", "components/TemplateNodes.tsx"];

function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((f) => {
    const path = `${dir}/${f}`;
    if (statSync(join(ROOT, path)).isDirectory()) return walk(path);
    return path.endsWith(".tsx") ? [path] : [];
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
  return out;
}

function untranslated(locale: "ru" | "uk", lines: readonly { english: string; context?: string }[]): string[] {
  return [...new Set(lines
    .filter(({ english, context }) => (context ? tr(locale, english, context) === english && !translated(locale, english) : !translated(locale, english)))
    .map(({ english, context }) => (context ? `${english}@${context}` : english)))];
}

describe("the lesson screens in Russian and Ukrainian", () => {
  it("finds the lines it is asking about", () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES.flatMap(literals).length).toBeGreaterThan(200);
  });

  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: translates every line the lesson screens hand the translator`, () => {
      expect(untranslated(locale, FILES.flatMap(literals)), `untranslated in ${locale}`).toEqual([]);
    });
  }
});
