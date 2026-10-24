import type { Area } from "../area";

/**
 * The speech figures page (/admin/speech, docs/44-sixth-batch.md C-3), read
 * by whoever runs this copy. Keyed on the English each line translates. See
 * lib/copy/locale.ts and docs/34-interface-languages.md.
 *
 * Machine translated, reviewed by no native speaker yet. No Estonian
 * (ADR-005).
 */
export const ADMIN_SPEECH: Area = {
  ru: {
    "Speech figures": "Данные о речи",
    "How speaking is used across this copy, for whoever runs it.": "Как в этой копии пользуются речью. Для того, кто ею управляет.",
    "These figures are read by whoever runs this copy.": "Эти данные читает тот, кто управляет этой копией.",
    "Nobody has been made a reviewer here yet.": "Здесь пока никто не назначен проверяющим.",
    "How speaking is used across this copy, read when this page opened. It names nobody.": "Как в этой копии пользуются речью, на момент открытия страницы. Здесь никто не назван.",
    "{share} of {heard} heard words changed, over {turns} spoken turns": "изменено {share} из {heard} услышанных слов, за {turns} устных реплик",
    "Only {turns} spoken turns so far, too few to give a share.": "Пока только {turns} устных реплик, слишком мало для доли.",
    "{share}, {recalled} of {pairs}": "{share}, {recalled} из {pairs}",
    "Only {pairs} pairs so far, too few to give a share.": "Пока только {pairs} пар, слишком мало для доли.",
    "Learners changed {share} of heard words over {turns} spoken turns, past the line of {line}% over {min} turns. Read below, and decide whether to switch speech off.":
      "Ученики изменили {share} услышанных слов за {turns} устных реплик, это выше порога {line}% за {min} реплик. Прочитайте ниже и решите, не отключить ли речь.",
    "Answers said aloud": "Ответы вслух",
    "Answers on a card given aloud": "Ответов на карточки вслух",
    "Learners who answered aloud": "Учеников, отвечавших вслух",
    "Conversation turns said aloud": "Реплик в разговорах вслух",
    "The line: {line}% over {min} turns": "Порог: {line}% за {min} реплик",
    "Heard words changed before sending": "Услышанные слова, изменённые перед отправкой",
    "No spoken conversation turn carries its counts yet, so there is nothing to read.": "Пока ни одна устная реплика не несёт своих подсчётов, так что читать нечего.",
    "Everybody": "Все",
    "At {band}": "На уровне {band}",
    "Glosses read in {language}": "Значения на языке {language}",
    "An upper bound on what the recognizer got wrong: a learner also changes their own grammar, and that counts here too.":
      "Это верхняя граница ошибок распознавания: ученик правит и свою грамматику, и это тоже здесь учитывается.",
    "Recall after a spoken answer": "Запоминание после ответа вслух",
    "Next answer to the same card recalled, after a spoken answer": "Следующий ответ на ту же карточку верный, после ответа вслух",
    "After a typed answer, from the same learners": "После набранного ответа, у тех же учеников",
    "Observational: people choose when to speak, and an easy card is likelier to be said aloud. Not a trial.":
      "Это наблюдение: люди сами выбирают, когда говорить, и лёгкую карточку чаще произносят вслух. Это не эксперимент.",
    "Today’s chat": "Сегодняшний чат",
    "Finished days that met at least {n} new words": "Завершённых дней, в которых было не меньше {n} новых слов",
    "A chat opened": "Чат открыт",
    "A chat finished": "Чат завершён",
    "The chat’s words recalled at their next review": "Слова чата верно вспомнены при следующем повторении",
    "The same days’ other words": "Другие слова тех же дней",
    "The first figure is an upper bound: this page cannot tell whether a model was configured on a given day.":
      "Первая цифра это верхняя граница: страница не знает, была ли в тот день настроена модель.",
    "Turns answered by ear": "Реплики, отвеченные на слух",
    "No spoken turn has answered a line that was only heard yet.": "Пока ни одна устная реплика не ответила на фразу, которую было только слышно.",
    "A spoken turn that answered a line the learner only heard, and did what the line asked.": "Устная реплика, ответившая на фразу, которую ученик только слышал, и сделавшая то, о чём фраза просила.",
    "Words in a spoken turn, by month": "Слов в устной реплике, по месяцам",
    "Not enough yet: this needs two months with at least {n} spoken turns each.": "Пока мало данных: нужны два месяца, в каждом не меньше {n} устных реплик.",
    "{median} words in the middle turn, over {turns} turns": "{median} слов в средней реплике, всего {turns} реплик",
    "A share over fewer than {floor} turns or pairs is not shown; the count is. The first four readings are what {command} prints.":
      "Доля по менее чем {floor} репликам или парам не показывается, показывается только число. Первые четыре показателя печатает {command}.",
  },
  uk: {
    "Speech figures": "Дані про мовлення",
    "How speaking is used across this copy, for whoever runs it.": "Як у цій копії користуються мовленням. Для того, хто нею керує.",
    "These figures are read by whoever runs this copy.": "Ці дані читає той, хто керує цією копією.",
    "Nobody has been made a reviewer here yet.": "Тут ще нікого не призначено перевіряти.",
    "How speaking is used across this copy, read when this page opened. It names nobody.": "Як у цій копії користуються мовленням, на момент відкриття сторінки. Тут нікого не названо.",
    "{share} of {heard} heard words changed, over {turns} spoken turns": "змінено {share} з {heard} почутих слів, за {turns} усних реплік",
    "Only {turns} spoken turns so far, too few to give a share.": "Поки лише {turns} усних реплік, замало для частки.",
    "{share}, {recalled} of {pairs}": "{share}, {recalled} з {pairs}",
    "Only {pairs} pairs so far, too few to give a share.": "Поки лише {pairs} пар, замало для частки.",
    "Learners changed {share} of heard words over {turns} spoken turns, past the line of {line}% over {min} turns. Read below, and decide whether to switch speech off.":
      "Учні змінили {share} почутих слів за {turns} усних реплік, це вище за поріг {line}% за {min} реплік. Прочитайте нижче й вирішіть, чи вимкнути мовлення.",
    "Answers said aloud": "Відповіді вголос",
    "Answers on a card given aloud": "Відповідей на картки вголос",
    "Learners who answered aloud": "Учнів, що відповідали вголос",
    "Conversation turns said aloud": "Реплік у розмовах вголос",
    "The line: {line}% over {min} turns": "Поріг: {line}% за {min} реплік",
    "Heard words changed before sending": "Почуті слова, змінені перед надсиланням",
    "No spoken conversation turn carries its counts yet, so there is nothing to read.": "Поки жодна усна репліка не має своїх підрахунків, тож читати нічого.",
    "Everybody": "Усі",
    "At {band}": "На рівні {band}",
    "Glosses read in {language}": "Значення мовою {language}",
    "An upper bound on what the recognizer got wrong: a learner also changes their own grammar, and that counts here too.":
      "Це верхня межа помилок розпізнавання: учень виправляє і власну граматику, і це теж тут враховується.",
    "Recall after a spoken answer": "Запам'ятовування після відповіді вголос",
    "Next answer to the same card recalled, after a spoken answer": "Наступна відповідь на ту саму картку правильна, після відповіді вголос",
    "After a typed answer, from the same learners": "Після набраної відповіді, у тих самих учнів",
    "Observational: people choose when to speak, and an easy card is likelier to be said aloud. Not a trial.":
      "Це спостереження: люди самі обирають, коли говорити, і легку картку частіше вимовляють уголос. Це не експеримент.",
    "Today’s chat": "Сьогоднішній чат",
    "Finished days that met at least {n} new words": "Завершених днів, у яких було щонайменше {n} нових слів",
    "A chat opened": "Чат відкрито",
    "A chat finished": "Чат завершено",
    "The chat’s words recalled at their next review": "Слова чату правильно згадано під час наступного повторення",
    "The same days’ other words": "Інші слова тих самих днів",
    "The first figure is an upper bound: this page cannot tell whether a model was configured on a given day.":
      "Перша цифра це верхня межа: сторінка не знає, чи була того дня налаштована модель.",
    "Turns answered by ear": "Репліки, відповідені на слух",
    "No spoken turn has answered a line that was only heard yet.": "Поки жодна усна репліка не відповіла на фразу, яку було лише чути.",
    "A spoken turn that answered a line the learner only heard, and did what the line asked.": "Усна репліка, що відповіла на фразу, яку учень лише чув, і зробила те, про що фраза просила.",
    "Words in a spoken turn, by month": "Слів в усній репліці, за місяцями",
    "Not enough yet: this needs two months with at least {n} spoken turns each.": "Поки замало даних: потрібні два місяці, у кожному щонайменше {n} усних реплік.",
    "{median} words in the middle turn, over {turns} turns": "{median} слів у середній репліці, усього {turns} реплік",
    "A share over fewer than {floor} turns or pairs is not shown; the count is. The first four readings are what {command} prints.":
      "Частка за менш ніж {floor} реплік або пар не показується, показується лише число. Перші чотири показники друкує {command}.",
  },
};
