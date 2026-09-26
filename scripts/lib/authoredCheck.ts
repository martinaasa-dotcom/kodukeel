/**
 * THE MACHINE'S HALF OF READING A WRITTEN SENTENCE.
 *
 * `lib/dict/authored.ts` says what a written sentence is allowed to be and
 * this is where that is asked, row by row, against the dictionary a fresh
 * install ships and the module's own teaching order. Two readers: the unit
 * test, which fails on any row that breaks a rule, and
 * `npm run check:authored`, which prints them all with the reason, so a
 * batch of new rows can be written, checked and corrected before a person
 * reads them.
 *
 * What it cannot see is whether a sentence is good Estonian. That is the
 * person's reading, in the pull request that adds the row.
 */
import { PROGRAMMES, taughtThrough, type CourseDay, type Programme } from "../../lib/course";
import { dictionaryRows } from "./dictionary";
import { authoredRows, type AuthoredRow } from "../../lib/dict/authored";
import { naturalSentence, nominalOpener, sentenceTiles } from "../../lib/estonian/cloze";
import { readableSpellings } from "../../lib/estonian/gapForms";
import { isRefusedSentence } from "../../lib/dict/refused";

export interface AuthoredFault {
  readonly row: AuthoredRow;
  readonly why: string;
}

/** Estonian letters an English line may not carry. */
const ESTONIAN_LETTERS = /[õäöüšžÕÄÖÜŠŽ]/;

/** Fewest and most words a beginner's sentence has. */
export const AUTHORED_MIN_WORDS = 2;
export const AUTHORED_MAX_WORDS = 10;

/** Where in the ladder each course lemma is taught. */
function lessonOf(): Map<string, { programme: Programme; day: CourseDay }> {
  const out = new Map<string, { programme: Programme; day: CourseDay }>();
  for (const programme of PROGRAMMES) {
    for (const day of programme.days) {
      for (const word of day.words) if (!out.has(word)) out.set(word, { programme, day });
    }
  }
  return out;
}

/** Every row checked, and every fault with its reason. */
export function checkAuthored(rows: readonly AuthoredRow[] = authoredRows()): AuthoredFault[] {
  const dictionary = dictionaryRows();
  const byLemma = new Map<string, (typeof dictionary)[number][]>();
  for (const row of dictionary) byLemma.set(row.lemma, [...(byLemma.get(row.lemma) ?? []), row]);
  const spellings = new Map<string, Set<string>>();
  const spellingsOf = (lemma: string): Set<string> => {
    const held = spellings.get(lemma);
    if (held) return held;
    const out = new Set<string>(lemma.toLowerCase().split(/[^\p{L}\p{M}]+/u).filter(Boolean));
    for (const row of byLemma.get(lemma) ?? []) for (const w of readableSpellings(row)) out.add(w);
    spellings.set(lemma, out);
    return out;
  };
  const taughtCache = new Map<string, Set<string>>();
  const where = lessonOf();
  const faults: AuthoredFault[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const [lemma, et, en] = row;
    const fail = (why: string) => faults.push({ row, why });
    const at = where.get(lemma);
    if (!at) { fail(`${lemma} is taught on no evening of the course`); continue; }
    const entries = byLemma.get(lemma) ?? [];
    if (entries.length === 0) { fail(`${lemma} is not in the dictionary`); continue; }

    const key = et.trim().toLowerCase();
    if (seen.has(key)) fail("written twice");
    seen.add(key);
    if (et !== et.trim() || /\s{2}/.test(et)) fail("stray whitespace");
    if (/[-–—]/.test(et) || /[-–—]/.test(en)) fail("a dash");
    if (isRefusedSentence(et)) fail("refused in lib/dict/refused.ts");

    const entry = entries[0]!;
    const opener = nominalOpener(entry.pos, [entry.lemma, ...entry.forms.map((f) => f.value)]);
    if (!naturalSentence(et, opener)) fail("not a sentence naturalSentence accepts");
    if (!/^[\p{Lu}0-9]/u.test(et)) fail("does not open on a capital");

    const tiles = sentenceTiles(et);
    if (tiles.length < AUTHORED_MIN_WORDS || tiles.length > AUTHORED_MAX_WORDS) {
      fail(`${tiles.length} words, where a beginner's sentence is ${AUTHORED_MIN_WORDS} to ${AUTHORED_MAX_WORDS}`);
    }

    const cacheKey = `${at.programme.id}|${at.day.index}`;
    let taught = taughtCache.get(cacheKey);
    if (!taught) {
      taught = new Set<string>();
      for (const l of taughtThrough(at.programme, at.day.index)) for (const s of spellingsOf(l)) taught.add(s);
      taughtCache.set(cacheKey, taught);
    }
    const unknown = tiles.filter((w) => !taught!.has(w.toLowerCase()));
    if (unknown.length > 0) fail(`not taught by ${at.day.id}: ${unknown.join(", ")}`);

    const own = spellingsOf(lemma);
    if (!tiles.some((w) => own.has(w.toLowerCase()))) fail(`carries no form of ${lemma}`);

    const recorded = new Set(entries.flatMap((e) => e.examples.map((x) => x.et.trim().toLowerCase())));
    if (recorded.has(key)) fail("Ekilex already recorded this sentence for the word");

    if (!en.trim()) fail("no English line");
    if (ESTONIAN_LETTERS.test(en)) fail("an Estonian letter in the English");
    if (!/[.!?]$/.test(en.trim())) fail("the English does not end a sentence");
  }
  return faults;
}
