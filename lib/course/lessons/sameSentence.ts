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
  - `pronoun`: a first- or second-person subject left out or put in beside a
    verb of its person, which is next to that verb or at the start of its
    clause (`Lugesin raamatu läbi`, `Ma lugesin raamatu läbi`, `Lugesin ma
    raamatu läbi`; never `Lugesin raamatu ma läbi`). Never in a negative,
    where `ei lugenud` is every person and the pronoun is what says whose,
    never in a command opening on `ära`, never twice, and never a second
    subject; put in only beside a form of that one person, and never beside a
    have-possessor (`dropAllowed`). A clause ends at a comma, a full stop, a
    question or an exclamation mark, and at a joining word, so `Ma tean.
    Kontrollin seda.` drops one pronoun from one clause.
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
  `20 sõnumit` and `5 sõnumit` are two sentences, and a count from two to ten
  is its word (`2 kuud` is `kaks kuud`, never `kolm kuud`; `COUNT_WORD`).

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

/** The person of a personal pronoun in the nominative, long or short (`mina`, `ma`), or undefined for any other word. */
export const subjectPerson = (word: string): Person | undefined => SUBJECTS.get(word.toLocaleLowerCase("et"));

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

/**
 * A count from two to ten said in digits, as the word it is when it stands in
 * the nominative (`2 kuud`, `kaks kuud`). Only those: `üks` is also "a" and
 * "one" of a pair, and a number in any other case (`kahe`, `kolmele`) is a
 * different word from the digit's, so it stays a digit and stays unequal.
 */
const COUNT_WORD: Readonly<Record<string, string>> = {
  2: "kaks", 3: "kolm", 4: "neli", 5: "viis", 6: "kuus", 7: "seitse", 8: "kaheksa", 9: "üheksa", 10: "kümme",
};

/**
 * Whether a full stop between these two words makes a number an ordinal
 * rather than ending a sentence: digits before it and a word in lower case
 * after it (`2025. aastal`, `12. märts`). `own.ts` cuts a draft by it too.
 */
export const isOrdinalStop = (before: string, after: string): boolean => /^\p{N}+$/u.test(before) && /^\p{Ll}/u.test(after);

function read(text: string, folded: boolean): Words {
  const words: string[] = [];
  const breaks = new Set<number>();
  const toks = [...text.matchAll(TOKEN)].map((m) => m[0]);
  toks.forEach((tok, t) => {
    if (BREAK.test(tok)) {
      if (!(tok === "." && isOrdinalStop(toks[t - 1] ?? "", toks[t + 1] ?? ""))) breaks.add(words.length);
      return;
    }
    // A digit before the stop of an ordinal (`2. mail`) is not a count.
    const count = toks[t + 1] === "." && isOrdinalStop(tok, toks[t + 2] ?? "") ? undefined : COUNT_WORD[tok];
    for (const w of count ? [count] : spokenWords(tok)) words.push(folded ? fold(w) : w);
  });
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
 * Whether the pronoun at `j` of a clause is a subject: a verb beside it in the
 * clause says its person, or nothing beside it is a verb this can read. One
 * beside a verb naming another person, with no verb of its own, is a
 * possessive, so `teie` in `Ma ootan teie vastust` is not a second subject.
 * Only inside the clause: `Kus sa oled? Ma ...` has a full stop between `oled`
 * and `Ma`, and reading across it made the second word nobody's.
 */
function isSubjectAt(clause: readonly string[], j: number, persons: Persons, folded: boolean): boolean {
  const person = SUBJECTS.get(clause[j]!);
  if (!person) return false;
  const beside = [clause[j - 1], clause[j + 1]].filter((w): w is string => w !== undefined).map((w) => personsOf(persons, w, folded));
  return beside.some((ps) => ps.includes(person)) || beside.every((ps) => ps.length === 0);
}

/** A pronoun in the adessive, the `mul` of `mul on`: the clause's have-possessor, which leaves no room for a subject. */
const HAVE_POSSESSOR = withFolded(["mul", "sul", "tal", "meil", "teil", "neil", "minul", "sinul", "temal", "nendel"]);

/** Where a clause's own words begin, past a leading `ja` and a joining word. */
function clauseStart(clause: readonly string[]): number {
  let k = 0;
  if (LEADING.has(clause[k] ?? "") && clause.length > 1) k++;
  if (isJoin(clause[k] ?? "")) k++;
  return k;
}

/**
 * Whether the pronoun at `i` may be left out (`added` false) or put in
 * (`added` true). Only BESIDE a verb of its person (docs/43 §11.2): directly
 * next to that verb, or at the clause's start (`Ma siis kirjutan`, `et sa seda
 * nägid`), never in the middle (`Lugesin raamatu ma läbi`). Never in a clause
 * with a negative or opening on `ära`, where the verb is every person; never
 * beside the same pronoun again (`Ma ma ootan`); never with another subject.
 * An `ära` after the verb is the particle of `pesin ära` and says nothing.
 *
 * PUT IN IS STRICTER THAN LEFT OUT. A form shared by several persons (`oleks`
 * is all of them, `olid` you and they) says the person of a pronoun that is
 * there and cannot say which one a learner adds, so only a form of that one
 * person licenses an added pronoun; and a clause holding a have-possessor
 * (`Kui mul oleks auto`) takes none.
 */
function dropAllowed(s: Words, i: number, person: Person, persons: Persons, folded: boolean, added: boolean): boolean {
  const { words: clause, start } = clauseAt(s, i);
  const k = i - start;
  // The clause read without the pronoun, so `Sa ära mine` is still a command opening on `ära`.
  const rest = clause.filter((_, m) => m !== k);
  const opener = rest[LEADING.has(rest[0] ?? "") && rest.length > 1 ? 1 : 0] ?? "";
  if (clause.some((w) => NEGATIVE.has(w)) || PROHIBITIVE.has(opener)) return false;
  for (let m = 0; m < clause.length; m++) {
    if (m === k) continue;
    if (Math.abs(m - k) === 1 && SUBJECTS.get(clause[m]!) === person) return false;
    if (isSubjectAt(clause, m, persons, folded)) return false;
  }
  if (added && rest.some((w) => HAVE_POSSESSOR.has(w))) return false;
  const licenses = (w: string | undefined) => {
    if (w === undefined) return false;
    const ps = personsOf(persons, w, folded);
    return added ? ps.length === 1 && ps[0] === person : ps.includes(person);
  };
  if (!rest.some(licenses)) return false;
  return k === clauseStart(clause) || licenses(clause[k - 1]) || licenses(clause[k + 1]);
}

/**
 * The index of a first- or second-person subject in `long` whose removal
 * gives `short`, where `dropAllowed` lets it go, or -1. `added` says the
 * longer one is the sentence typed.
 */
function droppedPronoun(long: Words, short: Words, persons: Persons, folded: boolean, added: boolean): number {
  if (long.words.length !== short.words.length + 1) return -1;
  for (let i = 0; i < long.words.length; i++) {
    const person = SUBJECTS.get(long.words[i]!);
    if (!person || !DROPPABLE.has(person)) continue;
    const rest = [...long.words.slice(0, i), ...long.words.slice(i + 1)];
    if (rest.join(" ") !== short.words.join(" ")) continue;
    if (dropAllowed(long, i, person, persons, folded, added)) return i;
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
  const added = b.words.length > a.words.length;
  const drop = added ? droppedPronoun(b, a, persons, folded, true) : droppedPronoun(a, b, persons, folded, false);
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
      if (!person || !DROPPABLE.has(person) || !dropAllowed(long, i, person, persons, folded, added)) continue;
      const cr = clauses(without(long, i), punct);
      const cs = clauses(short, punct);
      if (sameClauses(cr, cs) || swappedClauses(cr, cs)) return "order";
    }
  }
  return null;
}

/*
  TWO ACCEPTED CHANGES AT ONCE. A rework lists the sentence it wants (`to`)
  and the other ways of saying it a native speaker accepts (`also`), and each
  of those is usually one change to `to`: `Ma olin pileti koju ära unustanud`
  adds `ära`, `Ma olin selle koju unustanud` says `selle` for `pileti`. A
  learner who makes both (`Ma olin selle koju ära unustanud`) has said
  something both rows vouch for, so it is right, and no list can hold every
  pair. A change is a hunk of a word-by-word diff against `to` (`hunksOf`); a
  combination takes every hunk of up to three accepted rows whose hunks touch
  different words, so a reordering row (whose hunks are a word taken out in
  one place and put in at another) is only ever used whole.

  And a demonstrative standing for a noun says which one, so where a row says
  `selle` for `raamatu`, `selle raamatu` is right too (`Ma lugesin selle
  raamatu läbi`): the demonstrative the row uses, in the case it uses it, put
  in front of the words it replaced. A different case (`seda raamatu`) is
  nothing a row vouches for, and stays wrong.
*/

/** The forms of `see` and `need`, which stand before a noun to say which one. */
const DEMONSTRATIVE = withFolded([
  "see", "selle", "seda", "sellesse", "selles", "sellest", "sellele", "sellel", "sellelt", "selleks", "selleni", "sellena", "selleta", "sellega",
  "need", "nende", "neid", "nendesse", "nendes", "nendest", "nendele", "nendel", "nendelt", "nendeks", "nendeni", "nendena", "nendeta", "nendega",
  "neisse", "neis", "neist", "neile", "neil", "neilt",
]);

/** A run of `to` from `start` to `end` (half-open) said as `put` instead. */
interface Hunk { readonly start: number; readonly end: number; readonly put: readonly string[] }

/** A sentence as the diff reads it: each word as the markers read it, and its punctuation as tokens of its own. */
function tokensOf(text: string): string[] {
  return [...text.matchAll(TOKEN)].flatMap((m) => (BREAK.test(m[0]) ? [m[0]] : spokenWords(m[0])));
}

/** The hunks that turn `a` into `b`, off a longest common subsequence of their tokens. */
function hunksOf(a: readonly string[], b: readonly string[]): Hunk[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  }
  const out: Hunk[] = [];
  let i = 0;
  let j = 0;
  let open: { start: number; put: string[] } | null = null;
  const close = (end: number) => { if (open) out.push({ start: open.start, end, put: open.put }); open = null; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { close(i); i++; j++; continue; }
    open ??= { start: i, put: [] };
    if (j < m && (i === n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) { open.put.push(b[j]!); j++; } else i++;
  }
  close(i);
  return out;
}

const hunkKey = (h: Hunk) => `${h.start}:${h.end}:${h.put.join(" ")}`;

/** Whether two hunks change the same words, or put words in at the same place. A hunk shared word for word is not a clash. */
function clash(x: Hunk, y: Hunk): boolean {
  if (hunkKey(x) === hunkKey(y)) return false;
  if (x.start === x.end && y.start === y.end) return x.start === y.start;
  return x.start < y.end && y.start < x.end;
}

function applyHunks(a: readonly string[], hunks: readonly Hunk[]): string[] {
  const unique = [...new Map(hunks.map((h) => [hunkKey(h), h] as const)).values()]
    .sort((x, y) => x.start - y.start || (x.end - x.start) - (y.end - y.start));
  const out: string[] = [];
  let at = 0;
  for (const h of unique) {
    out.push(...a.slice(at, h.start), ...h.put);
    at = h.end;
  }
  out.push(...a.slice(at));
  return out;
}

/** A row's one-word demonstrative for one to three words of `to`, put in front of those words instead (`selle raamatu`). */
function withDemonstrative(a: readonly string[], hunks: readonly Hunk[], persons: Persons): Hunk[] {
  return hunks.flatMap((h) => {
    const replaced = a.slice(h.start, h.end);
    const ok = h.put.length === 1 && DEMONSTRATIVE.has(h.put[0]!) && replaced.length >= 1 && replaced.length <= 3
      && replaced.every((w) => !BREAK.test(w) && !DEMONSTRATIVE.has(w) && !SUBJECTS.has(w) && (persons[w] ?? []).length === 0);
    return ok ? [{ start: h.start, end: h.end, put: [h.put[0]!, ...replaced] }] : [];
  });
}

/** How many accepted rows a combination takes at most. */
const MOST_COMBINED = 3;

/**
 * Sentences two or three of a rework's accepted rows vouch for together, and
 * each row's demonstrative put before the noun it stands for, as text the
 * marker reads like any accepted sentence. None of them is a row already.
 */
export function combinedSentences(to: string, also: readonly string[], persons: Persons): string[] {
  const a = tokensOf(to);
  const rows = also.map((v) => hunksOf(a, tokensOf(v))).filter((hs) => hs.length > 0);
  const demonstratives = rows.flatMap((hs) => withDemonstrative(a, hs, persons).map((h) => [h]));
  const sets = [...rows, ...demonstratives];
  const out = new Set<string>(demonstratives.map((hs) => applyHunks(a, hs).join(" ")));
  const fits = (chosen: readonly Hunk[], more: readonly Hunk[]) => more.every((h) => chosen.every((c) => !clash(c, h)));
  const walk = (from: number, chosen: readonly Hunk[], count: number) => {
    if (count >= 2) out.add(applyHunks(a, chosen).join(" "));
    if (count === MOST_COMBINED) return;
    for (let k = from; k < sets.length; k++) if (fits(chosen, sets[k]!)) walk(k + 1, [...chosen, ...sets[k]!], count + 1);
  };
  walk(0, [], 0);
  /* Two rows can each put the same word in at a different place (`Ma kahjuks
     ei saa`, `Kahjuks ei saa ma`), and both at once is that word twice. So a
     combination holds no word more often than `to` or some one row holds it. */
  const rowsAll = [to, ...also].map(tokensOf);
  const most = new Map<string, number>();
  for (const row of rowsAll) {
    const counts = new Map<string, number>();
    for (const w of row) counts.set(w, (counts.get(w) ?? 0) + 1);
    for (const [w, n] of counts) most.set(w, Math.max(most.get(w) ?? 0, n));
  }
  const noneTwice = (s: string) => {
    const counts = new Map<string, number>();
    for (const w of s.split(" ")) counts.set(w, (counts.get(w) ?? 0) + 1);
    return [...counts].every(([w, n]) => BREAK.test(w) || n <= (most.get(w) ?? 0));
  };
  const listed = new Set(rowsAll.map((r) => r.join(" ")));
  return [...out].filter((s) => !listed.has(s) && noneTwice(s));
}

/** How `typed` says what `written` says, or null where it does not, as far as this can tell. */
export function sameSentence(written: string, typed: string, persons: Persons): SameSentence | null {
  const exact = compare(written, typed, persons, false);
  if (exact) return { how: exact, folded: false };
  const folded = compare(written, typed, persons, true);
  return folded ? { how: folded, folded: true } : null;
}
