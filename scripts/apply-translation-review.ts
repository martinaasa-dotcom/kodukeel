#!/usr/bin/env tsx
/**
 * A FLUENT READER'S SHEET OF RUSSIAN OR UKRAINIAN LINES, APPLIED.
 *
 *   npm run apply:translation-review -- ru.csv            what it would do
 *   npm run apply:translation-review -- ru.csv --write    do it
 *
 * Reads a sheet `npx tsx scripts/export-translations.ts --csv` wrote, once a
 * fluent reader has filled it in:
 *
 *   ok          the line is recorded as confirmed in
 *               `docs/translations/confirmed.json`;
 *   correction  the translation is replaced in every area file holding that
 *               English (`lib/copy/i18n/areas/`, or the core tables), and
 *               recorded as confirmed, since the reader wrote it;
 *   (neither)   left alone.
 *
 * A row is refused, and printed, where the line is no longer in any area,
 * where its translation changed after the sheet was written (the verdict is
 * about a line nobody is shown), or where the correction drops a `{slot}`,
 * holds an Estonian letter or a long dash. After writing it runs
 * `npm run i18n:tables`, checks each correction reached the generated table,
 * and rewrites the confirmed count in `docs/34-interface-languages.md`.
 *
 * NOTHING HERE MARKS A LANGUAGE REVIEWED. That is `REVIEWED` in
 * `lib/copy/locale.ts`, set by hand in a commit that names the reader.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "@/lib/copy/i18n";
import { keyOf, lineKey } from "@/lib/copy/i18n/table";
import {
  confirmedCount, confirmedParagraph, decideTranslationSheet, readTranslationSheet, replaceTranslationIn,
  type Confirmed, type ReviewLocale, type TranslationDecision,
} from "@/lib/review/translationSheet";
import { parseCsv } from "./lib/csv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, "docs/translations/confirmed.json");
const DOC = path.join(ROOT, "docs/34-interface-languages.md");
const MARK_START = "<!-- confirmed-lines:start -->";
const MARK_END = "<!-- confirmed-lines:end -->";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const write = args.includes("--write");
if (!file) {
  console.error("Usage: npm run apply:translation-review -- ru.csv [--write]");
  process.exit(1);
}

const { rows, problem } = readTranslationSheet(parseCsv(readFileSync(file, "utf8")));
if (problem) {
  console.error(`${file}: ${problem}`);
  process.exit(1);
}

const current = (locale: ReviewLocale, key: string): string | undefined => {
  for (const [, area] of AREAS) if (Object.prototype.hasOwnProperty.call(area[locale], key)) return area[locale][key];
  return undefined;
};
const decisions = decideTranslationSheet(rows, current);

// Every file a translation can live in, and which language a flat one is.
const files: { file: string; locale: ReviewLocale | null }[] = [
  ...readdirSync(path.join(ROOT, "lib/copy/i18n/areas")).filter((f) => f.endsWith(".ts")).map((f) => ({ file: path.join(ROOT, "lib/copy/i18n/areas", f), locale: null })),
  { file: path.join(ROOT, "lib/copy/i18n/ru.ts"), locale: "ru" },
  { file: path.join(ROOT, "lib/copy/i18n/uk.ts"), locale: "uk" },
];
const sources = new Map(files.map((f) => [f.file, readFileSync(f.file, "utf8")]));

const refused: Extract<TranslationDecision, { kind: "refuse" }>[] = decisions.filter((d): d is Extract<TranslationDecision, { kind: "refuse" }> => d.kind === "refuse");
const applied: Exclude<TranslationDecision, { kind: "refuse" }>[] = [];
for (const d of decisions) {
  if (d.kind === "refuse") continue;
  if (d.kind === "confirm") {
    applied.push(d);
    continue;
  }
  let replaced = 0;
  const notes: string[] = [];
  for (const { file: f, locale } of files) {
    const out = replaceTranslationIn(sources.get(f)!, d.locale, d.row.key, d.text, locale);
    replaced += out.replaced;
    notes.push(...out.problems.map((p) => `${path.relative(ROOT, f)}: ${p}`));
    if (out.replaced > 0) sources.set(f, out.source);
  }
  if (replaced === 0) {
    refused.push({ kind: "refuse", row: d.row, reason: notes[0] ?? "no area file holds this line in a shape this can edit; change it by hand" });
    continue;
  }
  applied.push(d);
  console.log(`  ${d.locale} "${d.row.key}": "${d.row.translation}" becomes "${d.text}"${d.row.why ? ` (${d.row.why})` : ""}`);
}

const confirmed = applied.filter((d) => d.kind === "confirm").length;
const corrected = applied.filter((d) => d.kind === "correct").length;
console.log(`\n${confirmed} lines confirmed, ${corrected} corrected, ${refused.length} refused.`);
for (const r of refused) console.log(`  row ${r.row.row}, "${r.row.key}": ${r.reason}`);

if (!write) {
  console.log("\nNothing written. Add --write to apply it.");
  process.exit(refused.length > 0 ? 1 : 0);
}

for (const { file: f } of files) {
  const now = sources.get(f)!;
  if (now !== readFileSync(f, "utf8")) writeFileSync(f, now);
}
const store: Record<ReviewLocale, Record<string, string>> = existsSync(STORE)
  ? (JSON.parse(readFileSync(STORE, "utf8")) as Record<ReviewLocale, Record<string, string>>)
  : { ru: {}, uk: {} };
for (const d of applied) store[d.locale][lineKey(keyOf(d.row.key))] = d.text;
writeFileSync(STORE, JSON.stringify(store, null, 1) + "\n");

const tables = spawnSync("npm", ["run", "-s", "i18n:tables"], { cwd: ROOT, stdio: "inherit" });
if (tables.status !== 0) {
  console.error("npm run i18n:tables failed; the area files are written and the tables are not.");
  process.exit(1);
}
const generated = (locale: ReviewLocale) =>
  (JSON.parse(readFileSync(path.join(ROOT, `lib/copy/i18n/generated/${locale}.json`), "utf8")) as { lines: Record<string, string> }).lines;
const lines = { ru: generated("ru"), uk: generated("uk") };
const missed = applied.filter((d) => d.kind === "correct" && lines[d.locale][lineKey(keyOf(d.row.key))] !== d.text);
if (missed.length > 0) {
  console.error(`These corrections did not reach the generated table: ${missed.map((d) => d.row.key).join(", ")}`);
  process.exit(1);
}

const counts = {
  ru: { confirmed: confirmedCount(store as Confirmed, "ru", lines.ru), total: Object.keys(lines.ru).length },
  uk: { confirmed: confirmedCount(store as Confirmed, "uk", lines.uk), total: Object.keys(lines.uk).length },
};
const doc = readFileSync(DOC, "utf8");
const from = doc.indexOf(MARK_START);
const to = doc.indexOf(MARK_END);
if (from < 0 || to < from) {
  console.error(`${path.relative(ROOT, DOC)} has lost its confirmed-lines markers; the count was not written.`);
  process.exit(1);
}
writeFileSync(DOC, `${doc.slice(0, from + MARK_START.length)}\n${confirmedParagraph(counts)}\n${doc.slice(to)}`);
console.log(`\nWritten. Confirmed: Russian ${counts.ru.confirmed} of ${counts.ru.total}, Ukrainian ${counts.uk.confirmed} of ${counts.uk.total}.`);
process.exit(refused.length > 0 ? 1 : 0);
