/**
 * WHAT A BEGINNER IS ACTUALLY SHOWN, OVER EVERY WORD THE COURSE TEACHES FIRST.
 *
 * Every Estonian sentence in this app is one a lexicographer recorded, which is
 * what keeps it honest (ADR-005) and is not the same as its being a sentence a
 * beginner can read. Ekilex records a usage to illustrate a word **to somebody
 * who already speaks Estonian**, so the pool a word offers is a pool of
 * illustrations, and which of them a screen leads with is this app's decision
 * alone. It was `usableExamples`'s length sort, and length selects for the noun
 * phrase and the idiom.
 *
 * This is the reading of that decision, band by band, and it is a report rather
 * than a gate: the only thing it can honestly fail on is its own floor, because
 * a word whose every recorded sentence is hard has nothing better to be shown
 * and is not a fault anybody can fix in code. What it names instead is the
 * ranked list — which words are still being taught with a phrase, and which
 * spellings a beginner keeps meeting that nothing in their half of the
 * dictionary reaches. Read the list, not the percentage: the first run of it
 * said `aken` was taught with `Papagoi pääses lahtise akna kaudu välja.` and
 * `öö` with `Isa suri ööl vastu laupäeva.`, and neither is visible in a total.
 *
 * THE STATED RESIDUAL IS THE SIMPLE PAST IN THE PLURAL. `plainReach` claims
 * every spelling `gapForms` reaches plus a verb's past third person, the way
 * `claimIndex` does, and no rule in this app reaches `sõitsime` or `istusime`:
 * only `lib/estonian/conjugate.ts` may join a person ending to a stem, and its
 * table is deliberately the present. So a handful of ordinary A1 sentences are
 * counted here as holding a word out of reach when they do not, which reads as
 * a slightly worse figure than the app deserves and, in the ranking itself,
 * costs such a sentence a place it had earned. Over-reporting in the direction
 * of "harder than it is" is the safe side for a report nobody gates on, and
 * widening the conjugation table is a change measured through `audit:verbs`
 * rather than made in passing.
 *
 * Offline: it reads `prisma/data/` through `shippedDictionary`, so it needs no
 * database and no key and says what a fresh install actually has.
 */
import { dictionaryRows } from "./lib/dictionary";
import { usableExamples, type Example } from "../lib/dict/examples";
import { naturalSentence, nominalOpener, ESTONIAN_WORD } from "../lib/estonian/cloze";
import { plainReach, plainerFirst, PLAIN_UP_TO, WEIGHTS } from "../lib/dict/plainness";
import { LEVELS } from "../lib/collections/syllabus/index";

const listWords = process.argv.includes("--list");
const sweepWeights = process.argv.includes("--weights");

const rows = dictionaryRows();
const reach = plainReach(rows);
const limit = LEVELS.indexOf(PLAIN_UP_TO);

const asExample = (e: { et: string; en: string | null }): Example =>
  ({ et: e.et, en: e.en, source: "EKILEX" });

/** Exactly what a teaching screen is handed, for one entry. */
function shownTo(row: (typeof rows)[number]): string[] {
  const opener = nominalOpener(row.pos, [row.lemma, ...row.forms.map((f) => f.value)]);
  return usableExamples(row.examples.map(asExample), plainerFirst(row.cefr, reach))
    .filter((e) => naturalSentence(e.et, opener))
    .map((e) => e.et);
}

const wordsOf = (s: string) =>
  [...s.matchAll(ESTONIAN_WORD)].map((m) => m[0].toLocaleLowerCase("et"));

interface Read {
  readonly phrase: boolean;
  readonly unreachable: readonly string[];
  readonly unvouched: readonly string[];
}

function readSentence(et: string): Read {
  const words = wordsOf(et);
  const unvouched = words.filter((w) => reach.bandOf.get(w) === undefined);
  const unreachable = words.filter((w) => {
    const band = reach.bandOf.get(w);
    return band !== undefined && band > limit;
  });
  return { phrase: !words.some((w) => reach.finite.has(w)), unreachable, unvouched };
}

const plain = (r: Read) => !r.phrase && r.unreachable.length === 0 && r.unvouched.length === 0;

/* ── The reading ──────────────────────────────────────────────────────────── */

const beginner = rows.filter(
  (r) => r.cefr !== null && LEVELS.indexOf(r.cefr as never) >= 0 && LEVELS.indexOf(r.cefr as never) <= limit,
);

let shown = 0;
let phrases = 0;
let outOfReach = 0;
let unvouchable = 0;
let clean = 0;
let stuck = 0;
let words = 0;
const tally = new Map<string, number>();
const worst: { lemma: string; cefr: string; et: string; why: string }[] = [];

for (const row of beginner) {
  const sentences = shownTo(row);
  if (sentences.length === 0) continue;
  shown++;
  const lead = sentences[0]!;
  const read = readSentence(lead);
  words += wordsOf(lead).length;

  if (read.phrase) phrases++;
  if (read.unreachable.length > 0) outOfReach++;
  if (read.unvouched.length > 0) unvouchable++;
  if (plain(read)) { clean++; continue; }

  // Nothing better available is the honest state and is counted apart: it is a
  // gap in what has been recorded, not a choice this app got wrong.
  if (!sentences.some((s) => plain(readSentence(s)))) stuck++;

  for (const w of [...read.unvouched, ...read.unreachable]) tally.set(w, (tally.get(w) ?? 0) + 1);
  worst.push({
    lemma: row.lemma, cefr: row.cefr!, et: lead,
    why: [
      read.phrase ? "no verb" : "",
      read.unvouched.length ? `not in the dictionary: ${read.unvouched.join(", ")}` : "",
      read.unreachable.length ? `above ${PLAIN_UP_TO}: ${read.unreachable.join(", ")}` : "",
    ].filter(Boolean).join("; "),
  });
}

const pct = (n: number) => `${((n / shown) * 100).toFixed(0)}%`;

console.log(
  `Read ${shown.toLocaleString("en-GB")} words banded ${LEVELS[0]} to ${PLAIN_UP_TO} that a screen `
  + `shows a sentence for, out of ${beginner.length.toLocaleString("en-GB")} at those bands.\n`,
);
const line = (label: string, n: number) =>
  console.log(`  ${label.padEnd(44)} ${String(n).padStart(5)}  ${pct(n).padStart(4)}`);
line("reads as a sentence, every word within reach", clean);
line("has no finite verb in it", phrases);
line(`holds a word above ${PLAIN_UP_TO}`, outOfReach);
line("holds a word no entry vouches for", unvouchable);
line("nothing plainer recorded for that word", stuck);
console.log(`  ${"mean length".padEnd(44)} ${(words / shown).toFixed(1).padStart(5)}  words`);

/*
  THE FLOOR IS ON WHAT WAS ASKED, NEVER ON WHAT PASSED. A report that stopped
  producing and a dictionary that got plainer read identically in a percentage,
  and only one of them is news. Four fifths of the 1,336 entries banded A1 or
  A2 in the shipped file, which is what this reaches today.
*/
const FLOOR = 1000;
if (shown < FLOOR) {
  console.error(
    `\nOnly ${shown} words were read, against a floor of ${FLOOR}. Something above stopped `
    + "producing rather than started passing: check that the dictionary loaded.",
  );
  process.exit(1);
}

/* ── The weight sweep (--weights) ─────────────────────────────────────────── */

/**
 * WHAT MOVING A WEIGHT WOULD COST, FOR WHOEVER IS ABOUT TO MOVE ONE.
 *
 * `NO_VERB` trades against length alone, so it has a knee and was swept on its
 * own. The other three trade against each other, and there is no knee in that:
 * every setting buys one fault down by pushing another up.
 *
 * THIS REPORTS AND MAY NOT GATE, and the reason is worth stating because the
 * first version of it did gate and could not fail. It asked whether any other
 * setting beats the shipped one on every axis at once, got "none of 168", and
 * printed that as though it meant something. It does not: detuned to 3/4/2, a
 * setting that takes dead ends from 262 to 346, the answer is still "none of
 * 168", because 3/4/2 is on the frontier too. Nearly every setting is. A check
 * that passes on the thing it was written to catch is the shape
 * `scripts/lib/checks.mjs` gives a suite a floor to prevent, and an exit code
 * on it would be `A || !A` wearing a sweep's clothes.
 *
 * So what it prints is the shape of the trade: the shipped setting, and the
 * best any setting in the grid reaches on each axis alone with what that costs
 * on the others. A reader deciding whether dead ends matter more than phrases
 * can then see the price rather than be told a number is optimal.
 */
if (sweepWeights) {
  interface Axes { deadEnd: number; above: number; verbless: number; len: number }

  // The four facts per sentence, so the grid below is arithmetic and nothing else.
  const facts = new Map<string, { n: number; verb: boolean; un: number; ab: number; c: number }>();
  const pools: string[][] = [];
  for (const row of beginner) {
    const sentences = shownTo(row);
    if (sentences.length === 0) continue;
    pools.push(sentences);
    for (const et of sentences) {
      if (facts.has(et)) continue;
      const read = readSentence(et);
      facts.set(et, {
        n: wordsOf(et).length,
        verb: !read.phrase,
        un: read.unvouched.length,
        ab: read.unreachable.length,
        c: (et.match(/,/g) ?? []).length,
      });
    }
  }

  const score = (nv: number, un: number, ab: number, co: number): Axes => {
    let deadEnd = 0, above = 0, verbless = 0, len = 0;
    for (const sentences of pools) {
      let best = sentences[0]!;
      let bestCost = Infinity;
      for (const et of sentences) {
        const f = facts.get(et)!;
        const cost = f.n + (f.verb ? 0 : nv) + f.un * un + f.ab * ab + f.c * co;
        if (cost < bestCost || (cost === bestCost && et.length < best.length)) {
          best = et;
          bestCost = cost;
        }
      }
      const f = facts.get(best)!;
      if (f.un > 0) deadEnd++;
      if (f.ab > 0) above++;
      if (!f.verb) verbless++;
      len += f.n;
    }
    return { deadEnd, above, verbless, len: len / pools.length };
  };

  const line = (label: string, a: Axes) =>
    `  ${label.padEnd(12)} dead end ${String(a.deadEnd).padStart(3)}   above ${String(a.above).padStart(3)}`
    + `   verbless ${String(a.verbless).padStart(3)}   mean ${a.len.toFixed(2)}`;

  const grid: { label: string; axes: Axes }[] = [];
  for (const un of [2, 4, 6, 8, 10, 12, 16]) {
    for (const ab of [1, 2, 3, 4, 6, 8]) {
      for (const co of [0, 1, 2, 4]) {
        grid.push({ label: `${un}/${ab}/${co}`, axes: score(WEIGHTS.NO_VERB, un, ab, co) });
      }
    }
  }

  const shipped = score(WEIGHTS.NO_VERB, WEIGHTS.UNVOUCHED, WEIGHTS.ABOVE_BAND, WEIGHTS.CLAUSE);
  console.log(`\nWhat the weights buy, over ${pools.length} words and ${grid.length} settings.`);
  console.log(`\nShipped, as unvouched/above/clause with NO_VERB at ${WEIGHTS.NO_VERB}:`);
  console.log(line(`${WEIGHTS.UNVOUCHED}/${WEIGHTS.ABOVE_BAND}/${WEIGHTS.CLAUSE}`, shipped));

  console.log(`\nThe best any setting reaches on one axis, and what it pays elsewhere:`);
  const axes: { name: string; of: (a: Axes) => number }[] = [
    { name: "fewest dead ends", of: (a) => a.deadEnd },
    { name: "fewest above band", of: (a) => a.above },
    { name: "fewest verbless", of: (a) => a.verbless },
    { name: "shortest", of: (a) => a.len },
  ];
  for (const axis of axes) {
    const best = [...grid].sort((x, y) => axis.of(x.axes) - axis.of(y.axes))[0]!;
    console.log(`  ${axis.name}:`);
    console.log(line(best.label, best.axes));
  }
  console.log(
    `\nEvery one of them is worse than the shipped setting somewhere else, which is what a`
    + `\nfrontier looks like and is a weak claim: most settings in this grid are on it. Which`
    + `\nof the four faults matters most is a stated preference, not a number to tune. The`
    + `\nstated one is that a word no entry vouches for costs most, because the learner cannot`
    + `\nlook it up and has nowhere to go, which is the fault that was reported.`,
  );
  process.exit(0);
}

console.log(`\nCommonest spellings a beginner meets and cannot reach:`);
for (const [word, n] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${String(n).padStart(4)} × ${word}`);
}

if (!listWords) {
  console.log(`\n${worst.length} words are still taught with something a beginner cannot read straight through.`);
  console.log("Run with --list for the words themselves.");
  process.exit(0);
}

console.log(`\n${worst.length} words, hardest first:\n`);
for (const w of worst.sort((a, b) => b.why.length - a.why.length)) {
  console.log(`  ${w.cefr} ${w.lemma.padEnd(18)} ${w.et}`);
  console.log(`  ${" ".repeat(21)} ${w.why}`);
}
