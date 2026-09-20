/**
 * HOW OFTEN A ONE-LETTER SUBSTITUTION LANDS ON SOMEBODY ELSE'S WORD, BY LENGTH.
 *
 * `TYPO_SUBSTITUTION_FLOOR` in `lib/estonian/answer.ts` decides how long a
 * same-length, one-letter-substituted answer has to be before `checkAnswer`
 * reads it as a slip of the hand rather than as the wrong word. It used to be
 * picked from one example ("raamat" has six letters); this is the instrument
 * that measures it instead, so a later change to the floor can be argued from
 * a number rather than from a feeling. Re-run it before moving the constant.
 *
 * It walks every accepted answer the shipped dictionary can produce, the
 * same corpus `answer.test.ts` reads (`expanded.json`'s lemmas and
 * translations, `harvested.ts`'s lemmas and glosses, put through
 * `acceptedAnswers` exactly as the marker does), buckets them by length, and
 * counts every pair inside a bucket that `editDistance` calls exactly 1 —
 * which, at equal length, can only be a single substitution.
 *
 *   npx tsx scripts/measure-typo-collisions.ts
 */
import { readFileSync } from "node:fs";

import { acceptedAnswers, editDistance } from "../lib/estonian/answer";
import { HARVESTED } from "../prisma/data/harvested";

interface SeedEntry { lemma: string; translation: string }
const EXPANDED: SeedEntry[] = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8"));

const EXAMPLES_PER_LENGTH = 6;

function corpus(language: "et" | "en"): string[] {
  const values: string[] = [];
  for (const entry of EXPANDED) {
    if (language === "et") values.push(entry.lemma);
    else if (entry.translation) values.push(entry.translation);
  }
  for (const word of HARVESTED) {
    if (language === "et") values.push(word.lemma);
    else if (word.gloss) values.push(word.gloss);
  }
  const forms = new Set<string>();
  for (const value of values) {
    for (const a of acceptedAnswers(value, language)) forms.add(a);
  }
  return [...forms];
}

function report(language: "et" | "en"): void {
  const words = corpus(language);
  console.log(`\n${language}: ${words.length} distinct accepted answers`);

  const byLength = new Map<number, string[]>();
  for (const w of words) {
    const list = byLength.get(w.length) ?? [];
    list.push(w);
    byLength.set(w.length, list);
  }

  const lengths = [...byLength.keys()].sort((a, b) => a - b);
  for (const len of lengths) {
    if (len < 2) continue;
    const list = byLength.get(len)!;
    const examples: string[] = [];
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (editDistance(list[i]!, list[j]!, 1) === 1) {
          count++;
          if (examples.length < EXAMPLES_PER_LENGTH) examples.push(`${list[i]}/${list[j]}`);
        }
      }
    }
    if (count === 0) continue;
    console.log(`  length ${len}: ${count} same-length 1-substitution pairs — e.g. ${examples.join(", ")}`);
  }
}

report("et");
report("en");
