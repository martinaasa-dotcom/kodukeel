import type { Locale } from "./locale";

/**
 * THE WORD SOMEBODY TYPES TO SAY THEY MEAN IT, IN THEIR OWN LANGUAGE.
 *
 * Deleting an account and replacing everything with a backup each ask for one
 * word typed out, because a word is harder to type by accident than a button
 * is to press. A reader of the Russian or the Ukrainian interface was asked to
 * type `replace` and `delete`, which is an English word in a screen that is
 * otherwise in their language, at the one moment it most needs to be clear.
 * So the screen asks for the word in the reader's language and accepts the
 * English as well, since somebody who has the English word in their head is
 * just as sure.
 *
 * Any of the three is accepted wherever it is checked, the server included:
 * the action does not know which screen sent the word, and a word from a
 * language the reader is not using is still a word nobody types by accident.
 */
export type ConfirmAction = "replace" | "delete";

export const CONFIRM_WORDS: Readonly<Record<ConfirmAction, Readonly<Record<Locale, string>>>> = {
  replace: { en: "replace", ru: "заменить", uk: "замінити" },
  delete: { en: "delete", ru: "удалить", uk: "видалити" },
};

/** The word this reader is asked to type. */
export function confirmWord(action: ConfirmAction, locale: Locale): string {
  return CONFIRM_WORDS[action][locale];
}

/** Whether what was typed is the word, in any of the three languages. */
export function isConfirmed(typed: unknown, action: ConfirmAction): boolean {
  if (typeof typed !== "string") return false;
  const said = typed.trim().toLocaleLowerCase();
  return Object.values(CONFIRM_WORDS[action]).includes(said);
}
