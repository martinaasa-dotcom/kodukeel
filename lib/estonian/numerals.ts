/**
 * A NUMBER IN THE FORM A SENTENCE NEEDS.
 *
 * `17` is `seitseteist` in "I'm 17", `seitsmeteistkümne` in "with 17 people"
 * and `seitsmeteistkümnendal` on the 17th floor and the 17th of May, and a
 * year is the same thing four words long: "in 1992" is `tuhande üheksasaja
 * üheksakümne teisel aastal`. The number endings mode in the Numbers round
 * (`lib/games/numberEndings.ts`) drills exactly that, and this is the module
 * that knows how each form is made.
 *
 * A RULE OVER A CLOSED TABLE, AND EVERY OUTPUT CHECKED (ADR-005 amendment 8).
 * Estonian builds every number out of nine units, `kümme`, and four pieces
 * that do not change (`teist`, `kümmend`, `sada`, `tuhat`), so the forms are
 * a small table and a rule, the latitude `cases.ts` and `conjugate.ts` take
 * with a case ending. What makes it safe is the check rather than the
 * reasoning: `numerals.test.ts` builds every number from 1 to 2100 in every
 * form this module makes and asks the shipped forms list (Ekilex and
 * Vabamorf, guessing off) whether each word is a form of the headword it is
 * meant to be. A form that fails is a failing test, never a form a learner
 * meets.
 *
 * THE THREE RULES, as a course states them.
 *   1. A cardinal in any case but the nominative puts every word in that
 *      case, on the genitive stem: `kahekümnel viiel`, `kahekümnest viiest`.
 *   2. In the last four cases (until, as, without, with) only the last word
 *      of the phrase takes the ending and the rest stay in the genitive:
 *      `kahekümne viieni`, `kolme inimesega`. A noun after the number is that
 *      last word, so the number itself is plain genitive there.
 *   3. An ordinal is the last group made "-th" and every group before it in
 *      the genitive: `kahekümne esimesel`, `tuhande üheksasaja üheksakümne
 *      teisel`. The thousands are one word once they are the "-th" themselves:
 *      2000th is `kahetuhandes`, written as one, as the forms list holds it.
 *
 * Pure: no React, no Prisma, no network.
 */

/** The cases this module makes a number in. */
export type NumeralCase =
  | "NOM" // nimetav, the plain form
  | "GEN" // omastav
  | "ADE" // alalütlev, -l: on the 17th floor
  | "ELA" // seestütlev, -st: from 3, since 1992
  | "TRA" // saav, -ks: by 1992
  | "TER"; // rajav, -ni: until 3

export type NumeralKind = "cardinal" | "ordinal";

/** The ending a case puts on a genitive stem, for the cases that take one. */
const ENDING: Record<Exclude<NumeralCase, "NOM" | "GEN">, string> = {
  ADE: "l",
  ELA: "st",
  TRA: "ks",
  TER: "ni",
};

/** The cases where only the last word of the phrase takes the ending (rule 2). */
const LAST_ONLY: ReadonlySet<NumeralCase> = new Set(["TER"]);

interface Unit {
  /** The plain cardinal: `kaks`. */
  readonly nom: string;
  /** Its genitive, which every other case is built on: `kahe`. */
  readonly gen: string;
  /** The plain ordinal: `teine`. */
  readonly ord: string;
  /** The ordinal's genitive, which its other cases are built on: `teise`. */
  readonly ordGen: string;
}

/** One to nine. Index 0 is unused so a digit indexes its own row. */
const UNITS: readonly (Unit | null)[] = [
  null,
  { nom: "üks", gen: "ühe", ord: "esimene", ordGen: "esimese" },
  { nom: "kaks", gen: "kahe", ord: "teine", ordGen: "teise" },
  { nom: "kolm", gen: "kolme", ord: "kolmas", ordGen: "kolmanda" },
  { nom: "neli", gen: "nelja", ord: "neljas", ordGen: "neljanda" },
  { nom: "viis", gen: "viie", ord: "viies", ordGen: "viienda" },
  { nom: "kuus", gen: "kuue", ord: "kuues", ordGen: "kuuenda" },
  { nom: "seitse", gen: "seitsme", ord: "seitsmes", ordGen: "seitsmenda" },
  { nom: "kaheksa", gen: "kaheksa", ord: "kaheksas", ordGen: "kaheksanda" },
  { nom: "üheksa", gen: "üheksa", ord: "üheksas", ordGen: "üheksanda" },
];

function unit(d: number): Unit {
  const u = UNITS[d];
  if (!u) throw new Error(`no unit for ${d}`);
  return u;
}

/** Ten, which the teens and the tens are built beside rather than on. */
const TEN: Unit = { nom: "kümme", gen: "kümne", ord: "kümnes", ordGen: "kümnenda" };

/**
 * One word of a number, in all four of its shapes. A number is a list of
 * these, and the rules above choose which shape each word takes.
 */
type Word = Unit;

/** The teen built on a unit: `seitseteist`, `seitsmeteistkümne`, `seitsmeteistkümnes`. */
function teen(d: number): Word {
  const u = unit(d);
  return { nom: `${u.nom}teist`, gen: `${u.gen}teistkümne`, ord: `${u.gen}teistkümnes`, ordGen: `${u.gen}teistkümnenda` };
}

/** The ten built on a unit: `kakskümmend`, `kahekümne`, `kahekümnes`. */
function tens(d: number): Word {
  const u = unit(d);
  return { nom: `${u.nom}kümmend`, gen: `${u.gen}kümne`, ord: `${u.gen}kümnes`, ordGen: `${u.gen}kümnenda` };
}

/** The hundred built on a unit, one word: `sada`, `kakssada`, `kahesaja`, `kahesajas`. */
function hundreds(d: number): Word {
  if (d === 1) return { nom: "sada", gen: "saja", ord: "sajas", ordGen: "sajanda" };
  const u = unit(d);
  return { nom: `${u.nom}sada`, gen: `${u.gen}saja`, ord: `${u.gen}sajas`, ordGen: `${u.gen}sajanda` };
}

/**
 * The thousands as a group. A cardinal says them as two words (`kaks tuhat`,
 * `kahe tuhande`) and an ordinal ending on them as one (`kahetuhandes`), so
 * the group carries both: `words` for every shape but the ordinal, `ord` and
 * `ordGen` already joined.
 */
interface ThousandsGroup {
  readonly words: readonly Word[];
  readonly ord: string;
  readonly ordGen: string;
}

const THOUSAND: Word = { nom: "tuhat", gen: "tuhande", ord: "tuhandes", ordGen: "tuhandenda" };

function thousands(d: number): ThousandsGroup {
  if (d === 1) return { words: [THOUSAND], ord: THOUSAND.ord, ordGen: THOUSAND.ordGen };
  const u = unit(d);
  return { words: [u, THOUSAND], ord: `${u.gen}tuhandes`, ordGen: `${u.gen}tuhandenda` };
}

/** The highest number this module builds. A year up to 9999 is in range; nothing here needs more. */
export const NUMERAL_MAX = 9999;

/**
 * A number split into the groups a person says: the thousands, the hundreds,
 * and the rest, the rest being one word or a ten and a unit.
 */
export interface NumberGroups {
  readonly thousands: ThousandsGroup | null;
  readonly hundreds: Word | null;
  readonly rest: readonly Word[];
}

export function groupsOf(n: number): NumberGroups {
  if (!Number.isInteger(n) || n < 1 || n > NUMERAL_MAX) throw new Error(`no number ${n}`);
  const t = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const rest: Word[] = [];
  if (r >= 1 && r <= 9) rest.push(unit(r));
  else if (r === 10) rest.push(TEN);
  else if (r >= 11 && r <= 19) rest.push(teen(r - 10));
  else if (r >= 20) {
    rest.push(tens(Math.floor(r / 10)));
    if (r % 10 > 0) rest.push(unit(r % 10));
  }
  return { thousands: t > 0 ? thousands(t) : null, hundreds: h > 0 ? hundreds(h) : null, rest };
}

/** Every word of the number in order, cardinal. */
function cardinalWords(g: NumberGroups): Word[] {
  return [...(g.thousands?.words ?? []), ...(g.hundreds ? [g.hundreds] : []), ...g.rest];
}

/** One word in a case, built on its genitive stem. */
function inCase(gen: string, c: NumeralCase): string {
  if (c === "GEN") return gen;
  if (c === "NOM") throw new Error("NOM is not built on the GEN stem");
  return gen + ENDING[c];
}

/**
 * The words of `n` as a cardinal in a case.
 *
 * Rule 1 for the ordinary cases, rule 2 for the last four. `kaheksa` and
 * `üheksa` are their own genitive, which is the language and not a fault.
 */
export function cardinal(n: number, c: NumeralCase): string[] {
  const words = cardinalWords(groupsOf(n));
  if (c === "NOM") return words.map((w) => w.nom);
  if (c === "GEN") return words.map((w) => w.gen);
  if (LAST_ONLY.has(c)) return words.map((w, i) => (i === words.length - 1 ? inCase(w.gen, c) : w.gen));
  return words.map((w) => inCase(w.gen, c));
}

/**
 * The words of `n` as an ordinal in a case, singular or plural.
 *
 * Rule 3: the last group is the ordinal and takes the case; every group
 * before it stays a cardinal genitive. The plural is the decades' form
 * (`üheksakümnendatel`, in the nineties), built on the ordinal's genitive
 * with the plural `-te` before the ending, and is only made of an ordinal
 * whose genitive ends in `-nda`.
 */
export function ordinal(n: number, c: NumeralCase, number: "sg" | "pl" = "sg"): string[] {
  const g = groupsOf(n);
  const before: Word[] = [];
  let last: { ord: string; ordGen: string };
  if (g.rest.length > 0) {
    before.push(...(g.thousands?.words ?? []), ...(g.hundreds ? [g.hundreds] : []), ...g.rest.slice(0, -1));
    last = g.rest[g.rest.length - 1]!;
  } else if (g.hundreds) {
    before.push(...(g.thousands?.words ?? []));
    last = g.hundreds;
  } else {
    last = g.thousands!;
  }
  const head = before.map((w) => w.gen);
  if (number === "pl") {
    if (!last.ordGen.endsWith("nda")) throw new Error(`no plural ordinal of ${n}`);
    const stem = `${last.ordGen}te`;
    if (c === "NOM") return [...head, `${last.ordGen}d`];
    return [...head, inCase(stem, c)];
  }
  if (c === "NOM") return [...head, last.ord];
  return [...head, inCase(last.ordGen, c)];
}

/** A phrase as one string, the words joined with a space. */
export function said(words: readonly string[]): string {
  return words.join(" ");
}

/**
 * The groups of `n` as the year round lays them out: one chip per group,
 * with what it says plainly and what it says in the form asked for. The
 * thousands are one chip whether they are one word or two, and so are a
 * ten and a unit that stand apart, each a chip of its own.
 */
export interface YearPart {
  /** The group said plainly: `tuhat`, `üheksasada`, `kaks tuhat`. */
  readonly plain: string;
  /** The same group in the form the sentence needs: `tuhande`, `teisel`, `kahetuhandendal`. */
  readonly needed: string;
}

/**
 * The parts of `n` as an ordinal in a case, each beside its plain cardinal.
 *
 * The needed words are exactly `ordinal(n, c)`; the parts group them the way
 * the plain number is said, so `kaks tuhat` is set against `kahe tuhande`
 * where the thousands are not last, and against `kahetuhandendal` where they
 * are.
 */
export function ordinalParts(n: number, c: NumeralCase): YearPart[] {
  const g = groupsOf(n);
  const needed = ordinal(n, c);
  const parts: YearPart[] = [];
  let i = 0;
  const lastIsThousands = !g.hundreds && g.rest.length === 0;
  if (g.thousands) {
    const plain = g.thousands.words.map((w) => w.nom).join(" ");
    if (lastIsThousands) {
      parts.push({ plain, needed: needed[i]! });
      i += 1;
    } else {
      const span = g.thousands.words.length;
      parts.push({ plain, needed: needed.slice(i, i + span).join(" ") });
      i += span;
    }
  }
  if (g.hundreds) {
    parts.push({ plain: g.hundreds.nom, needed: needed[i]! });
    i += 1;
  }
  for (const w of g.rest) {
    parts.push({ plain: w.nom, needed: needed[i]! });
    i += 1;
  }
  return parts;
}
