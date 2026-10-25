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
    "Say the number": "Назови число",
    "Ten things a counter would show you: a price tag, a clock on the wall, a time on a timetable, a number. Nothing is timed.":
      "Десять вещей, которые тебе покажут у прилавка: ценник, часы на стене, время в расписании, число. Время не ограничено.",
    "Say each one in Estonian, or type it in words or digits. You'll hear the right answer after.":
      "Назови каждое по-эстонски или напиши словами или цифрами. Потом ты услышишь правильный ответ.",
    "Prices, times, numbers": "Цены, время, числа",
    "Ten, said or typed": "Десять, вслух или письменно",
    "A price tag, a clock on the wall, a timetable, a number. Say it in Estonian, or type it, and hear it said back.":
      "Ценник, часы на стене, расписание, число. Скажи это по-эстонски или напиши и послушай, как это звучит.",
    "Prices, clock times and counts, said out loud. Estonian says half past two as half three.":
      "Цены, время по часам и числа вслух. Половину третьего эстонцы называют так же, как по-русски: «половина третьего».",
    "Prices, clock times and numbers, said out loud.": "Цены, время по часам и числа вслух.",
    "Numbers": "Числа",
    "A clock": "Часы",
    "A clock showing {time}": "Часы показывают {time}",
    "A number": "Число",
    "A price": "Цена",
    "A timetable": "Расписание",
    "Say the number.": "Назови число.",
    "How much is it?": "Сколько это стоит?",
    "What time is it on the clock?": "Который час на часах?",
    "When does it leave?": "Когда отправление?",
    "Your answer, in words or digits": "Твой ответ словами или цифрами",
    "Right. {answer}.": "Верно. {answer}.",
    "You said {said}.": "Твой ответ: {said}.",
    "You said {said}. It's {answer}.": "Твой ответ: {said}. Правильно: {answer}.",
    "That wasn't a number we could read.": "Мы не смогли прочитать это как число.",
    "That wasn't a time we could read.": "Мы не смогли прочитать это как время.",
    "That wasn't a price we could read.": "Мы не смогли прочитать это как цену.",
    "Right number. Mind the letters: the word has an õ, ä, ö or ü in it.":
      "Число верное. Обрати внимание на буквы: в слове есть буква с точками или с тильдой.",
    "In digits, so no word was practiced. Say it or type the words next time.":
      "Цифрами, поэтому ни одно слово не потренировано. В следующий раз скажи вслух или напиши словами.",
    "A clock face has no afternoon, so {morning} and {afternoon} both count.":
      "Часы со стрелками не различают время до и после полудня, поэтому засчитывается и {morning}, и {afternoon}.",
    "Hear it said": "Послушать",
    "No numbers to say yet": "Пока нечего называть",
    "This opens once you've met the numbers. They're one of the first units of the course.":
      "Это откроется, когда ты познакомишься с числами. Это один из первых разделов курса.",
    "Every number right": "Все числа верно",
    "{n} of {total} right": "Верно: {n} из {total}",
    "{n} number words counted toward your reviews.": "Слов-чисел засчитано в повторение: {n}.",
    "One number word counted toward your reviews.": "Одно числительное засчитано в твои повторения.",
    "Those number words aren't in your deck yet, so nothing was written down.":
      "Этих числительных ещё нет в твоей колоде, поэтому ничего не записано.",
    "Answers in digits are marked but don't count toward your reviews. Say them, or type the words, and they do.":
      "Ответы цифрами проверяются, но в повторение не засчитываются. Скажи их вслух или напиши словами, и они засчитаются.",

    // The conjugation table, said as a chant.
    "Say the table out loud": "Скажи таблицу вслух",
    "Or say all six in one go, the way a class chants them, pronouns and all.":
      "Или скажи все шесть подряд, как хором в классе, вместе с местоимениями.",
    "Heard {n} of {total} rows. Look them over, change any, then check the table.":
      "Услышано строк: {n} из {total}. Просмотри их, исправь, если нужно, и проверь таблицу.",
    "We couldn't tell which row each form was for. Say them with the pronouns, or type them.":
      "Не удалось понять, к какой строке относится каждая форма. Скажи их с местоимениями или напиши.",

    // Say what you see, aloud.
    "Say a sentence": "Скажи предложение",
    "Say a sentence and it goes into the box you're in, or the next empty one.":
      "Скажи предложение, и оно попадёт в поле, где ты сейчас, или в следующее пустое.",
    "That went into sentence {n}. Change anything that isn't what you said.":
      "Это попало в предложение {n}. Исправь то, что не совпадает со сказанным.",

    // 20 küsimust, asked aloud.
    "Ask your question out loud": "Задай вопрос вслух",
    "Say or type your question, then press Enter": "Скажи или напиши вопрос и нажми Enter",

    // Töövihik, read aloud.
    "Read a line aloud, the gap filled": "Прочитай строку вслух, с заполненным пропуском",
    "Or read a line aloud with the word in the gap, and the word goes into its box.":
      "Или прочитай строку вслух вместе со словом в пропуске, и слово попадёт в своё поле.",
    "That went into line {n}. Check marks it the same as typing.":
      "Это попало в строку {n}. Проверка оценит это так же, как написанное.",
    "That didn't line up with a gap. Read the whole line, the word in the gap included, or type it.":
      "Это не совпало ни с одним пропуском. Прочитай всю строку вместе со словом в пропуске или напиши его.",

    // The dictionary, Anu and the reading page.
    "Say the word to look it up": "Скажи слово, чтобы найти его",
    "Say your question": "Задай вопрос",
    "Read it aloud": "Прочитать вслух",
    "Read it aloud, a paragraph at a time. Each word lights up as it's heard.":
      "Читай вслух по одному абзацу. Каждое слово подсвечивается, когда его слышно.",
    "Read this paragraph aloud": "Прочитай этот абзац вслух",
    "Paragraph {n} of {total}: {heard} of {words} words heard.":
      "Абзац {n} из {total}: услышано слов {heard} из {words}.",
    "Back to the dictionary view": "Назад к словарю",
    "Next paragraph": "Следующий абзац",
    "Done reading": "Готово",
  },
  uk: {
    // The numbers round.
    "Say the number": "Назви число",
    "Ten things a counter would show you: a price tag, a clock on the wall, a time on a timetable, a number. Nothing is timed.":
      "Десять речей, які тобі покажуть біля прилавка: цінник, годинник на стіні, час у розкладі, число. Час не обмежений.",
    "Say each one in Estonian, or type it in words or digits. You'll hear the right answer after.":
      "Назви кожне естонською або напиши словами чи цифрами. Потім ти почуєш правильну відповідь.",
    "Prices, times, numbers": "Ціни, час, числа",
    "Ten, said or typed": "Десять, вголос або письмово",
    "A price tag, a clock on the wall, a timetable, a number. Say it in Estonian, or type it, and hear it said back.":
      "Цінник, годинник на стіні, розклад, число. Скажи це естонською або напиши й послухай, як це звучить.",
    "Prices, clock times and counts, said out loud. Estonian says half past two as half three.":
      "Ціни, час за годинником і числа вголос. Пів на третю естонці кажуть так само: «пів на третю».",
    "Prices, clock times and numbers, said out loud.": "Ціни, час за годинником і числа вголос.",
    "Numbers": "Числа",
    "A clock": "Годинник",
    "A clock showing {time}": "Годинник показує {time}",
    "A number": "Число",
    "A price": "Ціна",
    "A timetable": "Розклад",
    "Say the number.": "Назви число.",
    "How much is it?": "Скільки це коштує?",
    "What time is it on the clock?": "Котра година на годиннику?",
    "When does it leave?": "Коли відправлення?",
    "Your answer, in words or digits": "Твоя відповідь словами або цифрами",
    "Right. {answer}.": "Правильно. {answer}.",
    "You said {said}.": "Твоя відповідь: {said}.",
    "You said {said}. It's {answer}.": "Твоя відповідь: {said}. Правильно: {answer}.",
    "That wasn't a number we could read.": "Ми не змогли прочитати це як число.",
    "That wasn't a time we could read.": "Ми не змогли прочитати це як час.",
    "That wasn't a price we could read.": "Ми не змогли прочитати це як ціну.",
    "Right number. Mind the letters: the word has an õ, ä, ö or ü in it.":
      "Число правильне. Зверни увагу на літери: у слові є літера з крапками або з тильдою.",
    "In digits, so no word was practiced. Say it or type the words next time.":
      "Цифрами, тому жодне слово не потреноване. Наступного разу скажи вголос або напиши словами.",
    "A clock face has no afternoon, so {morning} and {afternoon} both count.":
      "Циферблат не розрізняє час до і після полудня, тому зараховується і {morning}, і {afternoon}.",
    "Hear it said": "Послухати",
    "No numbers to say yet": "Поки що нічого називати",
    "This opens once you've met the numbers. They're one of the first units of the course.":
      "Це відкриється, коли ти познайомишся з числами. Це один із перших розділів курсу.",
    "Every number right": "Усі числа правильно",
    "{n} of {total} right": "Правильно: {n} з {total}",
    "{n} number words counted toward your reviews.": "Слів-чисел зараховано до повторення: {n}.",
    "One number word counted toward your reviews.": "Один числівник зараховано до твоїх повторень.",
    "Those number words aren't in your deck yet, so nothing was written down.":
      "Цих числівників ще немає у твоїй колоді, тож нічого не записано.",
    "Answers in digits are marked but don't count toward your reviews. Say them, or type the words, and they do.":
      "Відповіді цифрами перевіряються, але до повторення не зараховуються. Скажи їх вголос або напиши словами, і вони зарахуються.",

    // The conjugation table, said as a chant.
    "Say the table out loud": "Скажи таблицю вголос",
    "Or say all six in one go, the way a class chants them, pronouns and all.":
      "Або скажи всі шість поспіль, як хором у класі, разом із займенниками.",
    "Heard {n} of {total} rows. Look them over, change any, then check the table.":
      "Почуто рядків: {n} з {total}. Перегляньте їх, виправте, якщо треба, і перевірте таблицю.",
    "We couldn't tell which row each form was for. Say them with the pronouns, or type them.":
      "Не вдалося зрозуміти, до якого рядка належить кожна форма. Скажи їх із займенниками або напиши.",

    // Say what you see, aloud.
    "Say a sentence": "Скажи речення",
    "Say a sentence and it goes into the box you're in, or the next empty one.":
      "Скажи речення, і воно потрапить у поле, де ти зараз, або в наступне порожнє.",
    "That went into sentence {n}. Change anything that isn't what you said.":
      "Це потрапило в речення {n}. Виправ те, що не збігається зі сказаним.",

    // 20 küsimust, asked aloud.
    "Ask your question out loud": "Поставте запитання вголос",
    "Say or type your question, then press Enter": "Скажи або напиши запитання й натисни Enter",

    // Töövihik, read aloud.
    "Read a line aloud, the gap filled": "Прочитай рядок вголос, із заповненим пропуском",
    "Or read a line aloud with the word in the gap, and the word goes into its box.":
      "Або прочитай рядок вголос разом зі словом у пропуску, і слово потрапить у своє поле.",
    "That went into line {n}. Check marks it the same as typing.":
      "Це потрапило в рядок {n}. Перевірка оцінить це так само, як написане.",
    "That didn't line up with a gap. Read the whole line, the word in the gap included, or type it.":
      "Це не збіглося з жодним пропуском. Прочитай весь рядок разом зі словом у пропуску або напиши його.",

    // The dictionary, Anu and the reading page.
    "Say the word to look it up": "Скажи слово, щоб знайти його",
    "Say your question": "Постав запитання",
    "Read it aloud": "Прочитати вголос",
    "Read it aloud, a paragraph at a time. Each word lights up as it's heard.":
      "Читай вголос по одному абзацу. Кожне слово підсвічується, коли його чути.",
    "Read this paragraph aloud": "Прочитай цей абзац вголос",
    "Paragraph {n} of {total}: {heard} of {words} words heard.":
      "Абзац {n} з {total}: почуто слів {heard} з {words}.",
    "Back to the dictionary view": "Назад до словника",
    "Next paragraph": "Наступний абзац",
    "Done reading": "Готово",
  },
};
