#!/usr/bin/env tsx
/**
 * WHICH SPELLINGS IN THE DICTIONARY'S SENTENCES BELONG TO MORE THAN ONE WORD.
 *
 * A sentence is lent from one entry to another for a spelling only that entry
 * claims (`lib/dict/borrow.ts`), and "only that entry" was a fact about six
 * thousand entries rather than about Estonian. `aastasadade jooksul` was lent
 * to `jooks` as its adessive, "on the run", where `jooksul` is the postposition
 * "during"; `puu otsas` to `ots`, `kapi küljes` to `külg`, and further out
 * `Ämm on paha tujuga õel` to `õde` as "at the sister" where `õel` is the
 * adjective "malicious". The dictionary holds none of those other words, so
 * nothing refused the loan.
 *
 * Vabamorf holds the whole lexicon, so this asks it, with guessing off, about
 * every word of every sentence the shipped dictionary carries, and writes the
 * ones it reads as more than one word to `prisma/data/homographs.json`. The
 * claim index reads that file and lends nothing for them. It only ever
 * refuses: a spelling on it costs a borrowed sentence, and the word's own
 * sentences are untouched, because a lexicographer filed those under it.
 *
 * Needs `python3` with `estnltk` (`pip install estnltk`), like `npm run forms`,
 * and runs in under a minute. Re-run it after `npm run harvest` or a rebuild
 * of the expansion; `lib/dict/homographs.test.ts` fails until somebody does.
 */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sentenceKey } from "../lib/dict/homographs";
import { homographCorpus } from "./lib/homographCorpus";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "prisma/data/homographs.json");
const PYTHON = process.env.FORMS_PYTHON ?? "python3";

interface Answer { homographs: string[]; readings: [number, string, string[]][] }

function analyse(words: readonly string[], sentences: readonly string[][]): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [path.join(ROOT, "scripts/lib/analyse-homographs.py")], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    let out = "";
    child.on("error", reject);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { out += chunk; });
    child.on("close", (code) => {
      if (code === 0) resolve(JSON.parse(out) as Answer);
      else reject(new Error(`the analyser exited with ${code}; is estnltk installed?`));
    });
    child.stdin.write(JSON.stringify({ words, sentences }));
    child.stdin.end();
  });
}

async function main() {
  const corpus = homographCorpus();
  const answer = await analyse(corpus.words, corpus.sentences.map((s) => s.tokens));
  const readings: Record<string, string> = {};
  for (const [index, spelling, lemmas] of answer.readings) {
    readings[`${sentenceKey(corpus.sentences[index]!.et)}|${spelling}`] = lemmas.join(" ");
  }
  const sorted = Object.fromEntries(Object.entries(readings).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  const file = {
    source: "Vabamorf through estnltk: the lexicon with guessing off for which spellings belong to more than one word, and the disambiguator over each sentence for which word it means",
    corpus: { sentences: corpus.sentences.length, words: corpus.words.length, digest: corpus.digest },
    homographs: [...answer.homographs].sort(),
    readings: sorted,
  };
  await writeFile(OUT, `${JSON.stringify(file, null, 1)}\n`);
  console.log(
    `${file.homographs.length} of ${corpus.words.length} spellings belong to more than one word, `
    + `read in ${Object.keys(sorted).length} places. Wrote ${path.relative(ROOT, OUT)}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
