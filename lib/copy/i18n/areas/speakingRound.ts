import type { Area } from "../area";

/**
 * The Speaking round rebuilt, saying it on the daily path, the mock exam's
 * spoken part heard on the device, and the reading on Progress
 * (docs/41-fifth-batch.md, VB-5, VB-6 and VB-14). Machine-written, as every
 * area is, and marked so on the language choice. Keyed on the English each
 * line translates; see `lib/copy/locale.ts`. No Estonian in here (ADR-005).
 *
 * "Heard" is the verb throughout, as in the speaking area: the app says which
 * words came across and never what a sound was like.
 */
export const SPEAKING_ROUND: Area = {
  ru: {
    // The round.
    "Say it with them": "Скажите вместе с ними",
    "Say it back": "Повторить",
    "Say it from the meaning": "Скажите по значению",
    "Listen, and say it along with them": "Слушайте и говорите вместе с ними",
    "Listen, then say it back": "Послушайте, затем повторите",
    "The words are hidden until you have said them.": "Слова скрыты, пока вы их не скажете.",
    "Answer out loud": "Ответить вслух",
    "Or type it": "Или напечатайте",
    "This is what was heard. Change anything that is not what you said, then check it.":
      "Вот что было услышано. Исправьте всё, что вы говорили иначе, затем проверьте.",
    "Next line": "Следующая фраза",
    "{n} said aloud": "Вслух: {n}",
    "Heard, and right.": "Услышано, и это верно.",
    "Nearly. It counts, and the word comes back a little sooner.":
      "Почти. Это засчитано, и слово вернётся чуть раньше.",
    "Not this time. Nothing is written down for a miss here, so say it again whenever you like.":
      "Не в этот раз. Промах здесь не записывается, так что скажите ещё раз, когда захотите.",
    "Hear what was heard": "Послушать, что было услышано",
    "Said aloud": "Вслух",
    "From memory": "По памяти",
    "That wasn't heard as the word this time. Say it again whenever you like.":
      "На этот раз это не было услышано как это слово. Скажите ещё раз, когда захотите.",

    // Hands-free.
    "Hands-free": "Без рук",
    "Stop hands-free": "Остановить режим без рук",
    "Paused. Tap anywhere here to carry on.": "Пауза. Нажмите в любом месте здесь, чтобы продолжить.",
    "Listening. Tap anywhere here to pause.": "Слушаю. Нажмите в любом месте здесь, чтобы поставить на паузу.",
    "Tap anywhere here to pause.": "Нажмите в любом месте здесь, чтобы поставить на паузу.",
    "The browser held back the sound in this background tab. Bring the tab forward to carry on.":
      "Браузер придержал звук в этой фоновой вкладке. Откройте вкладку, чтобы продолжить.",
    "This browser would not keep the screen on, so the round stops when the screen sleeps.":
      "Этот браузер не держит экран включённым, поэтому раунд остановится, когда экран погаснет.",
    "The screen stays on. On a computer it keeps listening in a background tab, and your browser shows the microphone is on.":
      "Экран остаётся включённым. На компьютере раунд продолжает слушать в фоновой вкладке, а браузер показывает, что микрофон включён.",
    "The screen stays on, so the phone can go in a pocket. Nothing here is marked.":
      "Экран остаётся включённым, так что телефон можно убрать в карман. Здесь ничего не оценивается.",

    // On meeting a word.
    "Say it yourself": "Скажите сами",
    "Heard. That's the word.": "Услышано. Это то самое слово.",
    "That wasn't heard as the word this time. Here it is again; say it once more if you like.":
      "На этот раз это не было услышано как это слово. Вот оно ещё раз; скажите снова, если хотите.",

    // The mock exam's spoken part.
    "Speak your answer": "Произнесите ответ",
    "What was understood": "Что было понято",
    "Suggested words heard:": "Услышаны предложенные слова:",
    "None of the suggested words were heard, which is fine: they are only ideas.":
      "Ни одно из предложенных слов не было услышано, и это нормально: это только идеи.",
    "This is the machine's hearing of your words, not a mark. You decide the marks below.":
      "Это то, как машина услышала ваши слова, а не оценка. Баллы ниже решаете вы.",
    "I said it out loud": "Сказано вслух",

    // Progress.
    "Said aloud this week: {answers}, about {minutes}.": "Вслух на этой неделе: {answers}, примерно {minutes}.",
  },
  uk: {
    // The round.
    "Say it with them": "Скажіть разом із ними",
    "Say it back": "Повторити",
    "Say it from the meaning": "Скажіть за значенням",
    "Listen, and say it along with them": "Слухайте й кажіть разом із ними",
    "Listen, then say it back": "Послухайте, потім повторіть",
    "The words are hidden until you have said them.": "Слова приховані, доки ви їх не скажете.",
    "Answer out loud": "Відповісти вголос",
    "Or type it": "Або надрукуйте",
    "This is what was heard. Change anything that is not what you said, then check it.":
      "Ось що почуто. Виправте все, що ви казали інакше, потім перевірте.",
    "Next line": "Наступна фраза",
    "{n} said aloud": "Уголос: {n}",
    "Heard, and right.": "Почуто, і це правильно.",
    "Nearly. It counts, and the word comes back a little sooner.":
      "Майже. Це зараховано, і слово повернеться трохи раніше.",
    "Not this time. Nothing is written down for a miss here, so say it again whenever you like.":
      "Не цього разу. Промах тут не записується, тож скажіть ще раз, коли захочете.",
    "Hear what was heard": "Послухати, що почуто",
    "Said aloud": "Уголос",
    "From memory": "З пам'яті",
    "That wasn't heard as the word this time. Say it again whenever you like.":
      "Цього разу це не почуто як те слово. Скажіть ще раз, коли захочете.",

    // Hands-free.
    "Hands-free": "Без рук",
    "Stop hands-free": "Зупинити режим без рук",
    "Paused. Tap anywhere here to carry on.": "Пауза. Торкніться будь-де тут, щоб продовжити.",
    "Listening. Tap anywhere here to pause.": "Слухаю. Торкніться будь-де тут, щоб поставити на паузу.",
    "Tap anywhere here to pause.": "Торкніться будь-де тут, щоб поставити на паузу.",
    "The browser held back the sound in this background tab. Bring the tab forward to carry on.":
      "Браузер притримав звук у цій фоновій вкладці. Відкрийте вкладку, щоб продовжити.",
    "This browser would not keep the screen on, so the round stops when the screen sleeps.":
      "Цей браузер не тримає екран увімкненим, тож раунд зупиниться, коли екран згасне.",
    "The screen stays on. On a computer it keeps listening in a background tab, and your browser shows the microphone is on.":
      "Екран лишається увімкненим. На комп'ютері раунд далі слухає у фоновій вкладці, а браузер показує, що мікрофон увімкнено.",
    "The screen stays on, so the phone can go in a pocket. Nothing here is marked.":
      "Екран лишається увімкненим, тож телефон можна сховати в кишеню. Тут нічого не оцінюється.",

    // On meeting a word.
    "Say it yourself": "Скажіть самі",
    "Heard. That's the word.": "Почуто. Це саме те слово.",
    "That wasn't heard as the word this time. Here it is again; say it once more if you like.":
      "Цього разу це не почуто як те слово. Ось воно ще раз; скажіть знову, якщо хочете.",

    // The mock exam's spoken part.
    "Speak your answer": "Вимовте відповідь",
    "What was understood": "Що зрозуміло",
    "Suggested words heard:": "Почуто запропоновані слова:",
    "None of the suggested words were heard, which is fine: they are only ideas.":
      "Жодного із запропонованих слів не почуто, і це нормально: це лише ідеї.",
    "This is the machine's hearing of your words, not a mark. You decide the marks below.":
      "Це те, як машина почула ваші слова, а не оцінка. Бали нижче вирішуєте ви.",
    "I said it out loud": "Сказано вголос",

    // Progress.
    "Said aloud this week: {answers}, about {minutes}.": "Уголос цього тижня: {answers}, приблизно {minutes}.",
  },
};
