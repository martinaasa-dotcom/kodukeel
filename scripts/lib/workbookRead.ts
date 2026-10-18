/**
 * WHICH WORKBOOK LINES A PERSON HAS READ.
 *
 * A line is a recorded sentence with one word taken out, and whether a native
 * speaker would set it as an exercise is the one judgment `lib/games/workbook.ts`
 * cannot make. Once somebody has read a line it is written down here, keep or
 * refuse, so `npm run reading:workbook` leaves it off the next list and can say
 * how much of what learners are dealt has been read. A refusal also goes in
 * `lib/dict/refused.ts`, which is what takes the sentence off every screen;
 * this file only remembers that the reading happened.
 *
 * Keyed on the sentence's digest and the answer, the gap being part of what
 * was read: the same sentence with a different word taken out is a different
 * line. Scripts only; nothing in the app reads it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sentenceKey } from "../../lib/dict/homographs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const READ_FILE = path.join(ROOT, "prisma/data/workbook-read.json");

export interface ReadEntry { key: string; verdict: "keep" | "refuse" | "fix"; on: string }
interface ReadFile { lines: ReadEntry[] }

/** The key a line is read under. */
export function lineKey(sentence: string, answer: string): string {
  return `${sentenceKey(sentence)}|${answer.trim().toLocaleLowerCase("et")}`;
}

export function readEntries(): ReadEntry[] {
  try {
    return (JSON.parse(readFileSync(READ_FILE, "utf8")) as ReadFile).lines;
  } catch {
    return [];
  }
}

export const READ: ReadonlySet<string> = new Set(readEntries().map((e) => e.key));

/** Adds readings, keeping the first verdict a line was given, one entry per line, sorted. */
export function recordReadings(entries: readonly ReadEntry[]): number {
  const held = new Map(readEntries().map((e) => [e.key, e]));
  let added = 0;
  for (const e of entries) {
    if (held.has(e.key)) continue;
    held.set(e.key, e);
    added += 1;
  }
  // By code unit rather than by locale, so the order is the same on every machine.
  const lines = [...held.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  writeFileSync(READ_FILE, `{"lines": [\n${lines.map((e) => `  ${JSON.stringify(e)}`).join(",\n")}\n]}\n`);
  return added;
}

/** A line as a sheet prints it, `before[answer]after`, split back into its sentence and answer. */
export function fromSheet(cell: string): { sentence: string; answer: string } | null {
  const m = /^(.*)\[([^\]]+)\](.*)$/s.exec(cell);
  if (!m) return null;
  return { sentence: `${m[1]}${m[2]}${m[3]}`, answer: m[2]! };
}
