#!/usr/bin/env tsx
/**
 * THE WORKBOOK LINES NOBODY HAS READ, IN THE ORDER LEARNERS WILL MEET THEM.
 *
 * `npm run audit:workbook` prints a dozen lines per theme per band, which is
 * what a first reading of the set needed and is not what a learner is dealt:
 * a page draws from the words around the learner's level at the learner's
 * own band (`LineQuality`), themes are tried in `themeOrder`'s order, and
 * every learner on the course meets the module's own evenings. So this deals
 * the pages instead, the way `app/(app)/review/workbook/page.tsx` and the
 * module deal them, a few hundred sittings a level, counts how often each
 * line came up, and lists the lines nobody has read yet with the commonest
 * first. A line read once is in `prisma/data/workbook-read.json` and leaves
 * the list; `npm run apply:workbook-review` is what puts it there.
 *
 *   npm run reading:workbook                       the list, as a sheet to fill in
 *   npm run reading:workbook -- --out sheet.csv    to a file (CSV, or .md for reading)
 *   npm run reading:workbook -- --stats            only the coverage and the page figures
 *   npm run reading:workbook -- --sittings 800     more sittings a level, for a steadier rank
 *
 * Deterministic: the sittings are seeded, so two runs over one dictionary rank
 * alike. No database, no key: it reads the shipped dictionary, like the audit.
 */
import { writeFileSync } from "node:fs";
import { authoredFor } from "@/lib/dict/authored";
import { borrowSentences } from "@/lib/dict/borrow";
import { usableExamples, type Example } from "@/lib/dict/examples";
import { plainReach, plainerFirst } from "@/lib/dict/plainness";
import { bandsAround } from "@/lib/collections/levels";
import { CASES } from "@/lib/estonian/cases";
import { readableSpellings } from "@/lib/estonian/gapForms";
import { PRONOUN_LEMMAS } from "@/lib/estonian/pronouns";
import type { Level } from "@/lib/collections/syllabus/index";
import type { FlashWord } from "@/lib/games/flash";
import {
  OPEN, canFill, composeSheet, linesFor, themeOrder, type ExercisePlan, type LineGates, type SheetItem, type Theme,
} from "@/lib/games/workbook";
import { PROGRAMMES } from "@/lib/course";
import { readableSentence } from "@/lib/course/build";
import { scopeFor, slotWithin, tonightsCase } from "@/lib/course/scope";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { dictionaryRows } from "./lib/dictionary";
import { READ, lineKey } from "./lib/workbookRead";
import { csvCell } from "./lib/csv";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] ?? null : null;
};
const out = flag("--out");
const statsOnly = args.includes("--stats");
const SITTINGS = Number(flag("--sittings") ?? 400);

/*
  THE PAGE'S OWN FIGURES, which this has to deal with rather than reason
  about. They are the ones in `app/(app)/review/workbook/page.tsx`; a test
  there is the honest place for them to be shared, and they move rarely.
*/
const FIRST: Record<string, number> = { A1: 6, A2: 8, B1: 10, B2: 10, C1: 10 };
const SECOND = 6;
const SITTING: Record<string, readonly ["write" | "choose" | "box", "write" | "choose" | "box"]> = {
  A1: ["choose", "write"], A2: ["write", "box"], B1: ["write", "box"], B2: ["write", "box"], C1: ["write", "box"],
};
const IN_MODULE: Record<string, number> = { A1: 6, A2: 6, B1: 8, B2: 8, C1: 8 };
const OWN_WORDS = 120;
const TOP_UP = 120;
const LEVELS: readonly Level[] = ["A1", "A2", "B1", "B2", "C1"];

const rows = dictionaryRows();
const keyOf = (r: { lemma: string; pos: string }) => `${r.lemma}|${r.pos}`;
const borrowed = borrowSentences(rows.map((r) => ({
  key: keyOf(r), lemma: r.lemma, pos: r.pos, forms: r.forms,
  examples: r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const })),
})));
const reach = plainReach(rows.map((r) => ({ lemma: r.lemma, pos: r.pos, cefr: r.cefr, forms: r.forms })));
const byLemma = new Map<string, typeof rows>();
for (const r of rows) byLemma.set(r.lemma, [...(byLemma.get(r.lemma) ?? []), r]);
const pronouns = rows.filter((r) => r.pos === "PRONOUN" && (PRONOUN_LEMMAS as readonly string[]).includes(r.lemma));

/** A row as the page hands it to `linesFor`, written sentences first for a beginner. */
function wordOf(r: (typeof rows)[number], beginner: boolean): FlashWord {
  const recorded: Example[] = r.examples.map((e) => ({ et: e.et, en: e.en, source: "EKILEX" as const }));
  return {
    lexemeId: keyOf(r), lemma: r.lemma, translation: r.translation, pos: r.pos,
    semanticTypes: r.semanticTypes, forms: r.forms,
    examples: [
      ...(beginner ? authoredFor(r.lemma) : []),
      ...usableExamples(recorded, plainerFirst(r.cefr, reach)),
      ...(borrowed.get(keyOf(r)) ?? []),
    ],
  };
}

/** Every line a word can be at a learner's band, built once per level and reused across sittings. */
const linesAt = new Map<string, SheetItem[]>();
function lines(r: (typeof rows)[number], level: Level): SheetItem[] {
  const key = `${level}|${keyOf(r)}`;
  const held = linesAt.get(key);
  if (held) return held;
  const at = LEVELS.indexOf(level);
  const noCases = level === "A1";
  const gates: LineGates = noCases
    ? { slotOk: (slot) => !CASES.some((c) => c.key === slot), sentenceOk: () => true, themeOk: () => true }
    : OPEN;
  const made = linesFor(wordOf(r, at <= 1), gates, new Set(), { reach, limit: at });
  linesAt.set(key, made);
  return made;
}

interface Tally {
  item: SheetItem;
  /** Sittings the line was dealt in, by where. */
  dealt: number;
  levels: Set<string>;
  module: boolean;
}
const tally = new Map<string, Tally>();
const count = (item: SheetItem, where: string, weight: number, module = false) => {
  const key = lineKey(item.sentence, item.answer);
  const held = tally.get(key) ?? { item, dealt: 0, levels: new Set<string>(), module: false };
  held.dealt += weight;
  held.levels.add(where);
  held.module ||= module;
  tally.set(key, held);
};

/*
  A SITTING WALKED TO FROM PRACTICE, AT EACH LEVEL. The learner's own words
  are a draw from the bands around their level, which is what a deck built on
  the course holds, and the top-up is another; their weakest cases are up to
  three cases drawn at random, which is the shape `caseAccuracy` hands the
  page. Nothing here knows a real learner, so this is a rank, not a forecast.
*/
interface PageStats { sittings: number; first: number[]; second: number[]; chars: number[]; empty: number; themes: Map<string, number>; short: Map<string, number> }
const pageStats = new Map<string, PageStats>();
const caseKeys = CASES.filter((c) => !c.principal || c.key === "PARTITIVE" || c.key === "GENITIVE").map((c) => c.key);

for (const level of LEVELS) {
  const pool = rows.filter((r) => r.cefr && bandsAround(level).includes(r.cefr) && ["NOUN", "ADJECTIVE", "VERB"].includes(r.pos));
  const stats: PageStats = { sittings: 0, first: [], second: [], chars: [], empty: 0, themes: new Map(), short: new Map() };
  for (let s = 0; s < SITTINGS; s++) {
    const random = rng(seedFrom(`${level}|${s}`));
    const deck = shuffle(pool, random);
    const drawn = deck.slice(0, OWN_WORDS + TOP_UP);
    const items = [...drawn, ...pronouns].flatMap((r) => lines(r, level));
    const weakest = level === "A1" ? [] : shuffle(caseKeys, random).slice(0, Math.floor(random() * 4));
    // The page's turn is the learner's day and the round; a sitting here stands for one of each.
    const [firstKind, secondKind] = SITTING[level]!;
    const plans: ExercisePlan[] = [{ lines: FIRST[level]!, kind: firstKind }, { lines: SECOND, kind: secondKind }];
    const { themes: prefer, urgent } = themeOrder({
      weakest,
      themeOk: (t: Theme) => !(level === "A1" && (t.startsWith("case:") || t === "pronouns")),
      turn: s,
      fills: (t) => canFill(items, t, plans[0]!.lines, plans[0]!.kind),
    });
    const order = shuffle(items, random);
    let sheet = composeSheet(order, prefer, plans, urgent);
    // The page's widening for a short lead theme: the rest of the top-up, a chunk at a time.
    const lead = prefer.slice(0, urgent)[0];
    const leadShort = () => sheet.exercises[0]?.theme !== lead || (sheet.exercises[0]?.lines.length ?? 0) < plans[0]!.lines;
    for (let at = OWN_WORDS + TOP_UP; lead && leadShort() && at < Math.min(deck.length, OWN_WORDS + 600); at += 120) {
      order.push(...deck.slice(at, at + 120).flatMap((r) => lines(r, level)).filter((i) => i.themes.includes(lead)));
      sheet = composeSheet(order, prefer, plans, urgent);
    }
    stats.sittings += 1;
    if (sheet.exercises.length === 0) stats.empty += 1;
    let chars = 0;
    sheet.exercises.forEach((exercise, i) => {
      (i === 0 ? stats.first : stats.second).push(exercise.lines.length);
      if (exercise.lines.length < plans[i]!.lines) stats.short.set(exercise.theme, (stats.short.get(exercise.theme) ?? 0) + 1);
      stats.themes.set(exercise.theme, (stats.themes.get(exercise.theme) ?? 0) + 1);
      for (const line of [exercise.example, ...exercise.lines]) {
        if (!line) continue;
        chars += line.sentence.length;
        count(line, level, 1);
      }
    });
    if (sheet.exercises.length < 2) stats.second.push(0);
    stats.chars.push(chars);
  }
  pageStats.set(level, stats);
}

/*
  EVERY EVENING OF THE MODULE, which every learner on the course meets, so a
  module line counts as many times as a sitting does: a line on an evening is
  a line everybody walking the course reads. Walked with the scope the app
  builds for that evening, as `npm run measure:workbook` walks it.
*/
for (const programme of PROGRAMMES) {
  for (const day of programme.days.filter((d) => d.practice.includes("workbook"))) {
    const scope = scopeFor(programme, day);
    const spellings = new Set<string>();
    for (const lemma of scope.lemmas) for (const r of byLemma.get(lemma) ?? []) for (const w of readableSpellings(r)) spellings.add(w);
    const gates: LineGates = {
      slotOk: (slot, lemma) => slotWithin(scope, slot, lemma),
      sentenceOk: (s) => readableSentence(s, spellings),
      themeOk: () => true,
    };
    const at = Math.max(0, LEVELS.indexOf(programme.level as Level));
    const items: SheetItem[] = [];
    for (const lemma of scope.lemmas) {
      for (const r of byLemma.get(lemma) ?? []) items.push(...linesFor(wordOf(r, at <= 1), gates, new Set(), { reach, limit: at }));
    }
    const plan = { lines: IN_MODULE[programme.level] ?? 8, kind: "write" as const };
    const order = themeOrder({ tonight: tonightsCase(scope), fills: (t) => canFill(items, t, plan.lines, plan.kind) });
    const sheet = composeSheet(items, order.themes, [plan], order.urgent);
    for (const exercise of sheet.exercises) {
      for (const line of [exercise.example, ...exercise.lines]) if (line) count(line, `module ${programme.id}`, SITTINGS, true);
    }
  }
}

/* -------------------------------------------------------------------------- */

/*
  TWO KINDS OF LINE, KEPT APART. A module line is on an evening every learner
  walking the course reaches, so all of them are worth reading whatever their
  count; a line from Practice is met as often as the sittings above dealt it.
  The module's come first in the sheet and the rest by how often they came up.
*/
const all = [...tally.entries()].sort((a, b) => Number(b[1].module) - Number(a[1].module) || b[1].dealt - a[1].dealt || a[0].localeCompare(b[0]));
const practice = all.filter(([, t]) => !t.module);
const moduleLines = all.filter(([, t]) => t.module);
const practiceDeals = practice.reduce((n, [, t]) => n + t.dealt, 0);
const readDeals = practice.filter(([k]) => READ.has(k)).reduce((n, [, t]) => n + t.dealt, 0);
const unread = all.filter(([k]) => !READ.has(k));
const unreadPractice = practice.filter(([k]) => !READ.has(k));

const report: string[] = [];
report.push(`${moduleLines.length} lines on the module's evenings, ${moduleLines.filter(([k]) => READ.has(k)).length} of them read.`);
report.push(`${practice.length} more lines dealt over ${SITTINGS} sittings a level from Practice; read: ${practice.length - unreadPractice.length}, ${pct(readDeals, practiceDeals)} of what those sittings dealt.`);
const cover = (n: number) => pct(unreadPractice.slice(0, n).reduce((s, [, t]) => s + t.dealt, 0) + readDeals, practiceDeals);
report.push(`Reading the next 200 of those would bring that to ${cover(200)}, the next 500 to ${cover(500)}, the next 1000 to ${cover(1000)}.`);
report.push("");
report.push("A sitting from Practice, by level: lines in the first and second exercise (plan in brackets), words on the page, empty pages");
for (const level of LEVELS) {
  const s = pageStats.get(level)!;
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const short = s.first.filter((n) => n < FIRST[level]!).length;
  const top = [...s.themes].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `${t} ${pct(n, s.sittings)}`).join(", ");
  report.push(
    `  ${level}  first ${mean(s.first).toFixed(1)} (${FIRST[level]}), short ${pct(short, s.sittings)}; ` +
    `second ${mean(s.second).toFixed(1)} (${SECOND}); ${Math.round(mean(s.chars) / 6)} words; empty ${s.empty}. ` +
    `Themes: ${top}`,
  );
  const shortOn = [...s.short].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => `${t} ${n}`).join(", ");
  if (shortOn) report.push(`      short on: ${shortOn}`);
}
console.log(report.join("\n"));

if (!statsOnly) {
  const sheet = unread.map(([key, t], i) => ({
    n: i + 1,
    id: key,
    share: t.module ? 100 : (t.dealt / practiceDeals) * 100,
    where: [...t.levels].sort().join(" "),
    theme: t.item.themes.find((th) => th !== "mixed") ?? "mixed",
    sentence: `${t.item.before}[${t.item.answer}]${t.item.after}`,
    cue: t.item.cue,
    english: t.item.sentenceEn ?? "",
    written: authoredFor(t.item.cue).some((e) => e.et === t.item.sentence),
  }));
  let text: string;
  if (out?.endsWith(".md")) {
    text = [
      "# Workbook lines to read", "",
      report.join("\n\n"), "",
      "Each line as the page sets it, the answer in square brackets, the word in the bracket after it.", "",
      ...sheet.map((r) => `${r.n}. ${r.sentence} (${r.cue}) *${r.english}*  \n   ${r.where}, ${r.theme}${r.written ? ", written for a beginner" : ""}`),
    ].join("\n");
  } else {
    const header = ["n", "id", "share", "where", "theme", "sentence", "cue", "english", "written", "verdict", "why"];
    text = [header.join(","), ...sheet.map((r) => [
      r.n, r.id, r.share.toFixed(3), r.where, r.theme, r.sentence, r.cue, r.english, r.written ? "yes" : "", "", "",
    ].map(csvCell).join(","))].join("\n");
  }
  if (out) {
    writeFileSync(out, `﻿${text}\n`);
    console.log(`\n${sheet.length} unread lines written to ${out}. Fill in verdict (keep, refuse) and why, then`);
    console.log(`npm run apply:workbook-review -- ${out}`);
  } else {
    console.log(`\n${text}`);
  }
}

function pct(n: number, of: number): string {
  return of ? `${Math.round((100 * n) / of)}%` : "0%";
}
