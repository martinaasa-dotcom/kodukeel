import { cache } from "react";

import { prisma } from "@/lib/db";

/**
 * Per-learner settings, in one place.
 *
 * The Setting table is a key/value bag, which is the right shape for a dozen
 * small preferences but the wrong shape for string literals scattered across
 * twenty files — one typo and a setting silently reverts to its default forever.
 * Every key lives here, every read and write goes through these helpers, and
 * the defaults are stated once.
 */
export const SETTING_KEYS = {
  dailyGoal: "dailyGoal",
  sprintBest: "sprintBest",
  matchBest: "matchBest",
  streakShields: "streakShields",
  streakShieldDates: "streakShieldDates",
  /**
   * The highest streak milestone a shield has been banked for.
   *
   * A shield used to arrive on the side of a badge: `streak_7`, `streak_30`
   * and `streak_100` each paid one out, and the `Achievement` row was what
   * stopped it being paid twice. The badges are gone and the shields are not,
   * so this is the high-water mark that record used to be, and it is a number
   * rather than a set for the same reason the milestones are a ladder: reaching
   * 30 means 7 was reached on the way.
   */
  streakShieldsAwarded: "streakShieldsAwarded",
  displayName: "displayName",
  reviewMode: "reviewMode",
  onboardedAt: "onboardedAt",
  cefrGoal: "cefrGoal",
  /**
   * Whether the Estonian letter bar is drawn under text fields.
   *
   * Asked at first run and changed in Settings or from the bar itself. Only
   * ever consulted on a desktop: see lib/ux/letterBar.ts for why it is a
   * question at all, and app/globals.css for where the answer is applied.
   */
  letterBar: "letterBar",
  /**
   * The level the learner is at, as opposed to the one they are aiming for.
   *
   * Separate from cefrGoal on purpose: what somebody wants to reach and where
   * they are now are different facts, and the course needs the second one to
   * decide what to open and where to send them next. Written by the placement
   * ladder, by a level checkpoint when one is passed, and by the fuller
   * assessment at /assess, which is the better instrument of the three.
   */
  cefrPlacement: "cefrPlacement",
  /**
   * When `cefrPlacement` was last written, as an ISO timestamp.
   *
   * There are two answers to "what level is this learner" and until now the
   * measurement always won: `courseLevelFor` read the most recent level check
   * first and fell back to this setting only when there had never been one. So
   * a learner who sat a check in March and then said in Settings that they had
   * moved up was told, by every screen that reads a level, that they had not.
   *
   * A date is what settles it. Whichever of the two was stated later is the
   * one the app holds, so changing it by hand takes effect immediately and
   * sitting a new check takes it back. A row with no timestamp is older than
   * any measurement, which is exactly the behavior every deployment already
   * had.
   */
  cefrPlacementAt: "cefrPlacementAt",

  /*
    Why this person is here, what they want to reach, and by when. Asked once
    at first run and editable in Settings. Five keys rather than one JSON blob
    so a single answer can be changed without reading and rewriting the rest.
  */
  goalReason: "goalReason",
  goalTarget: "goalTarget",
  goalDeadline: "goalDeadline",
  goalDays: "goalDays",
  goalNote: "goalNote",

  /**
   * The learner's own timezone, as an IANA name, reported by their browser.
   *
   * Every screen that leads with a day boundary — the streak, the daily goal,
   * the quests, the heatmap — is rendered on the server, and a server has no
   * idea what midnight means to the person reading it. Without this it used
   * the deployment's own zone, which on Vercel is UTC, and a learner in
   * Tallinn who studied at one in the morning had it filed under yesterday.
   * See lib/time/day.ts.
   *
   * Written by the browser rather than asked for, because nobody should have
   * to answer a question their device already knows the answer to, and it is
   * re-checked on every load so it follows somebody who moves.
   */
  timeZone: "timeZone",


  /**
   * How Estonian is read aloud: which of the speech service's voices, whether
   * a card reads itself when it appears, and whether an answer makes a sound.
   * The values and their defaults live in lib/audio/voice.ts; a missing row
   * reads as the behavior everybody had before the question existed.
   */
  ttsVoice: "ttsVoice",
  autoplayAudio: "autoplayAudio",
  feedbackSounds: "feedbackSounds",
  /**
   * How fast Estonian is read aloud, where an unset row means the pace this
   * learner's own level opens at rather than a fixed speed for everybody. The
   * ladder and the reasoning live in lib/audio/pace.ts; the value stored here
   * is a pace by name, so it keeps meaning the same thing if the levels move
   * under it.
   */
  speechPace: "speechPace",
  /**
   * Whether the listening rounds vary how a sentence is delivered: at speed,
   * over café noise, down a phone line, from halfway through. On by default,
   * deliberately, because the counter is what this app is for; the values
   * live in lib/audio/conditions.ts.
   */
  hearing: "hearing",
  /**
   * Whether a conversation is heard before its words are shown. In a shop you
   * do not get the subtitles, and every line in a scene has been text and
   * audio at once, so the thing that actually breaks down at a counter was
   * never rehearsed. Off by default, since it is harder than what everybody
   * has had; revealing costs nothing and is never recorded.
   */
  support: "support",
  /**
   * Which language a meaning is given in beside the English.
   *
   * English is the default and stays the default, because a missing row has to
   * read as the behavior everybody had. The values and the reasoning live in
   * lib/collections/glossLanguage.ts; the equivalents themselves come from
   * Ekilex rather than from anything this app or a model wrote.
   */
  glossLanguage: "glossLanguage",
  /**
   * Whether the dictionary is put under every word of an attested sentence.
   *
   * A first meeting and a line in a conversation both underline every word
   * `matchEstonianForm` will vouch for, and a panel under the sentence says
   * what one means. It is the difference between a sentence somebody can read
   * and one they can only look at, and it is also six underlines across a line
   * a learner is trying to read, which was reported as exactly that. On by
   * default, because a missing row has to read as the behavior everybody had;
   * off means the lookup is never made rather than made and hidden. The values
   * and the reasoning live in lib/ux/wordGloss.ts.
   */
  wordGloss: "wordGloss",
  /**
   * Whether the English reading of a case question (`in what? where?`) shows
   * beside the Estonian one (`milles? kus?`).
   *
   * The Estonian question is never touched by this: it is the case's own
   * name and stays on screen regardless. On by default through B1 and off
   * from B2, and a stored value always wins over that default in either
   * direction. See lib/estonian/caseGloss.ts.
   */
  caseQuestionGloss: "caseQuestionGloss",
  /**
   * Whether this learner's reviews are counted in the anonymous statistics.
   *
   * `/api/research` turns the review log into accuracy per grammatical case,
   * per gradation pattern and per word, across everybody, behind a disclosure
   * gate that publishes nothing resting on fewer than ten people. What comes
   * out is not personal data by the time it exists, which is exactly why this
   * setting is not consent and is not asked for at sign-up: a question nobody
   * needs to answer should not be put to them on the way in.
   *
   * It exists anyway, because this app is for people whose data is the reason
   * they are careful, and "we aggregated it, trust us" is the sentence they
   * have heard before. A missing row means counted, which is the behavior
   * everybody already had, and the row is written only by somebody who went to
   * Settings and turned it off. See lib/research/corpus.ts.
   */
  researchOptOut: "researchOptOut",
  /**
   * Which letters this learner has switched off, or `all`.
   *
   * A missing row is every letter on, which is the one default in this file
   * that is not simply "what everybody already had": email is new, so nobody
   * is in any state yet, and the argument for it is written out in
   * `lib/email/prefs.ts` rather than repeated here. The value is read by the
   * scheduled run and written from Settings and from the one-click link at the
   * bottom of every message.
   */
  emailsOff: "emailsOff",
  /**
   * Which letters this learner has switched **on** that are off by default.
   *
   * A second row rather than an inversion of the one above, because the two
   * answer different questions and a single list cannot hold both: `emailsOff`
   * is a refusal of something we would otherwise send, and this is a request
   * for something we otherwise would not. Folding them together would mean a
   * missing entry had to be read one way for one kind and the other way for
   * another, decided by a table somewhere else, which is exactly the shape of
   * thing that comes apart when a kind is added.
   *
   * `DEFAULT_OFF` in `lib/email/prefs.ts` is what says which kinds this is
   * consulted for, and it is one: a daily word is not part of the course
   * somebody signed up for, so it waits to be asked for.
   */
  emailsOn: "emailsOn",
  /**
   * The highest level a milestone letter has already congratulated them on.
   *
   * A high-water mark, the shape `streakShieldsAwarded` takes and for its
   * reason: the levels are a ladder, so one comparison says whether there is
   * anything new to say, even to somebody whose whole A1 arrived at once in a
   * restore. Without it the letter either fires on every run for ever or needs
   * a row per level, and the first of those is the one that happens.
   *
   * Written after the letter has actually gone, never when it is decided: a
   * mark written on a send that then failed is a milestone nobody is ever told
   * about, and there is no second chance at a level somebody passes once.
   */
  milestoneToldFor: "milestoneToldFor",
  /**
   * The last day a shield covered that the learner has been told about.
   *
   * A shield is spent silently by `resolveStreakFor` on whichever render or
   * run happens to resolve the streak first, so "did we tell them" cannot be
   * read off whether this run spent it. The day key is the mark, and a day key
   * sorts lexically, which is what makes "newer than the last one we mentioned"
   * a string comparison rather than a parse.
   */
  shieldToldFor: "shieldToldFor",
  /**
   * Set once the sending provider has refused this address outright.
   *
   * Not a preference and never shown as one: it is a fact about the address
   * rather than about the person, and the person may well not know. Carrying
   * on mailing a dead address is what a mailbox provider reads as a sender who
   * is not paying attention, and the cost of that reputation lands on the
   * sign-in links, which are the messages somebody actually needs. Cleared by
   * nothing automatic, because an address that starts working again is an
   * address somebody changed, and changing it clears this with it.
   */
  emailUndeliverable: "emailUndeliverable",
  /**
   * The hour they want to be reminded at, as "HH:MM" on their own clock.
   *
   * There are two things that remind somebody to study here and until this
   * there was no one answer to when: the calendar file took an hour off a
   * query string and stored nothing, and the evening letter had nowhere to
   * read one from. So an app that offered a reminder at 08:00 would have
   * mailed the same learner at six in the evening.
   *
   * A missing row is early evening, which is what the calendar file has always
   * defaulted to, and `parseReminderTime` is the one reader of the format.
   */
  reminderAt: "reminderAt",
  /**
   * The order the cards on Today are dealt in, as slot ids space separated.
   *
   * A missing row is the shipped order, which is an argument about what to do
   * first and is right for most people; a row is written only by somebody who
   * went to Settings and moved a card. The ids, the default and the forgiving
   * reader live in lib/ux/todayOrder.ts. The cap on how many cards are drawn
   * is not part of this and cannot be changed by it.
   */
  todayOrder: "todayOrder",
  /**
   * How long a timed round runs, as a pace rather than a number of seconds.
   *
   * The Case Sprint and the daily quest each had a fixed clock, which is WCAG
   * 2.2.1 failed twice: a learner who reads slowly or types with one hand was
   * shut out of both. What is stored is a multiplier over each round's own
   * base, since the two bases are different on purpose. A missing row is the
   * shipped length, which is what everybody already had. The table and the
   * reasoning live in lib/ux/roundClock.ts; the mock examination's clock is
   * not this setting's business and does not read it.
   */
  roundPace: "roundPace",
  /**
   * Which planned programme the learner is following, if any.
   *
   * A programme is the evening decided in advance: which words, which order,
   * which round after which (`lib/course/`). The stored value is a programme
   * id, or `off` where somebody has said they would rather pick their own
   * evening.
   *
   * A MISSING ROW IS NOT A REFUSAL, and it is not a yes either. It is
   * everybody who used this app before the programme existed, so it is read as
   * "offer it where it fits": a beginner is led, and somebody the app has
   * already measured at B1 is not handed a course of greetings on the screen
   * they open every morning. `lib/progress/course.ts` is where that is
   * decided, once, so the course screen and Today cannot disagree about
   * whether anybody is on one.
   */
  programme: "programme",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const DEFAULT_DAILY_GOAL = 15;

/** How a review session asks its questions. */
export type ReviewMode = "flip" | "type";
export const DEFAULT_REVIEW_MODE: ReviewMode = "type";

/**
 * ONE READ OF THIS LEARNER'S SETTINGS PER REQUEST, HOWEVER MANY ASK.
 *
 * Every helper below used to go to the database on its own, and that is fine
 * read one at a time and wrong read the way the app actually reads them.
 * Measured on Today, which is the page somebody opens every morning: eight
 * separate `SELECT ... FROM "Setting" WHERE "ownerId" = $1` in one render.
 * The shell wants the letter bar and the timezone, `learnerDayClock` wants the
 * timezone again, `dailySummary` wants the daily goal, `resolveStreakFor`
 * wants the shields, the page wants four more, `courseLevelFor` wants the
 * placement and `wordOfDay` wants its own. Each is one indexed row and costs
 * nothing at all against a socket on the same machine; against a hosted
 * Postgres each is a round trip, and the round trips are the page.
 *
 * So the table is read once per learner per request and every helper is served
 * from that. Fifteen rows is the whole of what a learner has, which is smaller
 * than the eight `IN` lists it replaces.
 *
 * `cache()` is React's request-scoped memo and it holds the *container* rather
 * than the answer, which is what makes a write able to correct it: a Server
 * Action that stores a value and then reads it back in the same request has to
 * see what it just wrote, and `resolveStreakFor` banking a shield followed by
 * `awardBadges` reading the count is exactly that, on the busiest page here.
 * Outside a request React does not memoize at all, so a script, a test and a
 * seed get a fresh map per call and the old behavior with it.
 */
const settingsScope = cache((): Map<string, Promise<Map<string, string>>> => new Map());

function loadAll(ownerId: string): Promise<Map<string, string>> {
  const scope = settingsScope();
  const held = scope.get(ownerId);
  if (held) return held;
  const loading = prisma.setting
    .findMany({ where: { ownerId }, select: { key: true, value: true } })
    .then((rows) => new Map(rows.map((row) => [row.key, row.value])))
    // A failed read must not be remembered as this learner's settings, or one
    // bad moment at the database is answered with defaults for the rest of the
    // request. Same `finally` argument as lib/cache/singleFlight.ts.
    .catch((error: unknown) => {
      scope.delete(ownerId);
      throw error;
    });
  scope.set(ownerId, loading);
  return loading;
}

/** Reads several settings in one query. Missing keys are simply absent. */
export async function readSettings(
  ownerId: string,
  keys: readonly SettingKey[],
): Promise<Partial<Record<SettingKey, string>>> {
  const all = await loadAll(ownerId);
  const out: Partial<Record<SettingKey, string>> = {};
  // Only what was asked for, which keeps the contract this had before: a
  // caller reading two keys may not quietly start seeing the other thirteen.
  for (const key of keys) {
    const value = all.get(key);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export async function readSetting(ownerId: string, key: SettingKey): Promise<string | null> {
  return (await loadAll(ownerId)).get(key) ?? null;
}

export async function writeSetting(ownerId: string, key: SettingKey, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { ownerId_key: { ownerId, key } },
    create: { ownerId, key, value },
    update: { value },
  });
  rememberWrite(ownerId, key, value);
}

/**
 * Several keys written in one transaction, so none of them lands without the
 * others. For pairs that mean something only together, like a letter's
 * refusal and its request, where a second write failing after the first had
 * landed left a kind refused and requested at once.
 */
export async function writeSettings(
  ownerId: string, entries: readonly (readonly [SettingKey, string])[],
): Promise<void> {
  await prisma.$transaction(entries.map(([key, value]) =>
    prisma.setting.upsert({
      where: { ownerId_key: { ownerId, key } },
      create: { ownerId, key, value },
      update: { value },
    })));
  for (const [key, value] of entries) rememberWrite(ownerId, key, value);
}

/**
 * Drop what this request remembers about a learner's settings.
 *
 * For the three paths that write the table without coming through
 * `writeSetting`: setting the course week to nothing (a delete, which is not a
 * value), restoring a backup, and erasing an account. All three are bulk
 * changes rather than one key, so correcting the held map in place would mean
 * describing the write twice, and all three end the request straight after.
 */
export function forgetSettings(ownerId: string): void {
  settingsScope().delete(ownerId);
}

/**
 * What a write leaves behind for the rest of the request.
 *
 * Corrected in place rather than dropped, because dropping it means the next
 * reader pays for the whole table again to learn one value we are holding.
 * Awaiting the held promise is what keeps a write that lands mid-read honest:
 * the map it patches is the one the outstanding read is about to resolve to.
 */
function rememberWrite(ownerId: string, key: SettingKey, value: string): void {
  const held = settingsScope().get(ownerId);
  if (!held) return;
  void held.then((all) => all.set(key, value)).catch(() => undefined);
}

/** A stored number, or the fallback when it is absent or unparseable. */
export function numberSetting(value: string | undefined | null, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function dailyGoalFrom(value: string | undefined | null): number {
  const n = numberSetting(value, DEFAULT_DAILY_GOAL);
  return n > 0 ? n : DEFAULT_DAILY_GOAL;
}

export function reviewModeFrom(value: string | undefined | null): ReviewMode {
  return value === "flip" || value === "type" ? value : DEFAULT_REVIEW_MODE;
}

/** Every key the goal answers live under, for a single read. */
export const GOAL_KEYS = [
  SETTING_KEYS.goalReason,
  SETTING_KEYS.goalTarget,
  SETTING_KEYS.goalDeadline,
  SETTING_KEYS.goalDays,
  SETTING_KEYS.goalNote,
] as const;
