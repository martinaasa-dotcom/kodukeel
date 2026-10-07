import type { Area } from "../area";

/**
 * The meaning of a word in the learner's own language: cards, choices, games and the gloss settings that lead with it.
 * Keyed on the English each line translates; see `lib/copy/locale.ts`. No
 * Estonian in here (ADR-005): a word inside a line arrives through a
 * `{placeholder}` or an `{e1}` slot.
 *
 * The direction a card names is translated for the language the table is in
 * and left in English for the other one, deliberately: the Ukrainian table
 * holds no line naming Russian and the Russian none naming Ukrainian
 * (`purity-uk.test.ts`, `purity-ru.test.ts`). A learner reading the interface
 * in one while their meanings lead in the other is a combination Settings no
 * longer offers, kept only where it was stored before, and the English is the
 * honest fallback there.
 */
export const MEANING: Area = {
  ru: {
    "Estonian → Russian": "Эстонский → русский",
    "Russian → Estonian": "Русский → эстонский",
    "Also show": "Показывать также",
    "Also show a second language after the first": "Показывать второй язык после первого",
    "Nothing else": "Больше ничего",
    "Just the one language and the English.": "Только один язык и английский.",
    "Shown small, after the first meaning.": "Мелким шрифтом, после первого значения.",
  },
  uk: {
    "Estonian → Ukrainian": "Естонська → українська",
    "Ukrainian → Estonian": "Українська → естонська",
    "Also show": "Показувати також",
    "Also show a second language after the first": "Показувати другу мову після першої",
    "Nothing else": "Більше нічого",
    "Just the one language and the English.": "Лише одна мова й англійська.",
    "Shown small, after the first meaning.": "Дрібнішим шрифтом, після першого значення.",
  },
};
