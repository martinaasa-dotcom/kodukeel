import type { Area } from "../area";

/**
 * THE FINISHED-MODULE PROGRESS, IN RUSSIAN AND UKRAINIAN.
 *
 * Keyed on the English in `components/course/ModuleProgress.tsx`. Machine
 * translated like the rest of the course chrome (`docs/49-language-reviews.md`),
 * so a fluent reader is owed a pass. A count beside a noun arrives already
 * declined through `countOf`, so these lines carry the slot rather than a noun.
 */
const LINES: readonly (readonly [en: string, ru: string, uk: string])[] = [
  ["How far you've come", "Сколько ты уже прошёл", "Скільки ти вже пройшов"],
  ["Through {level}", "Уровень {level}", "Рівень {level}"],
  ["{counted} of {words} {level} words you know", "Ты знаешь {counted} из {words} слов уровня {level}", "Ти знаєш {counted} із {words} слів рівня {level}"],
  ["To your goal, {target}", "До твоей цели, {target}", "До твоєї мети, {target}"],
  ["To {target}", "До {target}", "До {target}"],
  ["{counted} of {words} words on the way there", "{counted} из {words} слов на пути к ней", "{counted} із {words} слів на шляху до неї"],
  ["Set your own goal level in Settings and this reads how far you are from it.",
    "Укажи свой целевой уровень в настройках, и здесь будет видно, сколько до него осталось.",
    "Вкажи свій цільовий рівень у налаштуваннях, і тут буде видно, скільки до нього лишилося."],
  ["Your words", "Твои слова", "Твої слова"],
  ["Words you know", "Слова, которые ты знаешь", "Слова, які ти знаєш"],
  ["{before} before today", "До сегодняшнего дня: {before}", "До сьогоднішнього дня: {before}"],
  ["They count once they stick", "Слово засчитывается, когда запомнилось", "Слово зараховується, коли запам'яталося"],
  ["{n} new today", "Новых сегодня: {n}", "Нових сьогодні: {n}"],
  ["Answers today", "Ответов сегодня", "Відповідей сьогодні"],
  ["{n} in all", "Всего: {n}", "Усього: {n}"],
  ["A word counts as known once it has come back in your reviews days later and you still had it.",
    "Слово считается выученным, когда оно вернулось в повторении через несколько дней и ты его вспомнил.",
    "Слово вважається вивченим, коли воно повернулося в повторенні через кілька днів і ти його згадав."],
  ["Still ahead", "Что впереди", "Що попереду"],
  ["{evenings} left in {part}", "В {part} осталось: {evenings}", "У {part} лишилося: {evenings}"],
  ["{words} and about {time} of evenings to finish {level}",
    "До конца уровня {level}: {words} и около {time} занятий",
    "До кінця рівня {level}: {words} і близько {time} занять"],
  ["{evenings} and {words} to {target}", "До {target}: {evenings} и {words}", "До {target}: {evenings} і {words}"],
  ["{level} is nearly behind you.", "Уровень {level} почти позади.", "Рівень {level} майже позаду."],
  ["since {date}", "с {date}", "з {date}"],
  ["Looking back", "Оглядываясь назад", "Озираючись назад"],
  ["Days you sat down to it", "Дней с занятиями", "Днів із заняттями"],
  ["Conversations out there", "Разговоров в жизни", "Розмов у житті"],
  ["{gain}% today", "{gain}% сегодня", "{gain}% сьогодні"],
  ["{part}, evening {done} of {total}", "{part}, вечер {done} из {total}", "{part}, вечір {done} із {total}"],
];

export const MODULE_DONE: Area = {
  ru: Object.fromEntries(LINES.map(([en, ru]) => [en, ru])),
  uk: Object.fromEntries(LINES.map(([en, , uk]) => [en, uk])),
};
