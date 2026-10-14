#!/usr/bin/env tsx
/**
 * A READ OF THE WORKBOOK LINES, APPLIED.
 *
 * `npm run reading:workbook -- --out sheet.csv` writes the lines nobody has
 * read, commonest first, with a `verdict` and a `why` column left empty. Once
 * somebody who reads Estonian has filled those in, this is the one command
 * that does what the last reading took an afternoon of hand edits to do:
 *
 *   keep      the line is written down as read (`prisma/data/workbook-read.json`)
 *             and leaves the next list;
 *   refuse    the sentence goes in `lib/dict/refused.ts` with the reason in the
 *             reader's own words, which takes it off every screen and every card
 *             at once; its English line leaves `prisma/data/example-english.json`,
 *             since a sentence nobody may read ships none; and it is written
 *             down as read;
 *   fix       written down as read and printed, because a fix is an edit
 *             somebody makes by hand: the Estonian is a lexicographer's and is
 *             never edited, and an English line is corrected where it lives;
 *   (empty)   not read yet, and left alone.
 *
 *   npm run apply:workbook-review -- sheet.csv            what it would do
 *   npm run apply:workbook-review -- sheet.csv --write    do it
 *   ... --accept-first-read    a row whose verdict is empty takes the
 *                              `first_read` column instead, for a reader who
 *                              went through a first read's suggestions and
 *                              deleted the ones they disagree with
 *
 * Reads the review sheet the last reading came in as too, which has the same
 * `sentence`, `verdict` and `why` columns. A refusal whose reason is under six
 * words is refused itself, since `lib/dict/refused.test.ts` holds every entry
 * to a reason rather than a shrug. After writing, run `npm run homographs` and
 * the unit suite: the refused sentences leave the corpus the homograph reading
 * is keyed on, and a grammar pin or a saying resting on one will say so.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REFUSED_SENTENCES, isRefusedSentence } from "@/lib/dict/refused";
import { authoredRows } from "@/lib/dict/authored";
import { parseCsv } from "./lib/csv";
import { dictionaryRows } from "./lib/dictionary";
import { fromSheet, lineKey, recordReadings, type ReadEntry } from "./lib/workbookRead";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFUSED_FILE = path.join(ROOT, "lib/dict/refused.ts");
const ENGLISH_FILE = path.join(ROOT, "prisma/data/example-english.json");
const ATTRIBUTION = "Refused on a read of the workbook lines, and accepted by the native speaker who develops this app.";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const write = args.includes("--write");
const acceptFirstRead = args.includes("--accept-first-read");
if (!file) {
  console.error("Usage: npm run apply:workbook-review -- sheet.csv [--write]");
  process.exit(1);
}

const [header, ...rows] = parseCsv(readFileSync(file, "utf8"));
const col = (name: string) => header?.indexOf(name) ?? -1;
for (const need of ["sentence", "verdict", "why"]) {
  if (col(need) < 0) {
    console.error(`${file} has no "${need}" column. Is it a sheet from npm run reading:workbook?`);
    process.exit(1);
  }
}

/*
  ONLY A SENTENCE THE DICTIONARY HOLDS, CHARACTER FOR CHARACTER. A refusal is
  matched on the exact spelling (`lib/dict/refused.ts` says why), so a sheet
  that came back with a dash turned into a comma would write a refusal for a
  sentence nobody is shown, and leave the real one on every page.
*/
const shipped = new Set<string>([
  ...dictionaryRows().flatMap((r) => r.examples.map((e) => e.et.trim())),
  ...authoredRows().map(([, et]) => et.trim()),
]);

const today = new Date().toISOString().slice(0, 10);
const readings: ReadEntry[] = [];
const refusals: { et: string; why: string }[] = [];
const fixes: string[] = [];
const problems: string[] = [];

for (const [i, row] of rows.entries()) {
  const firstRead = acceptFirstRead && col("first_read") >= 0 && !(row[col("verdict")] ?? "").trim();
  const verdict = (row[col(firstRead ? "first_read" : "verdict")] ?? "").trim().toLowerCase();
  if (!verdict) continue;
  const line = fromSheet(row[col("sentence")] ?? "");
  if (!line) {
    problems.push(`row ${i + 2}: the sentence has no [gap] in it`);
    continue;
  }
  if (verdict !== "keep" && verdict !== "refuse" && verdict !== "fix") {
    problems.push(`row ${i + 2}: "${verdict}" is not keep, refuse or fix`);
    continue;
  }
  readings.push({ key: lineKey(line.sentence, line.answer), verdict, on: today });
  const why = (row[col(firstRead ? "first_read_why" : "why")] ?? "").trim();
  if (verdict === "fix") fixes.push(`  ${row[col("sentence")]}: ${why || "(no note)"}`);
  if (verdict !== "refuse") continue;
  if (isRefusedSentence(line.sentence) || refusals.some((r) => r.et === line.sentence)) continue;
  if (!shipped.has(line.sentence.trim())) {
    problems.push(`row ${i + 2}: "${line.sentence}" is not a sentence the dictionary holds (was it edited on the way?)`);
    continue;
  }
  if (why.split(/\s+/).filter(Boolean).length < 6) {
    problems.push(`row ${i + 2}: refused with "${why}", which is not a reason yet (six words at least)`);
    continue;
  }
  const said = /[.!?]$/.test(why) ? why : `${why}.`;
  refusals.push({ et: line.sentence, why: `${said.charAt(0).toUpperCase()}${said.slice(1)} ${ATTRIBUTION}` });
}

const counts = { keep: 0, refuse: 0, fix: 0 };
for (const r of readings) counts[r.verdict] += 1;
console.log(`${readings.length} lines read: ${counts.keep} kept, ${counts.refuse} refused, ${counts.fix} to fix.`);
console.log(`${refusals.length} new refusals${REFUSED_SENTENCES.length ? `, beside the ${REFUSED_SENTENCES.length} there are` : ""}.`);
if (fixes.length) console.log(`\nTo fix by hand:\n${fixes.join("\n")}`);
if (problems.length) {
  console.log(`\nNot applied, and nothing is written until these are:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (!write) {
  console.log("\nNothing written. Run again with --write to apply it.");
  process.exit(0);
}

/* The refusals, appended to the list in its own shape, one entry each. */
if (refusals.length) {
  const source = readFileSync(REFUSED_FILE, "utf8");
  const end = source.indexOf("\n];", source.indexOf("export const REFUSED_SENTENCES"));
  if (end < 0) throw new Error("could not find the end of REFUSED_SENTENCES");
  const literal = (s: string) => JSON.stringify(s).replace(/[–—]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
  const entries = refusals.map((r) => `\n  {\n    et: ${literal(r.et)},\n    why: ${literal(r.why)},\n  },`).join("");
  writeFileSync(REFUSED_FILE, `${source.slice(0, end)}${entries}${source.slice(end)}`);

  /* And their English lines, with the file's own order and indent kept. */
  const english = JSON.parse(readFileSync(ENGLISH_FILE, "utf8")) as Record<string, string>;
  const gone = new Set(refusals.map((r) => r.et.trim()));
  let dropped = 0;
  for (const key of Object.keys(english)) if (gone.has(key.trim())) { delete english[key]; dropped += 1; }
  writeFileSync(ENGLISH_FILE, `${JSON.stringify(english, null, 2)}\n`);
  console.log(`${refusals.length} refusals written to lib/dict/refused.ts, ${dropped} English lines removed.`);
}
console.log(`${recordReadings(readings)} readings recorded in prisma/data/workbook-read.json.`);
if (refusals.length) console.log("\nNow run npm run homographs, then npm test: a pin or a saying resting on a refused sentence will say so.");
