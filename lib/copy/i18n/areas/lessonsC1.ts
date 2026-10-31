import type { Area } from "../area";

/**
 * THE C1 LESSON SCREENS' OWN WORDS: a text asked about in the paper's three
 * shapes (`components/course/ReadText.tsx`), a talk taken down as notes
 * (`NotesTalk.tsx`), a regional word said in standard Estonian
 * (`DialectNote.tsx`), which room (the practice step's `room` question and
 * its rework), a question on what was meant (`ListenFirst.tsx`) and the
 * presentation's choice of two topics (`AgainFaster.tsx`). Machine
 * translated on 2026-10-31 on the B2 screens' terms, and not yet read by
 * somebody fluent.
 */
const LINES: readonly (readonly [en: string, ru: string, uk: string])[] = [
  ["read it, then answer", "прочитай и ответь", "прочитай і відповідай"],
  ["Section {n}", "Часть {n}", "Частина {n}"],
  ["Gap {n}: choose the sentence below.", "Пропуск {n}: выбери предложение ниже.", "Пропуск {n}: вибери речення нижче."],
  ["Questions on the text", "Вопросы по тексту", "Питання до тексту"],
  ["Which section says it?", "В какой части это сказано?", "У якій частині це сказано?"],
  ["Which sentence fills gap {n}?", "Какое предложение заполняет пропуск {n}?", "Яке речення заповнює пропуск {n}?"],
  ["Answer in a word or two", "Ответь одним-двумя словами", "Відповідай одним-двома словами"],
  ["Your answer to question {n}, in Estonian", "Твой ответ на вопрос {n}, по-эстонски", "Твоя відповідь на питання {n}, естонською"],
  ["{n} of {total} matched to their section.", "Верно сопоставлено с частью: {n} из {total}.", "Правильно зіставлено з частиною: {n} з {total}."],
  ["{word} is {standard} in standard Estonian.", "{word} на литературном эстонском {standard}.", "{word} літературною естонською {standard}."],
  ["heard once", "звучит один раз", "звучить один раз"],
  ["heard twice", "звучит два раза", "звучить двічі"],
  ["{who} gives a talk on the morning show. You'll hear it once, with no words on the screen, so take notes as you listen.",
    "{who} выступает в утренней передаче. Ты услышишь это один раз, без слов на экране, так что делай заметки, пока слушаешь.",
    "{who} виступає в ранковій передачі. Ти почуєш це один раз, без слів на екрані, тож роби нотатки, поки слухаєш."],
  ["{who} gives a talk on the morning show. You'll hear it twice, with no words on the screen, so take notes as you listen.",
    "{who} выступает в утренней передаче. Ты услышишь это два раза, без слов на экране, так что делай заметки, пока слушаешь.",
    "{who} виступає в ранковій передачі. Ти почуєш це двічі, без слів на екрані, тож роби нотатки, поки слухаєш."],
  ["Carry on listening", "Слушать дальше", "Слухати далі"],
  ["Hear the talk", "Послушать выступление", "Послухати виступ"],
  ["The voice didn't come through just now. Answer from what you know, then read the talk.",
    "Голос сейчас не прозвучал. Ответь, что знаешь, а потом прочитай выступление.",
    "Голос зараз не прозвучав. Відповідай, що знаєш, а потім прочитай виступ."],
  ["Heard once. Now answer from your notes.", "Прослушано один раз. Теперь отвечай по своим заметкам.", "Прослухано один раз. Тепер відповідай за своїми нотатками."],
  ["Heard twice. Now answer from your notes.", "Прослушано два раза. Теперь отвечай по своим заметкам.", "Прослухано двічі. Тепер відповідай за своїми нотатками."],
  ["Heard once. You can hear it once more.", "Прослушано один раз. Можно послушать ещё раз.", "Прослухано один раз. Можна послухати ще раз."],
  ["Stopped partway. It carries on from where you were.", "Остановлено на середине. Продолжится с того места, где ты был.", "Зупинено посередині. Продовжиться з того місця, де ти був."],
  ["Your notes", "Твои заметки", "Твої нотатки"],
  ["Your notes stay on this device and are never sent.", "Твои заметки остаются на этом устройстве и никуда не отправляются.", "Твої нотатки залишаються на цьому пристрої й нікуди не надсилаються."],
  ["What your notes should answer", "На что должны ответить твои заметки", "На що мають відповісти твої нотатки"],
  ["Check my answers", "Проверить ответы", "Перевірити відповіді"],
  ["{n} of {total} answered from the talk.", "Ответов по выступлению: {n} из {total}.", "Відповідей за виступом: {n} з {total}."],
  ["The key ideas", "Главные мысли", "Головні думки"],
  ["You took no notes this time.", "В этот раз ты не делал заметок.", "Цього разу ти не робив нотаток."],
  ["The talk", "Выступление", "Виступ"],
  ["Which room is it for?", "Для какой обстановки это?", "Для якої обстановки це?"],
  ["Which would you say to a friend?", "Что бы ты сказал другу?", "Що б ти сказав другові?"],
  ["Which would you say to a colleague at work?", "Что бы ты сказал коллеге на работе?", "Що б ти сказав колезі на роботі?"],
  ["Which would you put in writing?", "Что бы ты написал?", "Що б ти написав?"],
  ["At work", "На работе", "На роботі"],
  ["In writing", "Письменно", "Письмово"],
  ["Now say it the way you'd say it to a friend.", "Теперь скажи это так, как сказал бы другу.", "Тепер скажи це так, як сказав би другові."],
  ["Now say it the way you'd say it to a colleague at work.", "Теперь скажи это так, как сказал бы коллеге на работе.", "Тепер скажи це так, як сказав би колезі на роботі."],
  ["Now say it the way you'd put it in writing.", "Теперь скажи это так, как написал бы.", "Тепер скажи це так, як написав би."],
  ["What was meant, not what was said", "Что имелось в виду, а не что было сказано", "Що малося на увазі, а не що було сказано"],
  ["Your topic:", "Твоя тема:", "Твоя тема:"],
  ["Choose one of two topics, as in the exam. The time to prepare starts once you have.",
    "Выбери одну из двух тем, как на экзамене. Время на подготовку начнётся, когда выберешь.",
    "Вибери одну з двох тем, як на іспиті. Час на підготовку почнеться, коли вибереш."],
];

export const LESSONS_C1_AREA: Area = {
  ru: Object.fromEntries(LINES.map(([en, ru]) => [en, ru])),
  uk: Object.fromEntries(LINES.map(([en, , uk]) => [en, uk])),
};
