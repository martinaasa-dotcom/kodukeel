import type { Area } from "../area";

/**
 * Tonight's chat (docs/41-fifth-batch.md, VB-11): the offer under a finished
 * evening, the chat's own briefing, the objectives and directions it fills in
 * from templates (`CHAT_TEMPLATES`), how it can end, and the two refusals the
 * action can give. Machine-written, as every area is, and marked so on the
 * language choice. Keyed on the English each line translates; see
 * `lib/copy/locale.ts`. No Estonian in here (ADR-005).
 *
 * A value filled into a template, a word's English meaning, is looked up on
 * its own (`onScreen`) and stays English where no table holds it.
 */
export const CHAT: Area = {
  ru: {
    // The offer, under "Today's module is done".
    "Talk it over": "Обсудить",
    "A short chat with your neighbour, who asks about the things tonight's words are for. Say your answers out loud or type them.":
      "Короткий разговор с соседом, который спросит о том, для чего нужны сегодняшние слова. Отвечайте вслух или печатайте.",
    "Optional. Today's module is already done.": "По желанию. Сегодняшний модуль уже пройден.",

    // The chat.
    "Tonight's chat": "Вечерний разговор",
    "The stairs of your building, with your neighbour": "На лестнице в вашем доме, с соседом",
    "Your neighbour catches you on the stairs on your way home and stops for a chat. They'll ask about the things tonight's words are for.":
      "Сосед встречает вас на лестнице, когда вы возвращаетесь домой, и останавливается поболтать. Он спросит о том, для чего нужны сегодняшние слова.",
    "Tonight's words": "Сегодняшние слова",
    "It's about tonight": "Это о сегодняшнем вечере",
    "They ask about the things tonight's words are for. Use them in your answers.":
      "Вас спросят о том, для чего нужны сегодняшние слова. Используйте их в ответах.",
    "Start the chat": "Начать разговор",

    // What each beat asks, and what the other side does.
    "Use the word for \"{word}\".": "Употребите слово, которое значит «{word}».",
    "They ask you something that lets you use the word for \"{word}\".":
      "Сосед спрашивает о чём-то, где пригодится слово, которое значит «{word}».",
    "They remember you talked about \"{before}\" last time, then ask you something that lets you use the word for \"{word}\".":
      "Сосед вспоминает, что в прошлый раз вы говорили о «{before}», и спрашивает о чём-то, где пригодится слово, которое значит «{word}».",
    "Your neighbour stops on the stairs and says hello.": "Сосед останавливается на лестнице и здоровается.",
    "They say goodbye and go on up.": "Сосед прощается и поднимается дальше.",

    // How it ends.
    "Every one of tonight's words got used on somebody, which is what makes them yours.":
      "Каждое из сегодняшних слов вы применили в разговоре с человеком, и именно это делает их вашими.",
    "Some of tonight's words got an outing. The rest come round again in your reviews.":
      "Часть сегодняшних слов прозвучала в разговоре. Остальные вернутся в ваших повторениях.",
    "They had to dash off before you got far. Tonight's words will keep until your reviews.":
      "Соседу пришлось убежать, вы почти не успели поговорить. Сегодняшние слова подождут до ваших повторений.",
    "You went on up. There'll be another chat after the next evening.":
      "Вы пошли наверх. После следующего вечера будет новый разговор.",

    // Refusals.
    "Tonight's chat needs a model, and this app has none set up.":
      "Для вечернего разговора нужна модель, а в этом приложении она не настроена.",
    "There's no chat to have tonight. It comes after an evening with new words.":
      "Сегодня разговора нет. Он бывает после вечера с новыми словами.",
  },
  uk: {
    "Talk it over": "Обговорити",
    "A short chat with your neighbour, who asks about the things tonight's words are for. Say your answers out loud or type them.":
      "Коротка розмова із сусідом, який запитає про те, для чого потрібні сьогоднішні слова. Відповідайте вголос або друкуйте.",
    "Optional. Today's module is already done.": "За бажанням. Сьогоднішній модуль уже пройдено.",

    "Tonight's chat": "Вечірня розмова",
    "The stairs of your building, with your neighbour": "На сходах у вашому будинку, із сусідом",
    "Your neighbour catches you on the stairs on your way home and stops for a chat. They'll ask about the things tonight's words are for.":
      "Сусід зустрічає вас на сходах, коли ви повертаєтеся додому, і зупиняється побалакати. Він запитає про те, для чого потрібні сьогоднішні слова.",
    "Tonight's words": "Сьогоднішні слова",
    "It's about tonight": "Це про сьогоднішній вечір",
    "They ask about the things tonight's words are for. Use them in your answers.":
      "Вас запитають про те, для чого потрібні сьогоднішні слова. Використовуйте їх у відповідях.",
    "Start the chat": "Почати розмову",

    "Use the word for \"{word}\".": "Ужийте слово, яке означає «{word}».",
    "They ask you something that lets you use the word for \"{word}\".":
      "Сусід питає про щось, де стане в пригоді слово, яке означає «{word}».",
    "They remember you talked about \"{before}\" last time, then ask you something that lets you use the word for \"{word}\".":
      "Сусід згадує, що минулого разу ви говорили про «{before}», і питає про щось, де стане в пригоді слово, яке означає «{word}».",
    "Your neighbour stops on the stairs and says hello.": "Сусід зупиняється на сходах і вітається.",
    "They say goodbye and go on up.": "Сусід прощається і йде нагору.",

    "Every one of tonight's words got used on somebody, which is what makes them yours.":
      "Кожне із сьогоднішніх слів ви вжили в розмові з людиною, і саме це робить їх вашими.",
    "Some of tonight's words got an outing. The rest come round again in your reviews.":
      "Частина сьогоднішніх слів прозвучала в розмові. Решта повернеться у ваших повтореннях.",
    "They had to dash off before you got far. Tonight's words will keep until your reviews.":
      "Сусідові довелося бігти, ви майже не встигли поговорити. Сьогоднішні слова зачекають до ваших повторень.",
    "You went on up. There'll be another chat after the next evening.":
      "Ви пішли нагору. Після наступного вечора буде нова розмова.",

    "Tonight's chat needs a model, and this app has none set up.":
      "Для вечірньої розмови потрібна модель, а в цьому застосунку її не налаштовано.",
    "There's no chat to have tonight. It comes after an evening with new words.":
      "Сьогодні розмови немає. Вона буває після вечора з новими словами.",
  },
};
