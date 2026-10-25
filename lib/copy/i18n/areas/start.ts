import type { Area } from "../area";

/**
 * Sign-in and first run, in Russian and Ukrainian: the first five minutes,
 * which decide whether somebody stays.
 *
 * The screens are `app/(chromeless)/sign-in/` and `app/(chromeless)/start/`,
 * and the lines here also cover the data first run draws (the reasons, the
 * targets, the deadlines, the letter-bar and gloss-language choices) and the
 * few course lines it shows on its last screen: the first part of each level
 * and the starter units' subtitles. Two lines are left out on purpose,
 * "{label}, {cards}" and "{words}, {cards}.", because they hold nothing but
 * their slots and a comma, and read the same in all three languages.
 *
 * No Estonian in here (ADR-005). Where an English line quotes Estonian
 * ("Tere, aitäh", the four letters õ, ä, ö and ü), the Estonian goes into a
 * slot at the call site and only the sentence around it is translated.
 */
export const START: Area = {
  ru: {
    // SIGN-IN.
    "Back to the front page": "На главную страницу",
    "Trouble signing in?": "Не получается войти?",
    "Sign in to start. It’s free, and if you’ve been here before, everything you learned is where you left it.":
      "Войди, чтобы начать. Это бесплатно, а если ты здесь не впервые, всё выученное на своём месте.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with, or ask {email} to add you.":
      "С этим адресом нельзя войти в эту копию Kodukeel: она настроена для определённой группы. Попробуй аккаунт, на который тебя пригласили, или попроси {email} добавить тебя.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with.":
      "С этим адресом нельзя войти в эту копию Kodukeel: она настроена для определённой группы. Попробуй аккаунт, на который тебя пригласили.",
    "That link would have signed you in as someone else, so to be safe we signed you out and didn’t follow it. If the link is yours, sign in below. If you didn’t ask for it, you can safely ignore it.":
      "Эта ссылка вела в чужой аккаунт, поэтому для безопасности мы вывели тебя из аккаунта и не стали её открывать. Если ссылка твоя, войди ниже. Если нет, просто не обращай на неё внимания.",
    "Only continue if you asked for this sign-in link yourself just now. If you didn’t, close this page.":
      "Продолжай, только если эта ссылка для входа пришла по твоему собственному запросу только что. Если нет, закрой эту страницу.",
    "Finish signing in": "Завершить вход",
    "This browser couldn’t finish that sign-in. Either the link was opened in a different browser from the one that asked for it, or you ended up on a different address from the one you started on. Try again from here.":
      "Этот браузер не смог завершить вход. Либо ссылку открыли не в том браузере, в котором её запросили, либо открылся не тот адрес сайта, с которого начинался вход. Попробуй ещё раз отсюда.",
    "If it keeps happening, let {email} know: this address needs adding to the sign-in settings.":
      "Если это повторяется, сообщи {email}: этот адрес нужно добавить в настройки входа.",
    "If it keeps happening, whoever runs this copy needs to add this address to the sign-in settings.":
      "Если это повторяется, тот, кто управляет этой копией, должен добавить этот адрес в настройки входа.",
    "That sign-in did not go through. An emailed link works once and only lasts an hour, so if yours is older than that, ask for a fresh one below.":
      "Войти не получилось. Ссылка из письма срабатывает один раз и действует всего час, так что если твоей уже больше часа, запроси новую ниже.",
    "This copy is running in local mode. There are no accounts and no signing in, and everything is kept right here on this machine. Add {url} and {key} to your {env} to turn on sign-in and separate decks for each person.":
      "Эта копия работает в локальном режиме. Здесь нет аккаунтов и входа, а всё хранится прямо на этом компьютере. Добавь {url} и {key} в свой {env}, чтобы включить вход и отдельные колоды для каждого человека.",
    "Start studying": "Начать учиться",
    "A dictionary that shows you every form of every word": "Словарь, в котором видна каждая форма каждого слова",
    "Your words brought back just before you'd forget them, plus quick games: speed rounds, listening and matching pairs":
      "Твои слова возвращаются прямо перед тем, как ты их забудешь, а ещё быстрые игры: раунды на скорость, аудирование и поиск пар",
    "Anu, a tutor who explains the grammar and never makes up a word":
      "Ану, репетитор, которая объясняет грамматику и никогда не выдумывает слов",
    "A conversation to rehearse, and one small thing to say to a real person today":
      "Разговор, чтобы отрепетировать, и одна маленькая фраза, которую сегодня можно сказать живому человеку",
    "Kodukeel is for people aged 13 and over. If you’re younger, a parent needs to say yes first.":
      "Kodukeel рассчитан на людей от 13 лет. Если тебе меньше, сначала нужно согласие родителей.",
    "Estonian forms and example sentences from Ekilex (Institute of the Estonian Language, CC BY 4.0). English translations from English Wiktionary (CC BY-SA 4.0). Word counts from FrequencyWords over OpenSubtitles (CC BY-SA 4.0). Every spelling of every word from Ekilex’s own tables as gathered in Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0), and from Vabamorf (LGPL). Speech from the University of Tartu, and heard on your device by TalTech’s Estonian model (MIT) running in sherpa-onnx (Apache 2.0).":
      "Эстонские формы и примеры предложений из Ekilex (Институт эстонского языка, CC BY 4.0). Английские переводы из английского Викисловаря (CC BY-SA 4.0). Частотность слов из FrequencyWords по OpenSubtitles (CC BY-SA 4.0). Все написания всех слов из собственных таблиц Ekilex в сборке Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0) и из Vabamorf (LGPL). Озвучка от Тартуского университета, а распознавание речи на твоём устройстве делает эстонская модель TalTech (MIT) на sherpa-onnx (Apache 2.0).",

    // THE SIGN-IN FORM.
    "If this keeps happening, Google sign-in may not be turned on for this copy yet.":
      "Если это повторяется, возможно, вход через Google в этой копии ещё не включён.",
    "Try again, or reload the page.": "Попробуй ещё раз или перезагрузи страницу.",
    "If this keeps happening, {domain} may not be set up for single sign-on here yet.":
      "Если это повторяется, возможно, для {domain} здесь ещё не настроен единый вход.",
    "We couldn’t reach the sign-in page for {domain}. Try again, and if it keeps happening, let whoever set this up know.":
      "Не удалось открыть страницу входа для {domain}. Попробуй ещё раз, а если не получится снова, сообщи тому, кто это настраивал.",
    "That address can’t sign in through a company account here. Use Google above, or ask whoever set this up.":
      "С этим адресом здесь нельзя войти через рабочий аккаунт. Войди через Google выше или спроси того, кто это настраивал.",
    "If this keeps happening, email sign-in may not be turned on for this copy yet.":
      "Если это повторяется, возможно, вход по почте в этой копии ещё не включён.",
    "Check your email": "Проверь почту",
    "We’ve sent a link to {address}. Open it in this browser and you’re in. It stops working after an hour.":
      "Мы отправили ссылку на {address}. Открой её в этом браузере, и ты войдёшь. Через час она перестанет работать.",
    "Use a different address": "Указать другой адрес",
    "Taking you to Google…": "Переходим в Google…",
    "Continue with Google": "Войти через Google",
    // Sign in with Apple (N-3). Machine translated, reviewed by no native speaker yet.
    "Continue with Apple": "Войти через Apple",
    "Opening Apple…": "Открываем Apple…",
    "Apple’s sign-in hasn’t loaded. Reload the page, or use another way in.":
      "Вход через Apple не загрузился. Обнови страницу или войди другим способом.",
    "That Apple sign-in didn’t go through. Try again, or use another way in.":
      "Вход через Apple не удался. Попробуй ещё раз или войди другим способом.",
    "or": "или",
    "Your email or work address": "Личная или рабочая почта",
    "Your email address": "Адрес электронной почты",
    "Sending…": "Отправляем…",
    "Taking you there…": "Переходим…",
    "Continue with your work account": "Войти через рабочий аккаунт",
    "Email me a link": "Прислать ссылку на почту",
    "Continue": "Продолжить",
    "Type a name above to carry on.": "Чтобы продолжить, впиши имя выше.",
    "We’ll take you to the {domain} sign-in you already use.":
      "Мы перенаправим тебя на вход {domain}, которым ты уже пользуешься.",
    "No password to make up or forget. A work address takes you to your company’s sign-in, and any other address gets a link to open in this browser.":
      "Не нужно придумывать и запоминать пароль. С рабочим адресом ты перейдёшь ко входу своей компании, а на любой другой придёт ссылка, которую нужно открыть в этом браузере.",
    "No password to make up or forget. Just open the link in this browser.":
      "Не нужно придумывать и запоминать пароль. Просто открой ссылку в этом браузере.",
    "Use the work address your company signs in with.":
      "Укажи рабочий адрес, с которым ты входишь в системы компании.",

    // FIRST RUN: THE FRAME.
    "You": "О тебе",
    "Level": "Уровень",
    "Goal": "Цель",
    "Step {n} of {total}, {name}": "Шаг {n} из {total}: {name}",
    "Setup progress, step {n} of {total}": "Настройка, шаг {n} из {total}",
    "Back": "Назад",
    "Measured {level}": "Измерено: {level}",
    "Estimated {level}": "Твоя оценка: {level}",
    "below A1": "ниже A1",
    "Building your deck...": "Собираем твою колоду…",
    "Start learning": "Начать учиться",
    "That didn’t go through, so nothing’s been saved yet. Press it again.":
      "Не получилось, поэтому пока ничего не сохранено. Нажми ещё раз.",
    "Pick a daily goal from the list.": "Выбери дневную цель из списка.",
    "Pick a level from the list.": "Выбери уровень из списка.",
    "Skip this and go straight to your words": "Пропустить и сразу перейти к словам",

    // FIRST RUN: YOU.
    "What should we call you?": "Как к тебе обращаться?",
    "Your name or a nickname": "Твоё имя или прозвище",
    "We only use it to say hello, and to show your teacher if you ever join a class.":
      "Оно нужно только для того, чтобы поздороваться с тобой, а если ты вступишь в группу, его увидит преподаватель.",
    "How do you type {a}, {b}, {c} and {d}?": "Как ты набираешь {a}, {b}, {c} и {d}?",
    "Show the letters": "Показывать буквы",
    "Buttons for these letters appear under every box where you type Estonian.":
      "Кнопки с этими буквами появятся под каждым полем, где ты пишешь по-эстонски. На русской и английской раскладке этих букв нет.",
    "I have them already": "Они у меня уже есть",
    "Your keyboard already types them, so no extra buttons.": "Твоя клавиатура уже их набирает (например, эстонская раскладка), так что кнопки не нужны.",
    "You can change this any time, in Settings or right from the row of letters.":
      "Это можно изменить в любой момент в настройках или прямо в строке с буквами.",
    "What language would you like meanings in?": "На каком языке показывать значения слов?",
    "English": "Английский",
    "Russian": "Русский",
    "Plain English meanings": "Значения на английском",
    "What stays in English": "Что остаётся на английском",
    "The same in English": "То же по-английски",
    "You’ll always see the English as well. The Russian and Ukrainian meanings come straight from the Estonian dictionary, written by the same people as the Estonian.":
      "Английское значение ты тоже будешь видеть всегда. Русские значения взяты прямо из эстонского словаря, их писали те же люди, что и эстонскую часть.",
    "Kodukeel will not score your pronunciation, let an AI grade you, or replace a teacher. It’s where you rehearse conversations before you have them.":
      "Kodukeel не оценивает твоё произношение, не даёт ИИ ставить тебе оценки и не заменяет преподавателя. Здесь ты репетируешь разговоры, прежде чем они случатся.",

    // FIRST RUN: LEVEL.
    "Where are you now?": "Какой у тебя сейчас уровень?",
    "Take the level check to find out, or just pick the one that sounds like you. The check stops as soon as it has found your level. Either way, you can change it later in Settings.":
      "Пройди проверку уровня, чтобы узнать, или просто выбери тот, что подходит по описанию. Проверка закончится, как только определит твой уровень. В любом случае его можно потом изменить в настройках.",
    "Measured just now": "Только что измерено",
    "Take it again": "Пройти ещё раз",
    "Take the level check": "Пройти проверку уровня",
    "The level check isn’t ready on this copy of Kodukeel yet, because its dictionary hasn’t been loaded. For now, pick the level that sounds most like you.":
      "В этой копии Kodukeel проверка уровня пока недоступна: словарь ещё не загружен. А пока выбери уровень, который больше всего тебе подходит.",
    "Or make a guess": "Или оцени на глаз",
    "Guess your level": "Оцени свой уровень",
    "Just starting": "Только начинаю",
    "{words}, and not much else yet.": "{words}, а больше пока почти ничего.",
    "The basics": "Основы",
    "You can greet people, count and say a few things about yourself.": "Можешь поздороваться, посчитать и немного рассказать о себе.",
    "You’ll start on {level}.": "Начнёшь с уровня {level}.",
    "You’ll go over {level} first.": "Сначала ты повторишь уровень {level}.",
    "Rather go over {level} before moving on?": "Хочешь сначала повторить уровень {level}?",
    "Start on {level} instead": "Начать с уровня {level}",
    "Your level check put you at {level}, and you asked to go over it before moving on.":
      "Проверка показала уровень {level}, и ты решил сначала его повторить.",
    "You said you’re at {level}, and you asked to go over it before moving on.":
      "Ты указал уровень {level} и решил сначала его повторить.",
    "I get by": "Могу объясниться",
    "You can shop, order things and put a simple sentence together.":
      "Можешь сходить в магазин, что-нибудь заказать и составить простое предложение.",
    "Conversational": "Могу поддержать разговор",
    "You can hold up your end of a clear conversation.": "Можешь поддерживать разговор, если собеседник говорит понятно.",
    "Confident": "Уверенно",
    "You can follow a meeting and read an article without stopping.":
      "Можешь следить за ходом совещания и читать статью не останавливаясь.",
    "Fluent": "Свободно",
    "Pretty much anything. You're here for the finer shades of meaning.":
      "Почти всё. Ты здесь ради тонких оттенков смысла.",
    "Estonian has four letters English doesn’t: {a}, {b}, {c} and {d}. You’ll see them everywhere. For now, recognizing them is enough.":
      "В эстонском есть четыре буквы, которых нет в русском алфавите: {a}, {b}, {c} и {d}. Они встречаются повсюду. Пока достаточно их узнавать.",

    // FIRST RUN: GOAL.
    "How we worked that out": "Как мы это посчитали",
    "Why Estonian?": "Зачем тебе эстонский?",
    "Pick every one that’s true. We’ll suggest a level to aim for, and the plan at the bottom changes as you answer.":
      "Отметь всё, что подходит. Мы предложим уровень, к которому стоит стремиться, а план внизу будет меняться вместе с твоими ответами.",
    "Why you are learning Estonian": "Зачем ты учишь эстонский",
    "I live in Estonia": "Я живу в Эстонии",
    "The shop, the doctor, the bus, the neighbors, the forms. Everyday life, in the language all around you.":
      "Магазин, врач, автобус, соседи, бланки. Жизнь на языке, который звучит вокруг.",
    "Citizenship or residence": "Гражданство или ВНЖ",
    "There's a state exam at the end of this one, and it picks the level for you.":
      "В конце тебя ждёт государственный экзамен, он и определит твой уровень.",
    "Work": "Работа",
    "Meetings, emails and colleagues who talk at full speed. At work you need to be understood exactly, not roughly.":
      "Совещания, письма и коллеги, которые говорят быстро. На работе тебя должны понимать точно.",
    "School or university": "Школа или университет",
    "A course with a syllabus, homework, and a mark waiting at the end of term.":
      "Программа, домашние задания и оценка в конце семестра.",
    "Family or a partner": "Семья или партнёр",
    "The people you most want to understand, at the speed they talk.":
      "Люди, которых ты больше всего хочешь понимать, в их обычном темпе речи.",
    "Roots and heritage": "Корни и семейная история",
    "A language your family spoke, or a country you keep coming back to.":
      "Язык твоей семьи или страна, в которую ты всё время возвращаешься.",
    "Travel": "Путешествия",
    "Enough to order, ask, say thanks and read a sign without reaching for your phone.":
      "Заказать, спросить, поблагодарить и прочитать вывеску без телефона.",
    "Curiosity": "Любопытство",
    "Fourteen cases, and words that change shape when you're not looking.":
      "Четырнадцать падежей и слова, меняющие форму, пока ты не смотришь.",
    "What level are you aiming for?": "Какого уровня ты хочешь достичь?",
    "What level are you aiming for": "Какого уровня ты хочешь достичь",
    "Get by": "Объясняться",
    "Handle everyday life": "Справляться в быту",
    "Live in the language": "Жить на этом языке",
    "Work in it": "Работать на нём",
    "Use it like your own": "Владеть как родным",
    "By when?": "К какому сроку?",
    "By when": "К какому сроку",
    "In three months": "За три месяца",
    "In six months": "За полгода",
    "In a year": "За год",
    "In two years": "За два года",
    "No deadline, I'm in no hurry": "Без срока, я не тороплюсь",
    "Days a week you will really practice": "Сколько дней в неделю ты правда будешь заниматься",
    "be honest, the plan is built on it": "только честно: на этом строится план",
    "What this is going to take": "Что для этого потребуется",
    "from your answers and published estimates": "по твоим ответам и опубликованным оценкам",
    "This plan starts from your own guess at your level. Take the level check whenever you like, and it’ll redo the math with your real one.":
      "Этот план исходит из твоей собственной оценки уровня. Пройди проверку уровня, когда захочешь, и всё пересчитается по твоему настоящему уровню.",

    // FIRST RUN: TONIGHT.
    "Your first words": "Твои первые слова",
    "This copy of Kodukeel has no dictionary loaded yet, so there are no first words to give you. Whoever runs it can load one with {command}. You can still pick your pace below, and add words yourself as you come across them.":
      "В этой копии Kodukeel ещё не загружен словарь, поэтому первых слов пока нет. Тот, кто управляет этой копией, может загрузить его командой {command}. А темп ты можешь выбрать уже сейчас, ниже, и самостоятельно добавлять слова, когда они тебе попадутся.",
    "How much a day": "Сколько времени в день",
    "changeable any time in Settings": "можно изменить в любой момент в настройках",
    "Casual": "Спокойно",
    "Regular": "Регулярно",
    "Serious": "Серьёзно",
    "Intense": "Интенсивно",
    "{minutes} a day, {days} a week. That’s {cards} to answer, not {goal} new ones. About nine in ten will be words you’ve already met, coming back just as you start to forget them.":
      "{minutes} в день, {days} в неделю. Ответить нужно на {cards}, а не на {goal} новых. Примерно девять из десяти будут уже знакомыми словами: они возвращаются как раз тогда, когда ты начинаешь их забывать.",
    "You never have to work out what to study. Kodukeel plans each evening for you: which words, in what order, and which games. About fifteen minutes, and then it tells you you’re done.":
      "Тебе никогда не придётся решать, что учить. Kodukeel планирует за тебя каждый вечер: какие слова, в каком порядке и какие игры. Примерно пятнадцать минут, а потом он скажет, что на сегодня всё.",
    "You start at {part}": "Ты начинаешь с части {part}",
    "Why this part, and what’s in it": "Почему эта часть и что в ней",
    "{evenings}, about {minutes} each.": "{evenings}, каждый около {minutes}.",
    "The whole way to C1": "Весь путь до C1",
    "{evenings} in all, and every word in the course turns up in one of them. You can step off the plan whenever you like and use the app your own way. Nothing disappears, and everything you do still counts.":
      "Всего {evenings}, и каждое слово курса встретится в одном из них. Ты можешь в любой момент отойти от плана и пользоваться приложением по-своему. Ничего не пропадёт, и всё, что ты делаешь, всё равно засчитывается.",
    "picked for your level": "подобраны под твой уровень",
    "Today's words come from your first {units} at {level}. Each word becomes a flashcard you can hear read aloud, with all its forms.":
      "Сегодняшние слова взяты из начала уровня {level}: {units}. Каждое слово станет карточкой со всеми его формами, которую можно прослушать.",
    "The other {units} at {level}, and every other level, are on the path whenever you want them.":
      "Остальные разделы уровня {level} (ещё {units}) и все другие уровни доступны в любой момент.",
    "Nothing here is locked in.": "Всё это можно поменять.",
    "Your first conversation": "Твой первый разговор",
    "Once you know these words, you can practice this exact conversation here, typing your side to a stranger who wants something from you.":
      "Когда выучишь эти слова, сможешь отрепетировать здесь именно этот разговор: ты печатаешь свои реплики незнакомцу, которому что-то от тебя нужно.",
    "How you’ll practice it": "Как это отрепетировать",
    "The words, unit by unit": "Слова, раздел за разделом",
    "Your first lesson gives you its words, and each one becomes a card you can hear read aloud. Every lesson after that adds its own.":
      "Первый урок даст тебе свои слова, и каждое станет карточкой, которую можно прослушать. Каждый следующий урок добавит свои.",
    "That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the evening. About nine in ten will be words you’ve already met, coming back just as you start to forget them. Pick the one you’d still open on a bad Wednesday.":
      "В день нужно ответить на {cards}, а не на {goal} новых, а в вечер с занятием по курсу они уже входят в это занятие. Примерно девять из десяти будут уже знакомыми словами: они возвращаются как раз тогда, когда ты начинаешь их забывать. Выбери режим, который ты откроешь даже в неудачную среду.",
    "That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the fifteen minutes. About nine in ten will be words you’ve already met, coming back just as you start to forget them. These {deck} take roughly {weeks} to work through this way. A faster setting really does get you through them sooner, but it makes every evening longer for the next year too. Pick the one you’d still open on a bad Wednesday.":
      "В день нужно ответить на {cards}, а не на {goal} новых, а в вечер с занятием по курсу они входят в те самые пятнадцать минут. Примерно девять из десяти будут уже знакомыми словами: они возвращаются как раз тогда, когда ты начинаешь их забывать. В таком темпе на всю колоду ({deck}) уйдёт примерно {weeks}. Более быстрый режим и правда позволит пройти её раньше, но и каждый вечер весь следующий год будет длиннее. Выбери тот, который ты откроешь даже в неудачную среду.",

    // WHY THIS PART.
    "If it turns out too hard or too easy, the course will notice and offer to move you.":
      "Если окажется слишком сложно или слишком легко, курс это заметит и предложит перейти на другую часть.",
    "You start at the very beginning, with the first words anybody needs.":
      "Ты начинаешь с самого начала, с первых слов, которые нужны любому.",
    "Your level check put you at {level}, which is the top of this course, so you start on its first part.":
      "Проверка уровня показала {level}, а это высший уровень курса, поэтому ты начинаешь с первой части этого уровня.",
    "You said you’re at {level}, which is the top of this course, so you start on its first part.":
      "По твоим словам, у тебя уровень {level}, а это высший уровень курса, поэтому ты начинаешь с первой части этого уровня.",
    "Your level check put you at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "Проверка уровня показала {level}, и твоя цель тоже {level}, поэтому ты начинаешь с первой части этого уровня, чтобы закрепить его.",
    "You said you’re at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "По твоим словам, у тебя уровень {level}, и твоя цель тоже {level}, поэтому ты начинаешь с первой части этого уровня, чтобы закрепить его.",
    "Your level check put you at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "Проверка уровня показала {level}, поэтому будем считать {level} пройденным и начнём со следующего уровня.",
    "You said you’re at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "По твоим словам, у тебя уровень {level}, поэтому будем считать {level} пройденным и начнём со следующего уровня.",

    // THE FIRST CONVERSATION, OFF THE REASON.
    "Going to the shop for milk": "Сходить в магазин за молоком",
    "Your kitchen, then the corner store, with a friend on the phone": "Твоя кухня, потом магазин за углом, а друг на связи по телефону",
    "Handing in a form at a counter": "Сдать бланк в окошке",
    "The desk at an office that wants your paperwork": "Стойка в учреждении, где от тебя ждут документы",
    "Ordering a drink": "Заказать напиток",
    "The counter of a small café": "Стойка маленького кафе",
    "Buying a bus ticket": "Купить билет на автобус",
    "The ticket window at the bus station": "Билетная касса на автовокзале",

    // THE STARTER UNITS' SUBTITLES.
    "Hello, thank you, yes and no": "Привет, спасибо, да и нет",
    "I, you, he or she, we, you, they": "Я, ты, он или она, мы, вы, они",
    "I am, you are, this is": "Глагол «быть»: я, ты, это",
    "And, but, too, very, here and now, and don't": "И, но, тоже, очень, здесь и сейчас, а ещё «не»",
    "Asking, telling and offering": "Попросить, сказать и предложить",
    "Talking about yesterday": "Рассказ о вчерашнем дне",
    "Nature and animals": "Природа и животные",
    "Body and health": "Тело и здоровье",
    "The whole thing, or some of it": "Целиком или частично",
    "Relationships": "Отношения",
    "Which case a verb wants": "Какой падеж нужен глаголу",
    "Work, money and decisions": "Работа, деньги и решения",
    "When nobody is named": "Когда никто не назван",
    "Society and public life": "Общество и общественная жизнь",
    "Passing on what you heard": "Пересказ услышанного",
    "Economy and business": "Экономика и бизнес",
    "Turning clauses into phrases": "Превращение придаточных в обороты",
    "Long sentences that stay clear": "Длинные предложения, которые остаются понятными",
    "Arguing a point": "Аргументация",
    "Research writing": "Научное письмо",

    // THE FIRST PART OF EACH LEVEL.
    "You start from nothing and build up the way a sentence does. Five words on the first evening, then I, you, he and she, then the verb to be, with a form for each person. After that come the little words that hold a sentence together, a few greetings and questions, and the people in your life. By the end you can say hello, ask where somebody lives and tell them who's in your family.":
      "Ты начинаешь с нуля и строишь язык так же, как строится предложение. Пять слов в первый вечер, потом я, ты, он и она, потом глагол «быть» с формой для каждого лица. Дальше маленькие слова, которые скрепляют предложение, несколько приветствий и вопросов и люди в твоей жизни. В конце ты сможешь поздороваться, спросить, где человек живёт, и рассказать, кто входит в твою семью.",
    "A2 starts with what makes a conversation possible: asking for something without sounding like a robot. Then the past tense, and your first case endings, starting with the one all the others are built on. By the end you can say what you did yesterday and what's wrong with you, and you can try your first conversations.":
      "A2 начинается с того, без чего разговор невозможен: как попросить что-то и не звучать как робот. Потом прошедшее время и первые падежные окончания, начиная с того, на котором строятся все остальные. В конце ты сможешь рассказать про свой вчерашний день и про то, что у тебя болит, и попробовать первые разговоры.",
    "Two things separate knowing Estonian words from knowing Estonian: getting the object of a sentence right, and knowing which ending each verb wants after it. You learn each one on everyday words, first the people in your life, then work and money. Then comes would, for wishes and polite requests. Grammar and new words take turns, so it's never two weeks of tables.":
      "Знание эстонских слов отличается от знания эстонского двумя вещами: правильным падежом дополнения и тем, какого падежа требует после себя каждый глагол. Каждую из них ты учишь на повседневных словах: сначала о близких людях, потом о работе и деньгах. Затем условное наклонение для желаний и вежливых просьб. Грамматика и новые слова чередуются, так что двух недель сплошных таблиц не будет.",
    "Estonian has three forms you learn here: one for when nobody is named, one for passing on what you heard, and one for doing two things at once. Each comes with the words it usually goes with: the impersonal with society, the reported form with the economy, and the last on its own. By the end you can read a report that never names anybody.":
      "В эстонском есть три формы, которые ты здесь выучишь: одна для случаев, когда никто не назван, вторая для пересказа услышанного, третья для двух действий сразу. Каждая идёт в паре со словами, с которыми обычно встречается: безличная форма с темой общества, пересказывательное наклонение с экономикой, а последняя сама по себе. К концу ты сможешь прочитать отчёт, в котором никто не назван.",
    "C1 is about fitting into a phrase what B2 needed a whole clause for. You practice it on academic writing, research and philosophy, which is where you'll need it most.":
      "Уровень C1 про то, как уместить в оборот то, для чего на B2 нужно было целое придаточное. Ты тренируешь это на академических текстах, исследованиях и философии, где это понадобится больше всего.",
    "Today, and every day after":
      "Сегодня и каждый следующий день",
    "Today's module is {title}, {words} and one short round.":
      "Занятие на сегодня: {title}, {words} и один короткий раунд.",
  },
  uk: {
    // SIGN-IN.
    "Back to the front page": "На головну сторінку",
    "Trouble signing in?": "Не вдається увійти?",
    "Sign in to start. It’s free, and if you’ve been here before, everything you learned is where you left it.":
      "Увійди, щоб почати. Це безкоштовно, а якщо ти тут не вперше, усе вивчене на своєму місці.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with, or ask {email} to add you.":
      "З цією адресою не можна увійти в цю копію Kodukeel, бо її налаштовано для певної групи. Спробуй обліковий запис, на який тебе запросили, або попроси {email} додати тебе.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with.":
      "З цією адресою не можна увійти в цю копію Kodukeel, бо її налаштовано для певної групи. Спробуй обліковий запис, на який тебе запросили.",
    "That link would have signed you in as someone else, so to be safe we signed you out and didn’t follow it. If the link is yours, sign in below. If you didn’t ask for it, you can safely ignore it.":
      "Це посилання вело в чужий обліковий запис, тож для безпеки ми завершили твій сеанс і не стали його відкривати. Якщо посилання твоє, увійди нижче. Якщо ні, просто не зважай на нього.",
    "Only continue if you asked for this sign-in link yourself just now. If you didn’t, close this page.":
      "Продовжуй, лише якщо це посилання для входу щойно прийшло на твій власний запит. Якщо ні, закрий цю сторінку.",
    "Finish signing in": "Завершити вхід",
    "This browser couldn’t finish that sign-in. Either the link was opened in a different browser from the one that asked for it, or you ended up on a different address from the one you started on. Try again from here.":
      "Цей браузер не зміг завершити вхід. Або посилання відкрили не в тому браузері, де його запитували, або відкрилася не та адреса, з якої починався вхід. Спробуй ще раз звідси.",
    "If it keeps happening, let {email} know: this address needs adding to the sign-in settings.":
      "Якщо це повторюється, повідом {email}: цю адресу треба додати до налаштувань входу.",
    "If it keeps happening, whoever runs this copy needs to add this address to the sign-in settings.":
      "Якщо це повторюється, той, хто керує цією копією, має додати цю адресу до налаштувань входу.",
    "That sign-in did not go through. An emailed link works once and only lasts an hour, so if yours is older than that, ask for a fresh one below.":
      "Увійти не вдалося. Посилання з листа спрацьовує один раз і діє лише годину, тож якщо твоєму вже понад годину, запроси нове нижче.",
    "This copy is running in local mode. There are no accounts and no signing in, and everything is kept right here on this machine. Add {url} and {key} to your {env} to turn on sign-in and separate decks for each person.":
      "Ця копія працює в локальному режимі. Тут немає облікових записів і входу, а все зберігається просто на цьому комп'ютері. Додай {url} і {key} до свого {env}, щоб увімкнути вхід і окремі колоди для кожного.",
    "Start studying": "Почати навчання",
    "A dictionary that shows you every form of every word": "Словник, у якому видно кожну форму кожного слова",
    "Your words brought back just before you'd forget them, plus quick games: speed rounds, listening and matching pairs":
      "Твої слова повертаються якраз перед тим, як ти їх забудеш, а ще швидкі ігри: раунди на швидкість, аудіювання й пошук пар",
    "Anu, a tutor who explains the grammar and never makes up a word":
      "Ану, репетиторка, яка пояснює граматику й ніколи не вигадує слів",
    "A conversation to rehearse, and one small thing to say to a real person today":
      "Розмова для репетиції й одна маленька фраза, яку сьогодні можна сказати живій людині",
    "Kodukeel is for people aged 13 and over. If you’re younger, a parent needs to say yes first.":
      "Kodukeel призначений для людей від 13 років. Якщо тобі менше, спершу потрібна згода батьків.",
    "Estonian forms and example sentences from Ekilex (Institute of the Estonian Language, CC BY 4.0). English translations from English Wiktionary (CC BY-SA 4.0). Word counts from FrequencyWords over OpenSubtitles (CC BY-SA 4.0). Every spelling of every word from Ekilex’s own tables as gathered in Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0), and from Vabamorf (LGPL). Speech from the University of Tartu, and heard on your device by TalTech’s Estonian model (MIT) running in sherpa-onnx (Apache 2.0).":
      "Естонські форми та приклади речень з Ekilex (Інститут естонської мови, CC BY 4.0). Англійські переклади з англійського Вікісловника (CC BY-SA 4.0). Частотність слів з FrequencyWords за OpenSubtitles (CC BY-SA 4.0). Усі написання всіх слів з власних таблиць Ekilex у збірці Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0) та з Vabamorf (LGPL). Озвучення від Тартуського університету, а розпізнавання мовлення на твоєму пристрої робить естонська модель TalTech (MIT) на sherpa-onnx (Apache 2.0).",

    // THE SIGN-IN FORM.
    "If this keeps happening, Google sign-in may not be turned on for this copy yet.":
      "Якщо це повторюється, можливо, вхід через Google у цій копії ще не ввімкнено.",
    "Try again, or reload the page.": "Спробуй ще раз або перезавантаж сторінку.",
    "If this keeps happening, {domain} may not be set up for single sign-on here yet.":
      "Якщо це повторюється, можливо, для {domain} тут ще не налаштовано єдиний вхід.",
    "We couldn’t reach the sign-in page for {domain}. Try again, and if it keeps happening, let whoever set this up know.":
      "Не вдалося відкрити сторінку входу для {domain}. Спробуй ще раз, а якщо знову не вийде, повідом тому, хто це налаштовував.",
    "That address can’t sign in through a company account here. Use Google above, or ask whoever set this up.":
      "З цією адресою тут не можна увійти через робочий обліковий запис. Увійди через Google вище або запитай того, хто це налаштовував.",
    "If this keeps happening, email sign-in may not be turned on for this copy yet.":
      "Якщо це повторюється, можливо, вхід через пошту в цій копії ще не ввімкнено.",
    "Check your email": "Перевір пошту",
    "We’ve sent a link to {address}. Open it in this browser and you’re in. It stops working after an hour.":
      "Ми надіслали посилання на {address}. Відкрий його в цьому браузері, і ти ввійдеш. Через годину воно перестане працювати.",
    "Use a different address": "Вказати іншу адресу",
    "Taking you to Google…": "Переходимо до Google…",
    "Continue with Google": "Продовжити з Google",
    // Sign in with Apple (N-3). Machine translated, reviewed by no native speaker yet.
    "Continue with Apple": "Продовжити з Apple",
    "Opening Apple…": "Відкриваємо Apple…",
    "Apple’s sign-in hasn’t loaded. Reload the page, or use another way in.":
      "Вхід через Apple не завантажився. Онови сторінку або увійди іншим способом.",
    "That Apple sign-in didn’t go through. Try again, or use another way in.":
      "Вхід через Apple не вдався. Спробуй ще раз або увійди іншим способом.",
    "or": "або",
    "Your email or work address": "Особиста або робоча пошта",
    "Your email address": "Адреса електронної пошти",
    "Sending…": "Надсилаємо…",
    "Taking you there…": "Переходимо…",
    "Continue with your work account": "Увійти через робочий обліковий запис",
    "Email me a link": "Надіслати посилання на пошту",
    "Continue": "Продовжити",
    "Type a name above to carry on.": "Щоб продовжити, впиши імʼя вище.",
    "We’ll take you to the {domain} sign-in you already use.":
      "Ми перенаправимо тебе на вхід {domain}, яким ти вже користуєшся.",
    "No password to make up or forget. A work address takes you to your company’s sign-in, and any other address gets a link to open in this browser.":
      "Не треба вигадувати й запам'ятовувати пароль. З робочою адресою ти перейдеш до входу своєї компанії, а на будь-яку іншу прийде посилання, яке треба відкрити в цьому браузері.",
    "No password to make up or forget. Just open the link in this browser.":
      "Не треба вигадувати й запам'ятовувати пароль. Просто відкрий посилання в цьому браузері.",
    "Use the work address your company signs in with.":
      "Вкажи робочу адресу, з якою ти входиш у системи компанії.",

    // FIRST RUN: THE FRAME.
    "You": "Про тебе",
    "Level": "Рівень",
    "Goal": "Мета",
    "Step {n} of {total}, {name}": "Крок {n} з {total}: {name}",
    "Setup progress, step {n} of {total}": "Налаштування, крок {n} з {total}",
    "Back": "Назад",
    "Measured {level}": "Виміряно: {level}",
    "Estimated {level}": "За твоєю оцінкою: {level}",
    "below A1": "нижче A1",
    "Building your deck...": "Збираємо твою колоду…",
    "Start learning": "Почати навчання",
    "That didn’t go through, so nothing’s been saved yet. Press it again.":
      "Не вийшло, тож поки нічого не збережено. Натисни ще раз.",
    "Pick a daily goal from the list.": "Вибери денну мету зі списку.",
    "Pick a level from the list.": "Вибери рівень зі списку.",
    "Skip this and go straight to your words": "Пропустити й одразу перейти до слів",

    // FIRST RUN: YOU.
    "What should we call you?": "Як до тебе звертатися?",
    "Your name or a nickname": "Твоє ім'я або прізвисько",
    "We only use it to say hello, and to show your teacher if you ever join a class.":
      "Воно потрібне лише для того, щоб привітатися з тобою, а якщо ти приєднаєшся до групи, його побачить викладач.",
    "How do you type {a}, {b}, {c} and {d}?": "Як ти набираєш {a}, {b}, {c} і {d}?",
    "Show the letters": "Показувати літери",
    "Buttons for these letters appear under every box where you type Estonian.":
      "Кнопки з цими літерами з'являться під кожним полем, де ти пишеш естонською.",
    "I have them already": "Вони в мене вже є",
    "Your keyboard already types them, so no extra buttons.": "Твоя клавіатура вже їх набирає, тож додаткові кнопки не потрібні.",
    "You can change this any time, in Settings or right from the row of letters.":
      "Це можна змінити будь-коли в налаштуваннях або просто в рядку з літерами.",
    "What language would you like meanings in?": "Якою мовою показувати значення слів?",
    "English": "Англійська",
    "Ukrainian": "Українська",
    "Plain English meanings": "Значення англійською",
    "What stays in English": "Що залишається англійською",
    "The same in English": "Те саме англійською",
    "You’ll always see the English as well. The Russian and Ukrainian meanings come straight from the Estonian dictionary, written by the same people as the Estonian.":
      "Англійське значення ти теж завжди бачитимеш. Українські значення взято просто з естонського словника, їх писали ті самі люди, що й естонську частину.",
    "Kodukeel will not score your pronunciation, let an AI grade you, or replace a teacher. It’s where you rehearse conversations before you have them.":
      "Kodukeel не оцінює твою вимову, не дає ШІ ставити тобі оцінки й не замінює викладача. Тут ти репетируєш розмови, перш ніж вони відбудуться.",

    // FIRST RUN: LEVEL.
    "Where are you now?": "Який у тебе зараз рівень?",
    "Take the level check to find out, or just pick the one that sounds like you. The check stops as soon as it has found your level. Either way, you can change it later in Settings.":
      "Пройди перевірку рівня, щоб дізнатися, або просто вибери той, що найбільше схожий на тебе. Перевірка закінчиться, щойно визначить твій рівень. У будь-якому разі його можна потім змінити в налаштуваннях.",
    "Measured just now": "Щойно виміряно",
    "Take it again": "Пройти ще раз",
    "Take the level check": "Пройти перевірку рівня",
    "The level check isn’t ready on this copy of Kodukeel yet, because its dictionary hasn’t been loaded. For now, pick the level that sounds most like you.":
      "У цій копії Kodukeel перевірка рівня поки недоступна: словник ще не завантажено. А поки вибери рівень, який найбільше схожий на тебе.",
    "Or make a guess": "Або оціни на око",
    "Guess your level": "Оціни свій рівень",
    "Just starting": "Тільки починаю",
    "{words}, and not much else yet.": "{words}, а більше поки майже нічого.",
    "The basics": "Основи",
    "You can greet people, count and say a few things about yourself.": "Можеш привітатися, порахувати й трохи розповісти про себе.",
    "You’ll start on {level}.": "Почнеш із рівня {level}.",
    "You’ll go over {level} first.": "Спершу ти повториш рівень {level}.",
    "Rather go over {level} before moving on?": "Хочеш спершу повторити рівень {level}?",
    "Start on {level} instead": "Почати з рівня {level}",
    "Your level check put you at {level}, and you asked to go over it before moving on.":
      "Перевірка показала рівень {level}, і ти вирішив спершу його повторити.",
    "You said you’re at {level}, and you asked to go over it before moving on.":
      "Ти вказав рівень {level} і вирішив спершу його повторити.",
    "I get by": "Можу порозумітися",
    "You can shop, order things and put a simple sentence together.":
      "Можеш сходити в магазин, щось замовити й скласти просте речення.",
    "Conversational": "Можу підтримати розмову",
    "You can hold up your end of a clear conversation.": "Можеш підтримувати розмову, якщо співрозмовник говорить зрозуміло.",
    "Confident": "Упевнено",
    "You can follow a meeting and read an article without stopping.":
      "Можеш стежити за нарадою й читати статтю не зупиняючись.",
    "Fluent": "Вільно",
    "Pretty much anything. You're here for the finer shades of meaning.":
      "Майже все. Ти тут заради тонких відтінків значення.",
    "Estonian has four letters English doesn’t: {a}, {b}, {c} and {d}. You’ll see them everywhere. For now, recognizing them is enough.":
      "В естонській є чотири літери, яких немає в українській абетці: {a}, {b}, {c} і {d}. Вони трапляються всюди. Поки досить їх упізнавати.",

    // FIRST RUN: GOAL.
    "How we worked that out": "Як ми це порахували",
    "Why Estonian?": "Навіщо тобі естонська?",
    "Pick every one that’s true. We’ll suggest a level to aim for, and the plan at the bottom changes as you answer.":
      "Познач усе, що підходить. Ми запропонуємо рівень, до якого варто прагнути, а план унизу змінюватиметься разом із твоїми відповідями.",
    "Why you are learning Estonian": "Навіщо ти вчиш естонську",
    "I live in Estonia": "Я живу в Естонії",
    "The shop, the doctor, the bus, the neighbors, the forms. Everyday life, in the language all around you.":
      "Магазин, лікар, автобус, сусіди, бланки. Життя мовою, яка звучить довкола.",
    "Citizenship or residence": "Громадянство або посвідка на проживання",
    "There's a state exam at the end of this one, and it picks the level for you.":
      "Наприкінці на тебе чекає державний іспит, він і визначить твій рівень.",
    "Work": "Робота",
    "Meetings, emails and colleagues who talk at full speed. At work you need to be understood exactly, not roughly.":
      "Наради, листи й колеги, які говорять швидко. На роботі тебе мають розуміти точно.",
    "School or university": "Школа або університет",
    "A course with a syllabus, homework, and a mark waiting at the end of term.":
      "Програма, домашні завдання й оцінка наприкінці семестру.",
    "Family or a partner": "Родина або партнер",
    "The people you most want to understand, at the speed they talk.":
      "Люди, яких ти найбільше хочеш розуміти, у їхньому звичному темпі мовлення.",
    "Roots and heritage": "Коріння й родинна історія",
    "A language your family spoke, or a country you keep coming back to.":
      "Мова твоєї родини або країна, до якої ти постійно повертаєшся.",
    "Travel": "Подорожі",
    "Enough to order, ask, say thanks and read a sign without reaching for your phone.":
      "Замовити, запитати, подякувати й прочитати вивіску без телефона.",
    "Curiosity": "Цікавість",
    "Fourteen cases, and words that change shape when you're not looking.":
      "Чотирнадцять відмінків і слова, що змінюють форму, поки ти не дивишся.",
    "What level are you aiming for?": "Якого рівня ти прагнеш досягти?",
    "What level are you aiming for": "Якого рівня ти прагнеш досягти",
    "Get by": "Порозумітися",
    "Handle everyday life": "Давати раду в побуті",
    "Live in the language": "Жити цією мовою",
    "Work in it": "Працювати цією мовою",
    "Use it like your own": "Володіти як рідною",
    "By when?": "До якої дати?",
    "By when": "До якої дати",
    "In three months": "За три місяці",
    "In six months": "За півроку",
    "In a year": "За рік",
    "In two years": "За два роки",
    "No deadline, I'm in no hurry": "Без терміну, я не поспішаю",
    "Days a week you will really practice": "Скільки днів на тиждень ти справді займатимешся",
    "be honest, the plan is built on it": "тільки чесно: на цьому будується план",
    "What this is going to take": "Що для цього знадобиться",
    "from your answers and published estimates": "за твоїми відповідями й опублікованими оцінками",
    "This plan starts from your own guess at your level. Take the level check whenever you like, and it’ll redo the math with your real one.":
      "Цей план спирається на твою власну оцінку рівня. Пройди перевірку рівня, коли захочеш, і все перерахується за твоїм справжнім рівнем.",

    // FIRST RUN: TONIGHT.
    "Your first words": "Твої перші слова",
    "This copy of Kodukeel has no dictionary loaded yet, so there are no first words to give you. Whoever runs it can load one with {command}. You can still pick your pace below, and add words yourself as you come across them.":
      "У цій копії Kodukeel ще не завантажено словник, тож перших слів поки немає. Той, хто нею керує, може завантажити його командою {command}. А темп ти можеш вибрати вже зараз, нижче, і самостійно додавати слова, коли вони тобі траплятимуться.",
    "How much a day": "Скільки часу на день",
    "changeable any time in Settings": "можна будь-коли змінити в налаштуваннях",
    "Casual": "Спокійно",
    "Regular": "Регулярно",
    "Serious": "Серйозно",
    "Intense": "Інтенсивно",
    "{minutes} a day, {days} a week. That’s {cards} to answer, not {goal} new ones. About nine in ten will be words you’ve already met, coming back just as you start to forget them.":
      "{minutes} на день, {days} на тиждень. Відповісти треба на {cards}, а не на {goal} нових. Приблизно дев'ять із десяти будуть уже знайомими словами: вони повертаються саме тоді, коли ти починаєш їх забувати.",
    "You never have to work out what to study. Kodukeel plans each evening for you: which words, in what order, and which games. About fifteen minutes, and then it tells you you’re done.":
      "Тобі ніколи не доведеться вирішувати, що вчити. Kodukeel планує за тебе кожен вечір: які слова, у якому порядку і які ігри. Приблизно п'ятнадцять хвилин, а потім він скаже, що на сьогодні все.",
    "You start at {part}": "Ти починаєш із частини {part}",
    "Why this part, and what’s in it": "Чому ця частина і що в ній",
    "{evenings}, about {minutes} each.": "{evenings}, кожен близько {minutes}.",
    "The whole way to C1": "Увесь шлях до C1",
    "{evenings} in all, and every word in the course turns up in one of them. You can step off the plan whenever you like and use the app your own way. Nothing disappears, and everything you do still counts.":
      "Усього {evenings}, і кожне слово курсу трапиться в одному з них. Ти можеш будь-коли відійти від плану й користуватися застосунком по-своєму. Нічого не зникне, і все, що ти робиш, однаково зараховується.",
    "picked for your level": "дібрані під твій рівень",
    "Today's words come from your first {units} at {level}. Each word becomes a flashcard you can hear read aloud, with all its forms.":
      "Сьогоднішні слова взято з початку рівня {level}: {units}. Кожне слово стане карткою з усіма його формами, яку можна прослухати.",
    "The other {units} at {level}, and every other level, are on the path whenever you want them.":
      "Ще {units} рівня {level} і всі інші рівні відкриті для тебе будь-коли.",
    "Nothing here is locked in.": "Усе це можна змінити.",
    "Your first conversation": "Твоя перша розмова",
    "Once you know these words, you can practice this exact conversation here, typing your side to a stranger who wants something from you.":
      "Коли вивчиш ці слова, зможеш відрепетирувати тут саме цю розмову: ти друкуєш свої репліки незнайомцю, якому щось від тебе треба.",
    "How you’ll practice it": "Як це відрепетирувати",
    "The words, unit by unit": "Слова, розділ за розділом",
    "Your first lesson gives you its words, and each one becomes a card you can hear read aloud. Every lesson after that adds its own.":
      "Перший урок дасть тобі свої слова, і кожне стане карткою, яку можна прослухати. Кожен наступний урок додасть свої.",
    "That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the evening. About nine in ten will be words you’ve already met, coming back just as you start to forget them. Pick the one you’d still open on a bad Wednesday.":
      "На день треба відповісти на {cards}, а не на {goal} нових, а у вечір із заняттям за курсом вони вже входять у це заняття. Приблизно дев'ять із десяти будуть уже знайомими словами: вони повертаються саме тоді, коли ти починаєш їх забувати. Вибери режим, який ти відкриєш навіть у невдалу середу.",
    "That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the fifteen minutes. About nine in ten will be words you’ve already met, coming back just as you start to forget them. These {deck} take roughly {weeks} to work through this way. A faster setting really does get you through them sooner, but it makes every evening longer for the next year too. Pick the one you’d still open on a bad Wednesday.":
      "На день треба відповісти на {cards}, а не на {goal} нових, а у вечір із заняттям за курсом вони входять у ті самі п'ятнадцять хвилин. Приблизно дев'ять із десяти будуть уже знайомими словами: вони повертаються саме тоді, коли ти починаєш їх забувати. У такому темпі на всю колоду ({deck}) піде приблизно {weeks}. Швидший режим і справді дасть змогу пройти її раніше, але й кожен вечір увесь наступний рік буде довшим. Вибери той, який ти відкриєш навіть у невдалу середу.",

    // WHY THIS PART.
    "If it turns out too hard or too easy, the course will notice and offer to move you.":
      "Якщо виявиться надто складно або надто легко, курс це помітить і запропонує перейти на іншу частину.",
    "You start at the very beginning, with the first words anybody needs.":
      "Ти починаєш із самого початку, з перших слів, які потрібні кожному.",
    "Your level check put you at {level}, which is the top of this course, so you start on its first part.":
      "Перевірка рівня показала {level}, а це вершина курсу, тож ти починаєш з першої частини цього рівня.",
    "You said you’re at {level}, which is the top of this course, so you start on its first part.":
      "За твоїми словами, у тебе рівень {level}, а це вершина курсу, тож ти починаєш з першої частини цього рівня.",
    "Your level check put you at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "Перевірка рівня показала {level}, і твоя мета теж {level}, тож ти починаєш з першої частини цього рівня, щоб закріпити його.",
    "You said you’re at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "За твоїми словами, у тебе рівень {level}, і твоя мета теж {level}, тож ти починаєш з першої частини цього рівня, щоб закріпити його.",
    "Your level check put you at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "Перевірка рівня показала {level}, тож вважатимемо {level} пройденим і почнемо з наступного рівня.",
    "You said you’re at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "За твоїми словами, у тебе рівень {level}, тож вважатимемо {level} пройденим і почнемо з наступного рівня.",

    // THE FIRST CONVERSATION, OFF THE REASON.
    "Going to the shop for milk": "Сходити в магазин по молоко",
    "Your kitchen, then the corner store, with a friend on the phone": "Твоя кухня, потім магазин за рогом, а на телефоні друг",
    "Handing in a form at a counter": "Здати бланк у віконці",
    "The desk at an office that wants your paperwork": "Стійка в установі, де вимагають твої документи",
    "Ordering a drink": "Замовити напій",
    "The counter of a small café": "Стійка маленької кав'ярні",
    "Buying a bus ticket": "Купити квиток на автобус",
    "The ticket window at the bus station": "Квиткова каса на автовокзалі",

    // THE STARTER UNITS' SUBTITLES.
    "Hello, thank you, yes and no": "Привіт, дякую, так і ні",
    "I, you, he or she, we, you, they": "Я, ти, він або вона, ми, ви, вони",
    "I am, you are, this is": "Дієслово «бути»: я, ти, це",
    "And, but, too, very, here and now, and don't": "І, але, теж, дуже, тут і зараз, а ще «не»",
    "Asking, telling and offering": "Попросити, сказати й запропонувати",
    "Talking about yesterday": "Розповідь про вчорашній день",
    "Nature and animals": "Природа й тварини",
    "Body and health": "Тіло й здоров'я",
    "The whole thing, or some of it": "Цілком або частково",
    "Relationships": "Стосунки",
    "Which case a verb wants": "Якого відмінка вимагає дієслово",
    "Work, money and decisions": "Робота, гроші й рішення",
    "When nobody is named": "Коли нікого не названо",
    "Society and public life": "Суспільство й громадське життя",
    "Passing on what you heard": "Переказ почутого",
    "Economy and business": "Економіка й бізнес",
    "Turning clauses into phrases": "Перетворення підрядних речень на звороти",
    "Long sentences that stay clear": "Довгі речення, що залишаються зрозумілими",
    "Arguing a point": "Аргументація",
    "Research writing": "Наукове письмо",

    // THE FIRST PART OF EACH LEVEL.
    "You start from nothing and build up the way a sentence does. Five words on the first evening, then I, you, he and she, then the verb to be, with a form for each person. After that come the little words that hold a sentence together, a few greetings and questions, and the people in your life. By the end you can say hello, ask where somebody lives and tell them who's in your family.":
      "Ти починаєш із нуля й будуєш мову так само, як будується речення. П'ять слів першого вечора, потім я, ти, він і вона, потім дієслово «бути» з формою для кожної особи. Далі маленькі слова, що скріплюють речення, кілька привітань і запитань і люди у твоєму житті. Наприкінці ти зможеш привітатися, запитати, де людина живе, і розповісти, хто є у твоїй родині.",
    "A2 starts with what makes a conversation possible: asking for something without sounding like a robot. Then the past tense, and your first case endings, starting with the one all the others are built on. By the end you can say what you did yesterday and what's wrong with you, and you can try your first conversations.":
      "A2 починається з того, без чого розмова неможлива: як попросити щось і не звучати як робот. Потім минулий час і перші відмінкові закінчення, починаючи з того, на якому будуються всі інші. Наприкінці ти зможеш розповісти про свій учорашній день і про те, що в тебе болить, і спробувати перші розмови.",
    "Two things separate knowing Estonian words from knowing Estonian: getting the object of a sentence right, and knowing which ending each verb wants after it. You learn each one on everyday words, first the people in your life, then work and money. Then comes would, for wishes and polite requests. Grammar and new words take turns, so it's never two weeks of tables.":
      "Знати естонські слова й знати естонську відрізняють дві речі: правильна форма додатка й знання того, якого закінчення вимагає після себе кожне дієслово. Кожну з них ти вчиш на повсякденних словах: спершу про близьких людей, потім про роботу й гроші. Далі умовний спосіб для побажань і ввічливих прохань. Граматика й нові слова чергуються, тож двох тижнів суцільних таблиць не буде.",
    "Estonian has three forms you learn here: one for when nobody is named, one for passing on what you heard, and one for doing two things at once. Each comes with the words it usually goes with: the impersonal with society, the reported form with the economy, and the last on its own. By the end you can read a report that never names anybody.":
      "В естонській є три форми, які ти тут вивчиш: одна для випадків, коли нікого не названо, друга для переказу почутого, третя для двох дій водночас. Кожна йде в парі зі словами, з якими зазвичай трапляється: безособова форма з темою суспільства, переказовий спосіб з економікою, а остання сама по собі. Наприкінці ти зможеш прочитати звіт, у якому нікого не названо.",
    "C1 is about fitting into a phrase what B2 needed a whole clause for. You practice it on academic writing, research and philosophy, which is where you'll need it most.":
      "Рівень C1 про те, як умістити у зворот те, для чого на B2 треба було ціле підрядне речення. Ти тренуєш це на академічних текстах, дослідженнях і філософії, де це знадобиться найбільше.",
    "Today, and every day after":
      "Сьогодні й кожного наступного дня",
    "Today's module is {title}, {words} and one short round.":
      "Заняття на сьогодні: {title}, {words} і один короткий раунд.",
  },
  counted: {
    unit: { en: ["unit", "units"], ru: ["раздел", "раздела", "разделов"], uk: ["розділ", "розділи", "розділів"] },
    week: { en: ["week", "weeks"], ru: ["неделя", "недели", "недель"], uk: ["тиждень", "тижні", "тижнів"] },
    minute: { en: ["minute", "minutes"], ru: ["минута", "минуты", "минут"], uk: ["хвилина", "хвилини", "хвилин"] },
    day: { en: ["day", "days"], ru: ["день", "дня", "дней"], uk: ["день", "дні", "днів"] },
    evening: { en: ["evening", "evenings"], ru: ["вечер", "вечера", "вечеров"], uk: ["вечір", "вечори", "вечорів"] },
    part: { en: ["part", "parts"], ru: ["часть", "части", "частей"], uk: ["частина", "частини", "частин"] },
    "new word": { en: ["new word", "new words"], ru: ["новое слово", "новых слова", "новых слов"], uk: ["нове слово", "нові слова", "нових слів"] },
  },
};
