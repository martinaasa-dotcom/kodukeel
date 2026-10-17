import type { Area } from "../area";

/**
 * Recordings and things: a voice message opened on the reading page, and the
 * things around the learner named through the scanner (docs/41-fifth-batch.md,
 * VB-12 and VB-13). Machine-written, as every area is, and marked so on the
 * language choice. Keyed on the English each line translates; see
 * `lib/copy/locale.ts`. No Estonian in here (ADR-005).
 *
 * "Heard" is the verb throughout, in all three languages: a transcript is what
 * the machine heard, never a judgment of how anybody spoke (section 3).
 */
export const RECORDINGS: Area = {
  ru: {
    // The reading page: opening a recording.
    "Or open a recording": "Или откройте запись",
    "A voice message from a landlord, a colleague or your child's teacher, up to {minutes} minutes. It's heard on this device, and the sound never leaves it.":
      "Голосовое сообщение от арендодателя, коллеги или учителя вашего ребёнка, до {minutes} минут. Оно распознаётся на этом устройстве, и звук никуда с него не уходит.",
    "Choose a recording": "Выбрать запись",
    "or drop one onto this page": "или перетащите её на эту страницу",
    "Drop the recording to hear it": "Отпустите запись, чтобы её распознать",
    "Safari opens Ogg voice messages only partly. MP3 and M4A always open.":
      "Safari открывает голосовые сообщения в формате Ogg лишь частично. MP3 и M4A открываются всегда.",
    "This device is too slow to hear a recording, so pasting the text is the way in here.":
      "Это устройство слишком медленное, чтобы распознать запись, поэтому здесь можно только вставить текст.",
    "Hearing a recording needs a one-time download of {mb} MB. It stays on this device, so nothing you open is ever sent anywhere.":
      "Чтобы распознать запись, нужна разовая загрузка {mb} МБ. Она остаётся на этом устройстве, поэтому ничего из того, что вы открываете, никуда не отправляется.",

    // Hearing it.
    "Opening the recording": "Открываю запись",
    "Hearing it on this device: {done} of {total} pieces": "Распознаю на этом устройстве: {done} из {total} частей",
    "Looking the words up": "Ищу слова в словаре",
    "A long message can take a minute on a phone. Stop, and you'll read what was heard so far.":
      "Длинное сообщение на телефоне может занять минуту. Остановите, и вы прочитаете то, что уже услышано.",
    "Stop here": "Остановить здесь",

    // What went wrong.
    "That isn't a sound file. A voice message saved as MP3, M4A, Ogg or WAV works.":
      "Это не звуковой файл. Подойдёт голосовое сообщение, сохранённое как MP3, M4A, Ogg или WAV.",
    "That file is far larger than a voice message, so it wasn't opened.":
      "Этот файл гораздо больше голосового сообщения, поэтому он не был открыт.",
    "That file couldn't be opened as sound. A voice message saved as MP3, M4A, Ogg or WAV works.":
      "Этот файл не удалось открыть как звук. Подойдёт голосовое сообщение, сохранённое как MP3, M4A, Ogg или WAV.",
    "This browser couldn't open an Ogg voice message. Safari opens them only partly: open this page in Chrome or Firefox, or save the message as MP3 or M4A.":
      "Этот браузер не смог открыть голосовое сообщение в формате Ogg. Safari открывает их лишь частично: откройте эту страницу в Chrome или Firefox или сохраните сообщение как MP3 или M4A.",
    "This device is too slow to hear a recording, so it wasn't opened. Pasting the text still works.":
      "Это устройство слишком медленное, чтобы распознать запись, поэтому она не была открыта. Вставить текст по-прежнему можно.",
    "The recording couldn't be heard just now. Try it again.": "Сейчас не удалось распознать запись. Попробуйте ещё раз.",
    "You stopped it before any words were heard.": "Вы остановили распознавание до того, как прозвучали слова.",
    "No words were heard in that recording. It may be music, or very quiet.":
      "В этой записи не услышано ни одного слова. Возможно, это музыка или запись очень тихая.",

    // The transcript.
    "This is what the machine heard. Words with a wavy underline are the ones it was least sure of. In a quiet room it gets about one word in {n} wrong, and more with music or talk behind it.":
      "Это то, что услышала машина. Слова с волнистым подчёркиванием она расслышала хуже всего. В тихой комнате она ошибается примерно в одном слове из {n}, а если на фоне музыка или разговор, то чаще.",
    "What was heard in {name}": "Что услышано в {name}",
    "Hear it all as it was": "Прослушать целиком, как есть",
    "Play from {at}, at your pace": "Воспроизвести с {at} в вашем темпе",
    "Play from {at}, slowly": "Воспроизвести с {at} медленно",
    "heard least surely": "расслышано неуверенно",
    "Only the first {minutes} minutes were heard, which is as long as a recording can be here.":
      "Распознаны только первые {minutes} минуты: длиннее запись здесь быть не может.",
    "You stopped it partway, so this is the beginning of the recording.":
      "Вы остановили распознавание на полпути, поэтому здесь начало записи.",
    "The dictionary needs a connection, so the words aren't underlined yet.":
      "Словарю нужно подключение, поэтому слова пока не подчёркнуты.",
    "Look the words up": "Найти слова в словаре",
    "The sound stayed on this device. Only the words went to the dictionary, and nothing was kept.":
      "Звук остался на этом устройстве. В словарь ушли только слова, и ничего не сохранено.",
    "Open another recording": "Открыть другую запись",

    // The scanner: things around me.
    "What to photograph": "Что сфотографировать",
    "A page of words": "Страницу со словами",
    "Things around me": "Вещи вокруг меня",
    "Photograph your kitchen, your desk or the street outside, and get the Estonian for what's in it. The things are named in English, and every Estonian word comes from the dictionary.":
      "Сфотографируйте свою кухню, стол или улицу за окном и узнайте, как всё это называется по-эстонски. Вещи называются по-английски, а каждое эстонское слово берётся из словаря.",
    "Use the webcam": "Использовать веб-камеру",
    "Up to {n} things a photo. The photo is made smaller on your device before it's sent, and it's never saved anywhere.":
      "До {n} вещей на одном фото. Перед отправкой фото уменьшается на вашем устройстве и нигде не сохраняется.",
    "You can also drop a picture onto this page.": "Можно также перетащить картинку на эту страницу.",
    "Drop the picture to look at it": "Отпустите картинку, чтобы её рассмотреть",
    "Looking at the photo": "Рассматриваю фото",
    "Naming the things in a photo needs a connection.": "Чтобы назвать вещи на фото, нужно подключение.",
    "Review still works offline, and so does everything already in your deck.":
      "Повторение работает и без сети, как и всё, что уже есть в вашей колоде.",
    "That isn't a picture. A photo from a camera or a phone works.":
      "Это не картинка. Подойдёт фото с камеры или телефона.",
    "That picture couldn't be opened. Try another one.": "Эту картинку не удалось открыть. Попробуйте другую.",
    "We couldn't make out any things in that photo. Try more light, and fewer things at once.":
      "На этом фото не удалось разобрать ни одной вещи. Попробуйте больше света и меньше вещей за раз.",
    "We saw the photo, but couldn't look its words up just now. Try it again in a moment.":
      "Фото мы рассмотрели, но сейчас не удалось найти слова в словаре. Попробуйте ещё раз чуть позже.",
    "Things from {date}": "Вещи от {date}",
    "{n} things seen, {found} found in the dictionary.": "Увидено вещей: {n}, найдено в словаре: {found}.",
    "Named in English by {model}. Every Estonian word here is the dictionary's own.":
      "Названо по-английски моделью {model}. Каждое эстонское слово здесь взято из словаря.",
    "Not in the dictionary, so nothing is offered for it.": "Этого нет в словаре, поэтому ничего не предлагается.",
    "Other words for {thing}": "Другие слова для «{thing}»",
    "{thing} can also be:": "«{thing}» может быть ещё и так:",
    "Use {word}, {meaning}": "Выбрать {word}, {meaning}",
    "Say them": "Сказать их вслух",
    "Say them once, in this order. Nothing is marked: it's just the first time you say them.":
      "Скажите их один раз, в этом порядке. Ничего не оценивается: вы просто произносите их впервые.",
    "Another photo": "Другое фото",

    // The webcam.
    "What your camera sees": "Что видит ваша камера",
    "Starting the camera": "Включаю камеру",
    "The camera is blocked for this site. You can allow it in your browser's site settings, or choose a picture instead.":
      "Камера для этого сайта заблокирована. Её можно разрешить в настройках сайта в браузере или вместо этого выбрать картинку.",
    "No camera was found. You can choose a picture instead.": "Камера не найдена. Вместо этого можно выбрать картинку.",
    "Take the photo": "Сделать фото",
  },
  uk: {
    "Or open a recording": "Або відкрийте запис",
    "A voice message from a landlord, a colleague or your child's teacher, up to {minutes} minutes. It's heard on this device, and the sound never leaves it.":
      "Голосове повідомлення від орендодавця, колеги чи вчителя вашої дитини, до {minutes} хвилин. Воно розпізнається на цьому пристрої, і звук нікуди з нього не йде.",
    "Choose a recording": "Вибрати запис",
    "or drop one onto this page": "або перетягніть його на цю сторінку",
    "Drop the recording to hear it": "Відпустіть запис, щоб його розпізнати",
    "Safari opens Ogg voice messages only partly. MP3 and M4A always open.":
      "Safari відкриває голосові повідомлення у форматі Ogg лише частково. MP3 і M4A відкриваються завжди.",
    "This device is too slow to hear a recording, so pasting the text is the way in here.":
      "Цей пристрій надто повільний, щоб розпізнати запис, тому тут можна лише вставити текст.",
    "Hearing a recording needs a one-time download of {mb} MB. It stays on this device, so nothing you open is ever sent anywhere.":
      "Щоб розпізнати запис, потрібне одноразове завантаження {mb} МБ. Воно залишається на цьому пристрої, тому ніщо з того, що ви відкриваєте, нікуди не надсилається.",

    "Opening the recording": "Відкриваю запис",
    "Hearing it on this device: {done} of {total} pieces": "Розпізнаю на цьому пристрої: {done} з {total} частин",
    "Looking the words up": "Шукаю слова в словнику",
    "A long message can take a minute on a phone. Stop, and you'll read what was heard so far.":
      "Довге повідомлення на телефоні може забрати хвилину. Зупиніть, і ви прочитаєте те, що вже почуто.",
    "Stop here": "Зупинити тут",

    "That isn't a sound file. A voice message saved as MP3, M4A, Ogg or WAV works.":
      "Це не звуковий файл. Підійде голосове повідомлення, збережене як MP3, M4A, Ogg або WAV.",
    "That file is far larger than a voice message, so it wasn't opened.":
      "Цей файл набагато більший за голосове повідомлення, тому його не відкрито.",
    "That file couldn't be opened as sound. A voice message saved as MP3, M4A, Ogg or WAV works.":
      "Цей файл не вдалося відкрити як звук. Підійде голосове повідомлення, збережене як MP3, M4A, Ogg або WAV.",
    "This browser couldn't open an Ogg voice message. Safari opens them only partly: open this page in Chrome or Firefox, or save the message as MP3 or M4A.":
      "Цей браузер не зміг відкрити голосове повідомлення у форматі Ogg. Safari відкриває їх лише частково: відкрийте цю сторінку в Chrome або Firefox чи збережіть повідомлення як MP3 або M4A.",
    "This device is too slow to hear a recording, so it wasn't opened. Pasting the text still works.":
      "Цей пристрій надто повільний, щоб розпізнати запис, тому його не відкрито. Вставити текст, як і раніше, можна.",
    "The recording couldn't be heard just now. Try it again.": "Зараз не вдалося розпізнати запис. Спробуйте ще раз.",
    "You stopped it before any words were heard.": "Ви зупинили розпізнавання до того, як прозвучали слова.",
    "No words were heard in that recording. It may be music, or very quiet.":
      "У цьому записі не почуто жодного слова. Можливо, це музика або запис дуже тихий.",

    "This is what the machine heard. Words with a wavy underline are the ones it was least sure of. In a quiet room it gets about one word in {n} wrong, and more with music or talk behind it.":
      "Це те, що почула машина. Слова з хвилястим підкресленням вона розчула найгірше. У тихій кімнаті вона помиляється приблизно в одному слові з {n}, а якщо на тлі музика чи розмова, то частіше.",
    "What was heard in {name}": "Що почуто в {name}",
    "Hear it all as it was": "Прослухати повністю, як є",
    "Play from {at}, at your pace": "Відтворити з {at} у вашому темпі",
    "Play from {at}, slowly": "Відтворити з {at} повільно",
    "heard least surely": "розчуто непевно",
    "Only the first {minutes} minutes were heard, which is as long as a recording can be here.":
      "Розпізнано лише перші {minutes} хвилини: довшим запис тут бути не може.",
    "You stopped it partway, so this is the beginning of the recording.":
      "Ви зупинили розпізнавання на півдорозі, тому тут початок запису.",
    "The dictionary needs a connection, so the words aren't underlined yet.":
      "Словнику потрібне підключення, тому слова поки не підкреслені.",
    "Look the words up": "Знайти слова в словнику",
    "The sound stayed on this device. Only the words went to the dictionary, and nothing was kept.":
      "Звук залишився на цьому пристрої. До словника пішли лише слова, і нічого не збережено.",
    "Open another recording": "Відкрити інший запис",

    "What to photograph": "Що сфотографувати",
    "A page of words": "Сторінку зі словами",
    "Things around me": "Речі навколо мене",
    "Photograph your kitchen, your desk or the street outside, and get the Estonian for what's in it. The things are named in English, and every Estonian word comes from the dictionary.":
      "Сфотографуйте свою кухню, стіл чи вулицю за вікном і дізнайтеся, як усе це називається естонською. Речі називаються англійською, а кожне естонське слово береться зі словника.",
    "Use the webcam": "Використати вебкамеру",
    "Up to {n} things a photo. The photo is made smaller on your device before it's sent, and it's never saved anywhere.":
      "До {n} речей на одному фото. Перед надсиланням фото зменшується на вашому пристрої й ніде не зберігається.",
    "You can also drop a picture onto this page.": "Можна також перетягнути картинку на цю сторінку.",
    "Drop the picture to look at it": "Відпустіть картинку, щоб її роздивитися",
    "Looking at the photo": "Роздивляюся фото",
    "Naming the things in a photo needs a connection.": "Щоб назвати речі на фото, потрібне підключення.",
    "Review still works offline, and so does everything already in your deck.":
      "Повторення працює й без мережі, як і все, що вже є у вашій колоді.",
    "That isn't a picture. A photo from a camera or a phone works.":
      "Це не картинка. Підійде фото з камери чи телефона.",
    "That picture couldn't be opened. Try another one.": "Цю картинку не вдалося відкрити. Спробуйте іншу.",
    "We couldn't make out any things in that photo. Try more light, and fewer things at once.":
      "На цьому фото не вдалося розібрати жодної речі. Спробуйте більше світла й менше речей за раз.",
    "We saw the photo, but couldn't look its words up just now. Try it again in a moment.":
      "Фото ми роздивилися, але зараз не вдалося знайти слова в словнику. Спробуйте ще раз трохи згодом.",
    "Things from {date}": "Речі від {date}",
    "{n} things seen, {found} found in the dictionary.": "Побачено речей: {n}, знайдено в словнику: {found}.",
    "Named in English by {model}. Every Estonian word here is the dictionary's own.":
      "Названо англійською моделлю {model}. Кожне естонське слово тут узято зі словника.",
    "Not in the dictionary, so nothing is offered for it.": "Цього немає в словнику, тому нічого не пропонується.",
    "Other words for {thing}": "Інші слова для «{thing}»",
    "{thing} can also be:": "«{thing}» може бути ще й так:",
    "Use {word}, {meaning}": "Вибрати {word}, {meaning}",
    "Say them": "Сказати їх уголос",
    "Say them once, in this order. Nothing is marked: it's just the first time you say them.":
      "Скажіть їх один раз, у цьому порядку. Нічого не оцінюється: ви просто вимовляєте їх уперше.",
    "Another photo": "Інше фото",

    "What your camera sees": "Що бачить ваша камера",
    "Starting the camera": "Вмикаю камеру",
    "The camera is blocked for this site. You can allow it in your browser's site settings, or choose a picture instead.":
      "Камеру для цього сайту заблоковано. Її можна дозволити в налаштуваннях сайту в браузері або натомість вибрати картинку.",
    "No camera was found. You can choose a picture instead.": "Камеру не знайдено. Натомість можна вибрати картинку.",
    "Take the photo": "Зробити фото",
  },
};
