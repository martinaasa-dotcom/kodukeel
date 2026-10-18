import type { Area } from "../area";

/**
 * Speaking: the one microphone, a line said along, and the Speaking section in
 * Settings (docs/41-fifth-batch.md, VB-1 and VB-2). Machine-written, as every
 * area is, and marked so on the language choice. Keyed on the English each
 * line translates; see `lib/copy/locale.ts`. No Estonian in here (ADR-005).
 *
 * "Heard" is the verb for what the machine heard, and "understood" for a word
 * that came across, in all three languages: the app says which words it
 * understood and what it heard them as, and never what a sound was like
 * (section 3). How a sound was made is left to the learner's own ear, beside
 * the native recording ("Hear yourself, then them").
 */
export const SPEAKING: Area = {
  ru: {
    // The microphone.
    "Say it along": "Сказать вместе",
    "Stop listening": "Перестать слушать",
    "Getting ready to listen": "Готовлюсь слушать",
    "Reading what you said": "Разбираю, что вы сказали",
    "Listening. Press again when you are done.": "Слушаю. Нажмите ещё раз, когда закончите.",
    "That is very loud. Hold the microphone a little further away.":
      "Очень громко. Держите микрофон чуть дальше.",
    "Heard: {text}": "Услышано: {text}",
    "Nothing was heard.": "Ничего не услышано.",
    "Every word was understood.": "Понято каждое слово.",
    "{n} of {total} words were understood.": "Понято слов: {n} из {total}.",

    // You, then them (CompareVoices): the sound is checked by ear.
    "Hear yourself, then them": "Послушать себя, потом их",
    "Your voice": "Ваш голос",
    "Native voice": "Голос носителя",
    "The app checks the words. Your ear checks the sound.": "Приложение проверяет слова. Звучание проверяет ваш слух.",
    "Playing your recording.": "Звучит ваша запись.",
    "Playing the native recording.": "Звучит запись носителя языка.",
    "We heard {heard} for {word}.": "Мы услышали {heard} вместо {word}.",

    // The download.
    "Download for speaking": "Загрузка для устной речи",
    "Download {mb} MB": "Загрузить {mb} МБ",
    "Downloading {done} of {total} MB": "Загружено {done} из {total} МБ",
    "Starting the download": "Начинаю загрузку",
    "Speaking is new. It needs a one-time download of {mb} MB, which stays on this device, so hearing works offline and nothing you say ever leaves it.":
      "Устная речь появилась недавно. Для неё нужна разовая загрузка {mb} МБ. Она остаётся на этом устройстве, поэтому распознавание работает без сети, а сказанное вами никуда не уходит.",
    "What you see is the machine's hearing. You can always change it before it counts.":
      "То, что вы видите, услышала машина. Вы всегда можете это исправить, прежде чем ответ засчитается.",
    "You seem to be on mobile data, so you might want to wait for Wi-Fi.":
      "Похоже, вы подключены через мобильный интернет. Возможно, лучше дождаться Wi-Fi.",
    "Your browser cleared the speaking download to save space. Getting it back is {mb} MB, once.":
      "Браузер удалил загрузку для устной речи, чтобы освободить место. Вернуть её можно одной загрузкой {mb} МБ.",

    // What went wrong, each with the typed way on.
    "No microphone was found. Typing works as before.": "Микрофон не найден. Печатать можно, как раньше.",
    "The microphone is blocked for this site. You can allow it in your browser's site settings, or keep typing.":
      "Микрофон для этого сайта заблокирован. Его можно разрешить в настройках сайта в браузере или продолжать печатать.",
    "Speaking needs its download first.": "Сначала нужна загрузка для устной речи.",
    "Your browser cleared the speaking download. Press the microphone to get it back.":
      "Браузер удалил загрузку для устной речи. Нажмите на микрофон, чтобы вернуть её.",
    "The download did not check out, so it was not used. Try it again.":
      "Загрузка не прошла проверку, поэтому она не используется. Попробуйте ещё раз.",
    "This device is too slow to hear speech as you say it, so typing stays as it was.":
      "Это устройство слишком медленное, чтобы распознавать речь на ходу, поэтому всё печатается, как раньше.",
    "There is not enough room on this device for the download.": "На этом устройстве не хватает места для загрузки.",
    "The download stopped. Check your connection and try again.":
      "Загрузка прервалась. Проверьте подключение и попробуйте ещё раз.",
    "Something went wrong with listening. Typing works as before.":
      "Со слушанием что-то пошло не так. Печатать можно, как раньше.",

    // Settings.
    "Speaking is switched off on this installation, so everything is typed as before.":
      "На этой установке устная речь отключена, поэтому всё печатается, как раньше.",
    "This installation has no speech model, so everything is typed as before.":
      "На этой установке нет модели распознавания речи, поэтому всё печатается, как раньше.",
    "Speaking is new. Your Estonian is turned into text on this device and the sound never leaves it. What you see is the machine's hearing, and you can always change it before it counts.":
      "Устная речь появилась недавно. Ваша эстонская речь превращается в текст на этом устройстве, и звук никуда не уходит. То, что вы видите, услышала машина, и вы всегда можете это исправить, прежде чем ответ засчитается.",
    "Checking this device.": "Проверяю это устройство.",
    "Downloaded on this device ({mb} MB).": "Загружено на это устройство ({mb} МБ).",
    "Your browser cleared the download to save space.": "Браузер удалил загрузку, чтобы освободить место.",
    "The speech model is not on this device yet. It downloads by itself in the background, {mb} MB once.": "Модели распознавания речи на этом устройстве пока нет. Она загрузится сама в фоновом режиме, {mb} МБ один раз.",
    "Delete the download": "Удалить загрузку",
    "Microphone in answer boxes": "Микрофон в полях для ответа",
    "Show it": "Показывать",
    "Hide it": "Скрывать",
    "Once the download is on this device, a microphone sits beside every box that takes an Estonian answer.":
      "Когда загрузка есть на этом устройстве, микрофон появляется рядом с каждым полем для ответа на эстонском.",
    "The microphone stays where speaking is the task: a conversation, the speaking round and meeting a new word.":
      "Микрофон остаётся там, где задание и есть говорить: в разговоре, в раунде устной речи и при знакомстве с новым словом.",
    "When what you say matches a line": "Когда сказанное совпадает с одной из фраз",
    "Wait a moment": "Подождать немного",
    "Send it straight away": "Отправлять сразу",
    "The line you said lights up and is sent after a short ring, so you can stop it if it was misheard.":
      "Сказанная фраза подсвечивается и отправляется после короткого отсчёта по кругу, так что её можно остановить, если её услышали неверно.",
    "The line you said is sent as soon as it is heard.": "Сказанная фраза отправляется, как только её услышат.",
    "Start or stop the microphone, or hold it to talk": "Включить или выключить микрофон, или держать, чтобы говорить",
  },
  uk: {
    // The microphone.
    "Say it along": "Сказати разом",
    "Stop listening": "Перестати слухати",
    "Getting ready to listen": "Готуюся слухати",
    "Reading what you said": "Розбираю, що ви сказали",
    "Listening. Press again when you are done.": "Слухаю. Натисніть ще раз, коли закінчите.",
    "That is very loud. Hold the microphone a little further away.":
      "Дуже гучно. Тримайте мікрофон трохи далі.",
    "Heard: {text}": "Почуто: {text}",
    "Nothing was heard.": "Нічого не почуто.",
    "Every word was understood.": "Зрозуміло кожне слово.",
    "{n} of {total} words were understood.": "Зрозуміло слів: {n} з {total}.",

    // You, then them (CompareVoices): the sound is checked by ear.
    "Hear yourself, then them": "Послухати себе, потім їх",
    "Your voice": "Ваш голос",
    "Native voice": "Голос носія",
    "The app checks the words. Your ear checks the sound.": "Застосунок перевіряє слова. Звучання перевіряє ваш слух.",
    "Playing your recording.": "Звучить ваш запис.",
    "Playing the native recording.": "Звучить запис носія мови.",
    "We heard {heard} for {word}.": "Ми почули {heard} замість {word}.",

    // The download.
    "Download for speaking": "Завантаження для усного мовлення",
    "Download {mb} MB": "Завантажити {mb} МБ",
    "Downloading {done} of {total} MB": "Завантажено {done} з {total} МБ",
    "Starting the download": "Починаю завантаження",
    "Speaking is new. It needs a one-time download of {mb} MB, which stays on this device, so hearing works offline and nothing you say ever leaves it.":
      "Усне мовлення з'явилося нещодавно. Для нього потрібне одноразове завантаження {mb} МБ. Воно лишається на цьому пристрої, тож розпізнавання працює без мережі, а сказане вами нікуди не йде.",
    "What you see is the machine's hearing. You can always change it before it counts.":
      "Те, що ви бачите, почула машина. Ви завжди можете це виправити, перш ніж відповідь зарахують.",
    "You seem to be on mobile data, so you might want to wait for Wi-Fi.":
      "Схоже, ви під'єднані через мобільний інтернет. Можливо, краще дочекатися Wi-Fi.",
    "Your browser cleared the speaking download to save space. Getting it back is {mb} MB, once.":
      "Браузер видалив завантаження для усного мовлення, щоб звільнити місце. Повернути його можна одним завантаженням {mb} МБ.",

    // What went wrong, each with the typed way on.
    "No microphone was found. Typing works as before.": "Мікрофон не знайдено. Друкувати можна, як раніше.",
    "The microphone is blocked for this site. You can allow it in your browser's site settings, or keep typing.":
      "Мікрофон для цього сайту заблоковано. Його можна дозволити в налаштуваннях сайту в браузері або далі друкувати.",
    "Speaking needs its download first.": "Спершу потрібне завантаження для усного мовлення.",
    "Your browser cleared the speaking download. Press the microphone to get it back.":
      "Браузер видалив завантаження для усного мовлення. Натисніть на мікрофон, щоб повернути його.",
    "The download did not check out, so it was not used. Try it again.":
      "Завантаження не пройшло перевірку, тому воно не використовується. Спробуйте ще раз.",
    "This device is too slow to hear speech as you say it, so typing stays as it was.":
      "Цей пристрій надто повільний, щоб розпізнавати мовлення на ходу, тому все друкується, як раніше.",
    "There is not enough room on this device for the download.": "На цьому пристрої не вистачає місця для завантаження.",
    "The download stopped. Check your connection and try again.":
      "Завантаження перервалося. Перевірте з'єднання і спробуйте ще раз.",
    "Something went wrong with listening. Typing works as before.":
      "Зі слуханням щось пішло не так. Друкувати можна, як раніше.",

    // Settings.
    "Speaking is switched off on this installation, so everything is typed as before.":
      "На цій установці усне мовлення вимкнено, тому все друкується, як раніше.",
    "This installation has no speech model, so everything is typed as before.":
      "На цій установці немає моделі розпізнавання мовлення, тому все друкується, як раніше.",
    "Speaking is new. Your Estonian is turned into text on this device and the sound never leaves it. What you see is the machine's hearing, and you can always change it before it counts.":
      "Усне мовлення з'явилося нещодавно. Ваше естонське мовлення перетворюється на текст на цьому пристрої, і звук нікуди не йде. Те, що ви бачите, почула машина, і ви завжди можете це виправити, перш ніж відповідь зарахують.",
    "Checking this device.": "Перевіряю цей пристрій.",
    "Downloaded on this device ({mb} MB).": "Завантажено на цей пристрій ({mb} МБ).",
    "Your browser cleared the download to save space.": "Браузер видалив завантаження, щоб звільнити місце.",
    "The speech model is not on this device yet. It downloads by itself in the background, {mb} MB once.": "Моделі розпізнавання мовлення на цьому пристрої поки немає. Вона завантажиться сама у фоновому режимі, {mb} МБ один раз.",
    "Delete the download": "Видалити завантаження",
    "Microphone in answer boxes": "Мікрофон у полях для відповіді",
    "Show it": "Показувати",
    "Hide it": "Приховувати",
    "Once the download is on this device, a microphone sits beside every box that takes an Estonian answer.":
      "Коли завантаження є на цьому пристрої, мікрофон з'являється біля кожного поля для відповіді естонською.",
    "The microphone stays where speaking is the task: a conversation, the speaking round and meeting a new word.":
      "Мікрофон лишається там, де завдання і є говорити: у розмові, у раунді усного мовлення і під час знайомства з новим словом.",
    "When what you say matches a line": "Коли сказане збігається з однією з фраз",
    "Wait a moment": "Зачекати трохи",
    "Send it straight away": "Надсилати одразу",
    "The line you said lights up and is sent after a short ring, so you can stop it if it was misheard.":
      "Сказана фраза підсвічується і надсилається після короткого відліку по колу, тож її можна зупинити, якщо її почули неправильно.",
    "The line you said is sent as soon as it is heard.": "Сказана фраза надсилається, щойно її почують.",
    "Start or stop the microphone, or hold it to talk": "Увімкнути або вимкнути мікрофон, або тримати, щоб говорити",
  },
};
