import type { Area } from "../area";

/**
 * TODAY AND TONIGHT'S MODULE, IN RUSSIAN AND UKRAINIAN.
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
    "Здравствуйте",
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
    "Ваши первые карточки готовы, всего: {cards}. Это примерно {minutes}.",
  "Cards waiting for you: {cards}. That's about {minutes}.":
    "Вас ждёт: {cards}. Это примерно {minutes}.",
  "Nothing else is due today. Enjoy the rest of your day.":
    "Больше на сегодня повторять нечего. Хорошего вам дня.",
  "{cards} still due, if you fancy a few more.":
    "Если хочется ещё, пора повторить: {cards}.",
  "Nothing else is due today, so tonight's module is all you need to do.":
    "Больше на сегодня повторять нечего, так что вам нужен только урок этого вечера.",
  "{cards} due as well. They'll come up at the end of tonight's module.":
    "Ещё пора повторить: {cards}. Они попадутся в конце урока этого вечера.",
  "{cards} due as well. Tonight's module ends with a few of them, and the review button has the rest.":
    "Ещё пора повторить: {cards}. Урок этого вечера закончится несколькими из них, а остальные откроет кнопка «Начать повторение».",

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
    "Если повторять карточки раньше срока, они запомнятся не лучше. Отдохните или начните что-то новое.",
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
  "Go and practise":
    "К практике",
  "New words waiting for you: {words}. You'll take them {batch} at a time. You see each word in a sentence, pick what it means, then fill it back into the sentence yourself.":
    "Вас ждут новые слова: {words}. Вы будете учить их по {batch} за раз. Вы увидите каждое слово в предложении, выберете, что оно значит, а потом сами вставите его обратно.",
  "Most cards ask you to type or pick the answer. A few just show it and ask whether you knew it. Be honest there: that's how the app knows when to bring each word back.":
    "Большинство карточек просят вписать или выбрать ответ. Некоторые просто показывают его и спрашивают, знали ли вы. Отвечайте честно: так приложение понимает, когда вернуть каждое слово.",
  "No cards yet":
    "Карточек пока нет",
  "Choose a unit to begin with. Its words become cards you can learn, hear and practise.":
    "Выберите раздел, с которого начнёте. Его слова станут карточками, которые можно учить, слушать и тренировать.",
  "Choose your first unit":
    "Выбрать первый раздел",

  // TODAY: TONIGHT'S MODULE, AT THE TOP.
  "Today's module":
    "Урок на сегодня",
  "Day {day} of {days}":
    "День {day} из {days}",
  "Next":
    "Дальше",
  "{pct} percent of tonight done":
    "Урок этого вечера пройден на {pct}%",
  "{minutes} min":
    "{minutes} мин",
  "to go tonight":
    "осталось на этот вечер",
  "Start tonight":
    "Начать урок",
  "Carry on":
    "Продолжить",
  "{done} of {days} done, {run} evenings in a row":
    "Пройдено {done} из {days}, вечеров подряд: {run}",
  "{done} of {days} done":
    "Пройдено {done} из {days}",
  "That's tonight done. Go and enjoy your evening.":
    "На сегодня всё. Хорошего вечера.",
  "Tomorrow you'll carry on with {unit}, part {n} of {of}.":
    "Завтра продолжим раздел «{unit}», часть {n} из {of}.",
  "See you tomorrow for {unit}.":
    "До завтра. Впереди раздел «{unit}».",
  "See you tomorrow for {unit} ({english}).":
    "До завтра. Впереди раздел «{unit}» ({english}).",
  "That was the very last evening of the course. Every word you met along the way will keep coming back in your reviews.":
    "Это был самый последний вечер курса. Все слова, которые вы встретили по пути, будут и дальше возвращаться в повторениях.",
  "See what's next":
    "Что дальше",

  // TODAY: THE RUN OF DAYS.
  "{n} reviewed today":
    "Сегодня повторено: {n}",
  "Your streak":
    "Ваша серия дней",
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
  "What's on today":
    "Что сегодня",
  "See your whole week":
    "Вся неделя",
  "Class":
    "Занятие",
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
    "От вашей группы пока ничего. Когда преподаватель задаст раздел, он появится здесь утром того дня, к которому его нужно сделать.",
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
  "Overdue, ":
    "Просрочено, ",
  "Due ":
    "Срок: ",
  "Mark \"{task}\" as done":
    "Отметить «{task}» как выполненное",
  "Mark \"{task}\" as not done":
    "Отметить «{task}» как невыполненное",

  // TODAY: THE ONE SHORT ROUND.
  "Daily quest":
    "Задание дня",
  "Your {case} is at {pct}%. Give it {length} today.":
    "Падеж {case} пока усвоен на {pct}%. Уделите ему сегодня {length}.",
  "{length} on the cards that trip you up most.":
    "{length} на карточки, на которых вы чаще всего спотыкаетесь.",
  "Start the quest":
    "Начать задание",
  "Today's game":
    "Игра дня",
  "Today's conversation":
    "Разговор дня",
  "Tomorrow's {weekday}, which means {game}.":
    "Завтра {weekday}, а значит, {game}.",
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
    "Короткий раунд на всё, на чём вы спотыкались на этой неделе.",
  "A fresh word to guess every morning. Monday's a good day to start.":
    "Каждое утро новое слово, которое нужно угадать. Понедельник отлично подходит, чтобы начать.",
  "Four versions of one word, and only the ending tells you which to hit.":
    "Четыре варианта одного слова, и только окончание подскажет, в какой попасть.",
  "Midweek, try a real conversation. Order a coffee, buy a bus ticket.":
    "Середина недели: попробуйте настоящий разговор. Закажите кофе, купите билет на автобус.",
  "Pairs against the clock, and a personal best to beat.":
    "Пары на время и личный рекорд, который можно побить.",
  "It's Friday, so keep it short: a quick burst of endings on the clock.":
    "Пятница, так что коротко: быстрый забег по окончаниям на время.",
  "The crossword, for a Saturday with time to spare.":
    "Кроссворд для субботы, когда есть свободное время.",
  "A quiet round on the words you've met, typed from their meaning.":
    "Спокойный раунд на знакомые слова: вы печатаете их по значению.",
  "Unscramble a word you've met. Every letter has its place.":
    "Соберите знакомое слово из букв. У каждой буквы своё место.",
  "Midweek, train your ear: hear a word and pick what it means.":
    "Середина недели, тренируем слух: послушайте слово и выберите, что оно значит.",
  "It's Friday: say this week's words out loud, then hear them said.":
    "Пятница: скажите слова этой недели вслух, а потом послушайте, как они звучат.",
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
    "Не сохранилось. Попробуйте ещё раз, когда снова будете онлайн.",
  "yesterday":
    "вчера",
  "Out there":
    "В жизни",
  "Did you speak any Estonian to anyone yesterday?":
    "Вы вчера говорили с кем-нибудь по-эстонски?",
  "Anything counts. A shop, a colleague, a single sentence at the door.":
    "Считается всё: магазин, коллега, одна фраза у двери.",
  "Whether you spoke Estonian yesterday":
    "Говорили ли вы вчера по-эстонски",
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
  "You spoke Estonian to a real person. That's the hard part, and it's what all of this is for.":
    "Вы говорили по-эстонски с живым человеком. Это самое трудное, и ради этого всё и затевалось.",
  "How did it go?":
    "Как всё прошло?",
  "How the conversation went":
    "Как прошёл разговор",
  "I pressed that by mistake":
    "Ой, это по ошибке",
  "Say it today":
    "Скажите это сегодня",
  "You'll find the words in {unit}.":
    "Нужные слова есть в разделе «{unit}».",
  "Or {try}.":
    "Или {try}.",
  "try it out here first":
    "сначала потренируйтесь здесь",
  "They understood you. That's the whole point of all this.":
    "Вас поняли. Ради этого всё и затевалось.",
  "Getting stuck is just what learning a language out loud looks like. It still counts, and it's on the board.":
    "Сбиться посреди разговора нормально: так и выглядит язык, который учат вслух. Разговор всё равно засчитан.",
  "They switched to English. Next time, keep going in Estonian anyway. Most people switch back.":
    "Собеседник перешёл на русский или английский. В следующий раз всё равно продолжайте по-эстонски: большинство потом возвращаются к эстонскому.",
  "Running out of words costs nothing in a practice conversation, and the person there will wait while you find them.":
    "В тренировочном разговоре не страшно, если не хватает слов: собеседник подождёт, пока вы их найдёте.",
  "They can switch to English in there too, so you can practise steering it back to Estonian.":
    "Там тоже могут перейти на русский, так что можно потренироваться возвращать разговор к эстонскому.",
  "That's your first in the last {days}.":
    "Это ваш первый разговор за последние {days}.",
  "That makes {held} in the last {days}.":
    "Всего разговоров за последние {days}: {held}.",
  "See them all on Progress":
    "Все они в разделе «Прогресс»",
  "Practise one here now":
    "Потренироваться здесь прямо сейчас",
  "Was there a word you wanted and couldn't find?":
    "Было слово, которое вы хотели сказать, но не нашли?",
  "In English or Estonian":
    "По-английски или по-эстонски",
  "Look it up":
    "Найти",
  "Say hello to the first person you deal with today, and thank them on your way out.":
    "Поздоровайтесь с первым человеком, с которым сегодня будете иметь дело, и поблагодарите его, когда будете уходить.",
  "Say sorry in Estonian for something tiny, and tell them you're learning.":
    "Извинитесь по-эстонски за какую-нибудь мелочь и скажите, что учите язык.",
  "Order your coffee in Estonian today. Don't forget the please.":
    "Закажите сегодня кофе по-эстонски. Не забудьте сказать «пожалуйста».",
  "Ask for bread at the counter and say how much you want. Pointing doesn't count.":
    "Попросите у прилавка хлеб и скажите, сколько вам нужно. Показывать пальцем не считается.",
  "Ask what something costs before you peek at the label.":
    "Спросите, сколько что-нибудь стоит, прежде чем заглянуть в ценник.",
  "Ask somebody the time, even if you know it perfectly well.":
    "Спросите у кого-нибудь, который час, даже если прекрасно это знаете.",
  "Ask somebody where something is, and follow the answer without falling back on English.":
    "Спросите у кого-нибудь, где что-то находится, и поймите ответ, не переходя на русский или английский.",
  "Say one sentence about the weather to whoever's waiting next to you.":
    "Скажите одно предложение о погоде тому, кто ждёт рядом с вами.",
  "Tell a colleague or a neighbor one thing about your family.":
    "Расскажите коллеге или соседу что-нибудь одно о своей семье.",
  "Tell somebody what you did today. Three sentences is plenty.":
    "Расскажите кому-нибудь, что вы сегодня делали. Трёх предложений вполне хватит.",
  "Give your phone number in Estonian, digit by digit, and ask them to read it back to you.":
    "Продиктуйте свой номер телефона по-эстонски, цифру за цифрой, и попросите повторить его вам.",
  "In a clothes shop, ask for another size or another color.":
    "В магазине одежды попросите другой размер или другой цвет.",
  "Make one phone call in Estonian. A short one counts.":
    "Сделайте один звонок по-эстонски. Короткий тоже считается.",
  "Book an appointment in Estonian, or just ask about one, and stay in Estonian even if they switch to English.":
    "Запишитесь на приём по-эстонски или просто спросите о записи и не переходите с эстонского, даже если вам ответят по-русски или по-английски.",
  "Arrange to meet somebody in Estonian, with a day and a time.":
    "Договоритесь с кем-нибудь о встрече по-эстонски, с днём и временем.",
  "Tell somebody one thing about your flat, or ask about theirs.":
    "Расскажите кому-нибудь что-нибудь одно о своей квартире или спросите, как с жильём у них.",
  "Ask somebody for a hand with one small thing, in Estonian.":
    "Попросите кого-нибудь по-эстонски помочь с одной мелочью.",
  "Post a letter or pick up a parcel, and do the whole thing in Estonian.":
    "Отправьте письмо или заберите посылку, и всё это по-эстонски.",
  "Buy a bus ticket at the window, and say where you're going and when.":
    "Купите в кассе билет на автобус и скажите, куда и когда едете.",
  "Order a whole meal in Estonian, and ask what's in one of the dishes.":
    "Закажите целый обед по-эстонски и спросите, что входит в одно из блюд.",
  "Ask at the pharmacy for something for a headache, and how often to take it.":
    "Попросите в аптеке что-нибудь от головной боли и спросите, как часто это принимать.",
  "Ask somebody what an Estonian word means, then use it yourself before bed.":
    "Спросите у кого-нибудь, что значит эстонское слово, и до сна используйте его сами.",
  "Tell somebody what you do for a living, and one thing you're good at.":
    "Расскажите кому-нибудь, чем вы зарабатываете на жизнь и что у вас хорошо получается.",
  "Take something back to a shop, or report something broken, and say what's wrong with it.":
    "Верните что-нибудь в магазин или сообщите о поломке и скажите, что не так.",
  "Before you get on, ask whether this bus or tram goes where you're going.":
    "Перед посадкой спросите, идёт ли этот автобус или трамвай туда, куда вам нужно.",
  "When you don't catch something, ask them to say it again instead of switching to English.":
    "Если что-то не расслышали, попросите повторить, а не переходите на русский или английский.",
  "Introduce yourself to somebody new: your name, where you live and what you do.":
    "Представьтесь новому человеку: как вас зовут, где вы живёте и чем занимаетесь.",
  "Say a price or which floor you live on out loud in Estonian, and ask them to say it back.":
    "Назовите вслух по-эстонски цену или этаж, на котором живёте, и попросите повторить.",
  "Anywhere":
    "Где угодно",
  "A bus stop":
    "Остановка",
  "a corridor":
    "коридор",
  "A queue":
    "Очередь",
  "a lift":
    "лифт",
  "Work":
    "Работа",
  "the stairwell":
    "подъезд",
  "Home":
    "Дом",
  "a friend":
    "друг",
  "A form":
    "Анкета",
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
    "занятие",
  "a stairwell":
    "подъезд",

  // TODAY: THE WORD OF THE DAY.
  "Word of the day":
    "Слово дня",
  "You've already met every word we could pick for today, which is a first. Have a browse in the dictionary, and there'll be a new one here tomorrow.":
    "Вы уже знаете все слова, которые мы могли выбрать на сегодня, и такое впервые. Загляните в словарь, а завтра здесь будет новое.",
  "Open the dictionary":
    "Открыть словарь",
  "new to you":
    "новое для вас",
  "Hear {word}":
    "Послушать {word}",
  "See the full entry":
    "Вся статья в словаре",
  "Words of the day kept so far: {kept}":
    "Сохранено слов дня: {kept}",
  "Words of the day kept so far: {kept}, {days} in a row":
    "Сохранено слов дня: {kept}, {days} подряд",

  // THE CLIMB TO THE LEVEL THEY ARE AIMING AT.
  "{part}, day {day}":
    "{part}, день {day}",
  "{credited} of {total} words":
    "Слов: {credited} из {total}",
  "You've reached {target}":
    "Вы достигли {target}",
  "On the way to {target}":
    "На пути к {target}",
  "{n} you've shown you know":
    "{n} уже подтверждено",
  "{n} counted from your level":
    "{n} засчитано по уровню",
  ", done. ":
    ", пройден. ",
  ", counted from your level, {shown} of {words} shown in your reviews so far. ":
    ", засчитан по вашему уровню, в повторениях пока подтверждено {shown} из {words}. ",
  "{parts} parts. ":
    "Частей: {parts}. ",
  "How this bar fills up":
    "Как заполняется эта полоса",
  "You know every word this level asks for. There's nothing new left in it.":
    "Вы знаете все слова, которые нужны на этом уровне. Нового в нём не осталось.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you tick off an evening. You're on {part}.":
    "Вы прошли {pct}% пути от начала {start} до {target}. Сплошная часть растёт, только когда слово действительно закрепилось в повторениях, а не когда вы отмечаете вечер. Сейчас вы здесь: {part}.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you tick off an evening.":
    "Вы прошли {pct}% пути от начала {start} до {target}. Сплошная часть растёт, только когда слово действительно закрепилось в повторениях, а не когда вы отмечаете вечер.",
  "Every level up to {target} counts as yours already. What's left is proving it, and that's what the evenings are for.":
    "Все уровни до {target} уже засчитаны вам. Осталось это подтвердить, для этого и нужны вечера.",
  "Pick a target in Settings and this becomes the one number worth keeping an eye on.":
    "Выберите цель в настройках, и это станет главной цифрой, за которой стоит следить.",
  "Your level check put you at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "Проверка уровня показала {level}, поэтому {levels} мы засчитали вам. Ничего ниже вашего уровня проходить заново не придётся.",
  "You told us you're at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "Вы сказали, что ваш уровень {level}, поэтому {levels} мы засчитали вам. Ничего ниже вашего уровня проходить заново не придётся.",
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
    "Вы можете объясниться в магазине, в кафе и при первом знакомстве.",
  "You can hold a simple conversation about your day, your family and your plans.":
    "Вы можете поддержать простой разговор о своём дне, семье и планах.",
  "You can explain, disagree and handle the unexpected without switching to English.":
    "Вы можете объяснить, возразить и справиться с неожиданным, не переходя на русский или английский.",
  "You can follow a public debate and argue your side of it in writing.":
    "Вы можете следить за публичной дискуссией и письменно отстаивать свою позицию.",
  "You can write academic and professional Estonian that reads as if it was written in Estonian, not translated.":
    "Вы можете писать на академическом и профессиональном эстонском так, будто текст сразу написан по-эстонски, а не переведён.",

  // THE MODULE SCREEN.
  "Your evenings, already planned":
    "Ваши вечера уже спланированы",
  "{evenings} short evenings, from your very first word all the way to C1. We've planned every one.":
    "Коротких вечеров: {evenings}, от самого первого слова до C1. Каждый из них мы уже спланировали.",
  "You've been choosing what to do each evening, and that's fine. Starting this won't change anything else.":
    "Вы сами выбирали, чем заниматься каждый вечер, и это нормально. Если начать курс, больше ничего не изменится.",
  "It starts at {start}, where you are now. It's a plan to lean on, not a track you're stuck on, and everything else in the app stays where it is.":
    "Курс начинается с {start}, там, где вы сейчас. Это план, на который можно опереться, а не колея, из которой не выбраться, и всё остальное в приложении остаётся на своих местах.",
  "It starts at {start}, the level after the {level} you already have. It's a plan to lean on, not a track you're stuck on, and everything else in the app stays where it is.":
    "Курс начинается с {start}, следующего уровня после вашего {level}. Это план, на который можно опереться, а не колея, из которой не выбраться, и всё остальное в приложении остаётся на своих местах.",
  "{part} is finished":
    "Часть «{part}» пройдена",
  "All {total} evenings done. Every word you met is in your reviews now.":
    "Все вечера пройдены, их было {total}. Каждое встреченное слово теперь в ваших повторениях.",
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
    "Дальше часть {part} ({about}). Эта часть начинается там, где закончилась предыдущая, и спрашивает только о том, что вы уже встречали.",
  "That's the whole course, start to finish. Every word is in your reviews, and each one will come back just as you're about to forget it.":
    "Это весь курс от начала до конца. Все слова в ваших повторениях, и каждое вернётся как раз тогда, когда вы начнёте его забывать.",
  "See what you could handle out there":
    "Что вам уже по силам в жизни",
  "Start {part}":
    "Начать часть {part}",
  "Open the course":
    "Открыть курс",
  "That's tonight done":
    "На сегодня всё",
  "{run} evenings in a row now, and {done} of {total} done.":
    "Вечеров подряд: {run}, пройдено {done} из {total}.",
  "{done} of {total} evenings done. See you tomorrow.":
    "Пройдено вечеров: {done} из {total}. До завтра.",
  "Come back tomorrow for {unit}.":
    "Возвращайтесь завтра: впереди раздел «{unit}».",
  "Come back tomorrow for {unit} ({english}).":
    "Возвращайтесь завтра: впереди раздел «{unit}» ({english}).",
  "Sleep does half the work of making tonight's words stick, so stopping here is part of the plan.":
    "Половину работы по запоминанию сегодняшних слов сделает сон, так что остановиться сейчас тоже часть плана.",
  "Hear tonight's words once more":
    "Послушать слова этого вечера ещё раз",
  "Start the next one now":
    "Начать следующий урок сейчас",
  "Back to Today":
    "На главную",
  "{done} of {total}":
    "{done} из {total}",
  "Where you are":
    "Где вы сейчас",
  "Day {day} of {total}, part {n} of {of}":
    "День {day} из {total}, часть {n} из {of}",
  "By the end of this unit":
    "К концу этого раздела",
  "By the end of tonight":
    "К концу этого вечера",
  "{words} again":
    "{words} на повтор",
  "0m":
    "0",
  "{minutes}m":
    "{minutes}",
  "left":
    "мин осталось",
  "Tonight's words":
    "Слова этого вечера",
  "A few of these aren't in your deck yet. The first step adds them.":
    "Некоторых из них ещё нет в вашей колоде. Первый шаг их добавит.",
  "What you do tonight":
    "Что вас ждёт этим вечером",
  "How a step gets ticked":
    "Как отмечается шаг",
  "Meeting the words and the review at the end tick themselves off as you answer. The others you tick yourself, because we can't tell which exercise an answer came from, and we'd rather admit that than pretend we were watching.":
    "Знакомство со словами и повторение в конце отмечаются сами, пока вы отвечаете. Остальные шаги отмечаете вы, потому что мы не видим, из какого упражнения пришёл ответ, и лучше честно это признать, чем делать вид, что следили.",
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
  "This is the easy way in, not the only one.":
    "Это простой способ начать, но не единственный.",
  "{link} whenever you'd rather choose for yourself.":
    "{link}, когда захотите выбирать сами.",
  "Turn it off":
    "Выключить",
  "The whole course":
    "Весь курс",
  "Every part, by name":
    "Все части по названиям",
  "You are here":
    "Вы здесь",
  "based on your last two weeks":
    "по вашим последним двум неделям",

  // THE STEPS OF AN EVENING.
  "Go over tonight's {words}":
    "Повторить {words} этого вечера",
  "Learn tonight's {newWords}":
    "Выучить {newWords}",
  "Learn tonight's {newWords}, and {met} from earlier":
    "Выучить {newWords} и повторить знакомые ({met})",
  "Every one of these is from earlier in the course. Tonight they come back for what the page is about.":
    "Все эти слова уже были в курсе раньше. Сегодня они возвращаются ради того, о чём эта страница.",
  "Hear each word and see what it means. A few minutes later you pick it out of four, and that's what makes it stay.":
    "Послушайте каждое слово и посмотрите, что оно значит. Через несколько минут вы выберете его из четырёх, и именно это помогает ему запомниться.",
  "See what each word means, pick it out of four a little later, then type it into a real Estonian sentence.":
    "Посмотрите, что значит каждое слово, чуть позже выберите его из четырёх, а потом впишите в настоящее эстонское предложение.",
  "Read how tonight's words work":
    "Прочитать, как устроены слова этого вечера",
  "One short page on the grammar behind tonight's words, shown in real sentences.":
    "Одна короткая страница о грамматике, на которой держатся слова этого вечера, на настоящих предложениях.",
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
    "В прошедшем времени эстонские глаголы меняются по-разному, поэтому каждый учат отдельно. Послушайте их, а потом ответьте на три быстрых вопроса.",
  "{title}, again at your level":
    "{title}: снова, на вашем уровне",
  "The conversation":
    "Разговор",
  "Have the conversation":
    "Поговорить по-эстонски",
  "You've had this one before. Tonight they talk to you the way they'd talk to anybody, and you've got far more to say back.":
    "Этот разговор у вас уже был. Сегодня с вами говорят так, как говорили бы с кем угодно, а ответить вы теперь можете куда больше.",
  "Somebody wants something from you, and only Estonian will do. This is what all those words were for.":
    "Кому-то что-то от вас нужно, и обойтись можно только эстонским. Вот для чего были все эти слова.",
  "A quick review, then you're done":
    "Короткое повторение, и на сегодня всё",
  "A few minutes on the words you're about to forget, tonight's included. This is the part that makes them stick.":
    "Несколько минут на слова, которые вы вот-вот забудете, включая сегодняшние. Именно это помогает им закрепиться.",
  "Pair each word with its meaning against the clock. It's quick, it's fun, and the meanings stick before you ever have to say them.":
    "Соединяйте каждое слово с его значением на время. Это быстро и весело, и значения запоминаются ещё до того, как их придётся произносить.",
  "The same words, but this time you only hear them. Reading a word and catching it when somebody says it are two different skills.":
    "Те же слова, но теперь вы их только слышите. Прочитать слово и узнать его на слух совсем не одно и то же.",
  "A race through the words you've met, and their endings once you've read about them. Answer fast enough and you stop working words out and simply know them.":
    "Гонка по знакомым словам, а когда прочитаете про окончания, то и по окончаниям. Отвечайте быстро, и вы перестанете вычислять слова и начнёте просто их знать.",
  "Put a real Estonian sentence back together, word by word. Do it a few times and you start to feel where things go.":
    "Соберите настоящее эстонское предложение слово за словом. Сделайте так несколько раз, и вы начнёте чувствовать, что куда ставится.",
  "Hear a whole sentence and write it down. This is where long and short vowels stop being a rule and start being a sound.":
    "Послушайте целое предложение и запишите его. Именно здесь долгие и краткие гласные перестают быть правилом и становятся звуком.",
  "Look at a picture and write one sentence of your own about it. That's what all these words are for.":
    "Посмотрите на картинку и напишите о ней одно своё предложение. Ради этого и нужны все эти слова.",
  "Guess today's six-letter word. Three minutes, and Estonian letters start feeling like old friends.":
    "Угадайте слово дня из шести букв. Три минуты, и эстонские буквы начинают казаться старыми знакомыми.",
  "Four versions of one word, and a question telling you which one to hit. Only the ending tells them apart, so you learn to read it fast.":
    "Четыре варианта одного слова и вопрос, который говорит, в какой попасть. Различаются они только окончанием, так что вы учитесь быстро его читать.",
  "One verb, six people: I, you, she and the rest. If you can't change a verb for who's doing it, you can't really use it yet.":
    "Один глагол, шесть лиц: я, ты, она и остальные. Пока вы не умеете менять глагол по лицам, по-настоящему пользоваться им ещё не получится.",
  "Say it out loud, then hear how it should sound. Nobody marks you. This one is just for your own ears.":
    "Скажите вслух, а потом послушайте, как это должно звучать. Никто вас не оценивает. Это только для ваших ушей.",
  "Write a sentence of your own with the ending we ask for. We check that word against the dictionary before anything else.":
    "Напишите своё предложение с окончанием, которое мы просим. Это слово мы прежде всего сверяем со словарём.",
  "Aitan sind, but helistan sulle. Every verb chooses its own ending for whatever comes after it, and English gives you no clue, so you learn them one verb at a time.":
    "Aitan sind, но helistan sulle. Как и в русском, каждый глагол требует своего падежа, но эстонское управление с русским часто не совпадает: мы говорим «помогаю тебе», а здесь sind. Поэтому их учат по одному глаголу.",
  "The words that don't follow the usual ending rules. See each one, then write it yourself, and soon you won't need to look them up.":
    "Слова, которые не подчиняются обычным правилам окончаний. Посмотрите на каждое, потом напишите его сами, и скоро заглядывать в справочник не придётся.",
  "A word you know, with its letters shuffled. Put them back and õ, ä, ö and ü stop looking like plain a's, o's and u's.":
    "Знакомое слово с перемешанными буквами. Расставьте их по местам, и буквы с точками и волной перестанут казаться обычными a, o и u.",
  "Words you've already met, asked in new ways: read aloud, missing from a sentence, or in a sentence you write.":
    "Слова, которые вы уже встречали, в новых вопросах: на слух, с пропуском в предложении или в вашем собственном предложении.",

  // THE STEP LIST AND THE MODULE'S OWN CHROME.
  "{graded} of {needed} answer done. Keep going and this ticks itself off.":
    "Ответов: {graded} из {needed}. Продолжайте, и шаг отметится сам.",
  "{graded} of {needed} answers done. Keep going and this ticks itself off.":
    "Ответов: {graded} из {needed}. Продолжайте, и шаг отметится сам.",
  "Done, going by your answers":
    "Готово, судя по вашим ответам",
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
    "Не получилось, поэтому ничего не изменилось. Попробуйте ещё раз чуть позже.",
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
    "Переходите дальше, и шаг {n} из {of} засчитается.",
  "That didn't reach us, so this step isn't ticked yet.":
    "Запрос до нас не дошёл, поэтому шаг пока не отмечен.",
  "Finish tonight":
    "Завершить урок",
  "Next, step {n}: {title}":
    "Дальше, шаг {n}: {title}",
  "Next, step {n}":
    "Дальше, шаг {n}",
  "Leave tonight's module and go back to Today":
    "Выйти из урока этого вечера и вернуться на главную",
  "Leave":
    "Выйти",
  "Step {n} of {of}":
    "Шаг {n} из {of}",
  "Finish":
    "Завершить",
  "Next step":
    "Следующий шаг",
  "You're still on this step.":
    "Вы всё ещё на этом шаге.",
  "Back to today's module":
    "Назад к уроку на сегодня",

  // THE PAST FORMS STEP.
  "Tonight's module":
    "Урок этого вечера",
  "The past of your verbs":
    "Прошедшее время ваших глаголов",
  "Each verb makes its past its own way, so learn them a few at a time. Listen, then try three.":
    "Каждый глагол образует прошедшее время по-своему, поэтому учите их понемногу. Послушайте, а потом ответьте на три вопроса.",
  "No verbs to learn here tonight":
    "Сегодня здесь учить нечего",
  "We don't have the past forms of tonight's verbs yet. Carry on to the next step.":
    "Форм прошедшего времени для сегодняшних глаголов у нас пока нет. Переходите к следующему шагу.",
  "the ones you've met":
    "те, что вы уже встречали",
  "Tonight's verbs":
    "Глаголы этого вечера",

  // TRY IT: THE READING ASKS BACK.
  "You just looked forms up in the table. That's exactly what it's there for.":
    "Вы только что искали формы в таблице. Именно для этого она и нужна.",
  "You got every one right. Later tonight you'll get questions like these about tonight's words.":
    "Все ответы верные. Позже этим вечером будут похожие вопросы о сегодняшних словах.",
  "Glance back at the table whenever a form looks odd. It'll look a lot less odd by tomorrow.":
    "Если форма кажется странной, загляните в таблицу. К завтрашнему дню она будет казаться куда менее странной.",
  "{n} of {total}, just practice":
    "{n} из {total}, просто тренировка",
  "Try it":
    "Попробуйте",
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
    "Да. Для «{pronoun}» у глагола {lemma} форма {value}.",
  "Yes. {value} is {lemma} for {pronoun}, and for {shared} too.":
    "Да. Для «{pronoun}» у глагола {lemma} форма {value}, как и для {shared}.",
  "Not that one. With {pronoun} it's {value}.":
    "Не эта. Для «{pronoun}» будет {value}.",
  "Not that one. With {pronoun} it's {value}, and the same with {shared}.":
    "Не эта. Для «{pronoun}» будет {value}, и для {shared} так же.",
  "{lemma} means {translation}. Which one says \"not\"?":
    "Слово {lemma} значит «{translation}». Какая форма говорит «не»?",
  "{lemma} means {translation}. Which one tells somebody to do it?":
    "Слово {lemma} значит «{translation}». Какая форма велит кому-то это сделать?",
  "Yes. {answer} is how you say not with {lemma}, {translation}.":
    "Да, {answer}: так звучит отрицание глагола {lemma}, «{translation}».",
  "Yes. {answer} is how you tell one person to do it with {lemma}, {translation}.":
    "Да, {answer}: так глаголом {lemma}, «{translation}», просят одного человека что-то сделать.",
  "Not that one. For {lemma}, it's {answer}.":
    "Не эта. У {lemma} будет {answer}.",
  "{lemma} means {translation}. Which one says \"I did it\", back in the past?":
    "Слово {lemma} значит «{translation}». Какая форма значит «я это сделал(а)», о прошлом?",
  "{lemma} means {translation}. Which one says \"he or she did it\", back in the past?":
    "Слово {lemma} значит «{translation}». Какая форма значит «он (она) это сделал(а)», о прошлом?",
  "Yes. {answer} is the past, when you did it yourself. {now} is happening right now.":
    "Да. {answer} говорит о прошлом, когда это делали вы сами, а {now} о том, что происходит сейчас.",
  "Yes. {answer} is the past, when somebody else did it. {now} is happening right now.":
    "Да. {answer} говорит о прошлом, когда это делал кто-то другой, а {now} о том, что происходит сейчас.",
  "Not that one. {answer} is the past, when you did it yourself.":
    "Не эта. О прошлом, когда это делали вы сами, говорит {answer}.",
  "Not that one. {answer} is the past, when somebody else did it.":
    "Не эта. О прошлом, когда это делал кто-то другой, говорит {answer}.",
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
    "У вас всё идёт как по маслу",
  "You're flying through the top of the course":
    "Вы легко проходите самую сложную часть курса",
  "This part is a tough one":
    "Эта часть непростая",
  "Lately you've been getting every answer right.":
    "В последнее время вы отвечаете правильно на всё.",
  "Lately you've been getting {seen} out of a hundred right.":
    "В последнее время вы отвечаете правильно на {seen} из ста.",
  "If this part feels too easy, skip ahead to {part}. Everything from this one stays in your reviews either way.":
    "Если эта часть кажется слишком лёгкой, переходите сразу к части {part}. Всё из этой части в любом случае останется в ваших повторениях.",
  "There's no part above this one, so stretch yourself with your reviews and the tougher conversations.":
    "Выше этой части ничего нет, так что испытайте себя в повторениях и в более трудных разговорах.",
  "A lot of recent answers have been misses. This part is a step ahead of you for now, and that's normal.":
    "Среди последних ответов много ошибок. Эта часть пока на шаг впереди вас, и это нормально.",
  "Lately you've been getting {seen} out of a hundred right. This part is a step ahead of you for now, and that's normal.":
    "В последнее время вы отвечаете правильно на {seen} из ста. Эта часть пока на шаг впереди вас, и это нормально.",
  "Your reviews will bring back the words that are slipping. Give it a few days.":
    "Повторения вернут слова, которые ускользают. Дайте себе несколько дней.",
  "The level you started at was a first guess. Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Уровень, с которого вы начали, был лишь первой догадкой. Если сначала пройтись по {level}, эта часть станет намного легче. Это просто освежит знания, а эта часть подождёт вас.",
  "Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Если сначала пройтись по {level}, эта часть станет намного легче. Это просто освежит знания, а эта часть подождёт вас.",
  "{part} is the part you skipped, and this one leans on it. Going back fills in the gaps.":
    "Вы пропустили часть {part}, а эта на неё опирается. Если вернуться, пробелы заполнятся.",
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
    "Сейчас вы отвечаете правильно на {seen} из ста. Переход к более трудной части только понизит эту цифру.",
  "Give it a few more days of reviews and that number will climb on its own. You won't lose anything, and nothing has to be done twice.":
    "Ещё несколько дней повторений, и эта цифра поднимется сама. Вы ничего не потеряете, и ничего не придётся делать дважды.",
  "A few gentler days will sort this out. Your reviews already know which words are giving you trouble.":
    "Несколько более спокойных дней всё исправят. Повторения уже знают, какие слова даются вам трудно.",

  // THE PARTS OF THE COURSE: WHAT EACH IS ABOUT, AND WHAT FINISHING IT MEANS.
  "Hello, you and me, the verb to be, and the people around you":
    "Приветствия, вы и я, глагол «быть» и люди вокруг вас",
  "Your name, numbers, your home, and the verbs you'll use every day":
    "Ваше имя, числа, ваш дом и глаголы на каждый день",
  "Your name and where you live, how to count, the rooms of your home, and the eleven verbs you'll need in almost every sentence you ever say. By the end you can introduce yourself, count, and describe where you live.":
    "Ваше имя и где вы живёте, как считать, комнаты вашего дома и одиннадцать глаголов, которые понадобятся почти в каждом вашем предложении. К концу вы сможете представиться, посчитать и описать, где живёте.",
  "Food, the time, your day, and what things are like":
    "Еда, время, ваш день и описание вещей",
  "Food and drink, the days and the clock, what you do from morning to night, and your first words for what things look like, colors included. By the end you can say what you're doing, when, and what it's like.":
    "Еда и напитки, дни недели и часы, что вы делаете с утра до вечера, и первые слова о том, как выглядят вещи, включая цвета. К концу вы сможете сказать, что делаете, когда и каково это.",
  "Clothes, weather, prices, and a shop":
    "Одежда, погода, цены и магазин",
  "What you're wearing, what the weather's doing, the bigger numbers you need for prices, and then a shop to put it all to work in. By the end you can describe what you want and buy it.":
    "Что на вас надето, какая погода, большие числа, нужные для цен, а потом магазин, где всё это пригодится. К концу вы сможете описать, что вам нужно, и купить это.",
  "Where things are, the bus, somebody and something, and when":
    "Где что находится, автобус, кто-то и что-то, и когда",
  "Where things are and where you're heading, getting around by bus, words like somebody and nothing, and talking about when. By the end you can ask where something is, catch a bus there, and say when you arrived.":
    "Где что находится и куда вы направляетесь, как ездить на автобусе, слова вроде «кто-то» и «ничего» и разговор о том, когда что происходит. К концу вы сможете спросить, где что-то находится, доехать туда на автобусе и сказать, когда приехали.",
  "Joining words, the calendar, and where people are from":
    "Слова-связки, календарь и откуда люди родом",
  "Words for joining two thoughts or saying how sure you are, the months and the holidays, where people come from, and a few animals and parts of the body. By the end you can link two ideas and say when something happens.":
    "Слова, которые связывают две мысли или говорят, насколько вы уверены, месяцы и праздники, откуда люди родом, а ещё немного о животных и частях тела. К концу вы сможете связать две мысли и сказать, когда что-то происходит.",
  "How things are done, more everyday words, and asking for help":
    "Как что делается, ещё повседневные слова и просьба о помощи",
  "The last of A1. Words for how something was done, and the small words that change what a verb means. Then more of the everyday: food, places in town and the people who work there, ten verbs every child knows and ten more describing words. It ends on asking for help, and by then you have every word A1 asks for.":
    "Последняя часть A1. Слова о том, как что-то сделано, и маленькие слова, которые меняют смысл глагола. Потом ещё повседневное: еда, места в городе и люди, которые там работают, десять глаголов, которые знает любой ребёнок, и ещё десять слов для описания. Заканчивается всё просьбой о помощи, и к этому времени у вас есть все слова, которые нужны для A1.",
  "Asking for things, yesterday, the outdoors, the body and the house":
    "Просьбы, вчерашний день, природа, тело и дом",
  "School, travel, the town, a free afternoon, and comparing things":
    "Учёба, поездки, город, свободный день и сравнение",
  "Life outside your front door: school, trips, the town, your weekends, and saying which of two things is better. There are four conversations to practise on along the way. By the end you can buy a ticket, ask the way and say what you did on Saturday.":
    "Жизнь за порогом дома: учёба, поездки, город, ваши выходные и как сказать, какая из двух вещей лучше. По пути вас ждут четыре разговора для практики. К концу вы сможете купить билет, спросить дорогу и рассказать, что делали в субботу.",
  "Eating out, making plans, keeping in touch, and how you feel":
    "Кафе и рестораны, планы, общение и чувства",
  "Talking about what hasn't happened yet, keeping in touch, and saying how you feel about it all. It has five conversations, more than any other part. By the end you can get through a whole meal in Estonian, book an appointment and ring somebody about it.":
    "Разговор о том, что ещё не случилось, общение с людьми и как сказать, что вы обо всём этом чувствуете. Здесь пять разговоров, больше, чем в любой другой части. К концу вы сможете пообедать в ресторане целиком по-эстонски, записаться на приём и позвонить, чтобы о нём договориться.",
  "Objects, the people in your life, what each verb asks for, money, and would":
    "Дополнение, люди в вашей жизни, чего требует каждый глагол, деньги и «бы»",
  "School, two new past forms, renting, what people are like, and the news":
    "Учёба, две новые формы прошедшего, аренда, какие бывают люди и новости",
  "School and a job interview first. Then the verb forms ending in -nud and -tud, and the two past tenses built from them. Then renting a flat, what people are like, and the news, which leans on those same forms to say what happened without saying who did it. By the end you can get through an interview, read a news story and phone a landlord.":
    "Сначала учёба и собеседование на работу. Потом глагольные формы на -nud и -tud и два прошедших времени, которые из них строятся. Потом аренда квартиры, какие бывают люди и новости, где те же формы помогают сказать, что произошло, не называя, кто это сделал. К концу вы сможете пройти собеседование, прочитать новость и позвонить арендодателю.",
  "Technology, opinions, the environment, things going wrong, and two-part verbs":
    "Технологии, мнения, экология, когда что-то идёт не так, и глаголы из двух частей",
  "Disagreeing with somebody, the things the papers argue about, and coping when something breaks. B1 ends on verbs that come in two parts, because they follow the same object rule you met at the start of B1. By the end you can argue your side without switching to English.":
    "Как спорить с собеседником, о чём спорят в газетах и как справиться, когда что-то сломалось. B1 заканчивается глаголами из двух частей, потому что они подчиняются тому же правилу дополнения, которое вы встретили в начале B1. К концу вы сможете отстоять свою точку зрения, не переходя на русский или английский.",
  "Leaving out who did it, society, hearsay, the economy, and doing two things at once":
    "Безличные формы, общество, пересказ, экономика и два действия сразу",
  "History, building new words, politics, health and science":
    "История, образование новых слов, политика, здоровье и наука",
  "It opens on had done, the past before the past, learned on history, where you'll meet it most. Then how to work out a word you've never seen from one you already know, and three subjects to try it on. By the end you can read an opinion piece on any of them without a dictionary open.":
    "Часть открывается давнопрошедшим временем, прошлым до прошлого, и учите вы его на истории, где оно встречается чаще всего. Потом как понять незнакомое слово по уже знакомому и три темы, чтобы это опробовать. К концу вы сможете прочитать авторскую колонку на любую из этих тем, не открывая словарь.",
  "The arts, the law, the mind, working life, figures, and making a case":
    "Искусство, закон, психология, работа, цифры и аргументация",
  "The end of B2: the arts, making a proper complaint, describing how people behave, working in Estonian, reading a table of figures, and building an argument that gives a little ground before it wins.":
    "Конец B2: искусство, как подать настоящую жалобу, как описать поведение людей, работа на эстонском, чтение таблицы с цифрами и аргумент, который сначала немного уступает, а потом побеждает.",
  "Saying more in fewer words, and long sentences that hold together":
    "Больше смысла в меньшем числе слов и длинные предложения, которые не разваливаются",
  "Ethics, persuasion, how formal to be, idioms, and holding a text together":
    "Этика, убеждение, насколько официально говорить, идиомы и связный текст",
  "Knowing how formal to be and getting it right, winning over somebody who disagrees, and the set phrases no rule will ever explain.":
    "Как выбрать нужную степень официальности и попасть в тон, как переубедить несогласного и устойчивые выражения, которые не объяснит никакое правило.",
  "New ideas, the wider world, literature, and words that almost mean the same":
    "Новые идеи, большой мир, литература и почти синонимы",
  "The last part of the course. By the end you've met everything in it, and what's left is reading Estonian because you want to.":
    "Последняя часть курса. К концу вы встретите всё, что в нём есть, и останется только читать по-эстонски, потому что вам этого хочется.",
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
    "Ваші перші картки готові: {cards}. Це приблизно {minutes}.",
  "Cards waiting for you: {cards}. That's about {minutes}.":
    "На вас чекають картки: {cards}. Це приблизно {minutes}.",
  "Nothing else is due today. Enjoy the rest of your day.":
    "Більше на сьогодні повторювати нічого. Гарного вам дня.",
  "{cards} still due, if you fancy a few more.":
    "Якщо хочеться ще, час повторити: {cards}.",
  "Nothing else is due today, so tonight's module is all you need to do.":
    "Більше на сьогодні повторювати нічого, тож вам потрібен лише урок цього вечора.",
  "{cards} due as well. They'll come up at the end of tonight's module.":
    "Ще час повторити: {cards}. Вони трапляться наприкінці уроку цього вечора.",
  "{cards} due as well. Tonight's module ends with a few of them, and the review button has the rest.":
    "Ще час повторити: {cards}. Урок цього вечора завершиться кількома з них, а решта чекає на екрані повторення.",

  // TODAY: THE CARD THAT SAYS WHAT TO DO NOW.
  "Due now":
    "Час повторити",
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
    "Якщо повторювати картки раніше терміну, краще вони не запам'ятаються. Відпочиньте або почніть щось нове.",
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
    "Почати: {unit}",
  "Go and practise":
    "До практики",
  "New words waiting for you: {words}. You'll take them {batch} at a time. You see each word in a sentence, pick what it means, then fill it back into the sentence yourself.":
    "На вас чекають нові слова: {words}. Ви вчитимете їх по {batch} за раз. Ви побачите кожне слово в реченні, виберете, що воно означає, а потім самі вставите його назад.",
  "Most cards ask you to type or pick the answer. A few just show it and ask whether you knew it. Be honest there: that's how the app knows when to bring each word back.":
    "Більшість карток просять вписати або вибрати відповідь. Деякі просто показують її і питають, чи ви її знали. Відповідайте чесно: так застосунок розуміє, коли повернути кожне слово.",
  "No cards yet":
    "Карток поки немає",
  "Choose a unit to begin with. Its words become cards you can learn, hear and practise.":
    "Виберіть розділ, з якого почнете. Його слова стануть картками, які можна вчити, слухати й тренувати.",
  "Choose your first unit":
    "Вибрати перший розділ",

  // TODAY: TONIGHT'S MODULE, AT THE TOP.
  "Today's module":
    "Урок на сьогодні",
  "Day {day} of {days}":
    "День {day} з {days}",
  "Next":
    "Далі",
  "{pct} percent of tonight done":
    "Урок цього вечора пройдено на {pct}%",
  "{minutes} min":
    "{minutes} хв",
  "to go tonight":
    "залишилося на цей вечір",
  "Start tonight":
    "Почати вечір",
  "Carry on":
    "Продовжити",
  "{done} of {days} done, {run} evenings in a row":
    "Пройдено {done} з {days}, вечорів поспіль: {run}",
  "{done} of {days} done":
    "Пройдено {done} з {days}",
  "That's tonight done. Go and enjoy your evening.":
    "На сьогодні все. Гарного вам вечора.",
  "Tomorrow you'll carry on with {unit}, part {n} of {of}.":
    "Завтра продовжимо розділ {unit}, частина {n} з {of}.",
  "See you tomorrow for {unit}.":
    "До завтра! Попереду: {unit}.",
  "See you tomorrow for {unit} ({english}).":
    "До завтра! Попереду: {unit} ({english}).",
  "That was the very last evening of the course. Every word you met along the way will keep coming back in your reviews.":
    "Це був останній вечір курсу. Усі слова, які ви зустріли дорогою, і далі повертатимуться в повтореннях.",
  "See what's next":
    "Що далі",

  // TODAY: THE RUN OF DAYS.
  "{n} reviewed today":
    "Сьогодні повторено: {n}",
  "Your streak":
    "Ваша серія днів",
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
  "What's on today":
    "Що сьогодні",
  "See your whole week":
    "Увесь тиждень",
  "Class":
    "Заняття",
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
    "Від вашої групи поки нічого. Коли викладач задасть розділ, він з'явиться тут уранці того дня, до якого його треба зробити.",
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
  "Overdue, ":
    "Прострочено, ",
  "Due ":
    "Термін: ",
  "Mark \"{task}\" as done":
    "Позначити «{task}» як виконане",
  "Mark \"{task}\" as not done":
    "Позначити «{task}» як невиконане",

  // TODAY: THE ONE SHORT ROUND.
  "Daily quest":
    "Завдання дня",
  "Your {case} is at {pct}%. Give it {length} today.":
    "Ваш {case} поки засвоєний на {pct}%. Приділіть йому сьогодні {length}.",
  "{length} on the cards that trip you up most.":
    "{length} на картки, на яких ви найчастіше спотикаєтеся.",
  "Start the quest":
    "Почати завдання",
  "Today's game":
    "Гра дня",
  "Today's conversation":
    "Розмова дня",
  "Tomorrow's {weekday}, which means {game}.":
    "Завтра {weekday}, а отже, {game}.",
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
    "Короткий раунд на все, на чому ви спотикалися цього тижня.",
  "A fresh word to guess every morning. Monday's a good day to start.":
    "Щоранку нове слово, яке треба вгадати. Понеділок чудово підходить, щоб почати.",
  "Four versions of one word, and only the ending tells you which to hit.":
    "Чотири варіанти одного слова, і лише закінчення підкаже, у який влучити.",
  "Midweek, try a real conversation. Order a coffee, buy a bus ticket.":
    "Середина тижня: спробуйте справжню розмову. Замовте каву, купіть квиток на автобус.",
  "Pairs against the clock, and a personal best to beat.":
    "Пари на час і особистий рекорд, який можна побити.",
  "It's Friday, so keep it short: a quick burst of endings on the clock.":
    "П'ятниця, тож коротко: швидкий спринт із закінчень на час.",
  "The crossword, for a Saturday with time to spare.":
    "Кросворд для суботи, коли є вільний час.",
  "A quiet round on the words you've met, typed from their meaning.":
    "Спокійний раунд на знайомі слова: ви друкуєте їх за значенням.",
  "Unscramble a word you've met. Every letter has its place.":
    "Складіть знайоме слово з літер. Кожна літера має своє місце.",
  "Midweek, train your ear: hear a word and pick what it means.":
    "Середина тижня, тренуємо слух: послухайте слово й виберіть, що воно означає.",
  "It's Friday: say this week's words out loud, then hear them said.":
    "П'ятниця: скажіть слова цього тижня вголос, а потім послухайте, як вони звучать.",
  "Long sound or short? A Saturday ear test, no words needed.":
    "Довгий звук чи короткий? Суботня перевірка слуху, слова знати не потрібно.",

  // TODAY: THE NEXT UNIT, OFF THE COURSE.
  "Your next unit":
    "Наступний розділ",
  "{unit}: {pct}% complete":
    "{unit}: пройдено {pct}%",
  "Pick up where you left off":
    "Продовжити з того ж місця",
  "Start this unit":
    "Почати розділ",

  // TODAY: OUT THERE, AND THE ERRAND.
  "That didn't save. Try again once you're back online.":
    "Не збереглося. Спробуйте ще раз, коли знову будете онлайн.",
  "yesterday":
    "учора",
  "Out there":
    "У житті",
  "Did you speak any Estonian to anyone yesterday?":
    "Ви вчора говорили з кимось естонською?",
  "Anything counts. A shop, a colleague, a single sentence at the door.":
    "Зараховується все: магазин, колега, одна фраза біля дверей.",
  "Whether you spoke Estonian yesterday":
    "Чи говорили ви вчора естонською",
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
  "You spoke Estonian to a real person. That's the hard part, and it's what all of this is for.":
    "Ви говорили естонською з живою людиною. Це найважче, і саме заради цього все й затівалося.",
  "How did it go?":
    "Як усе минуло?",
  "How the conversation went":
    "Як минула розмова",
  "I pressed that by mistake":
    "Ой, це випадково",
  "Say it today":
    "Скажіть це сьогодні",
  "You'll find the words in {unit}.":
    "Потрібні слова є в розділі {unit}.",
  "Or {try}.":
    "Або {try}.",
  "try it out here first":
    "спершу потренуйтеся тут",
  "They understood you. That's the whole point of all this.":
    "Вас зрозуміли. Саме заради цього все й затівалося.",
  "Getting stuck is just what learning a language out loud looks like. It still counts, and it's on the board.":
    "Збитися посеред розмови нормально: саме такий вигляд має мова, яку вчать уголос. Розмову все одно зараховано.",
  "They switched to English. Next time, keep going in Estonian anyway. Most people switch back.":
    "Співрозмовник перейшов на англійську. Наступного разу все одно продовжуйте естонською: більшість повертаються до естонської.",
  "Running out of words costs nothing in a practice conversation, and the person there will wait while you find them.":
    "У тренувальній розмові не страшно, якщо бракує слів: співрозмовник зачекає, поки ви їх знайдете.",
  "They can switch to English in there too, so you can practise steering it back to Estonian.":
    "Там теж можуть перейти на англійську, тож можна потренуватися повертати розмову до естонської.",
  "That's your first in the last {days}.":
    "Це ваша перша розмова за останні {days}.",
  "That makes {held} in the last {days}.":
    "Усього розмов за останні {days}: {held}.",
  "See them all on Progress":
    "Усі вони в розділі «Поступ»",
  "Practise one here now":
    "Потренуватися тут просто зараз",
  "Was there a word you wanted and couldn't find?":
    "Було слово, яке ви хотіли сказати, але не знайшли?",
  "In English or Estonian":
    "Англійською або естонською",
  "Look it up":
    "Знайти",
  "Say hello to the first person you deal with today, and thank them on your way out.":
    "Привітайтеся з першою людиною, з якою сьогодні матимете справу, і подякуйте їй, коли йтимете.",
  "Say sorry in Estonian for something tiny, and tell them you're learning.":
    "Перепросіть естонською за якусь дрібницю і скажіть, що вчите мову.",
  "Order your coffee in Estonian today. Don't forget the please.":
    "Замовте сьогодні каву естонською. Не забудьте сказати «будь ласка».",
  "Ask for bread at the counter and say how much you want. Pointing doesn't count.":
    "Попросіть біля прилавка хліб і скажіть, скільки вам треба. Показувати пальцем не зараховується.",
  "Ask what something costs before you peek at the label.":
    "Спитайте, скільки щось коштує, перш ніж зазирнути в цінник.",
  "Ask somebody the time, even if you know it perfectly well.":
    "Спитайте в когось, котра година, навіть якщо чудово це знаєте.",
  "Ask somebody where something is, and follow the answer without falling back on English.":
    "Спитайте в когось, де щось розташоване, і зрозумійте відповідь, не переходячи на англійську.",
  "Say one sentence about the weather to whoever's waiting next to you.":
    "Скажіть одне речення про погоду тому, хто чекає поруч із вами.",
  "Tell a colleague or a neighbor one thing about your family.":
    "Розкажіть колезі чи сусідові щось одне про свою родину.",
  "Tell somebody what you did today. Three sentences is plenty.":
    "Розкажіть комусь, що ви сьогодні робили. Трьох речень цілком вистачить.",
  "Give your phone number in Estonian, digit by digit, and ask them to read it back to you.":
    "Продиктуйте свій номер телефону естонською, цифру за цифрою, і попросіть повторити його вам.",
  "In a clothes shop, ask for another size or another color.":
    "У магазині одягу попросіть інший розмір або інший колір.",
  "Make one phone call in Estonian. A short one counts.":
    "Зробіть один дзвінок естонською. Короткий теж зараховується.",
  "Book an appointment in Estonian, or just ask about one, and stay in Estonian even if they switch to English.":
    "Запишіться на прийом естонською або просто спитайте про запис і не переходьте з естонської, навіть якщо вам відповідатимуть англійською.",
  "Arrange to meet somebody in Estonian, with a day and a time.":
    "Домовтеся з кимось про зустріч естонською, з днем і часом.",
  "Tell somebody one thing about your flat, or ask about theirs.":
    "Розкажіть комусь щось одне про свою квартиру або спитайте, як із житлом у них.",
  "Ask somebody for a hand with one small thing, in Estonian.":
    "Попросіть когось естонською допомогти з однією дрібницею.",
  "Post a letter or pick up a parcel, and do the whole thing in Estonian.":
    "Надішліть лист або заберіть посилку й зробіть усе це естонською.",
  "Buy a bus ticket at the window, and say where you're going and when.":
    "Купіть у касі квиток на автобус і скажіть, куди й коли їдете.",
  "Order a whole meal in Estonian, and ask what's in one of the dishes.":
    "Замовте цілий обід естонською і спитайте, що входить до однієї зі страв.",
  "Ask at the pharmacy for something for a headache, and how often to take it.":
    "Попросіть в аптеці щось від головного болю і спитайте, як часто це приймати.",
  "Ask somebody what an Estonian word means, then use it yourself before bed.":
    "Спитайте в когось, що означає естонське слово, і до сну скористайтеся ним самі.",
  "Tell somebody what you do for a living, and one thing you're good at.":
    "Розкажіть комусь, чим ви заробляєте на життя і що вам добре вдається.",
  "Take something back to a shop, or report something broken, and say what's wrong with it.":
    "Поверніть щось до магазину або повідомте про поломку і скажіть, що не так.",
  "Before you get on, ask whether this bus or tram goes where you're going.":
    "Перед посадкою спитайте, чи їде цей автобус або трамвай туди, куди вам треба.",
  "When you don't catch something, ask them to say it again instead of switching to English.":
    "Якщо щось не розчули, попросіть повторити, а не переходьте на англійську.",
  "Introduce yourself to somebody new: your name, where you live and what you do.":
    "Представтеся новій людині: як вас звати, де ви живете і чим займаєтеся.",
  "Say a price or which floor you live on out loud in Estonian, and ask them to say it back.":
    "Назвіть уголос естонською ціну або поверх, на якому живете, і попросіть повторити.",
  "Anywhere":
    "Будь-де",
  "A bus stop":
    "Зупинка",
  "a corridor":
    "коридор",
  "A queue":
    "Черга",
  "a lift":
    "ліфт",
  "Work":
    "Робота",
  "the stairwell":
    "під'їзд",
  "Home":
    "Дім",
  "a friend":
    "друг",
  "A form":
    "Анкета",
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
    "заняття",
  "a stairwell":
    "під'їзд",

  // TODAY: THE WORD OF THE DAY.
  "Word of the day":
    "Слово дня",
  "You've already met every word we could pick for today, which is a first. Have a browse in the dictionary, and there'll be a new one here tomorrow.":
    "Ви вже знаєте всі слова, які ми могли вибрати на сьогодні, і таке вперше. Загляньте до словника, а завтра тут буде нове.",
  "Open the dictionary":
    "Відкрити словник",
  "new to you":
    "нове для вас",
  "Hear {word}":
    "Послухати {word}",
  "See the full entry":
    "Уся стаття в словнику",
  "Words of the day kept so far: {kept}":
    "Збережено слів дня: {kept}",
  "Words of the day kept so far: {kept}, {days} in a row":
    "Збережено слів дня: {kept}, {days} поспіль",

  // THE CLIMB TO THE LEVEL THEY ARE AIMING AT.
  "{part}, day {day}":
    "{part}, день {day}",
  "{credited} of {total} words":
    "Слів: {credited} з {total}",
  "You've reached {target}":
    "Ви досягли рівня {target}",
  "On the way to {target}":
    "На шляху до {target}",
  "{n} you've shown you know":
    "{n} уже підтверджено",
  "{n} counted from your level":
    "{n} зараховано за рівнем",
  ", done. ":
    ", пройдено. ",
  ", counted from your level, {shown} of {words} shown in your reviews so far. ":
    ", зараховано за вашим рівнем, у повтореннях поки підтверджено {shown} з {words}. ",
  "{parts} parts. ":
    "Частин: {parts}. ",
  "How this bar fills up":
    "Як заповнюється ця смуга",
  "You know every word this level asks for. There's nothing new left in it.":
    "Ви знаєте всі слова, потрібні на цьому рівні. Нового в ньому не лишилося.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you tick off an evening. You're on {part}.":
    "Ви пройшли {pct}% шляху від початку {start} до {target}. Суцільна частина росте, лише коли слово справді закріпилося в повтореннях, а не коли ви позначаєте вечір. Ви зараз на {part}.",
  "You're {pct}% of the way from the start of {start} to {target}. The solid part only grows when a word really sticks in your reviews, not when you tick off an evening.":
    "Ви пройшли {pct}% шляху від початку {start} до {target}. Суцільна частина росте, лише коли слово справді закріпилося в повтореннях, а не коли ви позначаєте вечір.",
  "Every level up to {target} counts as yours already. What's left is proving it, and that's what the evenings are for.":
    "Усі рівні до {target} уже зараховано вам. Лишилося це підтвердити, для цього й потрібні вечори.",
  "Pick a target in Settings and this becomes the one number worth keeping an eye on.":
    "Виберіть мету в налаштуваннях, і це стане єдиним числом, за яким варто стежити.",
  "Your level check put you at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "Перевірка рівня показала {level}, тож {levels} ми зарахували вам. Нічого нижче вашого рівня проходити заново не доведеться.",
  "You told us you're at {level}, so {levels} count as yours. You won't have to redo anything below your level.":
    "Ви сказали, що ваш рівень {level}, тож {levels} ми зарахували вам. Нічого нижче вашого рівня проходити заново не доведеться.",
  "First steps":
    "Перші кроки",
  "Everyday Estonian":
    "Естонська на щодень",
  "Independent user":
    "Незалежний користувач",
  "Confident user":
    "Впевнений користувач",
  "Proficient user":
    "Вільне володіння",
  "You can make yourself understood in a shop, a café and a first introduction.":
    "Ви можете порозумітися в магазині, у кав'ярні та під час першого знайомства.",
  "You can hold a simple conversation about your day, your family and your plans.":
    "Ви можете підтримати просту розмову про свій день, родину і плани.",
  "You can explain, disagree and handle the unexpected without switching to English.":
    "Ви можете пояснити, заперечити й упоратися з несподіваним, не переходячи на англійську.",
  "You can follow a public debate and argue your side of it in writing.":
    "Ви можете стежити за публічною дискусією і письмово обстоювати свою позицію.",
  "You can write academic and professional Estonian that reads as if it was written in Estonian, not translated.":
    "Ви можете писати академічною та професійною естонською так, ніби текст одразу написано естонською, а не перекладено.",

  // THE MODULE SCREEN.
  "Your evenings, already planned":
    "Ваші вечори вже сплановано",
  "{evenings} short evenings, from your very first word all the way to C1. We've planned every one.":
    "Від найпершого слова аж до C1: {evenings}, і всі короткі. Ми спланували кожен.",
  "You've been choosing what to do each evening, and that's fine. Starting this won't change anything else.":
    "Ви самі вибирали, чим займатися щовечора, і це нормально. Якщо почати курс, більше нічого не зміниться.",
  "It starts at {start}, where you are now. It's a plan to lean on, not a track you're stuck on, and everything else in the app stays where it is.":
    "Курс починається з {start}, там, де ви зараз. Це план, на який можна спертися, а не колія, з якої не вибратися, і все інше в застосунку лишається на своїх місцях.",
  "It starts at {start}, the level after the {level} you already have. It's a plan to lean on, not a track you're stuck on, and everything else in the app stays where it is.":
    "Курс починається з {start}, наступного рівня після вашого {level}. Це план, на який можна спертися, а не колія, з якої не вибратися, і все інше в застосунку лишається на своїх місцях.",
  "{part} is finished":
    "Частину «{part}» пройдено",
  "All {total} evenings done. Every word you met is in your reviews now.":
    "Усі вечори пройдено, їх було {total}. Кожне слово, яке ви зустріли, тепер у ваших повтореннях.",
  "our guess, not a rule":
    "наше припущення, а не правило",
  "Not ready for {part} yet":
    "До {part} поки зарано",
  "We'd give it a few more days to settle before you build the next part on it.":
    "Ми б дали вивченому ще кілька днів улягтися, перш ніж будувати на ньому наступну частину.",
  "Start {part} anyway":
    "Усе одно почати {part}",
  "Review what's due":
    "Повторити картки на сьогодні",
  "Next is {part} ({about}). It picks up where this one stopped, and it only asks about things you've already met.":
    "Далі {part} ({about}). Ця частина починається там, де закінчилася попередня, і питає лише про те, що ви вже зустрічали.",
  "That's the whole course, start to finish. Every word is in your reviews, and each one will come back just as you're about to forget it.":
    "Це весь курс від початку до кінця. Усі слова у ваших повтореннях, і кожне повернеться саме тоді, коли ви почнете його забувати.",
  "See what you could handle out there":
    "Що вам уже під силу в житті",
  "Start {part}":
    "Почати {part}",
  "Open the course":
    "Відкрити курс",
  "That's tonight done":
    "На сьогодні все",
  "{run} evenings in a row now, and {done} of {total} done.":
    "Вечорів поспіль: {run}, пройдено {done} з {total}.",
  "{done} of {total} evenings done. See you tomorrow.":
    "Пройдено вечорів: {done} з {total}. До завтра!",
  "Come back tomorrow for {unit}.":
    "Повертайтеся завтра: попереду {unit}.",
  "Come back tomorrow for {unit} ({english}).":
    "Повертайтеся завтра: попереду {unit} ({english}).",
  "Sleep does half the work of making tonight's words stick, so stopping here is part of the plan.":
    "Половину роботи із запам'ятовування сьогоднішніх слів зробить сон, тож зупинитися зараз теж частина плану.",
  "Hear tonight's words once more":
    "Послухати слова цього вечора ще раз",
  "Start the next one now":
    "Почати наступний зараз",
  "Back to Today":
    "На головну",
  "{done} of {total}":
    "{done} з {total}",
  "Where you are":
    "Де ви зараз",
  "Day {day} of {total}, part {n} of {of}":
    "День {day} з {total}, частина {n} з {of}",
  "By the end of this unit":
    "До кінця цього розділу",
  "By the end of tonight":
    "До кінця цього вечора",
  "{words} again":
    "{words} на повторення",
  "0m":
    "0",
  "{minutes}m":
    "{minutes}",
  "left":
    "хв до кінця",
  "Tonight's words":
    "Слова цього вечора",
  "A few of these aren't in your deck yet. The first step adds them.":
    "Деяких із них ще немає у вашій колоді. Перший крок їх додасть.",
  "What you do tonight":
    "Що ви робите цього вечора",
  "How a step gets ticked":
    "Як позначається крок",
  "Meeting the words and the review at the end tick themselves off as you answer. The others you tick yourself, because we can't tell which exercise an answer came from, and we'd rather admit that than pretend we were watching.":
    "Знайомство зі словами і повторення наприкінці позначаються самі, поки ви відповідаєте. Решту ви позначаєте самі, бо ми не бачимо, з якої вправи прийшла відповідь, і краще чесно це визнати, ніж вдавати, що стежили.",
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
  "This is the easy way in, not the only one.":
    "Це простий спосіб почати, але не єдиний.",
  "{link} whenever you'd rather choose for yourself.":
    "{link}, коли захочете вибирати самі.",
  "Turn it off":
    "Вимкнути",
  "The whole course":
    "Увесь курс",
  "Every part, by name":
    "Усі частини за назвами",
  "You are here":
    "Ви тут",
  "based on your last two weeks":
    "за вашими останніми двома тижнями",

  // THE STEPS OF AN EVENING.
  "Go over tonight's {words}":
    "Повторити {words} цього вечора",
  "Learn tonight's {newWords}":
    "Вивчити {newWords}",
  "Learn tonight's {newWords}, and {met} from earlier":
    "Вивчити {newWords} і повторити знайомі ({met})",
  "Every one of these is from earlier in the course. Tonight they come back for what the page is about.":
    "Усі ці слова вже були в курсі раніше. Сьогодні вони повертаються заради того, про що ця сторінка.",
  "Hear each word and see what it means. A few minutes later you pick it out of four, and that's what makes it stay.":
    "Послухайте кожне слово й подивіться, що воно означає. За кілька хвилин ви виберете його з чотирьох, і саме це допомагає його запам'ятати.",
  "See what each word means, pick it out of four a little later, then type it into a real Estonian sentence.":
    "Подивіться, що означає кожне слово, трохи згодом виберіть його з чотирьох, а потім впишіть у справжнє естонське речення.",
  "Read how tonight's words work":
    "Прочитати, як влаштовані слова цього вечора",
  "One short page on the grammar behind tonight's words, shown in real sentences.":
    "Одна коротка сторінка про граматику, на якій тримаються слова цього вечора, на справжніх реченнях.",
  "{title} again":
    "{title} (ще раз)",
  "Read \"{title}\"":
    "Прочитати «{title}»",
  "Read about the -{suffix} ending, \"{plain}\"":
    "Прочитати про закінчення -{suffix}, «{plain}»",
  "Read about the -{suffix} ending":
    "Прочитати про закінчення -{suffix}",
  "Read about {name}, \"{plain}\"":
    "Прочитати про {name}, «{plain}»",
  "Read about {name}":
    "Прочитати про {name}",
  "The past tense of one verb":
    "Минулий час одного дієслова",
  "The past tense of {verbs}":
    "Минулий час: {verbs}",
  "Estonian verbs don't all change the same way in the past, so you learn each one on its own. Listen to them, then try three quick questions.":
    "У минулому часі естонські дієслова змінюються по-різному, тож кожне вчать окремо. Послухайте їх, а потім дайте відповідь на три швидкі запитання.",
  "{title}, again at your level":
    "{title}: знову, на вашому рівні",
  "The conversation":
    "Розмова",
  "Have the conversation":
    "Поговорити естонською",
  "You've had this one before. Tonight they talk to you the way they'd talk to anybody, and you've got far more to say back.":
    "Ця розмова у вас уже була. Сьогодні з вами говорять так, як говорили б із будь-ким, а відповісти ви тепер можете значно більше.",
  "Somebody wants something from you, and only Estonian will do. This is what all those words were for.":
    "Комусь щось від вас потрібно, і впоратися можна лише естонською. Ось для чого були всі ці слова.",
  "A quick review, then you're done":
    "Коротке повторення, і на сьогодні все",
  "A few minutes on the words you're about to forget, tonight's included. This is the part that makes them stick.":
    "Кілька хвилин на слова, які ви ось-ось забудете, зокрема сьогоднішні. Саме це допомагає їм закріпитися.",
  "Pair each word with its meaning against the clock. It's quick, it's fun, and the meanings stick before you ever have to say them.":
    "З'єднуйте кожне слово з його значенням на час. Це швидко й весело, і значення запам'ятовуються ще до того, як їх доведеться вимовляти.",
  "The same words, but this time you only hear them. Reading a word and catching it when somebody says it are two different skills.":
    "Ті самі слова, але тепер ви їх лише чуєте. Прочитати слово і впізнати його, коли хтось його вимовляє, це дві різні навички.",
  "A race through the words you've met, and their endings once you've read about them. Answer fast enough and you stop working words out and simply know them.":
    "Перегони зі знайомими словами, а коли прочитаєте про закінчення, то й із закінченнями. Відповідайте швидко, і ви перестанете обмірковувати кожне слово й почнете просто його знати.",
  "Put a real Estonian sentence back together, word by word. Do it a few times and you start to feel where things go.":
    "Зберіть справжнє естонське речення слово за словом. Зробіть так кілька разів, і ви почнете відчувати, що куди ставиться.",
  "Hear a whole sentence and write it down. This is where long and short vowels stop being a rule and start being a sound.":
    "Послухайте ціле речення і запишіть його. Саме тут довгі й короткі голосні перестають бути правилом і стають звуком.",
  "Look at a picture and write one sentence of your own about it. That's what all these words are for.":
    "Подивіться на картинку і напишіть про неї одне своє речення. Саме для цього й потрібні всі ці слова.",
  "Guess today's six-letter word. Three minutes, and Estonian letters start feeling like old friends.":
    "Вгадайте слово дня з шести літер. Три хвилини, і естонські літери починають здаватися старими знайомими.",
  "Four versions of one word, and a question telling you which one to hit. Only the ending tells them apart, so you learn to read it fast.":
    "Чотири варіанти одного слова і запитання, яке підказує, у який влучити. Відрізняються вони лише закінченням, тож ви вчитеся швидко його читати.",
  "One verb, six people: I, you, she and the rest. If you can't change a verb for who's doing it, you can't really use it yet.":
    "Одне дієслово, шість осіб: я, ти, вона й решта. Поки ви не вмієте змінювати дієслово за особами, по-справжньому користуватися ним ще не вийде.",
  "Say it out loud, then hear how it should sound. Nobody marks you. This one is just for your own ears.":
    "Скажіть уголос, а потім послухайте, як це має звучати. Ніхто вас не оцінює. Це лише для ваших вух.",
  "Write a sentence of your own with the ending we ask for. We check that word against the dictionary before anything else.":
    "Напишіть своє речення із закінченням, яке ми просимо. Це слово ми насамперед звіряємо зі словником.",
  "Aitan sind, but helistan sulle. Every verb chooses its own ending for whatever comes after it, and English gives you no clue, so you learn them one verb at a time.":
    "Aitan sind, але helistan sulle. Кожне дієслово саме вибирає закінчення для того, що йде після нього, і вгадати його не можна, тож їх учать по одному дієслову.",
  "The words that don't follow the usual ending rules. See each one, then write it yourself, and soon you won't need to look them up.":
    "Слова, які не підкоряються звичайним правилам закінчень. Подивіться на кожне, потім напишіть його самі, і незабаром заглядати в довідник не доведеться.",
  "A word you know, with its letters shuffled. Put them back and õ, ä, ö and ü stop looking like plain a's, o's and u's.":
    "Знайоме слово з перемішаними літерами. Розставте їх на місця, і літери з крапками та тильдою перестануть здаватися звичайними a, o та u.",
  "Words you've already met, asked in new ways: read aloud, missing from a sentence, or in a sentence you write.":
    "Слова, які ви вже зустрічали, у нових запитаннях: на слух, із пропуском у реченні або у вашому власному реченні.",

  // THE STEP LIST AND THE MODULE'S OWN CHROME.
  "{graded} of {needed} answer done. Keep going and this ticks itself off.":
    "Відповідей: {graded} з {needed}. Продовжуйте, і крок позначиться сам.",
  "{graded} of {needed} answers done. Keep going and this ticks itself off.":
    "Відповідей: {graded} з {needed}. Продовжуйте, і крок позначиться сам.",
  "Done, going by your answers":
    "Готово, судячи з ваших відповідей",
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
    "Не вийшло, тож нічого не змінилося. Спробуйте ще раз трохи згодом.",
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
    "Ідіть далі, і крок {n} з {of} буде пройдено.",
  "That didn't reach us, so this step isn't ticked yet.":
    "До нас це не дійшло, тож крок поки не позначено.",
  "Finish tonight":
    "Завершити вечір",
  "Next, step {n}: {title}":
    "Далі, крок {n}: {title}",
  "Next, step {n}":
    "Далі, крок {n}",
  "Leave tonight's module and go back to Today":
    "Вийти з уроку цього вечора і повернутися на головну",
  "Leave":
    "Вийти",
  "Step {n} of {of}":
    "Крок {n} з {of}",
  "Finish":
    "Завершити",
  "Next step":
    "Наступний крок",
  "You're still on this step.":
    "Ви все ще на цьому кроці.",
  "Back to today's module":
    "Назад до уроку на сьогодні",

  // THE PAST FORMS STEP.
  "Tonight's module":
    "Урок цього вечора",
  "The past of your verbs":
    "Минулий час ваших дієслів",
  "Each verb makes its past its own way, so learn them a few at a time. Listen, then try three.":
    "Кожне дієслово утворює минулий час по-своєму, тож учіть їх потроху. Послухайте, а потім дайте відповідь на три запитання.",
  "No verbs to learn here tonight":
    "Сьогодні тут немає дієслів",
  "We don't have the past forms of tonight's verbs yet. Carry on to the next step.":
    "Форм минулого часу для сьогоднішніх дієслів у нас поки немає. Переходьте до наступного кроку.",
  "the ones you've met":
    "ті, що ви вже зустрічали",
  "Tonight's verbs":
    "Дієслова цього вечора",

  // TRY IT: THE READING ASKS BACK.
  "You just looked forms up in the table. That's exactly what it's there for.":
    "Ви щойно шукали форми в таблиці. Саме для цього вона й потрібна.",
  "You got every one right. Later tonight you'll get questions like these about tonight's words.":
    "Усі відповіді правильні. Пізніше цього вечора будуть схожі запитання про сьогоднішні слова.",
  "Glance back at the table whenever a form looks odd. It'll look a lot less odd by tomorrow.":
    "Якщо форма здається дивною, загляньте в таблицю. До завтра вона здаватиметься значно менш дивною.",
  "{n} of {total}, just practice":
    "{n} з {total}, просто тренування",
  "Try it":
    "Спробуйте",
  "Which form":
    "Яка форма",
  "hear it":
    "послухати",
  "{lemma} means {translation}. Which one is \"I\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «я»?",
  "{lemma} means {translation}. Which one is \"I would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «я б»?",
  "{lemma} means {translation}. Which one is \"you\", talking to one person?":
    "Слово {lemma} означає «{translation}». Яка форма для «ти», коли звертаєтеся до однієї людини?",
  "{lemma} means {translation}. Which one is \"you would\", talking to one person?":
    "Слово {lemma} означає «{translation}». Яка форма для «ти б», коли звертаєтеся до однієї людини?",
  "{lemma} means {translation}. Which one is \"he or she\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «він або вона»?",
  "{lemma} means {translation}. Which one is \"he or she would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «він або вона б»?",
  "{lemma} means {translation}. Which one is \"we\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «ми»?",
  "{lemma} means {translation}. Which one is \"we would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «ми б»?",
  "{lemma} means {translation}. Which one is \"you\", talking to several people or politely?":
    "Слово {lemma} означає «{translation}». Яка форма для «ви», коли звертаєтеся до кількох людей або ввічливо?",
  "{lemma} means {translation}. Which one is \"you would\", talking to several people or politely?":
    "Слово {lemma} означає «{translation}». Яка форма для «ви б», коли звертаєтеся до кількох людей або ввічливо?",
  "{lemma} means {translation}. Which one is \"they\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «вони»?",
  "{lemma} means {translation}. Which one is \"they would\"?":
    "Слово {lemma} означає «{translation}». Яка форма для «вони б»?",
  "Yes. {value} is {lemma} for {pronoun}.":
    "Так, {value} це форма дієслова {lemma} для {pronoun}.",
  "Yes. {value} is {lemma} for {pronoun}, and for {shared} too.":
    "Так, {value} це форма дієслова {lemma} для {pronoun}, а також для {shared}.",
  "Not that one. With {pronoun} it's {value}.":
    "Не ця. Для {pronoun} буде {value}.",
  "Not that one. With {pronoun} it's {value}, and the same with {shared}.":
    "Не ця. Для {pronoun} буде {value}, і для {shared} так само.",
  "{lemma} means {translation}. Which one says \"not\"?":
    "Слово {lemma} означає «{translation}». Яка форма каже «не»?",
  "{lemma} means {translation}. Which one tells somebody to do it?":
    "Слово {lemma} означає «{translation}». Яка форма каже комусь це зробити?",
  "Yes. {answer} is how you say not with {lemma}, {translation}.":
    "Так, {answer} це заперечення дієслова {lemma}, «{translation}».",
  "Yes. {answer} is how you tell one person to do it with {lemma}, {translation}.":
    "Так, {answer} це наказова форма дієслова {lemma}, «{translation}», для однієї людини.",
  "Not that one. For {lemma}, it's {answer}.":
    "Не ця. У {lemma} буде {answer}.",
  "{lemma} means {translation}. Which one says \"I did it\", back in the past?":
    "Слово {lemma} означає «{translation}». Яка форма про минуле, коли це робив сам мовець?",
  "{lemma} means {translation}. Which one says \"he or she did it\", back in the past?":
    "Слово {lemma} означає «{translation}». Яка форма про минуле, коли це робив хтось інший?",
  "Yes. {answer} is the past, when you did it yourself. {now} is happening right now.":
    "Так, {answer} це минуле, коли це робили ви самі. А {now} це те, що відбувається зараз.",
  "Yes. {answer} is the past, when somebody else did it. {now} is happening right now.":
    "Так, {answer} це минуле, коли це робив хтось інший. А {now} це те, що відбувається зараз.",
  "Not that one. {answer} is the past, when you did it yourself.":
    "Не ця. {answer} це минуле, коли це робили ви самі.",
  "Not that one. {answer} is the past, when somebody else did it.":
    "Не ця. {answer} це минуле, коли це робив хтось інший.",
  "{lemma} means {translation}. Which one says \"{reading}\"?":
    "Слово {lemma} означає «{translation}». Яка форма означає «{reading}»?",
  "Which one is {lemma}, {translation}, in the {case}?":
    "Яка форма слова {lemma}, «{translation}», у відмінку {case}?",
  "Yes. {form} is {lemma} in the {case}.":
    "Так, {form} це {lemma} у відмінку {case}.",
  "Yes. {form} is {lemma} in the {case}. It's {stem} with {ending} on the end.":
    "Так, {form} це {lemma} у відмінку {case}. Це {stem} із закінченням {ending}.",
  "Not that one. {lemma} becomes {form}.":
    "Не ця. {lemma} стає {form}.",
  "Not that one. {lemma} becomes {form}. It's {stem} with {ending} on the end.":
    "Не ця. {lemma} стає {form}. Це {stem} із закінченням {ending}.",

  // WHETHER THIS IS THE RIGHT PART, AND THE HAND-OFF.
  "You're flying through this":
    "У вас усе йде гладко",
  "You're flying through the top of the course":
    "Ви легко проходите вершину курсу",
  "This part is a tough one":
    "Ця частина непроста",
  "Lately you've been getting every answer right.":
    "Останнім часом ви відповідаєте правильно на все.",
  "Lately you've been getting {seen} out of a hundred right.":
    "Останнім часом ви відповідаєте правильно на {seen} зі ста.",
  "If this part feels too easy, skip ahead to {part}. Everything from this one stays in your reviews either way.":
    "Якщо ця частина здається надто легкою, переходьте одразу до {part}. Усе з цієї частини в будь-якому разі лишиться у ваших повтореннях.",
  "There's no part above this one, so stretch yourself with your reviews and the tougher conversations.":
    "Вище цієї частини нічого немає, тож випробуйте себе в повтореннях і складніших розмовах.",
  "A lot of recent answers have been misses. This part is a step ahead of you for now, and that's normal.":
    "Багато останніх відповідей були неправильними. Ця частина поки на крок попереду вас, і це нормально.",
  "Lately you've been getting {seen} out of a hundred right. This part is a step ahead of you for now, and that's normal.":
    "Останнім часом ви відповідаєте правильно на {seen} зі ста. Ця частина поки на крок попереду вас, і це нормально.",
  "Your reviews will bring back the words that are slipping. Give it a few days.":
    "Повторення повернуть слова, які вислизають. Дайте цьому кілька днів.",
  "The level you started at was a first guess. Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Рівень, з якого ви почали, був лише першим припущенням. Якщо спершу повторити {level}, ця частина стане значно легшою. Це просто освіжить знання, а ця частина вас зачекає.",
  "Going over {level} first will make this part much easier. It's a refresher, and this part waits for you afterwards.":
    "Якщо спершу повторити {level}, ця частина стане значно легшою. Це просто освіжить знання, а ця частина вас зачекає.",
  "{part} is the part you skipped, and this one leans on it. Going back fills in the gaps.":
    "{part} це частина, яку ви пропустили, а ця на неї спирається. Повернувшись, ви заповните прогалини.",
  "Refresh {level} first":
    "Спершу освіжити {level}",
  "Go back to {part}":
    "Повернутися до {part}",
  "Skip ahead to {part}":
    "Перейти одразу до {part}",
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
    "Зараз ви відповідаєте правильно на {seen} зі ста. Перехід до складнішої частини лише знизить це число.",
  "Give it a few more days of reviews and that number will climb on its own. You won't lose anything, and nothing has to be done twice.":
    "Ще кілька днів повторень, і це число саме зросте. Ви нічого не втратите, і нічого не доведеться робити двічі.",
  "A few gentler days will sort this out. Your reviews already know which words are giving you trouble.":
    "Кілька спокійніших днів усе виправлять. Повторення вже знають, які слова даються вам важко.",

  // THE PARTS OF THE COURSE: WHAT EACH IS ABOUT, AND WHAT FINISHING IT MEANS.
  "Hello, you and me, the verb to be, and the people around you":
    "Вітання, ви і я, дієслово «бути» і люди навколо вас",
  "Your name, numbers, your home, and the verbs you'll use every day":
    "Ваше ім'я, числа, ваш дім і дієслова на щодень",
  "Your name and where you live, how to count, the rooms of your home, and the eleven verbs you'll need in almost every sentence you ever say. By the end you can introduce yourself, count, and describe where you live.":
    "Ваше ім'я і де ви живете, як рахувати, кімнати вашого дому та одинадцять дієслів, які знадобляться майже в кожному вашому реченні. Наприкінці ви зможете представитися, порахувати й описати, де живете.",
  "Food, the time, your day, and what things are like":
    "Їжа, час, ваш день і які бувають речі",
  "Food and drink, the days and the clock, what you do from morning to night, and your first words for what things look like, colors included. By the end you can say what you're doing, when, and what it's like.":
    "Їжа й напої, дні тижня й години, що ви робите з ранку до вечора, і перші слова про те, який вигляд мають речі, зокрема кольори. Наприкінці ви зможете сказати, що робите, коли і який усе це має вигляд.",
  "Clothes, weather, prices, and a shop":
    "Одяг, погода, ціни й магазин",
  "What you're wearing, what the weather's doing, the bigger numbers you need for prices, and then a shop to put it all to work in. By the end you can describe what you want and buy it.":
    "Що ви вдягли, яка погода, великі числа, потрібні для цін, а потім магазин, де все це знадобиться. Наприкінці ви зможете описати, що вам потрібно, і купити це.",
  "Where things are, the bus, somebody and something, and when":
    "Де що розташоване, автобус, хтось і щось, і коли",
  "Where things are and where you're heading, getting around by bus, words like somebody and nothing, and talking about when. By the end you can ask where something is, catch a bus there, and say when you arrived.":
    "Де що розташоване і куди ви прямуєте, як їздити автобусом, слова на кшталт «хтось» і «нічого» і розмова про те, коли що відбувається. Наприкінці ви зможете спитати, де щось розташоване, доїхати туди автобусом і сказати, коли приїхали.",
  "Joining words, the calendar, and where people are from":
    "Слова-зв'язки, календар і звідки люди родом",
  "Words for joining two thoughts or saying how sure you are, the months and the holidays, where people come from, and a few animals and parts of the body. By the end you can link two ideas and say when something happens.":
    "Слова, що поєднують дві думки або кажуть, наскільки ви впевнені, місяці й свята, звідки люди родом, а ще трохи про тварин і частини тіла. Наприкінці ви зможете поєднати дві думки і сказати, коли щось відбувається.",
  "How things are done, more everyday words, and asking for help":
    "Як що робиться, ще повсякденні слова і прохання про допомогу",
  "The last of A1. Words for how something was done, and the small words that change what a verb means. Then more of the everyday: food, places in town and the people who work there, ten verbs every child knows and ten more describing words. It ends on asking for help, and by then you have every word A1 asks for.":
    "Остання частина A1. Слова про те, як щось зроблено, і маленькі слова, що змінюють значення дієслова. Потім ще повсякденне: їжа, місця в місті й люди, які там працюють, десять дієслів, які знає будь-яка дитина, і ще десять слів для опису. Завершується все проханням про допомогу, і на той час у вас є всі слова, потрібні для A1.",
  "Asking for things, yesterday, the outdoors, the body and the house":
    "Прохання, учорашній день, природа, тіло і дім",
  "School, travel, the town, a free afternoon, and comparing things":
    "Навчання, подорожі, місто, вільний день і порівняння",
  "Life outside your front door: school, trips, the town, your weekends, and saying which of two things is better. There are four conversations to practise on along the way. By the end you can buy a ticket, ask the way and say what you did on Saturday.":
    "Життя за порогом дому: навчання, подорожі, місто, ваші вихідні і як сказати, яка з двох речей краща. Дорогою на вас чекають чотири розмови для практики. Наприкінці ви зможете купити квиток, спитати дорогу й розповісти, що робили в суботу.",
  "Eating out, making plans, keeping in touch, and how you feel":
    "Їжа поза домом, плани, спілкування і почуття",
  "Talking about what hasn't happened yet, keeping in touch, and saying how you feel about it all. It has five conversations, more than any other part. By the end you can get through a whole meal in Estonian, book an appointment and ring somebody about it.":
    "Розмова про те, що ще не сталося, спілкування з людьми і як сказати, що ви про все це відчуваєте. Тут п'ять розмов, більше, ніж у будь-якій іншій частині. Наприкінці ви зможете пообідати в ресторані цілком естонською, записатися на прийом і зателефонувати, щоб про нього домовитися.",
  "Objects, the people in your life, what each verb asks for, money, and would":
    "Додаток у реченні, люди у вашому житті, чого вимагає кожне дієслово, гроші й «б»",
  "School, two new past forms, renting, what people are like, and the news":
    "Навчання, дві нові форми минулого, оренда, які бувають люди і новини",
  "School and a job interview first. Then the verb forms ending in -nud and -tud, and the two past tenses built from them. Then renting a flat, what people are like, and the news, which leans on those same forms to say what happened without saying who did it. By the end you can get through an interview, read a news story and phone a landlord.":
    "Спершу навчання і співбесіда на роботу. Потім дієслівні форми на -nud і -tud та два минулі часи, що з них будуються. Потім оренда квартири, які бувають люди і новини, де ті самі форми допомагають сказати, що сталося, не називаючи, хто це зробив. Наприкінці ви зможете пройти співбесіду, прочитати новину й зателефонувати орендодавцеві.",
  "Technology, opinions, the environment, things going wrong, and two-part verbs":
    "Технології, думки, довкілля, коли щось іде не так, і дієслова з двох частин",
  "Disagreeing with somebody, the things the papers argue about, and coping when something breaks. B1 ends on verbs that come in two parts, because they follow the same object rule you met at the start of B1. By the end you can argue your side without switching to English.":
    "Як сперечатися зі співрозмовником, про що сперечаються в газетах і як упоратися, коли щось зламалося. B1 завершується дієсловами з двох частин, бо вони підкоряються тому самому правилу додатка, яке ви зустріли на початку B1. Наприкінці ви зможете обстояти свою думку, не переходячи на англійську.",
  "Leaving out who did it, society, hearsay, the economy, and doing two things at once":
    "Без вказівки, хто це зробив, суспільство, переказ, економіка і дві дії одночасно",
  "History, building new words, politics, health and science":
    "Історія, творення нових слів, політика, здоров'я і наука",
  "It opens on had done, the past before the past, learned on history, where you'll meet it most. Then how to work out a word you've never seen from one you already know, and three subjects to try it on. By the end you can read an opinion piece on any of them without a dictionary open.":
    "Частина відкривається давноминулим часом, минулим до минулого, і вчите ви його на історії, де він трапляється найчастіше. Потім як зрозуміти незнайоме слово за вже знайомим і три теми, щоб це випробувати. Наприкінці ви зможете прочитати авторську колонку на будь-яку з цих тем, не відкриваючи словника.",
  "The arts, the law, the mind, working life, figures, and making a case":
    "Мистецтво, право, психологія, робота, цифри й аргументація",
  "The end of B2: the arts, making a proper complaint, describing how people behave, working in Estonian, reading a table of figures, and building an argument that gives a little ground before it wins.":
    "Кінець B2: мистецтво, як подати справжню скаргу, як описати поведінку людей, робота естонською, читання таблиці з цифрами й аргумент, який спершу трохи поступається, а потім перемагає.",
  "Saying more in fewer words, and long sentences that hold together":
    "Сказати більше меншою кількістю слів і довгі речення, що тримаються купи",
  "Ethics, persuasion, how formal to be, idioms, and holding a text together":
    "Етика, переконання, наскільки офіційно говорити, ідіоми і зв'язний текст",
  "Knowing how formal to be and getting it right, winning over somebody who disagrees, and the set phrases no rule will ever explain.":
    "Розуміти, наскільки офіційно говорити, і влучати в тон, переконувати незгодних і сталі вирази, яких не пояснить жодне правило.",
  "New ideas, the wider world, literature, and words that almost mean the same":
    "Нові ідеї, великий світ, література й майже синоніми",
  "The last part of the course. By the end you've met everything in it, and what's left is reading Estonian because you want to.":
    "Остання частина курсу. Наприкінці ви зустрінете все, що в ньому є, і лишиться тільки читати естонською, бо вам цього хочеться.",
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
