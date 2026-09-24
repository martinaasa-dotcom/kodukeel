/**
 * How many distinct, well-filled mock exam papers can this dictionary
 * actually support per level, with zero content changes?
 *
 * A paper is assembled fresh from (level, seed, pool) rather than drawn from a
 * bank of pre-written exams (see lib/exam/paper.ts's own header), so "how many
 * exams do you have" has no fixed answer the way a claim of a stated count
 * does. It is however many seeds produce a paper the dictionary can fill
 * without a shortfall, which is a question worth measuring rather than
 * assuming: `npm run measure:exam-volume -- --seeds=200` is 100.0% fill at
 * every level with zero thin papers and zero duplicate papers across 200
 * distinct seeds each, on the shipped dictionary as of this writing. Re-run it
 * before repeating that figure anywhere, the way `eval:scene` asks to be
 * re-run before its own numbers are quoted: the dictionary grows and a claim
 * about it should be re-measured rather than remembered.
 *
 * No database: reads the shipped dictionary through scripts/lib/dictionary.ts,
 * exactly as audit-questions.ts does.
 */
import { dictionaryRows } from "./lib/dictionary";
import { buildPaper, fillRate, type PoolWord } from "../lib/exam/paper";
import { POOL_SIZE, drawPool, eligibleFor } from "../lib/exam/pool";
import { usableExamples } from "../lib/dict/examples";
import { orderContextFrom } from "../lib/estonian/wordOrder";
import { EXAM_LEVELS } from "../lib/exam/spec";

/*
  THE POOL IS DRAWN THE WAY THE APP DRAWS IT, OR THIS MEASURES A DIFFERENT PAPER.

  The first version handed `buildPaper` the whole dictionary at every level, so
  an A1 paper was built out of C1 words and every level read full. The app
  filters to the level, shuffles on the paper's seed and keeps `POOL_SIZE`
  (`lib/exam/pool.ts`, the rule `lib/progress/exam.ts` reads too), and it keeps
  only the sentences `usableExamples` keeps. The one difference left is the
  order the draw starts from: the app shuffles database ids and this shuffles
  (lemma, pos), so the seed picks a different five hundred, from the same set,
  by the same rule. Fill rates are comparable; a single seed's paper is not.
*/
const entries = dictionaryRows();
const asPool = (e: (typeof entries)[number]): PoolWord => ({
  lexemeId: `${e.lemma}|${e.pos}`, lemma: e.lemma, translation: e.translation, pos: e.pos, cefr: e.cefr,
  semanticTypes: e.semanticTypes ?? null,
  forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null, morphName: null })),
  examples: usableExamples((e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null, source: "EKILEX" as const }))).map((x) => ({ et: x.et, en: x.en ?? null })),
  government: e.government, cardId: null,
});
const ordered = [...entries].sort((a, b) =>
  `${a.lemma}|${a.pos}` < `${b.lemma}|${b.pos}` ? -1 : `${a.lemma}|${a.pos}` > `${b.lemma}|${b.pos}` ? 1 : 0);
const WORD_ORDER = orderContextFrom(entries);
const poolFor = (level: (typeof EXAM_LEVELS)[number], seed: string): PoolWord[] =>
  drawPool(ordered.filter((e) => eligibleFor(level, e.cefr ?? null)), level, seed).map(asPool);

const SEEDS = Number(process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? 100);

console.log(`Dictionary: ${entries.length} entries. Seeds per level: ${SEEDS}.\n`);

for (const level of EXAM_LEVELS) {
  const rates: number[] = [];
  let thin = 0;
  let substituted = 0;
  const shortfallByTask = new Map<string, number>();
  const seenPapers = new Set<string>();
  let duplicatePapers = 0;

  for (let s = 0; s < SEEDS; s++) {
    const seed = `vol-${s}`;
    const paper = buildPaper(level, poolFor(level, seed), seed, WORD_ORDER);
    const rate = fillRate(paper);
    rates.push(rate);
    if (paper.thin) thin++;
    if (paper.substituted) substituted++;

    const fingerprint = paper.parts
      .flatMap((p) => p.tasks.flatMap((t) => t.items.map((i) => i.id + ":" + i.lemma)))
      .join("|");
    if (seenPapers.has(fingerprint)) duplicatePapers++;
    seenPapers.add(fingerprint);

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

  const eligible = ordered.filter((e) => eligibleFor(level, e.cefr ?? null)).length;
  console.log(`== ${level} ==  (${eligible} eligible entries, pool of ${Math.min(eligible, POOL_SIZE)} per paper)`);
  console.log(`  fill rate: mean ${mean.toFixed(1)}%, min ${min}%, max ${max}%`);
  console.log(`  thin papers (any shortfall): ${thin}/${SEEDS}`);
  console.log(`  substituted-shape papers: ${substituted}/${SEEDS}`);
  console.log(`  duplicate papers across ${SEEDS} seeds: ${duplicatePapers}`);
  if (shortfallByTask.size > 0) {
    console.log(`  shortfall by task (total marks missed across ${SEEDS} papers):`);
    for (const [k, v] of [...shortfallByTask.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k}: ${v}`);
    }
  }
  console.log();
}
