/**
 * EVERY SENTENCE THE MARKER'S GENERAL RULES ACCEPT ON THE REAL LESSONS, LISTED.
 *
 * The rules in `sameSentence.ts` vouch for sentences nobody wrote down: two
 * accepted changes made at once, a demonstrative put before the noun a row
 * lets it stand for, a pronoun put in beside its verb, and a word swapped for
 * a parallel form the dictionary files under the same headword. A rule like
 * that is only as narrow as what it accepts on the sentences the course
 * actually has, and twice a round of fixes widened one past what anybody had
 * read. So this lists what they accept, the same way the auditors' probes did,
 * and `sweep.test.ts` holds the list to the one in
 * `fixtures/accepted.json`: a rule that starts accepting more, or a lesson
 * row that hands it something new to accept, fails until somebody has read
 * the new lines and written the list again (`npx tsx scripts/sweep-acceptance.ts --write`).
 *
 * Pure: no React, no Prisma. Reads the lessons and the marker, nothing else.
 */
import { LESSONS } from "./index";
import { ledgersBefore, lessonRank, teach } from "./ledger";
import { NOTES, fixItem, markRework, reworkItem, type PracticeItem } from "./practice";
import { combinedSentences } from "./sameSentence";
import { PARALLEL_FORMS } from "./parallelForms";

type Changed = Extract<PracticeItem, { kind: "rework" | "fix" }>;

export interface AcceptSweep {
  /** Every sentence `combinedSentences` makes, as `lesson R<n> | sentence`. */
  readonly combined: readonly string[];
  /** Every pronoun put in, alone or with a stop or a comma after it, that is marked right with the pronoun note. */
  readonly insertions: readonly string[];
  /** Every accepted sentence with one word swapped for its parallel form, and how it is marked. */
  readonly parallels: readonly string[];
  /** How many typed sentences the insertion pass tried. */
  readonly tried: number;
}

/** The pronouns a learner puts in. Short only, since the marker reads `mina` as `ma` and the long ones would be the same sentences twice. */
const PUT = ["ma", "sa", "me", "te"];

/** What comes after a pronoun put in: nothing, a full stop or a comma, which is where a pronoun doubled across punctuation hid. */
const AFTER = ["", ".", ","];

function itemsOf(): { id: string; item: Changed }[] {
  const before = ledgersBefore(LESSONS);
  return LESSONS.flatMap((lesson) => {
    const taught = teach(before.get(lesson.id)!, lesson.teaches, lessonRank(lesson), lesson.patterns);
    return [
      ...(lesson.reworks ?? []).map((r, i) => ({ id: `${lesson.id} R${i + 1}`, item: reworkItem(r, taught) as Changed })),
      ...(lesson.fixes ?? []).map((f, i) => ({ id: `${lesson.id} F${i + 1}`, item: fixItem(f, taught) as Changed })),
    ];
  });
}

const capital = (w: string) => w.charAt(0).toLocaleUpperCase("et") + w.slice(1);
const lower = (w: string) => w.charAt(0).toLocaleLowerCase("et") + w.slice(1);

/** The parallel forms of the table, read both ways, lower-cased. */
function parallelsOf(word: string): string[] {
  const low = word.toLocaleLowerCase("et");
  const out = new Set<string>();
  for (const [long, stored] of Object.entries(PARALLEL_FORMS)) {
    if (long === low) out.add(stored);
    if (stored === low) out.add(long);
  }
  return [...out];
}

export function sweepAcceptance(): AcceptSweep {
  const combined: string[] = [];
  const insertions: string[] = [];
  const parallels: string[] = [];
  let tried = 0;
  for (const { id, item } of itemsOf()) {
    if (item.kind === "rework") {
      for (const s of combinedSentences(item.answer, item.accept.slice(1), item.persons)) combined.push(`${id} | ${s}`);
    }
    const seen = new Set<string>();
    for (const sentence of item.accept) {
      const toks = sentence.split(" ");
      for (let i = 0; i <= toks.length; i++) {
        for (const p of PUT) {
          for (const after of AFTER) {
            const put = `${i === 0 ? capital(p) : p}${after}`;
            const rest = i === 0 ? [lower(toks[0] ?? ""), ...toks.slice(1)] : toks.slice(i);
            const typed = [...toks.slice(0, i), put, ...rest].filter(Boolean).join(" ");
            if (seen.has(typed)) continue;
            seen.add(typed);
            tried++;
            const m = markRework(typed, item);
            if (m.verdict === "right" && m.note === NOTES.pronoun) insertions.push(`${id} | ${typed}`);
          }
        }
      }
      // Each word swapped for its parallel form, one at a time.
      toks.forEach((tok, i) => {
        const bare = tok.replace(/[^\p{L}]/gu, "");
        for (const other of parallelsOf(bare)) {
          const swapped = toks.map((t, j) => (j === i ? t.replace(bare, /^\p{Lu}/u.test(bare) ? capital(other) : other) : t)).join(" ");
          const m = markRework(swapped, item);
          parallels.push(`${id} | ${swapped} | ${m.verdict}`);
        }
      });
    }
  }
  const sorted = (xs: readonly string[]) => [...new Set(xs)].sort();
  return { combined: sorted(combined), insertions: sorted(insertions), parallels: sorted(parallels), tried };
}
