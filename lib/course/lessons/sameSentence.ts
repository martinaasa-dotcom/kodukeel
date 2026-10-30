import { fold } from "@/lib/estonian/fold";
import type { Person } from "@/lib/estonian/conjugate";
import { SUBJECT_PRONOUN } from "@/lib/scenes/lexicon";
import { PRONOUN_TWINS } from "./pronounTwins";
import { PARALLEL_FORMS } from "./parallelForms";

/*
  WHETHER A TYPED SENTENCE SAYS WHAT A WRITTEN ONE SAYS, IN ANOTHER SHAPE.

  A rework is marked against the sentences somebody wrote down for it, and no
  list holds every way of saying a thing in Estonian. This decides the shapes
  the marker may vouch for without a list, and it is narrow on purpose, since
  what it calls the same sentence is marked right:

  - `same`: word for word, once a pronoun's long and short spellings are read
    as one word (`mina`, `ma`; `minul`, `mul`: the dictionary's own pairs,
    `pronounTwins.ts`), `pole`, `poleks`, `polnud` as `ei` and the verb, and
    a plural partitive's two spellings as one (`mune`, `munasid`: the
    parallel forms the dictionary files under one headword in one slot,
    `parallelForms.ts`), which is `spokenWords`, the reading `markPhrase`
    takes too.
  - `pronoun`: a first- or second-person subject left out or put in beside a
    verb of its person, which is next to that verb or at the start of its
    clause (`Lugesin raamatu läbi`, `Ma lugesin raamatu läbi`, `Lugesin ma
    raamatu läbi`; never `Lugesin raamatu ma läbi`). Never in a negative,
    where `ei lugenud` is every person and the pronoun is what says whose,
    never in a command opening on `ära`, never twice, never a second subject,
    and put in only beside a form of that one person (`dropAllowed`). A clause
    ends at a comma, a full stop, a question or an exclamation mark, and at a
    joining word, so `Ma tean. Kontrollin seda.` drops one pronoun from one
    clause; and the sentence typed may leave out punctuation the written one
    has but never adds any, so `Ma. Ma lugesin` and `Lugesin ma, raamatu läbi`
    are not a pronoun put in (`breaksKept`).
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
  is its word (`2 kuud` is `kaks kuud`, never `kolm kuud`; `COUNT_WORD`). A
  time or a date is one word with its stops inside it (`14.30`,
  `12.03.2025`), so neither ends a clause.

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
 * spelling as its long one (D1), `pole`, `poleks`, `polnud` as `ei` and the
 * verb, and a parallel form as the spelling the dictionary stores
 * (`munasid` as `mune`). `markPhrase` reads words this way too, so it and
 * `markRework` cannot disagree about whether `Mina ei saa aru` is `Ma ei saa aru`.
 */
export function spokenWords(word: string): string[] {
  const low = word.toLocaleLowerCase("et");
  return (SHORT_NEGATIVE[low] ?? [low]).map((w) => PARALLEL_FORMS[w] ?? LONG_OF.get(w) ?? w);
}

/** Each parallel form folded, mapped to its stored spelling folded, so `ounasid` reads as `ounu` once the marks are gone. */
const FOLDED_PARALLEL = new Map(Object.entries(PARALLEL_FORMS).map(([long, stored]) => [fold(long), fold(stored)] as const));

/** A word already folded, with a parallel form's folded spelling read as the stored one's. */
const foldedWord = (w: string): string => { const f = fold(w); return FOLDED_PARALLEL.get(f) ?? f; };

/** A phrase read by `spokenPhrase` with its marks folded away, a parallel form folded to its stored spelling too. */
export function foldedPhrase(spoken: string): string {
  return spoken.split(" ").map(foldedWord).join(" ");
}

/**
 * A phrase as the markers compare it: its words read by `spokenWords`, a count
 * from two to ten in digits as its word, joined by single spaces. The words of
 * `read`, so `markPhrase` and `markRework` read `2 kuud` alike.
 */
export function spokenPhrase(text: string): string {
  return read(text, false).words.join(" ");
}

/** The words of a sentence as the marker compares them, and where the punctuation fell. */
interface Words { readonly words: readonly string[]; readonly breaks: ReadonlySet<number> }

/**
 * A word or a number, or the punctuation a clause ends at: a comma, a colon,
 * a dash, a full stop, a question mark or an exclamation mark, except the
 * stop that makes a number an ordinal (`1930. aastal`). A time, a date or a
 * decimal is one number with its stops inside it (`14.30`, `12.03.2025`,
 * `2,5`), never a number, a break and another number.
 */
const TOKEN = /\p{N}+(?:[.:,]\p{N}+)+|[\p{L}\p{N}]+|[,;:.!?\u2013\u2014]/gu;
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

/** `read`'s answers, since the marker reads every accepted sentence again for every answer typed. */
const READ = new Map<string, Words>();
const READ_HELD = 4000;

function read(text: string, folded: boolean): Words {
  const key = `${folded ? 1 : 0}${text}`;
  const held = READ.get(key);
  if (held) return held;
  const made = readUncached(text, folded);
  if (READ.size >= READ_HELD) READ.clear();
  READ.set(key, made);
  return made;
}

function readUncached(text: string, folded: boolean): Words {
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
    for (const w of count ? [count] : spokenWords(tok)) words.push(folded ? foldedWord(w) : w);
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
 * with another subject in its clause, which is also what refuses the same
 * pronoun twice (`Ma ma ootan`: the other copy is a subject beside its verb).
 * An `ära` after the verb is the particle of `pesin ära` and says nothing.
 *
 * PUT IN IS STRICTER THAN LEFT OUT. A form shared by several persons (`oleks`
 * is all of them, `olid` you and they) says the person of a pronoun that is
 * there and cannot say which one a learner adds, so only a form of that one
 * person licenses an added pronoun. That is also what keeps one out of a
 * have-clause (`Kui mul oleks auto`): its verb is the third person or every
 * person, never a form of one first or second person, so no guard of its own
 * is needed and none is kept.
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
    if (isSubjectAt(clause, m, persons, folded)) return false;
  }
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
    if (!breaksKept(long, i, short, added)) continue;
    if (dropAllowed(long, i, person, persons, folded, added)) return i;
  }
  return -1;
}

/**
 * Whether the sentence typed, with the pronoun at `i` of `long` taken out where
 * it was put in, holds only punctuation the written one has. Leaving a comma
 * out is a learner's ordinary slip and costs nothing; a stop or a comma the
 * written sentence does not have, beside a pronoun put in, is the pronoun said
 * a second time across it (`Ma. Ma lugesin`, `Ma, ma lugesin`) or a clause cut
 * in two (`Lugesin ma, raamatu läbi`), and is never the same sentence. A break
 * left before the first word or after the last once the pronoun is out (`Ma.`
 * on its own) counts as added too.
 */
function breaksKept(long: Words, i: number, short: Words, added: boolean): boolean {
  const cut = without(long, i).breaks;
  const [typed, written] = added ? [cut, short.breaks] : [short.breaks, cut];
  return [...typed].every((b) => written.has(b));
}

/** `breaksKept` for a sentence that is reordered too, where the breaks move with the words: no more of them than the written one has. */
function breaksNoMore(long: Words, i: number, short: Words, added: boolean): boolean {
  const cut = without(long, i).breaks;
  return added ? cut.size <= short.breaks.size : short.breaks.size <= cut.size;
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
      if (!person || !DROPPABLE.has(person) || !breaksNoMore(long, i, short, added) || !dropAllowed(long, i, person, persons, folded, added)) continue;
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
  pair. A change is a hunk of a word-by-word diff against `to` (`hunksOf`).

  NARROW ON PURPOSE, because a combination is marked right with no note and
  nobody wrote it down. Round 2 combined any hunks that touched different
  words and three faults came of it: a word put in directly in front of a word
  another row replaced (`oma selle tagasi`, a modifier left without its
  noun), two reordering rows mixed into a sentence neither holds (`Telefon see
  ei tööta`), and a demonstrative put in front of a verb. So a row is combined
  only where (`combinable`):

  - every hunk changes one word: one word for another, one word put in, or one
    word taken out, never punctuation;
  - it reorders nothing, which is a word it takes out in one place and puts in
    at another (`Kraani parandasin ma ise ära`);
  - and no hunk puts in or takes out a subject pronoun, since a pronoun left
    out or put in is `dropAllowed`'s to decide, beside the verb it agrees with,
    on whatever sentence this hands it.

  And two rows' changes stand apart (`clash`): at least one unchanged word
  between them, except that a word put in or taken out may directly follow a
  word another row replaced (`seda ära`, `Ära too seda!`), since what follows
  a word in Estonian is a particle, an adverb or a postposition and never the
  modifier the replaced word took with it. A word put in directly in front of
  a replaced word is refused, because that is exactly where its modifier
  stands.

  And a demonstrative standing for a noun says which one, so where a row says
  `selle` for `raamatu`, `selle raamatu` is right too (`Ma lugesin selle
  raamatu läbi`): the demonstrative the row uses, in the case it uses it, put
  in front of the words it replaced. Only from a row that reorders nothing,
  and only in front of words that hold no verb, no pronoun, no possessive and
  no demonstrative of their own (`withDemonstrative`), so never `see parandage
  dušš` nor `selle minu auto` nor `sellest sellele`. A different case (`seda
  raamatu`) is nothing a row vouches for, and stays wrong.

  `sweep.ts` lists every sentence this makes on the real lessons and
  `sweep.test.ts` holds that list, so a rule that starts making more fails.
*/

/** The forms of `see` and `need`, which stand before a noun to say which one. */
const DEMONSTRATIVE = withFolded([
  "see", "selle", "seda", "sellesse", "selles", "sellest", "sellele", "sellel", "sellelt", "selleks", "selleni", "sellena", "selleta", "sellega",
  "need", "nende", "neid", "nendesse", "nendes", "nendest", "nendele", "nendel", "nendelt", "nendeks", "nendeni", "nendena", "nendeta", "nendega",
  "neisse", "neis", "neist", "neile", "neil", "neilt",
]);

/**
 * The possessives a noun can carry in front of it, as `spokenWords` reads them
 * (`mu` as `minu`): a demonstrative put in front of one says `selle minu auto`.
 */
const POSSESSIVE = withFolded(["minu", "sinu", "tema", "meie", "teie", "oma", "enda"]);

/** A run of `to` from `start` to `end` (half-open) said as `put` instead. `demonstrative` marks one `withDemonstrative` made. */
interface Hunk { readonly start: number; readonly end: number; readonly put: readonly string[]; readonly demonstrative?: true }

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

/**
 * Whether a row moves a word: one it takes out somewhere and puts in somewhere
 * else, or a word taken out in one place beside a word put in at another,
 * which is a word moved and changed on the way (`oleksin ma tulnud`, `ma
 * oleks tulnud`).
 */
function reorders(a: readonly string[], hunks: readonly Hunk[]): boolean {
  const out = new Set(hunks.flatMap((h) => a.slice(h.start, h.end)));
  if (hunks.some((h) => h.put.some((w) => out.has(w)))) return true;
  return hunks.some((h) => h.start === h.end) && hunks.some((h) => h.end > h.start && h.put.length === 0);
}

/** Whether a row's hunks may be combined with another row's (see the note above). */
function combinable(a: readonly string[], hunks: readonly Hunk[]): boolean {
  if (hunks.length !== 1) return false;
  const h = hunks[0]!;
  const words = [...a.slice(h.start, h.end), ...h.put];
  return h.end - h.start <= 1 && h.put.length <= 1 && words.every((w) => !BREAK.test(w) && !SUBJECTS.has(w));
}

/** One word for one word, or a demonstrative put in front of what it replaced: what a word put in or taken out may directly follow. */
const replaces = (h: Hunk) => h.demonstrative === true || (h.end - h.start === 1 && h.put.length === 1);

/** A word put in, or a word taken out. */
const putOrTaken = (h: Hunk) => (h.start === h.end && h.put.length === 1) || (h.end - h.start === 1 && h.put.length === 0);

/**
 * Whether two rows' hunks are too close to combine. A hunk shared word for
 * word is not a clash. Otherwise they need an unchanged word between them,
 * or the later one is a word put in or taken out directly after a word the
 * earlier one replaced (see the note above).
 */
function clash(a: readonly string[], x: Hunk, y: Hunk): boolean {
  if (hunkKey(x) === hunkKey(y)) return false;
  const [left, right] = x.start < y.start || (x.start === y.start && x.end <= y.end) ? [x, y] : [y, x];
  if (left.end > right.start) return true;
  if (a.slice(left.end, right.start).some((w) => !BREAK.test(w))) return false;
  return !(left.end === right.start && replaces(left) && putOrTaken(right));
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

/**
 * A row's one-word demonstrative for one to three words of `to`, put in front
 * of those words instead (`selle raamatu`). Never from a row that reorders,
 * and never in front of a verb, a pronoun, a possessive or another
 * demonstrative.
 */
function withDemonstrative(a: readonly string[], hunks: readonly Hunk[], persons: Persons): Hunk[] {
  if (reorders(a, hunks)) return [];
  return hunks.flatMap((h) => {
    const replaced = a.slice(h.start, h.end);
    const ok = h.put.length === 1 && DEMONSTRATIVE.has(h.put[0]!) && replaced.length >= 1 && replaced.length <= 3
      && replaced.every((w) => !BREAK.test(w) && !DEMONSTRATIVE.has(w) && !SUBJECTS.has(w) && !POSSESSIVE.has(w) && (persons[w] ?? []).length === 0);
    return ok ? [{ start: h.start, end: h.end, put: [h.put[0]!, ...replaced], demonstrative: true as const }] : [];
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
  const all = also.map((v) => hunksOf(a, tokensOf(v))).filter((hs) => hs.length > 0);
  const demonstratives = all.flatMap((hs) => withDemonstrative(a, hs, persons).map((h) => [h]));
  const sets = [...all.filter((hs) => combinable(a, hs)), ...demonstratives];
  const out = new Set<string>(demonstratives.map((hs) => applyHunks(a, hs).join(" ")));
  const fits = (chosen: readonly Hunk[], more: readonly Hunk[]) => more.every((h) => chosen.every((c) => !clash(a, c, h)));
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
