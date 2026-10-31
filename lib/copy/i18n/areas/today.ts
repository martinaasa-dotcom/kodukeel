import type { Area } from "../area";

/**
 * TODAY AND TODAY'S MODULE, IN RUSSIAN AND UKRAINIAN.
 *
 * The home screen, the module screen with its steps, the forms step, the bar
 * a step is drawn under, the climb to the level somebody is aiming at, and
 * the copy `lib/course/` writes for those screens. Keyed on the English each
 * line translates (`lib/copy/locale.ts`). A line with a count in it is a
 * template whose noun arrives already in the right one of the three plural
 * forms, from `counted` below or the core table.
 *
 * No Estonian in here (ADR-005): a form, a case name or a pronoun arrives in
 * a slot, off the dictionary or the page that printed it.
 */
export const TODAY: Area = {
  ru: {
  // TODAY: THE GREETING AND THE LINE UNDER IT.
  "Hello":
    "Привет",
  "Good morning":
    "Доброе утро",
  "Good afternoon":
    "Добрый день",
  "Good evening":
    "Добрый вечер",
  "You're all caught up. A good moment to meet some new words.":
    "Всё повторено. Хороший момент познакомиться с новыми словами.",
  "You're all caught up, and every word you've added is learned. Time for a new unit.":
    "Всё повторено, и все добавленные слова уже выучены. Пора взяться за новый раздел.",
  "Your first cards are ready: {cards}. That's about {minutes}.":
    "Твои первые карточки готовы, всего: {cards}. Это примерно {minutes}.",
  "Cards waiting for you: {cards}. That's about {minutes}.":
    "Тебя ждёт: {cards}. Это примерно {minutes}.",
  "Nothing else is due today. Enjoy the rest of your day.":
    "Больше на сегодня повторять нечего. Хорошего дня!",
  "{cards} still due, if you feel like a few more.":
    "Если хочется ещё, осталось повторить: {cards}.",
  "Nothing else is due today, so today's module is all you need to do.":
    "Больше на сегодня повторять нечего, так что тебе осталось только сегодняшнее занятие.",
  "{cards} due as well. They'll come up at the end of today's module.":
    "Ещё пора повторить: {cards}. Они попадутся в конце сегодняшнего занятия.",
  "{cards} due as well. Today's module ends with a few of them, and the review button has the rest.":
    "Ещё пора повторить: {cards}. Сегодняшнее занятие закончится несколькими из них, а остальные ждут на странице «Повторение».",

  // TODAY: THE CARD THAT SAYS WHAT TO DO NOW.
  "Due now":
    "Пора повторить",
  "New words":
    "Новые слова",
  "{done} of today's {goal} reviews done":
    "Сегодня повторено {done} из {goal}",
  "Daily goal":
    "Цель на день",
  "{done} done, goal met":
    "Сделано {done}, цель выполнена",
  "{done} of {goal} reviews":
    "Повторено {done} из {goal}",
  "Going over cards before they're due doesn't help them stick. Take the break, or start something new.":
    "Если повторять карточки раньше срока, они запомнятся не лучше. Отдохни или начни что-то новое.",
  "Meet your first words":
    "Познакомиться с первыми словами",
  "Learn {words}":
    "Выучить {words}",
  "Or learn {words}":
    "Или выучить {words}",
  "Or review {cards} that are due":
    "Или повторить: {cards}",
  "Start reviewing":
    "Начать повторение",
  "Start {unit}":
    "Начать раздел «{unit}»",
  "Go and practice":
    "К практике",
  "New words waiting for you: {words}. You'll take them {batch} at a time. You see each word in a sentence, pick what it means, then fill it back into the sentence yourself.":
    "Тебя ждут новые слова: {words}. Ты будешь учить их по {batch} за раз. Сначала увидишь каждое слово в предложении, выберешь, что оно значит, а потом вставишь его обратно в предложение.",
  "Most cards ask you to type or pick the answer. A few just show it and ask whether you knew it. Be honest there: that's how the app knows when to bring each word back.":
    "Большинство карточек просят вписать или выбрать ответ. Некоторые просто показывают его и спрашивают, знаешь ли ты его. Отвечай честно: так приложение понимает, когда вернуть каждое слово.",
  "No cards yet":
    "Карточек пока нет",
  "Choose a unit to begin with. Its words become cards you can learn, hear and practice.":
    "Выбери раздел, с которого начнёшь. Его слова станут карточками, которые можно учить, слушать и тренировать.",
  "Choose your first unit":
    "Выбрать первый раздел",

  // TODAY: TODAY'S MODULE, AT THE TOP.
  "Today's module":
    "Занятие на сегодня",
  "Day {day} of {days}":
    "День {day} из {days}",
  "Next":
    "Дальше",
  "{minutes} min":
    "{minutes} мин",
  "Keep going":
    "Продолжить",
  "{done} of {days} done, {run} evenings in a row":
    "Пройдено {done} из {days}, вечеров подряд: {run}",
  "{done} of {days} done":
    "Пройдено {done} из {days}",
  "Today's module is done.":
    "Занятие на сегодня пройдено.",
  "Tomorrow you'll continue with “{unit}”, part {n} of {of}.":
    "Завтра продолжим раздел «{unit}», часть {n} из {of}.",
  "See you tomorrow for “{unit}”.":
    "До завтра! Впереди: «{unit}».",
  "See you tomorrow for “{unit}” ({english}).":
    "До завтра! Впереди: «{unit}» ({english}).",
  "That was the very last evening of the course. Every word you met along the way will keep coming back in your reviews.":
    "Это был самый последний вечер курса. Все слова, которые встретились тебе по пути, будут и дальше возвращаться в повторениях.",
  "See what's next":
    "Что дальше",

  // TODAY: THE RUN OF DAYS.
  "{n} reviewed today":
    "Сегодня повторено: {n}",
  "Your streak":
    "Твоя серия дней",
  "{days} in a row":
    "{days} подряд",
  "{day} (today): reviewed":
    "{day} (сегодня): было повторение",
  "{day} (today): no reviews":
    "{day} (сегодня): повторений не было",
  "{day}: reviewed":
    "{day}: было повторение",
  "{day}: no reviews":
    "{day}: повторений не было",
  "Streak shields saved up: {shields}. Missing a day won't break your run.":
    "Накоплено щитов для серии: {shields}. Пропущенный день не прервёт серию.",

  // TODAY: WHAT'S ON, FROM THE LEARNER'S OWN CALENDAR.
  "one thing":
    "одно дело",
  "See your whole week":
    "Вся неделя",
  "Class":
    "Занятие в группе",
  "Study":
    "Учёба",
  "Exam":
    "Экзамен",
  "Other":
    "Другое",

  // TODAY: WHAT A TEACHER HAS SET.
  "On today":
    "На сегодня",
  "{tasks} late":
    "Просрочено: {tasks}",
  "{tasks} left":
    "Осталось: {tasks}",
  "Nothing from your class right now. When your teacher sets a unit, you'll see it here on the morning it's due.":
    "От твоей группы пока ничего. Когда преподаватель задаст раздел, ты увидишь его здесь утром того дня, к которому его нужно сделать.",
  "Late":
    "Просрочено",
  "Tomorrow":
    "Завтра",
  "This week":
    "На этой неделе",
  "Later":
    "Позже",
  "No date":
    "Без срока",
  "Homework":
    "Домашнее задание",
  "Vocabulary":
    "Слова",
  "Conversation":
    "Разговор",
  "Done once you've had it":
    "Засчитывается, когда ты его проведёшь",
  "Open the conversation \"{task}\"":
    "Открыть разговор «{task}»",
  "Overdue since {date}":
    "Просрочено с {date}",
  "Due {date}":
    "Срок: {date}",
  "Mark \"{task}\" as done":
    "Отметить «{task}» как выполненное",
  "Mark \"{task}\" as not done":
    "Отметить «{task}» как невыполненное",

  // TODAY: THE ONE SHORT ROUND.
  "Daily quest":
    "Задание дня",
  "{length} on the cards that trip you up most.":
    "{length} на карточки, на которых ты чаще всего спотыкаешься.",
  "Today's game":
    "Игра дня",
  "Today's conversation":
    "Разговор дня",
  "something different":
    "что-то другое",
  "Sunday":
    "Воскресенье",
  "Monday":
    "Понедельник",
  "Tuesday":
    "Вторник",
  "Wednesday":
    "Среда",
  "Thursday":
    "Четверг",
  "Friday":
    "Пятница",
  "Saturday":
    "Суббота",
  "A short round on whatever tripped you up this week.":
    "Короткий раунд на всё, что давалось тебе трудно на этой неделе.",
  "A fresh word to guess every morning. Monday's a good day to start.":
    "Каждое утро новое слово, которое нужно угадать. Понедельник отлично подходит, чтобы начать.",
  "Four versions of one word, and only the ending tells you which to hit.":
    "Четыре варианта одного слова, и только окончание подскажет, в какой попасть.",
  "Midweek, try a real conversation. Order a coffee, buy a bus ticket.":
    "Середина недели: попробуй настоящий разговор. Закажи кофе, купи билет на автобус.",
  "Pairs against the clock, and a personal best to beat.":
    "Пары на время и личный рекорд, который можно побить.",
  "It's Friday, so keep it short: a quick burst of endings on the clock.":
    "Пятница, так что коротко: быстрый забег по окончаниям на время.",
  "The crossword, for a Saturday with time to spare.":
    "Кроссворд для субботы, когда есть свободное время.",
  "A quiet round on the words you've met, typed from their meaning.":
    "Спокойный раунд на знакомые слова: ты печатаешь их по значению.",
  "Unscramble a word you've met.":
    "Собери знакомое слово из букв.",
  "Midweek, train your ear: hear a word and pick what it means.":
    "Середина недели, тренируем слух: послушай слово и выбери, что оно значит.",
  "It's Friday: say this week's words out loud, then hear them said.":
    "Пятница: скажи слова этой недели вслух, а потом послушай, как они звучат.",
  "Long sound or short? A Saturday ear test, no words needed.":
    "Долгий звук или краткий? Субботняя проверка слуха, слова знать не нужно.",

  // TODAY: THE NEXT UNIT, OFF THE COURSE.
  "Your next unit":
    "Следующий раздел",
  "{unit}: {pct}% complete":
    "«{unit}»: пройдено {pct}%",
  "Pick up where you left off":
    "Продолжить с того же места",
  "Start this unit":
    "Начать раздел",

  // TODAY: OUT THERE, AND THE ERRAND.
  "That didn't save. Try again once you're back online.":
    "Не сохранилось. Попробуй ещё раз, когда снова будешь онлайн.",
  "yesterday":
    "вчера",
  "Out there":
    "В жизни",
  "Did you speak any Estonian to anyone yesterday?":
    "Удалось вчера с кем-нибудь поговорить по-эстонски?",
  "Anything counts. A shop, a colleague, a single sentence at the door.":
    "Считается всё: магазин, коллега, одна фраза у двери.",
  "Whether you spoke Estonian yesterday":
    "Удалось ли вчера поговорить по-эстонски",
  "Yes, I did":
    "Да, было",
  "They understood me":
    "Меня поняли",
  "They switched to English":
    "Перешли на русский или английский",
  "I got stuck partway":
    "Не хватило слов на полпути",
  "Not yesterday":
    "Вчера нет",
  "You spoke Estonian to a real person.":
    "У тебя был разговор по-эстонски с живым человеком.",
  "How did it go?":
    "Как всё прошло?",
  "How the conversation went":
    "Как прошёл разговор",
  "I pressed that by mistake":
    "Ой, это по ошибке",
  "Say it today":
    "Скажи это сегодня",
  "You'll find the words in {unit}.":
    "Нужные слова есть в разделе «{unit}».",
  "Or {try}.":
    "Или {try}.",
  "try it out here first":
    "сначала потренируйся здесь",
  "You spoke Estonian and they understood you.":
    "Разговор был по-эстонски, и тебя поняли.",
  "Getting stuck partway still counts, and it's on the board.":
    "Сбиться посреди разговора не страшно: разговор всё равно засчитан.",
  "They switched to English. Next time, keep going in Estonian anyway. Most people switch back.":
    "Собеседник перешёл на русский или английский. В следующий раз всё равно продолжай по-эстонски: большинство потом возвращаются к эстонскому.",
  "Running out of words costs nothing in a practice conversation, and the person there will wait while you find them.":
    "В тренировочном разговоре не страшно, если не хватает слов: собеседник подождёт, пока ты их ищешь.",
  "They can switch to English in there too, so you can practice steering it back to Estonian.":
    "Там тоже могут перейти на английский, так что можно потренироваться возвращать разговор к эстонскому.",
  "That's your first in the last {days}.":
    "Это твой первый разговор за последние {days}.",
  "That makes {held} in the last {days}.":
    "Всего разговоров за последние {days}: {held}.",
  "See them all on Progress":
    "Все они в разделе «Прогресс»",
  "Practice one here now":
    "Потренироваться здесь прямо сейчас",
  "Was there a word you wanted and couldn't find?":
    "Было слово, которое хотелось сказать, но не нашлось?",
  "In English or Estonian":
    "По-английски или по-эстонски",
  "Look it up":
    "Найти",
  "Say hello to the first person you deal with today, and thank them on your way out.":
    "Поздоровайся с первым, к кому сегодня обратишься, и поблагодари его на прощание.",
  "Say sorry in Estonian for something tiny, and tell them you're learning.":
    "Извинись по-эстонски за какую-нибудь мелочь и скажи, что учишь язык.",
  "Order your coffee in Estonian today. Don't forget the please.":
    "Закажи сегодня кофе по-эстонски. Не забудь сказать «пожалуйста».",
  "Ask for bread at the counter and say how much you want. Pointing doesn't count.":
    "Попроси у прилавка хлеб и скажи, сколько тебе нужно. Показывать пальцем не считается.",
  "Ask what something costs before you peek at the label.":
    "Спроси, сколько что-нибудь стоит, прежде чем подсмотреть ценник.",
  "Ask somebody the time, even if you know it perfectly well.":
    "Спроси у кого-нибудь, который час, даже если прекрасно это знаешь.",
  "Ask somebody where something is, and follow the answer without falling back on English.":
    "Спроси у кого-нибудь, где что-то находится, и пойми ответ, не переходя на русский или английский.",
  "Say one sentence about the weather to whoever's waiting next to you.":
    "Скажи одно предложение о погоде тому, кто ждёт рядом с тобой.",
  "Tell a colleague or a neighbor one thing about your family.":
    "Расскажи коллеге или соседу что-нибудь одно о своей семье.",
  "Tell somebody what you did today. Three sentences is plenty.":
    "Расскажи кому-нибудь о своих сегодняшних делах. Трёх предложений вполне хватит.",
  "Give your phone number in Estonian, digit by digit, and ask them to read it back to you.":
    "Продиктуй свой номер телефона по-эстонски, цифру за цифрой, и попроси собеседника повторить его.",
  "In a clothes shop, ask for another size or another color.":
    "В магазине одежды попроси другой размер или другой цвет.",
  "Make one phone call in Estonian. A short one counts.":
    "Сделай один звонок по-эстонски. Короткий тоже считается.",
  "Book an appointment in Estonian, or just ask about one, and stay in Estonian even if they switch to English.":
    "Запишись на приём по-эстонски или просто спроси о записи и не переходи с эстонского, даже если тебе ответят по-русски или по-английски.",
  "Arrange to meet somebody in Estonian, with a day and a time.":
    "Договорись с кем-нибудь по-эстонски о встрече: назови день и время.",
  "Tell somebody one thing about your apartment, or ask about theirs.":
    "Расскажи кому-нибудь что-нибудь одно о своей квартире или спроси, как с жильём у них.",
  "Ask somebody for a hand with one small thing, in Estonian.":
    "Попроси кого-нибудь по-эстонски помочь с одной мелочью.",
  "Mail a letter or pick up a package, and do the whole thing in Estonian.":
    "Отправь письмо или забери посылку, и всё это по-эстонски.",
  "Buy a bus ticket at the window, and say where you're going and when.":
    "Купи в кассе билет на автобус и скажи, куда и когда едешь.",
  "Order a whole meal in Estonian, and ask what's in one of the dishes.":
    "Закажи целый обед по-эстонски и спроси, что входит в одно из блюд.",
  "Ask at the pharmacy for something for a headache, and how often to take it.":
    "Попроси в аптеке что-нибудь от головной боли и спроси, как часто это принимать.",
  "Ask somebody what an Estonian word means, then use it yourself before bed.":
    "Спроси у кого-нибудь, что значит эстонское слово, и до сна употреби его в своей речи.",
  "Tell somebody what you do for a living, and one thing you're good at.":
    "Расскажи кому-нибудь, чем ты зарабатываешь на жизнь и что у тебя хорошо получается.",
  "Take something back to a shop, or report something broken, and say what's wrong with it.":
    "Верни что-нибудь в магазин или сообщи о поломке и скажи, что не так.",
  "Before you get on, ask whether this bus or tram goes where you're going.":
    "Перед посадкой спроси, идёт ли этот автобус или трамвай туда, куда тебе нужно.",
  "When you don't catch something, ask them to say it again instead of switching to English.":
    "Если что-то не расслышишь, попроси повторить, а не переходи на русский или английский.",
  "Introduce yourself to somebody new: your name, where you live and what you do.":
    "Представься новому человеку: как тебя зовут, где ты живёшь и чем занимаешься.",
  "Say a price or which floor you live on out loud in Estonian, and ask them to say it back.":
    "Назови вслух по-эстонски цену или этаж, на котором живёшь, и попроси повторить.",
  "Ask for something politely with would: could I, would you.":
    "Попроси о чём-нибудь вежливо, в условном наклонении: не могли бы вы, нельзя ли мне.",
  "Talk about yourself for one minute in Estonian without stopping.":
    "Говори о себе по-эстонски минуту без остановки.",
  "Explain a decision you made and one reason against it.":
    "Объясни одно своё решение и назови один довод против него.",
  "When somebody switches to English to help you, ask to carry on in Estonian, and carry on.":
    "Когда кто-нибудь переходит на английский, чтобы тебе помочь, попроси продолжить по-эстонски и продолжай.",
  "Read one headline and tell somebody what it said, as something you heard.":
    "Прочитай один заголовок и перескажи кому-нибудь, о чём он, как услышанное.",
  "Say one thing in Estonian to a teacher or another parent at the door.":
    "Скажи что-нибудь по-эстонски учителю или другому родителю у дверей.",
  "Book an appointment with your family doctor in Estonian, on the phone if you can.":
    "Запишись к семейному врачу по-эстонски, лучше по телефону.",
  "Say one thing in a meeting held in Estonian: a question, a short update, or that you agree.":
    "Скажи что-нибудь на совещании на эстонском: вопрос, короткую новость или что ты согласен(на).",
  "Read a letter from an office and say plainly, in Estonian, what it wants from you.":
    "Прочитай письмо из учреждения и простыми словами скажи по-эстонски, чего от тебя хотят.",
  "Listen to ten minutes of Estonian radio, or watch an Estonian show with Estonian subtitles.":
    "Послушай десять минут эстонского радио или посмотри эстонскую передачу с эстонскими субтитрами.",
  "Disagree with somebody politely in Estonian, and say why.":
    "Вежливо не согласись с кем-нибудь по-эстонски и скажи почему.",
  "Say a toast, a congratulation or a condolence in Estonian, at a party, in a card or at the door.":
    "Скажи по-эстонски тост, поздравление или соболезнование: на празднике, в открытке или у дверей.",
  "Listen to a whole Estonian radio show or podcast episode, and tell somebody what it said.":
    "Послушай целиком эстонскую радиопередачу или выпуск подкаста и расскажи кому-нибудь, о чём там говорили.",
  "Read a real offer or a clause of a contract in Estonian, and explain it to somebody in plain words.":
    "Прочитай настоящее предложение или пункт договора на эстонском и объясни его кому-нибудь простыми словами.",
  "Write to a school, a kindergarten or an office with a request in Estonian, and send it.":
    "Напиши по-эстонски просьбу в школу, детский сад или учреждение и отправь её.",
  "Give a short presentation or chair a meeting in Estonian, and put the thirty words of your own job into your deck.":
    "Сделай короткую презентацию или проведи совещание на эстонском и добавь в колоду тридцать слов своей работы.",
  "Comment on a public consultation in Estonian, or speak at a meeting of your building or your town.":
    "Оставь по-эстонски отзыв на общественное обсуждение или выступи на собрании своего дома или города.",
  "Talk to an older Estonian about how things were, or go where a dialect is spoken and listen.":
    "Поговори с пожилым эстонцем о том, как всё было раньше, или съезди туда, где говорят на диалекте, и послушай.",
  "Read an Estonian book, or book the C1 exam.":
    "Прочитай эстонскую книгу или запишись на экзамен C1.",
  "A school, a kindergarten":
    "Школа, детский сад",
  "Ask the same thing twice today: once of somebody you say sina to, and once of somebody you say teie to.":
    "Сегодня попроси об одном и том же дважды: один раз того, кому говоришь sina, и один раз того, кому говоришь teie.",
  "Tell somebody one piece of news you read, as something you heard.":
    "Перескажи кому-нибудь одну прочитанную новость как услышанную.",
  "Give one reason for something you want, in Estonian, to more than one person.":
    "Назови по-эстонски нескольким людям одну причину, почему ты чего-то хочешь.",
  "Say one number and what it means out loud: it rose, it fell, by how much.":
    "Скажи вслух одно число и что оно значит: выросло, упало, на сколько.",
  "Say what you thought of something you read or watched, and one reason.":
    "Скажи, что ты думаешь о прочитанном или увиденном, и назови одну причину.",
  "Describe a problem with a device in Estonian: one sentence for what it does, and one for what you tried.":
    "Опиши по-эстонски проблему с каким-нибудь устройством: одно предложение о том, что происходит, и одно о том, что уже пробовали сделать.",
  "Say you disagree with something, politely, in Estonian.":
    "Вежливо выскажи по-эстонски несогласие с чем-нибудь.",
  "Recommend something to somebody and say why it's better than another.":
    "Посоветуй кому-нибудь что-нибудь и скажи, чем это лучше другого.",
  "Ask somebody how they are, and ask one more question about the answer.":
    "Спроси кого-нибудь, как дела, и задай по ответу ещё один вопрос.",
  "Ask for something at work using would: I would like, could we.":
    "Попроси о чём-нибудь на работе в условном наклонении: я бы хотел(а), не могли бы мы.",
  "Hold your ground politely when somebody says no.":
    "Вежливо стой на своём, когда тебе говорят «нет».",
  "Ask an office what happens next and when, and stay in Estonian.":
    "Спроси в учреждении, что будет дальше и когда, и не переходи на английский.",
  "Read one official letter or notice and tell somebody what it asks of you.":
    "Прочитай одно официальное письмо или объявление и расскажи кому-нибудь, чего от тебя в нём хотят.",
  "Make one call to an office and give a reference number in Estonian.":
    "Позвони в одно учреждение и назови номер дела по-эстонски.",
  "Ask a teacher or a colleague one follow-up question rather than nodding.":
    "Задай учителю или коллеге один уточняющий вопрос, а не просто кивай.",
  "Find out what number to call in an emergency, and say your address out loud in Estonian.":
    "Узнай, по какому номеру звонить в экстренном случае, и произнеси свой адрес вслух по-эстонски.",
  "Ask at a bank or a counter what you need to bring, in Estonian.":
    "Спроси в банке или у окошка по-эстонски, что нужно принести с собой.",
  "Ask how often to take something, and say it back.":
    "Спроси, как часто что-то принимать, и повтори ответ.",
  "A desk, a shop, work":
    "Окошко, магазин, работа",
  "Anywhere":
    "Где угодно",
  "Work":
    "Работа",
  "the stairwell":
    "подъезд",
  "Home":
    "Дом",
  "a friend":
    "друг",
  "A form":
    "Бланк",
  "A health center":
    "Поликлиника",
  "a salon":
    "салон",
  "A neighbor":
    "Сосед",
  "a colleague":
    "коллега",
  "work":
    "работа",
  "a party":
    "вечеринка",
  "a landlord":
    "арендодатель",
  "a helpdesk":
    "служба поддержки",
  "A stop":
    "Остановка",
  "a platform":
    "платформа",
  "a class":
    "учебная группа",
  "a stairwell":
    "подъезд",

  // TODAY: THE WORD OF THE DAY.
  "Word of the day":
    "Слово дня",
  "You've already met every word we could pick for today. Have a browse in the dictionary, and there'll be a new one here tomorrow.":
    "Все слова, которые мы могли выбрать на сегодня, тебе уже попадались. Загляни в словарь, а завтра здесь будет новое.",
  "Open the dictionary":
    "Открыть словарь",
  "new to you":
    "новое для тебя",
  "Hear {word}":
    "Послушать {word}",

  // THE CLIMB TO THE LEVEL THEY ARE AIMING AT.
  "{part}, day {day}":
    "{part}, день {day}",
  "{credited} of {total} words":
    "Слов: {credited} из {total}",
  "You've reached {target}":
    "Уровень {target} достигнут",
  "On the way to {target}":
    "На пути к {target}",
  "{n} you've shown you know":
    "{n} уже подтверждено",
  "{n} counted from your level":
    "{n} засчитано по уровню",
  "This level is done.":
    "Этот уровень пройден.",
  "{pct}% done.":
    "Пройдено {pct}%.",
  "Counted from your level: {shown} of {words} shown in your reviews so far.":
    "Засчитано по твоему уровню: в повторениях пока подтверждено {shown} из {words}.",
  "{parts} parts.":
    "Частей: {parts}.",
  "How this bar fills up":
    "Как заполняется эта полоса",
  "You know every word this level asks for. There's nothing new left in it.":
    "Ты знаешь все слова, которые нужны на этом уровне. Нового в нём не осталось.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you check off an evening. You're on {part}.":
    "Пройдено {pct}% пути от начала {start} до {target}. Сплошная часть растёт, только когда слово действительно закрепилось в повторениях, а не когда ты отмечаешь вечер. Сейчас ты здесь: {part}.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you check off an evening.":
    "Пройдено {pct}% пути от начала {start} до {target}. Сплошная часть растёт, только когда слово действительно закрепилось в повторениях, а не когда ты отмечаешь вечер.",
  "Every level up to {target} counts as yours already, and the evenings check it word by word.":
    "Все уровни до {target} уже засчитаны тебе, а вечера проверяют их слово за словом.",
  "Pick a target in Settings and this bar shows how far you are from it.":
    "Выбери цель в настройках, и эта шкала покажет, сколько тебе до неё осталось.",
  "Your level check put you at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "Проверка уровня показала {level}, поэтому {levels} мы засчитали тебе. Ничего ниже твоего уровня проходить заново не придётся.",
  "You told us you're at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "По твоим словам, у тебя уровень {level}, поэтому {levels} мы засчитали тебе. Ничего ниже твоего уровня проходить заново не придётся.",
  "First steps":
    "Первые шаги",
  "Everyday Estonian":
    "Эстонский на каждый день",
  "Independent user":
    "Самостоятельное владение",
  "Confident user":
    "Уверенное владение",
  "Proficient user":
    "Свободное владение",
  "You can make yourself understood in a shop, a café and a first introduction.":
    "Ты можешь объясниться в магазине, в кафе и при первом знакомстве.",
  "You can hold a simple conversation about your day, your family and your plans.":
    "Ты можешь поддержать простой разговор о своём дне, семье и планах.",
  "You can explain, disagree and handle the unexpected without switching to English.":
    "Ты можешь объяснить, возразить и справиться с неожиданным, не переходя на русский или английский.",
  "You can live in Estonian: phone an office, the doctor or the school and get what you called for, and write every text the B2 exam sets.":
    "Ты можешь жить на эстонском: позвонить в учреждение, врачу или в школу и добиться того, ради чего звонишь, и написать каждый текст экзамена B2.",
  "You can be yourself in Estonian: as funny, as precise and as firm as in your own language, at work, at a public meeting and on paper.":
    "Ты можешь быть собой на эстонском: таким же остроумным, точным и твёрдым, как на своём языке, на работе, на общем собрании и на бумаге.",

  // THE MODULE SCREEN.
  "Your evenings, already planned":
    "Твои вечера уже спланированы",
  "{evenings} short evenings, from your very first word all the way to C1. We've planned every one.":
    "{evenings} от самого первого слова до C1. Все они короткие, и каждый мы уже спланировали.",
  "You've been choosing what to do each evening. Starting this won't change anything else.":
    "До сих пор выбор, чем заниматься каждый вечер, был за тобой. Если начать курс, больше ничего не изменится.",
  "It starts at {start}, where you are now. You can step off it whenever you like, and everything else in the app stays where it is.":
    "Курс начинается с {start}, там, где ты сейчас. Сойти с него можно в любой момент, и всё остальное в приложении остаётся на своих местах.",
  "It starts at {start}, the level after the {level} you already have. You can step off it whenever you like, and everything else in the app stays where it is.":
    "Курс начинается с {start}, следующего уровня после твоего {level}. Сойти с него можно в любой момент, и всё остальное в приложении остаётся на своих местах.",
  "{part} is finished":
    "Часть «{part}» пройдена",
  "All {total} evenings done. Every word you met is in your reviews now.":
    "Все вечера пройдены, их было {total}. Каждое встреченное слово теперь в твоих повторениях.",
  "our guess, not a rule":
    "наше предположение, а не правило",
  "Not ready for {part} yet":
    "Переходить к части {part} пока рано",
  "We'd give it a few more days to settle before you build the next part on it.":
    "Мы бы дали знаниям ещё несколько дней улечься, прежде чем браться за следующую часть.",
  "Start {part} anyway":
    "Всё равно начать часть {part}",
  "Review what's due":
    "Повторить карточки на сегодня",
  "Next is {part} ({about}). It picks up where this one stopped, and it only asks about things you've already met.":
    "Дальше часть {part} ({about}). Она начинается там, где закончилась эта, и спрашивает только о том, что тебе уже встречалось.",
  "Every word in the course is in your reviews, and each one will come back just as you're about to forget it.":
    "Все слова курса в твоих повторениях, и каждое вернётся как раз тогда, когда ты начнёшь его забывать.",
  "See what you could handle out there":
    "Что тебе уже по силам в жизни",
  "Start {part}":
    "Начать часть {part}",
  "Next up: {part}":
    "Дальше: {part}",
  "You finished {part}. {canDo}":
    "Часть {part} пройдена. {canDo}",
  "That was the last evening of {part}. Tomorrow you start {next}.":
    "Это был последний вечер части {part}. Завтра начинается {next}.",
  "The planned course is off, so this is what's due. {turnOn}":
    "Курс по плану выключен, поэтому здесь то, что пора повторить. {turnOn}",
  "Turn it back on":
    "Включить снова",
  "Open the course":
    "Открыть курс",
  "Today's module is done":
    "Занятие на сегодня пройдено",
  "{run} evenings in a row now, and {done} of {total} finished.":
    "Вечеров подряд: {run}, пройдено {done} из {total}.",
  "{done} of {total} evenings finished. See you tomorrow!":
    "Пройдено вечеров: {done} из {total}. До завтра!",
  "Come back tomorrow for {unit}.":
    "Возвращайся завтра: впереди раздел «{unit}».",
  "Come back tomorrow for {unit} ({english}).":
    "Возвращайся завтра: впереди {unit} ({english}).",
  "Stopping here gives today's words time to settle.":
    "Если остановиться сейчас, сегодняшние слова успеют улечься.",
  "Hear today's words once more":
    "Послушать сегодняшние слова ещё раз",
  "Start the next one now":
    "Начать следующий урок сейчас",
  "Back to Today":
    "На главную",
  "{done} of {total}":
    "{done} из {total}",
  "Where you are":
    "Где ты сейчас",
  "Day {day} of {total}, part {n} of {of}":
    "День {day} из {total}, часть {n} из {of}",
  "By the end of this unit":
    "К концу этого раздела",
  "{words} again":
    "{words} на повтор",
  "0m":
    "0 мин",
  "{minutes}m":
    "{minutes} мин",
  "left":
    "осталось",
  "min":
    "мин",
  "Today's words":
    "Слова на сегодня",
  "A few of these aren't in your deck yet. The first step adds them.":
    "Некоторых из них ещё нет в твоей колоде. Первый шаг их добавит.",
  "How a step gets checked off":
    "Как отмечается шаг",
  "Meeting the words and the review at the end check themselves off as you answer. The others you check off yourself, because we can't tell which exercise an answer came from.":
    "Знакомство со словами и повторение в конце отмечаются сами, пока ты отвечаешь. Остальные шаги отмечаешь ты, потому что мы не видим, из какого упражнения пришёл ответ.",
  "{done} of {total} evenings":
    "Вечеров: {done} из {total}",
  "This part":
    "Эта часть",
  "evenings {from} to {to}":
    "вечера с {from} по {to}",
  "evening {n}":
    "вечер {n}",
  "The whole course, {parts}":
    "Весь курс, {parts}",
  "You don't have to follow it.":
    "Следовать ему не обязательно.",
  "{link} whenever you'd rather choose for yourself.":
    "{link}, когда захочется выбирать самостоятельно.",
  "Turn it off":
    "Выключить",
  "The whole course":
    "Весь курс",
  "Every part, by name":
    "Все части по названиям",
  "You are here":
    "Ты здесь",
  "based on your last two weeks":
    "по твоим последним двум неделям",

  // THE STEPS OF AN EVENING.
  "Go over today's {words}":
    "Повторить {words} на сегодня",
  "Learn today's {newWords}":
    "Выучить {newWords}",
  "Learn today's {newWords}, and {met} from earlier":
    "Выучить {newWords} и повторить знакомые ({met})",
  "Every one of these is from earlier in the course. Today they come back for what the page is about.":
    "Все эти слова уже были в курсе раньше. Сегодня они возвращаются ради того, о чём эта страница.",
  "Hear each word and see what it means. A few minutes later you pick it out of four.":
    "Послушай каждое слово и посмотри, что оно значит. Через несколько минут ты выберешь его из четырёх.",
  "See what each word means, pick it out of four a little later, then type it into a real Estonian sentence.":
    "Посмотри, что значит каждое слово, чуть позже выбери его из четырёх, а потом впиши в настоящее эстонское предложение.",
  "Read how today's words work":
    "Прочитать, как устроены сегодняшние слова",
  "One short page on the grammar behind today's words, shown in real sentences.":
    "Короткая страница о грамматике, на которой держатся сегодняшние слова, с примерами из настоящих предложений.",
  "{title} again":
    "{title} (ещё раз)",
  "Read \"{title}\"":
    "Прочитать «{title}»",
  "Read about the -{suffix} ending, \"{plain}\"":
    "Прочитать об окончании -{suffix}, «{plain}»",
  "Read about the -{suffix} ending":
    "Прочитать об окончании -{suffix}",
  "Read about {name}, \"{plain}\"":
    "Прочитать о падеже {name}, «{plain}»",
  "Read about {name}":
    "Прочитать о падеже {name}",
  "The past tense of one verb":
    "Прошедшее время одного глагола",
  "The past tense of {verbs}":
    "Прошедшее время: {verbs}",
  "Estonian verbs don't all change the same way in the past, so you learn each one on its own. Listen to them, then try three quick questions.":
    "В прошедшем времени эстонские глаголы меняются по-разному, поэтому каждый учат отдельно. Послушай их, а потом ответь на три быстрых вопроса.",
  "{title}, again at your level":
    "{title}: снова, на твоём уровне",
  "The conversation":
    "Разговор",
  "Have the conversation":
    "Поговорить по-эстонски",
  "You've had this one before. Today they talk to you the way they'd talk to anybody, and you've got far more to say back.":
    "Этот разговор у тебя уже был. Сегодня с тобой говорят так, как говорили бы с кем угодно, а ответить ты теперь можешь куда больше.",
  "Somebody wants something from you, and only Estonian will do.":
    "Кому-то что-то от тебя нужно, и обойтись можно только эстонским.",
  "A quick review, then you're done":
    "Короткое повторение, и на сегодня всё",
  "A few minutes on the words you're about to forget, today's included.":
    "Несколько минут на слова, которые ты вот-вот забудешь, включая сегодняшние.",
  "Pair each word with its meaning against the clock.":
    "Соединяй каждое слово с его значением на время.",
  "The same words, but this time you only hear them.":
    "Те же слова, но теперь ты их только слышишь.",
  "A race through the words you've met, and their endings once you've read about them.":
    "Гонка по знакомым словам, а когда прочитаешь про окончания, то и по окончаниям.",
  "Put a real Estonian sentence back together, word by word.":
    "Собери настоящее эстонское предложение слово за словом.",
  "Hear a whole sentence and write it down. It's good practice for hearing long and short vowels.":
    "Послушай целое предложение и запиши его. Это хорошая тренировка, чтобы различать на слух долгие и краткие гласные.",
  "Look at a picture and write one sentence of your own about it.":
    "Посмотри на картинку и напиши о ней одно своё предложение.",
  "Guess today's six-letter word. About three minutes.":
    "Угадай слово дня из шести букв. Минуты три.",
  "Four versions of one word, and a question telling you which one to hit. Only the ending tells them apart, so you learn to read it fast.":
    "Четыре варианта одного слова и вопрос, который подсказывает, в какой попасть. Различаются они только окончанием, так что ты учишься быстро его читать.",
  "One verb, six people: I, you, she and the rest.":
    "Один глагол, шесть лиц: я, ты, она и остальные.",
  "Say today's words out loud: along with a native speaker, back from the recording, then from their meaning. You see which words were heard, and typing works too.":
    "Скажи вслух слова этого вечера: вместе с носителем языка, по записи, затем по значению. Видно, какие слова распознались, а ещё можно печатать.",
  "Write a sentence of your own with the ending we ask for. We check that word against the dictionary before anything else.":
    "Напиши своё предложение с окончанием, которое мы просим. Это слово мы первым делом сверяем со словарём.",
  "Aitan sind, but helistan sulle. Every verb chooses its own ending for whatever comes after it, and English gives you no clue, so you learn them one verb at a time.":
    "Aitan sind, но helistan sulle. Каждый глагол сам выбирает окончание для того, что идёт после него, и угадать его нельзя, так что их учат по одному глаголу.",
  "The words that don't follow the usual ending rules. See each one, then write it yourself.":
    "Слова, которые не подчиняются обычным правилам окончаний. Посмотри на каждое, потом напиши его самостоятельно.",
  "A word you know, with its letters shuffled. Put them back in order.":
    "Знакомое слово с перемешанными буквами. Расставь их по порядку.",
  "Words you've already met, asked in new ways: read aloud, missing from a sentence, or in a sentence you write.":
    "Знакомые слова в новых вопросах: на слух, с пропуском в предложении или в твоём собственном предложении.",

  // THE STEP LIST AND THE MODULE'S OWN CHROME.
  "{graded} of {needed} answer done. Keep going and this checks itself off.":
    "Ответов: {graded} из {needed}. Продолжай, и шаг отметится сам.",
  "{graded} of {needed} answers done. Keep going and this checks itself off.":
    "Ответов: {graded} из {needed}. Продолжай, и шаг отметится сам.",
  "Done, going by your answers":
    "Готово, судя по твоим ответам",
  "Done":
    "Готово",
  "I did this":
    "Отметить как сделанное",
  "Start":
    "Начать",
  "{minutes} min, once this one's done":
    "{minutes} мин, после этого шага",
  "That didn't reach us.":
    "Запрос до нас не дошёл.",
  "Nothing has changed.":
    "Ничего не изменилось.",
  "Try again":
    "Попробовать ещё раз",
  "That didn't go through, so nothing has changed. Try again in a moment.":
    "Не получилось, поэтому ничего не изменилось. Попробуй ещё раз чуть позже.",
  "Stop following the course":
    "Больше не идти по курсу",
  "Start the course":
    "Начать курс",
  "Not now":
    "Не сейчас",
  "Got it":
    "Понятно",
  "That's the end of the page":
    "Это конец страницы",
  "Move on and that's step {n} of {of} done.":
    "Переходи дальше, и шаг {n} из {of} засчитается.",
  "That didn't reach us, so this step isn't checked off yet.":
    "Запрос до нас не дошёл, поэтому шаг пока не отмечен.",
  "Finish today's module":
    "Завершить занятие",
  "Next, step {n}: {title}":
    "Дальше, шаг {n}: {title}",
  "Next, step {n}":
    "Дальше, шаг {n}",
  "Leave today's module and go back to Today":
    "Выйти из сегодняшнего занятия и вернуться на главную",
  "Leave":
    "Выйти",
  "Step {n} of {of}":
    "Шаг {n} из {of}",
  "Finish":
    "Завершить",
  "Next step":
    "Следующий шаг",
  "You're still on this step.":
    "Ты всё ещё на этом шаге.",
  "Back to today's module":
    "Назад к занятию на сегодня",

  // THE PAST FORMS STEP.
  "The past of your verbs":
    "Прошедшее время твоих глаголов",
  "Each verb makes its past its own way, so learn them a few at a time. Listen, then try three.":
    "Каждый глагол образует прошедшее время по-своему, поэтому учи их понемногу. Послушай, а потом ответь на три вопроса.",
  "No verbs to learn here today":
    "Сегодня здесь учить нечего",
  "We don't have the past forms of today's verbs yet. Carry on to the next step.":
    "Форм прошедшего времени для сегодняшних глаголов у нас пока нет. Переходи к следующему шагу.",
  "the ones you've met":
    "те, что уже встречались",
  "Each one makes its past and its polite command its own way. Listen and read them; nothing here is asked.":
    "Каждый глагол образует прошедшее время и вежливое повеление по-своему. Послушай и прочитай, здесь ничего не спрашивают.",
  "Today's verbs":
    "Глаголы на сегодня",

  // TRY IT: THE READING ASKS BACK.
  "You looked the forms up in the table.":
    "Формы подсмотрены в таблице.",
  "You got every one right. Later today you'll get questions like these about today's words.":
    "Все ответы верные. Позже сегодня будут похожие вопросы о сегодняшних словах.",
  "You got every one right.":
    "Все ответы верные.",
  "Glance back at the table whenever a form looks odd.":
    "Если форма кажется странной, загляни в таблицу.",
  "{n} of {total}, just practice":
    "{n} из {total}, просто тренировка",
  "Try it":
    "Попробуй",
  "Which form":
    "Какая форма",
  "hear it":
    "послушать",
  "{lemma} means {translation}. Which one is \"I\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «я»?",
  "{lemma} means {translation}. Which one is \"I would\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «я бы»?",
  "{lemma} means {translation}. Which one is \"you\", talking to one person?":
    "Слово {lemma} значит «{translation}». Какая форма для «ты», при обращении к одному человеку?",
  "{lemma} means {translation}. Which one is \"you would\", talking to one person?":
    "Слово {lemma} значит «{translation}». Какая форма для «ты бы», при обращении к одному человеку?",
  "{lemma} means {translation}. Which one is \"he or she\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «он (она)»?",
  "{lemma} means {translation}. Which one is \"he or she would\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «он (она) бы»?",
  "{lemma} means {translation}. Which one is \"we\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «мы»?",
  "{lemma} means {translation}. Which one is \"we would\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «мы бы»?",
  "{lemma} means {translation}. Which one is \"you\", talking to several people or politely?":
    "Слово {lemma} значит «{translation}». Какая форма для «вы», при обращении к нескольким людям или из вежливости?",
  "{lemma} means {translation}. Which one is \"you would\", talking to several people or politely?":
    "Слово {lemma} значит «{translation}». Какая форма для «вы бы», при обращении к нескольким людям или из вежливости?",
  "{lemma} means {translation}. Which one is \"they\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «они»?",
  "{lemma} means {translation}. Which one is \"they would\"?":
    "Слово {lemma} значит «{translation}». Какая форма для «они бы»?",
  "Yes. {value} is {lemma} for {pronoun}.":
    "Да. Для {pronoun} у глагола {lemma} форма {value}.",
  "Yes. {value} is {lemma} for {pronoun}, and for {shared} too.":
    "Да. Для {pronoun} у глагола {lemma} форма {value}, как и для {shared}.",
  "Not that one. With {pronoun} it's {value}.":
    "Не эта. Для {pronoun} будет {value}.",
  "Not that one. With {pronoun} it's {value}, and the same with {shared}.":
    "Не эта. Для {pronoun} будет {value}, и для {shared} так же.",
  "{lemma} means {translation}. Which one says \"not\"?":
    "Слово {lemma} значит «{translation}». Какая форма означает «не»?",
  "{lemma} means {translation}. Which one tells somebody to do it?":
    "Слово {lemma} значит «{translation}». Какая форма велит кому-то это сделать?",
  "Yes. {answer} is how you say not with {lemma}, {translation}.":
    "Да, {answer}: так звучит отрицание глагола {lemma}, «{translation}».",
  "Yes. {answer} is how you tell one person to do it with {lemma}, {translation}.":
    "Да, {answer}: так глаголом {lemma}, «{translation}», просят одного человека что-то сделать.",
  "Not that one. For {lemma}, it's {answer}.":
    "Не эта. У {lemma} будет {answer}.",
  "{lemma} means {translation}. Which one says \"I did it\", back in the past?":
    "Слово {lemma} значит «{translation}». Какая форма для «я» в прошедшем времени?",
  "{lemma} means {translation}. Which one says \"he or she did it\", back in the past?":
    "Слово {lemma} значит «{translation}». Какая форма о прошлом, когда это сделал «он» или «она»?",
  "Yes. {answer} is the past, when you did it yourself. {now} is happening right now.":
    "Да. {answer} показывает прошлое для «я», а {now} то, что происходит сейчас.",
  "Yes. {answer} is the past, when somebody else did it. {now} is happening right now.":
    "Да. {answer} показывает прошлое, когда это делал кто-то другой, а {now} то, что происходит сейчас.",
  "Not that one. {answer} is the past, when you did it yourself.":
    "Не эта. Прошлое для «я» показывает {answer}.",
  "Not that one. {answer} is the past, when somebody else did it.":
    "Не эта. Прошлое, когда это делал кто-то другой, показывает {answer}.",
  "{lemma} means {translation}. Which one says \"{reading}\"?":
    "Слово {lemma} значит «{translation}». Какая форма значит «{reading}»?",
  "Which one is {lemma}, {translation}, in the {case}?":
    "Какая форма у слова {lemma}, «{translation}», в падеже {case}?",
  "Yes. {form} is {lemma} in the {case}.":
    "Да, в падеже {case} слово {lemma} выглядит так: {form}.",
  "Yes. {form} is {lemma} in the {case}. It's {stem} with {ending} on the end.":
    "Да, в падеже {case} слово {lemma} выглядит так: {form}. Это {stem} с окончанием {ending}.",
  "Not that one. {lemma} becomes {form}.":
    "Не эта. {lemma} превращается в {form}.",
  "Not that one. {lemma} becomes {form}. It's {stem} with {ending} on the end.":
    "Не эта. {lemma} превращается в {form}. Это {stem} с окончанием {ending}.",

  // WHETHER THIS IS THE RIGHT PART, AND THE HAND-OFF.
  "You're flying through this":
    "У тебя всё идёт как по маслу",
  "You're flying through the top of the course":
    "Ты легко проходишь самую сложную часть курса",
  "This part is a tough one":
    "Эта часть непростая",
  "Lately you've been getting every answer right.":
    "В последнее время ты отвечаешь правильно на всё.",
  "Lately you've been getting {seen} out of a hundred right.":
    "В последнее время ты отвечаешь правильно на {seen} из ста.",
  "If this part feels too easy, skip ahead to {part}. Everything from this one stays in your reviews either way.":
    "Если эта часть кажется слишком лёгкой, переходи сразу к части {part}. Всё из этой части в любом случае останется в твоих повторениях.",
  "There's no part above this one, so stretch yourself with your reviews and the tougher conversations.":
    "Выше этой части ничего нет, так что испытай себя в повторениях и в более трудных разговорах.",
  "A lot of recent answers have been misses. This part is a step ahead of you for now.":
    "Среди последних ответов много ошибок. Эта часть пока на шаг впереди тебя.",
  "Lately you've been getting {seen} out of a hundred right. This part is a step ahead of you for now.":
    "В последнее время ты отвечаешь правильно на {seen} из ста. Эта часть пока на шаг впереди тебя.",
  "Your reviews will bring back the words that are slipping. Give it a few days.":
    "Повторения вернут слова, которые ускользают. Дай им несколько дней.",
  "The level you started at was a first guess. Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Стартовый уровень был лишь первой прикидкой. Если сначала пройтись по {level}, эта часть станет намного легче. Это просто освежит знания, а эта часть тебя подождёт.",
  "Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Если сначала пройтись по {level}, эта часть станет намного легче. Это просто освежит знания, а эта часть тебя подождёт.",
  "{part} is the part you skipped, and this one leans on it. Going back fills in the gaps.":
    "Часть {part} была пропущена, а эта на неё опирается. Если вернуться, пробелы заполнятся.",
  "Refresh {level} first":
    "Сначала освежить {level}",
  "Go back to {part}":
    "Вернуться к части {part}",
  "Skip ahead to {part}":
    "Перейти сразу к части {part}",
  "For now, recordings play a little slower and conversations start a little simpler. That goes back to normal on its own as your answers pick up.":
    "Пока что записи звучат чуть медленнее, а разговоры начинаются чуть проще. Когда ответы станут лучше, всё само вернётся к обычному.",
  "For now, recordings play a little slower. That goes back to normal on its own as your answers pick up.":
    "Пока что записи звучат чуть медленнее. Когда ответы станут лучше, всё само вернётся к обычному.",
  "For now, conversations start a little simpler. That goes back to normal on its own as your answers pick up.":
    "Пока что разговоры начинаются чуть проще. Когда ответы станут лучше, всё само вернётся к обычному.",
  "For now, conversations start a little harder and recordings play a little quicker. If your answers change, that goes back to normal on its own.":
    "Пока что разговоры начинаются чуть сложнее, а записи звучат чуть быстрее. Если ответы изменятся, всё само вернётся к обычному.",
  "For now, conversations start a little harder. If your answers change, that goes back to normal on its own.":
    "Пока что разговоры начинаются чуть сложнее. Если ответы изменятся, всё само вернётся к обычному.",
  "For now, recordings play a little quicker. If your answers change, that goes back to normal on its own.":
    "Пока что записи звучат чуть быстрее. Если ответы изменятся, всё само вернётся к обычному.",
  "So far, {seen} out of every hundred words from that part have stuck. The rest are waiting in your reviews, and they'll keep coming back until they do.":
    "Пока запомнились {seen} из каждых ста слов этой части. Остальные ждут в повторениях и будут возвращаться, пока не закрепятся.",
  "Right now you're getting {seen} out of a hundred answers right. Moving on to a harder part would only bring that down.":
    "Сейчас ты отвечаешь правильно на {seen} из ста. Если перейти к более трудной части, эта цифра только упадёт.",
  "Give it a few more days of reviews and that number will climb.":
    "Ещё несколько дней повторений, и эта цифра поднимется.",
  "Your reviews already know which words are giving you trouble.":
    "Повторения уже знают, какие слова даются тебе трудно.",

  // THE PARTS OF THE COURSE: WHAT EACH IS ABOUT, AND WHAT FINISHING IT MEANS.
  "Hello, you and me, the verb to be, and the people around you":
    "Приветствия, ты и я, глагол «быть» и люди вокруг тебя",
  "Your name, numbers, your home, and the verbs you'll use every day":
    "Твоё имя, числа, твой дом и глаголы на каждый день",
  "Your name and where you live, how to count, the rooms of your home, and the eleven commonest verbs. By the end you can introduce yourself, count, and describe where you live.":
    "Твоё имя и где ты живёшь, как считать, комнаты твоего дома и одиннадцать самых частых глаголов. К концу ты сможешь представиться, посчитать и описать, где живёшь.",
  "Food, the time, your day, and what things are like":
    "Еда, время, твой день и описание вещей",
  "Food and drink, the days and the clock, what you do from morning to night, and your first words for what things look like, colors included. By the end you can say what you're doing, when, and what it's like.":
    "Еда и напитки, дни недели и часы, что ты делаешь с утра до вечера, и первые слова о том, как выглядят вещи, включая цвета. К концу ты сможешь сказать, что делаешь, когда и как всё это выглядит.",
  "Clothes, weather, prices, and a shop":
    "Одежда, погода, цены и магазин",
  "What you're wearing, what the weather's doing, the bigger numbers you need for prices, and then a shop to put it all to work in. By the end you can describe what you want and buy it.":
    "Что на тебе надето, какая погода, большие числа, нужные для цен, а потом магазин, где всё это пригодится. К концу ты сможешь описать, что тебе нужно, и купить это.",
  "Where things are, the bus, somebody and something, and when":
    "Где что находится, автобус, кто-то и что-то, и когда",
  "Where things are and where you're heading, getting around by bus, words like somebody and nothing, and talking about when. By the end you can ask where something is, catch a bus there, and say when you arrived.":
    "Где что находится и куда ты направляешься, как ездить на автобусе, слова вроде «кто-то» и «ничего» и разговор о том, когда что происходит. К концу ты сможешь спросить, где что-то находится, доехать туда на автобусе и сказать, когда приехал (приехала).",
  "Joining words, the calendar, and where people are from":
    "Слова-связки, календарь и откуда люди родом",
  "Words for joining two thoughts or saying how sure you are, the months and the holidays, where people come from, and a few animals and parts of the body. By the end you can link two ideas and say when something happens.":
    "Слова, которые связывают две мысли или показывают степень уверенности, месяцы и праздники, откуда люди родом, а ещё немного о животных и частях тела. К концу ты сможешь связать две мысли и сказать, когда что-то происходит.",
  "How things are done, more everyday words, and asking for help":
    "Как что делается, ещё повседневные слова и просьба о помощи",
  "The last of A1. Words for how something was done, and the small words that change what a verb means. Then more of the everyday: food, places in town and the people who work there, ten verbs every child knows and ten more describing words. It ends on asking for help, and by then you have every word A1 asks for.":
    "Последняя часть A1. Слова о том, как что-то сделано, и маленькие слова, которые меняют смысл глагола. Потом ещё повседневное: еда, места в городе и люди, которые там работают, десять глаголов, которые знает любой ребёнок, и ещё десять слов для описания. Заканчивается всё просьбой о помощи, и к этому времени у тебя будут все слова, которые нужны для A1.",
  "Asking for things, yesterday, the outdoors, the body and the house":
    "Просьбы, вчерашний день, природа, тело и дом",
  "School, travel, the town, a free afternoon, and comparing things":
    "Учёба, поездки, город, свободный день и сравнение",
  "Life outside your front door: school, trips, the town, your weekends, and saying which of two things is better. There are conversations to practice on along the way. By the end you can buy a ticket, ask the way and say what you did on Saturday.":
    "Жизнь за порогом дома: учёба, поездки, город, твои выходные и как сказать, какая из двух вещей лучше. По пути тебя ждут разговоры для практики. К концу ты сможешь купить билет, спросить дорогу и рассказать, что делал (делала) в субботу.",
  "Eating out, making plans, keeping in touch, and how you feel":
    "Кафе и рестораны, планы, общение и чувства",
  "Talking about what hasn't happened yet, keeping in touch, and saying how you feel about it all. It's full of conversations. By the end you can get through a whole meal in Estonian, book an appointment and call somebody about it.":
    "Разговор о том, что ещё не случилось, общение с людьми и как сказать, что ты обо всём этом чувствуешь. Здесь много разговоров. К концу ты сможешь пообедать в ресторане целиком по-эстонски, записаться на приём и позвонить по этому поводу.",
  "Objects, the people in your life, what each verb asks for, money, and would":
    "Дополнение, люди в твоей жизни, чего требует каждый глагол, деньги и «бы»",
  "School, two new past forms, renting, what people are like, and the news":
    "Учёба, две новые формы прошедшего, аренда, какие бывают люди и новости",
  "School and a job interview first. Then the verb forms ending in -nud and -tud, and the two past tenses built from them. Then renting an apartment, what people are like, and the news, which leans on those same forms to say what happened without saying who did it. By the end you can get through an interview, read a news story and phone a landlord.":
    "Сначала учёба и собеседование на работу. Потом глагольные формы на -nud и -tud и два прошедших времени, которые из них строятся. Потом аренда квартиры, какие бывают люди и новости, где те же формы помогают сказать, что произошло, не называя, кто это сделал. К концу ты сможешь пройти собеседование, прочитать новость и позвонить арендодателю.",
  "Technology, opinions, the environment, things going wrong, and two-part verbs":
    "Технологии, мнения, экология, когда что-то идёт не так, и глаголы из двух частей",
  "Disagreeing with somebody, the things the papers argue about, and coping when something breaks. B1 ends on verbs that come in two parts, because they follow the same object rule you met at the start of B1. By the end you can argue your side without switching to English.":
    "Как спорить с собеседником, о чём спорят в газетах и как справиться, когда что-то сломалось. B1 заканчивается глаголами из двух частей, потому что они подчиняются тому же правилу дополнения, что и в начале B1. К концу ты сможешь отстоять свою точку зрения, не переходя на английский.",
  "Leaving out who did it, society, hearsay, the economy, and doing two things at once":
    "Безличные формы, общество, пересказ, экономика и два действия сразу",
  "History, building new words, politics, health and science":
    "История, образование новых слов, политика, здоровье и наука",
  "It opens on had done, the past before the past, learned on history, where you'll meet it most. Then how to work out a word you've never seen from one you already know, and three subjects to try it on. By the end you can read an opinion piece on any of them without a dictionary open.":
    "Начинаем с плюсквамперфекта, прошлого до прошлого, и учим его на теме истории, где он встречается чаще всего. Потом как понять незнакомое слово по уже знакомому, и три темы, чтобы это попробовать. К концу ты сможешь прочитать авторскую колонку на любую из этих тем, не открывая словарь.",
  "The arts, the law, the mind, working life, figures, and making a case":
    "Искусство, закон, психология, работа, цифры и аргументация",
  "The end of B2: the arts, making a proper complaint, describing how people behave, working in Estonian, reading a table of figures, and building an argument that concedes a point.":
    "Конец B2: искусство, как подать настоящую жалобу, как описать поведение людей, работа на эстонском, чтение таблицы с цифрами и аргумент, в котором ты признаёшь правоту собеседника в чём-то одном.",
  "Saying more in fewer words, and long sentences that hold together":
    "Больше смысла в меньшем числе слов и длинные предложения, которые не разваливаются",
  "Ethics, persuasion, how formal to be, idioms, and holding a text together":
    "Этика, убеждение, насколько официально говорить, идиомы и связный текст",
  "Knowing how formal to be and getting it right, winning over somebody who disagrees, and set phrases you learn whole.":
    "Как выбрать нужную степень официальности и попасть в тон, как переубедить несогласного и устойчивые выражения, которые учат целиком.",
  "New ideas, the wider world, literature, and words that almost mean the same":
    "Новые идеи, большой мир, литература и почти синонимы",
  "The last part of the course. By the end you've met everything in it.":
    "Последняя часть курса. К концу ты пройдёшь всё, что в нём есть.",
  "{pct} percent of today's module done":
    "Сегодняшнее занятие пройдено на {pct}%",
  "to go today":
    "осталось на сегодня",
  "Start today's module":
    "Начать занятие",
  "By the end of today's module":
    "К концу сегодняшнего занятия",
  "What you do today":
    "Что тебя ждёт сегодня",
  "one thing today":
    "одно дело на сегодня",
  "{things} today":
    "{things} на сегодня",
  "Plan your week":
    "Спланировать неделю",
  "Play":
    "Играть",
  "Review cards":
    "Повторить карточки",
  "({cards} due, if you'd rather practice what you know)":
    "(пора повторить: {cards}, если хочется потренировать то, что уже знаешь)",
  "Review done for today":
    "Повторение на сегодня готово",
  "({cards} reviewed, nothing else due)":
    "(повторено: {cards}, больше ничего не ждёт)",
  "A few more, if you like":
    "Ещё немного, если хочется",
  "about {minutes}":
    "около {minutes}",
  "Play a word game":
    "Сыграй в словесную игру",
  "An example round: the word for sun, two letters in place and three still to put in order.":
    "Пример раунда: слово «солнце», две буквы уже на месте, три ещё нужно расставить.",
  "sun":
    "солнце",
  "An example board: three guesses, each circle marked {here}, {elsewhere} or {absent}.":
    "Пример поля: три попытки, у каждого кружка пометка: {here}, {elsewhere} или {absent}.",
  "Play {e1}":
    "Играть в {e1}",
  "Play now":
    "Играть",
  "Game of the day":
    "Игра дня",
  "{e1}, with a small example board. A new word to guess every morning.":
    "{e1} с маленьким примером поля. Каждое утро новое слово, которое нужно угадать.",
  "A new word each day, at your level.":
    "Новое слово каждый день, по твоему уровню.",
  "Your week at a glance, your streak, and anything on your calendar for today.":
    "Обзор твоей недели, серия дней и всё, что у тебя в календаре на сегодня.",
  "One situation to rehearse, picked by the date from the ones your course has reached.":
    "Одна ситуация для репетиции, выбранная по дате из тех, до которых дошёл твой курс.",
  "Progress bar":
    "Шкала прогресса",
  "Guess the Estonian word in six letters.":
    "Угадай эстонское слово из шести букв.",
  "Put a real sentence back together, commas and all.":
    "Собери настоящее предложение заново, со всеми запятыми.",
  "It's Friday, so keep it quiet: words you know, asked in new ways.":
    "Пятница, так что без суеты: знакомые слова в новых вопросах.",
  // TODAY: THE JOKE AND THE GOOD NEWS.
  "Joke of the day":
    "Шутка дня",
  "The joke":
    "Шутка",
  "Hear the joke":
    "Послушать шутку",
  "Show English":
    "Показать по-английски",
  "Hide English":
    "Скрыть английский",
  "Tap for the punchline":
    "Нажми, чтобы узнать концовку",
  "Another one@joke":
    "Ещё одну",
  "Good news today":
    "Хорошая новость дня",
  "Another one@news":
    "Ещё одну",
  "Read it on ERR":
    "Читать на ERR",
  "Read the article":
    "Читать статью",
  "(opens in a new tab)":
    "(откроется в новой вкладке)",
  "A Juku joke, the kind every Estonian grew up on, with the English a tap away.":
    "Шутка про Юку, из тех, на которых вырос каждый эстонец, с английским переводом по нажатию.",
  "One happy headline from ERR, with the dictionary under every word.":
    "Один радостный заголовок с ERR, и под каждым словом словарь.",
  },
  uk: {
  // TODAY: THE GREETING AND THE LINE UNDER IT.
  "Hello":
    "Вітаю",
  "Good morning":
    "Доброго ранку",
  "Good afternoon":
    "Добрий день",
  "Good evening":
    "Добрий вечір",
  "You're all caught up. A good moment to meet some new words.":
    "Усе повторено. Слушна нагода познайомитися з новими словами.",
  "You're all caught up, and every word you've added is learned. Time for a new unit.":
    "Усе повторено, і всі додані слова вже вивчено. Час узятися за новий розділ.",
  "Your first cards are ready: {cards}. That's about {minutes}.":
    "Твої перші картки готові: {cards}. Це приблизно {minutes}.",
  "Cards waiting for you: {cards}. That's about {minutes}.":
    "На тебе чекає: {cards}. Це приблизно {minutes}.",
  "Nothing else is due today. Enjoy the rest of your day.":
    "Більше на сьогодні повторювати нічого. Гарного дня!",
  "{cards} still due, if you feel like a few more.":
    "Якщо хочеться ще, залишилося повторити: {cards}.",
  "Nothing else is due today, so today's module is all you need to do.":
    "Більше на сьогодні повторювати нічого, тож тобі залишилося лише сьогоднішнє заняття.",
  "{cards} due as well. They'll come up at the end of today's module.":
    "Ще пора повторити: {cards}. Вони трапляться наприкінці сьогоднішнього заняття.",
  "{cards} due as well. Today's module ends with a few of them, and the review button has the rest.":
    "Ще пора повторити: {cards}. Сьогоднішнє заняття завершиться кількома з них, а решта чекає на сторінці «Повторення».",

  // TODAY: THE CARD THAT SAYS WHAT TO DO NOW.
  "Due now":
    "Пора повторити",
  "New words":
    "Нові слова",
  "{done} of today's {goal} reviews done":
    "Сьогодні повторено {done} з {goal}",
  "Daily goal":
    "Мета на день",
  "{done} done, goal met":
    "Зроблено {done}, мету виконано",
  "{done} of {goal} reviews":
    "Повторено {done} з {goal}",
  "Going over cards before they're due doesn't help them stick. Take the break, or start something new.":
    "Якщо повторювати картки раніше терміну, вони не запам'ятаються краще. Відпочинь або почни щось нове.",
  "Meet your first words":
    "Познайомитися з першими словами",
  "Learn {words}":
    "Вивчити {words}",
  "Or learn {words}":
    "Або вивчити {words}",
  "Or review {cards} that are due":
    "Або повторити: {cards}",
  "Start reviewing":
    "Почати повторення",
  "Start {unit}":
    "Почати розділ «{unit}»",
  "Go and practice":
    "До практики",
  "New words waiting for you: {words}. You'll take them {batch} at a time. You see each word in a sentence, pick what it means, then fill it back into the sentence yourself.":
    "На тебе чекають нові слова: {words}. Ти вчитимеш їх по {batch} за раз. Спершу побачиш кожне слово в реченні, обереш, що воно означає, а потім вставиш його назад у речення.",
  "Most cards ask you to type or pick the answer. A few just show it and ask whether you knew it. Be honest there: that's how the app knows when to bring each word back.":
    "Більшість карток просять вписати або вибрати відповідь. Деякі просто показують її й питають, чи ти її знаєш. Відповідай чесно: так застосунок розуміє, коли повернути кожне слово.",
  "No cards yet":
    "Карток поки немає",
  "Choose a unit to begin with. Its words become cards you can learn, hear and practice.":
    "Обери розділ, з якого почнеш. Його слова стануть картками, які можна вчити, слухати й тренувати.",
  "Choose your first unit":
    "Вибрати перший розділ",

  // TODAY: TODAY'S MODULE, AT THE TOP.
  "Today's module":
    "Заняття на сьогодні",
  "Day {day} of {days}":
    "День {day} з {days}",
  "Next":
    "Далі",
  "{minutes} min":
    "{minutes} хв",
  "Keep going":
    "Продовжити",
  "{done} of {days} done, {run} evenings in a row":
    "Пройдено {done} з {days}, вечорів поспіль: {run}",
  "{done} of {days} done":
    "Пройдено {done} з {days}",
  "Today's module is done.":
    "Заняття на сьогодні пройдено.",
  "Tomorrow you'll continue with “{unit}”, part {n} of {of}.":
    "Завтра продовжимо розділ «{unit}», частина {n} з {of}.",
  "See you tomorrow for “{unit}”.":
    "До завтра! Попереду: «{unit}».",
  "See you tomorrow for “{unit}” ({english}).":
    "До завтра! Попереду: «{unit}» ({english}).",
  "That was the very last evening of the course. Every word you met along the way will keep coming back in your reviews.":
    "Це був останній вечір курсу. Усі слова, які траплялися тобі дорогою, і далі повертатимуться в повтореннях.",
  "See what's next":
    "Що далі",

  // TODAY: THE RUN OF DAYS.
  "{n} reviewed today":
    "Сьогодні повторено: {n}",
  "Your streak":
    "Твоя серія днів",
  "{days} in a row":
    "{days} поспіль",
  "{day} (today): reviewed":
    "{day} (сьогодні): було повторення",
  "{day} (today): no reviews":
    "{day} (сьогодні): повторень не було",
  "{day}: reviewed":
    "{day}: було повторення",
  "{day}: no reviews":
    "{day}: повторень не було",
  "Streak shields saved up: {shields}. Missing a day won't break your run.":
    "Накопичено щитів для серії: {shields}. Пропущений день не перерве серію.",

  // TODAY: WHAT'S ON, FROM THE LEARNER'S OWN CALENDAR.
  "one thing":
    "одна справа",
  "See your whole week":
    "Увесь тиждень",
  "Class":
    "Заняття в групі",
  "Study":
    "Навчання",
  "Exam":
    "Іспит",
  "Other":
    "Інше",

  // TODAY: WHAT A TEACHER HAS SET.
  "On today":
    "На сьогодні",
  "{tasks} late":
    "Прострочено: {tasks}",
  "{tasks} left":
    "Залишилося: {tasks}",
  "Nothing from your class right now. When your teacher sets a unit, you'll see it here on the morning it's due.":
    "Від твоєї групи поки нічого. Коли викладач задасть розділ, ти побачиш його тут уранці того дня, до якого його треба зробити.",
  "Late":
    "Прострочено",
  "Tomorrow":
    "Завтра",
  "This week":
    "Цього тижня",
  "Later":
    "Пізніше",
  "No date":
    "Без терміну",
  "Homework":
    "Домашнє завдання",
  "Vocabulary":
    "Слова",
  "Conversation":
    "Розмова",
  "Done once you've had it":
    "Зараховується, коли ти її проведеш",
  "Open the conversation \"{task}\"":
    "Відкрити розмову «{task}»",
  "Overdue since {date}":
    "Прострочено з {date}",
  "Due {date}":
    "Термін: {date}",
  "Mark \"{task}\" as done":
    "Позначити «{task}» як виконане",
  "Mark \"{task}\" as not done":
    "Позначити «{task}» як невиконане",

  // TODAY: THE ONE SHORT ROUND.
  "Daily quest":
    "Завдання дня",
  "{length} on the cards that trip you up most.":
    "{length} на картки, на яких ти найчастіше спотикаєшся.",
  "Today's game":
    "Гра дня",
  "Today's conversation":
    "Розмова дня",
  "something different":
    "щось інше",
  "Sunday":
    "Неділя",
  "Monday":
    "Понеділок",
  "Tuesday":
    "Вівторок",
  "Wednesday":
    "Середа",
  "Thursday":
    "Четвер",
  "Friday":
    "П'ятниця",
  "Saturday":
    "Субота",
  "A short round on whatever tripped you up this week.":
    "Короткий раунд з усього, що цього тижня тобі не давалося.",
  "A fresh word to guess every morning. Monday's a good day to start.":
    "Щоранку нове слово, яке треба вгадати. Понеділок чудово підходить, щоб почати.",
  "Four versions of one word, and only the ending tells you which to hit.":
    "Чотири варіанти одного слова, і лише закінчення підкаже, у який влучити.",
  "Midweek, try a real conversation. Order a coffee, buy a bus ticket.":
    "Середина тижня: спробуй справжню розмову. Замов каву, купи квиток на автобус.",
  "Pairs against the clock, and a personal best to beat.":
    "Пари на час і особистий рекорд, який можна побити.",
  "It's Friday, so keep it short: a quick burst of endings on the clock.":
    "П'ятниця, тож коротко: швидкий спринт із закінчень на час.",
  "The crossword, for a Saturday with time to spare.":
    "Кросворд для суботи, коли є вільний час.",
  "A quiet round on the words you've met, typed from their meaning.":
    "Спокійний раунд на знайомі слова: ти друкуєш їх за значенням.",
  "Unscramble a word you've met.":
    "Склади знайоме слово з літер.",
  "Midweek, train your ear: hear a word and pick what it means.":
    "Середина тижня, тренуємо слух: послухай слово й обери, що воно означає.",
  "It's Friday: say this week's words out loud, then hear them said.":
    "П'ятниця: скажи слова цього тижня вголос, а потім послухай, як вони звучать.",
  "Long sound or short? A Saturday ear test, no words needed.":
    "Довгий звук чи короткий? Суботня перевірка слуху, слова знати не потрібно.",

  // TODAY: THE NEXT UNIT, OFF THE COURSE.
  "Your next unit":
    "Наступний розділ",
  "{unit}: {pct}% complete":
    "«{unit}»: пройдено {pct}%",
  "Pick up where you left off":
    "Продовжити з того ж місця",
  "Start this unit":
    "Почати розділ",

  // TODAY: OUT THERE, AND THE ERRAND.
  "That didn't save. Try again once you're back online.":
    "Не збереглося. Спробуй ще раз, коли знову будеш онлайн.",
  "yesterday":
    "учора",
  "Out there":
    "У житті",
  "Did you speak any Estonian to anyone yesterday?":
    "Вдалося вчора з кимось поговорити естонською?",
  "Anything counts. A shop, a colleague, a single sentence at the door.":
    "Зараховується все: магазин, колега, одна фраза біля дверей.",
  "Whether you spoke Estonian yesterday":
    "Чи вдалося вчора поговорити естонською",
  "Yes, I did":
    "Так, було",
  "They understood me":
    "Мене зрозуміли",
  "They switched to English":
    "Перейшли на англійську",
  "I got stuck partway":
    "Забракло слів на півдорозі",
  "Not yesterday":
    "Учора ні",
  "You spoke Estonian to a real person.":
    "У тебе була розмова естонською з живою людиною.",
  "How did it go?":
    "Як усе минуло?",
  "How the conversation went":
    "Як минула розмова",
  "I pressed that by mistake":
    "Ой, це випадково",
  "Say it today":
    "Скажи це сьогодні",
  "You'll find the words in {unit}.":
    "Потрібні слова є в розділі «{unit}».",
  "Or {try}.":
    "Або {try}.",
  "try it out here first":
    "спершу потренуйся тут",
  "You spoke Estonian and they understood you.":
    "Розмова була естонською, і тебе зрозуміли.",
  "Getting stuck partway still counts, and it's on the board.":
    "Збитися посеред розмови не страшно: розмову все одно зараховано.",
  "They switched to English. Next time, keep going in Estonian anyway. Most people switch back.":
    "Співрозмовник перейшов на англійську. Наступного разу все одно продовжуй естонською: більшість повертаються до естонської.",
  "Running out of words costs nothing in a practice conversation, and the person there will wait while you find them.":
    "У тренувальній розмові не страшно, якщо бракує слів: співрозмовник зачекає, поки ти їх шукаєш.",
  "They can switch to English in there too, so you can practice steering it back to Estonian.":
    "Там теж можуть перейти на англійську, тож можна потренуватися повертати розмову до естонської.",
  "That's your first in the last {days}.":
    "Це твоя перша розмова за останні {days}.",
  "That makes {held} in the last {days}.":
    "Усього розмов за останні {days}: {held}.",
  "See them all on Progress":
    "Усі вони в розділі «Прогрес»",
  "Practice one here now":
    "Потренуватися тут просто зараз",
  "Was there a word you wanted and couldn't find?":
    "Було слово, яке хотілося сказати, але не знайшлося?",
  "In English or Estonian":
    "Англійською або естонською",
  "Look it up":
    "Пошук",
  "Say hello to the first person you deal with today, and thank them on your way out.":
    "Привітайся з першою людиною, до якої сьогодні звернешся, і подякуй їй на прощання.",
  "Say sorry in Estonian for something tiny, and tell them you're learning.":
    "Перепроси естонською за якусь дрібницю й скажи, що вчиш мову.",
  "Order your coffee in Estonian today. Don't forget the please.":
    "Замов сьогодні каву естонською. Не забудь сказати «будь ласка».",
  "Ask for bread at the counter and say how much you want. Pointing doesn't count.":
    "Попроси біля прилавка хліб і скажи, скільки тобі треба. Показувати пальцем не зараховується.",
  "Ask what something costs before you peek at the label.":
    "Спитай, скільки щось коштує, перш ніж підглянути цінник.",
  "Ask somebody the time, even if you know it perfectly well.":
    "Спитай у когось, котра година, навіть якщо чудово це знаєш.",
  "Ask somebody where something is, and follow the answer without falling back on English.":
    "Спитай у когось, де щось розташоване, і зрозумій відповідь, не переходячи на англійську.",
  "Say one sentence about the weather to whoever's waiting next to you.":
    "Скажи одне речення про погоду тому, хто чекає поруч із тобою.",
  "Tell a colleague or a neighbor one thing about your family.":
    "Розкажи колезі чи сусідові щось одне про свою родину.",
  "Tell somebody what you did today. Three sentences is plenty.":
    "Розкажи комусь про свої сьогоднішні справи. Трьох речень цілком вистачить.",
  "Give your phone number in Estonian, digit by digit, and ask them to read it back to you.":
    "Продиктуй свій номер телефону естонською, цифру за цифрою, і попроси співрозмовника повторити його.",
  "In a clothes shop, ask for another size or another color.":
    "У магазині одягу попроси інший розмір або інший колір.",
  "Make one phone call in Estonian. A short one counts.":
    "Зроби один дзвінок естонською. Короткий теж зараховується.",
  "Book an appointment in Estonian, or just ask about one, and stay in Estonian even if they switch to English.":
    "Запишися на прийом естонською або просто спитай про запис і не переходь з естонської, навіть якщо тобі відповідатимуть англійською.",
  "Arrange to meet somebody in Estonian, with a day and a time.":
    "Домовся з кимось естонською про зустріч, назвавши день і час.",
  "Tell somebody one thing about your apartment, or ask about theirs.":
    "Розкажи комусь щось одне про свою квартиру або спитай, як із житлом у них.",
  "Ask somebody for a hand with one small thing, in Estonian.":
    "Попроси когось естонською допомогти з однією дрібницею.",
  "Mail a letter or pick up a package, and do the whole thing in Estonian.":
    "Надішли лист або забери посилку й зроби все це естонською.",
  "Buy a bus ticket at the window, and say where you're going and when.":
    "Купи в касі квиток на автобус і скажи, куди й коли їдеш.",
  "Order a whole meal in Estonian, and ask what's in one of the dishes.":
    "Замов цілий обід естонською й спитай, що входить до однієї зі страв.",
  "Ask at the pharmacy for something for a headache, and how often to take it.":
    "Попроси в аптеці щось від головного болю й спитай, як часто це приймати.",
  "Ask somebody what an Estonian word means, then use it yourself before bed.":
    "Спитай у когось, що означає естонське слово, і до сну вжий його у власному мовленні.",
  "Tell somebody what you do for a living, and one thing you're good at.":
    "Розкажи комусь, чим ти заробляєш на життя й що тобі добре вдається.",
  "Take something back to a shop, or report something broken, and say what's wrong with it.":
    "Поверни щось у магазин або повідом про поломку й скажи, що не так.",
  "Before you get on, ask whether this bus or tram goes where you're going.":
    "Перед посадкою спитай, чи їде цей автобус або трамвай туди, куди тобі треба.",
  "When you don't catch something, ask them to say it again instead of switching to English.":
    "Якщо щось не розчуєш, попроси повторити, а не переходь на англійську.",
  "Introduce yourself to somebody new: your name, where you live and what you do.":
    "Представся новій людині: як тебе звати, де ти живеш і чим займаєшся.",
  "Say a price or which floor you live on out loud in Estonian, and ask them to say it back.":
    "Назви вголос естонською ціну або поверх, на якому живеш, і попроси повторити.",
  "Ask for something politely with would: could I, would you.":
    "Попроси про щось ввічливо, в умовному способі: чи не могли б ви, чи можна мені.",
  "Talk about yourself for one minute in Estonian without stopping.":
    "Говори про себе естонською хвилину без зупинки.",
  "Explain a decision you made and one reason against it.":
    "Поясни одне своє рішення й назви один аргумент проти нього.",
  "When somebody switches to English to help you, ask to carry on in Estonian, and carry on.":
    "Коли хтось переходить на англійську, щоб тобі допомогти, попроси продовжити естонською і продовжуй.",
  "Read one headline and tell somebody what it said, as something you heard.":
    "Прочитай один заголовок і перекажи комусь, про що він, як почуте.",
  "Say one thing in Estonian to a teacher or another parent at the door.":
    "Скажи щось естонською вчителеві або іншому батькові біля дверей.",
  "Book an appointment with your family doctor in Estonian, on the phone if you can.":
    "Запишися до сімейного лікаря естонською, краще телефоном.",
  "Say one thing in a meeting held in Estonian: a question, a short update, or that you agree.":
    "Скажи щось на нараді естонською: запитання, коротку новину або що ти згоден (згодна).",
  "Read a letter from an office and say plainly, in Estonian, what it wants from you.":
    "Прочитай лист з установи й простими словами скажи естонською, чого від тебе хочуть.",
  "Listen to ten minutes of Estonian radio, or watch an Estonian show with Estonian subtitles.":
    "Послухай десять хвилин естонського радіо або подивися естонську передачу з естонськими субтитрами.",
  "Disagree with somebody politely in Estonian, and say why.":
    "Ввічливо не погодься з кимось естонською і скажи чому.",
  "Say a toast, a congratulation or a condolence in Estonian, at a party, in a card or at the door.":
    "Скажи естонською тост, привітання або співчуття: на святі, в листівці чи біля дверей.",
  "Listen to a whole Estonian radio show or podcast episode, and tell somebody what it said.":
    "Послухай цілу естонську радіопередачу або випуск подкасту і розкажи комусь, про що там ішлося.",
  "Read a real offer or a clause of a contract in Estonian, and explain it to somebody in plain words.":
    "Прочитай справжню пропозицію або пункт договору естонською і поясни його комусь простими словами.",
  "Write to a school, a kindergarten or an office with a request in Estonian, and send it.":
    "Напиши естонською прохання до школи, дитячого садка чи установи і надішли його.",
  "Give a short presentation or chair a meeting in Estonian, and put the thirty words of your own job into your deck.":
    "Зроби коротку презентацію або проведи нараду естонською і додай до колоди тридцять слів своєї роботи.",
  "Comment on a public consultation in Estonian, or speak at a meeting of your building or your town.":
    "Залиш естонською відгук на громадське обговорення або виступи на зборах свого будинку чи міста.",
  "Talk to an older Estonian about how things were, or go where a dialect is spoken and listen.":
    "Поговори з літнім естонцем про те, як усе було колись, або поїдь туди, де говорять діалектом, і послухай.",
  "Read an Estonian book, or book the C1 exam.":
    "Прочитай естонську книжку або запишися на іспит C1.",
  "A school, a kindergarten":
    "Школа, дитячий садок",
  "Ask the same thing twice today: once of somebody you say sina to, and once of somebody you say teie to.":
    "Сьогодні попроси про одне й те саме двічі: один раз того, кому кажеш sina, і один раз того, кому кажеш teie.",
  "Tell somebody one piece of news you read, as something you heard.":
    "Перекажи комусь одну прочитану новину як почуту.",
  "Give one reason for something you want, in Estonian, to more than one person.":
    "Назви естонською кільком людям одну причину, чому ти чогось хочеш.",
  "A meeting, a group":
    "Збори, група",
  "Say one number and what it means out loud: it rose, it fell, by how much.":
    "Скажи вголос одне число й що воно означає: зросло, впало, на скільки.",
  "Work, the news":
    "Робота, новини",
  "Say what you thought of something you read or watched, and one reason.":
    "Скажи, що ти думаєш про прочитане чи побачене, і назви одну причину.",
  "Describe a problem with a device in Estonian: one sentence for what it does, and one for what you tried.":
    "Опиши естонською проблему з якимось пристроєм: одне речення про те, що відбувається, і одне про те, що вже пробували зробити.",
  "Home, a shop":
    "Удома, крамниця",
  "Say you disagree with something, politely, in Estonian.":
    "Ввічливо вислови естонською незгоду з чимось.",
  "Work, a class":
    "Робота, заняття",
  "Recommend something to somebody and say why it's better than another.":
    "Порадь комусь щось і скажи, чим це краще за інше.",
  "With a friend":
    "З другом",
  "Ask somebody how they are, and ask one more question about the answer.":
    "Запитай когось, як справи, і постав ще одне запитання щодо відповіді.",
  "With a friend, work":
    "З другом, робота",
  "Ask for something at work using would: I would like, could we.":
    "Попроси про щось на роботі в умовному способі: я б хотів (хотіла), чи не могли б ми.",
  "Hold your ground politely when somebody says no.":
    "Ввічливо стій на своєму, коли тобі кажуть «ні».",
  "Ask an office what happens next and when, and stay in Estonian.":
    "Запитай в установі, що буде далі й коли, і не переходь на англійську.",
  "An office":
    "Установа",
  "Read one official letter or notice and tell somebody what it asks of you.":
    "Прочитай один офіційний лист чи оголошення й розкажи комусь, чого від тебе в ньому хочуть.",
  "Home, an office":
    "Удома, установа",
  "Make one call to an office and give a reference number in Estonian.":
    "Зателефонуй в одну установу й назви номер справи естонською.",
  "On the phone":
    "Телефоном",
  "Ask a teacher or a colleague one follow-up question rather than nodding.":
    "Постав учителеві чи колезі одне уточнювальне запитання, а не просто кивай.",
  "A school, work":
    "Школа, робота",
  "Find out what number to call in an emergency, and say your address out loud in Estonian.":
    "Дізнайся, за яким номером дзвонити в разі надзвичайної ситуації, і промов свою адресу вголос естонською.",
  "Ask at a bank or a counter what you need to bring, in Estonian.":
    "Запитай у банку чи біля віконця естонською, що треба принести з собою.",
  "A bank, an office":
    "Банк, установа",
  "Ask how often to take something, and say it back.":
    "Запитай, як часто щось приймати, і повтори відповідь.",
  "A doctor, a pharmacy":
    "Лікар, аптека",
  "A desk, a shop, work":
    "Віконце, магазин, робота",
  "Anywhere":
    "Будь-де",
  "Work":
    "Робота",
  "the stairwell":
    "під'їзд",
  "Home":
    "Дім",
  "a friend":
    "друг",
  "A form":
    "Бланк",
  "A health center":
    "Поліклініка",
  "a salon":
    "салон",
  "A neighbor":
    "Сусід",
  "a colleague":
    "колега",
  "work":
    "робота",
  "a party":
    "вечірка",
  "a landlord":
    "орендодавець",
  "a helpdesk":
    "служба підтримки",
  "A stop":
    "Зупинка",
  "a platform":
    "платформа",
  "a class":
    "навчальна група",
  "a stairwell":
    "під'їзд",

  // TODAY: THE WORD OF THE DAY.
  "Word of the day":
    "Слово дня",
  "You've already met every word we could pick for today. Have a browse in the dictionary, and there'll be a new one here tomorrow.":
    "Усі слова, які ми могли вибрати на сьогодні, тобі вже траплялися. Зазирни до словника, а завтра тут буде нове.",
  "Open the dictionary":
    "Відкрити словник",
  "new to you":
    "нове для тебе",
  "Hear {word}":
    "Послухати {word}",

  // THE CLIMB TO THE LEVEL THEY ARE AIMING AT.
  "{part}, day {day}":
    "{part}, день {day}",
  "{credited} of {total} words":
    "Слів: {credited} з {total}",
  "You've reached {target}":
    "Рівень {target} досягнуто",
  "On the way to {target}":
    "На шляху до {target}",
  "{n} you've shown you know":
    "{n} уже підтверджено",
  "{n} counted from your level":
    "{n} зараховано за рівнем",
  "This level is done.":
    "Цей рівень пройдено.",
  "{pct}% done.":
    "Пройдено {pct}%.",
  "Counted from your level: {shown} of {words} shown in your reviews so far.":
    "Зараховано за твоїм рівнем: у повтореннях поки підтверджено {shown} з {words}.",
  "{parts} parts.":
    "Частин: {parts}.",
  "How this bar fills up":
    "Як заповнюється ця смуга",
  "You know every word this level asks for. There's nothing new left in it.":
    "Ти знаєш усі слова, потрібні на цьому рівні. Нового в ньому не лишилося.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you check off an evening. You're on {part}.":
    "Пройдено {pct}% шляху від початку {start} до {target}. Суцільна частина росте, лише коли слово справді закріпилося в повтореннях, а не коли ти позначаєш вечір. Зараз ти тут: {part}.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you check off an evening.":
    "Пройдено {pct}% шляху від початку {start} до {target}. Суцільна частина росте, лише коли слово справді закріпилося в повтореннях, а не коли ти позначаєш вечір.",
  "Every level up to {target} counts as yours already, and the evenings check it word by word.":
    "Усі рівні до {target} уже зараховано тобі, а вечори перевіряють їх слово за словом.",
  "Pick a target in Settings and this bar shows how far you are from it.":
    "Обери мету в налаштуваннях, і ця шкала покаже, скільки тобі до неї лишилося.",
  "Your level check put you at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "Перевірка рівня показала {level}, тож {levels} ми зарахували тобі. Нічого нижче твого рівня проходити заново не доведеться.",
  "You told us you're at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "За твоїми словами, у тебе рівень {level}, тож {levels} ми зарахували тобі. Нічого нижче твого рівня проходити заново не доведеться.",
  "First steps":
    "Перші кроки",
  "Everyday Estonian":
    "Естонська на щодень",
  "Independent user":
    "Незалежний користувач",
  "Confident user":
    "Впевнений користувач",
  "Proficient user":
    "Досвідчений користувач",
  "You can make yourself understood in a shop, a café and a first introduction.":
    "Ти можеш порозумітися в магазині, у кав'ярні та під час першого знайомства.",
  "You can hold a simple conversation about your day, your family and your plans.":
    "Ти можеш підтримати просту розмову про свій день, родину й плани.",
  "You can explain, disagree and handle the unexpected without switching to English.":
    "Ти можеш пояснити, заперечити й упоратися з несподіваним, не переходячи на англійську.",
  "You can live in Estonian: phone an office, the doctor or the school and get what you called for, and write every text the B2 exam sets.":
    "Ти можеш жити естонською: зателефонувати до установи, лікаря чи школи й домогтися того, заради чого телефонуєш, і написати кожен текст іспиту B2.",
  "You can be yourself in Estonian: as funny, as precise and as firm as in your own language, at work, at a public meeting and on paper.":
    "Ти можеш бути собою естонською: таким самим дотепним, точним і твердим, як своєю мовою, на роботі, на громадських зборах і на папері.",

  // THE MODULE SCREEN.
  "Your evenings, already planned":
    "Твої вечори вже сплановано",
  "{evenings} short evenings, from your very first word all the way to C1. We've planned every one.":
    "Від найпершого слова аж до C1: {evenings}. Усі вони короткі, і кожен ми вже спланували.",
  "You've been choosing what to do each evening. Starting this won't change anything else.":
    "Досі вибір, чим займатися щовечора, був за тобою. Якщо почати курс, більше нічого не зміниться.",
  "It starts at {start}, where you are now. You can step off it whenever you like, and everything else in the app stays where it is.":
    "Курс починається з {start}, там, де ти зараз. Зійти з нього можна будь-коли, і все інше в застосунку лишається на своїх місцях.",
  "It starts at {start}, the level after the {level} you already have. You can step off it whenever you like, and everything else in the app stays where it is.":
    "Курс починається з {start}, наступного рівня після твого {level}. Зійти з нього можна будь-коли, і все інше в застосунку лишається на своїх місцях.",
  "{part} is finished":
    "Частину «{part}» пройдено",
  "All {total} evenings done. Every word you met is in your reviews now.":
    "Усі вечори пройдено, їх було {total}. Кожне слово, яке тобі трапилося, тепер у твоїх повтореннях.",
  "our guess, not a rule":
    "наше припущення, а не правило",
  "Not ready for {part} yet":
    "До частини {part} поки зарано",
  "We'd give it a few more days to settle before you build the next part on it.":
    "Ми б дали вивченому ще кілька днів улягтися, перш ніж будувати на ньому наступну частину.",
  "Start {part} anyway":
    "Усе одно почати частину {part}",
  "Review what's due":
    "Повторити картки на сьогодні",
  "Next is {part} ({about}). It picks up where this one stopped, and it only asks about things you've already met.":
    "Далі частина {part} ({about}). Вона починається там, де закінчилася ця, і питає лише про те, що тобі вже траплялося.",
  "Every word in the course is in your reviews, and each one will come back just as you're about to forget it.":
    "Усі слова курсу у твоїх повтореннях, і кожне повернеться саме тоді, коли ти почнеш його забувати.",
  "See what you could handle out there":
    "Що тобі вже під силу в житті",
  "Start {part}":
    "Почати частину {part}",
  "Next up: {part}":
    "Далі: {part}",
  "You finished {part}. {canDo}":
    "Частину {part} пройдено. {canDo}",
  "That was the last evening of {part}. Tomorrow you start {next}.":
    "Це був останній вечір частини {part}. Завтра починається {next}.",
  "The planned course is off, so this is what's due. {turnOn}":
    "Курс за планом вимкнено, тож тут те, що час повторити. {turnOn}",
  "Turn it back on":
    "Увімкнути знову",
  "Open the course":
    "Відкрити курс",
  "Today's module is done":
    "Заняття на сьогодні пройдено",
  "{run} evenings in a row now, and {done} of {total} finished.":
    "Вечорів поспіль: {run}, пройдено {done} з {total}.",
  "{done} of {total} evenings finished. See you tomorrow!":
    "Пройдено вечорів: {done} з {total}. До завтра!",
  "Come back tomorrow for {unit}.":
    "Повертайся завтра: попереду розділ «{unit}».",
  "Come back tomorrow for {unit} ({english}).":
    "Повертайся завтра: попереду {unit} ({english}).",
  "Stopping here gives today's words time to settle.":
    "Якщо зупинитися зараз, сьогоднішні слова встигнуть улягтися.",
  "Hear today's words once more":
    "Послухати сьогоднішні слова ще раз",
  "Start the next one now":
    "Почати наступний зараз",
  "Back to Today":
    "На головну",
  "{done} of {total}":
    "{done} з {total}",
  "Where you are":
    "Де ти зараз",
  "Day {day} of {total}, part {n} of {of}":
    "День {day} з {total}, частина {n} з {of}",
  "By the end of this unit":
    "Наприкінці цього розділу",
  "{words} again":
    "{words} на повторення",
  "0m":
    "0 хв",
  "{minutes}m":
    "{minutes} хв",
  "left":
    "лишилось",
  "min":
    "хв",
  "Today's words":
    "Слова на сьогодні",
  "A few of these aren't in your deck yet. The first step adds them.":
    "Деяких із них ще немає у твоїй колоді. Перший крок їх додасть.",
  "How a step gets checked off":
    "Як позначається крок",
  "Meeting the words and the review at the end check themselves off as you answer. The others you check off yourself, because we can't tell which exercise an answer came from.":
    "Знайомство зі словами й повторення наприкінці позначаються самі, поки ти відповідаєш. Решту позначаєш ти, бо ми не бачимо, з якої вправи прийшла відповідь.",
  "{done} of {total} evenings":
    "Вечорів: {done} з {total}",
  "This part":
    "Ця частина",
  "evenings {from} to {to}":
    "вечори з {from} до {to}",
  "evening {n}":
    "вечір {n}",
  "The whole course, {parts}":
    "Увесь курс, {parts}",
  "You don't have to follow it.":
    "Дотримуватися його не обов'язково.",
  "{link} whenever you'd rather choose for yourself.":
    "{link}, коли захочеться вибирати самостійно.",
  "Turn it off":
    "Вимкнути",
  "The whole course":
    "Увесь курс",
  "Every part, by name":
    "Усі частини за назвами",
  "You are here":
    "Ти тут",
  "based on your last two weeks":
    "за твоїми останніми двома тижнями",

  // THE STEPS OF AN EVENING.
  "Go over today's {words}":
    "Повторити {words} на сьогодні",
  "Learn today's {newWords}":
    "Вивчити {newWords}",
  "Learn today's {newWords}, and {met} from earlier":
    "Вивчити {newWords} і повторити знайомі ({met})",
  "Every one of these is from earlier in the course. Today they come back for what the page is about.":
    "Усі ці слова вже були в курсі раніше. Сьогодні вони повертаються заради того, про що ця сторінка.",
  "Hear each word and see what it means. A few minutes later you pick it out of four.":
    "Послухай кожне слово й подивись, що воно означає. За кілька хвилин ти обереш його з чотирьох.",
  "See what each word means, pick it out of four a little later, then type it into a real Estonian sentence.":
    "Подивись, що означає кожне слово, трохи згодом обери його з чотирьох, а потім впиши у справжнє естонське речення.",
  "Read how today's words work":
    "Прочитати, як влаштовані сьогоднішні слова",
  "One short page on the grammar behind today's words, shown in real sentences.":
    "Коротка сторінка про граматику, на якій тримаються сьогоднішні слова, з прикладами справжніх речень.",
  "{title} again":
    "{title} (ще раз)",
  "Read \"{title}\"":
    "Прочитати «{title}»",
  "Read about the -{suffix} ending, \"{plain}\"":
    "Прочитати про закінчення -{suffix}, «{plain}»",
  "Read about the -{suffix} ending":
    "Прочитати про закінчення -{suffix}",
  "Read about {name}, \"{plain}\"":
    "Прочитати про відмінок {name}, «{plain}»",
  "Read about {name}":
    "Прочитати про відмінок {name}",
  "The past tense of one verb":
    "Минулий час одного дієслова",
  "The past tense of {verbs}":
    "Минулий час: {verbs}",
  "Estonian verbs don't all change the same way in the past, so you learn each one on its own. Listen to them, then try three quick questions.":
    "У минулому часі естонські дієслова змінюються по-різному, тож кожне вчать окремо. Послухай їх, а потім відповідай на три швидкі запитання.",
  "{title}, again at your level":
    "{title}: знову, на твоєму рівні",
  "The conversation":
    "Розмова",
  "Have the conversation":
    "Поговорити естонською",
  "You've had this one before. Today they talk to you the way they'd talk to anybody, and you've got far more to say back.":
    "Ця розмова в тебе вже була. Сьогодні з тобою говорять так, як говорили б із будь-ким, а відповісти ти тепер можеш значно більше.",
  "Somebody wants something from you, and only Estonian will do.":
    "Комусь щось від тебе потрібно, і впоратися можна лише естонською.",
  "A quick review, then you're done":
    "Коротке повторення, і на сьогодні все",
  "A few minutes on the words you're about to forget, today's included.":
    "Кілька хвилин на слова, які ти ось-ось забудеш, зокрема сьогоднішні.",
  "Pair each word with its meaning against the clock.":
    "З'єднуй кожне слово з його значенням на час.",
  "The same words, but this time you only hear them.":
    "Ті самі слова, але тепер ти їх лише чуєш.",
  "A race through the words you've met, and their endings once you've read about them.":
    "Перегони зі знайомими словами, а коли прочитаєш про закінчення, то й із закінченнями.",
  "Put a real Estonian sentence back together, word by word.":
    "Збери справжнє естонське речення слово за словом.",
  "Hear a whole sentence and write it down. It's good practice for hearing long and short vowels.":
    "Послухай ціле речення й запиши його. Це добре тренування, щоб розрізняти на слух довгі й короткі голосні.",
  "Look at a picture and write one sentence of your own about it.":
    "Подивись на картинку й напиши про неї одне своє речення.",
  "Guess today's six-letter word. About three minutes.":
    "Вгадай слово дня з шести літер. Хвилини три.",
  "Four versions of one word, and a question telling you which one to hit. Only the ending tells them apart, so you learn to read it fast.":
    "Чотири варіанти одного слова й запитання, яке підказує, у який влучити. Відрізняються вони лише закінченням, тож ти вчишся швидко його читати.",
  "One verb, six people: I, you, she and the rest.":
    "Одне дієслово, шість осіб: я, ти, вона й решта.",
  "Say today's words out loud: along with a native speaker, back from the recording, then from their meaning. You see which words were heard, and typing works too.":
    "Скажи вголос слова цього вечора: разом із носієм мови, за записом, потім за значенням. Видно, які слова розпізнано, а ще можна друкувати.",
  "Write a sentence of your own with the ending we ask for. We check that word against the dictionary before anything else.":
    "Напиши своє речення із закінченням, яке ми просимо. Це слово ми насамперед звіряємо зі словником.",
  "Aitan sind, but helistan sulle. Every verb chooses its own ending for whatever comes after it, and English gives you no clue, so you learn them one verb at a time.":
    "Aitan sind, але helistan sulle, хоча українською в обох випадках «тобі». Кожне дієслово саме вибирає закінчення для слова після нього, тож їх учать по одному дієслову.",
  "The words that don't follow the usual ending rules. See each one, then write it yourself.":
    "Слова, які не підкоряються звичайним правилам закінчень. Подивись на кожне, потім напиши його самостійно.",
  "A word you know, with its letters shuffled. Put them back in order.":
    "Знайоме слово з перемішаними літерами. Розстав їх по порядку.",
  "Words you've already met, asked in new ways: read aloud, missing from a sentence, or in a sentence you write.":
    "Знайомі слова в нових запитаннях: на слух, із пропуском у реченні або у твоєму власному реченні.",

  // THE STEP LIST AND THE MODULE'S OWN CHROME.
  "{graded} of {needed} answer done. Keep going and this checks itself off.":
    "Відповідей: {graded} з {needed}. Продовжуй, і крок позначиться сам.",
  "{graded} of {needed} answers done. Keep going and this checks itself off.":
    "Відповідей: {graded} з {needed}. Продовжуй, і крок позначиться сам.",
  "Done, going by your answers":
    "Готово, судячи з твоїх відповідей",
  "Done":
    "Готово",
  "I did this":
    "Позначити як зроблене",
  "Start":
    "Почати",
  "{minutes} min, once this one's done":
    "{minutes} хв, після цього кроку",
  "That didn't reach us.":
    "До нас це не дійшло.",
  "Nothing has changed.":
    "Нічого не змінилося.",
  "Try again":
    "Спробувати ще раз",
  "That didn't go through, so nothing has changed. Try again in a moment.":
    "Не вийшло, тож нічого не змінилося. Спробуй ще раз трохи згодом.",
  "Stop following the course":
    "Більше не йти за курсом",
  "Start the course":
    "Почати курс",
  "Not now":
    "Не зараз",
  "Got it":
    "Зрозуміло",
  "That's the end of the page":
    "Це кінець сторінки",
  "Move on and that's step {n} of {of} done.":
    "Переходь далі, і крок {n} з {of} буде зараховано.",
  "That didn't reach us, so this step isn't checked off yet.":
    "До нас це не дійшло, тож крок поки не позначено.",
  "Finish today's module":
    "Завершити заняття",
  "Next, step {n}: {title}":
    "Далі, крок {n}: {title}",
  "Next, step {n}":
    "Далі, крок {n}",
  "Leave today's module and go back to Today":
    "Вийти із сьогоднішнього заняття й повернутися на головну",
  "Leave":
    "Вийти",
  "Step {n} of {of}":
    "Крок {n} з {of}",
  "Finish":
    "Завершити",
  "Next step":
    "Наступний крок",
  "You're still on this step.":
    "Ти все ще на цьому кроці.",
  "Back to today's module":
    "Назад до заняття на сьогодні",

  // THE PAST FORMS STEP.
  "The past of your verbs":
    "Минулий час твоїх дієслів",
  "Each verb makes its past its own way, so learn them a few at a time. Listen, then try three.":
    "Кожне дієслово утворює минулий час по-своєму, тож учи їх потроху. Послухай, а потім відповідай на три запитання.",
  "No verbs to learn here today":
    "Сьогодні тут немає дієслів",
  "We don't have the past forms of today's verbs yet. Carry on to the next step.":
    "Форм минулого часу для сьогоднішніх дієслів у нас поки немає. Переходь до наступного кроку.",
  "the ones you've met":
    "ті, що вже траплялися",
  "Each one makes its past and its polite command its own way. Listen and read them; nothing here is asked.":
    "Кожне дієслово утворює минулий час і ввічливий наказ по-своєму. Послухай і прочитай, тут нічого не питають.",
  "Today's verbs":
    "Дієслова на сьогодні",

  // TRY IT: THE READING ASKS BACK.
  "You looked the forms up in the table.":
    "Форми підглянуто в таблиці.",
  "You got every one right. Later today you'll get questions like these about today's words.":
    "Усі відповіді правильні. Пізніше сьогодні будуть схожі запитання про сьогоднішні слова.",
  "You got every one right.":
    "Усі відповіді правильні.",
  "Glance back at the table whenever a form looks odd.":
    "Якщо форма здається дивною, зазирни в таблицю.",
  "{n} of {total}, just practice":
    "{n} з {total}, просто тренування",
  "Try it":
    "Спробуй",
  "Which form":
    "Яка форма",
  "hear it":
    "послухати",
  "{lemma} means {translation}. Which one is \"I\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «я»?",
  "{lemma} means {translation}. Which one is \"I would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «я б»?",
  "{lemma} means {translation}. Which one is \"you\", talking to one person?":
    "Слово {lemma} означає «{translation}». Яка форма для «ти», коли звертаєшся до однієї людини?",
  "{lemma} means {translation}. Which one is \"you would\", talking to one person?":
    "Слово {lemma} означає «{translation}». Яка форма для «ти б», коли звертаєшся до однієї людини?",
  "{lemma} means {translation}. Which one is \"he or she\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «він або вона»?",
  "{lemma} means {translation}. Which one is \"he or she would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «він (вона) б»?",
  "{lemma} means {translation}. Which one is \"we\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «ми»?",
  "{lemma} means {translation}. Which one is \"we would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «ми б»?",
  "{lemma} means {translation}. Which one is \"you\", talking to several people or politely?":
    "Слово {lemma} означає «{translation}». Яка форма для «ви», коли звертаєшся до кількох людей або ввічливо?",
  "{lemma} means {translation}. Which one is \"you would\", talking to several people or politely?":
    "Слово {lemma} означає «{translation}». Яка форма для «ви б», коли звертаєшся до кількох людей або ввічливо?",
  "{lemma} means {translation}. Which one is \"they\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «вони»?",
  "{lemma} means {translation}. Which one is \"they would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «вони б»?",
  "Yes. {value} is {lemma} for {pronoun}.":
    "Так. Для {pronoun} дієслово {lemma} має форму {value}.",
  "Yes. {value} is {lemma} for {pronoun}, and for {shared} too.":
    "Так. Для {pronoun} дієслово {lemma} має форму {value}, як і для {shared}.",
  "Not that one. With {pronoun} it's {value}.":
    "Не ця. Для «{pronoun}» буде {value}.",
  "Not that one. With {pronoun} it's {value}, and the same with {shared}.":
    "Не ця. Для «{pronoun}» буде {value}, і для {shared} так само.",
  "{lemma} means {translation}. Which one says \"not\"?":
    "Слово {lemma} означає «{translation}». Яка форма означає «не»?",
  "{lemma} means {translation}. Which one tells somebody to do it?":
    "Слово {lemma} означає «{translation}». Яка форма велить комусь це зробити?",
  "Yes. {answer} is how you say not with {lemma}, {translation}.":
    "Так, {answer}: так звучить заперечення дієслова {lemma}, «{translation}».",
  "Yes. {answer} is how you tell one person to do it with {lemma}, {translation}.":
    "Так, {answer}: так дієсловом {lemma}, «{translation}», просять одну людину щось зробити.",
  "Not that one. For {lemma}, it's {answer}.":
    "Не ця. У {lemma} буде {answer}.",
  "{lemma} means {translation}. Which one says \"I did it\", back in the past?":
    "Слово {lemma} означає «{translation}». Яка форма для «я» в минулому часі?",
  "{lemma} means {translation}. Which one says \"he or she did it\", back in the past?":
    "Слово {lemma} означає «{translation}». Яка форма про минуле, коли це зробив «він» або «вона»?",
  "Yes. {answer} is the past, when you did it yourself. {now} is happening right now.":
    "Так. {answer} показує минуле для «я», а {now} те, що відбувається зараз.",
  "Yes. {answer} is the past, when somebody else did it. {now} is happening right now.":
    "Так. {answer} означає минуле, коли це робив хтось інший, а {now} означає те, що відбувається зараз.",
  "Not that one. {answer} is the past, when you did it yourself.":
    "Не ця. Минуле для «я» показує {answer}.",
  "Not that one. {answer} is the past, when somebody else did it.":
    "Не ця. Минуле, коли це робив хтось інший, показує {answer}.",
  "{lemma} means {translation}. Which one says \"{reading}\"?":
    "Слово {lemma} означає «{translation}». Яка форма означає «{reading}»?",
  "Which one is {lemma}, {translation}, in the {case}?":
    "Яка форма слова {lemma}, «{translation}», у відмінку {case}?",
  "Yes. {form} is {lemma} in the {case}.":
    "Так, {form}: {lemma} у відмінку {case}.",
  "Yes. {form} is {lemma} in the {case}. It's {stem} with {ending} on the end.":
    "Так, {form}: {lemma} у відмінку {case}. Тут до {stem} додано закінчення {ending}.",
  "Not that one. {lemma} becomes {form}.":
    "Не ця. {lemma} стає {form}.",
  "Not that one. {lemma} becomes {form}. It's {stem} with {ending} on the end.":
    "Не ця. {lemma} стає {form}. Тут до {stem} додано закінчення {ending}.",

  // WHETHER THIS IS THE RIGHT PART, AND THE HAND-OFF.
  "You're flying through this":
    "У тебе все йде гладко",
  "You're flying through the top of the course":
    "Ти легко долаєш найвищий рівень курсу",
  "This part is a tough one":
    "Ця частина непроста",
  "Lately you've been getting every answer right.":
    "Останнім часом ти правильно відповідаєш на все.",
  "Lately you've been getting {seen} out of a hundred right.":
    "Останнім часом ти правильно відповідаєш на {seen} зі ста.",
  "If this part feels too easy, skip ahead to {part}. Everything from this one stays in your reviews either way.":
    "Якщо ця частина здається надто легкою, переходь одразу до частини {part}. Усе з цієї частини в будь-якому разі лишиться у твоїх повтореннях.",
  "There's no part above this one, so stretch yourself with your reviews and the tougher conversations.":
    "Вище цієї частини нічого немає, тож випробуй себе в повтореннях і складніших розмовах.",
  "A lot of recent answers have been misses. This part is a step ahead of you for now.":
    "Багато останніх відповідей були неправильними. Ця частина поки на крок попереду тебе.",
  "Lately you've been getting {seen} out of a hundred right. This part is a step ahead of you for now.":
    "Останнім часом ти правильно відповідаєш на {seen} зі ста. Ця частина поки на крок попереду тебе.",
  "Your reviews will bring back the words that are slipping. Give it a few days.":
    "Повторення повернуть слова, які вислизають. Дай їм кілька днів.",
  "The level you started at was a first guess. Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Стартовий рівень був лише першим припущенням. Якщо спершу повторити {level}, ця частина стане значно легшою. Це просто освіжить знання, а ця частина тебе зачекає.",
  "Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Якщо спершу повторити {level}, ця частина стане значно легшою. Це просто освіжить знання, а ця частина тебе зачекає.",
  "{part} is the part you skipped, and this one leans on it. Going back fills in the gaps.":
    "Частину {part} пропущено, а ця на неї спирається. Якщо повернутися, прогалини заповняться.",
  "Refresh {level} first":
    "Спершу освіжити {level}",
  "Go back to {part}":
    "Повернутися до частини {part}",
  "Skip ahead to {part}":
    "Перейти одразу до частини {part}",
  "For now, recordings play a little slower and conversations start a little simpler. That goes back to normal on its own as your answers pick up.":
    "Поки що записи звучать трохи повільніше, а розмови починаються трохи простіше. Усе саме повернеться до звичного, щойно відповіді покращаться.",
  "For now, recordings play a little slower. That goes back to normal on its own as your answers pick up.":
    "Поки що записи звучать трохи повільніше. Усе саме повернеться до звичного, щойно відповіді покращаться.",
  "For now, conversations start a little simpler. That goes back to normal on its own as your answers pick up.":
    "Поки що розмови починаються трохи простіше. Усе саме повернеться до звичного, щойно відповіді покращаться.",
  "For now, conversations start a little harder and recordings play a little quicker. If your answers change, that goes back to normal on its own.":
    "Поки що розмови починаються трохи складніше, а записи звучать трохи швидше. Якщо відповіді зміняться, усе саме повернеться до звичного.",
  "For now, conversations start a little harder. If your answers change, that goes back to normal on its own.":
    "Поки що розмови починаються трохи складніше. Якщо відповіді зміняться, усе саме повернеться до звичного.",
  "For now, recordings play a little quicker. If your answers change, that goes back to normal on its own.":
    "Поки що записи звучать трохи швидше. Якщо відповіді зміняться, усе саме повернеться до звичного.",
  "So far, {seen} out of every hundred words from that part have stuck. The rest are waiting in your reviews, and they'll keep coming back until they do.":
    "Поки запам'яталися {seen} з кожної сотні слів цієї частини. Решта чекає в повтореннях і повертатиметься, доки не закріпиться.",
  "Right now you're getting {seen} out of a hundred answers right. Moving on to a harder part would only bring that down.":
    "Зараз ти відповідаєш правильно на {seen} зі ста. Якщо перейти до складнішої частини, це число лише впаде.",
  "Give it a few more days of reviews and that number will climb.":
    "Ще кілька днів повторень, і це число зросте.",
  "Your reviews already know which words are giving you trouble.":
    "Повторення вже знають, які слова даються тобі важко.",

  // THE PARTS OF THE COURSE: WHAT EACH IS ABOUT, AND WHAT FINISHING IT MEANS.
  "Hello, you and me, the verb to be, and the people around you":
    "Вітання, ти і я, дієслово «бути» і люди навколо тебе",
  "Your name, numbers, your home, and the verbs you'll use every day":
    "Твоє ім'я, числа, твій дім і дієслова на щодень",
  "Your name and where you live, how to count, the rooms of your home, and the eleven commonest verbs. By the end you can introduce yourself, count, and describe where you live.":
    "Твоє ім'я й де ти живеш, як рахувати, кімнати твого дому та одинадцять найуживаніших дієслів. Наприкінці ти зможеш представитися, порахувати й описати, де живеш.",
  "Food, the time, your day, and what things are like":
    "Їжа, час, твій день і які бувають речі",
  "Food and drink, the days and the clock, what you do from morning to night, and your first words for what things look like, colors included. By the end you can say what you're doing, when, and what it's like.":
    "Їжа й напої, дні тижня й години, що ти робиш з ранку до вечора, і перші слова про те, який вигляд мають речі, зокрема кольори. Наприкінці ти зможеш сказати, що робиш, коли і який усе це має вигляд.",
  "Clothes, weather, prices, and a shop":
    "Одяг, погода, ціни й магазин",
  "What you're wearing, what the weather's doing, the bigger numbers you need for prices, and then a shop to put it all to work in. By the end you can describe what you want and buy it.":
    "Що на тобі вдягнено, яка погода, великі числа, потрібні для цін, а потім магазин, де все це знадобиться. Наприкінці ти зможеш описати, що тобі потрібно, і купити це.",
  "Where things are, the bus, somebody and something, and when":
    "Де що розташоване, автобус, хтось і щось, і коли",
  "Where things are and where you're heading, getting around by bus, words like somebody and nothing, and talking about when. By the end you can ask where something is, catch a bus there, and say when you arrived.":
    "Де що розташоване й куди ти прямуєш, як їздити автобусом, слова на кшталт «хтось» і «нічого» і розмова про те, коли що відбувається. Наприкінці ти зможеш спитати, де щось розташоване, доїхати туди автобусом і сказати, коли приїхав (приїхала).",
  "Joining words, the calendar, and where people are from":
    "Слова-зв'язки, календар і звідки люди родом",
  "Words for joining two thoughts or saying how sure you are, the months and the holidays, where people come from, and a few animals and parts of the body. By the end you can link two ideas and say when something happens.":
    "Слова, що поєднують дві думки або показують ступінь упевненості, місяці й свята, звідки люди родом, а ще трохи про тварин і частини тіла. Наприкінці ти зможеш поєднати дві думки й сказати, коли щось відбувається.",
  "How things are done, more everyday words, and asking for help":
    "Як що робиться, ще повсякденні слова й прохання про допомогу",
  "The last of A1. Words for how something was done, and the small words that change what a verb means. Then more of the everyday: food, places in town and the people who work there, ten verbs every child knows and ten more describing words. It ends on asking for help, and by then you have every word A1 asks for.":
    "Остання частина A1. Слова про те, як щось зроблено, і маленькі слова, що змінюють значення дієслова. Потім ще повсякденне: їжа, місця в місті й люди, які там працюють, десять дієслів, які знає будь-яка дитина, і ще десять слів для опису. Завершується все проханням про допомогу, і на той час у тебе будуть усі слова, потрібні для A1.",
  "Asking for things, yesterday, the outdoors, the body and the house":
    "Прохання, учорашній день, природа, тіло й дім",
  "School, travel, the town, a free afternoon, and comparing things":
    "Навчання, подорожі, місто, вільний день і порівняння",
  "Life outside your front door: school, trips, the town, your weekends, and saying which of two things is better. There are conversations to practice on along the way. By the end you can buy a ticket, ask the way and say what you did on Saturday.":
    "Життя за порогом дому: навчання, подорожі, місто, твої вихідні і як сказати, яка з двох речей краща. Дорогою на тебе чекають розмови для практики. Наприкінці ти зможеш купити квиток, спитати дорогу й розповісти, що робив (робила) в суботу.",
  "Eating out, making plans, keeping in touch, and how you feel":
    "Кафе й ресторани, плани, спілкування й почуття",
  "Talking about what hasn't happened yet, keeping in touch, and saying how you feel about it all. It's full of conversations. By the end you can get through a whole meal in Estonian, book an appointment and call somebody about it.":
    "Розмова про те, що ще не сталося, спілкування з людьми і як сказати, що ти про все це відчуваєш. Тут багато розмов. Наприкінці ти зможеш пообідати в ресторані цілком естонською, записатися на прийом і зателефонувати з цього приводу.",
  "Objects, the people in your life, what each verb asks for, money, and would":
    "Додаток у реченні, люди у твоєму житті, чого вимагає кожне дієслово, гроші й «б»",
  "School, two new past forms, renting, what people are like, and the news":
    "Навчання, дві нові форми минулого, оренда, які бувають люди й новини",
  "School and a job interview first. Then the verb forms ending in -nud and -tud, and the two past tenses built from them. Then renting an apartment, what people are like, and the news, which leans on those same forms to say what happened without saying who did it. By the end you can get through an interview, read a news story and phone a landlord.":
    "Спершу навчання й співбесіда на роботу. Потім дієслівні форми на -nud і -tud та два минулі часи, що з них будуються. Потім оренда квартири, які бувають люди й новини, де ті самі форми допомагають сказати, що сталося, не називаючи, хто це зробив. Наприкінці ти зможеш пройти співбесіду, прочитати новину й зателефонувати орендодавцеві.",
  "Technology, opinions, the environment, things going wrong, and two-part verbs":
    "Технології, думки, довкілля, коли щось іде не так, і дієслова з двох частин",
  "Disagreeing with somebody, the things the papers argue about, and coping when something breaks. B1 ends on verbs that come in two parts, because they follow the same object rule you met at the start of B1. By the end you can argue your side without switching to English.":
    "Як сперечатися зі співрозмовником, про що сперечаються в газетах і як упоратися, коли щось зламалося. B1 завершується дієсловами з двох частин, бо вони підкоряються тому самому правилу додатка, що й на початку B1. Наприкінці ти зможеш обстояти свою думку, не переходячи на англійську.",
  "Leaving out who did it, society, hearsay, the economy, and doing two things at once":
    "Без вказівки, хто це зробив, суспільство, переказ, економіка й дві дії одночасно",
  "History, building new words, politics, health and science":
    "Історія, творення нових слів, політика, здоров'я й наука",
  "It opens on had done, the past before the past, learned on history, where you'll meet it most. Then how to work out a word you've never seen from one you already know, and three subjects to try it on. By the end you can read an opinion piece on any of them without a dictionary open.":
    "Починаємо з плюсквамперфекта, минулого до минулого, і вчимо його на темі історії, де він трапляється найчастіше. Потім як зрозуміти незнайоме слово за вже знайомим, і три теми, щоб це випробувати. Наприкінці ти зможеш прочитати авторську колонку на будь-яку з цих тем, не відкриваючи словника.",
  "The arts, the law, the mind, working life, figures, and making a case":
    "Мистецтво, право, психологія, робота, цифри й аргументація",
  "The end of B2: the arts, making a proper complaint, describing how people behave, working in Estonian, reading a table of figures, and building an argument that concedes a point.":
    "Кінець B2: мистецтво, як подати справжню скаргу, як описати поведінку людей, робота естонською, читання таблиці з цифрами й аргумент, у якому ти визнаєш слушність співрозмовника в чомусь одному.",
  "Saying more in fewer words, and long sentences that hold together":
    "Сказати більше меншою кількістю слів і довгі речення, що тримаються купи",
  "Ethics, persuasion, how formal to be, idioms, and holding a text together":
    "Етика, переконання, наскільки офіційно говорити, ідіоми й зв'язний текст",
  "Knowing how formal to be and getting it right, winning over somebody who disagrees, and set phrases you learn whole.":
    "Як вибрати потрібний ступінь офіційності й влучити в тон, як переконати незгодного, і сталі вирази, які вчать цілком.",
  "New ideas, the wider world, literature, and words that almost mean the same":
    "Нові ідеї, великий світ, література й майже синоніми",
  "The last part of the course. By the end you've met everything in it.":
    "Остання частина курсу. Наприкінці ти пройдеш усе, що в ньому є.",
  "{pct} percent of today's module done":
    "Сьогоднішнє заняття пройдено на {pct}%",
  "to go today":
    "лишилося на сьогодні",
  "Start today's module":
    "Почати заняття",
  "By the end of today's module":
    "До кінця сьогоднішнього заняття",
  "What you do today":
    "Що на тебе чекає сьогодні",
  "one thing today":
    "одна справа на сьогодні",
  "{things} today":
    "{things} на сьогодні",
  "Plan your week":
    "Спланувати тиждень",
  "Play":
    "Грати",
  "Review cards":
    "Повторити картки",
  "({cards} due, if you'd rather practice what you know)":
    "(час повторити: {cards}, якщо хочеться потренувати те, що вже знаєш)",
  "Review done for today":
    "Повторення на сьогодні готове",
  "({cards} reviewed, nothing else due)":
    "(повторено: {cards}, більше нічого не чекає)",
  "A few more, if you like":
    "Ще трохи, якщо хочеться",
  "about {minutes}":
    "близько {minutes}",
  "Play a word game":
    "Зіграй у словесну гру",
  "An example round: the word for sun, two letters in place and three still to put in order.":
    "Приклад раунду: слово «сонце», дві літери вже на місці, три ще треба розставити.",
  "sun":
    "сонце",
  "An example board: three guesses, each circle marked {here}, {elsewhere} or {absent}.":
    "Приклад поля: три спроби, кожен кружок позначено: {here}, {elsewhere} або {absent}.",
  "Play {e1}":
    "Грати в {e1}",
  "Play now":
    "Грати",
  "Game of the day":
    "Гра дня",
  "{e1}, with a small example board. A new word to guess every morning.":
    "{e1} з маленьким прикладом поля. Щоранку нове слово, яке треба вгадати.",
  "A new word each day, at your level.":
    "Нове слово щодня, за твоїм рівнем.",
  "Your week at a glance, your streak, and anything on your calendar for today.":
    "Огляд твого тижня, серія днів і все, що в тебе в календарі на сьогодні.",
  "One situation to rehearse, picked by the date from the ones your course has reached.":
    "Одна ситуація для репетиції, вибрана за датою з тих, до яких дійшов твій курс.",
  "Progress bar":
    "Шкала прогресу",
  "Guess the Estonian word in six letters.":
    "Вгадай естонське слово з шести літер.",
  "Put a real sentence back together, commas and all.":
    "Збери справжнє речення заново, з усіма комами.",
  "It's Friday, so keep it quiet: words you know, asked in new ways.":
    "П'ятниця, тож без метушні: знайомі слова в нових запитаннях.",
  // TODAY: THE JOKE AND THE GOOD NEWS.
  "Joke of the day":
    "Жарт дня",
  "The joke":
    "Жарт",
  "Hear the joke":
    "Послухати жарт",
  "Show English":
    "Показати англійською",
  "Hide English":
    "Сховати англійську",
  "Tap for the punchline":
    "Натисни, щоб дізнатися кінцівку",
  "Another one@joke":
    "Ще один",
  "Good news today":
    "Добра новина дня",
  "Another one@news":
    "Ще одну",
  "Read it on ERR":
    "Читати на ERR",
  "Read the article":
    "Читати статтю",
  "(opens in a new tab)":
    "(відкриється в новій вкладці)",
  "A Juku joke, the kind every Estonian grew up on, with the English a tap away.":
    "Жарт про Юку, з тих, на яких виріс кожен естонець, з англійським перекладом в один дотик.",
  "One happy headline from ERR, with the dictionary under every word.":
    "Один радісний заголовок з ERR, і під кожним словом словник.",
  },
  counted: {
    "new word": { en: ["new word", "new words"], ru: ["новое слово", "новых слова", "новых слов"], uk: ["нове слово", "нові слова", "нових слів"] },
    "day": { en: ["day", "days"], ru: ["день", "дня", "дней"], uk: ["день", "дні", "днів"] },
    "minute": { en: ["minute", "minutes"], ru: ["минута", "минуты", "минут"], uk: ["хвилина", "хвилини", "хвилин"] },
    "second": { en: ["second", "seconds"], ru: ["секунда", "секунды", "секунд"], uk: ["секунда", "секунди", "секунд"] },
    "thing": { en: ["thing", "things"], ru: ["дело", "дела", "дел"], uk: ["справа", "справи", "справ"] },
    "task": { en: ["task", "tasks"], ru: ["задание", "задания", "заданий"], uk: ["завдання", "завдання", "завдань"] },
    "evening": { en: ["evening", "evenings"], ru: ["вечер", "вечера", "вечеров"], uk: ["вечір", "вечори", "вечорів"] },
    "part": { en: ["part", "parts"], ru: ["часть", "части", "частей"], uk: ["частина", "частини", "частин"] },
  },
};
