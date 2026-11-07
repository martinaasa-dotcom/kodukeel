/**
 * Does TartuNLP say each number-endings sentence so that it is heard back as written?
 *
 *   npm run measure:endings                  the sample, two voices, cached
 *   npm run measure:endings -- --voices mari
 *
 * The number endings mode (`lib/games/numberEndings.ts`) reads its sentences
 * aloud, with the number written out in words (ADR-005 amendment 8), and the
 * operator asked for that to be checked by machine rather than by ear. So for
 * a sample of every job a sentence does, at the numbers most likely to go
 * wrong (the first, second and third inside bigger numbers, the teens, the
 * round tens, the hundreds, 2000 and the years after it), this asks:
 *
 *   1. what TartuNLP says for the sentence, sent as `/api/tts` sends it;
 *   2. what the app's own recognizer hears in that clip (`scripts/lib/readBack.ts`);
 *   3. whether the number's words were heard back in order, exactly as built.
 *
 * A sentence counts as clean where at least one voice was heard back with the
 * number intact, since the recognizer's own error rate on clean speech is not
 * nought (docs/41-fifth-batch.md measured it) and a single mishearing says
 * more about the ear than the mouth. What fails on every voice is printed and
 * written to the fixture named by `OUT` below, and
 * `numberEndings.test.ts` holds `SILENT_JOBS` to it: a job whose sentences
 * fail is not dealt as a heard sentence, and one that passes is not silenced.
 *
 * Needs the model (`npm run asr:fetch`) and the network for TartuNLP, which is
 * free; every clip is cached under `.speech-cache/endings/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ASR_MODEL } from "../lib/speech/model";
import { formFor, everyFrame, sentenceFor, type Job } from "../lib/games/numberEndings";
import { hear, recognizer, speak } from "./lib/readBack";

const CACHE = ".speech-cache/endings";
// Joined rather than written out: the file does not exist until the first run writes it.
const OUT = join("lib/games/fixtures", "number-endings-speech.json");

const arg = (name: string, fallback: string): string => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const VOICES = arg("voices", "mari,kalev").split(",");
const PAD = Number(arg("pad", "0.8"));

/** The numbers each job is sampled at, the tricky ones first. */
const SAMPLE: Record<Job, readonly number[]> = {
  age: [2, 3, 11, 17, 21, 32, 45, 68, 99],
  count: [2, 12, 21, 100, 101, 230, 512, 999],
  floor: [1, 2, 3, 11, 12, 17, 20, 21, 30],
  date: [1, 2, 3, 13, 17, 21, 22, 23, 30, 31],
  with: [2, 3, 7, 12, 17, 21, 33],
  minutes: [2, 5, 12, 15, 21, 30, 45, 59],
  decade: [20, 30, 50, 70, 90],
  "until-hour": [1, 2, 3, 7, 11, 12],
  "from-hour": [1, 2, 3, 8, 10, 12],
  "year-in": [1801, 1900, 1918, 1944, 1991, 1992, 2000, 2001, 2004, 2012, 2023, 2024],
  "year-since": [1900, 1991, 2000, 2011, 2022],
  "year-until": [1918, 1999, 2000, 2003, 2020],
  "year-by": [1940, 1992, 2000, 2010, 2025],
  "year-was": [1800, 1992, 2000, 2024],
};

const words = (text: string): string[] =>
  text.toLocaleLowerCase("et").split(/[^a-zõäöüšž0-9]+/).filter(Boolean);

/** Whether the number's words appear in what was heard, in order and side by side. */
function heardIntact(heard: string, number: string): boolean {
  const h = words(heard).join(" ");
  return ` ${h} `.includes(` ${words(number).join(" ")} `);
}

interface Row {
  readonly job: Job;
  readonly n: number;
  readonly sent: string;
  readonly number: string;
  readonly heard: Record<string, string>;
  readonly clean: boolean;
}

async function main(): Promise<void> {
  const asr = recognizer();
  const frames = everyFrame();
  const rows: Row[] = [];
  for (const [job, numbers] of Object.entries(SAMPLE) as [Job, readonly number[]][]) {
    // A date is sampled in May, the month the operator confirmed the reading of.
    const frame = job === "date" ? frames.find((f) => f.job === "date" && f.after.startsWith("mail"))! : frames.find((f) => f.job === job)!;
    for (const n of numbers) {
      const sent = sentenceFor(frame, n);
      const number = formFor(frame, n);
      const heard: Record<string, string> = {};
      for (const voice of VOICES) heard[voice] = hear(asr, await speak(sent, voice, CACHE), PAD);
      rows.push({ job, n, sent, number, heard, clean: Object.values(heard).some((h) => heardIntact(h, number)) });
    }
  }
  const byJob = new Map<Job, { clean: number; total: number }>();
  for (const row of rows) {
    const s = byJob.get(row.job) ?? { clean: 0, total: 0 };
    s.total += 1;
    if (row.clean) s.clean += 1;
    byJob.set(row.job, s);
  }
  for (const [job, s] of byJob) console.log(`${job.padEnd(12)} ${s.clean}/${s.total}`);
  for (const row of rows.filter((r) => !r.clean)) {
    console.log(`  ${row.job} ${row.n} [${row.sent}]: ${Object.entries(row.heard).map(([v, h]) => `${v} heard "${h}"`).join("; ")}`);
  }
  mkdirSync("lib/games/fixtures", { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    measured: new Date().toISOString().slice(0, 10),
    command: "npm run measure:endings",
    voices: VOICES,
    model: `${ASR_MODEL.repo}@${ASR_MODEL.revision}`,
    rows,
  }, null, 1) + "\n");
  console.log(`wrote ${OUT}: ${rows.length} sentences, ${rows.filter((r) => r.clean).length} heard back intact`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
