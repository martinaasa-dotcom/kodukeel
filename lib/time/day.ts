/**
 * Calendar days, in the learner's own timezone.
 *
 * A streak is a human unit: it breaks at *their* midnight, not UTC's. Using
 * `toISOString().slice(0, 10)` — the obvious shortcut — silently shifts the day
 * boundary for anyone west of Greenwich, so someone in New York studying at
 * 8pm would have it counted as tomorrow. Estonia is UTC+2/+3, which makes the
 * bug invisible where the app was written and real everywhere else.
 *
 * THAT WAS ONLY HALF THE FIX, AND THE HALF THAT SHOWS UP IN A BROWSER.
 *
 * `getFullYear()` reads the day boundary of whichever process is running, and
 * every screen that leads with a day boundary is rendered on the server: the
 * streak, the daily goal, the quests, the week strip on Today, the heatmap.
 * On Vercel that process is UTC, so "the learner's own calendar day" was UTC's
 * calendar day wearing a different name, and the shortcut this file was
 * written to forbid was being taken one layer down.
 *
 * It is not a rounding error. A learner in Tallinn who studied on Monday
 * morning, again at one in the morning on Tuesday and again on Wednesday
 * morning has kept a three-day streak. Those three sittings fall in two UTC
 * days with a hole between them, so the app reported a streak of 1 — and, if
 * they had banked a shield, silently spent it to bridge a Tuesday they had not
 * missed. That is the worst shape this bug has: the app quietly pays a
 * penalty on the learner's behalf for something they did.
 *
 * So a day boundary now needs a timezone, and the way to get one is
 * `dayClock(zone)`. The free functions below are the same thing bound to the
 * running process's zone, which is the right answer in a browser (where the
 * process *is* the learner) and the wrong one on a server, so server code
 * takes a clock. The learner's zone is reported by their browser and stored
 * under `SETTING_KEYS.timeZone`; with none stored the clock falls back to the
 * process, which is exactly the behavior this file had before.
 *
 * Framework-free and pure: `Intl` is the platform, so both the server and the
 * browser can agree on a day key without either one guessing.
 */

/** `YYYY-MM-DD`. */
export type DayKey = string;

/**
 * An IANA timezone name, or `undefined` for the running process's own zone.
 *
 * Never trusted blind: it arrives from a browser and is stored, so anything
 * `Intl` will not accept is treated as absent rather than thrown at a
 * formatter on the render path. See `isTimeZone`.
 */
export type Zone = string | undefined;

/**
 * The zone as `Intl` spells it, or `undefined` for anything that is not a
 * named zone in the IANA database.
 *
 * TWO THINGS `Intl` ACCEPTS THAT A STORED ZONE MAY NOT BE.
 *
 * An offset. `Intl` takes `+05:30` and reads it as five and a half hours east
 * of Greenwich; Postgres takes the same string in `AT TIME ZONE` and reads it
 * POSIX-style, as five and a half hours *west*. Measured on Postgres 16:
 * noon UTC at `'+05:30'` is 06:30, and at `'Asia/Kolkata'` it is 17:30. The
 * zone reaches both, the day clock here and the heatmap's query in
 * `lib/progress/summary.ts`, so a learner whose browser reported an offset
 * would have their days cut eleven hours apart by the two, which is the
 * spent-shield fault this module exists for, arriving through the value that
 * was meant to fix it. A named zone means the same thing to both.
 *
 * Any casing. `Intl` accepts `europe/tallinn` and `EUROPE/TALLINN` for
 * `Europe/Tallinn`, so each spelling was a different stored value and a
 * different key in the formatter cache below. The canonical spelling is what
 * `resolvedOptions` hands back, then its current IANA name where the two
 * differ (`CURRENT_NAME`), and that is what gets stored and cached.
 */
export function canonicalZone(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return undefined;
  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat("en-GB", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
  if (/^[+-]/.test(resolved)) return undefined;
  return CURRENT_NAME[resolved] ?? resolved;
}

/**
 * THE NAMES `Intl` STILL CALLS CANONICAL AND THE ZONE DATABASE RETIRED.
 *
 * ICU keeps the spelling a zone had when it was first added, so `Intl`
 * resolves Kyiv to `Europe/Kiev` and Kolkata to `Asia/Calcutta`, and a browser
 * built on it reports those. The IANA database renamed them and moved the old
 * spelling to its `backward` file, which some Postgres builds do not load: on
 * one that does not, `AT TIME ZONE 'Europe/Kiev'` is an error rather than a
 * day, and the heatmap query in `lib/progress/summary.ts` throws for every
 * learner whose browser is set there. Ukrainian is one of the three languages
 * this app glosses in, so that is not somebody else's edge case.
 *
 * So the stored and cached name is the current one, which every build of the
 * database carries and `Intl` accepts as an alias with the same wall clock.
 * Measured against Postgres 16's `pg_timezone_names` on 2026-09-24: these are
 * all eighteen of the names `Intl` resolves to that it lacks, each of the
 * right-hand names is present, and each keeps the same wall clock across the
 * year. `lib/time/zone.itest.ts` asks the whole list of zones again on every
 * run against whatever Postgres the suite has, so a new rename fails there.
 */
const CURRENT_NAME: Readonly<Record<string, string>> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

/**
 * The zone a browser should send the server, or null when there is nothing to send.
 *
 * Compared canonical to canonical, because the two sides no longer spell a zone
 * alike: `canonicalZone` stores the current IANA name, and a browser built on
 * ICU still reports the retired one (`Europe/Kiev`, `Asia/Calcutta`). Compared
 * raw, a learner in any of the `CURRENT_NAME` zones never matched what was
 * stored, so every page load sent the same zone back to be written again, for
 * everybody in India and Ukraine among others. A bare offset is never sent,
 * since the server refuses it and would be asked again on every load.
 */
export function zoneToSend(browser: string | null | undefined, stored: string | null | undefined): string | null {
  const zone = canonicalZone(browser);
  if (!zone) return null;
  return zone === canonicalZone(stored) ? null : zone;
}

/** Whether this is a named zone both `Intl` and Postgres read the same way. See `canonicalZone`. */
export function isTimeZone(value: unknown): value is string {
  return canonicalZone(value) !== undefined;
}

/** A stored zone in its canonical spelling, or `undefined` when it is missing or not a named zone. */
export function normaliseZone(value: unknown): Zone {
  return canonicalZone(value);
}

/*
  Formatters are memoised because a heatmap asks for one day key per review and
  a busy learner's chart is thousands of rows. Constructing an
  `Intl.DateTimeFormat` is the expensive part; formatting with one is not. The
  map is keyed on the zone name, one entry per zone a process ever sees, which
  on a phone is one and on a server is one per zone its learners live in.
  Bounded by the IANA database rather than by anybody's input, because every
  key has been through `canonicalZone`: it used to take any casing `Intl`
  would, so one learner could grow it by a formatter per spelling of one zone.
*/
const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: Zone): Intl.DateTimeFormat {
  const key = zone ?? "";
  const cached = formatters.get(key);
  if (cached) return cached;
  const made = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatters.set(key, made);
  return made;
}

export interface ZonedParts {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
}

/*
  THE OFFSET, REMEMBERED PER QUARTER HOUR, BECAUSE THE FORMATTER WAS THE PAGE.

  Memoising the formatter made constructing one free and left the call itself,
  and a heatmap, a daily load and an hour-of-day reading each ask it once per
  review. Profiled on /progress over a year of reviews (60,000 rows, about 165
  a day), `dayKey` and `hourOf` were 1.1 of the page's 1.9 seconds on a local
  socket, most of it `formatToParts` building parts objects for instants a few
  seconds apart.

  A zone's offset only changes at a transition, and every transition in the
  zone database since 1970 falls on a quarter hour of UTC, since offsets are
  whole quarter hours and clocks change on a local hour. So the offset is read
  once per UTC quarter hour and the wall clock inside it is arithmetic. That is
  checked rather than trusted: the offset is read at both ends of the quarter,
  and a quarter whose two ends disagree is one a transition fell inside, which
  is never cached and always read the slow way. `day.test.ts` holds the fast
  path to the slow one across every transition of several zones, minute by
  minute.

  Bounded, because a cache that never evicts is a leak with a hit rate: a year
  of sittings is a few thousand quarters, and past the ceiling the map starts
  again rather than growing.
*/
const QUARTER_MS = 15 * 60_000;
const OFFSET_CEILING = 20_000;
const offsets = new Map<string, Map<number, number | null>>();

/** Milliseconds `zone`'s wall clock is ahead of UTC at `ms`, read the slow way. */
function offsetAt(ms: number, zone: Zone): number {
  const p = slowPartsIn(new Date(ms), zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** The offset for the quarter holding `ms`, or null where a transition falls inside it. */
function quarterOffset(ms: number, zone: Zone): number | null {
  const key = zone ?? "";
  let perZone = offsets.get(key);
  if (!perZone) { perZone = new Map(); offsets.set(key, perZone); }
  const quarter = Math.floor(ms / QUARTER_MS);
  const held = perZone.get(quarter);
  if (held !== undefined) return held;
  const start = quarter * QUARTER_MS;
  const first = offsetAt(start, zone);
  const found = offsetAt(start + QUARTER_MS - 1000, zone) === first ? first : null;
  if (perZone.size >= OFFSET_CEILING) perZone.clear();
  perZone.set(quarter, found);
  return found;
}

/**
 * The wall clock in `zone` at the instant `date`.
 *
 * The offset for the quarter hour is remembered and the parts are arithmetic
 * on it, which is the same answer as `formatToParts` and a fraction of the
 * cost; a quarter a transition fell inside is read the slow way.
 */
export function partsIn(date: Date, zone: Zone): ZonedParts {
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return slowPartsIn(date, zone);
  const offset = quarterOffset(ms, zone);
  if (offset === null) return slowPartsIn(date, zone);
  const wall = new Date(ms + offset);
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    second: wall.getUTCSeconds(),
  };
}

/**
 * The wall clock in `zone` at the instant `date`, asked of the formatter.
 *
 * Read through `formatToParts` rather than by formatting and re-parsing a
 * string, because a locale decides what a formatted date looks like and no
 * locale decides what a part is called.
 */
export function slowPartsIn(date: Date, zone: Zone): ZonedParts {
  const out: Record<string, number> = {};
  for (const part of partsFormatter(zone).formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year ?? date.getFullYear(),
    month: out.month ?? date.getMonth() + 1,
    day: out.day ?? date.getDate(),
    // "24" is what h23 never produces, but a runtime that disagrees should
    // land on midnight rather than on a day boundary an hour into tomorrow.
    hour: (out.hour ?? date.getHours()) % 24,
    minute: out.minute ?? date.getMinutes(),
    second: out.second ?? date.getSeconds(),
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Every day boundary in one zone. Server code takes one of these. */
export interface DayClock {
  /** `YYYY-MM-DD` for the calendar day a timestamp falls in. */
  dayKey(date?: Date): DayKey;
  /**
   * The hour on the wall clock, 0 to 23.
   *
   * Two badges turn on it — "review before 7am" and "review after 11pm" — and
   * both were reading the deployment's hour, so a learner in Tallinn earned
   * the early bird for studying at nine in the morning and the night owl for
   * studying at two in the afternoon.
   */
  hourOf(date?: Date): number;
  /** The instant of local midnight at the start of the day `date` falls in. */
  startOfDay(date?: Date): Date;
  /** The instant of local midnight `n` days before `from` (negative moves forward). */
  shiftDay(from: Date, n: number): Date;
  /** Day keys from `days - 1` days ago up to today, oldest first. */
  recentDayKeys(days: number, from?: Date): DayKey[];
  /** How many whole calendar days lie between two timestamps (`b - a`). */
  daysBetween(a: Date, b: Date): number;
  /** The zone this clock was given, or `undefined` for the process's own. */
  readonly zone: Zone;
  /**
   * The IANA name this clock actually reads, never undefined.
   *
   * Postgres knows the same names, so a query that has to bucket by day in the
   * database (the streak's, which would otherwise load a year of rows to count
   * distinct days) can be told the same zone this clock uses and come back
   * with keys that agree with it.
   */
  readonly zoneName: string;
}

/**
 * Day boundaries in `zone`.
 *
 * An unrecognised zone is treated as absent rather than as an error: this runs
 * on the render path of the busiest page in the app, and a learner whose
 * stored zone stopped existing between two releases of the IANA database
 * should see the previous behavior, not a 500.
 */
export function dayClock(zone?: unknown): DayClock {
  const tz = normaliseZone(zone);

  const keyOf = (date: Date): DayKey => {
    const p = partsIn(date, tz);
    return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  };

  /*
    Local midnight as an instant. The first guess subtracts the wall clock's
    own time of day, which is right on every day but the two a year when the
    offset changed between midnight and `date`: the time of day is read in the
    offset at `date`, and midnight was in the other one. In Tallinn on the
    spring change that guess lands at 23:00 the day before, so the day fell
    out of every walk built on this (a streak over the 29th and the 30th of
    March read 1), and on the autumn change it lands at 01:00.

    So the guess is read again where it landed and corrected in the wall
    clock's own terms: on the previous day it steps forward to the midnight
    after, and still inside the day it steps back by what the clock says is
    left. Two steps settle both changes. Where midnight itself does not exist,
    because a zone jumps from 23:59 to 01:00, stepping back would leave the
    day, so the first instant that does exist is kept, which is what a day
    boundary means there.
  */
  const timeOfDay = (date: Date): number => {
    const p = partsIn(date, tz);
    return p.hour * 3_600_000 + p.minute * 60_000 + p.second * 1000 + date.getMilliseconds();
  };
  const startOf = (date: Date): Date => {
    const key = keyOf(date);
    let at = new Date(date.getTime() - timeOfDay(date));
    for (let step = 0; step < 3; step++) {
      if (keyOf(at) !== key) {
        at = new Date(at.getTime() + (86_400_000 - timeOfDay(at)));
        continue;
      }
      const left = timeOfDay(at);
      if (left === 0) break;
      const back = new Date(at.getTime() - left);
      if (keyOf(back) !== key) break;
      at = back;
    }
    return at;
  };

  /*
    Days are stepped from midday rather than from midnight. A day is not always
    24 hours long — a DST change makes one 23 and another 25 — so adding
    `n * 86_400_000` to a midnight can land on the previous day's 23:00 and
    skip a day out of a heatmap. Midday has twelve hours of slack either side,
    which is more than any real offset change.
  */
  const shift = (from: Date, n: number): Date => {
    const midday = new Date(startOf(from).getTime() + 12 * 3_600_000);
    return startOf(new Date(midday.getTime() - n * 86_400_000));
  };

  return {
    zone: tz,
    zoneName: tz ?? new Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayKey: (date = new Date()) => keyOf(date),
    hourOf: (date = new Date()) => partsIn(date, tz).hour,
    startOfDay: (date = new Date()) => startOf(date),
    shiftDay: shift,
    recentDayKeys(days, from = new Date()) {
      const out: DayKey[] = [];
      for (let i = days - 1; i >= 0; i--) out.push(keyOf(shift(from, i)));
      return out;
    },
    daysBetween(a, b) {
      return Math.round((startOf(b).getTime() - startOf(a).getTime()) / 86_400_000);
    },
  };
}

/**
 * The same boundaries, in whatever zone this process runs in.
 *
 * Correct in a browser, where the process is the learner. On a server it is
 * the deployment's zone, so anything rendered for one person takes a
 * `dayClock` instead — see the header.
 */
const processClock = dayClock();

/** `YYYY-MM-DD` for the local calendar day a timestamp falls in. */
export function dayKey(date: Date = new Date()): DayKey {
  return processClock.dayKey(date);
}

/** The local day `n` days before `from` (negative `n` moves forward). */
export function shiftDay(from: Date, n: number): Date {
  return processClock.shiftDay(from, n);
}

/** Midnight at the start of the local day `date` falls in. */
export function startOfDay(date: Date = new Date()): Date {
  return processClock.startOfDay(date);
}

/**
 * The first instant of the calendar day `day` anywhere on Earth.
 *
 * A day begins earliest at UTC+14, so this is that day's midnight in UTC less
 * fourteen hours. It needs no zone, which is the point: a daily puzzle is keyed
 * on the learner's own day and rebuilt on the server from that key alone to be
 * marked, so "what the dictionary held when this day began" has to be one
 * instant the key decides by itself. Anything stored after it is stored during
 * somebody's day, and nothing a learner does inside their day comes before it.
 */
export function earliestStartOf(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) - 14 * 60 * 60 * 1000);
}

/** Local day keys from `days - 1` days ago up to today, oldest first. */
export function recentDayKeys(days: number, from: Date = new Date()): DayKey[] {
  return processClock.recentDayKeys(days, from);
}

/** How many whole local days lie between two timestamps (`b - a`). */
export function daysBetween(a: Date, b: Date): number {
  return processClock.daysBetween(a, b);
}

/**
 * One sentence saying when the next card comes back.
 *
 * The caught-up review screen said "All 312 cards are scheduled for later",
 * which is a count the learner already knows and is not what somebody looking
 * at an empty queue wants. `docs/18-voice.md` uses this exact screen as its
 * worked example and the answer it gives is a day.
 *
 * A day rather than a time, because FSRS schedules in days and a card due at
 * 04:12 is a card due on Thursday. Inside a week it is named by its weekday,
 * which is how anybody talks about the next few days; past that a weekday
 * would be ambiguous, so it says how many days. "Later today" and "tomorrow"
 * are the two the calendar has better words for than a weekday does.
 *
 * The weekday is written in English, because the sentence it sits in is
 * English. This string is built on a server so that it can use the learner's
 * own *zone*, which decides which day it is, and a server has no reader's
 * locale to offer. It used to take the deployment's instead, which is English
 * on Vercel and is anything at all on a machine somebody set up in Tallinn:
 * "The next card comes back on laupäev." is neither language, and the unit
 * test for it failed on every non-English host.
 */
export function nextCardLine(due: Date, now: Date, clock: DayClock): string {
  const days = clock.daysBetween(now, due);
  if (days <= 0) return "The next card comes back later today.";
  if (days === 1) return "The next card comes back tomorrow.";
  if (days < 7) {
    const weekday = new Intl.DateTimeFormat("en", {
      weekday: "long", timeZone: clock.zoneName,
    }).format(due);
    return `The next card comes back on ${weekday}.`;
  }
  return `The next card comes back in ${days} days.`;
}
