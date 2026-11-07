/**
 * NUMBER ENDINGS: ONE NUMBER, MANY JOBS.
 *
 * The second mode of the Numbers round. The first asks a learner to say a
 * price, a clock or a count; this one asks what happens to a number inside a
 * sentence, which is where Estonian changes it: `seitseteist` when you are
 * 17, `seitsmeteistkümne` when you came with 17 friends,
 * `seitsmeteistkümnendal` on the 17th floor and the 17th of May. Three steps,
 * as the operator approved off a mockup:
 *
 *   SAME NUMBER. One number in five or six sentences, each a different job,
 *   and the two or three forms it takes as tiles. The learner gives each
 *   sentence its form. Seeing one number change shape is the lesson.
 *   YEARS. A year built part by part, each part the plain word or the form the
 *   sentence needs, and then the same year in its other jobs. The job varies:
 *   in, since, until and by a year.
 *   HEAR IT. A sentence read aloud and the number written down in digits, with
 *   the dot that makes it "-th" or without it.
 *
 * WHAT IS WRITTEN HERE AND WHAT IS NOT (ADR-005 amendment 8). The number
 * forms come off `lib/estonian/numerals.ts`, a rule whose every output is
 * checked against the forms list. The sentences around them are a short,
 * closed list of frames typed here, every word of which `numberEndings.test.ts`
 * asks of the same forms list; the operator asked for them to be checked by
 * machine rather than read. Nothing here is a card answer: a missed number
 * puts the number's own words in the deck, which are dictionary entries.
 *
 * VARIETY IS THE POINT, and the tricky numbers come up most: the first,
 * second and third (irregular, and hidden at the end of 21st, 32nd and 43rd),
 * the teens, the round tens, the hundreds, the year 2000 and the years after
 * it, which follow a different pattern from 1992.
 *
 * Pure: no React, no Prisma, no network.
 */

import { cardinal, ordinal, ordinalParts, said, type NumeralCase } from "@/lib/estonian/numerals";
import { shuffle } from "@/lib/random/shuffle";

/* ------------------------------------------------------------------------ */
/* The jobs a number does.                                                   */
/* ------------------------------------------------------------------------ */

export type Job =
  | "age" | "count" | "floor" | "date" | "with" | "minutes" | "decade"
  | "until-hour" | "from-hour"
  | "year-in" | "year-since" | "year-until" | "year-by" | "year-was";

/**
 * A sentence with the number taken out. `before` and `after` are the
 * Estonian either side of it, `en` the English with `{n}` where the number
 * goes in the shape English says it.
 */
export interface Frame {
  readonly job: Job;
  readonly before: string;
  readonly after: string;
  readonly en: string;
  /** Which shape of the number the English puts at `{n}`. */
  readonly enShape: "plain" | "decade" | "month-date";
  /** What the number is: a cardinal or an ordinal, and in which case. */
  readonly form: { readonly kind: "cardinal" | "ordinal"; readonly case: NumeralCase; readonly number?: "pl" };
  /** Whether the number is written with a dot, which is how Estonian marks "-th". */
  readonly dotted: boolean;
}

const FRAMES: Record<Exclude<Job, "date">, Frame> = {
  age: { job: "age", before: "Ma olen", after: ".", en: "I'm {n}.", enShape: "plain", form: { kind: "cardinal", case: "NOM" }, dotted: false },
  count: { job: "count", before: "Mul on", after: "raamatut.", en: "I have {n} books.", enShape: "plain", form: { kind: "cardinal", case: "NOM" }, dotted: false },
  floor: { job: "floor", before: "Ma elan", after: "korrusel.", en: "I live on floor {n}.", enShape: "plain", form: { kind: "ordinal", case: "ADE" }, dotted: true },
  with: { job: "with", before: "Ma tulin", after: "sõbraga.", en: "I came with {n} friends.", enShape: "plain", form: { kind: "cardinal", case: "GEN" }, dotted: false },
  minutes: { job: "minutes", before: "Buss tuleb", after: "minuti pärast.", en: "The bus comes in {n} minutes.", enShape: "plain", form: { kind: "cardinal", case: "GEN" }, dotted: false },
  decade: { job: "decade", before: "Mu vanaema sündis", after: ".", en: "My grandmother was born in the {n}s.", enShape: "decade", form: { kind: "ordinal", case: "ADE", number: "pl" }, dotted: false },
  "until-hour": { job: "until-hour", before: "Pood on lahti kella", after: ".", en: "The shop is open until {n}.", enShape: "plain", form: { kind: "cardinal", case: "TER" }, dotted: false },
  "from-hour": { job: "from-hour", before: "Pood on lahti kella", after: ".", en: "The shop is open from {n}.", enShape: "plain", form: { kind: "cardinal", case: "ELA" }, dotted: false },
  "year-in": { job: "year-in", before: "Ma sündisin", after: "aastal.", en: "I was born in {n}.", enShape: "plain", form: { kind: "ordinal", case: "ADE" }, dotted: true },
  "year-since": { job: "year-since", before: "Ma elan siin", after: "aastast.", en: "I've lived here since {n}.", enShape: "plain", form: { kind: "ordinal", case: "ELA" }, dotted: true },
  "year-until": { job: "year-until", before: "Ma töötasin seal", after: "aastani.", en: "I worked there until {n}.", enShape: "plain", form: { kind: "ordinal", case: "GEN" }, dotted: true },
  "year-by": { job: "year-by", before: "Maja sai valmis", after: "aastaks.", en: "The house was finished by {n}.", enShape: "plain", form: { kind: "ordinal", case: "TRA" }, dotted: true },
  "year-was": { job: "year-was", before: "Aasta oli", after: ".", en: "The year was {n}.", enShape: "plain", form: { kind: "cardinal", case: "NOM" }, dotted: false },
};

/** A month, its English name, and the form a date puts it in ("on the 17th of May" is `mail`). */
export const MONTHS: readonly { readonly en: string; readonly ade: string; readonly days: number }[] = [
  { en: "January", ade: "jaanuaril", days: 31 },
  { en: "February", ade: "veebruaril", days: 28 },
  { en: "March", ade: "märtsil", days: 31 },
  { en: "April", ade: "aprillil", days: 30 },
  { en: "May", ade: "mail", days: 31 },
  { en: "June", ade: "juunil", days: 30 },
  { en: "July", ade: "juulil", days: 31 },
  { en: "August", ade: "augustil", days: 31 },
  { en: "September", ade: "septembril", days: 30 },
  { en: "October", ade: "oktoobril", days: 31 },
  { en: "November", ade: "novembril", days: 30 },
  { en: "December", ade: "detsembril", days: 31 },
];

/** The date frame, for one month. */
function dateFrame(month: number): Frame {
  const m = MONTHS[month]!;
  return {
    job: "date", before: "Ma sündisin", after: `${m.ade}.`, en: `I was born on ${m.en} {n}.`, enShape: "month-date",
    form: { kind: "ordinal", case: "ADE" }, dotted: true,
  };
}

/** Every frame, for the test that reads every word of them. */
export function everyFrame(): Frame[] {
  return [...Object.values(FRAMES), ...MONTHS.map((_, i) => dateFrame(i))];
}

/** The number in the form a frame needs, as one string. */
export function formFor(frame: Frame, n: number): string {
  const words = frame.form.kind === "cardinal" ? cardinal(n, frame.form.case) : ordinal(n, frame.form.case, frame.form.number ?? "sg");
  return said(words);
}

/**
 * What an English line is filled with: `{n}`, the digits, a decade's two. A
 * line is a template rather than a finished string so the Russian and the
 * Ukrainian can be keyed on it and say the number their own way, which is
 * also why the English says "floor 17" rather than "the 17th floor": a
 * placeholder has to mean the same thing in every language.
 */
export function englishValues(frame: Frame, n: number): Record<string, string> {
  return { n: frame.enShape === "decade" && n % 100 !== 0 ? String(n % 100) : String(n) };
}

/** The English sentence with the number in it. */
export function englishFor(frame: Frame, n: number): string {
  const values = englishValues(frame, n);
  return frame.en.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

/** The whole Estonian sentence, the number filled in. */
export function sentenceFor(frame: Frame, n: number): string {
  const sep = /^[.,!?]/.test(frame.after) ? "" : " ";
  return `${frame.before} ${formFor(frame, n)}${sep}${frame.after}`;
}

/** The number as Estonian writes it in that sentence: `17.` where it is "-th", `17` where it is not. */
export function digitsFor(frame: Frame, n: number): string {
  if (frame.job === "decade") return `${n % 100 === 0 ? n : n % 100}`;
  return frame.dotted ? `${n}.` : String(n);
}

/* ------------------------------------------------------------------------ */
/* What a round deals.                                                       */
/* ------------------------------------------------------------------------ */

/** One sentence of a same-number card. */
export interface JobRow {
  readonly job: Job;
  readonly en: string;
  /** The English as a template and what fills it, for a screen that translates it. */
  readonly enTemplate: string;
  readonly enValues: Readonly<Record<string, string>>;
  readonly before: string;
  readonly after: string;
  /** The form that goes in the gap. */
  readonly answer: string;
}

/** Step one: one number, its forms as tiles, and the sentences they go into. */
export interface SameNumberCard {
  readonly kind: "same";
  readonly n: number;
  readonly tiles: readonly string[];
  readonly rows: readonly JobRow[];
}

/** A part of a year to build: the plain word and the needed one, in the order shown. */
export interface YearChoice {
  readonly options: readonly [string, string];
  readonly answer: string;
}

/** Step two: a year built part by part, then the same year in its other jobs. */
export interface YearCard {
  readonly kind: "year";
  readonly n: number;
  readonly job: Job;
  readonly en: string;
  readonly enTemplate: string;
  readonly enValues: Readonly<Record<string, string>>;
  readonly before: string;
  readonly after: string;
  readonly parts: readonly YearChoice[];
  /** The same year in the other jobs, shown once it is built. */
  readonly others: readonly { readonly en: string; readonly enTemplate: string; readonly enValues: Readonly<Record<string, string>>; readonly et: string }[];
}

/** Step three: a sentence heard, the number written down. */
export interface HearCard {
  readonly kind: "hear";
  readonly n: number;
  readonly job: Job;
  /** What is read aloud, and shown after the answer. */
  readonly et: string;
  readonly en: string;
  readonly enTemplate: string;
  readonly enValues: Readonly<Record<string, string>>;
  /** The digits that are right, with the dot where the number is "-th". */
  readonly answer: string;
  readonly dotted: boolean;
  /** An hour on a clock, where 5 and 17 are both right. */
  readonly hour: boolean;
  /** A decade, where 90, 90s and 1990s are all right. */
  readonly decade: boolean;
}

export type EndingsCard = SameNumberCard | YearCard | HearCard;

/** How many of each step a round deals. */
export const ROUND_SHAPE = { same: 2, year: 2, hear: 6 } as const;

/** A draw weighted toward the tricky numbers. */
function weighted(random: () => number, pool: readonly number[], weight: (n: number) => number, avoid: ReadonlySet<number>): number {
  const open = pool.filter((n) => !avoid.has(n));
  const from = open.length > 0 ? open : pool;
  const total = from.reduce((sum, n) => sum + weight(n), 0);
  let at = random() * total;
  for (const n of from) {
    at -= weight(n);
    if (at < 0) return n;
  }
  return from[from.length - 1]!;
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * How tricky a number is to say, as a weight. The first, second and third
 * (and a number ending on one of them) are irregular; a teen and a round ten
 * are their own pattern; a hundred and a thousand change shape.
 */
export function trickiness(n: number): number {
  let w = 1;
  const last = n % 10;
  if ([1, 2, 3].includes(last) && n % 100 !== 11 && n % 100 !== 12 && n % 100 !== 13) w += 2;
  if (n % 100 >= 11 && n % 100 <= 19) w += 1;
  if (n % 10 === 0) w += 1;
  if (n % 100 === 0) w += 2;
  if (n >= 2000) w += 2;
  return w;
}

/**
 * The numbers a same-number card may take. Eight and nine are left out:
 * `kaheksa` and `üheksa` are their own genitive, so two of the tiles would
 * read the same and a card is a choice between forms that differ.
 */
export const SAME_POOL: readonly number[] = range(2, 31).filter((n) => n !== 8 && n !== 9);

/** The years a year card takes: the 1800s to the late 2020s, weighted toward the turn of the century. */
export const YEAR_POOL: readonly number[] = range(1800, 2029);

/** The jobs a year card builds, and the one it shows plainly beside them. */
const YEAR_JOBS: readonly Job[] = ["year-in", "year-since", "year-until", "year-by"];

/** A month with a day `n` in it, drawn at random, so the 31st never lands in April. */
export function monthFor(n: number, random: () => number): number {
  const open = MONTHS.map((m, i) => (m.days >= n ? i : -1)).filter((i) => i >= 0);
  return open[Math.floor(random() * open.length)] ?? 0;
}

/** A same-number card for `n`. */
export function sameNumberCard(n: number, random: () => number): SameNumberCard {
  const frames: Frame[] = [FRAMES.age, FRAMES.count, FRAMES.floor, dateFrame(monthFor(n, random)), FRAMES.with, FRAMES.minutes];
  if (n % 10 === 0 && n >= 20 && n <= 90) frames.push(FRAMES.decade);
  const rows = frames.map((f) => ({ job: f.job, en: englishFor(f, n), enTemplate: f.en, enValues: englishValues(f, n), before: f.before, after: f.after, answer: formFor(f, n) }));
  const tiles = shuffle([...new Set(rows.map((r) => r.answer))], random);
  return { kind: "same", n, tiles, rows: shuffle(rows, random) };
}

/** A year card for `n` in one of the four jobs. */
export function yearCard(n: number, job: Job, random: () => number): YearCard {
  const frame = FRAMES[job as Exclude<Job, "date">];
  const parts = ordinalParts(n, frame.form.case).map((p) => ({
    options: (random() < 0.5 ? [p.plain, p.needed] : [p.needed, p.plain]) as [string, string],
    answer: p.needed,
  }));
  const others = [...YEAR_JOBS.filter((j) => j !== job), "year-was" as Job].map((j) => {
    const f = FRAMES[j as Exclude<Job, "date">];
    return { en: englishFor(f, n), enTemplate: f.en, enValues: englishValues(f, n), et: sentenceFor(f, n) };
  });
  return { kind: "year", n, job, en: englishFor(frame, n), enTemplate: frame.en, enValues: englishValues(frame, n), before: frame.before, after: frame.after, parts, others };
}

/**
 * The jobs whose sentences are not read aloud, because `npm run measure:endings`
 * heard them back wrong on every voice it tried: the speech service said them
 * in a way the app's own recognizer could not write back as built, so a
 * learner would be asked to write down a number nobody could hear. A job here
 * is never dealt as a heard sentence. Empty until a measurement says otherwise;
 * `numberEndings.test.ts` holds this set to the fixture the script writes.
 */
export const SILENT_JOBS: ReadonlySet<Job> = new Set<Job>();

/** The jobs a heard sentence may do, and the numbers each takes. */
const HEAR_POOLS: readonly { readonly job: Job; readonly pool: readonly number[] }[] = [
  { job: "floor", pool: range(1, 30) },
  { job: "date", pool: range(1, 31) },
  { job: "year-in", pool: YEAR_POOL },
  { job: "count", pool: range(2, 999) },
  { job: "minutes", pool: range(2, 59) },
  { job: "age", pool: range(2, 99) },
  { job: "until-hour", pool: range(1, 12) },
  { job: "from-hour", pool: range(1, 12) },
  { job: "decade", pool: [20, 30, 40, 50, 60, 70, 80, 90] },
  { job: "with", pool: range(2, 40) },
];

/** A heard-sentence card. */
export function hearCard(job: Job, n: number, random: () => number): HearCard {
  const frame = job === "date" ? dateFrame(monthFor(n, random)) : FRAMES[job as Exclude<Job, "date">];
  return {
    kind: "hear", n, job,
    et: sentenceFor(frame, n),
    en: englishFor(frame, n),
    enTemplate: frame.en,
    enValues: englishValues(frame, n),
    answer: digitsFor(frame, n),
    dotted: frame.dotted,
    hour: job === "until-hour" || job === "from-hour",
    decade: job === "decade",
  };
}

/**
 * One round: two same-number cards, two years and six heard sentences, in
 * that order, the steps the briefing names. No number is dealt twice in a
 * round, and a heard sentence never does the same job twice running.
 */
export function dealEndings(random: () => number): EndingsCard[] {
  const used = new Set<number>();
  const out: EndingsCard[] = [];
  for (let i = 0; i < ROUND_SHAPE.same; i += 1) {
    const n = weighted(random, SAME_POOL, trickiness, used);
    used.add(n);
    out.push(sameNumberCard(n, random));
  }
  const yearJobs = shuffle([...YEAR_JOBS], random);
  for (let i = 0; i < ROUND_SHAPE.year; i += 1) {
    const n = weighted(random, YEAR_POOL, trickiness, used);
    used.add(n);
    out.push(yearCard(n, yearJobs[i % yearJobs.length]!, random));
  }
  const jobs = shuffle(HEAR_POOLS.filter((p) => !SILENT_JOBS.has(p.job)), random).slice(0, ROUND_SHAPE.hear);
  for (const { job, pool } of jobs) {
    const n = weighted(random, pool, trickiness, used);
    used.add(n);
    out.push(hearCard(job, n, random));
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Marking a heard sentence.                                                 */
/* ------------------------------------------------------------------------ */

export interface HearMark {
  /** The number is right. */
  readonly right: boolean;
  /** The number is right and the dot is not: "-th" written as a plain number, or the other way. */
  readonly dotWrong: boolean;
  /** What was read, in digits, or null where no number was typed. */
  readonly read: string | null;
}

/**
 * Whether a typed answer is the number heard.
 *
 * The number decides right or wrong; the dot is the lesson, so a right number
 * with the dot missing (or added where there is none) is right and says so.
 * An hour takes either half of the day, and a decade its two digits, with or
 * without the century and the "s".
 */
export function markHeard(card: HearCard, typed: string): HearMark {
  const match = /(\d+)\s*(\.)?/.exec(typed.trim());
  if (!match) return { right: false, dotWrong: false, read: null };
  const value = Number(match[1]);
  const dot = match[2] === ".";
  const read = `${value}${dot ? "." : ""}`;
  let right: boolean;
  if (card.hour) right = value % 12 === card.n % 12 && value <= 24;
  else if (card.decade) right = value === card.n || value === 1900 + card.n;
  else right = value === card.n;
  const dotWrong = right && !card.hour && !card.decade && dot !== card.dotted;
  return { right, dotWrong, read };
}

/* ------------------------------------------------------------------------ */
/* What a miss puts in the deck.                                             */
/* ------------------------------------------------------------------------ */

/** The most numbers one round can hand in as missed: every card of a round. */
export const MAX_MISSED = 12;

/**
 * The dictionary words a missed number is made of, which is what goes in the
 * deck: the plain words it is said with and its "-th" word, as headwords
 * (`seitseteist`, `seitsmeteistkümnes`). A word the dictionary does not hold
 * is passed over by the deck builder, so asking for one costs nothing.
 */
export function lemmasOfNumber(n: number): string[] {
  const out = new Set<string>(cardinal(n, "NOM"));
  const ord = ordinal(n, "NOM");
  out.add(ord[ord.length - 1]!);
  return [...out];
}

/** The numbers handed in as missed, as JSON off the wire: whole, in range, at most a round's worth. */
export function missedNumbers(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<number>();
  for (const value of raw.slice(0, MAX_MISSED)) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 9999) out.add(value);
  }
  return [...out];
}
