import type { Area } from "../area";

/**
 * A learner's first evening and the daily path: first run's opening screens,
 * the bar under a step of today's module, the review card's marking and the
 * hint button's count. Keyed on the English each line translates. See
 * lib/copy/locale.ts and docs/34-interface-languages.md. No Estonian here.
 */
export const FIRST_DAY: Area = {
  ru: {
    "That means “welcome”, your first words of Estonian.":
      "Это значит «добро пожаловать», ваши первые слова по-эстонски.",
    "Today's module is “{title}”: {words}, then {steps} that put them to use.":
      "Занятие на сегодня: «{title}». {words}, а потом {steps}, чтобы пустить их в ход.",
    "Steps": "Шаги",
    "({n} hints left)": "(осталось подсказок: {n})",
    "{known} of {total} course words known": "знакомых слов курса: {known} из {total}",
  },
  uk: {
    "That means “welcome”, your first words of Estonian.":
      "Це означає «ласкаво просимо», ваші перші слова естонською.",
    "Today's module is “{title}”: {words}, then {steps} that put them to use.":
      "Заняття на сьогодні: «{title}». {words}, а потім {steps}, щоб пустити їх у хід.",
    "Steps": "Кроки",
    "({n} hints left)": "(залишилося підказок: {n})",
    "{known} of {total} course words known": "засвоєних слів курсу: {known} з {total}",
  },
};
