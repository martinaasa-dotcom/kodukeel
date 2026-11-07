import type { Area } from "../area";

/**
 * The Numbers round's second mode, one number in many jobs: its screens and
 * the English of its sentences (`lib/games/numberEndings.ts`), which are
 * templates keyed here so each language says the number its own way. Keyed
 * on the English each line translates. No Estonian here.
 */
export const NUMBER_ENDINGS: Area = {
  ru: {
    // The mode switch and the briefing.
    "Number endings": "Окончания чисел",
    "Numbers modes": "Режимы чисел",
    "One number, many jobs": "Одно число, много ролей",
    "A number changes its ending with its job: 17 years old, 17 friends, the 17th floor. First one number in six sentences, then a year built part by part, then sentences read aloud.":
      "Число меняет окончание вместе со своей ролью: 17 лет, 17 друзей, 17-й этаж. Сначала одно число в шести предложениях, потом год, собранный по частям, потом предложения, прочитанные вслух.",
    "Pick the right form for each sentence, then write down the numbers you hear, with a dot when it means \"-th\". Nothing is timed.":
      "Выбери нужную форму для каждого предложения, потом запиши услышанные числа, с точкой, если число порядковое. Время не ограничено.",
    // Step one.
    "Pick the form this sentence needs.": "Выбери форму, которая нужна этому предложению.",
    "Three ways to say it. Which one does each sentence need?": "Три способа сказать это. Какой нужен каждому предложению?",
    "The forms": "Формы",
    "Plain for an age or a count, omastav (2nd form) before “with” and “in”, and “-th” for a floor or a date.":
      "Простая форма для возраста и количества, omastav (2-я форма) перед «с» и «через», порядковая для этажа и даты.",
    // Step two.
    "Build the year": "Собери год",
    "Pick each part. Here every part changes, and the last one becomes “-th”.":
      "Выбери каждую часть. Здесь меняется каждая часть, а последняя становится порядковой.",
    "Part {n}": "Часть {n}",
    "Not quite. Here it is in full:": "Не совсем. Вот полностью:",
    "Not quite. It's {answer}.": "Не совсем. Правильно: {answer}.",
    "The same year doing other jobs": "Тот же год в других ролях",
    // Step three.
    "Write the number you hear": "Запиши число, которое слышишь",
    "Write the hour, in digits.": "Запиши час цифрами.",
    "Write the decade, in digits.": "Запиши десятилетие цифрами.",
    "Write the number in digits. Add a dot if it means “-th”.": "Запиши число цифрами. Поставь точку, если оно порядковое.",
    "The number you heard": "Число, которое ты услышал",
    "e.g. 17 or 17.": "например 17 или 17.",
    "You wrote {said}. It's {answer}.": "Ты написал {said}. Правильно: {answer}.",
    "Right. It means “-th”, so it has a dot.": "Верно. Число порядковое, поэтому с точкой.",
    "Right number. It means “-th” here, so it's written {answer}, with a dot.":
      "Число верное. Здесь оно порядковое, поэтому пишется {answer}, с точкой.",
    "Right number. It's a plain number here, so it's written {answer}, without a dot.":
      "Число верное. Здесь оно простое, поэтому пишется {answer}, без точки.",
    // The end of a round.
    "No numbers to practice yet": "Пока нечего тренировать",
    "To look at": "Посмотреть ещё раз",
    "The numbers you missed are in your deck now, and they'll come back in your reviews.":
      "Числа, в которых ты ошибся, теперь в твоей колоде и вернутся в повторении.",
    "The numbers you missed will come back in another round.": "Числа, в которых ты ошибся, вернутся в следующем раунде.",
    // The sentences, as templates: {n} the digits, {nth} the English ordinal.
    "I'm {n}.": "Мне {n}.",
    "I have {n} books.": "У меня книг: {n}.",
    "I live on floor {n}.": "Я живу на {n}-м этаже.",
    "I came with {n} friends.": "Я пришёл с {n} друзьями.",
    "The bus comes in {n} minutes.": "Автобус придёт через {n} мин.",
    "My grandmother was born in the {n}s.": "Моя бабушка родилась в {n}-х.",
    "The shop is open until {n}.": "Магазин открыт до {n}.",
    "The shop is open from {n}.": "Магазин открыт с {n}.",
    "I was born in {n}.": "Я родился в {n} году.",
    "I've lived here since {n}.": "Я живу здесь с {n} года.",
    "I worked there until {n}.": "Я работал там до {n} года.",
    "The house was finished by {n}.": "Дом был готов к {n} году.",
    "The year was {n}.": "Шёл {n} год.",
    "I was born on January {n}.": "Я родился {n} января.",
    "I was born on February {n}.": "Я родился {n} февраля.",
    "I was born on March {n}.": "Я родился {n} марта.",
    "I was born on April {n}.": "Я родился {n} апреля.",
    "I was born on May {n}.": "Я родился {n} мая.",
    "I was born on June {n}.": "Я родился {n} июня.",
    "I was born on July {n}.": "Я родился {n} июля.",
    "I was born on August {n}.": "Я родился {n} августа.",
    "I was born on September {n}.": "Я родился {n} сентября.",
    "I was born on October {n}.": "Я родился {n} октября.",
    "I was born on November {n}.": "Я родился {n} ноября.",
    "I was born on December {n}.": "Я родился {n} декабря.",
  },
  uk: {
    "Number endings": "Закінчення чисел",
    "Numbers modes": "Режими чисел",
    "One number, many jobs": "Одне число, багато ролей",
    "A number changes its ending with its job: 17 years old, 17 friends, the 17th floor. First one number in six sentences, then a year built part by part, then sentences read aloud.":
      "Число змінює закінчення разом зі своєю роллю: 17 років, 17 друзів, 17-й поверх. Спершу одне число в шести реченнях, потім рік, зібраний частинами, потім речення, прочитані вголос.",
    "Pick the right form for each sentence, then write down the numbers you hear, with a dot when it means \"-th\". Nothing is timed.":
      "Вибери потрібну форму для кожного речення, потім запиши почуті числа, з крапкою, якщо число порядкове. Час не обмежений.",
    "Pick the form this sentence needs.": "Вибери форму, яка потрібна цьому реченню.",
    "Three ways to say it. Which one does each sentence need?": "Три способи сказати це. Який потрібен кожному реченню?",
    "The forms": "Форми",
    "Plain for an age or a count, omastav (2nd form) before “with” and “in”, and “-th” for a floor or a date.":
      "Проста форма для віку й кількості, omastav (2-га форма) перед «з» і «через», порядкова для поверху й дати.",
    "Build the year": "Збери рік",
    "Pick each part. Here every part changes, and the last one becomes “-th”.":
      "Вибери кожну частину. Тут змінюється кожна частина, а остання стає порядковою.",
    "Part {n}": "Частина {n}",
    "Not quite. Here it is in full:": "Не зовсім. Ось повністю:",
    "Not quite. It's {answer}.": "Не зовсім. Правильно: {answer}.",
    "The same year doing other jobs": "Той самий рік в інших ролях",
    "Write the number you hear": "Запиши число, яке чуєш",
    "Write the hour, in digits.": "Запиши годину цифрами.",
    "Write the decade, in digits.": "Запиши десятиліття цифрами.",
    "Write the number in digits. Add a dot if it means “-th”.": "Запиши число цифрами. Постав крапку, якщо воно порядкове.",
    "The number you heard": "Число, яке ти почув",
    "e.g. 17 or 17.": "наприклад 17 або 17.",
    "You wrote {said}. It's {answer}.": "Ти написав {said}. Правильно: {answer}.",
    "Right. It means “-th”, so it has a dot.": "Правильно. Число порядкове, тому з крапкою.",
    "Right number. It means “-th” here, so it's written {answer}, with a dot.":
      "Число правильне. Тут воно порядкове, тому пишеться {answer}, з крапкою.",
    "Right number. It's a plain number here, so it's written {answer}, without a dot.":
      "Число правильне. Тут воно просте, тому пишеться {answer}, без крапки.",
    "No numbers to practice yet": "Поки нема чого тренувати",
    "To look at": "Переглянути ще раз",
    "The numbers you missed are in your deck now, and they'll come back in your reviews.":
      "Числа, у яких ти помилився, тепер у твоїй колоді й повернуться в повторенні.",
    "The numbers you missed will come back in another round.": "Числа, у яких ти помилився, повернуться в наступному раунді.",
    "I'm {n}.": "Мені {n}.",
    "I have {n} books.": "У мене книжок: {n}.",
    "I live on floor {n}.": "Я живу на {n}-му поверсі.",
    "I came with {n} friends.": "Я прийшов з {n} друзями.",
    "The bus comes in {n} minutes.": "Автобус прийде через {n} хв.",
    "My grandmother was born in the {n}s.": "Моя бабуся народилася в {n}-х.",
    "The shop is open until {n}.": "Магазин відчинений до {n}.",
    "The shop is open from {n}.": "Магазин відчинений з {n}.",
    "I was born in {n}.": "Я народився в {n} році.",
    "I've lived here since {n}.": "Я живу тут з {n} року.",
    "I worked there until {n}.": "Я працював там до {n} року.",
    "The house was finished by {n}.": "Будинок був готовий до {n} року.",
    "The year was {n}.": "Був {n} рік.",
    "I was born on January {n}.": "Я народився {n} січня.",
    "I was born on February {n}.": "Я народився {n} лютого.",
    "I was born on March {n}.": "Я народився {n} березня.",
    "I was born on April {n}.": "Я народився {n} квітня.",
    "I was born on May {n}.": "Я народився {n} травня.",
    "I was born on June {n}.": "Я народився {n} червня.",
    "I was born on July {n}.": "Я народився {n} липня.",
    "I was born on August {n}.": "Я народився {n} серпня.",
    "I was born on September {n}.": "Я народився {n} вересня.",
    "I was born on October {n}.": "Я народився {n} жовтня.",
    "I was born on November {n}.": "Я народився {n} листопада.",
    "I was born on December {n}.": "Я народився {n} грудня.",
  },
};
