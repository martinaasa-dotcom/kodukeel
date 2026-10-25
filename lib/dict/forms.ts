import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { gunzip as gunzipCallback } from "node:zlib";
import { singleFlight } from "@/lib/cache/singleFlight";
import path from "node:path";
import { fold } from "@/lib/estonian/fold";
import { LENGTH_FILE, SHARD_DIR, shardKey } from "./formsLayout";

/**
 * IS THAT SPELLING AN ESTONIAN WORD, AND WHICH WORD IS IT A FORM OF?
 *
 * `KnownWord` answers "is that a word" for 155,000 headwords, and a learner
 * meets the language in its forms: `põhjas` went into Sõnad, is the seesütlev
 * of `põhi`, and was refused as not a word. This is the forms list
 * `scripts/build-forms.ts` writes, 5.8 million spellings from every source
 * that may legitimately be used, and it answers two things and no more:
 * whether a spelling is Estonian, and which headwords it belongs to.
 *
 * IT IS AN ACCEPT LIST AND NOT A DICTIONARY, which is what keeps it inside
 * ADR-005. It holds no gloss, no level, no case label and no sentence, so
 * nothing read from it can become a card, a paper, a marking target or a
 * scanned word the app vouches for; `lib/srs`, `lib/exam`, `lib/assessment`
 * and `lib/dict/resolveScan.ts` may not import it, asserted. A synthesized
 * form on this side costs a non-word being let through on a word game. The
 * same form on the answer side would be drilled, and that is the difference
 * between the two sides.
 *
 * FILES RATHER THAN A TABLE, and one file per lookup. The 6,044,103 pairs in
 * Postgres with the index the search would need measured 789 MB, against 15 MB
 * as gzipped shards, for a question whose answer never changes. So a lookup
 * reads one shard keyed on the form's folded first three letters, indexes it by
 * folded spelling on the way in, and keeps it for a while, so a class typing
 * into the same corner of the alphabet reads it once. Folded on both sides,
 * as the headword list was, because a learner with no õ key is still
 * asking whether their word exists.
 *
 * No Prisma, deliberately: this module reads the filesystem and nothing else,
 * and the pure half (`formsLayout.ts`, `parseShard`) is unit tested.
 */

/** Where the builder wrote the list. */
const DIR = path.join(process.cwd(), "prisma", "data", "forms");

/** How many parsed shards are kept in memory. The largest is a quarter of a million lines. */
const HELD_SHARDS = 48;

/** One line of a shard: the spelling and the headwords it belongs to. */
export interface FormLine {
  form: string;
  lemmas: string[];
}

/** A shard, indexed by folded spelling so a warm lookup is a map read. */
export type Shard = Map<string, FormLine[]>;

/**
 * A shard's lines, parsed and keyed on the folded spelling. Exported for its
 * test. Folded once here rather than on every lookup, because the largest
 * shard is a quarter of a million lines and a scan folding each of them was
 * measured at 250 ms warm; a map read is nothing.
 */
export function parseShard(text: string): Shard {
  const index: Shard = new Map();
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    const entry = { form: line.slice(0, tab), lemmas: line.slice(tab + 1).split(",") };
    const key = fold(entry.form);
    const lines = index.get(key);
    if (lines) lines.push(entry);
    else index.set(key, [entry]);
  }
  return index;
}

const held = new Map<string, Shard>();
const gunzip = promisify(gunzipCallback);

/**
 * How many shards one caller may read cold, for a request that asks about a
 * list of spellings it was handed.
 *
 * A cold shard is a read, a gunzip and a parse of up to a quarter of a million
 * lines, and the parse holds the event loop: measured at about two seconds for
 * the sixty largest. The speech route takes sixty words a request and sixty
 * requests a minute, so one account sending one word from each of the largest
 * shards, alternating two sets so the cache never helps, kept an instance busy
 * for most of every minute and everybody else on it waiting. A real turn names
 * a dozen words at most and most of them share a warm shard, so a caller hands
 * in a budget and a word past it is answered as unknown rather than read.
 */
export interface ColdBudget {
  left: number;
}

export function coldBudget(shards: number): ColdBudget {
  return { left: shards };
}

/** The shard for a key, or null where it is cold and the caller's budget is spent. */
async function shard(key: string, budget?: ColdBudget): Promise<Shard | null> {
  const kept = held.get(key);
  if (kept) {
    // Re-insert so the map's order is least recently used first.
    held.delete(key);
    held.set(key, kept);
    return kept;
  }
  if (budget) {
    if (budget.left <= 0) return null;
    budget.left -= 1;
  }
  // Concurrent asks for one cold shard read it once.
  return singleFlight(`forms:${key}`, async () => {
    let lines: Shard;
    try {
      const bytes = await readFile(path.join(DIR, SHARD_DIR, `${key}.tsv.gz`));
      lines = parseShard((await gunzip(bytes)).toString("utf8"));
    } catch (error) {
      // A shard nothing starts with is an ordinary answer, not a fault: no
      // Estonian word begins with `qx`. Anything else is worth hearing about.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      lines = new Map();
    }
    held.set(key, lines);
    if (held.size > HELD_SHARDS) {
      const oldest = held.keys().next().value;
      if (oldest !== undefined) held.delete(oldest);
    }
    return lines;
  });
}

/**
 * Every headword this spelling is a form of, folded on both sides. An exact
 * spelling's headwords come first, so `pohjas` and `põhjas` both answer with
 * `põhi` and a spelling that is itself a headword leads with itself.
 */
export async function lemmasOfForm(query: string, budget?: ColdBudget): Promise<string[]> {
  const trimmed = query.trim().toLowerCase();
  const folded = fold(trimmed);
  if (!folded) return [];
  const lines = (await shard(shardKey(folded), budget))?.get(folded) ?? [];
  const exact: string[] = [];
  const near: string[] = [];
  for (const line of lines) {
    (line.form === trimmed ? exact : near).push(...line.lemmas);
  }
  const out: string[] = [];
  for (const lemma of [...exact, ...near]) if (!out.includes(lemma)) out.push(lemma);
  // The spelling itself leads where it is a headword, then everything else.
  out.sort((a, b) => Number(b === trimmed) - Number(a === trimmed));
  return out;
}

/**
 * Whether this exact spelling, diacritics and all, is a form of some word. The
 * folded reading above is right for a search box and wrong for telling a slip of
 * the hand from a real word: `poder` folds onto `põder` and is still a slip.
 */
export async function isExactForm(query: string, budget?: ColdBudget): Promise<boolean> {
  const trimmed = query.trim().toLowerCase();
  const folded = fold(trimmed);
  if (!folded) return false;
  return ((await shard(shardKey(folded), budget))?.get(folded) ?? []).some((line) => line.form === trimmed);
}

/**
 * The spellings of one headword that share its shard, which is nearly all of
 * them: an ending changes the end of a word and the shard is keyed on its first
 * three letters. What a stem change moves into another shard (`tuba`, `toas`)
 * is missed here and found the first time somebody asks it, which is how the
 * question game's learned words widen (`lib/progress/twentyLearned.ts`).
 */
export async function formsOfHeadword(lemma: string): Promise<string[]> {
  const head = lemma.trim().toLowerCase();
  const folded = fold(head);
  if (!folded) return [];
  const out = new Set<string>([head]);
  for (const lines of (await shard(shardKey(folded)))?.values() ?? []) {
    for (const line of lines) {
      if (line.form === line.form.toLowerCase() && line.lemmas.includes(head)) out.add(line.form);
    }
  }
  return [...out].sort();
}

/** Whether the spelling is a form of any Estonian word at all. */
export async function isKnownForm(query: string, budget?: ColdBudget): Promise<boolean> {
  return (await lemmasOfForm(query, budget)).length > 0;
}

/**
 * Every spelling of one length, for a game that hands its accept list to the
 * browser. Read from the file the builder wrote for that length rather than
 * scanned out of the shards, which is the cost the layout exists to avoid;
 * a length the builder was never asked for answers with nothing, and the
 * invariant checks the game's length is one it was asked for.
 */
export async function formsOfLength(length: number): Promise<string[]> {
  try {
    const bytes = await readFile(path.join(DIR, LENGTH_FILE(length)));
    return (await gunzip(bytes)).toString("utf8").split("\n").filter(Boolean);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}
