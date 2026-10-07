import type { Locale } from "./locale";

/**
 * THE WORD SOMEBODY TYPES TO SAY THEY MEAN IT, IN THEIR OWN LANGUAGE.
 *
 * Deleting an account and replacing a deck with a backup are the two presses
 * here that cannot be taken back, so each asks for a word to be typed out
 * rather than a button pressed twice. The word was English for everybody, so a
 * learner reading the app in Ukrainian or Russian was asked to type `delete`
 * or `replace` on the one screen where a mistake costs the most, in the
 * language they had chosen not to read it in.
 *
 * So the prompt shows the word in the reader's language and every one of the
 * three is accepted, whichever language the app is in: the check runs on the
 * server too, which does not know which screen the word was typed on, and a
 * learner who types the English out of habit has meant it just as much. What
 * stays strict is that it is a whole word typed on purpose: only the case and
 * the space around it are forgiven, never a prefix, a near miss or an empty box.
 */
export type ConfirmAction = "delete" | "replace";

const WORDS: Readonly<Record<ConfirmAction, Readonly<Record<Locale, string>>>> = {
  delete: { en: "delete", ru: "удалить", uk: "видалити" },
  replace: { en: "replace", ru: "заменить", uk: "замінити" },
};

/** The word the prompt asks for, in the reader's language. */
export function confirmWord(action: ConfirmAction, locale: Locale): string {
  return WORDS[action][locale];
}

/** Whether what was typed confirms the action, in any of the app's languages. */
export function confirms(action: ConfirmAction, typed: unknown): boolean {
  if (typeof typed !== "string") return false;
  const said = typed.normalize("NFC").trim().toLowerCase();
  if (!said) return false;
  return Object.values(WORDS[action]).includes(said);
}
