/**
 * WHETHER A SINGLE CHARACTER KEY DOES ANYTHING (WCAG 2.2, 2.1.4).
 *
 * Every round answers bare keys: 1 to 4 pick an option, B looks back at the
 * last word, U undoes a grade, R plays a word again, and `?` opens the
 * shortcut sheet. That is fast for somebody at a keyboard and a trap for
 * somebody using speech input, where saying a word that starts with a digit
 * or a B can press something they never meant to. Success criterion 2.1.4
 * asks that such shortcuts can be turned off, so they can: one setting, on by
 * default, in Settings and on the shortcut sheet.
 *
 * What it covers is a key that is one printable character with no Ctrl, Cmd
 * or Alt held. Enter and Space are not character keys and are untouched: they
 * are how a focused control is pressed, which is the browser's, and turning
 * them off would leave a keyboard nothing to answer with. Nothing a key did
 * is lost with it off, because every action a round binds to a key is also a
 * button that takes focus and Enter (the rule `docs/08-ux-ia-a11y.md` already
 * holds every screen to).
 *
 * Pure: the stored value and the key event's fields are handed in.
 */

export type SingleKeys = "on" | "off";

export const DEFAULT_SINGLE_KEYS: SingleKeys = "on";

/** A stored answer, or the default when it is absent or unrecognized. */
export function singleKeysFrom(value: string | undefined | null): SingleKeys {
  return value === "off" ? "off" : DEFAULT_SINGLE_KEYS;
}

/** The two answers, worded once for Settings and the shortcut sheet. */
export const SINGLE_KEY_CHOICES: { value: SingleKeys; label: string; detail: string }[] = [
  {
    value: "on",
    label: "Single-key shortcuts on",
    detail: "Number keys pick an answer, and B, U and R look back, undo and play again.",
  },
  {
    value: "off",
    label: "Single-key shortcuts off",
    detail: "Only Enter, Space and keys held with Ctrl or Cmd do anything. Every action is still a button.",
  },
];

/** The fields of a key event this reads, so a test can state one. */
export interface KeyLike {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * A bare character key: one printable character other than a space, with no
 * Ctrl, Cmd or Alt held. Shift is allowed, since `?` and a capital letter are
 * still one key a voice can type.
 */
export function isCharacterKey(e: KeyLike): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return [...e.key].length === 1 && e.key !== " ";
}

/** Whether a round may act on this key, given the learner's answer. */
export function mayActOnKey(e: KeyLike, singleKeys: boolean): boolean {
  return singleKeys || !isCharacterKey(e);
}
