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
    // The footer every letter carries, and the way out.
    "Kodukeel, run by {operator}.": "Kodukeel. Работу сервиса обеспечивает {operator}.",
    "Stop emails like this one": "Отписаться от таких писем",
    "Choose which emails you get": "Выбрать, какие письма получать",
    "What we keep about you": "Какие данные о вас мы храним",

    // The evening nudge.
    "One step left in {title}": "В занятии {title} остался последний шаг",
    "{steps} left in {title}": "В занятии {title} ещё {steps}",
    "{newWords} tonight": "Сегодня вечером {newWords}",
    "Back to {title} tonight": "Сегодня вечером снова {title}",
    "{what}, part {n} of {of}": "{what}, часть {n} из {of}",
    "{shape}. About {minutes} minutes left.": "{shape}. Осталось около {minutes} мин.",
    "{shape}. About {minutes} minutes, start to finish.": "{shape}. Всего около {minutes} мин.",
    "You're nearly done for tonight.": "На сегодня почти всё.",
    "About {minutes} minutes to go tonight.": "На сегодня осталось около {minutes} мин.",
    "{name}, you're {steps} into {where}. The rest is right where you left it.":
      "{name}, вы уже прошли {steps} в занятии {where}. Остальное ждёт там, где вы остановились.",
    "You're {steps} into {where}. The rest is right where you left it.":
      "Вы уже прошли {steps} в занятии {where}. Остальное ждёт там, где вы остановились.",
    "{newWords}, in about {minutes} minutes.": "{newWords}, примерно за {minutes} мин.",
    "Words you know, put to work tonight, in about {minutes} minutes.":
      "Сегодня вечером в ход идут знакомые слова, примерно за {minutes} мин.",
    "{name}, this is {title}, {evening}. By the end you'll be able to {canDo}":
      "{name}, сегодня занятие {title}, {evening}. К концу вы сможете {canDo}",
    "{title}, {evening}. By the end you'll be able to {canDo}":
      "Сегодня занятие {title}, {evening}. К концу вы сможете {canDo}",
    "What you told yourself when you started:": "Что вы сказали себе, когда начинали:",
    "[done]": "[готово]",
    "And a word for you, whether you study tonight or not:":
      "И слово для вас, будете вы сегодня заниматься или нет:",
    "That's {days} in a row so far.": "Уже {days} подряд.",

    // The first letter.
    "Kodukeel. The four letters an English keyboard has no key for: o-tilde, a-umlaut, o-umlaut, u-umlaut.":
      "Kodukeel. Четыре буквы, которых нет в русском алфавите: o с тильдой, a, o и u с умлаутом.",
    "Your first cards are ready. Here's how it works.": "Ваши первые карточки готовы. Вот как всё устроено.",
    "{cards} are already waiting for you, made from the first lessons of your course. Your first evening is {title}, which is {subtitle}.":
      "В вашей колоде уже {cards} из первых уроков курса. Ваш первый вечер: {title}, {subtitle}.",
    "{cards} are already waiting for you, made from the first lessons of your course. Open the course and it'll show you where to start.":
      "В вашей колоде уже {cards} из первых уроков курса. Откройте курс, и он покажет, с чего начать.",
    "A progress bar, right at the start.": "Полоса прогресса, в самом начале.",
    "Fifteen minutes an evening, and that's all.": "Пятнадцать минут вечером, и всё.",
    "Each evening is a short reading, two quick exercises and a few cards to go over. It takes about a quarter of an hour at any level, and when you're done, the app tells you so and lets you go. No endless scrolling, no guilt.":
      "Каждый вечер: короткое чтение, два быстрых упражнения и несколько карточек на повторение. На любом уровне это около четверти часа, а когда вы закончите, приложение так и скажет и отпустит вас. Без бесконечной ленты и без чувства вины.",
    "You picked {time}. Put it in your calendar and your phone will remind you, which works far better than an email from us.":
      "Вы выбрали {time}. Добавьте это время в календарь, и телефон напомнит сам: это работает куда лучше, чем письмо от нас.",
    "Add the daily reminder to your calendar": "Добавить ежедневное напоминание в календарь",
    "Pick a time that already has a gap in it: after dinner, on the train, before bed. Which hour you choose matters much less than keeping it the same every day.":
      "Выберите время, когда у вас и так бывает свободная минута: после ужина, в поезде, перед сном. Какой именно час, гораздо менее важно, чем то, чтобы он каждый день был одним и тем же.",
    "Open your first evening": "Открыть первый вечер",
    "What we'll send you: a short nudge on evenings you haven't studied yet, a look back at your week on Sundays, and now and then a note when there's real news, like finishing a level. The link at the bottom of any of them turns them off, and the course works just the same without them.":
      "Что мы будем присылать: короткое напоминание в те вечера, когда вы ещё не занимались, обзор недели по воскресеньям и иногда письмо, когда есть настоящая новость, например пройденный уровень. Ссылка внизу любого письма отключает их, а курс без них работает точно так же.",
    "Your first cards are ready": "Ваши первые карточки готовы",
    "{cards} are waiting, and your first evening is {subtitle}.": "В колоде уже {cards}, а первый вечер: {subtitle}.",
    "{cards} are waiting, and your first evening takes fifteen minutes.":
      "В колоде уже {cards}, а первый вечер займёт пятнадцать минут.",

    // Coming back after a while away.
    "Your Estonian hasn't gone anywhere.": "Ваш эстонский никуда не делся.",
    "You still know {words}. That's what spacing the cards out is for: the words stay put while you're away. Nothing is lost, and you don't have to start over.":
      "Вы по-прежнему знаете {words}. Для этого карточки и разнесены во времени: слова остаются с вами, пока вас нет. Ничего не потеряно, и начинать заново не нужно.",
    "A shield you'd saved up covered the gap, so your {run} run is still going.":
      "Перерыв прикрыл ваш запасной щит, так что серия ({run} подряд) продолжается.",
    "No need for a whole evening. One quick round takes about {minutes} minutes, and that's enough to say you're back.":
      "Целый вечер не нужен. Один быстрый раунд занимает около {minutes} мин, и этого достаточно, чтобы вернуться.",
    "Or jump straight into tonight's fifteen minutes": "Или сразу к сегодняшним пятнадцати минутам",
    "And today's word, whatever you decide:": "И слово дня, что бы вы ни решили:",
    "Your Estonian is right where you left it": "Ваш эстонский там же, где вы его оставили",
    "You still know {words}. Two minutes is all it takes to pick things up again.":
      "Вы по-прежнему знаете {words}. Чтобы продолжить, хватит двух минут.",
    "Play a two-minute word-matching game": "Сыграть в подбор пар на две минуты",

    // A shield spent.
    "A shield covered yesterday.": "Вчерашний день прикрыл щит.",
    "You took yesterday off, so one of the shields you'd earned stepped in. Your run of {days} is still going.":
      "Вчера вы отдыхали, и в дело вступил один из заработанных щитов. Ваша серия, {days} подряд, продолжается.",
    "studied": "занимались",
    "day off": "выходной",
    "You've got {more} more saved up.": "В запасе ещё {more}.",
    "That was your last one. You'll earn another when you reach {nextAt} days.":
      "Это был последний. Следующий вы получите, когда серия дойдёт до {nextAt} дней.",
    "That was your last one.": "Это был последний.",
    "A day off never costs you anything here. Your words just wait for you, exactly where you left them.":
      "Выходной здесь ничего вам не стоит. Слова просто ждут вас там же, где вы их оставили.",
    "See what's on tonight": "Посмотреть, что сегодня вечером",
    "A shield covered yesterday": "Вчерашний день прикрыл щит",
    "Your run of {days} is still going, and you've got {more} saved.":
      "Серия, {days} подряд, продолжается, и в запасе ещё {more}.",
    "Your run of {days} is still going, and that was your last shield.":
      "Серия, {days} подряд, продолжается, но это был последний щит.",

    // A level passed.
    "You've made it through {level}.": "Уровень {level} пройден.",
    "That's {words} that are properly yours now. Each one came back days after you met it, and you still knew it. So this letter is a little late: you did the work a while ago, and it stuck.":
      "Теперь по-настоящему ваши уже {words}. Каждое вернулось через несколько дней после знакомства, и вы его всё ещё помнили. Так что письмо немного запоздало: работу вы сделали давно, и она осталась с вами.",
    "About {pct} percent of the way to {target}.": "Пройдено около {pct}% пути до {target}.",
    "Next stop is {level}, about {words} away.": "Следующая остановка: {level}, до неё осталось примерно {words}.",
    "That was the level you set out to reach. There are always more words, and the course keeps going as long as you do.":
      "Это тот уровень, к которому вы стремились. Слов всегда больше, и курс продолжается, пока продолжаете вы.",
    "Keep going": "Продолжить",
    "You've made it through {level}": "Уровень {level} пройден",
    "{words} that are properly yours now. {title}.": "{words}, и все они теперь по-настоящему ваши. {title}.",

    // The Sunday look back.
    "A quiet week.": "Тихая неделя.",
    "You studied on {n} of the last seven days.": "Вы занимались {n} из последних семи.",
    "You answered {cards}. {words} are properly yours now, and that number only grows when a word comes back days later and you still know it.":
      "За неделю вы ответили на {cards}. По-настоящему ваших уже {words}, и это число растёт, только когда слово возвращается через несколько дней, а вы его всё ещё помните.",
    "No cards this week, and that's fine. Weeks like that happen. Nothing piles up to punish you while you're away, and one evening puts you right back where you were.":
      "На этой неделе карточек не было, и это нормально. Так бывает. Пока вас нет, ничего не копится вам в наказание, а один вечер возвращает вас туда, где вы были.",
    "And one conversation in Estonian with a real person. That's the number this whole app is for.":
      "А ещё один разговор на эстонском с живым человеком. Ради этого числа и существует всё приложение.",
    "And {conversations} in Estonian with real people. That's the number this whole app is for.":
      "А ещё {conversations} на эстонском с живыми людьми. Ради этого числа и существует всё приложение.",
    "On your way to {target}": "На пути к {target}",
    "About {assumed} of those words count because of the level you started at, and haven't been checked yet. The rest are words you still knew days after you first met them.":
      "Примерно {assumed} из этих слов засчитаны по уровню, с которого вы начали, и ещё не проверены. Остальные вы помнили через несколько дней после первой встречи.",
    "That bar only moves for words you still know days after you first met them. Just opening the app won't nudge it.":
      "Эта полоса растёт только за слова, которые вы помните через несколько дней после первой встречи. Просто открыть приложение ничего не даст.",
    "One evening left in {title}.": "В части «{title}» остался один вечер.",
    "{evenings} left in {title}.": "В части «{title}» ещё {evenings}.",
    "Continue with the course": "Продолжить курс",
    "See all your progress": "Посмотреть весь прогресс",
    "A quiet week, and the course is right where you left it": "Тихая неделя, а курс ждёт там же, где вы остановились",
    "{days} of Estonian this week": "{days} с эстонским на этой неделе",
    "Nothing to catch up on. One evening and you're back in.": "Догонять нечего. Один вечер, и вы снова в деле.",
    "{cards} answered, and {words} that are properly yours.": "{cards} за неделю и {words}, которые по-настоящему ваши.",

    // One thing to say out loud.
    "One thing to say out loud today.": "Одна фраза, которую сегодня стоит сказать вслух.",
    "{places}. Nobody there will know it's practice.": "{places}. Никто там не догадается, что это тренировка.",
    "Want a practice run first? {title} takes about two minutes, with somebody who wants something from you, just like the real thing.":
      "Хотите сначала прорепетировать? «{title}» занимает около двух минут, с собеседником, которому от вас что-то нужно, совсем как в жизни.",
    "Practice it first": "Сначала прорепетировать",
    "Or just have a look at the words in {unit}": "Или просто посмотреть слова из раздела «{unit}»",
    "Have a look at the words first": "Сначала посмотреть слова",
    "If they answer in English, that still counts. So does running out of words halfway. You said it, and whatever happens next is about the moment, not about you. The only thing that doesn't count is staying quiet.":
      "Если вам ответят по-английски, это всё равно засчитывается. И если слова закончатся на полпути, тоже. Вы это сказали, а что будет дальше, зависит от момента, а не от вас. Не засчитывается только молчание.",
    "Tomorrow morning the app will ask whether you spoke any Estonian to anyone. No is a perfectly fine answer.":
      "Завтра утром приложение спросит, говорили ли вы с кем-нибудь по-эстонски. «Нет» тоже совершенно нормальный ответ.",
    "A word you might want for this one.": "Слово, которое может пригодиться.",
    "One thing to say out loud today": "Одна фраза, которую сегодня стоит сказать вслух",
    "{places}. Just one sentence, and an answer in English still counts.":
      "{places}. Всего одна фраза, и ответ по-английски тоже засчитывается.",

    // The date somebody set.
    "{phrase} to go until the date you picked.": "До выбранной вами даты осталось: {phrase}.",
    "You're aiming for {band}, the level where you can {label}. Here's how that's looking.":
      "Вы идёте к уровню {band}, на котором можно {label}. Вот как обстоят дела.",
    "A bar, about {pct} percent full, for your chances at {band}.": "Полоса заполнена примерно на {pct}%: ваши шансы на {band}.",
    "If you sat it today, we'd put your chances of passing at about {pct} percent. {evidence}":
      "Если бы вы сдавали сегодня, мы оценили бы шансы сдать примерно в {pct}%. {evidence}",
    "Three things can change that, and any one of them counts: how often you study, the Estonian you already hear outside this app, and the date itself. Moving the date isn't giving up. You picked it in about ninety seconds, before you knew what any of this would take.":
      "Изменить это могут три вещи, и подойдёт любая: как часто вы занимаетесь, эстонский, который вы и так слышите вне приложения, и сама дата. Перенести дату не значит сдаться. Вы выбрали её секунд за девяносто, ещё не зная, чего всё это потребует.",
    "See your plan": "Посмотреть план",
    "{phrase} to go until the date you picked": "До выбранной вами даты осталось: {phrase}",
    "At the pace you're going, {band} still fits.": "В нынешнем темпе вы успеваете к {band}.",
    "How {band} is looking, and three things that could change it.":
      "Как обстоят дела с {band} и три вещи, которые могут это изменить.",

    // A group's week, to whoever runs it.
    "Last week in {group}": "Прошлая неделя в группе «{group}»",
    "{active} of {members} practiced, with {answers} between them.": "Занимались {active} из {members}, всего {answers}.",
    "{quiet} didn't open the app.": "Не открывали приложение: {quiet}.",
    "somebody studied": "кто-то занимался",
    "nobody studied": "никто не занимался",
    "The class finds {case} hardest.": "Труднее всего группе даётся {case}.",
    "{accuracy} percent right, across {total} answers from the whole class. That's the one to give them extra practice on this week.":
      "Верных ответов {accuracy}%, а всего ответов от группы: {total}. Именно этому падежу стоит уделить больше практики на этой неделе.",
    "{case} at {accuracy} percent": "{case} ({accuracy}%)",
    "After that comes {first}, and {second}.": "Следом идут {first} и {second}.",
    "After that comes {first}.": "Следом идёт {first}.",
    "Not enough answers yet to say which case the class finds hardest. Give it another week.":
      "Ответов пока мало, чтобы сказать, какой падеж группе труднее всего. Подождите ещё неделю.",
    "{onTrack} on track for {level}.": "Идут по плану к {level}: {onTrack}.",
    "{ready} of {members} on track or close for {level}.": "{ready} из {members} идут по плану к {level} или близки к этому.",
    "{close} close, {needTime} need more time, {tooEarly} too early to say.":
      "Близки к цели: {close}, нужно больше времени: {needTime}, пока рано судить: {tooEarly}.",
    "{close} close, {needTime} need more time.": "Близки к цели: {close}, нужно больше времени: {needTime}.",
    "Open the group's board": "Открыть страницу группы",
    "Everybody in {group} practiced last week": "На прошлой неделе в группе «{group}» занимались все",
    "{active} of {members} in {group} practiced last week": "На прошлой неделе в группе «{group}» занимались {active} из {members}",
    "How the week went, and which case to work on next.": "Как прошла неделя и над каким падежом поработать дальше.",
    "How the week went, and how the group is doing toward {level}.": "Как прошла неделя и как группа продвигается к {level}.",

    // A word a day.
    "See {word} in the dictionary": "Открыть {word} в словаре",
    "One word for today. Nothing to do but enjoy it.": "Одно слово на сегодня. Делать ничего не нужно, просто порадуйтесь ему.",
  },
  uk: {
    // The footer every letter carries, and the way out.
    "Kodukeel, run by {operator}.": "Kodukeel. Роботу сервісу забезпечує {operator}.",
    "Stop emails like this one": "Відписатися від таких листів",
    "Choose which emails you get": "Обрати, які листи отримувати",
    "What we keep about you": "Які дані про вас ми зберігаємо",

    // The evening nudge.
    "One step left in {title}": "У занятті {title} лишився останній крок",
    "{steps} left in {title}": "У занятті {title} ще {steps}",
    "{newWords} tonight": "Сьогодні ввечері {newWords}",
    "Back to {title} tonight": "Сьогодні ввечері знову розділ «{title}»",
    "{what}, part {n} of {of}": "{what}, частина {n} з {of}",
    "{shape}. About {minutes} minutes left.": "{shape}. Лишилося близько {minutes} хв.",
    "{shape}. About {minutes} minutes, start to finish.": "{shape}. Усього близько {minutes} хв.",
    "You're nearly done for tonight.": "На сьогодні майже все.",
    "About {minutes} minutes to go tonight.": "На сьогодні лишилося близько {minutes} хв.",
    "{name}, you're {steps} into {where}. The rest is right where you left it.":
      "{name}, ви вже пройшли {steps} у занятті {where}. Решта чекає там, де ви зупинилися.",
    "You're {steps} into {where}. The rest is right where you left it.":
      "Ви вже пройшли {steps} у занятті {where}. Решта чекає там, де ви зупинилися.",
    "{newWords}, in about {minutes} minutes.": "{newWords}, приблизно за {minutes} хв.",
    "Words you know, put to work tonight, in about {minutes} minutes.":
      "Сьогодні ввечері в хід ідуть знайомі слова, приблизно за {minutes} хв.",
    "{name}, this is {title}, {evening}. By the end you'll be able to {canDo}":
      "{name}, сьогодні заняття {title}, {evening}. Наприкінці ви зможете {canDo}",
    "{title}, {evening}. By the end you'll be able to {canDo}":
      "Сьогодні заняття {title}, {evening}. Наприкінці ви зможете {canDo}",
    "What you told yourself when you started:": "Що ви сказали собі, коли починали:",
    "[done]": "[готово]",
    "And a word for you, whether you study tonight or not:":
      "І слово для вас, незалежно від того, чи займатиметеся ви сьогодні:",
    "That's {days} in a row so far.": "Уже {days} поспіль.",

    // The first letter.
    "Kodukeel. The four letters an English keyboard has no key for: o-tilde, a-umlaut, o-umlaut, u-umlaut.":
      "Kodukeel. Чотири літери, яких немає в українській абетці: o з тильдою, a, o та u з умлаутом.",
    "Your first cards are ready. Here's how it works.": "Ваші перші картки готові. Ось як усе влаштовано.",
    "{cards} are already waiting for you, made from the first lessons of your course. Your first evening is {title}, which is {subtitle}.":
      "У вашій колоді вже {cards} з перших уроків курсу. Ваш перший вечір: {title}, {subtitle}.",
    "{cards} are already waiting for you, made from the first lessons of your course. Open the course and it'll show you where to start.":
      "У вашій колоді вже {cards} з перших уроків курсу. Відкрийте курс, і він покаже, з чого почати.",
    "A progress bar, right at the start.": "Смуга прогресу, на самому початку.",
    "Fifteen minutes an evening, and that's all.": "П'ятнадцять хвилин увечері, і все.",
    "Each evening is a short reading, two quick exercises and a few cards to go over. It takes about a quarter of an hour at any level, and when you're done, the app tells you so and lets you go. No endless scrolling, no guilt.":
      "Кожен вечір: коротке читання, дві швидкі вправи й кілька карток на повторення. На будь-якому рівні це близько чверті години, а коли ви закінчите, застосунок так і скаже й відпустить вас. Без нескінченної стрічки й без почуття провини.",
    "You picked {time}. Put it in your calendar and your phone will remind you, which works far better than an email from us.":
      "Ви обрали {time}. Додайте цей час до календаря, і телефон нагадає сам: це працює набагато краще, ніж лист від нас.",
    "Add the daily reminder to your calendar": "Додати щоденне нагадування до календаря",
    "Pick a time that already has a gap in it: after dinner, on the train, before bed. Which hour you choose matters much less than keeping it the same every day.":
      "Оберіть час, коли у вас і так буває вільна хвилина: після вечері, у потязі, перед сном. Яка саме година, набагато менш важливо, ніж те, щоб вона щодня була та сама.",
    "Open your first evening": "Відкрити перший вечір",
    "What we'll send you: a short nudge on evenings you haven't studied yet, a look back at your week on Sundays, and now and then a note when there's real news, like finishing a level. The link at the bottom of any of them turns them off, and the course works just the same without them.":
      "Що ми надсилатимемо: коротке нагадування в ті вечори, коли ви ще не займалися, огляд тижня щонеділі й інколи лист, коли є справжня новина, наприклад пройдений рівень. Посилання внизу будь-якого листа вимикає їх, а курс без них працює так само.",
    "Your first cards are ready": "Ваші перші картки готові",
    "{cards} are waiting, and your first evening is {subtitle}.": "У колоді вже {cards}, а перший вечір: {subtitle}.",
    "{cards} are waiting, and your first evening takes fifteen minutes.":
      "У колоді вже {cards}, а перший вечір забере п'ятнадцять хвилин.",

    // Coming back after a while away.
    "Your Estonian hasn't gone anywhere.": "Ваша естонська нікуди не зникла.",
    "You still know {words}. That's what spacing the cards out is for: the words stay put while you're away. Nothing is lost, and you don't have to start over.":
      "Ви й досі знаєте {words}. Для цього картки й розподілені в часі: слова лишаються з вами, поки вас немає. Нічого не втрачено, і починати спочатку не треба.",
    "A shield you'd saved up covered the gap, so your {run} run is still going.":
      "Перерву прикрив ваш запасний щит, тож серія ({run} поспіль) триває.",
    "No need for a whole evening. One quick round takes about {minutes} minutes, and that's enough to say you're back.":
      "Цілий вечір не потрібен. Один швидкий раунд триває близько {minutes} хв, і цього досить, щоб повернутися.",
    "Or jump straight into tonight's fifteen minutes": "Або одразу до сьогоднішніх п'ятнадцяти хвилин",
    "And today's word, whatever you decide:": "І слово дня, хоч би що ви вирішили:",
    "Your Estonian is right where you left it": "Ваша естонська там само, де ви її залишили",
    "You still know {words}. Two minutes is all it takes to pick things up again.":
      "Ви й досі знаєте {words}. Щоб продовжити, вистачить двох хвилин.",
    "Play a two-minute word-matching game": "Зіграти в добір пар на дві хвилини",

    // A shield spent.
    "A shield covered yesterday.": "Учорашній день прикрив щит.",
    "You took yesterday off, so one of the shields you'd earned stepped in. Your run of {days} is still going.":
      "Учора ви відпочивали, і в справу вступив один із зароблених щитів. Ваша серія, {days} поспіль, триває.",
    "studied": "займалися",
    "day off": "вихідний",
    "You've got {more} more saved up.": "У запасі ще {more}.",
    "That was your last one. You'll earn another when you reach {nextAt} days.":
      "Це був останній. Наступний ви отримаєте, коли серія дійде до {nextAt} днів.",
    "That was your last one.": "Це був останній.",
    "A day off never costs you anything here. Your words just wait for you, exactly where you left them.":
      "Вихідний тут нічого вам не коштує. Слова просто чекають на вас там само, де ви їх залишили.",
    "See what's on tonight": "Подивитися, що сьогодні ввечері",
    "A shield covered yesterday": "Учорашній день прикрив щит",
    "Your run of {days} is still going, and you've got {more} saved.":
      "Серія, {days} поспіль, триває, і в запасі ще {more}.",
    "Your run of {days} is still going, and that was your last shield.":
      "Серія, {days} поспіль, триває, але це був останній щит.",

    // A level passed.
    "You've made it through {level}.": "Рівень {level} пройдено.",
    "That's {words} that are properly yours now. Each one came back days after you met it, and you still knew it. So this letter is a little late: you did the work a while ago, and it stuck.":
      "Тепер по-справжньому ваші вже {words}. Кожне повернулося через кілька днів після знайомства, і ви його досі пам'ятали. Тож лист трохи запізнився: роботу ви зробили давно, і вона лишилася з вами.",
    "About {pct} percent of the way to {target}.": "Пройдено близько {pct}% шляху до {target}.",
    "Next stop is {level}, about {words} away.": "Наступна зупинка: {level}, до неї лишилося приблизно {words}.",
    "That was the level you set out to reach. There are always more words, and the course keeps going as long as you do.":
      "Це той рівень, якого ви прагнули досягти. Слів завжди більше, і курс іде далі, доки йдете ви.",
    "Keep going": "Продовжити",
    "You've made it through {level}": "Рівень {level} пройдено",
    "{words} that are properly yours now. {title}.": "{words}, і всі вони тепер по-справжньому ваші. {title}.",

    // The Sunday look back.
    "A quiet week.": "Тихий тиждень.",
    "You studied on {n} of the last seven days.": "Ви займалися {n} з останніх семи.",
    "You answered {cards}. {words} are properly yours now, and that number only grows when a word comes back days later and you still know it.":
      "За тиждень ви відповіли на {cards}. По-справжньому ваших уже {words}, і це число зростає, лише коли слово повертається через кілька днів, а ви його досі пам'ятаєте.",
    "No cards this week, and that's fine. Weeks like that happen. Nothing piles up to punish you while you're away, and one evening puts you right back where you were.":
      "Цього тижня карток не було, і це нормально. Так буває. Поки вас немає, нічого не накопичується вам на покарання, а один вечір повертає вас туди, де ви були.",
    "And one conversation in Estonian with a real person. That's the number this whole app is for.":
      "А ще одна розмова естонською з живою людиною. Заради цього числа й існує весь застосунок.",
    "And {conversations} in Estonian with real people. That's the number this whole app is for.":
      "А ще {conversations} естонською з живими людьми. Заради цього числа й існує весь застосунок.",
    "On your way to {target}": "На шляху до {target}",
    "About {assumed} of those words count because of the level you started at, and haven't been checked yet. The rest are words you still knew days after you first met them.":
      "Приблизно {assumed} із цих слів зараховано за рівнем, з якого ви почали, і їх ще не перевірено. Решту ви пам'ятали через кілька днів після першої зустрічі.",
    "That bar only moves for words you still know days after you first met them. Just opening the app won't nudge it.":
      "Ця смуга зростає лише за слова, які ви пам'ятаєте через кілька днів після першої зустрічі. Просто відкрити застосунок нічого не дасть.",
    "One evening left in {title}.": "У частині «{title}» лишився один вечір.",
    "{evenings} left in {title}.": "У частині «{title}» ще {evenings}.",
    "Continue with the course": "Продовжити курс",
    "See all your progress": "Переглянути весь прогрес",
    "A quiet week, and the course is right where you left it": "Тихий тиждень, а курс чекає там само, де ви зупинилися",
    "{days} of Estonian this week": "{days} з естонською цього тижня",
    "Nothing to catch up on. One evening and you're back in.": "Надолужувати нічого. Один вечір, і ви знову в ділі.",
    "{cards} answered, and {words} that are properly yours.": "{cards} за тиждень і {words}, які по-справжньому ваші.",

    // One thing to say out loud.
    "One thing to say out loud today.": "Одна фраза, яку сьогодні варто сказати вголос.",
    "{places}. Nobody there will know it's practice.": "{places}. Ніхто там не здогадається, що це тренування.",
    "Want a practice run first? {title} takes about two minutes, with somebody who wants something from you, just like the real thing.":
      "Хочете спершу прорепетирувати? «{title}» триває близько двох хвилин, зі співрозмовником, якому від вас щось потрібно, зовсім як у житті.",
    "Practice it first": "Спершу прорепетирувати",
    "Or just have a look at the words in {unit}": "Або просто переглянути слова з розділу «{unit}»",
    "Have a look at the words first": "Спершу переглянути слова",
    "If they answer in English, that still counts. So does running out of words halfway. You said it, and whatever happens next is about the moment, not about you. The only thing that doesn't count is staying quiet.":
      "Якщо вам відповідять англійською, це все одно зараховується. І якщо слова закінчаться на півдорозі, теж. Ви це сказали, а що буде далі, залежить від моменту, а не від вас. Не зараховується лише мовчання.",
    "Tomorrow morning the app will ask whether you spoke any Estonian to anyone. No is a perfectly fine answer.":
      "Завтра вранці застосунок спитає, чи говорили ви з кимось естонською. «Ні» теж цілком нормальна відповідь.",
    "A word you might want for this one.": "Слово, яке може знадобитися.",
    "One thing to say out loud today": "Одна фраза, яку сьогодні варто сказати вголос",
    "{places}. Just one sentence, and an answer in English still counts.":
      "{places}. Лише одна фраза, і відповідь англійською теж зараховується.",

    // The date somebody set.
    "{phrase} to go until the date you picked.": "До обраної вами дати лишилося: {phrase}.",
    "You're aiming for {band}, the level where you can {label}. Here's how that's looking.":
      "Ви йдете до рівня {band}, на якому можна {label}. Ось як справи.",
    "A bar, about {pct} percent full, for your chances at {band}.": "Смуга заповнена приблизно на {pct}%: ваші шанси на {band}.",
    "If you sat it today, we'd put your chances of passing at about {pct} percent. {evidence}":
      "Якби ви складали сьогодні, ми оцінили б шанси скласти приблизно в {pct}%. {evidence}",
    "Three things can change that, and any one of them counts: how often you study, the Estonian you already hear outside this app, and the date itself. Moving the date isn't giving up. You picked it in about ninety seconds, before you knew what any of this would take.":
      "Змінити це можуть три речі, і підійде будь-яка: як часто ви займаєтеся, естонська, яку ви й так чуєте поза застосунком, і сама дата. Перенести дату не означає здатися. Ви обрали її секунд за дев'яносто, ще не знаючи, чого все це вимагатиме.",
    "See your plan": "Переглянути план",
    "{phrase} to go until the date you picked": "До обраної вами дати лишилося: {phrase}",
    "At the pace you're going, {band} still fits.": "У теперішньому темпі ви встигаєте до {band}.",
    "How {band} is looking, and three things that could change it.":
      "Як справи з {band} і три речі, які можуть це змінити.",

    // A group's week, to whoever runs it.
    "Last week in {group}": "Минулий тиждень у групі «{group}»",
    "{active} of {members} practiced, with {answers} between them.": "Займалися {active} з {members}, усього {answers}.",
    "{quiet} didn't open the app.": "Не відкривали застосунок: {quiet}.",
    "somebody studied": "хтось займався",
    "nobody studied": "ніхто не займався",
    "The class finds {case} hardest.": "Найважче групі дається {case}.",
    "{accuracy} percent right, across {total} answers from the whole class. That's the one to give them extra practice on this week.":
      "Правильних відповідей {accuracy}%, а всього відповідей від групи: {total}. Саме цьому відмінку варто приділити більше практики цього тижня.",
    "{case} at {accuracy} percent": "{case} ({accuracy}%)",
    "After that comes {first}, and {second}.": "Далі йдуть {first} і {second}.",
    "After that comes {first}.": "Далі йде {first}.",
    "Not enough answers yet to say which case the class finds hardest. Give it another week.":
      "Відповідей поки замало, щоб сказати, який відмінок групі найважчий. Зачекайте ще тиждень.",
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
    "One word for today. Nothing to do but enjoy it.": "Одне слово на сьогодні. Робити нічого не треба, просто потіштеся ним.",
  },
  counted: {
    "step": { en: ["step", "steps"], ru: ["шаг", "шага", "шагов"], uk: ["крок", "кроки", "кроків"] },
    "shield": { en: ["shield", "shields"], ru: ["щит", "щита", "щитов"], uk: ["щит", "щити", "щитів"] },
    "conversation": { en: ["conversation", "conversations"], ru: ["разговор", "разговора", "разговоров"], uk: ["розмова", "розмови", "розмов"] },
  },
};
