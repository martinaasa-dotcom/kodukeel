#!/usr/bin/env tsx
/**
 * A FILLED PICK SHEET, APPLIED.
 *
 *   npm run apply:picks-review -- sheet.csv            says what it would change
 *   npm run apply:picks-review -- sheet.csv --write    changes it
 *
 * A row with a `correction` replaces its line, matched character for character
 * in the scene's file (or in the shared curveball answers), and nowhere else:
 * a spreadsheet that turned a quotation mark on the way is a correction to a
 * line nobody is shown, so it is printed and skipped. A row marked `ok`
 * changes nothing. Run `npx vitest run lib/scenes/picks.test.ts` after
 * writing: a correction holding a word the scene cannot vouch for, or one that
 * no longer meets its beat, fails there with the line named.
 *
 * No Estonian is written here; what reaches the file is what the reviewer
 * typed (ADR-005).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "./lib/csv";

const file = process.argv[2];
const write = process.argv.includes("--write");
if (!file) {
  console.error("Usage: npm run apply:picks-review -- sheet.csv [--write]");
  process.exit(1);
}
const [head, ...body] = parseCsv(readFileSync(file, "utf8"));
const col = (name: string) => head!.indexOf(name);
const [cScene, cBeat, cLine, cFix] = [col("scene"), col("beat"), col("line"), col("correction")];
const quote = (s: string) => JSON.stringify(s);
let changed = 0;
let refused = 0;
for (const row of body) {
  const fix = (row[cFix] ?? "").trim();
  if (!fix) continue;
  const scene = row[cScene]!;
  const line = row[cLine]!;
  const path = scene === "(every scene)" ? "lib/scenes/picks/curveballs.ts" : `lib/scenes/picks/${scene}.ts`;
  let text: string;
  try { text = readFileSync(path, "utf8"); } catch { console.log(`skip: no file for ${scene}`); refused++; continue; }
  const needle = `et: ${quote(line)}`;
  const count = text.split(needle).length - 1;
  if (count !== 1) {
    console.log(`skip: ${scene}/${row[cBeat]}: "${line}" found ${count} times, not once`);
    refused++;
    continue;
  }
  console.log(`${scene}/${row[cBeat]}: "${line}" -> "${fix}"`);
  if (write) writeFileSync(path, text.replace(needle, `et: ${quote(fix)}`));
  changed++;
}
console.log(`${changed} corrections ${write ? "written" : "would be written"}, ${refused} skipped.`);
