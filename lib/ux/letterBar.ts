/**
 * THE ESTONIAN LETTER BAR: WHICH LETTERS IT OFFERS, AND WHETHER IT IS DRAWN.
 *
 * Two facts that were previously three copies of one and a decision nobody had
 * made. The six letters were a `DIACRITICS` constant in `EstonianInput` and a
 * second `DIACRITICS` constant in `DiacriticBar`, and the bar was drawn for
 * everybody, everywhere, always.
 *
 * That last part is the fault this module exists for. A learner in Tallinn is
 * typing on an Estonian keyboard, where õ is a key next to ä; a row of buttons
 * offering to type it for them is clutter under every field in the app, on the
 * exam paper and the dictation screen included. A learner on a UK or US layout
 * has no way to write õ at all short of an alt code, so the same row is the
 * only thing making half these exercises answerable.
 *
 * WHICH ONE SOMEBODY IS CANNOT BE DETECTED. There is no way to ask a browser
 * what is printed on the keys: `KeyboardEvent.key` reports what was typed, and
 * a learner who never reaches for õ looks identical to one who cannot. So it is
 * asked, once, at first run, and changed whenever they like.
 *
 * ON IS THE DEFAULT AND STAYS THE DEFAULT. Everybody who signed up before this
 * existed is never asked, and a missing answer must not quietly take away the
 * only way they have of writing õ. Defaulting the other way would break those
 * learners silently, which is the worse of the two failures by a distance.
 */

/** The six letters Estonian has and a UK or US keyboard does not. */
export const ESTONIAN_LETTERS = ["õ", "ä", "ö", "ü", "š", "ž"] as const;

export type LetterBar = "on" | "off";

export const DEFAULT_LETTER_BAR: LetterBar = "on";

/**
 * What the first-run question starts on for a learner reading the app in
 * `locale`.
 *
 * A Cyrillic keyboard has none of the four letters, so somebody reading the
 * app in Ukrainian or Russian is the one learner the app can be sure needs
 * the row: it is "on" for them whatever the general default becomes. It is
 * "on" for everybody today, so this is a pin rather than a change, written
 * down so that moving `DEFAULT_LETTER_BAR` cannot take the row away from the
 * readers least able to type õ. Only the starting answer: the question is
 * still asked and the learner still decides.
 */
export function letterBarDefaultFor(locale: string): LetterBar {
  return locale === "uk" || locale === "ru" ? "on" : DEFAULT_LETTER_BAR;
}

/** A stored answer, or the default when it is absent or unrecognised. */
export function letterBarFrom(value: string | undefined | null): LetterBar {
  return value === "off" ? "off" : DEFAULT_LETTER_BAR;
}

/**
 * The two answers, worded once.
 *
 * First run asks the question and Settings shows the standing answer, and they
 * are the same choice: a learner who reads "I have them already" at sign-up and
 * then hunts Settings for "diacritics" a month later has been asked one
 * question and shown another.
 */
export const LETTER_BAR_CHOICES: { value: LetterBar; label: string; detail: string }[] = [
  {
    value: "on",
    label: "Show the letters",
    detail: "Buttons for these letters appear under every box where you type Estonian.",
  },
  {
    value: "off",
    label: "I have them already",
    detail: "Your keyboard already types them, so no extra buttons.",
  },
];
