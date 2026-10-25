import type { Area } from "../area";

/**
 * The letters, in Russian and Ukrainian: every line `lib/email/letters/` and
 * the footer in `lib/email/render.ts` write, and the two words for the way
 * out that `lib/email/unsubscribe.ts` hands over. Keyed on the English each
 * line translates. See lib/copy/locale.ts and docs/34-interface-languages.md.
 *
 * The tone is the English letters' own and each one argues for it at length
 * in its header: warm, short, never a guilt trip, never a deadline nobody set.
 * A count arrives as a value already in its right form (`lib/email/say.ts`),
 * so a template here never has to agree a verb with a number. No Estonian
 * here: the word of the day, an evening's title and a case's name all arrive
 * as values off the dictionary and the course.
 */
export const LETTERS: Area = {
  ru: {
    // Every letter is signed off.
    "Whenever you're ready,": "Когда будешь готов,",
    "Talk soon,": "До скорой встречи,",
    "We're so glad you're here,": "Мы очень рады, что ты с нами,",
    "So proud of you,": "Мы так гордимся тобой,",
    "Have a lovely week,": "Хорошей тебе недели,",
    "Rooting for you,": "Болеем за тебя,",
    "Until tomorrow,": "До завтра,",
    "With thanks,": "С благодарностью,",
    // The footer every letter carries, and the way out.
    "Kodukeel, run by {operator}.": "Kodukeel. Работу сервиса обеспечивает {operator}.",
    "Stop emails like this one": "Отписаться от таких писем",
    "Choose which emails you get": "Выбрать, какие письма получать",
    "What we keep about you": "Какие данные о тебе мы храним",

    // The evening nudge.
    "Just one step left in {title}": "В занятии {title} остался всего один шаг",
    "{steps} left in {title}": "В занятии {title} ещё {steps}",
    "{what}, part {n} of {of}": "{what}, часть {n} из {of}",
    "{shape}. Only about {minutes} minutes left, whenever it suits you.": "{shape}. Осталось всего около {minutes} мин., когда тебе удобно.",
    "{shape}. About {minutes} minutes, whenever it suits you.": "{shape}. Около {minutes} мин., когда тебе удобно.",
    "You're so close to finishing today.": "Ты почти закончил на сегодня.",
    "Only about {minutes} minutes to go.": "Осталось всего около {minutes} мин.",
    "{name}, you've already done {steps} of {where}. The rest is waiting right where you left it.":
      "{name}, у тебя позади уже {steps} в занятии {where}. Остальное ждёт тебя на том же месте.",
    "You've already done {steps} of {where}. The rest is waiting right where you left it.":
      "У тебя позади уже {steps} в занятии {where}. Остальное ждёт тебя на том же месте.",
    "{newWords}, in about {minutes} minutes.": "{newWords}, примерно за {minutes} мин.",
    "{name}, today's module is {title}, {evening}. By the end you'll be able to {canDo}":
      "{name}, сегодня занятие {title}, {evening}. К концу ты сможешь {canDo}",
    "Today's module is {title}, {evening}. By the end you'll be able to {canDo}":
      "Сегодня занятие {title}, {evening}. К концу ты сможешь {canDo}",
    "In your own words, when you started:": "Твои собственные слова, когда ты начинал:",
    "[done]": "[готово]",
    "And a little word for today, whether you study or not:":
      "И маленькое слово на сегодня, будешь ты заниматься или нет:",
    "That's {days} in a row so far.": "Уже {days} подряд.",

    // The first letter.
    "Kodukeel. The four letters an English keyboard has no key for: o-tilde, a-umlaut, o-umlaut, u-umlaut.":
      "Kodukeel. Четыре буквы, для которых нет клавиш на обычной клавиатуре: o с тильдой, a, o и u с умлаутом.",
    "Welcome. Your first cards are ready.": "Добро пожаловать. Твои первые карточки готовы.",
    "We've made you {cards} from the first lessons of your course. Your first module is “{title}”, which is {subtitle}.":
      "В твоей колоде уже {cards} из первых уроков курса. Твоё первое занятие: «{title}», {subtitle}.",
    "We've made you {cards} from the first lessons of your course. Open the course and it'll show you where to begin.":
      "В твоей колоде уже {cards} из первых уроков курса. Открой курс, и он покажет, с чего начать.",
    "A progress bar, right at the start.": "Полоса прогресса, в самом начале.",
    "Fifteen minutes a day.": "Пятнадцать минут в день.",
    "Each day's module is a short reading, two quick exercises and a few cards to go over. It takes about a quarter of an hour at any level, and the app tells you when you're done.":
      "Каждое занятие: короткое чтение, два быстрых упражнения и несколько карточек на повторение. На любом уровне это около четверти часа, и приложение подскажет, когда ты закончишь.",
    "You picked {time}. Add it to your calendar and your phone will gently remind you, which works far better than an email from us.":
      "Ты выбрал {time}. Добавь это время в календарь, и телефон напомнит сам: это работает куда лучше, чем письмо от нас.",
    "Add the daily reminder to your calendar": "Добавить ежедневное напоминание в календарь",
    "Pick a time that already has a gap in it: after dinner, on the train, before bed. Which hour you choose matters much less than keeping it the same every day.":
      "Выбери время, когда у тебя и так бывает свободная минута: после ужина, в поезде, перед сном. Сам час важен куда меньше, чем то, чтобы он каждый день был одним и тем же.",
    "Start your first module": "Начать первое занятие",
    "What we'll send you: a gentle nudge on days you haven't studied yet, a look back at your week on Sundays, and now and then a note when there's real news, like finishing a level. The link at the bottom of any of them turns them off, and the course works just the same without them.":
      "Что мы будем присылать: мягкое напоминание в дни, когда ты ещё не занимался, взгляд на твою неделю по воскресеньям и иногда письмо, когда есть настоящая новость, например пройденный уровень. Ссылка внизу любого письма отключает их, а курс работает точно так же и без них.",
    "Welcome to Kodukeel": "Добро пожаловать в Kodukeel",
    "{cards} are ready for you, and your first module is {subtitle}.": "В колоде уже {cards}, а первое занятие: {subtitle}.",
    "{cards} are ready for you, and your first module takes about fifteen minutes.":
      "В колоде уже {cards}, а первое занятие займёт около пятнадцати минут.",

    // Coming back after a while away.
    "Your Estonian waited for you.": "Твой эстонский тебя дождался.",
    "You still know {words}. The words you've learned stay safe while you're away, so you can pick up exactly where you stopped.":
      "Ты по-прежнему знаешь {words}. Выученные слова никуда не деваются, пока тебя нет, так что ты продолжишь ровно с того места, где остановился.",
    "A shield you'd saved up covered the days off, so your {run} run is still going.":
      "Перерыв прикрыл твой запасной щит, так что серия ({run} подряд) продолжается.",
    "There's nothing to make up for. If you'd like a gentle way back in, one short round takes about {minutes} minutes.":
      "Наверстывать ничего не нужно. Если хочется мягко вернуться, один короткий раунд займёт около {minutes} мин.",
    "Or open today's module": "Или открыть занятие на сегодня",
    "And a little word for today, whatever you decide:": "И маленькое слово на сегодня, что бы ты ни решил:",
    "Your Estonian is still here": "Твой эстонский никуда не делся",
    "You still know {words}, and a two-minute round is all it takes to say hello again.":
      "Ты по-прежнему знаешь {words}, и чтобы снова поздороваться, хватит двухминутного раунда.",
    "Play a two-minute word-matching game": "Сыграть в подбор пар на две минуты",

    // A shield spent.
    "A shield kept your run going.": "Щит сохранил твою серию.",
    "You had a day off yesterday, so one of the shields you'd earned quietly stepped in. Your run of {days} is still going.":
      "Вчера ты отдыхал, и один из заработанных щитов тихо пришёл на помощь. Твоя серия, {days} подряд, продолжается.",
    "studied": "занятие",
    "day off": "выходной",
    "You've got {more} more saved up.": "В запасе ещё {more}.",
    "That was your last one. You'll earn another when you reach {nextAt} days.":
      "Это был последний. Следующий получишь на {nextAt}-й день серии.",
    "That was your last one.": "Это был последний.",
    "Rest days are part of learning a language. Your words will be right where you left them.":
      "Дни отдыха тоже часть изучения языка. Твои слова будут ждать там, где ты их оставил.",
    "Open today's module": "Открыть занятие на сегодня",
    "A shield kept your run going": "Щит сохранил твою серию",
    "Your run of {days} is still going, and you've got {more} saved.":
      "Серия, {days} подряд, продолжается, и в запасе ещё {more}.",
    "Your run of {days} is still going, and that was your last shield.":
      "Серия, {days} подряд, продолжается, но это был последний щит.",

    // A level passed.
    "You've made it through {level}.": "Уровень {level} пройден.",
    "That's {words} that are truly yours now. Each one came back days after you first met it, and you still knew it. This letter comes a little after the hard work, because that's how long it takes to be sure.":
      "Теперь по-настоящему твои уже {words}. Каждое вернулось через несколько дней после знакомства, и ты его всё ещё помнил. Это письмо приходит немного позже самой работы, потому что именно столько времени нужно, чтобы быть уверенными.",
    "About {pct} percent of the way to {target}.": "Пройдено около {pct}% пути до {target}.",
    "Next stop is {level}, about {words} away.": "Следующая остановка: {level}, до неё осталось примерно {words}.",
    "That was the level you set out to reach. The course keeps going if you want more.":
      "Это и был твой целевой уровень. Если хочешь большего, курс продолжается.",
    "Continue the course": "Продолжить курс",
    "You've made it through {level}": "Уровень {level} пройден",
    "{words} that are truly yours now, and the next level is already in sight.": "{words}, и все они теперь по-настоящему твои, а следующий уровень уже виден.",

    // The Sunday look back.
    "A quiet week.": "Тихая неделя.",
    "You studied on {n} of the last seven days.": "Занятия были в {n} из последних семи дней.",
    "You answered {cards}. {words} are properly yours now, and that number only grows when a word comes back days later and you still know it.":
      "За неделю позади {cards}. По-настоящему твоих уже {words}, и это число растёт, только когда слово возвращается через несколько дней, а ты его всё ещё помнишь.",
    "No cards this week. Nothing piles up while you're away, and one short session puts you right back where you were.":
      "На этой неделе карточек не было. Пока тебя нет, ничего не копится, а одно короткое занятие возвращает тебя туда, где ты был.",
    "And one conversation in Estonian with a real person.":
      "А ещё один разговор на эстонском с живым человеком.",
    "And {conversations} in Estonian with real people.":
      "А ещё {conversations} на эстонском с живыми людьми.",
    "On your way to {target}": "На пути к {target}",
    "About {assumed} of those words count because of the level you started at, and haven't been checked yet. The rest are words you still knew days after you first met them.":
      "Примерно {assumed} из этих слов засчитаны по стартовому уровню и ещё не проверены. Остальные остались в памяти и через несколько дней после первой встречи.",
    "That bar only moves for words you still know days after you first met them. Just opening the app won't nudge it.":
      "Эта полоса растёт только за слова, которые ты помнишь через несколько дней после первой встречи. Просто открыть приложение ничего не даст.",
    "One evening left in “{title}”.": "В части «{title}» остался один вечер.",
    "{evenings} left in “{title}”.": "В части «{title}» ещё {evenings}.",
    "Continue with the course": "Продолжить курс",
    "See all your progress": "Посмотреть весь прогресс",
    "A quiet week, and the course is right where you left it": "Тихая неделя, а курс ждёт тебя на том же месте",
    "{days} of Estonian this week": "{days} с эстонским на этой неделе",
    "Nothing to catch up on. One short session and you're back in.": "Догонять нечего. Одно короткое занятие, и ты снова в деле.",
    "{cards} answered, and {words} that are properly yours.": "{cards} за неделю и {words}, которые по-настоящему твои.",

    // One thing to say out loud.
    "One thing to say out loud today.": "Одна фраза, которую сегодня стоит сказать вслух.",
    "{places}. Nobody there will know it's practice.": "{places}. Никто там не догадается, что это тренировка.",
    "Want a practice run first? “{title}” takes about two minutes, with somebody who wants something from you.":
      "Хочешь сначала прорепетировать? «{title}»: около двух минут с собеседником, которому от тебя что-то нужно.",
    "Practice it first": "Сначала прорепетировать",
    "Or just have a look at the words in “{unit}”": "Или просто посмотреть слова из раздела «{unit}»",
    "Have a look at the words first": "Сначала посмотреть слова",
    "If they answer in English, that still counts. So does running out of words halfway. The only thing that doesn't count is staying quiet.":
      "Если тебе ответят по-английски, это всё равно засчитывается. И если слова закончатся на полпути, тоже. Не засчитывается только молчание.",
    "Tomorrow morning the app will ask whether you spoke any Estonian to anyone. If you didn't, say no; that's counted too.":
      "Завтра утром приложение спросит, удалось ли тебе с кем-нибудь поговорить по-эстонски. Если нет, так и скажи: это тоже учитывается.",
    "A word you might want for this one.": "Слово, которое может пригодиться.",
    "One thing to say out loud today": "Одна фраза, которую сегодня стоит сказать вслух",
    "{places}. Just one sentence, and an answer in English still counts.":
      "{places}. Всего одна фраза, и ответ по-английски тоже засчитывается.",

    // The date somebody set.
    "{phrase} to go until the date you picked.": "До выбранной тобой даты осталось: {phrase}.",
    "You're aiming for {band}, the level where you can {label}.":
      "Ты идёшь к уровню {band}, на котором можно {label}.",
    "A bar, about {pct} percent full, for your chances at {band}.": "Полоса заполнена примерно на {pct}%: твои шансы на {band}.",
    "If you sat it today, we'd put your chances of passing at about {pct} percent. {evidence}":
      "Если сдавать сегодня, мы оценили бы твои шансы сдать примерно в {pct}%. {evidence}",
    "Three things can change that, and any one of them counts: how often you study, the Estonian you already hear outside this app, and the date itself. You picked the date in about ninety seconds, before you knew what any of this would take.":
      "Изменить это могут три вещи, и подойдёт любая: как часто ты занимаешься, эстонский, который ты и так слышишь вне приложения, и сама дата. На выбор даты ушло секунд девяносто, ещё до того, как стало понятно, чего всё это потребует.",
    "See your plan": "Посмотреть план",
    "{phrase} to go until the date you picked": "До выбранной тобой даты осталось: {phrase}",
    "At the pace you're going, {band} still fits.": "В нынешнем темпе ты успеваешь к {band}.",
    "How {band} is looking, and three things that could change it.":
      "Как обстоят дела с уровнем {band} и три вещи, которые могут это изменить.",

    // A group's week, to whoever runs it.
    "Last week in {group}": "Прошлая неделя в группе «{group}»",
    "{active} of {members} practiced, with {answers} between them.": "Занимались {active} из {members}, всего {answers}.",
    "{quiet} didn't open the app.": "Не открывали приложение: {quiet}.",
    "somebody studied": "кто-то занимался",
    "nobody studied": "никто не занимался",
    "The class finds {case} hardest.": "Труднее всего группе даётся падеж {case}.",
    "{accuracy} percent right, across {total} answers from the whole class. That's the one to give them extra practice on this week.":
      "Верных ответов {accuracy}%, а всего ответов от группы: {total}. Именно этому падежу стоит уделить больше практики на этой неделе.",
    "{case} at {accuracy} percent": "{case} ({accuracy}%)",
    "After that comes {first}, and {second}.": "Следом идут {first} и {second}.",
    "After that comes {first}.": "Следом идёт {first}.",
    "Not enough answers yet to say which case the class finds hardest. Give it another week.":
      "Ответов пока мало, чтобы сказать, какой падеж группе труднее всего. Подожди ещё неделю.",
    "{onTrack} on track for {level}.": "Идут по плану к уровню {level}: {onTrack}.",
    "{ready} of {members} on track or close for {level}.": "{ready} из {members} идут по плану к уровню {level} или близки к этому.",
    "{close} close, {needTime} need more time, {tooEarly} too early to say.":
      "Близки к цели: {close}, нужно больше времени: {needTime}, пока рано судить: {tooEarly}.",
    "{close} close, {needTime} need more time.": "Близки к цели: {close}, нужно больше времени: {needTime}.",
    "Open the group's board": "Открыть страницу группы",
    "Everybody in {group} practiced last week": "На прошлой неделе в группе «{group}» занимались все",
    "{active} of {members} in {group} practiced last week": "На прошлой неделе в группе «{group}» занимались {active} из {members}",
    "How the week went, and which case to work on next.": "Как прошла неделя и над каким падежом поработать дальше.",
    "How the week went, and how the group is doing toward {level}.": "Как прошла неделя и как группа продвигается к уровню {level}.",

    // A word a day.
    "See {word} in the dictionary": "Открыть {word} в словаре",
    "One little word for your day, and nothing else to do.": "Одно маленькое слово на сегодня, и больше ничего делать не нужно.",
    "{newWords} for today":
      "Сегодня {newWords}",
    "{title} is ready for you":
      "Занятие {title} ждёт тебя",
    "Today you'll use words you already know, in about {minutes} minutes.":
      "Сегодня ты будешь использовать уже знакомые слова, примерно за {minutes} мин.",
    "Start today's module":
      "Начать занятие",
  },
  uk: {
    // Every letter is signed off.
    "Whenever you're ready,": "Коли будеш готовий,",
    "Talk soon,": "До зустрічі,",
    "We're so glad you're here,": "Ми дуже раді, що ти з нами,",
    "So proud of you,": "Ми так пишаємося тобою,",
    "Have a lovely week,": "Гарного тобі тижня,",
    "Rooting for you,": "Вболіваємо за тебе,",
    "Until tomorrow,": "До завтра,",
    "With thanks,": "З вдячністю,",
    // The footer every letter carries, and the way out.
    "Kodukeel, run by {operator}.": "Kodukeel. Роботу сервісу забезпечує {operator}.",
    "Stop emails like this one": "Відписатися від таких листів",
    "Choose which emails you get": "Обрати, які листи отримувати",
    "What we keep about you": "Які дані про тебе ми зберігаємо",

    // The evening nudge.
    "Just one step left in {title}": "У занятті {title} лишився лише один крок",
    "{steps} left in {title}": "У занятті {title} ще {steps}",
    "{what}, part {n} of {of}": "{what}, частина {n} з {of}",
    "{shape}. Only about {minutes} minutes left, whenever it suits you.": "{shape}. Лишилося лише близько {minutes} хв., коли тобі зручно.",
    "{shape}. About {minutes} minutes, whenever it suits you.": "{shape}. Близько {minutes} хв., коли тобі зручно.",
    "You're so close to finishing today.": "Ти майже закінчив на сьогодні.",
    "Only about {minutes} minutes to go.": "Лишилося лише близько {minutes} хв.",
    "{name}, you've already done {steps} of {where}. The rest is waiting right where you left it.":
      "{name}, у тебе позаду вже {steps} у занятті {where}. Решта чекає на тебе там само.",
    "You've already done {steps} of {where}. The rest is waiting right where you left it.":
      "У тебе позаду вже {steps} у занятті {where}. Решта чекає на тебе там само.",
    "{newWords}, in about {minutes} minutes.": "{newWords}, приблизно за {minutes} хв.",
    "{name}, today's module is {title}, {evening}. By the end you'll be able to {canDo}":
      "{name}, сьогодні заняття {title}, {evening}. Наприкінці ти зможеш {canDo}",
    "Today's module is {title}, {evening}. By the end you'll be able to {canDo}":
      "Сьогодні заняття {title}, {evening}. Наприкінці ти зможеш {canDo}",
    "In your own words, when you started:": "Твої власні слова, коли ти починав:",
    "[done]": "[готово]",
    "And a little word for today, whether you study or not:":
      "І маленьке слово на сьогодні, займатимешся ти чи ні:",
    "That's {days} in a row so far.": "Уже {days} поспіль.",

    // The first letter.
    "Kodukeel. The four letters an English keyboard has no key for: o-tilde, a-umlaut, o-umlaut, u-umlaut.":
      "Kodukeel. Чотири літери, для яких немає клавіш на звичайній клавіатурі: o з тильдою, a, o та u з умлаутом.",
    "Welcome. Your first cards are ready.": "Ласкаво просимо. Твої перші картки готові.",
    "We've made you {cards} from the first lessons of your course. Your first module is “{title}”, which is {subtitle}.":
      "У твоїй колоді вже {cards} з перших уроків курсу. Твоє перше заняття: «{title}», {subtitle}.",
    "We've made you {cards} from the first lessons of your course. Open the course and it'll show you where to begin.":
      "У твоїй колоді вже {cards} з перших уроків курсу. Відкрий курс, і він покаже, з чого почати.",
    "A progress bar, right at the start.": "Смуга прогресу, на самому початку.",
    "Fifteen minutes a day.": "П'ятнадцять хвилин на день.",
    "Each day's module is a short reading, two quick exercises and a few cards to go over. It takes about a quarter of an hour at any level, and the app tells you when you're done.":
      "Кожне заняття: коротке читання, дві швидкі вправи та кілька карток на повторення. На будь-якому рівні це близько чверті години, і застосунок підкаже, коли ти закінчиш.",
    "You picked {time}. Add it to your calendar and your phone will gently remind you, which works far better than an email from us.":
      "Ти обрав {time}. Додай цей час до календаря, і телефон нагадає сам: це працює набагато краще, ніж лист від нас.",
    "Add the daily reminder to your calendar": "Додати щоденне нагадування до календаря",
    "Pick a time that already has a gap in it: after dinner, on the train, before bed. Which hour you choose matters much less than keeping it the same every day.":
      "Обери час, коли в тебе й так буває вільна хвилина: після вечері, у потязі, перед сном. Сама година важить набагато менше, ніж те, щоб вона щодня була та сама.",
    "Start your first module": "Почати перше заняття",
    "What we'll send you: a gentle nudge on days you haven't studied yet, a look back at your week on Sundays, and now and then a note when there's real news, like finishing a level. The link at the bottom of any of them turns them off, and the course works just the same without them.":
      "Що ми надсилатимемо: м'яке нагадування в дні, коли ти ще не займався, погляд на твій тиждень щонеділі й іноді лист, коли є справжня новина, наприклад пройдений рівень. Посилання внизу будь-якого листа вимикає їх, а курс працює так само і без них.",
    "Welcome to Kodukeel": "Ласкаво просимо до Kodukeel",
    "{cards} are ready for you, and your first module is {subtitle}.": "У колоді вже {cards}, а перше заняття: {subtitle}.",
    "{cards} are ready for you, and your first module takes about fifteen minutes.":
      "У колоді вже {cards}, а перше заняття триватиме близько п'ятнадцяти хвилин.",

    // Coming back after a while away.
    "Your Estonian waited for you.": "Твоя естонська на тебе дочекалася.",
    "You still know {words}. The words you've learned stay safe while you're away, so you can pick up exactly where you stopped.":
      "Ти й досі знаєш {words}. Вивчені слова нікуди не зникають, поки тебе немає, тож ти продовжиш саме з того місця, де зупинився.",
    "A shield you'd saved up covered the days off, so your {run} run is still going.":
      "Перерву прикрив твій запасний щит, тож серія ({run} поспіль) триває.",
    "There's nothing to make up for. If you'd like a gentle way back in, one short round takes about {minutes} minutes.":
      "Надолужувати нічого не потрібно. Якщо хочеться м'яко повернутися, один короткий раунд триватиме близько {minutes} хв.",
    "Or open today's module": "Або відкрити заняття на сьогодні",
    "And a little word for today, whatever you decide:": "І маленьке слово на сьогодні, хоч би що ти вирішив:",
    "Your Estonian is still here": "Твоя естонська нікуди не поділася",
    "You still know {words}, and a two-minute round is all it takes to say hello again.":
      "Ти й досі знаєш {words}, і щоб знову привітатися, вистачить двохвилинного раунду.",
    "Play a two-minute word-matching game": "Зіграти в добір пар на дві хвилини",

    // A shield spent.
    "A shield kept your run going.": "Щит зберіг твою серію.",
    "You had a day off yesterday, so one of the shields you'd earned quietly stepped in. Your run of {days} is still going.":
      "Учора ти відпочивав, і один із зароблених щитів тихо прийшов на допомогу. Твоя серія, {days} поспіль, триває.",
    "studied": "заняття",
    "day off": "вихідний",
    "You've got {more} more saved up.": "У запасі ще {more}.",
    "That was your last one. You'll earn another when you reach {nextAt} days.":
      "Це був останній. Наступний отримаєш на {nextAt}-й день серії.",
    "That was your last one.": "Це був останній.",
    "Rest days are part of learning a language. Your words will be right where you left them.":
      "Дні відпочинку теж частина вивчення мови. Твої слова чекатимуть там, де ти їх залишив.",
    "Open today's module": "Відкрити заняття на сьогодні",
    "A shield kept your run going": "Щит зберіг твою серію",
    "Your run of {days} is still going, and you've got {more} saved.":
      "Серія, {days} поспіль, триває, і в запасі ще {more}.",
    "Your run of {days} is still going, and that was your last shield.":
      "Серія, {days} поспіль, триває, але це був останній щит.",

    // A level passed.
    "You've made it through {level}.": "Рівень {level} пройдено.",
    "That's {words} that are truly yours now. Each one came back days after you first met it, and you still knew it. This letter comes a little after the hard work, because that's how long it takes to be sure.":
      "Тепер по-справжньому твої вже {words}. Кожне повернулося через кілька днів після знайомства, і ти його досі пам'ятав. Цей лист приходить трохи пізніше за саму роботу, бо саме стільки часу потрібно, щоб бути певними.",
    "About {pct} percent of the way to {target}.": "Пройдено близько {pct}% шляху до {target}.",
    "Next stop is {level}, about {words} away.": "Наступна зупинка: {level}, до неї лишилося приблизно {words}.",
    "That was the level you set out to reach. The course keeps going if you want more.":
      "Це й був твій цільовий рівень. Якщо хочеш більшого, курс іде далі.",
    "Continue the course": "Продовжити курс",
    "You've made it through {level}": "Рівень {level} пройдено",
    "{words} that are truly yours now, and the next level is already in sight.": "{words}, і всі вони тепер по-справжньому твої, а наступний рівень уже видно.",

    // The Sunday look back.
    "A quiet week.": "Тихий тиждень.",
    "You studied on {n} of the last seven days.": "Заняття були в {n} з останніх семи днів.",
    "You answered {cards}. {words} are properly yours now, and that number only grows when a word comes back days later and you still know it.":
      "За тиждень позаду {cards}. По-справжньому твоїх уже {words}, і це число зростає, лише коли слово повертається через кілька днів, а ти його досі пам'ятаєш.",
    "No cards this week. Nothing piles up while you're away, and one short session puts you right back where you were.":
      "Цього тижня карток не було. Поки тебе немає, нічого не накопичується, а одне коротке заняття повертає тебе туди, де ти був.",
    "And one conversation in Estonian with a real person.":
      "А ще одна розмова естонською з живою людиною.",
    "And {conversations} in Estonian with real people.":
      "А ще {conversations} естонською з живими людьми.",
    "On your way to {target}": "На шляху до {target}",
    "About {assumed} of those words count because of the level you started at, and haven't been checked yet. The rest are words you still knew days after you first met them.":
      "Приблизно {assumed} із цих слів зараховано за стартовим рівнем, і їх ще не перевірено. Решта лишилася в пам'яті й через кілька днів після першої зустрічі.",
    "That bar only moves for words you still know days after you first met them. Just opening the app won't nudge it.":
      "Ця смуга зростає лише за слова, які ти пам'ятаєш через кілька днів після першої зустрічі. Просто відкрити застосунок нічого не дасть.",
    "One evening left in “{title}”.": "У частині «{title}» лишився один вечір.",
    "{evenings} left in “{title}”.": "У частині «{title}» ще {evenings}.",
    "Continue with the course": "Продовжити курс",
    "See all your progress": "Переглянути весь прогрес",
    "A quiet week, and the course is right where you left it": "Тихий тиждень, а курс чекає на тебе на тому самому місці",
    "{days} of Estonian this week": "{days} з естонською цього тижня",
    "Nothing to catch up on. One short session and you're back in.": "Надолужувати нічого. Одне коротке заняття, і ти знову в ділі.",
    "{cards} answered, and {words} that are properly yours.": "{cards} за тиждень і {words}, які по-справжньому твої.",

    // One thing to say out loud.
    "One thing to say out loud today.": "Одна фраза, яку сьогодні варто сказати вголос.",
    "{places}. Nobody there will know it's practice.": "{places}. Ніхто там не здогадається, що це тренування.",
    "Want a practice run first? “{title}” takes about two minutes, with somebody who wants something from you.":
      "Хочеш спершу прорепетирувати? «{title}»: близько двох хвилин зі співрозмовником, якому від тебе щось потрібно.",
    "Practice it first": "Спершу прорепетирувати",
    "Or just have a look at the words in “{unit}”": "Або просто переглянути слова з розділу «{unit}»",
    "Have a look at the words first": "Спершу переглянути слова",
    "If they answer in English, that still counts. So does running out of words halfway. The only thing that doesn't count is staying quiet.":
      "Якщо тобі відповідять англійською, це все одно зараховується. І якщо слова закінчаться на півдорозі, теж. Не зараховується лише мовчання.",
    "Tomorrow morning the app will ask whether you spoke any Estonian to anyone. If you didn't, say no; that's counted too.":
      "Завтра вранці застосунок спитає, чи вдалося тобі з кимось поговорити естонською. Якщо ні, так і скажи: це теж ураховується.",
    "A word you might want for this one.": "Слово, яке може знадобитися.",
    "One thing to say out loud today": "Одна фраза, яку сьогодні варто сказати вголос",
    "{places}. Just one sentence, and an answer in English still counts.":
      "{places}. Лише одна фраза, і відповідь англійською теж зараховується.",

    // The date somebody set.
    "{phrase} to go until the date you picked.": "До обраної тобою дати лишилося: {phrase}.",
    "You're aiming for {band}, the level where you can {label}.":
      "Ти йдеш до рівня {band}, на якому можна {label}.",
    "A bar, about {pct} percent full, for your chances at {band}.": "Смуга заповнена приблизно на {pct}%: твої шанси на {band}.",
    "If you sat it today, we'd put your chances of passing at about {pct} percent. {evidence}":
      "Якби складати сьогодні, ми оцінили б твої шанси скласти приблизно в {pct}%. {evidence}",
    "Three things can change that, and any one of them counts: how often you study, the Estonian you already hear outside this app, and the date itself. You picked the date in about ninety seconds, before you knew what any of this would take.":
      "Змінити це можуть три речі, і підійде будь-яка: як часто ти займаєшся, естонська, яку ти й так чуєш поза застосунком, і сама дата. На вибір дати пішло секунд дев'яносто, ще до того, як стало зрозуміло, чого все це вимагатиме.",
    "See your plan": "Переглянути план",
    "{phrase} to go until the date you picked": "До обраної тобою дати лишилося: {phrase}",
    "At the pace you're going, {band} still fits.": "У теперішньому темпі ти встигаєш до {band}.",
    "How {band} is looking, and three things that could change it.":
      "Як справи з {band} і три речі, які можуть це змінити.",

    // A group's week, to whoever runs it.
    "Last week in {group}": "Минулий тиждень у групі «{group}»",
    "{active} of {members} practiced, with {answers} between them.": "Займалися {active} з {members}, усього {answers}.",
    "{quiet} didn't open the app.": "Не відкривали застосунок: {quiet}.",
    "somebody studied": "хтось займався",
    "nobody studied": "ніхто не займався",
    "The class finds {case} hardest.": "Найважче групі дається відмінок {case}.",
    "{accuracy} percent right, across {total} answers from the whole class. That's the one to give them extra practice on this week.":
      "Правильних відповідей {accuracy}%, а всього відповідей від групи: {total}. Саме цьому відмінку варто приділити більше практики цього тижня.",
    "{case} at {accuracy} percent": "{case} ({accuracy}%)",
    "After that comes {first}, and {second}.": "Далі йдуть {first} і {second}.",
    "After that comes {first}.": "Далі йде {first}.",
    "Not enough answers yet to say which case the class finds hardest. Give it another week.":
      "Відповідей поки замало, щоб сказати, який відмінок групі найважчий. Зачекай ще тиждень.",
    "{onTrack} on track for {level}.": "Ідуть за планом до {level}: {onTrack}.",
    "{ready} of {members} on track or close for {level}.": "{ready} з {members} ідуть за планом до {level} або близькі до цього.",
    "{close} close, {needTime} need more time, {tooEarly} too early to say.":
      "Близькі до мети: {close}, потрібно більше часу: {needTime}, поки зарано судити: {tooEarly}.",
    "{close} close, {needTime} need more time.": "Близькі до мети: {close}, потрібно більше часу: {needTime}.",
    "Open the group's board": "Відкрити сторінку групи",
    "Everybody in {group} practiced last week": "Минулого тижня в групі «{group}» займалися всі",
    "{active} of {members} in {group} practiced last week": "Минулого тижня в групі «{group}» займалися {active} з {members}",
    "How the week went, and which case to work on next.": "Як минув тиждень і над яким відмінком попрацювати далі.",
    "How the week went, and how the group is doing toward {level}.": "Як минув тиждень і як група просувається до {level}.",

    // A word a day.
    "See {word} in the dictionary": "Відкрити {word} у словнику",
    "One little word for your day, and nothing else to do.": "Одне маленьке слово на сьогодні, і більше нічого робити не треба.",
    "{newWords} for today":
      "Сьогодні {newWords}",
    "{title} is ready for you":
      "Заняття {title} чекає на тебе",
    "Today you'll use words you already know, in about {minutes} minutes.":
      "Сьогодні ти використовуватимеш уже знайомі слова, приблизно за {minutes} хв.",
    "Start today's module":
      "Почати заняття",
  },
  counted: {
    "step": { en: ["step", "steps"], ru: ["шаг", "шага", "шагов"], uk: ["крок", "кроки", "кроків"] },
    "shield": { en: ["shield", "shields"], ru: ["щит", "щита", "щитов"], uk: ["щит", "щити", "щитів"] },
    "conversation": { en: ["conversation", "conversations"], ru: ["разговор", "разговора", "разговоров"], uk: ["розмова", "розмови", "розмов"] },
  },
};
