import type { Area } from "../area";

/**
 * A conversation said aloud (docs/41-fifth-batch.md, VB-4): the microphone in
 * the panel a learner answers in, a line on screen lit when it is said, the
 * countdown ring, a call that opens the microphone by itself, "Hear them
 * first", "Talk it through", the debrief's "What we heard" and Today's "Say it
 * once before you go". Machine-written, as every area is, and marked so on the
 * language choice. Keyed on the English each line translates; see
 * `lib/copy/locale.ts`. No Estonian in here (ADR-005).
 *
 * "Heard" is the verb throughout, in all three languages: the app says which
 * words it understood and never what a sound was like.
 */
export const SCENE_SPEECH: Area = {
  ru: {
    // Answering by voice.
    "Pick what you'd say, or say it out loud. Picked lines don't count toward your words.":
      "Выбери, что сказать, или скажи это вслух. Выбранные фразы не засчитываются в твои слова.",
    "Say one of these": "Скажи одну из этих фраз",
    "That's the line you said. It goes in a moment. Press anywhere or any key to stop it.":
      "Вот твоя фраза. Она отправится через мгновение. Чтобы остановить, нажми в любом месте или любую клавишу.",
    "That's the line you said. Press it to send it.": "Вот твоя фраза. Нажми на неё, чтобы отправить.",
    "That wasn't one of these lines, so it's in the box to change and send.":
      "Это не одна из этих фраз, поэтому она в поле, где её можно изменить и отправить.",
    "Say your answer": "Скажи свой ответ",
    "Your words appear here": "Здесь появятся твои слова",
    "This goes in a moment. Press anywhere or any key to stop it and change the words.":
      "Это отправится через мгновение. Чтобы остановить и изменить слова, нажми в любом месте или любую клавишу.",
    "Sending in a moment. Press anywhere or any key to stop it.":
      "Отправка через мгновение. Чтобы остановить, нажми в любом месте или любую клавишу.",
    "We heard {heard}. They say {said}.": "Мы услышали {heard}. Они говорят {said}.",
    "Hear it": "Послушать",

    // A call.
    "On a call": "Идёт звонок",
    "They're speaking": "Они говорят",
    "Listening to you": "Слушаю тебя",
    "On a call the microphone opens by itself after they speak.":
      "Во время звонка микрофон включается сам, когда они договорят.",

    // Before the conversation.
    "Hear them first": "Сначала послушать их",
    "Their opening lines, one at a time, to say along with. Nothing is marked.":
      "Их первые фразы, по одной, чтобы повторять за ними. Ничего не оценивается.",
    "Line {n} of {total}": "Фраза {n} из {total}",
    "Listen, then say it along.": "Послушай, затем скажи вместе с ними.",
    "Previous line": "Предыдущая фраза",
    "Next line": "Следующая фраза",
    "Talk it through": "Поговорить вслух",
    "Nothing to read: you hear them and answer out loud.":
      "Читать ничего не нужно: ты слушаешь собеседника и отвечаешь вслух.",

    // The debrief.
    "What we heard": "Что мы услышали",
    "This is the machine's hearing beside what you sent. It is not a mark.":
      "Это то, что услышала машина, рядом с твоим ответом. Это не оценка.",
    "The machine heard": "Машина услышала",
    "You sent": "Отправлено",

    // Today.
    "Say it once before you go": "Скажи это один раз перед выходом",
    "Hear what they'll say": "Послушать, что тебе скажут",
    "They'll say:": "Тебе скажут:",
    "And you say, out loud ({meaning}):": "А ты говоришь вслух ({meaning}):",
    "Say your line": "Скажи свою фразу",
  },
  uk: {
    // Answering by voice.
    "Pick what you'd say, or say it out loud. Picked lines don't count toward your words.":
      "Вибери, що сказати, або скажи це вголос. Вибрані фрази не зараховуються до твоїх слів.",
    "Say one of these": "Скажи одну з цих фраз",
    "That's the line you said. It goes in a moment. Press anywhere or any key to stop it.":
      "Ось твоя фраза. Вона надішлеться за мить. Щоб зупинити, натисни будь-де або будь-яку клавішу.",
    "That's the line you said. Press it to send it.": "Ось твоя фраза. Натисни на неї, щоб надіслати.",
    "That wasn't one of these lines, so it's in the box to change and send.":
      "Це не одна з цих фраз, тому вона в полі, де її можна змінити й надіслати.",
    "Say your answer": "Скажи свою відповідь",
    "Your words appear here": "Тут з'являться твої слова",
    "This goes in a moment. Press anywhere or any key to stop it and change the words.":
      "Це надішлеться за мить. Щоб зупинити й змінити слова, натисни будь-де або будь-яку клавішу.",
    "Sending in a moment. Press anywhere or any key to stop it.":
      "Надсилання за мить. Щоб зупинити, натисни будь-де або будь-яку клавішу.",
    "We heard {heard}. They say {said}.": "Ми почули {heard}. Вони кажуть {said}.",
    "Hear it": "Послухати",

    // A call.
    "On a call": "Триває дзвінок",
    "They're speaking": "Вони говорять",
    "Listening to you": "Слухаю тебе",
    "On a call the microphone opens by itself after they speak.":
      "Під час дзвінка мікрофон вмикається сам, коли вони договорять.",

    // Before the conversation.
    "Hear them first": "Спершу послухати їх",
    "Their opening lines, one at a time, to say along with. Nothing is marked.":
      "Їхні перші фрази, по одній, щоб повторювати за ними. Нічого не оцінюється.",
    "Line {n} of {total}": "Фраза {n} з {total}",
    "Listen, then say it along.": "Послухай, потім скажи разом із ними.",
    "Previous line": "Попередня фраза",
    "Next line": "Наступна фраза",
    "Talk it through": "Поговорити вголос",
    "Nothing to read: you hear them and answer out loud.":
      "Читати нічого не треба: ти слухаєш співрозмовника й відповідаєш вголос.",

    // The debrief.
    "What we heard": "Що ми почули",
    "This is the machine's hearing beside what you sent. It is not a mark.":
      "Це те, що почула машина, поруч із твоєю відповіддю. Це не оцінка.",
    "The machine heard": "Машина почула",
    "You sent": "Надіслано",

    // Today.
    "Say it once before you go": "Скажи це один раз перед виходом",
    "Hear what they'll say": "Послухати, що тобі скажуть",
    "They'll say:": "Тобі скажуть:",
    "And you say, out loud ({meaning}):": "А ти кажеш вголос ({meaning}):",
    "Say your line": "Скажи свою фразу",
  },
};
