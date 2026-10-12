/**
 * CHECK THE SAYINGS THE DICTIONARY DOES NOT HOLD AGAINST EKILEX, AND WRITE
 * DOWN THE ONES IT DOES.
 *
 * `lib/estonian/sayings.ts` pins sentences. Most are in the shipped dictionary
 * and the unit suite checks that. A few are not, because the harvest keeps four
 * usages a word and `mine metsa` is the fourteenth sense of `minema`. For
 * those, this asks Ekilex whether the entry the pin names records exactly that
 * sentence, and writes `prisma/data/saying-usages.json` from the answer.
 *
 * IT CHECKS AND DOES NOT COLLECT. A sentence is written down only when Ekilex
 * returns it, character for character, under the headword the pin names. A
 * pin Ekilex does not return is reported and fails the run; it is never
 * written, and neither is anything from a run where Ekilex would not answer.
 * That is the rule the course harvest learned expensively (`harvestGuard`): a
 * refusal is not a miss, and a file rewritten from a run that heard nothing
 * is a file that has lost its contents.
 *
 * The file is rebuilt from the pins every time, so a saying that is removed
 * takes its sentence with it, and a sentence the dictionary later keeps stops
 * being listed here and fails `sayingUsages.test.ts` until it is deleted.
 *
 * Needs EKILEX_API_KEY. Reports by default; `--write` writes.
 *
 *   npm run harvest:sayings
 *   npm run harvest:sayings -- --write
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fetchEkilexDetails, searchEkilexAnswered, ekilexConfigured } from "../lib/ekilex/client";
import { SAYINGS } from "../lib/estonian/sayings";
import { shippedDictionary } from "./lib/dictionary";

const OUT = join(process.cwd(), "prisma/data/saying-usages.json");
const write = process.argv.includes("--write");

async function main() {
  if (!ekilexConfigured()) {
    console.error("No EKILEX_API_KEY. Nothing to check against, so nothing is written.");
    process.exit(1);
  }

  const shipped = new Map<string, Set<string>>();
  for (const row of shippedDictionary()) {
    for (const et of row.usages) (shipped.get(row.lemma) ?? shipped.set(row.lemma, new Set()).get(row.lemma)!).add(et);
  }

  const missing = new Map<string, Set<string>>();
  for (const saying of SAYINGS) {
    for (const pin of saying.sentences) {
      if (shipped.get(pin.lemma)?.has(pin.et)) continue;
      (missing.get(pin.lemma) ?? missing.set(pin.lemma, new Set()).get(pin.lemma)!).add(pin.et);
    }
  }
  console.log(`${[...missing.values()].reduce((n, s) => n + s.size, 0)} pinned sentences are not in the shipped dictionary.`);

  const verified: Record<string, string[]> = {};
  let failed = false;
  for (const [lemma, wanted] of [...missing].sort((a, b) => a[0].localeCompare(b[0]))) {
    const homonyms = await searchEkilexAnswered(lemma);
    if (homonyms === null) {
      console.error(`Ekilex did not answer for ${lemma}. Not written.`);
      failed = true;
      continue;
    }
    const recorded = new Set<string>();
    for (const word of homonyms.filter((w) => w.wordValue === lemma)) {
      const details = await fetchEkilexDetails(word.wordId);
      if (details === null) {
        console.error(`Ekilex did not answer for ${lemma} (${word.wordId}). Not written.`);
        failed = true;
        continue;
      }
      for (const et of details.usages) recorded.add(et);
    }
    for (const et of [...wanted].sort()) {
      if (recorded.has(et)) (verified[lemma] ??= []).push(et);
      else {
        console.error(`NOT RECORDED under ${lemma}: ${et}`);
        failed = true;
      }
    }
  }

  const count = Object.values(verified).reduce((n, l) => n + l.length, 0);
  console.log(`${count} verified.`);
  if (failed) {
    console.error("Something was not verified or not answered, so the file is left as it was.");
    process.exit(1);
  }
  const next = JSON.stringify(verified, null, 2) + "\n";
  const current = await readFile(OUT, "utf8").catch(() => "");
  if (next === current) return console.log("saying-usages.json is already right.");
  if (!write) return console.log("Would change saying-usages.json. Run with --write.");
  await writeFile(OUT, next, "utf8");
  console.log("Wrote prisma/data/saying-usages.json.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
