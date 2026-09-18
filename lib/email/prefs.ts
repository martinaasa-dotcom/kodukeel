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
import { EMAIL_KINDS, OPTIONAL_KINDS, isEmailKind, type EmailKind } from "./letter";

/** What a learner has switched off. */
export type EmailPrefs =
  | { readonly kind: "all-off" }
  | { readonly kind: "some-off"; readonly off: ReadonlySet<EmailKind> };

export const ALL_OFF = "all";

/**
 * Read the stored value.
 *
 * Forgiving in the same way `todayOrder`'s reader is: an unknown kind is
 * dropped rather than throwing, because this is read on a scheduled run with
 * nobody watching and one odd row should cost that learner's preference rather
 * than everybody's letters. A missing row is every letter on.
 */
export function emailPrefsFrom(stored: string | null | undefined): EmailPrefs {
  const value = (stored ?? "").trim();
  if (!value) return { kind: "some-off", off: new Set() };
  if (value === ALL_OFF) return { kind: "all-off" };
  return {
    kind: "some-off",
    off: new Set(value.split(/\s+/).filter(isEmailKind).filter((k) => k !== "system")),
  };
}

export function emailPrefsTo(prefs: EmailPrefs): string {
  return prefs.kind === "all-off" ? ALL_OFF : [...prefs.off].sort().join(" ");
}

/**
 * Whether one letter may be sent.
 *
 * `system` is always true and is not reachable by any stored value, because
 * `emailPrefsFrom` drops it on the way in. A sign-in link is not a preference.
 */
export function wants(prefs: EmailPrefs, kind: EmailKind): boolean {
  if (kind === "system") return true;
  return prefs.kind === "all-off" ? false : !prefs.off.has(kind);
}

/** Switch some off, keeping whatever was already off. */
export function switchOff(prefs: EmailPrefs, kinds: readonly EmailKind[]): EmailPrefs {
  if (prefs.kind === "all-off") return prefs;
  const wanted = kinds.filter((k) => k !== "system");
  const off = new Set([...prefs.off, ...wanted]);
  /*
    Turning off every kind there is means the same thing as pressing the
    client's own button, so it is stored the same way. Otherwise somebody who
    unticked all four boxes by hand would be opted in to the fifth the day it
    exists, having plainly said they wanted none.
  */
  return OPTIONAL_KINDS.every((k) => off.has(k)) ? { kind: "all-off" } : { kind: "some-off", off };
}

/** Switch one back on, which `all-off` has to be expanded to do. */
export function switchOn(prefs: EmailPrefs, kind: EmailKind): EmailPrefs {
  if (kind === "system") return prefs;
  const off =
    prefs.kind === "all-off" ? new Set(OPTIONAL_KINDS) : new Set(prefs.off);
  off.delete(kind);
  return { kind: "some-off", off };
}

/** Every optional kind with whether it is on, for the settings screen. */
export function kindStates(prefs: EmailPrefs): { kind: EmailKind; on: boolean }[] {
  return EMAIL_KINDS.filter((k) => k !== "system").map((kind) => ({
    kind,
    on: wants(prefs, kind),
  }));
}
