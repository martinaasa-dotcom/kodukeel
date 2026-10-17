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
      "Выберите, что бы вы сказали, или скажите это вслух. Выбранные фразы не засчитываются в ваши слова.",
    "Say one of these": "Скажите одну из этих фраз",
    "That's the line you said. It goes in a moment, or touch the screen to stop it.":
      "Это фраза, которую вы сказали. Она отправится через мгновение, или коснитесь экрана, чтобы остановить.",
    "That's the line you said. Press it to say it.": "Это фраза, которую вы сказали. Нажмите на неё, чтобы её произнести.",
    "That wasn't one of these lines, so it's in the box to change and send.":
      "Это не одна из этих фраз, поэтому она в поле, где её можно изменить и отправить.",
    "Say your answer": "Скажите свой ответ",
    "Your words appear here": "Здесь появятся ваши слова",
    "This goes in a moment. Touch the screen to stop it and change the words.":
      "Это отправится через мгновение. Коснитесь экрана, чтобы остановить и изменить слова.",
    "Sending in a moment. Touch the screen to stop it.": "Отправка через мгновение. Коснитесь экрана, чтобы остановить.",
    "We heard {heard}. They say {said}.": "Мы услышали {heard}. Они говорят {said}.",
    "Hear it": "Послушать",

    // A call.
    "On a call": "Идёт звонок",
    "They're speaking": "Они говорят",
    "Listening to you": "Слушаю вас",
    "On a call the microphone opens by itself after they speak.":
      "Во время звонка микрофон включается сам, когда они договорят.",

    // Before the conversation.
    "Hear them first": "Сначала послушать их",
    "Their opening lines, one at a time, to say along with. Nothing is marked.":
      "Их первые фразы, по одной, чтобы повторять за ними. Ничего не оценивается.",
    "Line {n} of {total}": "Фраза {n} из {total}",
    "Listen, then say it along.": "Послушайте, затем скажите вместе с ними.",
    "Previous line": "Предыдущая фраза",
    "Next line": "Следующая фраза",
    "Talk it through": "Поговорить вслух",
    "Nothing to read: you hear them and answer out loud, the way it really goes.":
      "Читать ничего не нужно: вы слушаете собеседника и отвечаете вслух, как в жизни.",

    // The debrief.
    "What we heard": "Что мы услышали",
    "This is the machine's hearing beside what you sent. It is not a mark.":
      "Это то, что услышала машина, рядом с тем, что вы отправили. Это не оценка.",
    "The machine heard": "Машина услышала",
    "You sent": "Вы отправили",

    // Today.
    "Say it once before you go": "Скажите это один раз перед выходом",
    "Hear what they'll say": "Послушать, что вам скажут",
    "They'll say:": "Вам скажут:",
    "And you say, out loud ({meaning}):": "А вы говорите вслух ({meaning}):",
    "Say your line": "Скажите свою фразу",
  },
  uk: {
    // Answering by voice.
    "Pick what you'd say, or say it out loud. Picked lines don't count toward your words.":
      "Виберіть, що б ви сказали, або скажіть це вголос. Вибрані фрази не зараховуються до ваших слів.",
    "Say one of these": "Скажіть одну з цих фраз",
    "That's the line you said. It goes in a moment, or touch the screen to stop it.":
      "Це фраза, яку ви сказали. Вона надішлеться за мить, або торкніться екрана, щоб зупинити.",
    "That's the line you said. Press it to say it.": "Це фраза, яку ви сказали. Натисніть на неї, щоб її промовити.",
    "That wasn't one of these lines, so it's in the box to change and send.":
      "Це не одна з цих фраз, тому вона в полі, де її можна змінити й надіслати.",
    "Say your answer": "Скажіть свою відповідь",
    "Your words appear here": "Тут з'являться ваші слова",
    "This goes in a moment. Touch the screen to stop it and change the words.":
      "Це надішлеться за мить. Торкніться екрана, щоб зупинити й змінити слова.",
    "Sending in a moment. Touch the screen to stop it.": "Надсилання за мить. Торкніться екрана, щоб зупинити.",
    "We heard {heard}. They say {said}.": "Ми почули {heard}. Вони кажуть {said}.",
    "Hear it": "Послухати",

    // A call.
    "On a call": "Триває дзвінок",
    "They're speaking": "Вони говорять",
    "Listening to you": "Слухаю вас",
    "On a call the microphone opens by itself after they speak.":
      "Під час дзвінка мікрофон вмикається сам, коли вони договорять.",

    // Before the conversation.
    "Hear them first": "Спершу послухати їх",
    "Their opening lines, one at a time, to say along with. Nothing is marked.":
      "Їхні перші фрази, по одній, щоб повторювати за ними. Нічого не оцінюється.",
    "Line {n} of {total}": "Фраза {n} з {total}",
    "Listen, then say it along.": "Послухайте, потім скажіть разом із ними.",
    "Previous line": "Попередня фраза",
    "Next line": "Наступна фраза",
    "Talk it through": "Поговорити вголос",
    "Nothing to read: you hear them and answer out loud, the way it really goes.":
      "Читати нічого не треба: ви слухаєте співрозмовника й відповідаєте вголос, як у житті.",

    // The debrief.
    "What we heard": "Що ми почули",
    "This is the machine's hearing beside what you sent. It is not a mark.":
      "Це те, що почула машина, поруч із тим, що ви надіслали. Це не оцінка.",
    "The machine heard": "Машина почула",
    "You sent": "Ви надіслали",

    // Today.
    "Say it once before you go": "Скажіть це один раз перед виходом",
    "Hear what they'll say": "Послухати, що вам скажуть",
    "They'll say:": "Вам скажуть:",
    "And you say, out loud ({meaning}):": "А ви кажете вголос ({meaning}):",
    "Say your line": "Скажіть свою фразу",
  },
};
