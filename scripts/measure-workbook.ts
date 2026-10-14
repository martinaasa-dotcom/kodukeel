/**
 * HOW FULL A WORKBOOK PAGE CAN BE, OVER THE SHIPPED DICTIONARY.
 *
 * `lib/games/workbook.ts` sets a page out of recorded sentences, so how many
 * lines a theme can offer is a fact about the dictionary rather than something
 * to reason about. This counts, per theme and per band, how many words could
 * carry a line, with every word's own sentences and the ones lent to it
 * (`lib/dict/borrow.ts`), which is what the round itself reads. No database,
 * no key. Run before changing the page sizes in `app/(app)/review/workbook`.
 *
 *   npm run measure:workbook -- --show B1 case:PARTITIVE
 *
 * prints the lines one band and one theme can set, the way the page draws
 * them, because a count says a page can be filled and only reading it says
 * whether it is a page anybody would want to fill. A rate is not a reading.
 */
import { borrowSentences } from "@/lib/dict/borrow";
import { usableExamples } from "@/lib/dict/examples";
import { linesFor, type Theme } from "@/lib/games/workbook";
import type { FlashWord } from "@/lib/games/flash";
import { dictionaryRows } from "./lib/dictionary";

const args = process.argv.slice(2);
const showAt = args.indexOf("--show");
const show = showAt >= 0 ? { band: args[showAt + 1] ?? "B1", theme: args[showAt + 2] ?? "mixed" } : null;
const shown: string[] = [];

const rows = dictionaryRows();
const keyOf = (r: { lemma: string; pos: string }) => `${r.lemma}|${r.pos}`;
const borrowed = borrowSentences(rows.map((r) => ({
  key: keyOf(r), lemma: r.lemma, pos: r.pos, forms: r.forms,
  examples: r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const })),
})));

const BANDS = ["A1", "A2", "B1", "B2", "C1"];
const byTheme = new Map<string, Map<string, Set<string>>>();
let lines = 0;
const started = Date.now();
for (const r of rows) {
  const band = r.cefr && BANDS.includes(r.cefr) ? r.cefr : null;
  if (!band) continue;
  const word: FlashWord = {
    lexemeId: keyOf(r), lemma: r.lemma, translation: r.translation, pos: r.pos,
    semanticTypes: r.semanticTypes, forms: r.forms,
    examples: [
      ...usableExamples(r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const }))),
      ...(borrowed.get(keyOf(r)) ?? []),
    ],
  };
  for (const line of linesFor(word)) {
    lines += 1;
    if (show && band === show.band && line.themes.includes(show.theme as Theme) && shown.length < 60) {
      shown.push(`${line.before}(${line.cue}) ____${line.after}   ->  ${line.answer}${line.sentenceEn ? `\n      ${line.sentenceEn}` : ""}`);
    }
    for (const theme of line.themes) {
      const bands = byTheme.get(theme) ?? new Map<string, Set<string>>();
      const words = bands.get(band) ?? new Set<string>();
      words.add(word.lexemeId);
      bands.set(band, words);
      byTheme.set(theme, bands);
    }
  }
}
console.log(`${lines} lines over ${rows.length} entries in ${Date.now() - started}ms\n`);
console.log("words that can carry a line, by theme and by the word's band (cumulative up to that band)");
console.log(["theme".padEnd(22), ...BANDS.map((b) => b.padStart(7))].join(""));
const ordered = [...byTheme.keys()].sort((a, b) => (a as Theme).localeCompare(b));
for (const theme of ordered) {
  const bands = byTheme.get(theme)!;
  let running = 0;
  const cells = BANDS.map((b) => { running += bands.get(b)?.size ?? 0; return String(running).padStart(7); });
  console.log([theme.padEnd(22), ...cells].join(""));
}

if (show) {
  console.log(`\n${shown.length} lines a ${show.band} page on ${show.theme} can be cut from (first 60):\n`);
  for (const line of shown) console.log(`  ${line}`);
}
