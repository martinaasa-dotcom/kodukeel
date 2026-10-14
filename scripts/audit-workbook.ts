/**
 * EVERY LINE A WORKBOOK PAGE CAN LEAD WITH, FOR A PERSON TO READ.
 *
 * `lib/games/workbook.ts` filters recorded sentences into lines: a whole
 * sentence, an English line, a finite verb, every word one the dictionary
 * knows and at most one above the learner's band, no other form of the word
 * beside its gap, and the plainest first. What no filter can say is whether a
 * native speaker would set the sentence as an exercise, and that is the one
 * judgement left. This prints the lines a learner at each band is dealt, the
 * way the page draws them, so somebody who reads Estonian can read them.
 *
 *   npm run audit:workbook                         every band, every theme, a dozen lines each
 *   npm run audit:workbook -- --band A2            one band
 *   npm run audit:workbook -- --band B1 --theme case:PARTITIVE --all
 *   npm run audit:workbook -- --out workbook.md    write it to a file instead
 *   npm run audit:workbook -- --json --out lines.json   the same lines as data, for a review sheet
 *
 * A sentence that does not work as a line goes in `lib/dict/refused.ts`, with
 * the reason in the words of whoever refused it, and is gone from every page
 * and every card at once. No database, no key: it reads the shipped dictionary.
 */
import { writeFileSync } from "node:fs";
import { authoredFor } from "@/lib/dict/authored";
import { borrowSentences } from "@/lib/dict/borrow";
import { usableExamples, type Example } from "@/lib/dict/examples";
import { plainReach } from "@/lib/dict/plainness";
import { OPEN, linesFor, type SheetItem } from "@/lib/games/workbook";
import { dictionaryRows } from "./lib/dictionary";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] ?? null : null;
};
const onlyBand = flag("--band");
const onlyTheme = flag("--theme");
const out = flag("--out");
const all = args.includes("--all");
const asJson = args.includes("--json");
const PER_THEME = all ? Infinity : 12;

const rows = dictionaryRows();
const keyOf = (r: { lemma: string; pos: string }) => `${r.lemma}|${r.pos}`;
const borrowed = borrowSentences(rows.map((r) => ({
  key: keyOf(r), lemma: r.lemma, pos: r.pos, forms: r.forms,
  examples: r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const })),
})));
const reach = plainReach(rows.map((r) => ({ lemma: r.lemma, pos: r.pos, cefr: r.cefr, forms: r.forms })));
const BANDS = ["A1", "A2", "B1", "B2", "C1"];

const lines: string[] = [];
const records: { band: string; theme: string; before: string; cue: string; answer: string; after: string; en: string | null; written: boolean }[] = [];
let printed = 0;
for (const band of BANDS) {
  if (onlyBand && band !== onlyBand) continue;
  const at = BANDS.indexOf(band);
  const byTheme = new Map<string, SheetItem[]>();
  for (const r of rows) {
    if (r.cefr !== band) continue;
    const recorded: Example[] = r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const }));
    const word = {
      lexemeId: keyOf(r), lemma: r.lemma, translation: r.translation, pos: r.pos,
      semanticTypes: r.semanticTypes, forms: r.forms,
      examples: [...(at <= 1 ? authoredFor(r.lemma) : []), ...usableExamples(recorded), ...(borrowed.get(keyOf(r)) ?? [])],
    };
    for (const line of linesFor(word, OPEN, new Set(), { reach, limit: at })) {
      const theme = line.themes.find((t) => t !== "mixed") ?? "mixed";
      if (onlyTheme && !line.themes.includes(onlyTheme as never)) continue;
      byTheme.set(theme, [...(byTheme.get(theme) ?? []), line]);
    }
  }
  lines.push(`# ${band}`, "");
  for (const [theme, items] of [...byTheme].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## ${band} ${theme} (${items.length} lines)`, "");
    for (const item of items.slice(0, PER_THEME)) {
      printed++;
      const written = word(item);
      records.push({ band, theme, before: item.before, cue: item.cue, answer: item.answer, after: item.after, en: item.sentenceEn, written: written !== "" });
      lines.push(`- ${item.before}(${item.cue}) ____${item.after}  ->  **${item.answer}**${written}`);
      if (item.sentenceEn) lines.push(`  ${item.sentenceEn}`);
    }
    lines.push("");
  }
}
function word(item: SheetItem): string {
  return authoredFor(item.cue).some((e) => e.et === item.sentence) ? "  (written for a beginner)" : "";
}

const text = asJson ? JSON.stringify(records) : lines.join("\n");
if (out) {
  writeFileSync(out, text);
  console.log(`${printed} lines written to ${out}`);
} else {
  console.log(text);
  console.log(`\n${printed} lines printed. A sentence that does not work as a line goes in lib/dict/refused.ts.`);
}
