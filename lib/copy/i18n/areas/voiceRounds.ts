import type { Area } from "../area";

/**
 * The rounds that take a spoken answer: the numbers round, the conjugation
 * table said as a chant, Say what you see aloud, 20 küsimust asked aloud,
 * Töövihik read aloud, and the dictionary, Anu and the reading page taking
 * speech (docs/41-fifth-batch.md, VB-7, VB-8 and VB-9). Machine-written, as
 * every area is, and marked so on the language choice. Keyed on the English
 * each line translates; see `lib/copy/locale.ts`. No Estonian in here
 * (ADR-005).
 *
 * "Heard" is the verb throughout, in all three languages: the app says which
 * words it understood and never what a sound was like.
 */
export const VOICE_ROUNDS: Area = {
  ru: {
    // The numbers round.
    "Say the number": "Назовите число",
    "Ten things a counter would show you: a price tag, a clock on the wall, a time on a timetable, a number. Nothing is timed.":
      "Десять вещей, которые вам покажут у прилавка: ценник, часы на стене, время в расписании, число. Время не ограничено.",
    "Say each one in Estonian, or type it in words or digits. You'll hear the right answer after.":
      "Назовите каждое по-эстонски или напишите словами или цифрами. Потом вы услышите правильный ответ.",
    "Prices, times, numbers": "Цены, время, числа",
    "Ten, said or typed": "Десять, вслух или письменно",
    "A price tag, a clock on the wall, a timetable, a number. Say it in Estonian, or type it, and hear it said back. Every counter you'll ever stand at needs one.":
      "Ценник, часы на стене, расписание, число. Скажите это по-эстонски или напишите и послушайте, как это звучит. Без этого не обойтись ни у одного прилавка.",
    "Prices, clock times and counts, said out loud. Every counter you'll stand at needs one, and Estonian says half past two as half three.":
      "Цены, время по часам и числа вслух. Без этого не обойтись ни у одного прилавка, а половину третьего эстонцы называют так же, как по-русски: «половина третьего».",
    "Prices, clock times and numbers, said out loud.": "Цены, время по часам и числа вслух.",
    "Numbers": "Числа",
    "A clock": "Часы",
    "A clock showing {time}": "Часы показывают {time}",
    "A number": "Число",
    "A price": "Цена",
    "A timetable": "Расписание",
    "Say the number.": "Назовите число.",
    "How much is it?": "Сколько это стоит?",
    "What time is it on the clock?": "Который час на часах?",
    "When does it leave?": "Когда отправление?",
    "Your answer, in words or digits": "Ваш ответ словами или цифрами",
    "Or type it, in words or digits": "Или напишите словами или цифрами",
    "Right. {answer}.": "Верно. {answer}.",
    "You said {said}.": "Вы сказали: {said}.",
    "You said {said}. It's {answer}.": "Вы сказали: {said}. Правильно: {answer}.",
    "That wasn't a number we could read.": "Мы не смогли прочитать это как число.",
    "Right number. Mind the letters: the word has an õ, ä, ö or ü in it.":
      "Число верное. Обратите внимание на буквы: в слове есть буква с точками или с волной над ней.",
    "In digits, so no word was practised. Say it or type the words next time.":
      "Цифрами, поэтому ни одно слово не потренировано. В следующий раз скажите вслух или напишите словами.",
    "A clock face has no afternoon, so {morning} and {afternoon} both count.":
      "На циферблате нет дня и утра, поэтому засчитывается и {morning}, и {afternoon}.",
    "Hear it said": "Послушать",
    "No numbers to say yet": "Пока нечего называть",
    "This opens once you've met the numbers. They're one of the first units of the course.":
      "Это откроется, когда вы познакомитесь с числами. Это один из первых разделов курса.",
    "Every number right": "Все числа верно",
    "Said out loud": "Сказано вслух",
    "{n} of {total} right": "Верно: {n} из {total}",
    "{n} number words counted toward your reviews.": "Слов-чисел засчитано в повторение: {n}.",
    "Answers in digits are marked but don't count toward your reviews. Say them, or type the words, and they do.":
      "Ответы цифрами проверяются, но в повторение не засчитываются. Скажите их вслух или напишите словами, и они засчитаются.",

    // The conjugation table, said as a chant.
    "Say the table out loud": "Скажите таблицу вслух",
    "Or say all six in one go, the way a class chants them, pronouns and all.":
      "Или скажите все шесть подряд, как хором в классе, вместе с местоимениями.",
    "Heard {n} of {total} rows. Look them over, change any, then check the table.":
      "Услышано строк: {n} из {total}. Просмотрите их, исправьте, если нужно, и проверьте таблицу.",
    "We couldn't tell which row each form was for. Say them with the pronouns, or type them.":
      "Не удалось понять, к какой строке относится каждая форма. Скажите их с местоимениями или напишите.",

    // Say what you see, aloud.
    "Say a sentence": "Скажите предложение",
    "Say a sentence and it goes into the box you're in, or the next empty one.":
      "Скажите предложение, и оно попадёт в поле, где вы сейчас, или в следующее пустое.",
    "That went into sentence {n}. Change anything that isn't what you said.":
      "Это попало в предложение {n}. Исправьте то, что вы говорили иначе.",

    // 20 küsimust, asked aloud.
    "Ask your question out loud": "Задайте вопрос вслух",
    "Asking in a moment. Touch anything to change it first.":
      "Сейчас вопрос будет задан. Коснитесь чего угодно, чтобы сначала его изменить.",
    "Say or type your question, then press Enter": "Скажите или напишите вопрос и нажмите Enter",

    // Töövihik, read aloud.
    "Read a line aloud, the gap filled": "Прочитайте строку вслух, с заполненным пропуском",
    "Or read a line aloud with the word in the gap, and the word goes into its box.":
      "Или прочитайте строку вслух вместе со словом в пропуске, и слово попадёт в своё поле.",
    "That went into line {n}. Check marks it the same as typing.":
      "Это попало в строку {n}. Проверка оценит это так же, как написанное.",
    "That didn't line up with a gap. Read the whole line, the word in the gap included, or type it.":
      "Это не совпало ни с одним пропуском. Прочитайте всю строку вместе со словом в пропуске или напишите его.",

    // The dictionary, Anu and the reading page.
    "Say the word to look it up": "Скажите слово, чтобы найти его",
    "Say your question": "Скажите вопрос",
    "Read it aloud": "Прочитать вслух",
    "Read it aloud, a paragraph at a time. Each word lights up as it's heard.":
      "Читайте вслух по одному абзацу. Каждое слово подсвечивается, когда его слышно.",
    "Read this paragraph aloud": "Прочитайте этот абзац вслух",
    "Paragraph {n} of {total}: {heard} of {words} words heard.":
      "Абзац {n} из {total}: услышано слов {heard} из {words}.",
    "Back to the dictionary view": "Назад к словарю",
    "Next paragraph": "Следующий абзац",
    "Done reading": "Готово",
  },
  uk: {
    // The numbers round.
    "Say the number": "Назвіть число",
    "Ten things a counter would show you: a price tag, a clock on the wall, a time on a timetable, a number. Nothing is timed.":
      "Десять речей, які вам покажуть біля прилавка: цінник, годинник на стіні, час у розкладі, число. Час не обмежений.",
    "Say each one in Estonian, or type it in words or digits. You'll hear the right answer after.":
      "Назвіть кожне естонською або напишіть словами чи цифрами. Потім ви почуєте правильну відповідь.",
    "Prices, times, numbers": "Ціни, час, числа",
    "Ten, said or typed": "Десять, уголос або письмово",
    "A price tag, a clock on the wall, a timetable, a number. Say it in Estonian, or type it, and hear it said back. Every counter you'll ever stand at needs one.":
      "Цінник, годинник на стіні, розклад, число. Скажіть це естонською або напишіть і послухайте, як це звучить. Без цього не обійтися біля жодного прилавка.",
    "Prices, clock times and counts, said out loud. Every counter you'll stand at needs one, and Estonian says half past two as half three.":
      "Ціни, час за годинником і числа вголос. Без цього не обійтися біля жодного прилавка, а пів на третю естонці кажуть так само: «пів на третю».",
    "Prices, clock times and numbers, said out loud.": "Ціни, час за годинником і числа вголос.",
    "Numbers": "Числа",
    "A clock": "Годинник",
    "A clock showing {time}": "Годинник показує {time}",
    "A number": "Число",
    "A price": "Ціна",
    "A timetable": "Розклад",
    "Say the number.": "Назвіть число.",
    "How much is it?": "Скільки це коштує?",
    "What time is it on the clock?": "Котра година на годиннику?",
    "When does it leave?": "Коли відправлення?",
    "Your answer, in words or digits": "Ваша відповідь словами або цифрами",
    "Or type it, in words or digits": "Або напишіть словами чи цифрами",
    "Right. {answer}.": "Правильно. {answer}.",
    "You said {said}.": "Ви сказали: {said}.",
    "You said {said}. It's {answer}.": "Ви сказали: {said}. Правильно: {answer}.",
    "That wasn't a number we could read.": "Ми не змогли прочитати це як число.",
    "Right number. Mind the letters: the word has an õ, ä, ö or ü in it.":
      "Число правильне. Зверніть увагу на літери: у слові є літера з крапками або з хвилькою над нею.",
    "In digits, so no word was practised. Say it or type the words next time.":
      "Цифрами, тому жодне слово не потреноване. Наступного разу скажіть уголос або напишіть словами.",
    "A clock face has no afternoon, so {morning} and {afternoon} both count.":
      "На циферблаті немає ні ранку, ні вечора, тому зараховується і {morning}, і {afternoon}.",
    "Hear it said": "Послухати",
    "No numbers to say yet": "Поки що нічого називати",
    "This opens once you've met the numbers. They're one of the first units of the course.":
      "Це відкриється, коли ви познайомитеся з числами. Це один із перших розділів курсу.",
    "Every number right": "Усі числа правильно",
    "Said out loud": "Сказано вголос",
    "{n} of {total} right": "Правильно: {n} з {total}",
    "{n} number words counted toward your reviews.": "Слів-чисел зараховано до повторення: {n}.",
    "Answers in digits are marked but don't count toward your reviews. Say them, or type the words, and they do.":
      "Відповіді цифрами перевіряються, але до повторення не зараховуються. Скажіть їх уголос або напишіть словами, і вони зарахуються.",

    // The conjugation table, said as a chant.
    "Say the table out loud": "Скажіть таблицю вголос",
    "Or say all six in one go, the way a class chants them, pronouns and all.":
      "Або скажіть усі шість поспіль, як хором у класі, разом із займенниками.",
    "Heard {n} of {total} rows. Look them over, change any, then check the table.":
      "Почуто рядків: {n} з {total}. Перегляньте їх, виправте, якщо треба, і перевірте таблицю.",
    "We couldn't tell which row each form was for. Say them with the pronouns, or type them.":
      "Не вдалося зрозуміти, до якого рядка належить кожна форма. Скажіть їх із займенниками або напишіть.",

    // Say what you see, aloud.
    "Say a sentence": "Скажіть речення",
    "Say a sentence and it goes into the box you're in, or the next empty one.":
      "Скажіть речення, і воно потрапить у поле, де ви зараз, або в наступне порожнє.",
    "That went into sentence {n}. Change anything that isn't what you said.":
      "Це потрапило в речення {n}. Виправте те, що ви казали інакше.",

    // 20 küsimust, asked aloud.
    "Ask your question out loud": "Поставте запитання вголос",
    "Asking in a moment. Touch anything to change it first.":
      "Зараз запитання буде поставлено. Торкніться будь-чого, щоб спершу його змінити.",
    "Say or type your question, then press Enter": "Скажіть або напишіть запитання і натисніть Enter",

    // Töövihik, read aloud.
    "Read a line aloud, the gap filled": "Прочитайте рядок уголос, із заповненим пропуском",
    "Or read a line aloud with the word in the gap, and the word goes into its box.":
      "Або прочитайте рядок уголос разом зі словом у пропуску, і слово потрапить у своє поле.",
    "That went into line {n}. Check marks it the same as typing.":
      "Це потрапило в рядок {n}. Перевірка оцінить це так само, як написане.",
    "That didn't line up with a gap. Read the whole line, the word in the gap included, or type it.":
      "Це не збіглося з жодним пропуском. Прочитайте весь рядок разом зі словом у пропуску або напишіть його.",

    // The dictionary, Anu and the reading page.
    "Say the word to look it up": "Скажіть слово, щоб знайти його",
    "Say your question": "Скажіть запитання",
    "Read it aloud": "Прочитати вголос",
    "Read it aloud, a paragraph at a time. Each word lights up as it's heard.":
      "Читайте вголос по одному абзацу. Кожне слово підсвічується, коли його чути.",
    "Read this paragraph aloud": "Прочитайте цей абзац уголос",
    "Paragraph {n} of {total}: {heard} of {words} words heard.":
      "Абзац {n} з {total}: почуто слів {heard} з {words}.",
    "Back to the dictionary view": "Назад до словника",
    "Next paragraph": "Наступний абзац",
    "Done reading": "Готово",
  },
};
