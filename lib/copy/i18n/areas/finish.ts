import type { Area } from "../area";

/**
 * The last English a Russian or Ukrainian reader met inside the app: the
 * refusals an action, an allowance or a route hands back (the throttle's wait
 * counted in seconds), the not-found title, and a handful of labels a sweep of
 * the signed-in screens found printed raw. Keyed on the English each line
 * translates. See lib/copy/locale.ts and docs/34-interface-languages.md.
 * No Estonian here.
 */
export const FINISH: Area = {
  ru: {
    // The throttle on a server action, with the wait counted.
    "That's a lot in a short time, so we held this one back and nothing has changed. Try again in {time}.":
      "Слишком много за короткое время, поэтому мы это придержали, и ничего не изменилось. Попробуйте ещё раз через {time}.",

    // The day's allowance for the AI features.
    "That's a lot of questions at once. Give it a few seconds, then try again.":
      "Слишком много вопросов сразу. Подождите несколько секунд и попробуйте снова.",
    "That's all the help from Anu and the other AI features for today. They're back at midnight UTC, and your cards, the dictionary and everything else work as normal until then.":
      "На сегодня помощь Ану и других функций ИИ закончилась. Они вернутся в полночь по UTC, а карточки, словарь и всё остальное до тех пор работают как обычно.",
    "That's all the help from Anu and the other AI features for today. They're back at midnight UTC.":
      "На сегодня помощь Ану и других функций ИИ закончилась. Они вернутся в полночь по UTC.",
    "This part of the app has used up its budget for today and will be back at midnight UTC. Everything else still works as normal.":
      "Эта часть приложения израсходовала свой бюджет на сегодня и вернётся в полночь по UTC. Всё остальное работает как обычно.",
    "Today's AI budget is nearly spent, so what's left is kept for people who haven't asked anything yet. It's back at midnight UTC, and your cards, the dictionary and everything else still work.":
      "Бюджет ИИ на сегодня почти исчерпан, и остаток оставлен для тех, кто ещё ничего не спрашивал. Он вернётся в полночь по UTC, а карточки, словарь и всё остальное работают.",
    "The app has run through its AI budget for today, for everybody. It's nothing you did, and it's back at midnight UTC.":
      "Приложение израсходовало бюджет ИИ на сегодня, для всех сразу. Вы тут ни при чём, он вернётся в полночь по UTC.",
    "Something went wrong on our side just then. Give it a minute and try again.":
      "У нас что-то пошло не так. Подождите минуту и попробуйте снова.",
    "That's all the translations for today. Try again tomorrow.":
      "На сегодня переводы закончились. Попробуйте завтра.",
    "Anu couldn't translate that one just now.": "Ану сейчас не смогла это перевести.",

    // Reading a photographed page.
    "Reading a photo needs an AI key, and this copy of Kodukeel doesn't have one yet. Everything else still works: review, the dictionary, and typing a word list in by hand.":
      "Чтобы читать фото, нужен ключ ИИ, а у этой копии Kodukeel его пока нет. Всё остальное работает: повторение, словарь и ввод списка слов вручную.",
    "Reading photos has used up today's shared allowance. You can still type a word list in by hand, and photos work again after midnight UTC.":
      "Чтение фото исчерпало общий лимит на сегодня. Список слов можно ввести вручную, а фото снова заработают после полуночи по UTC.",
    "We read the page, but couldn't check its words against the dictionary just now. Try the photo again in a moment.":
      "Мы прочитали страницу, но сейчас не смогли сверить слова со словарём. Попробуйте отправить фото ещё раз чуть позже.",
    "We couldn't read that photo just now. Try again in a moment.":
      "Сейчас не получилось прочитать это фото. Попробуйте чуть позже.",
    "Give the last page a moment to finish before you send another.":
      "Дождитесь, пока закончится предыдущая страница, и тогда отправляйте следующую.",

    // Restoring a backup.
    "That file is too big for us to read, and nothing was changed. If it really is a Kodukeel backup, whoever runs this copy of the app can raise the limit.":
      "Этот файл слишком большой, мы не можем его прочитать, и ничего не изменилось. Если это действительно резервная копия Kodukeel, тот, кто поддерживает эту копию приложения, может поднять лимит.",
    "Only part of that file arrived: {mb} MB of it, and it stops mid-way rather than at the end. Nothing was changed and your file is untouched. This is a limit on the upload rather than anything wrong with the backup.":
      "Файл дошёл только частично: {mb} МБ, и он обрывается на середине. Ничего не изменилось, ваш файл цел. Это ограничение загрузки, а не ошибка в резервной копии.",
    "We're still reading that file. Nothing has changed.": "Мы ещё читаем этот файл. Ничего не изменилось.",
    "That file is larger than this app will read, and nothing was changed.":
      "Этот файл больше, чем приложение может прочитать, и ничего не изменилось.",
    "The upload didn't finish, and nothing was changed. Try again.":
      "Загрузка не завершилась, и ничего не изменилось. Попробуйте ещё раз.",
    "That file was empty, so nothing was changed.": "Файл был пустым, поэтому ничего не изменилось.",
    "The restore didn't finish, and nothing was changed. Your backup file is untouched, so it's safe to try again.":
      "Восстановление не завершилось, и ничего не изменилось. Файл резервной копии цел, так что можно спокойно попробовать ещё раз.",

    // Anu, the readers and the speech.
    "Anu's still catching up on your last few questions. Give her a moment.":
      "Ану ещё разбирается с вашими последними вопросами. Дайте ей минутку.",
    "There's no AI key set up yet. Add one in .env, or follow the two-minute walkthrough in Settings.":
      "Ключ ИИ ещё не настроен. Добавьте его в .env или пройдите двухминутную инструкцию в настройках.",
    "Type a question first.": "Сначала напишите вопрос.",
    "We couldn't reach Anu just now. Try again in a moment.": "Сейчас не удалось связаться с Ану. Попробуйте чуть позже.",
    "Anu's still reading the last one. Give her a moment.": "Ану ещё читает предыдущее. Дайте ей минутку.",
    "Anu is still writing the last one.": "Ану ещё пишет предыдущий отзыв.",
    "That was a lot of turns at once. Give it a moment.": "Слишком много реплик сразу. Подождите немного.",
    "That's a lot of audio at once. Give it a moment.": "Слишком много аудио сразу. Подождите немного.",
    "There's nothing to say out loud.": "Здесь нечего произносить вслух.",
    "We don't have that clip yet, and we couldn't check who was asking. Try again in a moment.":
      "Этой записи у нас ещё нет, и мы не смогли проверить, кто спрашивает. Попробуйте чуть позже.",
    "Give the card a moment to finish drawing.": "Подождите, пока карточка дорисуется.",

    // The screens.
    "No page here": "Здесь нет страницы",
    "Where this word breaks the rules": "Где это слово нарушает правила",
    "One form here isn't what the usual endings would give you.":
      "Одна форма здесь не та, что дали бы обычные окончания.",
    "{forms} here aren't what the usual endings would give you.":
      "{forms} здесь не такие, как дали бы обычные окончания.",
    "{short} is the short one, and {long} is the long one you get from the ending. Both are right.":
      "{short} это краткая форма, а {long} длинная, которая получается с окончанием. Обе правильные.",
    "{word} is the {form}.": "{word} это {form}.",
    "Which deck?": "В какую колоду?",
    "Words you might use": "Слова, которые могут пригодиться",
    "Loading": "Загрузка",
    "Main": "Главное меню",
    "now": "сейчас",
    ", done": ", сделано",
    "this gap": "этот пропуск",
    "this sentence": "это предложение",
    "This link is broken": "Эта ссылка не работает",
    "{written} + {spoken} min": "{written} + {spoken} мин",
  },
  uk: {
    "That's a lot in a short time, so we held this one back and nothing has changed. Try again in {time}.":
      "Забагато за короткий час, тому ми це притримали, і нічого не змінилося. Спробуйте ще раз через {time}.",

    "That's a lot of questions at once. Give it a few seconds, then try again.":
      "Забагато запитань одразу. Зачекайте кілька секунд і спробуйте знову.",
    "That's all the help from Anu and the other AI features for today. They're back at midnight UTC, and your cards, the dictionary and everything else work as normal until then.":
      "На сьогодні допомога Ану та інших функцій ШІ скінчилася. Вони повернуться опівночі за UTC, а картки, словник і все інше до того часу працюють як звичайно.",
    "That's all the help from Anu and the other AI features for today. They're back at midnight UTC.":
      "На сьогодні допомога Ану та інших функцій ШІ скінчилася. Вони повернуться опівночі за UTC.",
    "This part of the app has used up its budget for today and will be back at midnight UTC. Everything else still works as normal.":
      "Ця частина застосунку витратила свій бюджет на сьогодні й повернеться опівночі за UTC. Усе інше працює як звичайно.",
    "Today's AI budget is nearly spent, so what's left is kept for people who haven't asked anything yet. It's back at midnight UTC, and your cards, the dictionary and everything else still work.":
      "Бюджет ШІ на сьогодні майже вичерпано, і залишок збережено для тих, хто ще нічого не питав. Він повернеться опівночі за UTC, а картки, словник і все інше працюють.",
    "The app has run through its AI budget for today, for everybody. It's nothing you did, and it's back at midnight UTC.":
      "Застосунок витратив бюджет ШІ на сьогодні, для всіх одразу. Ви тут ні до чого, він повернеться опівночі за UTC.",
    "Something went wrong on our side just then. Give it a minute and try again.":
      "У нас щось пішло не так. Зачекайте хвилину й спробуйте знову.",
    "That's all the translations for today. Try again tomorrow.":
      "На сьогодні переклади скінчилися. Спробуйте завтра.",
    "Anu couldn't translate that one just now.": "Ану зараз не змогла це перекласти.",

    "Reading a photo needs an AI key, and this copy of Kodukeel doesn't have one yet. Everything else still works: review, the dictionary, and typing a word list in by hand.":
      "Щоб читати фото, потрібен ключ ШІ, а ця копія Kodukeel його ще не має. Усе інше працює: повторення, словник і введення списку слів вручну.",
    "Reading photos has used up today's shared allowance. You can still type a word list in by hand, and photos work again after midnight UTC.":
      "Читання фото вичерпало спільний ліміт на сьогодні. Список слів можна ввести вручну, а фото знову запрацюють після півночі за UTC.",
    "We read the page, but couldn't check its words against the dictionary just now. Try the photo again in a moment.":
      "Ми прочитали сторінку, але зараз не змогли звірити слова зі словником. Надішліть фото ще раз трохи згодом.",
    "We couldn't read that photo just now. Try again in a moment.":
      "Зараз не вдалося прочитати це фото. Спробуйте трохи згодом.",
    "Give the last page a moment to finish before you send another.":
      "Дочекайтеся, поки обробиться попередня сторінка, і тоді надсилайте наступну.",

    "That file is too big for us to read, and nothing was changed. If it really is a Kodukeel backup, whoever runs this copy of the app can raise the limit.":
      "Цей файл завеликий, ми не можемо його прочитати, і нічого не змінилося. Якщо це справді резервна копія Kodukeel, той, хто підтримує цю копію застосунку, може підняти ліміт.",
    "Only part of that file arrived: {mb} MB of it, and it stops mid-way rather than at the end. Nothing was changed and your file is untouched. This is a limit on the upload rather than anything wrong with the backup.":
      "Файл надійшов лише частково: {mb} МБ, і він обривається посередині. Нічого не змінилося, ваш файл цілий. Це обмеження завантаження, а не помилка в резервній копії.",
    "We're still reading that file. Nothing has changed.": "Ми ще читаємо цей файл. Нічого не змінилося.",
    "That file is larger than this app will read, and nothing was changed.":
      "Цей файл більший, ніж застосунок може прочитати, і нічого не змінилося.",
    "The upload didn't finish, and nothing was changed. Try again.":
      "Завантаження не завершилося, і нічого не змінилося. Спробуйте ще раз.",
    "That file was empty, so nothing was changed.": "Файл був порожній, тому нічого не змінилося.",
    "The restore didn't finish, and nothing was changed. Your backup file is untouched, so it's safe to try again.":
      "Відновлення не завершилося, і нічого не змінилося. Файл резервної копії цілий, тож можна спокійно спробувати ще раз.",

    "Anu's still catching up on your last few questions. Give her a moment.":
      "Ану ще розбирається з вашими останніми запитаннями. Дайте їй хвилинку.",
    "There's no AI key set up yet. Add one in .env, or follow the two-minute walkthrough in Settings.":
      "Ключ ШІ ще не налаштовано. Додайте його в .env або пройдіть двохвилинну інструкцію в налаштуваннях.",
    "Type a question first.": "Спершу напишіть запитання.",
    "We couldn't reach Anu just now. Try again in a moment.": "Зараз не вдалося зв'язатися з Ану. Спробуйте трохи згодом.",
    "Anu's still reading the last one. Give her a moment.": "Ану ще читає попереднє. Дайте їй хвилинку.",
    "Anu is still writing the last one.": "Ану ще пише попередній відгук.",
    "That was a lot of turns at once. Give it a moment.": "Забагато реплік одразу. Зачекайте трохи.",
    "That's a lot of audio at once. Give it a moment.": "Забагато аудіо одразу. Зачекайте трохи.",
    "There's nothing to say out loud.": "Тут нічого вимовляти вголос.",
    "We don't have that clip yet, and we couldn't check who was asking. Try again in a moment.":
      "Цього запису в нас ще немає, і ми не змогли перевірити, хто питає. Спробуйте трохи згодом.",
    "Give the card a moment to finish drawing.": "Зачекайте, поки картка домалюється.",

    "No page here": "Тут немає сторінки",
    "Where this word breaks the rules": "Де це слово порушує правила",
    "One form here isn't what the usual endings would give you.":
      "Одна форма тут не та, яку дали б звичайні закінчення.",
    "{forms} here aren't what the usual endings would give you.":
      "{forms} тут не такі, як дали б звичайні закінчення.",
    "{short} is the short one, and {long} is the long one you get from the ending. Both are right.":
      "Коротка форма: {short}, довга, яку дає закінчення: {long}. Обидві правильні.",
    "{word} is the {form}.": "{word}: форма {form}.",
    "Which deck?": "У яку колоду?",
    "Words you might use": "Слова, які можуть знадобитися",
    "Loading": "Завантаження",
    "Main": "Головне меню",
    "now": "зараз",
    ", done": ", зроблено",
    "this gap": "цей пропуск",
    "this sentence": "це речення",
    "This link is broken": "Це посилання не працює",
    "{written} + {spoken} min": "{written} + {spoken} хв",
  },
  counted: {
    second: { en: ["second", "seconds"], ru: ["секунду", "секунды", "секунд"], uk: ["секунду", "секунди", "секунд"] },
  },
};
