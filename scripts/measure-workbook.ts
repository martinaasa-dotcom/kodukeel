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
import { authoredFor } from "@/lib/dict/authored";
import { usableExamples, type Example } from "@/lib/dict/examples";
import { plainReach } from "@/lib/dict/plainness";
import { readableSpellings } from "@/lib/estonian/gapForms";
import {
  MIN_LINES, OPEN, canFill, composeSheet, linesFor, themeOrder, type LineGates, type SheetItem, type Theme,
} from "@/lib/games/workbook";
import type { FlashWord } from "@/lib/games/flash";
import { PROGRAMMES } from "@/lib/course";
import { readableSentence } from "@/lib/course/build";
import { scopeFor, slotWithin, tonightsCase } from "@/lib/course/scope";
import { worksheetFor } from "@/lib/course/lessonWorksheet";
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
const reach = plainReach(rows.map((r) => ({ lemma: r.lemma, pos: r.pos, cefr: r.cefr, forms: r.forms })));

const BANDS = ["A1", "A2", "B1", "B2", "C1"];
const byLemma = new Map<string, typeof rows>();
for (const r of rows) byLemma.set(r.lemma, [...(byLemma.get(r.lemma) ?? []), r]);

/** A dictionary row as the page hands a word to `linesFor`, written sentences first for a beginner. */
function wordOf(r: (typeof rows)[number], authored: boolean): FlashWord {
  const recorded: Example[] = r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const }));
  return {
    lexemeId: keyOf(r), lemma: r.lemma, translation: r.translation, pos: r.pos,
    semanticTypes: r.semanticTypes, forms: r.forms,
    examples: [...(authored ? authoredFor(r.lemma, "SEED") : []), ...usableExamples(recorded), ...(borrowed.get(keyOf(r)) ?? [])],
  };
}

/*
  THE WHOLE DICTIONARY, BAND BY BAND: how many words could carry a line on
  each theme, as a learner at that band is handed them (`LineQuality` at the
  band, and written sentences for A1 and A2).
*/
const byTheme = new Map<string, Map<string, Set<string>>>();
let lines = 0;
const started = Date.now();
for (const r of rows) {
  const band = r.cefr && BANDS.includes(r.cefr) ? r.cefr : null;
  if (!band) continue;
  const at = BANDS.indexOf(band);
  for (const line of linesFor(wordOf(r, at <= 1), OPEN, new Set(), { reach, limit: at })) {
    lines += 1;
    if (show && band === show.band && line.themes.includes(show.theme as Theme) && shown.length < 60) {
      shown.push(`${line.before}(${line.cue}) ____${line.after}   ->  ${line.answer}${line.sentenceEn ? `\n      ${line.sentenceEn}` : ""}`);
    }
    for (const theme of line.themes) {
      const bands = byTheme.get(theme) ?? new Map<string, Set<string>>();
      const words = bands.get(band) ?? new Set<string>();
      words.add(word(line));
      bands.set(band, words);
      byTheme.set(theme, bands);
    }
  }
}
function word(line: SheetItem): string { return line.lexemeId; }

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

/*
  WHETHER A BEGINNER CAN READ THE LINE. A1 and A2 words, the first line each
  can carry (the one a page leads with), and whether every word of its sentence
  is one the dictionary places at the word's own band or below. Measured with
  and without the written sentences, since a page a beginner cannot read is
  the fault they were added for.
*/
console.log("\nA1 and A2 words: lines whose every word is at the word's band or easier, written sentences off -> on");
for (const band of ["A1", "A2"]) {
  const at = BANDS.indexOf(band);
  const tally = { off: [0, 0], on: [0, 0] };
  for (const r of rows) {
    if (r.cefr !== band) continue;
    for (const authored of [false, true] as const) {
      const first = linesFor(wordOf(r, authored), OPEN, new Set(), { reach, limit: at })[0];
      if (!first) continue;
      const t = tally[authored ? "on" : "off"];
      t[1] = (t[1] ?? 0) + 1;
      const words = first.sentence.toLocaleLowerCase("et").split(/[^\p{L}\p{M}]+/u).filter(Boolean);
      if (words.every((w) => (reach.bandOf.get(w) ?? 99) <= at)) t[0] = (t[0] ?? 0) + 1;
    }
  }
  const pct = (t: number[]) => `${t[0]} of ${t[1]} (${t[1] ? Math.round((100 * t[0]!) / t[1]!) : 0}%)`;
  console.log(`  ${band}  ${pct(tally.off)} -> ${pct(tally.on)}`);
}

/*
  THE MODULE'S OWN EVENINGS, which is where a beginner meets the page. Every
  evening that deals the workbook, walked with the scope the app builds for it
  (`scopeFor`): the words taught so far, a sentence made only of taught
  spellings (`readableSentence`), and a slot only once its page has been read
  (`slotWithin`). The page there is one written exercise of `IN_MODULE` lines;
  this counts how many lines it actually gets, with and without the written
  sentences, because a count over the whole dictionary says nothing about
  whether a learner three weeks in can be set a page.
*/
const IN_MODULE: Record<string, number> = { A1: 6, A2: 6, B1: 8, B2: 8, C1: 8 };
console.log("\nthe module's evenings that deal the workbook: lines on the page, written sentences off -> on");
for (const programme of PROGRAMMES) {
  const days = programme.days.filter((d) => d.practice.includes("workbook"));
  if (days.length === 0) continue;
  const tallies = { off: [] as number[], on: [] as number[] };
  for (const day of days) {
    const scope = scopeFor(programme, day);
    const spellings = new Set<string>();
    for (const lemma of scope.lemmas) for (const r of byLemma.get(lemma) ?? []) for (const w of readableSpellings(r)) spellings.add(w);
    const gates: LineGates = {
      slotOk: (slot, lemma) => slotWithin(scope, slot, lemma),
      sentenceOk: (s) => readableSentence(s, spellings),
      themeOk: () => true,
    };
    const at = Math.max(0, BANDS.indexOf(programme.level));
    for (const authored of [false, true] as const) {
      const items: SheetItem[] = [];
      for (const lemma of scope.lemmas) {
        for (const r of byLemma.get(lemma) ?? []) {
          items.push(...linesFor(wordOf(r, authored && at <= 1), gates, new Set(), { reach, limit: at }));
        }
      }
      const plan = { lines: IN_MODULE[programme.level] ?? 8, kind: "write" as const };
      const order = themeOrder({ tonight: tonightsCase(scope), fills: (t) => canFill(items, t, plan.lines, plan.kind) });
      const sheet = composeSheet(items, order.themes, [plan], order.urgent);
      tallies[authored ? "on" : "off"].push(sheet.exercises[0]?.lines.length ?? 0);
    }
  }
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const full = (xs: number[]) => xs.filter((n) => n >= MIN_LINES).length;
  console.log(
    `  ${programme.id.padEnd(6)} ${String(days.length).padStart(3)} evenings  ` +
    `pages set ${full(tallies.off)} -> ${full(tallies.on)}  ` +
    `lines ${sum(tallies.off)} -> ${sum(tallies.on)}  ` +
    `(${(sum(tallies.on) / days.length).toFixed(1)} a page)`,
  );
}

if (show) {
  console.log(`\n${shown.length} lines a ${show.band} page on ${show.theme} can be cut from (first 60):\n`);
  for (const line of shown) console.log(`  ${line}`);
}

/*
  THE PAGE A FINISHED B1 LESSON OFFERS (`lib/course/lessonWorksheet.ts`). The
  worksheet a lesson's finish screen opens is the page walked to from Practice:
  two exercises, ten lines written and six from a word box, held to what the
  lessons have taught through that evening and led by the lesson's own theme
  where it has one. This counts, lesson by lesson, how many lines each
  exercise gets and which theme leads, since a card offering a page that comes
  back short is a card offering nothing.
*/
console.log("\nB1 lessons: the page each finish screen offers, lines written + lines from the box");
const FIRST_B1 = 10;
const SECOND = 6;
const short: string[] = [];
let offered = 0;
for (const programme of PROGRAMMES) {
  for (const day of programme.days) {
    if (!day.lesson) continue;
    const offer = worksheetFor(day);
    if (!offer) continue;
    offered += 1;
    const scope = scopeFor(programme, day);
    const spellings = new Set<string>();
    for (const lemma of scope.lemmas) for (const r of byLemma.get(lemma) ?? []) for (const w of readableSpellings(r)) spellings.add(w);
    const gates: LineGates = {
      slotOk: (slot, lemma) => slotWithin(scope, slot, lemma),
      sentenceOk: (s) => readableSentence(s, spellings),
      themeOk: () => true,
    };
    const at = Math.max(0, BANDS.indexOf(programme.level));
    const items: SheetItem[] = [];
    for (const lemma of scope.lemmas) for (const r of byLemma.get(lemma) ?? []) items.push(...linesFor(wordOf(r, false), gates, new Set(), { reach, limit: at }));
    const plans = [{ lines: FIRST_B1, kind: "write" as const }, { lines: SECOND, kind: "box" as const }];
    const requested = (offer.theme as Theme | null) ?? null;
    const order = themeOrder({ requested, tonight: tonightsCase(scope), fills: (t) => canFill(items, t, plans[0]!.lines, plans[0]!.kind) });
    const sheet = composeSheet(items, order.themes, plans, order.urgent);
    const [first, second] = sheet.exercises;
    const line = `  ${day.lesson.padEnd(22)} ${(requested ?? "(page chooses)").padEnd(16)} ` +
      `${String(first?.theme ?? "none").padEnd(16)} ${String(first?.lines.length ?? 0).padStart(2)} + ${String(second?.lines.length ?? 0).padStart(2)}`;
    console.log(line);
    if ((first?.lines.length ?? 0) < MIN_LINES) short.push(day.lesson);
  }
}
console.log(`  ${offered} lessons offer a page; ${short.length} would come back with fewer than ${MIN_LINES} lines${short.length ? `: ${short.join(", ")}` : ""}`);
