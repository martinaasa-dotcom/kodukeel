/**
 * A SECOND MODEL READS EVERY NEW LESSON LINE, AND MAY ONLY FLAG ONE
 * (docs/43-lessons.md B-L7, docs/03-architecture.md ADR-005 amendment 6 narrowed).
 *
 *   npx tsx scripts/flag-lessons.ts --level B1 --budget 1
 *
 * Every Estonian line of a level's lessons (the conversations, the tables,
 * the prompts and models, the reworks and fixes, the stories, the model texts,
 * the role-plays) is put, a batch at a time, to the grader chain, asking which
 * lines a careful native speaker would query: a wrong case or ending, an odd
 * word order, a phrase nobody says, a register that does not fit. The model
 * never writes or rewrites a line: what comes back is the index of a line and
 * one sentence of English saying why, and nothing else is read from it. The
 * flags are printed as Markdown, ready for the native speaker's list in
 * `docs/44-language-reviews.md`, and `--out` writes them to a file.
 *
 * A fix's line with its slip in is left out on purpose: the slip is the point.
 * Metered like every harness here (`scripts/lib/meter.ts`): it buys nothing
 * without a budget, and says what it spent.
 */
import { writeFileSync } from "node:fs";
import { DEFAULT_BUDGET_USD, installMeter } from "./lib/meter";
import { resolveProviders } from "../lib/tutor/provider";
import { callChainForJson, firstJsonObject } from "../lib/tutor/grader";
import { LESSONS as COURSE } from "../lib/course/lessons";
import { PREVIEW_LESSONS } from "../lib/course/lessons/preview";
import { estonianOf } from "../lib/course/lessons/ledger";

const meter = installMeter({ replay: true });
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const level = arg("level") ?? "B1";
const part = arg("part");
const out = arg("out");
const budget = Number(arg("budget") ?? process.env.KODUKEEL_BUDGET_USD ?? DEFAULT_BUDGET_USD);
void budget;

const BATCH = 40;

interface Entry { lesson: string; where: string; et: string }

const SYSTEM = [
  "You are a careful native speaker of Estonian reviewing lines written for learners at CEFR level B1.",
  "For each numbered line, decide whether a native speaker would query it: a wrong case or ending,",
  "a verb form or agreement error, an unnatural word order, a phrase nobody says, a calque from English,",
  "or a register that does not fit (sina where teie is expected, or the reverse).",
  "Do not flag a line for being simple, and do not flag names. Do not rewrite anything.",
  'Reply with JSON only: {"flags":[{"i":<line number>,"why":"<one short sentence in English>"}]}.',
  'Reply {"flags":[]} when every line is fine.',
].join(" ");

async function main() {
  const lessons = [...COURSE, ...PREVIEW_LESSONS].filter((l) => l.level === level && (!part || l.part === part));
  const entries: Entry[] = [];
  const seen = new Set<string>();
  for (const lesson of lessons) {
    for (const e of estonianOf(lesson)) {
      if (e.where.includes("with the slip")) continue;
      // Estonian quoted inside an English sentence is a fragment the sentence around it explains, not a line.
      if (/(ask|point|note \d+|watch out|meaning|cue|English|genre|purpose|task|why|scene|head|question|option|asks for|stage)$/.test(e.where)) continue;
      if (e.et.split(/\s+/).length < 2) continue;
      const key = e.et.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ lesson: lesson.id, where: e.where, et: key });
    }
  }
  console.error(`${entries.length} distinct lines of ${level}${part ? ` (${part})` : ""} to read, in batches of ${BATCH}.`);
  // The scene chain, whose lead writes the best Estonian measured (CLAUDE.md, "a model per purpose"); the grader chain behind it.
  const chain = [...resolveProviders({ purpose: "scene" }), ...resolveProviders({ purpose: "grader" })];
  if (chain.length === 0) throw new Error("no grader model is configured (GEMINI_API_KEY or GROQ_API_KEY)");
  const flags: { entry: Entry; why: string }[] = [];
  let unread = 0;
  for (let at = 0; at < entries.length; at += BATCH) {
    const batch = entries.slice(at, at + BATCH);
    const user = batch.map((e, i) => `${i + 1}. ${e.et}`).join("\n");
    try {
      const { text } = await callChainForJson(chain, SYSTEM, user, 2_000);
      const parsed = firstJsonObject(text);
      const list = Array.isArray(parsed?.flags) ? parsed!.flags : [];
      for (const f of list as { i?: unknown; why?: unknown }[]) {
        const i = typeof f.i === "number" ? f.i - 1 : -1;
        const entry = batch[i];
        if (entry && typeof f.why === "string" && f.why.trim()) flags.push({ entry, why: f.why.trim() });
      }
    } catch (error) {
      unread += batch.length;
      console.error(`batch at ${at} was not read: ${(error as Error).message}`);
    }
  }
  const lines = [
    `Flagged by a second model on ${new Date().toISOString().slice(0, 10)}: ${flags.length} of ${entries.length} lines` +
      (unread > 0 ? ` (${unread} lines not read, so this pass is partial)` : "") + ".",
    "",
    "| Lesson | Where | Line | Why it was flagged |",
    "| --- | --- | --- | --- |",
    ...flags.map(({ entry, why }) => `| \`${entry.lesson}\` | ${entry.where} | ${entry.et.replace(/\|/g, "\\|")} | ${why.replace(/\|/g, "\\|")} |`),
  ];
  const text = lines.join("\n");
  if (out) writeFileSync(out, `${text}\n`);
  console.log(text);
  console.error(`Spent $${(meter.spentMicros / 1e6).toFixed(4)}${meter.refused > 0 ? `, ${meter.refused} calls refused at the budget` : ""}.`);
}

void main();
