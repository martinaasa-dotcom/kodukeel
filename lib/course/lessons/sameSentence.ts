import { fold } from "@/lib/estonian/fold";
import type { Person } from "@/lib/estonian/conjugate";
import { SUBJECT_PRONOUN } from "@/lib/scenes/lexicon";
import { PRONOUN_TWINS } from "./pronounTwins";

/*
  WHETHER A TYPED SENTENCE SAYS WHAT A WRITTEN ONE SAYS, IN ANOTHER SHAPE.

  A rework is marked against the sentences somebody wrote down for it, and no
  list holds every way of saying a thing in Estonian. This decides the shapes
  the marker may vouch for without a list, and it is narrow on purpose, since
  what it calls the same sentence is marked right:

  - `same`: word for word, once a pronoun's long and short spellings are read
    as one word (`mina`, `ma`; `minul`, `mul`: the dictionary's own pairs,
    `pronounTwins.ts`) and `pole`, `poleks`, `polnud` as `ei` and the verb.
  - `pronoun`: a first- or second-person subject left out or put in, where a
    verb beside it says the same person (`Lugesin raamatu läbi`). Never in a
    negative, where `ei lugenud` is every person and the pronoun is what says
    whose, and never a second subject.
  - `order`: the same words in another order inside each clause, or a
    reason or condition moved to the other end with the words of each clause
    the same, which this cannot vouch for and the marker calls nearly. `ei`
    stays in front of its verb, a clause opening on a question word or a
    joining word keeps it first, and a clause opening on `ära` or `ärge`
    keeps that first too. The orders it can vouch for are the dictionary's
    (`lessonOrders` in `lib/estonian/wordOrder.ts`), which need a reading of
    which words are verbs and so are worked out where the lesson is read.

  Every comparison is tried on the words as typed and then with the letters
  with marks on them folded away, and says which (`folded`), so a reordered
  sentence with a dropped õ is nearly rather than wrong.

  Pure: no React, no Next, no Prisma. Every Estonian word it reads is either a
  lemma request (`SUBJECT_PRONOUN`), a form the dictionary stored, or one of
  the short closed lists of joining words below, which are the clause
  boundaries the language itself marks.
*/

/** Which person each finite form taught by now is (`personForms` in `conjugate.ts`), lower-cased. */
export type Persons = Readonly<Record<string, readonly Person[]>>;

export type SameHow = "same" | "pronoun" | "order";

export interface SameSentence {
  readonly how: SameHow;
  /** Only with the letters with marks on them folded away. */
  readonly folded: boolean;
}

/**
 * A closed list of words with their folded spellings beside them, since every
 * comparison here is tried folded too and `või` folds to `voi`: a list that
 * only held the first would quietly stop guarding the folded pass.
 */
const withFolded = (words: readonly string[]): ReadonlySet<string> => new Set(words.flatMap((w) => [w, fold(w)]));

/** Words that open a clause of their own. */
const JOINS = withFolded(["kuigi", "kuna", "sest", "et", "kui", "kuni", "aga", "ja", "ning", "või", "ega", "vaid", "nagu", "kuidas", "miks", "kas", "kus", "kuhu", "kust", "millal"]);
/** A form of `kes` or `mis` opens a relative clause; one ending `-gi` or `-ki` is an indefinite and does not. */
const RELATIVE = /^(?:kes|mis|kelle|mille|keda|mida)\p{L}*$/u;
const INDEFINITE = /(?:gi|ki)$/u;
/** The subordinate clauses that move to the front or the back without changing what is said. */
const FRONTABLE = withFolded(["kuna", "kui", "kuigi", "kuni"]);
/** Words that may stand before a clause's opener without being it. */
const LEADING = withFolded(["ja", "aga", "ning", "või"]);
const NEGATIVE = withFolded(["ei", "ega"]);
const PROHIBITIVE = withFolded(["ära", "ärge"]);
const SHORT_NEGATIVE: Readonly<Record<string, readonly string[]>> = {
  pole: ["ei", "ole"], poleks: ["ei", "oleks"], polnud: ["ei", "olnud"],
};

/** Each spelling of a twinned pronoun form, mapped to its long spelling. */
const LONG_OF = new Map<string, string>();
for (const t of PRONOUN_TWINS) {
  LONG_OF.set(t.short, t.long);
  LONG_OF.set(t.long, t.long);
}

const PERSON_OF_LEMMA: Readonly<Record<string, Person>> = {
  IndPrSg1: "Sg1", IndPrSg2: "Sg2", IndPrSg3: "Sg3", IndPrPl1: "Pl1", IndPrPl2: "Pl2", IndPrPl3: "Pl3",
};

/**
 * The nominative spellings of the six personal pronouns, long and short, with
 * their person. None carries a letter with a mark, so the same table serves a
 * folded comparison.
 */
const SUBJECTS = new Map<string, Person>();
for (const [lemma, code] of Object.entries(SUBJECT_PRONOUN)) {
  const person = PERSON_OF_LEMMA[code]!;
  SUBJECTS.set(lemma, person);
  for (const t of PRONOUN_TWINS) if (t.lemma === lemma && (t.code === "SgN" || t.code === "PlN")) SUBJECTS.set(t.short, person);
}
const DROPPABLE: ReadonlySet<Person> = new Set(["Sg1", "Sg2", "Pl1", "Pl2"]);

const isJoin = (w: string) => JOINS.has(w) || (RELATIVE.test(w) && !INDEFINITE.test(w));

/** The words of a sentence as the marker compares them, and where the punctuation fell. */
interface Words { readonly words: readonly string[]; readonly breaks: ReadonlySet<number> }

function read(text: string, folded: boolean): Words {
  const words: string[] = [];
  const breaks = new Set<number>();
  for (const m of text.matchAll(/\p{L}+|[,;:\u2013\u2014]/gu)) {
    const tok = m[0];
    if (/^[,;:\u2013\u2014]$/u.test(tok)) { breaks.add(words.length); continue; }
    const low = tok.toLocaleLowerCase("et");
    for (const w of SHORT_NEGATIVE[low] ?? [low]) {
      const long = LONG_OF.get(w) ?? w;
      words.push(folded ? fold(long) : long);
    }
  }
  return { words, breaks };
}

/** A sentence cut where a clause starts: at its punctuation, if `punct`, and before a joining word. */
function clauses(s: Words, punct: boolean): string[][] {
  const out: string[][] = [[]];
  s.words.forEach((w, i) => {
    const cur = out[out.length - 1]!;
    const prev = cur[cur.length - 1];
    const boundary = i > 0 && ((punct && s.breaks.has(i)) || (isJoin(w) && !(prev !== undefined && LEADING.has(prev) && cur.length === 1)));
    if (boundary && cur.length > 0) out.push([w]);
    else cur.push(w);
  });
  return out.filter((c) => c.length > 0);
}

const sorted = (ws: readonly string[]) => [...ws].sort().join(" ");

/** What has to stay put inside a clause: its opener, and the word after `ei` or a clause-opening `ära`. */
function anchors(c: readonly string[]): string[] {
  const out: string[] = [];
  const start = LEADING.has(c[0] ?? "") && c.length > 1 ? 1 : 0;
  const first = c[start] ?? "";
  if (isJoin(first) || PROHIBITIVE.has(first)) out.push(`first:${start}:${first}`);
  if (PROHIBITIVE.has(first)) out.push(`after:${first}:${c[start + 1] ?? ""}`);
  c.forEach((w, i) => { if (NEGATIVE.has(w)) out.push(`after:${w}:${c[i + 1] ?? ""}`); });
  return out.sort();
}

/** The same words clause by clause, the clauses in the same order, each clause's anchors kept. */
function sameClauses(a: readonly (readonly string[])[], b: readonly (readonly string[])[]): boolean {
  return a.length === b.length && a.every((c, i) => {
    const d = b[i]!;
    return sorted(c) === sorted(d) && anchors(c).join("|") === anchors(d).join("|");
  });
}

const personsOf = (persons: Persons, w: string, folded: boolean): readonly Person[] => {
  if (!folded) return persons[w] ?? [];
  const hit = Object.entries(persons).find(([k]) => fold(k) === w);
  return hit?.[1] ?? [];
};

/**
 * The index of a first- or second-person subject in `long` whose removal
 * gives `short`, where a verb directly beside it agrees with it and the clause
 * holds no negative and no other subject, or -1.
 */
function droppedPronoun(long: readonly string[], short: readonly string[], persons: Persons, folded: boolean): number {
  if (long.length !== short.length + 1) return -1;
  for (let i = 0; i < long.length; i++) {
    const person = SUBJECTS.get(long[i]!);
    if (!person || !DROPPABLE.has(person)) continue;
    const rest = [...long.slice(0, i), ...long.slice(i + 1)];
    if (rest.join(" ") !== short.join(" ")) continue;
    if (dropAllowed(long, i, person, persons, folded)) return i;
  }
  return -1;
}

function dropAllowed(long: readonly string[], i: number, person: Person, persons: Persons, folded: boolean): boolean {
  const clause = clauses({ words: long, breaks: new Set() }, false).find((c, _, all) => {
    const start = all.slice(0, all.indexOf(c)).reduce((n, x) => n + x.length, 0);
    return i >= start && i < start + c.length;
  }) ?? [];
  if (clause.some((w) => NEGATIVE.has(w) || PROHIBITIVE.has(w))) return false;
  if (clause.filter((w) => SUBJECTS.has(w)).length > 1) return false;
  const beside = [long[i - 1], long[i + 1]].filter((w): w is string => w !== undefined);
  return beside.some((w) => personsOf(persons, w, folded).includes(person));
}

/** Two clauses swapped round, the one led by `kuna`, `kui`, `kuigi` or `kuni` on the other side, each clause's words the same. */
function swappedClauses(a: readonly (readonly string[])[], b: readonly (readonly string[])[]): boolean {
  if (a.length !== 2 || b.length !== 2) return false;
  const sub = (c: readonly string[]) => FRONTABLE.has(c[0] ?? "");
  const [a0, a1] = a as [readonly string[], readonly string[]];
  const [b0, b1] = b as [readonly string[], readonly string[]];
  if (sub(a0) === sub(a1) || sub(b0) === sub(b1) || sub(a0) === sub(b0)) return false;
  return sameClauses([a0, a1], [b1, b0]);
}

function compare(written: string, typed: string, persons: Persons, folded: boolean): SameHow | null {
  const a = read(written, folded);
  const b = read(typed, folded);
  if (a.words.length === 0) return null;
  if (a.words.join(" ") === b.words.join(" ")) return "same";
  const drop = a.words.length > b.words.length
    ? droppedPronoun(a.words, b.words, persons, folded)
    : droppedPronoun(b.words, a.words, persons, folded);
  if (drop >= 0) return "pronoun";
  // Punctuation is a boundary only where both have the same amount of it, so a missing comma is never stricter.
  const punct = a.breaks.size === b.breaks.size;
  const ca = clauses(a, punct);
  const cb = clauses(b, punct);
  if (a.words.length === b.words.length && a.words.length >= 2 && (sameClauses(ca, cb) || swappedClauses(ca, cb))) return "order";
  // A pronoun left out or put in, and the rest reordered.
  const [long, short] = a.words.length > b.words.length ? [a, b] : [b, a];
  if (long.words.length === short.words.length + 1) {
    for (let i = 0; i < long.words.length; i++) {
      const person = SUBJECTS.get(long.words[i]!);
      if (!person || !DROPPABLE.has(person) || !dropAllowed(long.words, i, person, persons, folded)) continue;
      const rest = { words: [...long.words.slice(0, i), ...long.words.slice(i + 1)], breaks: long.breaks };
      if (sameClauses(clauses(rest, punct), clauses(short, punct))) return "order";
    }
  }
  return null;
}

/** How `typed` says what `written` says, or null where it does not, as far as this can tell. */
export function sameSentence(written: string, typed: string, persons: Persons): SameSentence | null {
  const exact = compare(written, typed, persons, false);
  if (exact) return { how: exact, folded: false };
  const folded = compare(written, typed, persons, true);
  return folded ? { how: folded, folded: true } : null;
}
