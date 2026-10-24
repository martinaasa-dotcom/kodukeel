import { SPEECH_PACES } from "@/lib/audio/pace";
import { voiceFrom } from "@/lib/audio/voice";
import { glossLanguageFrom, type GlossLanguage } from "@/lib/collections/glossLanguage";
import { localeFrom, type Locale } from "@/lib/copy/locale";
import { isEmailKind, type EmailKind } from "@/lib/email/letter";
import { emailPrefsFrom, kindStates, switchOff, switchOn } from "@/lib/email/prefs";
import { changeEmailPrefs } from "@/lib/progress/emailPrefs";
import { changeCourseLevel } from "@/lib/progress/courseLevel";
import { courseLevelFor } from "@/lib/progress/level";
import { canonicalZone } from "@/lib/time/day";
import { parseReminderTime } from "@/lib/time/reminder";
import { roundPaceFrom, type RoundPace } from "@/lib/ux/roundClock";
import { sceneAnswerFrom, type SceneAnswer } from "@/lib/ux/sceneAnswer";
import { micInBoxesFrom, sendAtOnceFrom } from "@/lib/ux/speechPrefs";

import { dailyGoalFrom, readSetting, readSettings, SETTING_KEYS, writeSetting } from "./store";

/*
  THE SETTINGS A PHONE SHOWS, WRITTEN THROUGH ONE FUNCTION (N-8, D2).

  Every `set...` Server Action in `app/actions.ts` used to hold its own
  validation, and that was fine while the web was the only door. A native app
  changes the same settings through `PATCH /api/v1/me`, and a second copy of
  "a daily goal is between five and two hundred" is the copy nobody is
  watching. So the writes the phone needs live here, take the owner as a
  parameter and the values as whatever arrived off the wire, normalize them
  exactly as the actions did, and store them. An action resolves the owner from
  the cookie and keeps its `revalidatePath`; the route resolves it from a
  bearer token. Neither does anything else.

  A value is `unknown` on the way in, because both doors are public endpoints
  whose arguments are JSON off the wire whatever the types say: a number where
  a string was expected is read as nothing, never thrown on.

  The level is the one setting that changes the course as well as a row, so
  its body is `changeCourseLevel` in lib/progress/courseLevel.ts, which asks
  `moveBlockedFor` first; a patch carrying a level hands it there.
*/

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** An on-or-off answer, as the web sends it ("on", "off") or as a phone does (true, false). */
const onOff = (raw: unknown, fallback: "on" | "off"): "on" | "off" =>
  raw === true || raw === "on" ? "on" : raw === false || raw === "off" ? "off" : fallback;

/**
 * A change to some of the settings a phone shows, each field as it arrived.
 *
 * Every field is optional and `unknown`: both doors are public endpoints whose
 * arguments are JSON off the wire whatever the types say, so a number where a
 * string was expected is read as nothing, never thrown on.
 */
export interface AccountPatch {
  /** Changed through `changeCourseLevel`, which asks the A1 checks first. */
  level?: unknown;
  dailyGoal?: unknown;
  timeZone?: unknown;
  voice?: unknown;
  speechPace?: unknown;
  glossLanguage?: unknown;
  locale?: unknown;
  speechSendAtOnce?: unknown;
  speechInBoxes?: unknown;
  sceneAnswer?: unknown;
  roundPace?: unknown;
  reminderAt?: unknown;
  /** Kinds of letter and notification, each switched on or off. */
  letters?: Readonly<Record<string, unknown>>;
}

/** What each field of a patch was stored as, after normalizing. */
export interface AccountSaved {
  dailyGoal?: number;
  timeZone?: string;
  voice?: string;
  speechPace?: string;
  glossLanguage?: GlossLanguage;
  locale?: Locale;
  speechSendAtOnce?: "on" | "off";
  speechInBoxes?: "on" | "off";
  sceneAnswer?: SceneAnswer;
  roundPace?: RoundPace;
  reminderAt?: string;
  letters?: Partial<Record<EmailKind, boolean>>;
}

export type AccountChange =
  | { ok: true; saved: AccountSaved }
  /** `blocked` is a level the A1 checks hold back; `invalid` is a value nobody can store. */
  | { ok: false; field: keyof AccountPatch; refused: "invalid" | "blocked"; error: string };

/**
 * Some of the settings a phone shows, changed at once (N-8, D2).
 *
 * The one body behind every `set...` action that writes one of these and
 * behind `PATCH /api/v1/me`: the action hands it a patch of one field, the
 * route hands it whatever the phone sent. Each value is normalized exactly as
 * its action always did, and every field is read before any is written, so a
 * patch with one value nobody can store changes nothing rather than half of
 * what was asked.
 */
export async function changeAccountSettings(
  ownerId: string,
  patch: AccountPatch,
  now: Date = new Date(),
): Promise<AccountChange> {
  const saved: AccountSaved = {};

  if (patch.dailyGoal !== undefined) {
    // `Math.max(5, NaN)` is NaN, so without this "NaN" was stored as somebody's
    // goal: the fault the personal bests had before their own guard.
    const goal = patch.dailyGoal;
    if (typeof goal !== "number" || !Number.isFinite(goal)) {
      return { ok: false, field: "dailyGoal", refused: "invalid", error: "Pick a daily goal from the list." };
    }
    saved.dailyGoal = Math.min(200, Math.max(5, Math.round(goal)));
  }
  if (patch.timeZone !== undefined) {
    /*
      Stored in the spelling `Intl` resolves it to, so one zone is one value
      whatever casing arrived (`canonicalZone`). Validated rather than trusted,
      because the value reaches a raw `AT TIME ZONE` in the streak query.
    */
    const zone = canonicalZone(str(patch.timeZone));
    if (!zone) return { ok: false, field: "timeZone", refused: "invalid", error: "We didn't recognize that time zone." };
    saved.timeZone = zone;
  }
  if (patch.sceneAnswer !== undefined) {
    const answer = sceneAnswerFrom(patch.sceneAnswer);
    if (!answer) return { ok: false, field: "sceneAnswer", refused: "invalid", error: "That isn't a way to answer." };
    saved.sceneAnswer = answer;
  }
  if (patch.letters !== undefined) {
    /*
      Each kind checked against the closed list rather than trusted: an
      unchecked value writes a row the scheduler cannot read back, which reads
      as a switch that does nothing, and `system` is not the learner's to
      switch. A string "false" is truthy, so anything but a real boolean is
      refused rather than read as on.
    */
    const letters: Partial<Record<EmailKind, boolean>> = {};
    for (const [kind, on] of Object.entries(patch.letters ?? {})) {
      if (!isEmailKind(kind) || kind === "system") return { ok: false, field: "letters", refused: "invalid", error: "That isn't one of the emails we send." };
      if (typeof on !== "boolean") return { ok: false, field: "letters", refused: "invalid", error: "That needs a yes or a no." };
      letters[kind] = on;
    }
    saved.letters = letters;
  }
  // Normalized against the allowlist the speech route reads, never refused.
  if (patch.voice !== undefined) saved.voice = voiceFrom(str(patch.voice));
  // "auto" follows the level, and anything that is not a pace on offer is stored as that.
  if (patch.speechPace !== undefined) saved.speechPace = SPEECH_PACES.find((p) => p.id === str(patch.speechPace))?.id ?? "auto";
  if (patch.glossLanguage !== undefined) saved.glossLanguage = glossLanguageFrom(str(patch.glossLanguage));
  if (patch.locale !== undefined) saved.locale = localeFrom(str(patch.locale));
  if (patch.speechSendAtOnce !== undefined) saved.speechSendAtOnce = onOff(patch.speechSendAtOnce, "off");
  if (patch.speechInBoxes !== undefined) saved.speechInBoxes = onOff(patch.speechInBoxes, "on");
  // Through the one reader, so no round meets a pace it does not know.
  if (patch.roundPace !== undefined) saved.roundPace = roundPaceFrom(str(patch.roundPace));
  if (patch.reminderAt !== undefined) {
    // `parseReminderTime` clamps rather than rejects: a malformed value costs an hour somebody sets again.
    const { hour, minute } = parseReminderTime(str(patch.reminderAt));
    saved.reminderAt = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  /*
    The level last of the checks and first of the writes, because it is both:
    `changeCourseLevel` refuses a move up past an unpassed A1 check before it
    writes anything, so a patch it refuses has changed nothing, and one it
    accepts has moved the course before the rest is stored.
  */
  if (patch.level !== undefined) {
    const changed = await changeCourseLevel(ownerId, patch.level, now);
    if (!changed.ok) return { ok: false, field: "level", refused: changed.reason, error: changed.error };
  }

  const writes: Promise<unknown>[] = [];
  if (saved.dailyGoal !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.dailyGoal, String(saved.dailyGoal)));
  if (saved.timeZone !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.timeZone, saved.timeZone));
  if (saved.sceneAnswer !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.sceneAnswer, saved.sceneAnswer));
  if (saved.voice !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.ttsVoice, saved.voice));
  if (saved.speechPace !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.speechPace, saved.speechPace));
  if (saved.speechSendAtOnce !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.speechSendAtOnce, saved.speechSendAtOnce));
  if (saved.speechInBoxes !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.speechInBoxes, saved.speechInBoxes));
  if (saved.roundPace !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.roundPace, saved.roundPace));
  if (saved.reminderAt !== undefined) writes.push(writeSetting(ownerId, SETTING_KEYS.reminderAt, saved.reminderAt));
  await Promise.all(writes);

  /*
    The meaning language before the interface language, because the second
    reads the first. Somebody who reads the app in Russian or Ukrainian wants a
    word's meaning there too, and the Institute records one for most of the
    course; so where they have never chosen one, it follows. A stored choice
    is theirs and is left alone, and the English is printed beside it either way.
  */
  if (saved.glossLanguage !== undefined) await writeSetting(ownerId, SETTING_KEYS.glossLanguage, saved.glossLanguage);
  if (saved.locale !== undefined) {
    await writeSetting(ownerId, SETTING_KEYS.uiLocale, saved.locale);
    if (saved.locale !== "en" && (await readSetting(ownerId, SETTING_KEYS.glossLanguage)) === null) {
      await writeSetting(ownerId, SETTING_KEYS.glossLanguage, glossLanguageFrom(saved.locale));
    }
  }

  /*
    Both mail rows written together per kind, so a kind cannot end up refused
    and requested at once: `lib/email/prefs.ts` says why those are two
    questions rather than one list read two ways.
  */
  for (const [kind, on] of Object.entries(saved.letters ?? {}) as [EmailKind, boolean][]) {
    await changeEmailPrefs(ownerId, (current) => (on ? switchOn(current, kind) : switchOff(current, [kind])));
  }

  return { ok: true, saved };
}

/** The settings a phone shows, as one learner holds them now. */
export interface AccountSettings {
  level: Awaited<ReturnType<typeof courseLevelFor>>;
  dailyGoal: number;
  glossLanguage: GlossLanguage;
  voice: string;
  /** A pace's id, or "auto" where it follows the level. */
  speechPace: string;
  speech: { sendAtOnce: boolean; inBoxes: boolean };
  sceneAnswer: SceneAnswer | null;
  timeZone: string | null;
  roundPace: RoundPace;
  reminderAt: string | null;
  /** Every kind a learner may switch, and whether it is on. */
  letters: Partial<Record<EmailKind, boolean>>;
}

/**
 * What those settings read as now, through the readers the Settings screen
 * uses, so the phone and the web cannot disagree about one stored row.
 */
export async function accountSettingsFor(ownerId: string): Promise<AccountSettings> {
  const [settings, level] = await Promise.all([
    readSettings(ownerId, [
      SETTING_KEYS.dailyGoal, SETTING_KEYS.glossLanguage, SETTING_KEYS.ttsVoice, SETTING_KEYS.speechPace,
      SETTING_KEYS.speechSendAtOnce, SETTING_KEYS.speechInBoxes, SETTING_KEYS.sceneAnswer,
      SETTING_KEYS.timeZone, SETTING_KEYS.roundPace, SETTING_KEYS.reminderAt,
      SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn,
    ]),
    courseLevelFor(ownerId),
  ]);
  const prefs = emailPrefsFrom(settings[SETTING_KEYS.emailsOff], settings[SETTING_KEYS.emailsOn]);
  const pace = SPEECH_PACES.find((p) => p.id === settings[SETTING_KEYS.speechPace]);
  return {
    level,
    dailyGoal: dailyGoalFrom(settings[SETTING_KEYS.dailyGoal]),
    glossLanguage: glossLanguageFrom(settings[SETTING_KEYS.glossLanguage]),
    voice: voiceFrom(settings[SETTING_KEYS.ttsVoice]),
    speechPace: pace?.id ?? "auto",
    speech: {
      sendAtOnce: sendAtOnceFrom(settings[SETTING_KEYS.speechSendAtOnce]),
      inBoxes: micInBoxesFrom(settings[SETTING_KEYS.speechInBoxes]),
    },
    sceneAnswer: sceneAnswerFrom(settings[SETTING_KEYS.sceneAnswer]),
    timeZone: settings[SETTING_KEYS.timeZone] ?? null,
    roundPace: roundPaceFrom(settings[SETTING_KEYS.roundPace]),
    reminderAt: settings[SETTING_KEYS.reminderAt] ?? null,
    letters: Object.fromEntries(kindStates(prefs).map((s) => [s.kind, s.on])),
  };
}
