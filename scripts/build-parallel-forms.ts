/**
 * Writes lib/course/lessons/parallelForms.ts from the harvest, the forms list
 * and the decisions in scripts/lib/parallelForms.ts.
 *
 *   npx tsx scripts/build-parallel-forms.ts          prints what it would write, and what has not been read
 *   npx tsx scripts/build-parallel-forms.ts --write  writes it
 *
 * A candidate with no decision, or a kept one whose lesson texts have changed
 * since it was read, is printed with the texts to read, and nothing is written
 * until the decisions say what to do with it.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { HARVESTED } from "../prisma/data/harvested";
import { LESSONS } from "../lib/course/lessons/index";
import { estonianOf, wordsOf } from "../lib/course/lessons/ledger";
import { headwordsOfExactForm } from "../lib/dict/forms";
import { PARALLEL_REVIEW, parallelCandidates, parallelTable, sameTexts, tableSource, textsHolding } from "./lib/parallelForms";

async function main() {
  const texts = LESSONS.flatMap((l) => estonianOf(l).map((e) => e.et));
  const used = new Set(texts.flatMap((t) => wordsOf(t).map((w) => w.low)));
  const candidates = await parallelCandidates(HARVESTED, used, headwordsOfExactForm);
  let open = 0;
  for (const c of candidates) {
    const decision = PARALLEL_REVIEW[c.stored];
    const holding = [...new Set([...textsHolding(texts, c.stored), ...textsHolding(texts, c.parallel)])].sort((a, b) => a.localeCompare(b, "et"));
    if (!decision) {
      open++;
      console.log(`UNDECIDED ${c.stored} / ${c.parallel} (${c.lemma}):\n  ${holding.join("\n  ")}`);
    } else if (decision.keep && !sameTexts(decision.read ?? [], holding)) {
      open++;
      console.log(`READ AGAIN ${c.stored} / ${c.parallel} (${c.lemma}):\n  read: ${JSON.stringify(holding)}`);
    } else {
      console.log(`${decision.keep ? "kept   " : "refused"} ${c.stored} / ${c.parallel}: ${decision.why}`);
    }
  }
  for (const stored of Object.keys(PARALLEL_REVIEW)) {
    if (!candidates.some((c) => c.stored === stored)) { open++; console.log(`STALE decision for ${stored}: no lesson uses it now`); }
  }
  const out = path.join(process.cwd(), "lib", "course", "lessons", "parallelForms.ts");
  if (open > 0) { console.log(`\n${open} to decide. Nothing written.`); process.exitCode = 1; return; }
  if (process.argv.includes("--write")) {
    writeFileSync(out, tableSource(parallelTable(candidates, PARALLEL_REVIEW)));
    console.log(`\nwrote ${out}`);
  } else {
    console.log(`\n${tableSource(parallelTable(candidates, PARALLEL_REVIEW))}`);
  }
}

void main();
