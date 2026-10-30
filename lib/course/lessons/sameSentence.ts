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
    `pronounTwins.ts`) and `pole`, `poleks`, `polnud` as `ei` and the verb
    (`spokenWords`, which `markPhrase` reads words by too).
  - `pronoun`: a first- or second-person subject left out or put in, where a
    verb in its clause says the same person (`Lugesin raamatu läbi`). Never in a
    negative, where `ei lugenud` is every person and the pronoun is what says
    whose, never in a command opening on `ära`, and never a second subject. A
    clause ends at a comma, a full stop, a question or an exclamation mark,
    and at a joining word, so `Ma tean. Kontrollin seda.` drops one pronoun
    from one clause.
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
  sentence with a dropped õ is nearly rather than wrong. Digits are words:
  `20 sõnumit` and `5 sõnumit` are two sentences.

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
/**
 * A case of `kes` or `mis` opens a relative clause. The cases are written out,
 * since a prefix rule reads `kesklinnas` as one; a form ending `-gi` or `-ki`
 * (`keegi`, `midagi`) is an indefinite, matches none of these, and does not.
 */
export const RELATIVE = /^(?:kes|mis|keda|mida|(?:kelle|mille)(?:l|le|lt|s|sse|st|ga|ks|ni|na|ta|de)?|milline|millised|millist|milliseid|millise\p{L}*|missugune|missugused|missugust|missuguseid|missuguse\p{L}*|mispärast)$/u;
/** The subordinate clauses that move to the front or the back without changing what is said. */
export const FRONTABLE = withFolded(["kuna", "kui", "kuigi", "kuni"]);
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

const isJoin = (w: string) => JOINS.has(w) || RELATIVE.test(w);

/**
 * One typed word as the markers read it: lower-cased, a pronoun's short
 * spelling as its long one (D1), and `pole`, `poleks`, `polnud` as `ei` and the
 * verb. `markPhrase` reads words this way too, so it and `markRework` cannot
 * disagree about whether `Mina ei saa aru` is `Ma ei saa aru`.
 */
export function spokenWords(word: string): string[] {
  const low = word.toLocaleLowerCase("et");
  return (SHORT_NEGATIVE[low] ?? [low]).map((w) => LONG_OF.get(w) ?? w);
}

/** A phrase as the markers compare it: its words read by `spokenWords`, joined by single spaces. */
export function spokenPhrase(text: string): string {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].flatMap((m) => spokenWords(m[0])).join(" ");
}

/** The words of a sentence as the marker compares them, and where the punctuation fell. */
interface Words { readonly words: readonly string[]; readonly breaks: ReadonlySet<number> }

/**
 * A word or a number, or the punctuation a clause ends at: a comma, a colon,
 * a dash, a full stop, a question mark or an exclamation mark, except the
 * stop that makes a number an ordinal (`1930. aastal`).
 */
const TOKEN = /[\p{L}\p{N}]+|[,;:.!?\u2013\u2014]/gu;
const BREAK = /^[,;:.!?\u2013\u2014]$/u;

function read(text: string, folded: boolean): Words {
  const words: string[] = [];
  const breaks = new Set<number>();
  let last = "";
  for (const m of text.matchAll(TOKEN)) {
    const tok = m[0];
    if (BREAK.test(tok)) {
      if (!(tok === "." && /^\p{N}+$/u.test(last))) breaks.add(words.length);
    } else {
      for (const w of spokenWords(tok)) words.push(folded ? fold(w) : w);
    }
    last = tok;
  }
  // A break after the last word ends the sentence rather than a clause in it.
  breaks.delete(words.length);
  breaks.delete(0);
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

/** The clause of `s` that word `i` is in, cut at its punctuation and its joining words. */
function clauseAt(s: Words, i: number): { readonly words: readonly string[]; readonly start: number } {
  let start = 0;
  for (const c of clauses(s, true)) {
    if (i < start + c.length) return { words: c, start };
    start += c.length;
  }
  return { words: [], start: 0 };
}

/**
 * Whether the pronoun at `j` is a subject: a verb beside it says its person,
 * or nothing beside it is a verb this can read. One beside a verb naming
 * another person, with no verb of its own, is a possessive, so `teie` in
 * `Ma ootan teie vastust` is not a second subject.
 */
function isSubjectAt(words: readonly string[], j: number, persons: Persons, folded: boolean): boolean {
  const person = SUBJECTS.get(words[j]!);
  if (!person) return false;
  const beside = [words[j - 1], words[j + 1]].filter((w): w is string => w !== undefined).map((w) => personsOf(persons, w, folded));
  return beside.some((ps) => ps.includes(person)) || beside.every((ps) => ps.length === 0);
}

/**
 * Whether the pronoun at `i` may be left out: no negative in its clause and no
 * clause-opening `ära`, no other subject, and a verb in its clause that agrees
 * with it. In one clause with one subject that verb is the pronoun's own, so
 * `et seda nägid` drops the `sa` of `et sa seda nägid` with `seda` between. An
 * `ära` after the verb is the particle of `pesin ära` and says nothing about
 * the person.
 */
function dropAllowed(s: Words, i: number, person: Person, persons: Persons, folded: boolean): boolean {
  const { words: clause, start } = clauseAt(s, i);
  // The clause read without the pronoun, so `Sa ära mine` is still a command opening on `ära`.
  const rest = clause.filter((_, k) => start + k !== i);
  const opener = rest[LEADING.has(rest[0] ?? "") && rest.length > 1 ? 1 : 0] ?? "";
  if (clause.some((w) => NEGATIVE.has(w)) || PROHIBITIVE.has(opener)) return false;
  if (clause.some((_, k) => start + k !== i && isSubjectAt(s.words, start + k, persons, folded))) return false;
  return rest.some((w) => personsOf(persons, w, folded).includes(person));
}

/**
 * The index of a first- or second-person subject in `long` whose removal
 * gives `short`, where a verb in its clause agrees with it and the clause
 * holds no negative and no other subject, or -1.
 */
function droppedPronoun(long: Words, short: Words, persons: Persons, folded: boolean): number {
  if (long.words.length !== short.words.length + 1) return -1;
  for (let i = 0; i < long.words.length; i++) {
    const person = SUBJECTS.get(long.words[i]!);
    if (!person || !DROPPABLE.has(person)) continue;
    const rest = [...long.words.slice(0, i), ...long.words.slice(i + 1)];
    if (rest.join(" ") !== short.words.join(" ")) continue;
    if (dropAllowed(long, i, person, persons, folded)) return i;
  }
  return -1;
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

/** `s` with word `i` taken out, its punctuation after it moved up one place with it. */
function without(s: Words, i: number): Words {
  return {
    words: [...s.words.slice(0, i), ...s.words.slice(i + 1)],
    breaks: new Set([...s.breaks].map((b) => (b > i ? b - 1 : b))),
  };
}

function compare(written: string, typed: string, persons: Persons, folded: boolean): SameHow | null {
  const a = read(written, folded);
  const b = read(typed, folded);
  if (a.words.length === 0) return null;
  if (a.words.join(" ") === b.words.join(" ")) return "same";
  const drop = a.words.length > b.words.length
    ? droppedPronoun(a, b, persons, folded)
    : droppedPronoun(b, a, persons, folded);
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
      if (!person || !DROPPABLE.has(person) || !dropAllowed(long, i, person, persons, folded)) continue;
      const cr = clauses(without(long, i), punct);
      const cs = clauses(short, punct);
      if (sameClauses(cr, cs) || swappedClauses(cr, cs)) return "order";
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
