/*
  WHICH LETTERS SOMEBODY WANTS, AND WHY THE DEFAULT IS THE WAY IT IS.

  Stored as the kinds that are OFF, space separated, in one setting, which is
  the shape `todayOrder` takes one key over. A missing row therefore means
  every letter is on, and that is a decision worth arguing rather than
  assuming, because this app's usual answer is the opposite.

  THE TWO PRECEDENTS POINT DIFFERENT WAYS AND NEITHER SETTLES IT. `letterBar`
  defaults on because reading a missing row as a refusal would take away the
  only way a learner has of typing õ, which is something they already had.
  `researchOptOut` defaults to counted because that is the behaviour every
  existing learner already had. Neither applies: email is new, nobody has it
  yet, so absence is not a state anybody is already in.

  SO IT IS DECIDED ON ITS OWN TERMS, AND THE TERMS ARE THESE. A person signed
  up to a course and gave an address in order to sign in to it; a short note on
  an evening they have not studied is the thing the course is for, sent to the
  address they gave for it, and every message carries a one-press way out that
  works without signing in. That is the arrangement the ePrivacy Directive's
  own carve-out describes, and it is the one a reasonable person would expect.
  What would not be defensible is anything beyond the course: no offers, no
  news, nothing about anybody else's product, and the closed list of kinds in
  `letter.ts` is what keeps that mechanical rather than promised.

  It also costs nothing on the deployment this repository ships as. With no
  `RESEND_API_KEY` there is no transport and nothing is sent at all, so the
  default is only ever reached by an operator who went and configured one.

  `all` IS A VALUE AND NOT A SHORTHAND. When somebody presses the mail client's
  own unsubscribe button they are not choosing among four kinds, they are
  saying stop. Writing out the four kinds that exist today would quietly switch
  a fifth on for them the day one is added, which is the opposite of what they
  said. So `all` is stored as `all` and means every optional letter, now and
  later.
*/
import { DEFAULT_OFF, EMAIL_KINDS, OPTIONAL_KINDS, isEmailKind, type EmailKind } from "./letter";

/**
 * What a learner has switched off, and what they have switched on.
 *
 * TWO SETS, BECAUSE THERE ARE TWO DEFAULTS. Nearly every kind is part of the
 * course somebody signed up to and is on until they say otherwise; `wordday`
 * is a daily message with nothing to do in it and is off until they ask. One
 * set cannot carry both readings: an off-set alone would have to mean "present
 * means off" for six kinds and "present means on" for one, which is a rule
 * nobody can hold in their head and the sort that gets inverted by whoever
 * next edits it.
 *
 * `all-off` still means all off, including the opted-in kind, and that is the
 * half worth stating: somebody who presses the mail client's own unsubscribe
 * button has said stop, and a daily word arriving afterwards because they had
 * once asked for it would be the plainest possible breach of what that button
 * promises.
 */
export type EmailPrefs =
  | { readonly kind: "all-off" }
  | {
      readonly kind: "some-off";
      readonly off: ReadonlySet<EmailKind>;
      /** Opt-in kinds explicitly asked for. Empty for nearly everybody. */
      readonly on: ReadonlySet<EmailKind>;
    };

export const ALL_OFF = "all";

/**
 * Read the stored value.
 *
 * Forgiving in the same way `todayOrder`'s reader is: an unknown kind is
 * dropped rather than throwing, because this is read on a scheduled run with
 * nobody watching and one odd row should cost that learner's preference rather
 * than everybody's letters. A missing row is every letter on.
 */
export function emailPrefsFrom(
  stored: string | null | undefined,
  /** The opt-in row, which is empty for nearly everybody. */
  optedIn?: string | null,
): EmailPrefs {
  const value = (stored ?? "").trim();
  if (value === ALL_OFF) return { kind: "all-off" };
  const read = (raw: string | null | undefined): Set<EmailKind> =>
    new Set(
      (raw ?? "")
        .trim()
        .split(/\s+/)
        .filter(isEmailKind)
        .filter((k) => k !== "system"),
    );
  return { kind: "some-off", off: read(value), on: read(optedIn) };
}

export function emailPrefsTo(prefs: EmailPrefs): string {
  return prefs.kind === "all-off" ? ALL_OFF : [...prefs.off].sort().join(" ");
}

/** The opt-in row, written beside the one above. */
export function emailOptInTo(prefs: EmailPrefs): string {
  return prefs.kind === "all-off" ? "" : [...prefs.on].sort().join(" ");
}

/**
 * Whether one letter may be sent.
 *
 * `system` is always true and is not reachable by any stored value, because
 * `emailPrefsFrom` drops it on the way in. A sign-in link is not a preference.
 */
export function wants(prefs: EmailPrefs, kind: EmailKind): boolean {
  if (kind === "system") return true;
  if (prefs.kind === "all-off") return false;
  if (prefs.off.has(kind)) return false;
  return DEFAULT_OFF.includes(kind) ? prefs.on.has(kind) : true;
}

/** Switch some off, keeping whatever was already off. */
export function switchOff(prefs: EmailPrefs, kinds: readonly EmailKind[]): EmailPrefs {
  if (prefs.kind === "all-off") return prefs;
  const wanted = kinds.filter((k) => k !== "system");
  const off = new Set([...prefs.off, ...wanted]);
  /*
    Switching something off also withdraws any asking for it, so that turning
    the daily word off and on again is two presses rather than a state where
    one row says off and the other says on and the reader has to know which
    wins.
  */
  const on = new Set([...prefs.on].filter((k) => !off.has(k)));
  /*
    Turning off every kind there is means the same thing as pressing the
    client's own button, so it is stored the same way. Otherwise somebody who
    unticked every box by hand would be opted in to the next kind the day it
    exists, having plainly said they wanted none. A kind that is off until
    asked for and was never asked for is off too, since its box was already
    unticked and there was nothing to press.
  */
  return OPTIONAL_KINDS.every((k) => off.has(k) || (DEFAULT_OFF.includes(k) && !on.has(k)))
    ? { kind: "all-off" }
    : { kind: "some-off", off, on };
}

/** Switch one back on, which `all-off` has to be expanded to do. */
export function switchOn(prefs: EmailPrefs, kind: EmailKind): EmailPrefs {
  if (kind === "system") return prefs;
  const off = prefs.kind === "all-off" ? new Set(OPTIONAL_KINDS) : new Set(prefs.off);
  off.delete(kind);
  const on = prefs.kind === "all-off" ? new Set<EmailKind>() : new Set(prefs.on);
  if (DEFAULT_OFF.includes(kind)) on.add(kind);
  return { kind: "some-off", off, on };
}

/** Every optional kind with whether it is on, for the settings screen. */
export function kindStates(prefs: EmailPrefs): { kind: EmailKind; on: boolean }[] {
  return EMAIL_KINDS.filter((k) => k !== "system").map((kind) => ({
    kind,
    on: wants(prefs, kind),
  }));
}
