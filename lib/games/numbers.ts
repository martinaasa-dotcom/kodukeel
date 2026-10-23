import { unitById } from "@/lib/collections/syllabus";
import { fold } from "@/lib/estonian/fold";
import { shuffle } from "@/lib/random/shuffle";
import { CLOCK_LEMMA, clockFromText, priceFromText, spokenNumbers } from "@/lib/scenes/props";
import { core, type HeardWord } from "@/lib/speech/reconcile";
import { heardAsSpelled } from "@/lib/speech/verdict";

/**
 * ARVUD: NUMBERS, TIMES AND PRICES, SAID OUT LOUD (docs/41-fifth-batch.md, VB-7).
 *
 * The one new round the batch admits (D2). Every counter the scenes rehearse
 * needs a number said: the price at the till, the time the bus leaves, how
 * many tickets. Estonian builds its numbers out of a handful of words and
 * three endings, and says half past two by the next hour, and nothing in the
 * app drilled any of it on its own.
 *
 * WHAT IS DEALT. Clock times, prices and counts, from the ranges the scene
 * props deal: the hours a counter is open (8 to 20), prices from two euros to
 * eighty, and counts up to three digits. A clock is drawn as an analog face
 * (`components/speech/ClockFace.tsx`) or printed as a timetable time. An
 * analog face cannot show the afternoon, so either reading counts under
 * it; a timetable asks for exactly the time shown.
 *
 * NO ESTONIAN IS WRITTEN HERE (D10). Every number is shown as digits; what is
 * read aloud is TartuNLP reading those digits, and only in the shapes it was
 * measured reading the way an Estonian says them (`SPOKEN`, below). The words
 * a number is said with are the course's own lemmas, read off the two number
 * units by the round's own reader, so this file names no number word.
 *
 * WHAT IS MARKED. An answer is read by the scene parsers in
 * `lib/scenes/props.ts` (`spokenNumbers`, `clockFromText`, `priceFromText`),
 * digits or words, said or typed, and compared with the item: the answer is
 * the number, never the spelling of it. Accept-only (ADR-005).
 *
 * WHAT IS GRADED. The number words' own cards, Good, where the learner holds
 * them and the answer matched; nothing otherwise, and never down (D4). An
 * answer given in digits grades nothing, since no word was recalled.
 *
 * Pure: no React, no Next, no Prisma.
 */

/** One thing to say. */
export type NumberItem =
  | { readonly kind: "count"; readonly n: number }
  | { readonly kind: "clock"; readonly hour: number; readonly minute: number; readonly face: "analog" | "digital" }
  | { readonly kind: "price"; readonly cents: number };

/** How many items a round has. */
export const NUMBERS_ROUND = 10;

/** The hours a counter is open, which is the window the scenes deal times in. */
export const OPEN_HOURS = { from: 8, to: 20 } as const;

/** The minutes a clock is dealt at: on the hour, the quarters and the half. */
export const CLOCK_MINUTES = [0, 15, 30, 45] as const;

/** The euros a price is dealt in, from the scenes' cheapest price to their dearest. */
export const PRICE_EUROS = { from: 2, to: 80 } as const;

/** The cents a price ends in: whole euros, and every ten. */
export const PRICE_CENTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** Counts: up to three digits, which is the largest number anybody reads off a tag here. */
export const COUNT_MAX = 999;

/* ------------------------------------------------------------------------ */
/* The words a number is said with.                                          */
/* ------------------------------------------------------------------------ */

/**
 * The course's own number words, by value, read off the two number units by
 * the round's own reader: `spokenNumbers` turns each lemma into the value it
 * says, so `kakskümmend` is filed under 20 without this file spelling it.
 * Lemmas that say no single number (the ordinals, `number`, `miljon`) are
 * passed over.
 */
const NUMBER_UNITS = ["arvud", "suured-arvud"] as const;

const LEMMA_FOR: ReadonlyMap<number, string> = (() => {
  const out = new Map<number, string>();
  for (const id of NUMBER_UNITS) {
    for (const word of unitById(id)?.words ?? []) {
      const lemma = word[0];
      const said = spokenNumbers(lemma);
      if (said.length === 1 && /^\d+$/.test(said[0]!) && !out.has(Number(said[0]))) out.set(Number(said[0]), lemma);
    }
  }
  return out;
})();

/** The lemma that says a value on its own, where the course teaches one. */
export function lemmaFor(n: number): string | undefined {
  return LEMMA_FOR.get(n);
}

/** The value each number lemma says, for reading a turn back into the words it used. */
const VALUE_OF: ReadonlyMap<string, number> = new Map([...LEMMA_FOR].map(([n, lemma]) => [lemma, n]));

/**
 * The values a number under a thousand is said as, in order: the hundreds
 * as their digit and a hundred (`kaks sada`, which is how the parts are
 * taught), then a ten and a unit, or a teen, or a unit.
 */
function partsOf(n: number): number[] | null {
  if (!Number.isInteger(n) || n < 0 || n > COUNT_MAX) return null;
  const out: number[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 1) out.push(100);
  else if (hundreds > 1) out.push(hundreds, 100);
  if (rest === 0) {
    if (hundreds === 0) out.push(0);
  } else if (rest <= 19) {
    out.push(rest);
  } else {
    out.push(rest - (rest % 10));
    if (rest % 10 > 0) out.push(rest % 10);
  }
  return out;
}

/** The lemmas a number is said with, or null where the course has no word for one of its parts. */
export function numberLemmas(n: number): string[] | null {
  const parts = partsOf(n);
  if (!parts) return null;
  const lemmas = parts.map((part) => LEMMA_FOR.get(part));
  return lemmas.every((lemma): lemma is string => lemma !== undefined) ? lemmas : null;
}

/** The euro lemma, which the shopping unit teaches and a price waits for. */
export const EURO_LEMMA = "euro";

/**
 * Every lemma an item is said with, the way the course teaches it: the hour
 * and the minute after `kell`, the euros and the cents with `euro` between.
 * Null where a part has no word the course teaches.
 */
export function wordsFor(item: NumberItem): string[] | null {
  switch (item.kind) {
    case "count":
      return numberLemmas(item.n);
    case "clock": {
      const hour = numberLemmas(item.face === "analog" ? item.hour % 12 || 12 : item.hour);
      const minute = item.minute === 0 ? [] : numberLemmas(item.minute);
      return hour && minute ? [CLOCK_LEMMA, ...hour, ...minute] : null;
    }
    case "price": {
      const euros = numberLemmas(Math.floor(item.cents / 100));
      const cents = item.cents % 100 === 0 ? [] : numberLemmas(item.cents % 100);
      return euros && cents ? [...euros, EURO_LEMMA, ...cents] : null;
    }
  }
}

/* ------------------------------------------------------------------------ */
/* What is shown, and what is played.                                        */
/* ------------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** The item in digits, the way it is printed: `325`, `14:15`, `3,50 €`. */
export function shown(item: NumberItem): string {
  switch (item.kind) {
    case "count":
      return String(item.n);
    case "clock":
      return item.face === "analog" ? `${item.hour % 12 || 12}:${pad(item.minute)}` : `${pad(item.hour)}:${pad(item.minute)}`;
    case "price": {
      const euros = Math.floor(item.cents / 100);
      const cents = item.cents % 100;
      return cents === 0 ? `${euros} €` : `${euros},${pad(cents)} €`;
    }
  }
}

/** Which shape an item is, for the table of what TartuNLP reads well. */
export type NumberShape =
  | "count-small" | "count-tens" | "count-hundreds"
  | "clock-hour" | "clock-half" | "clock-quarter"
  | "price-whole" | "price-cents";

export function shapeOf(item: NumberItem): NumberShape {
  switch (item.kind) {
    case "count":
      return item.n < 20 ? "count-small" : item.n < 100 ? "count-tens" : "count-hundreds";
    case "clock":
      return item.minute === 0 ? "clock-hour" : item.minute === 30 ? "clock-half" : "clock-quarter";
    case "price":
      return item.cents % 100 === 0 ? "price-whole" : "price-cents";
  }
}

/**
 * WHAT TARTUNLP IS GIVEN TO READ, PER SHAPE, AND WHETHER IT IS PLAYED AT ALL.
 *
 * The service reads digits, and it does not read every shape of them the way
 * an Estonian says them: `3,50 €` comes back as "kolm koma viiskümmend
 * eurot", which is a decimal read out and not a price said at a till. So
 * each shape names the digits it is sent as, measured by
 * `npm run measure:numbers` (scripts/measure-number-speech.ts): every sample
 * of the shape is read by TartuNLP, heard back by the app's own recognizer,
 * and read by the round's own reader, and a shape is played only where every
 * sample came back as the number it was sent with no word in it that is not
 * a number, `kell` or `euro`. A shape that fails is shown and not played,
 * since writing the number words out for the service would be this app
 * writing Estonian (D10). `numbers.test.ts` holds this table to the
 * measurement in `lib/games/fixtures/number-speech.json`.
 */
export const SPOKEN: Record<NumberShape, ((item: NumberItem) => string) | null> = {
  "count-small": (item) => shown(item),
  "count-tens": (item) => shown(item),
  "count-hundreds": (item) => shown(item),
  /*
    A clock is sent without the leading zero, because `08:15` comes back as
    "null kaheksa viisteist", which is nobody's way of saying a quarter past
    eight. A face on the hour is sent as the hour alone, which comes back as
    the hour said ("kolm"), where `3:00` came back as "kolm null null"; a
    timetable on the hour keeps its zeros, which is how a departure is read.
  */
  "clock-hour": (item) =>
    item.kind === "clock" && item.face === "analog" ? String(item.hour % 12 || 12) : unpadded(item),
  "clock-half": (item) => unpadded(item),
  "clock-quarter": (item) => unpadded(item),
  "price-whole": (item) => shown(item),
  /*
    `3,50 €` comes back as "kolm koma viiskümmend eurot", a decimal read
    out, and `3.50 €` as "kolm viiskümmend eurot". The euros, the sign and
    then the cents comes back as "kolm eurot viiskümmend", which is how the
    price is said at a till.
  */
  "price-cents": (item) =>
    item.kind === "price" ? `${Math.floor(item.cents / 100)} € ${pad(item.cents % 100)}` : shown(item),
};

function unpadded(item: NumberItem): string {
  return shown(item).replace(/^0/, "");
}

/** The digits TartuNLP reads this item from, or null where its shape is shown and not played. */
export function spokenAs(item: NumberItem): string | null {
  return SPOKEN[shapeOf(item)]?.(item) ?? null;
}

/* ------------------------------------------------------------------------ */
/* Reading an answer.                                                        */
/* ------------------------------------------------------------------------ */

export interface NumberMark {
  readonly right: boolean;
  /** What the answer was read as, in digits, or null where it said no number of this kind. */
  readonly read: string | null;
  /**
   * The number words typed without their õ, ä, ö or ü, put right before the
   * answer was read. The number still counts, the way a dropped diacritic is
   * a slip on every other screen, and these words grade nothing, since the
   * spelling is the half that was not recalled.
   */
  readonly folded: readonly string[];
}

/**
 * Every word this round reads, by its letters with the diacritics folded
 * away: the course's number lemmas, `kell` and `euro`. A keyboard with no ü
 * types `kakskummend`, and the number it meant is still the number.
 */
const BY_FOLD: ReadonlyMap<string, string> = new Map(
  [...LEMMA_FOR.values(), CLOCK_LEMMA, EURO_LEMMA].map((lemma) => [fold(lemma), lemma]),
);

/** An answer with its folded number words put right, and which they were. */
export function unfolded(text: string): { text: string; folded: string[] } {
  const folded: string[] = [];
  const out = text.replace(/[\p{L}]+/gu, (word) => {
    const lower = word.toLocaleLowerCase("et");
    if (VALUE_OF.has(lower) || lower === CLOCK_LEMMA) return word;
    const lemma = BY_FOLD.get(fold(lower));
    if (!lemma || lemma === lower) return word;
    folded.push(lemma);
    return lemma;
  });
  return { text: out, folded };
}

/** The answer read as the item's kind, in the digits it would be shown in. */
export function readAnswer(item: NumberItem, text: string): string | null {
  const said = unfolded(text).text.trim();
  if (!said) return null;
  switch (item.kind) {
    case "count": {
      const digits = /\d+/.exec(said);
      if (digits) return String(Number(digits[0]));
      return spokenNumbers(said)[0] ?? null;
    }
    case "clock": {
      const clock = clockFromText(said, { bare: true });
      return clock ? `${pad(clock.hour)}:${pad(clock.minute)}` : null;
    }
    case "price": {
      const cents = priceFromText(said);
      return cents === null ? null : shown({ kind: "price", cents });
    }
  }
}

/**
 * Whether an answer is this item.
 *
 * A clock face takes either reading of the hour, since a face has no
 * afternoon; a timetable takes exactly the time it shows. Everything else is
 * the one number.
 */
export function markNumber(item: NumberItem, text: string): NumberMark {
  const { folded } = unfolded(text);
  const read = readAnswer(item, text);
  if (read === null) return { right: false, read: null, folded };
  switch (item.kind) {
    case "count":
      return { right: Number(read) === item.n, read, folded };
    case "clock": {
      const [h, m] = read.split(":").map(Number) as [number, number];
      const right = m === item.minute && (item.face === "analog" ? h % 12 === item.hour % 12 : h === item.hour);
      return { right, read: item.face === "analog" ? `${h % 12 || 12}:${pad(m)}` : read, folded };
    }
    case "price":
      return { right: priceFromText(read) === item.cents, read, folded };
  }
}

/**
 * The number words a right answer recalled, which is what the round grades.
 *
 * The words of the answer that are the course's number words, `kell` and
 * `euro`, spelled as the dictionary spells them; a word typed with its
 * diacritics folded away is the slip and not the recall, so it is left out.
 * An answer in digits recalled no word and grades nothing.
 */
export function wordsRecalled(text: string): string[] {
  const { folded } = unfolded(text);
  const words = text.toLocaleLowerCase("et").split(/[^a-zõäöüšž]+/).filter(Boolean);
  const out: string[] = [];
  for (const word of words) {
    const lemma = VALUE_OF.has(word) || word === CLOCK_LEMMA ? word : word.startsWith(EURO_LEMMA) ? EURO_LEMMA : null;
    if (lemma && !folded.includes(lemma) && !out.includes(lemma)) out.push(lemma);
  }
  return out;
}

/** Every number word under a hundred and the two words a time and a price are said with, for the dictionary's repairs. */
export const NUMBER_SPELLINGS: ReadonlySet<string> = new Set([
  CLOCK_LEMMA, EURO_LEMMA,
  ...Array.from({ length: 101 }, (_, n) => numberLemmas(n) ?? []).flat(),
]);

/**
 * The number words a right answer grades (D4, D13, D19).
 *
 * Typed, every number word spelled with its letters. Said, only those heard
 * as they are spelled and not repaired, each on its own: a word is matched to
 * the word heard, never to the start of one, because `kaks` is the start of
 * `kakskümmend` and `kolm` of `kolmteist`, and a repaired `kolm` graded on a
 * clean `kolmteist` would be D13 broken by a shortcut. `euro` is the one
 * lemma said with an ending (`eurot`), so it alone is matched as a prefix.
 * A wrong answer grades nothing.
 */
export function wordsGraded(answer: string, right: boolean, heard: readonly HeardWord[] | null): string[] {
  if (!right) return [];
  const words = wordsRecalled(answer);
  if (!heard) return words;
  const asSpelled = new Set(heard.filter((w) => heardAsSpelled(w, NUMBER_SPELLINGS.has(core(w.text)))).map((w) => core(w.text)));
  return words.filter((lemma) =>
    asSpelled.has(lemma) || (lemma === EURO_LEMMA && [...asSpelled].some((w) => w.startsWith(EURO_LEMMA))));
}

/* ------------------------------------------------------------------------ */
/* Dealing a round.                                                          */
/* ------------------------------------------------------------------------ */

/** Every item the round can deal, of every kind, before what has been taught narrows it. */
export function everyItem(): NumberItem[] {
  const out: NumberItem[] = [];
  for (let n = 1; n <= COUNT_MAX; n += 1) out.push({ kind: "count", n });
  for (let hour = OPEN_HOURS.from; hour <= OPEN_HOURS.to; hour += 1) {
    for (const minute of CLOCK_MINUTES) {
      out.push({ kind: "clock", hour, minute, face: "digital" });
      if (hour <= 12 || hour % 12 !== 0) out.push({ kind: "clock", hour: hour % 12 || 12, minute, face: "analog" });
    }
  }
  for (let euros = PRICE_EUROS.from; euros <= PRICE_EUROS.to; euros += 1) {
    for (const cents of PRICE_CENTS) out.push({ kind: "price", cents: euros * 100 + cents });
  }
  // An analog face is the same face at 8 and at 20, so it is dealt once.
  const seen = new Set<string>();
  return out.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** One string per item, for keys and for not dealing the same thing twice. */
export function itemKey(item: NumberItem): string {
  switch (item.kind) {
    case "count": return `count:${item.n}`;
    case "clock": return `clock:${item.face}:${item.hour}:${item.minute}`;
    case "price": return `price:${item.cents}`;
  }
}

/**
 * Whether the evenings have taught every word an item is said with (D11).
 * `taught` is null for a learner the module does not hold, and then
 * everything is open. A clock waits for `kell` and a price for `euro`.
 */
export function dealable(item: NumberItem, taught: ReadonlySet<string> | null): boolean {
  const words = wordsFor(item);
  if (!words) return false;
  if (!taught) return true;
  return words.every((lemma) => taught.has(lemma));
}

/**
 * How many items the taught words can carry, which is what opens the round in the module.
 *
 * Read off each item's words worked out once rather than per call: the course
 * builder asks this of every evening of the ladder, and recomputing the words
 * of fifteen hundred items each time was most of what building the course cost,
 * on every cold start of every route.
 */
export function dealableCount(taught: ReadonlySet<string> | null): number {
  let count = 0;
  for (const { words, items } of wordSets()) {
    let open = true;
    if (taught) for (const lemma of words) if (!taught.has(lemma)) { open = false; break; }
    if (open) count += items;
  }
  return count;
}

const EVERY_ITEM = everyItem();

/** Each distinct set of words an item is said with, and how many items say exactly that set. */
let WORD_SETS: { words: readonly string[]; items: number }[] | null = null;
function wordSets(): { words: readonly string[]; items: number }[] {
  if (WORD_SETS) return WORD_SETS;
  const byKey = new Map<string, { words: readonly string[]; items: number }>();
  for (const item of EVERY_ITEM) {
    const words = wordsFor(item);
    if (!words) continue;
    const distinct = [...new Set(words)].sort();
    const key = distinct.join(" ");
    const entry = byKey.get(key);
    if (entry) entry.items += 1;
    else byKey.set(key, { words: distinct, items: 1 });
  }
  return (WORD_SETS = [...byKey.values()]);
}

/**
 * One round: up to ten items, a mix of the three kinds where the taught words
 * allow it, so a round is not ten clocks. Counts are spread over their three
 * sizes, since a three-digit number and a teen are different things to say.
 */
export function dealRound(
  random: () => number,
  taught: ReadonlySet<string> | null,
  size: number = NUMBERS_ROUND,
  /**
   * The words the module taught last. Inside the module a round is about
   * tonight, so an item said with one of them is dealt before one that is
   * not, kind by kind; outside it this is empty and changes nothing.
   */
  recent: ReadonlySet<string> = new Set(),
): NumberItem[] {
  const open = EVERY_ITEM.filter((item) => dealable(item, taught));
  const groups: NumberItem[][] = [
    open.filter((i) => i.kind === "clock" && i.face === "analog"),
    open.filter((i) => i.kind === "clock" && i.face === "digital"),
    open.filter((i) => i.kind === "price" && i.cents % 100 !== 0),
    open.filter((i) => i.kind === "price" && i.cents % 100 === 0),
    open.filter((i) => i.kind === "count" && i.n < 20),
    open.filter((i) => i.kind === "count" && i.n >= 20 && i.n < 100),
    open.filter((i) => i.kind === "count" && i.n >= 100),
  ].filter((g) => g.length > 0);
  const out: NumberItem[] = [];
  const taken = new Set<string>();
  let turn = 0;
  while (out.length < size && groups.some((g) => g.some((i) => !taken.has(itemKey(i))))) {
    const group = groups[turn % groups.length]!;
    turn += 1;
    const fresh = group.filter((i) => !taken.has(itemKey(i)));
    if (fresh.length === 0) continue;
    const tonight = fresh.filter((i) => (wordsFor(i) ?? []).some((lemma) => recent.has(lemma)));
    const from = tonight.length > 0 ? tonight : fresh;
    const item = from[Math.floor(random() * from.length)]!;
    taken.add(itemKey(item));
    out.push(item);
  }
  // Shuffled, so the kinds do not arrive in the same order every round.
  return shuffle(out, random);
}
