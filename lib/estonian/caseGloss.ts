import { levelIndex, type Level } from "@/lib/collections/syllabus";

/**
 * WHETHER A CASE QUESTION'S ENGLISH READING SHOWS BESIDE THE ESTONIAN ONE.
 *
 * The Estonian question (`milles?`) is the case's own name and is never
 * touched by this: it is on every screen that prints a case and stays there
 * whatever this setting says, at every level, because that is what a class,
 * a textbook and the state examination all call it. What this decides is
 * only the English reading beside it (`in what? where?`), which exists to
 * help somebody who has not yet learned to think in the fourteen cases
 * without it.
 *
 * On by default through B1, because that is most of the climb where the
 * fourteen forms are still being learned rather than used; off by default
 * from B2, where a learner reading Estonian case names is expected to
 * already know what they ask. A stored preference always wins over the
 * level's own default, in either direction, because a learner who wants the
 * reading kept past B2 or turned off early is the authority on their own
 * head, exactly as `letterBar` and `wordGloss` already are.
 *
 * NEVER the case's Latin or English *name*: that question is
 * `lib/estonian/cases.ts`'s own closed list of readers and this file has no
 * opinion on it. Conflating the two is the fault this app spent a great deal
 * of effort undoing (see CLAUDE.md's "the Latin name" sections), so it stays
 * two questions here as well.
 */
export type CaseGlossPref = "on" | "off";

/** Normalises a stored value, or `null` for "follow the level's own default". */
export function caseGlossFrom(raw: string | null | undefined): CaseGlossPref | null {
  return raw === "on" || raw === "off" ? raw : null;
}

/** Whether the English reading shows by default, before any stored override. */
export function caseGlossDefaultFor(level: Level): boolean {
  return levelIndex(level) < levelIndex("B2");
}

/** The reading answer for this learner: the stored preference, or the level's own default. */
export function wantsCaseGloss(level: Level, stored: string | null | undefined): boolean {
  const pref = caseGlossFrom(stored);
  return pref ? pref === "on" : caseGlossDefaultFor(level);
}
