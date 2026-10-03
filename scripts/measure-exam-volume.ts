/**
 * How many distinct, well-filled mock exam papers can this dictionary
 * actually support per level, with zero content changes?
 *
 * A paper is assembled fresh from (level, seed, pool) rather than drawn from a
 * bank of pre-written exams (see lib/exam/paper.ts's own header), so "how many
 * exams do you have" has no fixed answer the way a claim of a stated count
 * does. It is however many seeds produce a paper the dictionary can fill
 * without a shortfall, and how much of one paper the next already asked, which
 * is a question worth measuring rather than assuming. Re-run it before
 * repeating a figure from it anywhere, the way `eval:scene` asks to be re-run
 * before its own numbers are quoted: the dictionary grows and a claim about it
 * should be re-measured rather than remembered.
 *
 * NOT "DUPLICATE PAPERS". The first version counted papers identical item for
 * item, which is the extreme and never happens: two papers sharing four fifths
 * of their words are a repeat to the person sitting the second, and that count
 * read nought for them. What is printed instead is the share of a paper's
 * words the closest earlier paper already asked about.
 *
 * No database: reads the shipped dictionary through scripts/lib/dictionary.ts,
 * exactly as audit-questions.ts does.
 */
import { dictionaryRows } from "./lib/dictionary";
import { fillRate } from "../lib/exam/paper";
import { assemblePaper } from "../lib/exam/assemble";
import { numberedSeed, PAPERS_PER_LEVEL } from "../lib/exam/seed";
import { POOL_SIZE, eligibleFor } from "../lib/exam/pool";
import { shippedPool } from "./lib/examPool";
import { orderContextFrom } from "../lib/estonian/wordOrder";
import { EXAM_LEVELS } from "../lib/exam/spec";

/*
  THE POOL IS DRAWN THE WAY THE APP DRAWS IT, OR THIS MEASURES A DIFFERENT PAPER.

  The first version handed `buildPaper` the whole dictionary at every level, so
  an A1 paper was built out of C1 words and every level read full. The app
  filters to the level, shuffles on the paper's seed, keeps `POOL_SIZE`, and
  then fetches the course words the paper's written and spoken tasks are about
  (`lib/progress/exam.ts`). `shippedPool` is that draw over the shipped file,
  shared with the unit tests, so the measurement and the suites cannot draw it
  two ways. The one difference left is the order the draw starts from: the app
  shuffles database ids and this shuffles (lemma, pos), so the seed picks a
  different five hundred, from the same set, by the same rule. Fill rates are
  comparable; a single seed's paper is not.
*/
const entries = dictionaryRows();
const WORD_ORDER = orderContextFrom(entries);

/*
  THE NUMBERED SET IS WHAT A LEARNER IS OFFERED, SO `--numbered` MEASURES THAT.

  `PAPERS_PER_LEVEL` papers per level, drawn exactly as `/exam/[level]/papers`
  draws them: on the number, through the stable pool. Without the flag it
  measures random seeds, which is what "Sit it" on the hub draws.
*/
const NUMBERED = process.argv.includes("--numbered");
const SEEDS = NUMBERED
  ? PAPERS_PER_LEVEL
  : Number(process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? 100);
const MOMENT = new Date("2026-09-25T12:00:00Z");
const seedAt = (s: number) => (NUMBERED ? numberedSeed(s + 1, null, MOMENT) : `vol-${s}`);
const bandOf = new Map<string, string | null>(entries.map((e) => [`${e.lemma}|${e.pos}`, e.cefr ?? null] as const));

console.log(`Dictionary: ${entries.length} entries. ${NUMBERED ? "The numbered set" : "Random seeds"}: ${SEEDS} per level.\n`);

for (const level of EXAM_LEVELS) {
  const rates: number[] = [];
  let thin = 0;
  let substituted = 0;
  const shortfallByTask = new Map<string, number>();
  const asked: Set<string>[] = [];
  let overlapSum = 0;
  let worstOverlap = 0;
  let atLevel = 0;
  let questionsSeen = 0;
  const perPaper: number[] = [];
  const perPaperTotal: number[] = [];

  for (let s = 0; s < SEEDS; s++) {
    const seed = seedAt(s);
    const paper = assemblePaper(level, shippedPool(level, seed), seed, WORD_ORDER);
    const rate = fillRate(paper);
    rates.push(rate);
    if (paper.thin) thin++;
    if (paper.substituted) substituted++;

    const words = new Set(
      paper.parts.flatMap((p) => p.tasks.flatMap((t) => t.items.map((i) => i.lexemeId))).filter(Boolean),
    );
    let nearest = 0;
    for (const earlier of asked) {
      let shared = 0;
      for (const w of words) if (earlier.has(w)) shared++;
      if (words.size > 0) nearest = Math.max(nearest, shared / words.size);
    }
    if (asked.length > 0) {
      overlapSum += nearest;
      worstOverlap = Math.max(worstOverlap, nearest);
    }
    asked.push(words);
    for (const w of words) {
      const band = bandOf.get(w as string) ?? null;
      if (band === level) atLevel++;
      questionsSeen++;
      perPaper[s] = (perPaper[s] ?? 0) + (band === level ? 1 : 0);
      perPaperTotal[s] = (perPaperTotal[s] ?? 0) + 1;
    }

    for (const part of paper.parts) {
      for (const task of part.tasks) {
        if (task.shortfall > 0) {
          const key = `${part.spec.skill}/${task.spec.kind}`;
          shortfallByTask.set(key, (shortfallByTask.get(key) ?? 0) + task.shortfall);
        }
      }
    }
  }

  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const min = Math.min(...rates);
  const max = Math.max(...rates);

  const eligible = entries.filter((e) => eligibleFor(level, e.cefr ?? null)).length;
  console.log(`== ${level} ==  (${eligible} eligible entries, pool of ${Math.min(eligible, POOL_SIZE)} per paper)`);
  console.log(`  fill rate: mean ${mean.toFixed(1)}%, min ${min}%, max ${max}%`);
  console.log(`  thin papers (any shortfall): ${thin}/${SEEDS}`);
  console.log(`  substituted-shape papers: ${substituted}/${SEEDS}`);
  if (SEEDS > 1) {
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    console.log(
      `  words shared with the closest earlier paper: mean ${pct(overlapSum / (SEEDS - 1))}, worst ${pct(worstOverlap)}`,
    );
  }
  /*
    DRIFTING EASY. A paper at a level draws from that band and every band below
    it, so what share of its words are at the level itself is the figure that
    says whether the paper is a paper of that level. Printed over the set and as
    the lowest single paper, because a set whose average is fine can still hold
    one paper that is mostly the level below.
  */
  const shares = perPaper.map((n, i) => (perPaperTotal[i] ? n / perPaperTotal[i]! : 0));
  console.log(
    `  words at ${level} itself: ${Math.round((atLevel / Math.max(1, questionsSeen)) * 100)}% over the set, ` +
    `lowest paper ${Math.round(Math.min(...shares) * 100)}%, highest ${Math.round(Math.max(...shares) * 100)}%`,
  );
  if (shortfallByTask.size > 0) {
    console.log(`  shortfall by task (total marks missed across ${SEEDS} papers):`);
    for (const [k, v] of [...shortfallByTask.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k}: ${v}`);
    }
  }
  console.log();
}
