import type { Area } from "../area";

/**
 * Väljendid, the round about verb pairs that do not mean what they say: its
 * screens, its card in the practice menu, its briefing, and the English of
 * `lib/estonian/sayings.ts` (what each pair means, and what it says word for
 * word). Keyed on the English each line translates. See lib/copy/locale.ts and
 * docs/34-interface-languages.md. No Estonian here: every pair and every
 * sentence is drawn from the dictionary.
 *
 * The word-for-word lines are deliberately stiff in both languages. They are
 * the trap shown on purpose, so a smooth rendering would be a mistranslation
 * of what they are for.
 */
export const SAYINGS: Area = {
  ru: {
    // The round.
    "Sayings": "Выражения",
    "Saying": "Выражение",
    "Verb pairs that don't mean what they say.": "Пары слов с глаголом, которые значат не то, что говорят.",
    "No sayings to show yet": "Пока нечего показать",
    "They need the full dictionary.": "Для них нужен полный словарь.",
    "That's the set done": "Набор пройден",
    "Every one on the first try.": "Все с первого раза.",
    "{n} of {total} on the first try. The rest came round again until they stuck.":
      "{n} из {total} с первого раза. Остальные возвращались, пока не запомнились.",
    "Another set": "Ещё набор",
    "{n} of {total}": "{n} из {total}",
    "Word for word": "Слово в слово",
    "Word for word: {literal}.": "Слово в слово: {literal}.",
    "What it means": "Что это значит",
    "Match them": "Сопоставить",
    "{n} of {total} matched": "Сопоставлено: {n} из {total}",
    "Which means which?": "Что что значит?",
    "Tap a saying, then its meaning.": "Нажмите на выражение, потом на его значение.",
    "Matched.": "Пара найдена.",
    "Not those two.": "Это не пара.",
    "All matched. Now see them in a sentence.": "Все пары найдены. Теперь посмотрим их в предложении.",
    "Which word is missing?": "Какого слова не хватает?",
    "blank": "пропуск",
    "Wrong": "Неверно",
    "Right. “{phrase}” means “{means}”.": "Верно. «{phrase}» значит «{means}».",
    "Not quite. It's “{phrase}”, which means “{means}”.": "Не совсем. Это «{phrase}», то есть «{means}».",

    // The practice menu and the briefing.
    "Pairs that don't mean what they say": "Пары, которые значат не то, что говорят",
    "Five at a time, no clock": "По пять, без таймера",
    "A verb and one small word that change what it means. See each pair with what it says word for word, match five of them to their meanings, then fill in the missing word in a real sentence.":
      "Глагол и одно маленькое слово, которое меняет смысл. Посмотрите на каждую пару: что она говорит слово в слово и что значит на самом деле. Сопоставьте пять пар с их значениями, потом вставьте пропущенное слово в настоящем предложении.",
    "Learn five sayings": "Выучите пять выражений",
    "Five pairs of words that mean something other than their parts, each in a real sentence. Then a matching round, then a gap to fill in each of them.":
      "Пять пар слов, значение которых не складывается из их частей, каждая в настоящем предложении. Потом сопоставление и пропуск, который нужно заполнить в каждой.",
    "Read each one, match them to their meanings, then pick the missing word. There's no clock.":
      "Прочитайте каждую, сопоставьте со значениями, затем выберите пропущенное слово. Времени на ответ нет.",

    // What each pair means, and what it says word for word.
    "it broke": "оно сломалось",
    "went broken": "пошло сломанным",
    "it lit up, or caught fire": "оно загорелось",
    "went to burn": "пошло гореть",
    "you need it": "это нужно",
    "goes needed": "идёт нужным",
    "it went missing": "оно пропало",
    "went to vanish": "пошло пропадать",
    "it will cost": "это будет стоить",
    "goes to pay": "идёт платить",
    "it broke out, it went off": "началось, прогремело",
    "went loose": "пошло открытым",
    "it won't shut": "не закрывается",
    "doesn't go shut": "не идёт закрытым",
    "it won't start": "не заводится",
    "doesn't go to walk": "не идёт ходить",
    "it spread, it smeared": "разошлось, размазалось",
    "went apart": "пошло врозь",
    "they get mixed up": "они путаются",
    "go mixed": "идут смешанными",
    "it passed, it wore off": "прошло, отпустило",
    "went over": "пошло через",
    "you can't forget it": "этого не забыть",
    "doesn't go out of mind": "не уходит из ума",
    "you fell for it": "вы попались на это",
    "went onto the hook": "пошло на крючок",
    "to go too far": "зайти слишком далеко",
    "to go to excess": "идти сверх меры",
  },
  uk: {
    // The round.
    "Sayings": "Вирази",
    "Saying": "Вираз",
    "Verb pairs that don't mean what they say.": "Пари слів із дієсловом, які означають не те, що кажуть.",
    "No sayings to show yet": "Поки що нічого показати",
    "They need the full dictionary.": "Для них потрібен повний словник.",
    "That's the set done": "Набір пройдено",
    "Every one on the first try.": "Усі з першого разу.",
    "{n} of {total} on the first try. The rest came round again until they stuck.":
      "{n} із {total} з першого разу. Решта поверталися, доки не запам'яталися.",
    "Another set": "Ще набір",
    "{n} of {total}": "{n} із {total}",
    "Word for word": "Слово в слово",
    "Word for word: {literal}.": "Слово в слово: {literal}.",
    "What it means": "Що це означає",
    "Match them": "Зіставити",
    "{n} of {total} matched": "Зіставлено: {n} із {total}",
    "Which means which?": "Що що означає?",
    "Tap a saying, then its meaning.": "Натисніть на вираз, потім на його значення.",
    "Matched.": "Пару знайдено.",
    "Not those two.": "Це не пара.",
    "All matched. Now see them in a sentence.": "Усі пари знайдено. Тепер подивимося на них у реченні.",
    "Which word is missing?": "Якого слова бракує?",
    "blank": "пропуск",
    "Wrong": "Неправильно",
    "Right. “{phrase}” means “{means}”.": "Правильно. «{phrase}» означає «{means}».",
    "Not quite. It's “{phrase}”, which means “{means}”.": "Не зовсім. Це «{phrase}», тобто «{means}».",

    // The practice menu and the briefing.
    "Pairs that don't mean what they say": "Пари, що означають не те, що кажуть",
    "Five at a time, no clock": "По п'ять, без таймера",
    "A verb and one small word that change what it means. See each pair with what it says word for word, match five of them to their meanings, then fill in the missing word in a real sentence.":
      "Дієслово і одне маленьке слово, яке змінює значення. Подивіться на кожну пару: що вона каже слово в слово і що означає насправді. Зіставте п'ять пар із їхніми значеннями, потім вставте пропущене слово в справжньому реченні.",
    "Learn five sayings": "Вивчіть п'ять виразів",
    "Five pairs of words that mean something other than their parts, each in a real sentence. Then a matching round, then a gap to fill in each of them.":
      "П'ять пар слів, значення яких не складається з їхніх частин, кожна в справжньому реченні. Потім зіставлення і пропуск, який треба заповнити в кожній.",
    "Read each one, match them to their meanings, then pick the missing word. There's no clock.":
      "Прочитайте кожну, зіставте зі значеннями, потім виберіть пропущене слово. Часу на відповідь не обмежено.",

    // What each pair means, and what it says word for word.
    "it broke": "воно зламалося",
    "went broken": "пішло зламаним",
    "it lit up, or caught fire": "воно загорілося",
    "went to burn": "пішло горіти",
    "you need it": "це потрібно",
    "goes needed": "іде потрібним",
    "it went missing": "воно зникло",
    "went to vanish": "пішло зникати",
    "it will cost": "це коштуватиме",
    "goes to pay": "іде платити",
    "it broke out, it went off": "почалося, пролунало",
    "went loose": "пішло відкритим",
    "it won't shut": "не зачиняється",
    "doesn't go shut": "не йде закритим",
    "it won't start": "не заводиться",
    "doesn't go to walk": "не йде ходити",
    "it spread, it smeared": "розійшлося, розмазалося",
    "went apart": "пішло врізнобіч",
    "they get mixed up": "вони плутаються",
    "go mixed": "йдуть змішаними",
    "it passed, it wore off": "минуло, відпустило",
    "went over": "пішло через",
    "you can't forget it": "цього не забути",
    "doesn't go out of mind": "не йде з розуму",
    "you fell for it": "ви повелися на це",
    "went onto the hook": "пішло на гачок",
    "to go too far": "зайти занадто далеко",
    "to go to excess": "іти понад міру",
  },
};
