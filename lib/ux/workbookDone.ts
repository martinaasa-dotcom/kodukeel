import { parseTheme } from "@/lib/games/workbook";

/**
 * WHICH TÖÖVIHIK PAGES THIS LEARNER HAS FINISHED TODAY.
 *
 * A page on Practice is a choice, "Set for you" or one theme, and a learner
 * who has done one wants to see that when they come back to the list: at A1
 * there are only two of them, and a pair of identical buttons gives no sign
 * which one has been worked through. A sitting writes no review row of its own
 * (the log holds answers, not which round asked them), so this is a fact no
 * log can reconstruct and is kept as one setting, like a personal best.
 *
 * It is **today's** and nothing more, which is the whole of why it is safe to
 * keep: a page is dealt at random and as many times as somebody asks for
 * another, so "done" is never a permanent state of a button, only a way of
 * saying that this one has had its turn since the day began. The stored value
 * is the learner's day key and then the choices, space separated, and a value
 * from another day reads as empty without anything having to clear it.
 */

/** The choice a "Set for you" page is stored under. */
export const SET_FOR_YOU = "set";

/** A choice from the wire, or null for anything that is not one a page can be. */
export function doneKeyFrom(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw === SET_FOR_YOU) return raw;
  return parseTheme(raw) ? raw : null;
}

/** The choices finished on `dayKey`, whatever else the setting holds. */
export function doneToday(stored: string | null | undefined, dayKey: string): Set<string> {
  const [day, ...keys] = (stored ?? "").split(" ").filter(Boolean);
  return day === dayKey ? new Set(keys) : new Set();
}

/** The setting's value once `key` is finished on `dayKey`. */
export function withDone(stored: string | null | undefined, dayKey: string, key: string): string {
  const done = doneToday(stored, dayKey);
  done.add(key);
  return [dayKey, ...done].join(" ");
}
