import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { gunzip as gunzipCallback } from "node:zlib";
import { singleFlight } from "@/lib/cache/singleFlight";
import path from "node:path";
import { editDistance } from "@/lib/estonian/answer";
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
 * Every headword this exact spelling, diacritics and all, is a form of. Where
 * `lemmasOfForm` folds to help somebody find a word, this answers what the
 * spelling in front of us can be, which is the question a grammar check asks
 * before it calls one reading of it wrong: `kandis` is `kandma` and `kant`.
 */
export async function headwordsOfExactForm(query: string, budget?: ColdBudget): Promise<string[]> {
  const trimmed = query.trim().toLowerCase();
  const folded = fold(trimmed);
  if (!folded) return [];
  const lines = (await shard(shardKey(folded), budget))?.get(folded) ?? [];
  return [...new Set(lines.filter((line) => line.form === trimmed).flatMap((line) => line.lemmas))];
}

/**
 * Every spelling the forms list holds one slip from this one (two on a long
 * word), a dropped or misplaced mark counting as no slip at all, with how far
 * off each is. Not the spelling itself. It is what tells a grammar check that
 * `tulmast` is one letter from `tulemast` and from `tulvast` both, and so is
 * not a slip it can name, and which words' dictionary rows to read for the one
 * it can. A list of spellings to compare and of words to look up, and never a
 * form offered: whatever a check offers comes off a row (ADR-005).
 */
export async function spellingsNear(query: string, budget?: ColdBudget): Promise<{ spelling: string; distance: number; lemmas: string[] }[]> {
  const trimmed = query.trim().toLowerCase();
  const folded = fold(trimmed);
  const allowance = folded.length >= 9 ? 2 : folded.length >= 5 ? 1 : 0;
  const lines = await shard(shardKey(folded), budget);
  if (!lines) return [];
  const out: { spelling: string; distance: number; lemmas: string[] }[] = [];
  for (const [form, found] of lines) {
    if (Math.abs(form.length - folded.length) > allowance) continue;
    const distance = form === folded ? 0 : editDistance(form, folded, allowance);
    if (distance > allowance) continue;
    for (const line of found) if (line.form !== trimmed) out.push({ spelling: line.form, distance, lemmas: line.lemmas });
  }
  return out;
}

/**
 * Whether a spelling the forms list does not hold could still be a word built
 * from ones it does: a compound (`lehmasitt` is `lehma` and `sitt`) or a
 * hyphenated pair (`üle-venemaalises`). Estonian makes these at will and no
 * list holds them all. Null where the budget ran out before it could tell,
 * which a caller reads as "it may be a word", never as "it is not one".
 */
export async function couldBeCompound(query: string, budget?: ColdBudget): Promise<boolean | null> {
  const word = query.trim().toLowerCase();
  const isPart = async (part: string): Promise<boolean | null> => {
    if (budget && budget.left <= 0 && !held.has(shardKey(fold(part)))) return null;
    return isExactForm(part, budget);
  };
  if (word.includes("-")) {
    let unsure = false;
    for (const part of word.split("-").filter(Boolean)) {
      const known = (await isPart(part)) ?? null;
      if (known === null) unsure = true;
      else if (!known && !(await couldBeCompound(part, budget))) return false;
    }
    return unsure ? null : true;
  }
  let unsure = false;
  for (let at = 2; at <= word.length - 3; at += 1) {
    const tail = await isPart(word.slice(at));
    if (tail === null) { unsure = true; continue; }
    if (!tail) continue;
    const head = word.slice(0, at);
    const whole = await isPart(head);
    if (whole === null) { unsure = true; continue; }
    if (whole) return true;
    // Three parts: the head is itself a compound (`taastusravi` before `haigla`).
    if (head.length >= 5) {
      for (let cut = 2; cut <= head.length - 3; cut += 1) {
        const a = await isPart(head.slice(0, cut));
        const b = a ? await isPart(head.slice(cut)) : false;
        if (a === null || b === null) { unsure = true; continue; }
        if (a && b) return true;
      }
    }
  }
  return unsure ? null : false;
}

/**
 * Whether a spelling a written line holds is Estonian the forms list can account
 * for: a form it holds, a compound of forms it holds (`poetöötajad`), or a form
 * it holds with the clitic -gi or -ki on it (`mõtlegi`, `arvasingi`). The forms
 * list stores neither of the last two, since Estonian builds both at will. Read
 * by the lessons test and `scripts/check-lesson-part.ts`, so the two agree; the
 * accept side only, like everything in this file.
 */
export async function isWrittenSpelling(query: string): Promise<boolean> {
  const word = query.trim().toLowerCase();
  if (await isExactForm(word)) return true;
  const clitic = /^(.{2,}?)(gi|ki)$/u.exec(word);
  if (clitic && (await isExactForm(clitic[1]!))) return true;
  return (await couldBeCompound(word)) === true;
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
