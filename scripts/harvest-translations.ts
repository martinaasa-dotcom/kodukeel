/**
 * ASKS THE INSTITUTE FOR THE RUSSIAN AND THE UKRAINIAN, FOR THE WHOLE BUILT
 * DICTIONARY.
 *
 *   npx tsx scripts/harvest-translations.ts            # report what the answer would be
 *   npx tsx scripts/harvest-translations.ts --write    # and put it in the built dictionary
 *   npx tsx scripts/harvest-translations.ts --limit 50 # a small run, for checking
 *
 * WHY THE COURSE ALONE WAS NOT ENOUGH. Most people learning Estonian in
 * Estonia already speak Russian or Ukrainian, and an app that can only say
 * `kohv` is "coffee" asks them to reach a word through the language they are
 * least sure of. The course harvest reads the equivalents out of the response
 * it was already fetching, so the 1,371 words a unit names carry them and the
 * 4,700 the Wiktionary expansion adds do not: a learner who looks a word up
 * outside the course crosses the line from a dictionary that speaks their
 * language to one that does not, and nothing on the screen says why. This is
 * the same field, asked for the other four fifths.
 *
 * NOTHING HERE IS A TRANSLATION THIS APP MADE. The equivalents come from
 * `synonymLangGroups`, written by the same lexicographers who wrote the forms
 * and the sentences, and `equivalentsFrom` in `lib/ekilex/client.ts` is the
 * one reading of that field: the live lookup, the course harvest and this
 * script all go through it rather than each parsing somebody else's JSON.
 * ADR-005 is untouched, and these two columns are the reason it matters more
 * here rather than less. A wrong gloss looks exactly like a right one, and
 * more so in a language the person reviewing this code cannot read, so no
 * model may reach these columns and the files that may name them at all are a
 * closed list asserted in `scripts/test-invariants.ts`.
 *
 * EVERY SENSE, WHICH IS `equivalentsFrom`'s OWN RULE and the opposite of the
 * semantic types next door. A later sense's Russian is more of the same fact
 * rather than a contradiction of it, and narrowing here would disagree with
 * the course harvest about words it has already written.
 *
 * IT ADDS AND NEVER OVERWRITES. An entry the course harvest already answered
 * for is left exactly as it is: that one is written by hand into
 * `prisma/data/harvested.ts` from the same source and is the half somebody has
 * looked at, and two writers filling one column is where they stop agreeing.
 * What this fills is the entries that have nothing.
 *
 * Needs EKILEX_API_KEY and the network. Answers are cached under
 * .ekilex-cache/ as the two word lists alone rather than as the response: a
 * word's details run to 330KB of etymology trees and the whole dictionary
 * would be 1.8GB of cache to carry a handful of words per entry.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readExpanded, writeExpanded } from "./lib/expandedFile";
import { equivalentsFrom } from "../lib/ekilex/client";

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".ekilex-cache");
const BASE = "https://ekilex.ee/api";
const API_KEY = process.env.EKILEX_API_KEY ?? "";

const WRITE = process.argv.includes("--write");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg === -1 ? Infinity : Number(process.argv[limitArg + 1]);

/** How many requests may be in flight against a service the Institute runs. */
const CONCURRENCY = 5;

interface Entry {
  lemma: string;
  pos: string;
  ekilexWordId?: number;
  translationRu?: string | null;
  translationUk?: string | null;
  [key: string]: unknown;
}

interface RawDetails {
  lexemes?: {
    synonymLangGroups?: {
      lang?: string;
      synonyms?: { type?: string; words?: { wordValue?: string }[] }[];
    }[];
  }[];
}

const cacheFile = (name: string) =>
  path.join(CACHE, `${Buffer.from(name, "utf8").toString("base64url")}.json`);

async function cached<T>(name: string, fn: () => Promise<T | null>): Promise<T | null> {
  const file = cacheFile(name);
  if (existsSync(file)) {
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch {
      /* a truncated entry is a miss */
    }
  }
  const value = await fn();
  if (value !== null) await writeFile(file, JSON.stringify(value));
  return value;
}

async function call<T>(pathname: string, attempt = 0): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${pathname}`, {
      headers: { "ekilex-api-key": API_KEY },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    if (attempt >= 4) {
      console.warn(`  ! giving up on ${pathname}: ${(err as Error).message}`);
      return null;
    }
    await new Promise((r) => setTimeout(r, 1_000 * 2 ** attempt));
    return call<T>(pathname, attempt + 1);
  }
}

/**
 * Joined the way the seed joins them and the way the gloss column already
 * reads: a comma and a space. Empty is null rather than an empty string,
 * because "Ekilex records none" is the honest answer and is what the screen
 * already says.
 */
const joined = (words: string[]): string | null => (words.length > 0 ? words.join(", ") : null);

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error("EKILEX_API_KEY is not set. This asks the Institute; there is no offline answer.");
    process.exit(1);
  }
  await mkdir(CACHE, { recursive: true });

  const entries = readExpanded<Entry>();
  const wanted = entries.filter((e) => e.ekilexWordId).slice(0, LIMIT);
  console.log(`Asking Ekilex about ${wanted.length.toLocaleString("en-GB")} entries.`);

  let done = 0;
  let unreachable = 0;
  const found = new Map<string, { rus: string[]; ukr: string[] }>();

  const queue = [...wanted];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const entry = next;
        const pair = await cached<{ rus: string[]; ukr: string[] }>(
          `translations-${entry.ekilexWordId}`,
          async () => {
            const details = await call<RawDetails>(`/word/details/${entry.ekilexWordId}`);
            return details ? equivalentsFrom(details.lexemes) : null;
          },
        );
        if (pair === null) unreachable++;
        else found.set(`${entry.lemma}|${entry.pos}`, pair);
        if (++done % 250 === 0) process.stderr.write(`  ${done}\n`);
      }
    }),
  );

  let withRu = 0;
  let withUk = 0;
  for (const [, pair] of found) {
    if (pair.rus.length > 0) withRu++;
    if (pair.ukr.length > 0) withUk++;
  }

  console.log(
    `\n${found.size.toLocaleString("en-GB")} answered; `
    + `${withRu.toLocaleString("en-GB")} carry a Russian equivalent and `
    + `${withUk.toLocaleString("en-GB")} a Ukrainian one; ${unreachable} could not be fetched.`,
  );

  if (!WRITE) {
    console.log("\nNothing written. Re-run with --write to put this in the built dictionary.");
    return;
  }

  let changed = 0;
  let kept = 0;
  for (const entry of entries) {
    const pair = found.get(`${entry.lemma}|${entry.pos}`);
    if (!pair) continue;
    /*
      An entry that already carries one was answered by the course harvest out
      of the same field of the same response, and that file is the half a
      person has read. Adding beside it rather than over it is what keeps one
      column to one writer per entry.
    */
    if (entry.translationRu || entry.translationUk) {
      kept++;
      continue;
    }
    const ru = joined(pair.rus);
    const uk = joined(pair.ukr);
    if (ru === (entry.translationRu ?? null) && uk === (entry.translationUk ?? null)) continue;
    entry.translationRu = ru;
    entry.translationUk = uk;
    changed++;
  }
  writeExpanded(entries);
  console.log(
    `\nWrote ${changed.toLocaleString("en-GB")} entries into prisma/data/expanded.json; `
    + `${kept.toLocaleString("en-GB")} already had one and were left alone.`,
  );
}

void main();
