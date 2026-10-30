/**
 * WHAT A NATIVE SPEAKER STILL HAS TO READ, AND WHAT THEY STILL HAVE TO SAY
 * INTO A MICROPHONE, IN ONE FILE.
 *
 *   npx tsx scripts/export-language-reviews.ts --since <git ref> [--out <file>]
 *
 * writes `docs/44-language-reviews.md` (or the file named): every Estonian
 * line in the lessons, their role-play scenes, the scenes' prepared lines and
 * the answers a learner may pick that is not in the source at the ref, lesson
 * by lesson, with a box to tick; then every line a man's part speaks, every
 * model answer and every taught word that no native recording says yet, which
 * is the list to record next. Nothing here judges a line: whether it is good
 * Estonian is the native speaker's to say (ADR-005 amendment 6), and the
 * Russian and Ukrainian are `scripts/export-translations.ts`.
 *
 * A line counts as new where its exact text, as a quoted string, appears in
 * no lesson or scene file at the ref. A line moved between files is not new;
 * a line with one letter changed is.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { LESSONS, LESSON_PARTS, type LessonSpec } from "@/lib/course/lessons";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { BANK } from "@/lib/scenes/bank";
import { PICKS } from "@/lib/scenes/picks/index";
import { nativeFor } from "@/lib/audio/native";

function arg(name: string): string | null {
  const at = process.argv.indexOf(name);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
}

const since = arg("--since");
if (!since) throw new Error("say which ref the review starts from: --since <git ref>");
const out = arg("--out") ?? "docs/44-language-reviews.md";

/** Every lesson and scene file as it stood at the ref, joined, to look a line up in. */
function sourceAt(ref: string): string {
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "lib/course/lessons", "lib/scenes"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => f.endsWith(".ts"));
  return files.map((f) => execFileSync("git", ["show", `${ref}:${f}`], { encoding: "utf8", maxBuffer: 64 << 20 })).join("\n");
}
const before = sourceAt(since);
/** New where the quoted line, or any braced piece of a sentence about it, is nowhere in the source at the ref. */
const isNew = (row: { et: string; braced?: readonly string[] }): boolean =>
  row.braced ? row.braced.some((b) => !before.includes(`{${b}}`)) : !before.includes(JSON.stringify(row.et));

/** A table cell Markdown reads as text and nothing else. */
const cell = (s: string): string => s.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");

/** The Estonian a line of English carries in braces, which the screen marks as Estonian. */
const braced = (en: string): string[] => [...en.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!);

interface Row { where: string; et: string; en: string; braced?: readonly string[] }

function rowsOf(lesson: LessonSpec): Row[] {
  const rows: Row[] = [];
  lesson.conversation.forEach((line) => {
    if (line.et) rows.push({ where: `Conversation, ${line.who}`, et: line.et, en: line.en ?? "" });
  });
  for (const t of lesson.teaches) {
    rows.push({ where: `Words (${t.kind})`, et: t.et, en: t.en });
    if (t.kind === "verb") rows.push({ where: "Words (verb, I form)", et: t.first, en: t.firstEn });
  }
  const how = lesson.how;
  for (const text of [how.point, ...(how.notes ?? []), how.watchOut]) {
    const bits = braced(text);
    if (bits.length) rows.push({ where: "How it works", et: bits.join(", "), en: text, braced: bits });
  }
  for (const row of how.table?.rows ?? []) {
    for (const c of row) if ("et" in c) rows.push({ where: "How it works, table", et: c.et, en: row.flatMap((x) => ("en" in x ? [x.en] : [])).join(", ") });
  }
  for (const p of lesson.answers) {
    if (p.ask) rows.push({ where: "Say it, question", et: p.ask.et, en: p.ask.en });
    rows.push({ where: "Say it, model answer", et: p.model.et, en: p.model.en });
  }
  for (const p of lesson.roleplay?.turns ?? []) {
    if (p.ask) rows.push({ where: "Role-play, they say", et: p.ask.et, en: p.ask.en });
    rows.push({ where: "Role-play, model answer", et: p.model.et, en: p.model.en });
  }
  const scene = sceneForLesson(lesson.id);
  if (scene) {
    for (const line of BANK.filter((l) => l.scene === scene.id)) {
      rows.push({ where: `Live scene, they say (${line.beat})`, et: line.text, en: "" });
    }
    for (const [beat, picks] of Object.entries(PICKS[scene.id] ?? {})) {
      for (const p of picks) rows.push({ where: `Live scene, learner may pick (${beat})`, et: p.et, en: p.en });
    }
  }
  // One row per text and place, so a word met twice in an evening is read once.
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.where}\u0000${r.et}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** What a man's voice in this lesson still has to record: the course's men, the learner's model answers, the words. */
const MEN = new Set(["Tom", "Jaan", "Peeter"]);
function toRecord(lesson: LessonSpec): Row[] {
  const rows: Row[] = [];
  for (const line of lesson.conversation) {
    if (line.et && MEN.has(line.who) && !nativeFor(line.et)) rows.push({ where: `Conversation, ${line.who}`, et: line.et, en: line.en ?? "" });
  }
  for (const p of [...lesson.answers, ...(lesson.roleplay?.turns ?? [])]) {
    if (!nativeFor(p.model.et)) rows.push({ where: "Model answer", et: p.model.et, en: p.model.en });
  }
  for (const t of lesson.teaches) {
    if (!nativeFor(t.et)) rows.push({ where: `Word (${t.kind})`, et: t.et, en: t.en });
  }
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.et) ? false : (seen.add(r.et), true)));
}

const title = (l: LessonSpec): string => `${l.level} ${l.n}${l.extra ?? ""}. ${l.title} (\`${l.id}\`)`;

const parts: string[] = [];
let n = 0;
const readSections: string[] = [];
const readCounts = new Map<string, number>();
for (const part of LESSON_PARTS) {
  const block: string[] = [];
  for (const lesson of LESSONS.filter((l) => l.part === part.id)) {
    const rows = rowsOf(lesson).filter(isNew);
    if (rows.length === 0) continue;
    readCounts.set(lesson.level, (readCounts.get(lesson.level) ?? 0) + rows.length);
    block.push(`#### ${title(lesson)}`, "", "| # | Where | Estonian | English | OK / fix |", "|---|---|---|---|---|");
    for (const r of rows) block.push(`| ${++n} | ${cell(r.where)} | ${cell(r.et)} | ${cell(r.en)} | |`);
    block.push("");
  }
  if (block.length) readSections.push(`### ${part.level}: ${part.title}`, "", ...block);
}
const readTotal = n;

let m = 0;
const recordSections: string[] = [];
const recordCounts = new Map<string, number>();
for (const lesson of LESSONS) {
  const rows = toRecord(lesson);
  if (rows.length === 0) continue;
  recordCounts.set(lesson.level, (recordCounts.get(lesson.level) ?? 0) + rows.length);
  recordSections.push(`#### ${title(lesson)}`, "", "| # | What | Estonian | English | Recorded |", "|---|---|---|---|---|");
  for (const r of rows) recordSections.push(`| R${++m} | ${cell(r.where)} | ${cell(r.et)} | ${cell(r.en)} | |`);
  recordSections.push("");
}

const counts = (map: Map<string, number>): string => [...map].map(([level, k]) => `${level} ${k}`).join(", ");

parts.push(
  "# Language reviews and recordings still needed",
  "",
  `Generated by \`npx tsx scripts/export-language-reviews.ts --since ${since}\`. Regenerate it after the next`,
  "batch of lessons lands rather than editing the tables by hand; the sections at the top are written by hand",
  "in the script and say what is waiting on a person.",
  "",
  "## What is waiting, and who does it",
  "",
  "1. **Estonian, read by the native speaker** (ADR-005 amendment 6). Every Estonian line the lessons and their",
  `   scenes added or changed since \`${since}\`: ${readTotal} lines${readTotal ? ` (${counts(readCounts)})` : ""}. Section 1 below. Mark`,
  "   each OK or write the fix; a fix goes into the lesson or scene file the lesson id names, and must still pass",
  "   `npm test` (every word taught before it is shown). For B1 the lines to read first, what each part's author",
  "   was unsure of and what a second model flagged, are in `docs/reviews/b1-flags.md`.",
  "2. **Recordings, by the native speaker.** The lessons are only partly recorded: the catalog in",
  "   `lib/audio/native.ts` reaches lessons 1 to 13 of A1, and a man's part plays the native voice only where every",
  `   line of it is recorded. Section 2 lists ${m} lines and words no recording says yet (${counts(recordCounts)}),`,
  "   men's parts, model answers and taught words. The known retakes are listed first in that section.",
  "3. **Russian and Ukrainian, read by fluent readers.** Both languages were machine translated, and every",
  "   line was read and corrected on 2026-10-25. A line written or changed after that is not:",
  "   `npx tsx scripts/export-translations.ts --unconfirmed --csv` lists those as a sheet, and",
  "   `npm run apply:translation-review` reads a filled one back. Every line the app holds is in",
  "   `docs/translations/ru.md` and `docs/translations/uk.md`.",
  "",
  "Reviews already done are kept, with their verdicts, in `docs/reviews/`: the A1 and A2 Estonian and both",
  "languages' A1 and A2 lines on 2026-10-25, and the same day every remaining written line in Estonian,",
  "Russian and Ukrainian.",
  "",
  "## 1. Estonian to read",
  "",
  ...(readTotal === 0 ? [`Nothing: every Estonian line in the lessons and their scenes at \`${since}\` has been read.`, ""] : readSections),
  "## 2. Recordings to make",
  "",
  "### The known retakes",
  "",
  "Each of these is a native recording whose text a native speaker would not say in that place, so the text was",
  "left alone. Record the line again with the text the native speaker settles on, change the lesson to match, and",
  "give the new take a new id in `lib/audio/native.ts`.",
  "",
  "- `a1-12-saying-no`: Tom answers `Ei, ma ei ela Tallinnas. Ma elan Tartus.` Everywhere else in the course Tom",
  "  lives in Tallinn. For instance, Jaan asks about Tartu and Tom answers `Ei, ma ei ela Tartus. Ma elan Tallinnas.`",
  "- `a1-10a-neighbours`: Jaan's `Jah. Aga minu õpetaja on pärit Lätist. Ta on lätlane.` The `Aga` contrasts",
  "  nothing. For instance `Jah, olen. Minu õpetaja on pärit Lätist. Ta on lätlane.`",
  "- `a1-11-languages`: Tom's `Ma räägin inglise keelt. Ja natuke eesti keelt!` repeats what he has just said a line",
  "  earlier. For instance `Mina räägin inglise keelt.`",
  "- `a1-12-saying-no`, the model answer `Ma ei räägi veel hästi eesti keelt.`: a native puts it `Ma ei räägi eesti",
  "  keelt veel hästi.`",
  "- `a1-10-from`: Tom's `Anna on pärit Ukrainast. Ta on ukrainlane.` says one fact twice; `Anna on pärit Ukrainast.`",
  "  is enough. Optional.",
  "- `a1-04-persons`: Tom says `Ma olen õpilane.`, and later lessons make him an adult with two children. Whether",
  "  `õpilane` is right for an adult on a language course, or `õppija` or a job fits better, is the native",
  "  speaker's call. Lesson 15's `Aga mul on laps!` (not recorded) also gives Tom one child where lesson 16 gives",
  "  him two.",
  "- The `a1-trepil` scene's pick `Ei, ma ei ole eestlane. Ma olen inglane.` reads as a textbook answer; in speech",
  "  `Ei, ma pole eestlane, olen inglane.`",
  "- `a1-09`: the sweep removed Tom's line `Mina elan ka siin!`, so its recording is no longer played anywhere.",
  "",
  "### Not recorded yet",
  "",
  "Conversation lines are listed only for the men's parts (Tom, Jaan, Peeter), since the recordings are one man's",
  "voice and he never plays a woman's part. Add a recorded line to `NATIVE_CLIPS`, raise `NATIVE_CUT`, and add",
  "Peeter to `NATIVE_PARTS` once his lines are in.",
  "",
  ...recordSections,
);

writeFileSync(out, parts.join("\n").replace(/\n{3,}/g, "\n\n"));
console.log(`${out}: ${readTotal} lines to read, ${m} to record`);
