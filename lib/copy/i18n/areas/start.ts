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
    "New here? Signing in is all it takes to start, and it’s free. Coming back? Everything you’ve learned is right where you left it.":
      "Вы здесь впервые? Чтобы начать, достаточно войти, и это бесплатно. Вернулись? Всё, что вы выучили, на своём месте.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with, or ask {email} to add you.":
      "С этим адресом нельзя войти в эту копию Kodukeel: она настроена для определённой группы. Попробуйте аккаунт, на который вас пригласили, или попросите {email} добавить вас.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with.":
      "С этим адресом нельзя войти в эту копию Kodukeel: она настроена для определённой группы. Попробуйте аккаунт, на который вас пригласили.",
    "That link would have signed you in as someone else, so to be safe we signed you out and didn’t follow it. If the link is yours, sign in below. If you didn’t ask for it, you can safely ignore it.":
      "По этой ссылке вы вошли бы в чужой аккаунт, поэтому для надёжности мы вышли из аккаунта и не стали её открывать. Если ссылка ваша, войдите ниже. Если вы её не запрашивали, просто не обращайте на неё внимания.",
    "This browser couldn’t finish that sign-in. Either the link was opened in a different browser from the one that asked for it, or you ended up on a different address from the one you started on. Try again from here.":
      "Этот браузер не смог завершить вход. Либо ссылку открыли не в том браузере, в котором её запросили, либо вы оказались на другом адресе сайта, не на том, с которого начинали. Попробуйте ещё раз отсюда.",
    "If it keeps happening, let {email} know: this address needs adding to the sign-in settings.":
      "Если это повторяется, сообщите {email}: этот адрес нужно добавить в настройки входа.",
    "If it keeps happening, whoever runs this copy needs to add this address to the sign-in settings.":
      "Если это повторяется, тому, кто запускает эту копию, нужно добавить этот адрес в настройки входа.",
    "That sign-in did not go through. An emailed link works once and only lasts an hour, so if yours is older than that, ask for a fresh one below.":
      "Войти не получилось. Ссылка из письма срабатывает один раз и действует всего час, так что если вашей уже больше часа, запросите новую ниже.",
    "This copy is running in local mode. There are no accounts and no signing in, and everything is kept right here on this machine. Add {url} and {key} to your {env} to turn on sign-in and separate decks for each person.":
      "Эта копия работает в локальном режиме. Здесь нет аккаунтов и входа, а всё хранится прямо на этом компьютере. Добавьте {url} и {key} в свой {env}, чтобы включить вход и отдельные колоды для каждого человека.",
    "Start studying": "Начать учиться",
    "A dictionary that shows you every form of every word": "Словарь, в котором видна каждая форма каждого слова",
    "Your words brought back just before you'd forget them, plus quick games: speed rounds, listening and matching pairs":
      "Ваши слова возвращаются как раз тогда, когда вы начинаете их забывать, а ещё быстрые игры: раунды на скорость, аудирование и поиск пар",
    "Anu, a tutor who explains the grammar and never makes up a word":
      "Ану, репетитор, которая объясняет грамматику и никогда не выдумывает слов",
    "A conversation to rehearse, and one small thing to say to a real person today":
      "Разговор, чтобы отрепетировать, и одна маленькая фраза, которую сегодня можно сказать живому человеку",
    "Kodukeel is for people aged 13 and over. If you’re younger, a parent needs to say yes first.":
      "Kodukeel рассчитан на людей от 13 лет. Если вам меньше, сначала нужно согласие родителей.",
    "Estonian forms and example sentences from Ekilex (Institute of the Estonian Language, CC BY 4.0). English translations from English Wiktionary (CC BY-SA 4.0). Word counts from FrequencyWords over OpenSubtitles (CC BY-SA 4.0). Every spelling of every word from Ekilex’s own tables as gathered in Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0), and from Vabamorf (LGPL). Speech from the University of Tartu.":
      "Эстонские формы и примеры предложений из Ekilex (Институт эстонского языка, CC BY 4.0). Английские переводы из английского Викисловаря (CC BY-SA 4.0). Частотность слов из FrequencyWords по OpenSubtitles (CC BY-SA 4.0). Все написания всех слов из собственных таблиц Ekilex в сборке Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0) и из Vabamorf (LGPL). Озвучка от Тартуского университета.",

    // THE SIGN-IN FORM.
    "If this keeps happening, Google sign-in may not be turned on for this copy yet.":
      "Если это повторяется, возможно, вход через Google в этой копии ещё не включён.",
    "Try again, or reload the page.": "Попробуйте ещё раз или перезагрузите страницу.",
    "If this keeps happening, {domain} may not be set up for single sign-on here yet.":
      "Если это повторяется, возможно, для {domain} здесь ещё не настроен единый вход.",
    "We couldn’t reach the sign-in page for {domain}. Try again, and if it keeps happening, let whoever set this up know.":
      "Не удалось открыть страницу входа для {domain}. Попробуйте ещё раз, а если не получится снова, сообщите тому, кто это настраивал.",
    "That address can’t sign in through a company account here. Use Google above, or ask whoever set this up.":
      "С этим адресом здесь нельзя войти через рабочий аккаунт. Войдите через Google выше или спросите того, кто это настраивал.",
    "If this keeps happening, email sign-in may not be turned on for this copy yet.":
      "Если это повторяется, возможно, вход по почте в этой копии ещё не включён.",
    "Check your email": "Проверьте почту",
    "We’ve sent a link to {address}. Open it in this browser and you’re in. It stops working after an hour.":
      "Мы отправили ссылку на {address}. Откройте её в этом браузере, и вы войдёте. Через час она перестанет работать.",
    "Use a different address": "Указать другой адрес",
    "Taking you to Google…": "Переходим в Google…",
    "Continue with Google": "Войти через Google",
    "or": "или",
    "Your email or work address": "Личная или рабочая почта",
    "Your email address": "Адрес электронной почты",
    "Sending…": "Отправляем…",
    "Taking you there…": "Переходим…",
    "Continue with your work account": "Войти через рабочий аккаунт",
    "Email me a link": "Прислать ссылку на почту",
    "Continue": "Продолжить",
    "We’ll take you to the {domain} sign-in you already use.":
      "Мы перенаправим вас на вход {domain}, которым вы уже пользуетесь.",
    "No password to make up or forget. A work address takes you to your company’s sign-in, and any other address gets a link to open in this browser.":
      "Не нужно придумывать и запоминать пароль. С рабочим адресом вы перейдёте ко входу своей компании, а на любой другой придёт ссылка, которую нужно открыть в этом браузере.",
    "No password to make up or forget. Just open the link in this browser.":
      "Не нужно придумывать и запоминать пароль. Просто откройте ссылку в этом браузере.",
    "Use the work address your company signs in with.":
      "Укажите рабочий адрес, с которым вы входите в системы компании.",

    // FIRST RUN: THE FRAME.
    "You": "О вас",
    "Level": "Уровень",
    "Goal": "Цель",
    "Tonight": "Сегодня вечером",
    "Step {n} of {total}, {name}": "Шаг {n} из {total}: {name}",
    "Setup progress, step {n} of {total}": "Настройка, шаг {n} из {total}",
    "Back": "Назад",
    "Measured {level}": "Проверено: {level}",
    "Estimated {level}": "Ваша оценка: {level}",
    "below A1": "ниже A1",
    "Building your deck...": "Собираем вашу колоду...",
    "Start learning": "Начать учиться",
    "That didn’t go through, so nothing’s been saved yet. Press it again.":
      "Не получилось, поэтому пока ничего не сохранено. Нажмите ещё раз.",
    "Pick a daily goal from the list.": "Выберите дневную цель из списка.",
    "Pick a level from the list.": "Выберите уровень из списка.",
    "Skip this and go straight to your words": "Пропустить и сразу перейти к словам",

    // FIRST RUN: YOU.
    "What should we call you?": "Как к вам обращаться?",
    "Your name or a nickname": "Ваше имя или прозвище",
    "We only use it to say hello, and to show your teacher if you ever join a class.":
      "Оно нужно только для того, чтобы поздороваться с вами, а если вы вступите в группу, его увидит преподаватель.",
    "How do you type {a}, {b}, {c} and {d}?": "Как вы набираете {a}, {b}, {c} и {d}?",
    "Show the letters": "Показывать буквы",
    "Buttons for these letters appear under every box where you type Estonian.":
      "Кнопки с этими буквами появятся под каждым полем, где вы пишете по-эстонски. На русской и английской раскладке этих букв нет.",
    "I have them already": "Они у меня уже есть",
    "Your keyboard already types them, so no extra buttons.": "Ваша клавиатура уже их набирает (например, эстонская раскладка), так что кнопки не нужны.",
    "You can change this any time, in Settings or right from the row of letters.":
      "Это можно изменить в любой момент в настройках или прямо в строке с буквами.",
    "What language would you like meanings in?": "На каком языке показывать значения слов?",
    "English": "Английский",
    "Russian": "Русский",
    "Plain English meanings": "Значения на английском",
    "What stays in English": "Что остаётся на английском",
    "You’ll always see the English as well. The Russian and Ukrainian meanings come straight from the Estonian dictionary, written by the same people as the Estonian.":
      "Английское значение вы тоже будете видеть всегда. Русские значения взяты прямо из эстонского словаря, их писали те же люди, что и эстонскую часть.",
    "One honest note before you start: Kodukeel will not score your pronunciation, let an AI grade you, or replace a teacher. It’s where you rehearse. The real conversations happen out there.":
      "Одно честное замечание перед началом: Kodukeel не оценивает ваше произношение, не даёт ИИ ставить вам оценки и не заменяет преподавателя. Здесь вы репетируете. А настоящие разговоры ждут вас в жизни.",

    // FIRST RUN: LEVEL.
    "Where are you now?": "Какой у вас сейчас уровень?",
    "Take the level check to find out, or just pick the one that sounds like you. The check stops as soon as it has found your level. Either way, you can change it later in Settings.":
      "Пройдите проверку уровня, чтобы узнать, или просто выберите тот, что подходит по описанию. Проверка закончится, как только определит ваш уровень. В любом случае его можно потом изменить в настройках.",
    "Measured just now": "Только что проверено",
    "Take it again": "Пройти ещё раз",
    "Take the level check": "Пройти проверку уровня",
    "The level check isn’t ready on this copy of Kodukeel yet, because its dictionary hasn’t been loaded. For now, pick the level that sounds most like you.":
      "В этой копии Kodukeel проверка уровня пока недоступна: словарь ещё не загружен. А пока выберите уровень, который больше всего вам подходит.",
    "Or make a guess": "Или оцените сами",
    "Guess your level": "Оцените свой уровень",
    "Just starting": "Только начинаю",
    "{words}, and not much else yet.": "{words}, а больше пока почти ничего.",
    "I get by": "Могу объясниться",
    "You can shop, order things and put a simple sentence together.":
      "Можете сходить в магазин, что-нибудь заказать и составить простое предложение.",
    "Conversational": "Могу поддержать разговор",
    "You can hold up your end of a clear conversation.": "Можете поддерживать разговор, если собеседник говорит понятно.",
    "Confident": "Уверенно",
    "You can follow a meeting and read an article without stopping.":
      "Можете следить за ходом совещания и читать статью не останавливаясь.",
    "Fluent": "Свободно",
    "Pretty much anything. You're here for the finer shades of meaning.":
      "Почти всё. Вы здесь ради тонких оттенков смысла.",
    "Estonian has four letters English doesn’t: {a}, {b}, {c} and {d}. You’ll see them everywhere. Don’t worry about saying them right yet. That comes with time.":
      "В эстонском есть четыре буквы, которых нет ни в русском, ни в английском алфавите: {a}, {b}, {c} и {d}. Они встречаются повсюду. Не переживайте, если пока не получается их правильно произносить, особенно первую: такого звука в русском нет. Это придёт со временем.",

    // FIRST RUN: GOAL.
    "Why Estonian?": "Зачем вам эстонский?",
    "Pick every one that’s true. We’ll suggest a level to aim for, and the plan at the bottom changes as you answer.":
      "Отметьте всё, что подходит. Мы предложим уровень, к которому стоит стремиться, а план внизу будет меняться вместе с вашими ответами.",
    "Why you are learning Estonian": "Зачем вы учите эстонский",
    "I live in Estonia": "Я живу в Эстонии",
    "The shop, the doctor, the bus, the neighbors, the forms. Everyday life, in the language all around you.":
      "Магазин, врач, автобус, соседи, бланки. Повседневная жизнь на языке, который звучит вокруг.",
    "Citizenship or residence": "Гражданство или вид на жительство",
    "There's a state exam at the end of this one, and it picks the level for you.":
      "В конце вас ждёт государственный экзамен, и нужный уровень задаёт он.",
    "Work": "Работа",
    "Meetings, emails and colleagues who talk at full speed. At work you need to be understood exactly, not roughly.":
      "Совещания, письма и коллеги, которые говорят на полной скорости. На работе вас должны понимать точно, а не приблизительно.",
    "School or university": "Школа или университет",
    "A course with a syllabus, homework, and a mark waiting at the end of term.":
      "Курс с программой, домашними заданиями и оценкой в конце семестра.",
    "Family or a partner": "Семья или партнёр",
    "The people you most want to understand won't slow down for you forever.":
      "Люди, которых вам больше всего хочется понимать, не будут вечно говорить медленнее ради вас.",
    "Roots and heritage": "Корни и семейная история",
    "A language your family spoke, or a country you keep coming back to.":
      "Язык, на котором говорили в вашей семье, или страна, в которую вы снова и снова возвращаетесь.",
    "Travel": "Путешествия",
    "Enough to order, ask, say thanks and read a sign without reaching for your phone.":
      "Достаточно, чтобы заказать, спросить, поблагодарить и прочитать вывеску, не хватаясь за телефон.",
    "Curiosity": "Любопытство",
    "Fourteen cases, and words that change shape when you're not looking. Reason enough.":
      "Четырнадцать падежей и слова, которые меняют форму, стоит только отвернуться. Вполне достаточная причина.",
    "What level are you aiming for?": "Какого уровня вы хотите достичь?",
    "What level are you aiming for": "Какого уровня вы хотите достичь",
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
    "Days a week you will really practice": "Сколько дней в неделю вы правда будете заниматься",
    "be honest, the plan is built on it": "честно: на этом строится план",
    "What this is going to take": "Что для этого потребуется",
    "from your answers and published estimates": "по вашим ответам и опубликованным оценкам",
    "This plan starts from your own guess at your level. Take the level check whenever you like, and it’ll redo the sums with your real one.":
      "Этот план исходит из вашей собственной оценки уровня. Пройдите проверку уровня, когда захотите, и всё пересчитается по вашему настоящему уровню.",

    // FIRST RUN: TONIGHT.
    "Your first words": "Ваши первые слова",
    "This copy of Kodukeel has no dictionary loaded yet, so there are no first words to give you. Whoever runs it can load one with {command}. You can still pick your pace below, and add words yourself as you come across them.":
      "В этой копии Kodukeel ещё не загружен словарь, поэтому первых слов пока нет. Тот, кто запускает эту копию, может загрузить его командой {command}. А темп вы можете выбрать уже сейчас, ниже, и добавлять слова сами, когда будете их встречать.",
    "How much a day": "Сколько в день",
    "changeable any time in Settings": "можно изменить в любой момент в настройках",
    "Casual": "Спокойно",
    "Regular": "Регулярно",
    "Serious": "Серьёзно",
    "Intense": "Интенсивно",
    "{minutes} a day, {days} a week. That’s {cards} to answer, not {goal} new ones. About nine in ten will be words you’ve already met, coming back just as you start to forget them.":
      "{minutes} в день, {days} в неделю. Это {cards} для ответа, а не {goal} новых слов. Примерно девять из десяти будут словами, которые вы уже встречали: они возвращаются как раз тогда, когда вы начинаете их забывать.",
    "Tonight, and every night after": "Этот вечер и все следующие",
    "You never have to work out what to study. Kodukeel plans each evening for you: which words, in what order, and which games. About fifteen minutes, and then it tells you you’re done.":
      "Вам никогда не придётся решать, что учить. Kodukeel планирует за вас каждый вечер: какие слова, в каком порядке и какие игры. Примерно пятнадцать минут, а потом он скажет, что на сегодня всё.",
    "You start at {part}": "Вы начинаете с части {part}",
    "{evenings}, about {minutes} each.": "{evenings}, каждый примерно {minutes}.",
    "Tonight is {title}, {words} and one short round.": "Сегодня вечером: {title}, {words} и один короткий раунд.",
    "The whole way to C1": "Весь путь до C1",
    "{evenings} in all, and every word in the course turns up in one of them. You can step off the plan whenever you like and use the app your own way. Nothing disappears, and everything you do still counts.":
      "Всего {evenings}, и каждое слово курса встретится в одном из них. Вы можете в любой момент отойти от плана и пользоваться приложением по-своему. Ничего не пропадёт, и всё, что вы делаете, всё равно засчитывается.",
    "picked for your level": "подобраны под ваш уровень",
    "Tonight’s words come from your first {units} at {level}. Each word becomes a flashcard you can hear read aloud, with all its forms.":
      "Слова этого вечера взяты из первых разделов уровня {level} ({units}). Каждое слово станет карточкой со всеми его формами, которую можно прослушать.",
    "The other {units} at {level}, and every other level, are on the path whenever you want them.":
      "Остальные разделы уровня {level} (ещё {units}) и все другие уровни доступны в любой момент.",
    "Nothing here is locked in.": "Всё это можно поменять.",
    "Your first conversation": "Ваш первый разговор",
    "{place}. Once you know these words, you can practice this exact conversation here, typing your side to a stranger who wants something from you. Then go and have the real one.":
      "{place}. Когда выучите эти слова, сможете отрепетировать здесь именно этот разговор: вы печатаете свои реплики незнакомцу, которому что-то от вас нужно. А потом идите и поговорите по-настоящему.",
    "That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the fifteen minutes. About nine in ten will be words you’ve already met, coming back just as you start to forget them. These {deck} take roughly {weeks} to work through this way. A faster setting really does get you through them sooner, but it makes every evening longer for the next year too. Pick the one you’d still open on a bad Wednesday.":
      "Это {cards} в день для ответа, а не {goal} новых слов, и в вечер курса они входят в те самые пятнадцать минут. Примерно девять из десяти будут словами, которые вы уже встречали: они возвращаются как раз тогда, когда вы начинаете их забывать. В таком темпе на эту колоду ({deck}) уйдёт примерно {weeks}. Более быстрый режим и правда проведёт вас по ним быстрее, но и каждый вечер весь следующий год станет длиннее. Выберите тот, который вы откроете даже в неудачную среду.",

    // WHY THIS PART.
    "If it turns out too hard or too easy, the course will notice and offer to move you.":
      "Если окажется слишком сложно или слишком легко, курс это заметит и предложит вам другую часть.",
    "You start at the very beginning, with the first words anybody needs.":
      "Вы начинаете с самого начала, с первых слов, которые нужны любому.",
    "Your level check put you at {level}, which is the top of this course, so you start on its first part.":
      "Проверка уровня показала {level}, а это высший уровень курса, поэтому вы начинаете с первой части этого уровня.",
    "You said you’re at {level}, which is the top of this course, so you start on its first part.":
      "Вы указали уровень {level}, а это высший уровень курса, поэтому вы начинаете с первой части этого уровня.",
    "Your level check put you at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "Проверка уровня показала {level}, и ваша цель тоже {level}, поэтому вы начинаете с первой части этого уровня, чтобы закрепить его.",
    "You said you’re at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "Вы указали уровень {level}, и ваша цель тоже {level}, поэтому вы начинаете с первой части этого уровня, чтобы закрепить его.",
    "Your level check put you at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "Проверка уровня показала {level}, поэтому будем считать {level} пройденным и начнём со следующего уровня.",
    "You said you’re at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "Вы указали уровень {level}, поэтому будем считать {level} пройденным и начнём со следующего уровня.",

    // THE FIRST CONVERSATION, OFF THE REASON.
    "Going to the shop for milk": "Сходить в магазин за молоком",
    "Your kitchen, then the corner shop, with a friend on the phone": "Ваша кухня, потом магазин за углом, а друг на связи по телефону",
    "Handing in a form at a counter": "Сдать бланк в окошке",
    "The desk at an office that wants your paperwork": "Стойка в учреждении, где от вас ждут документы",
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
    "You start from nothing and build up the way a sentence does. Five words on the first evening, then I, you, he and she, then the verb to be with its six endings. After that come the little words that hold a sentence together, a few greetings and questions, and the people in your life. By the end you can say hello, ask where somebody lives and tell them who's in your family.":
      "Вы начинаете с нуля и строите язык так же, как строится предложение. Пять слов в первый вечер, потом я, ты, он и она, потом глагол «быть» с формой для каждого лица. Дальше маленькие слова, которые скрепляют предложение, несколько приветствий и вопросов и люди в вашей жизни. В конце вы сможете поздороваться, спросить, где человек живёт, и рассказать, кто входит в вашу семью.",
    "A2 starts with what makes a conversation possible: asking for something without sounding like a robot. Then the past tense, and your first case endings, starting with the one all the others are built on. By the end you can say what you did yesterday and what's wrong with you, and your first two conversations are waiting.":
      "A2 начинается с того, без чего разговор невозможен: как попросить что-то и не звучать как робот. Потом прошедшее время и первые падежные окончания, начиная с того, на котором строятся все остальные. В конце вы сможете рассказать, что делали вчера и что у вас болит, а вас будут ждать первые два разговора.",
    "Two things separate knowing Estonian words from knowing Estonian: getting the object of a sentence right, and knowing which ending each verb wants after it. You learn each one on everyday words, first the people in your life, then work and money. Then comes would, for wishes and polite requests. Grammar and new words take turns, so it's never two weeks of tables.":
      "Знание эстонских слов отличается от знания эстонского двумя вещами: правильным падежом дополнения и тем, какое окончание требует после себя каждый глагол. Каждую вы учите на повседневных словах: сначала на людях вокруг вас, потом на работе и деньгах. Затем условное наклонение для желаний и вежливых просьб. Грамматика и новые слова чередуются, так что двух недель сплошных таблиц не будет.",
    "Estonian has three ways of telling you what happened without saying who did it. You learn each one alongside the words it usually comes with: the impersonal with society, the reported form with the economy, and then the form for doing two things at once. By the end you can read a report that never names anybody.":
      "В эстонском есть три формы: одна для случая, когда никто не назван, одна для пересказа услышанного и одна для двух действий сразу. Каждую вы учите вместе со словами, рядом с которыми она обычно встречается: безличную форму с темой общества, пересказывательное наклонение с экономикой, а потом форму для двух действий сразу. В конце вы сможете прочитать отчёт, в котором никто не назван.",
    "C1 is mostly about saying more with less: fitting into a phrase what B2 needed a whole clause for. You practise it on academic writing, research and philosophy, which is where you'll need it most.":
      "C1 в основном о том, как сказать больше меньшим числом слов: уместить в оборот то, для чего на B2 требовалось целое придаточное. Вы тренируете это на академических текстах, исследованиях и философии, где это понадобится больше всего.",
  },
  uk: {
    // SIGN-IN.
    "Back to the front page": "На головну сторінку",
    "New here? Signing in is all it takes to start, and it’s free. Coming back? Everything you’ve learned is right where you left it.":
      "Ви тут уперше? Щоб почати, досить увійти, і це безкоштовно. Повернулися? Усе, що ви вивчили, на своєму місці.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with, or ask {email} to add you.":
      "З цією адресою не можна увійти в цю копію Kodukeel, бо її налаштовано для певної групи. Спробуйте обліковий запис, на який вас запросили, або попросіть {email} додати вас.",
    "That address cannot use this copy of Kodukeel, because it’s set up for one particular group. Try the account you were invited with.":
      "З цією адресою не можна увійти в цю копію Kodukeel, бо її налаштовано для певної групи. Спробуйте обліковий запис, на який вас запросили.",
    "That link would have signed you in as someone else, so to be safe we signed you out and didn’t follow it. If the link is yours, sign in below. If you didn’t ask for it, you can safely ignore it.":
      "За цим посиланням ви увійшли б у чужий обліковий запис, тож для безпеки ми вийшли з облікового запису й не стали його відкривати. Якщо посилання ваше, увійдіть нижче. Якщо ви його не запитували, просто не зважайте на нього.",
    "This browser couldn’t finish that sign-in. Either the link was opened in a different browser from the one that asked for it, or you ended up on a different address from the one you started on. Try again from here.":
      "Цей браузер не зміг завершити вхід. Або посилання відкрили не в тому браузері, де його запитували, або ви опинилися не на тій адресі, з якої починали. Спробуйте ще раз звідси.",
    "If it keeps happening, let {email} know: this address needs adding to the sign-in settings.":
      "Якщо це повторюється, повідомте {email}: цю адресу треба додати до налаштувань входу.",
    "If it keeps happening, whoever runs this copy needs to add this address to the sign-in settings.":
      "Якщо це повторюється, той, хто керує цією копією, має додати цю адресу до налаштувань входу.",
    "That sign-in did not go through. An emailed link works once and only lasts an hour, so if yours is older than that, ask for a fresh one below.":
      "Увійти не вдалося. Посилання з листа спрацьовує один раз і діє лише годину, тож якщо вашому вже понад годину, попросіть нове нижче.",
    "This copy is running in local mode. There are no accounts and no signing in, and everything is kept right here on this machine. Add {url} and {key} to your {env} to turn on sign-in and separate decks for each person.":
      "Ця копія працює в локальному режимі. Тут немає облікових записів і входу, а все зберігається просто на цьому комп'ютері. Додайте {url} і {key} до свого {env}, щоб увімкнути вхід і окремі колоди для кожного.",
    "Start studying": "Почати навчання",
    "A dictionary that shows you every form of every word": "Словник, у якому видно кожну форму кожного слова",
    "Your words brought back just before you'd forget them, plus quick games: speed rounds, listening and matching pairs":
      "Ваші слова повертаються якраз перед тим, як ви б їх забули, а ще швидкі ігри: раунди на швидкість, аудіювання й пошук пар",
    "Anu, a tutor who explains the grammar and never makes up a word":
      "Ану, репетиторка, яка пояснює граматику й ніколи не вигадує слів",
    "A conversation to rehearse, and one small thing to say to a real person today":
      "Розмова для репетиції й одна маленька фраза, яку сьогодні можна сказати живій людині",
    "Kodukeel is for people aged 13 and over. If you’re younger, a parent needs to say yes first.":
      "Kodukeel призначений для людей від 13 років. Якщо вам менше, спершу потрібна згода батьків.",
    "Estonian forms and example sentences from Ekilex (Institute of the Estonian Language, CC BY 4.0). English translations from English Wiktionary (CC BY-SA 4.0). Word counts from FrequencyWords over OpenSubtitles (CC BY-SA 4.0). Every spelling of every word from Ekilex’s own tables as gathered in Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0), and from Vabamorf (LGPL). Speech from the University of Tartu.":
      "Естонські форми та приклади речень з Ekilex (Інститут естонської мови, CC BY 4.0). Англійські переклади з англійського Вікісловника (CC BY-SA 4.0). Частотність слів з FrequencyWords за OpenSubtitles (CC BY-SA 4.0). Усі написання всіх слів з власних таблиць Ekilex у збірці Estonian-Wordlist-Enriched-Ekilex (CC BY-SA 4.0) та з Vabamorf (LGPL). Озвучення від Тартуського університету.",

    // THE SIGN-IN FORM.
    "If this keeps happening, Google sign-in may not be turned on for this copy yet.":
      "Якщо це повторюється, можливо, вхід через Google у цій копії ще не ввімкнено.",
    "Try again, or reload the page.": "Спробуйте ще раз або перезавантажте сторінку.",
    "If this keeps happening, {domain} may not be set up for single sign-on here yet.":
      "Якщо це повторюється, можливо, для {domain} тут ще не налаштовано єдиний вхід.",
    "We couldn’t reach the sign-in page for {domain}. Try again, and if it keeps happening, let whoever set this up know.":
      "Не вдалося відкрити сторінку входу для {domain}. Спробуйте ще раз, а якщо знову не вийде, повідомте тому, хто це налаштовував.",
    "That address can’t sign in through a company account here. Use Google above, or ask whoever set this up.":
      "З цією адресою тут не можна увійти через робочий обліковий запис. Увійдіть через Google вище або запитайте того, хто це налаштовував.",
    "If this keeps happening, email sign-in may not be turned on for this copy yet.":
      "Якщо це повторюється, можливо, вхід через пошту в цій копії ще не ввімкнено.",
    "Check your email": "Перевірте пошту",
    "We’ve sent a link to {address}. Open it in this browser and you’re in. It stops working after an hour.":
      "Ми надіслали посилання на {address}. Відкрийте його в цьому браузері, і ви ввійдете. За годину воно перестане працювати.",
    "Use a different address": "Вказати іншу адресу",
    "Taking you to Google…": "Переходимо до Google…",
    "Continue with Google": "Продовжити з Google",
    "or": "або",
    "Your email or work address": "Особиста або робоча пошта",
    "Your email address": "Адреса електронної пошти",
    "Sending…": "Надсилаємо…",
    "Taking you there…": "Переходимо…",
    "Continue with your work account": "Увійти через робочий обліковий запис",
    "Email me a link": "Надіслати посилання на пошту",
    "Continue": "Продовжити",
    "We’ll take you to the {domain} sign-in you already use.":
      "Ми переспрямуємо вас на вхід {domain}, яким ви вже користуєтеся.",
    "No password to make up or forget. A work address takes you to your company’s sign-in, and any other address gets a link to open in this browser.":
      "Не треба вигадувати й запам'ятовувати пароль. З робочою адресою ви перейдете до входу своєї компанії, а на будь-яку іншу прийде посилання, яке треба відкрити в цьому браузері.",
    "No password to make up or forget. Just open the link in this browser.":
      "Не треба вигадувати й запам'ятовувати пароль. Просто відкрийте посилання в цьому браузері.",
    "Use the work address your company signs in with.":
      "Вкажіть робочу адресу, з якою ви входите в системи компанії.",

    // FIRST RUN: THE FRAME.
    "You": "Про вас",
    "Level": "Рівень",
    "Goal": "Мета",
    "Tonight": "Сьогодні ввечері",
    "Step {n} of {total}, {name}": "Крок {n} з {total}: {name}",
    "Setup progress, step {n} of {total}": "Налаштування, крок {n} з {total}",
    "Back": "Назад",
    "Measured {level}": "Перевірено: {level}",
    "Estimated {level}": "Ваша оцінка: {level}",
    "below A1": "нижче A1",
    "Building your deck...": "Збираємо вашу колоду...",
    "Start learning": "Почати навчання",
    "That didn’t go through, so nothing’s been saved yet. Press it again.":
      "Не вийшло, тож поки нічого не збережено. Натисніть ще раз.",
    "Pick a daily goal from the list.": "Виберіть денну мету зі списку.",
    "Pick a level from the list.": "Виберіть рівень зі списку.",
    "Skip this and go straight to your words": "Пропустити й одразу перейти до слів",

    // FIRST RUN: YOU.
    "What should we call you?": "Як до вас звертатися?",
    "Your name or a nickname": "Ваше ім'я або прізвисько",
    "We only use it to say hello, and to show your teacher if you ever join a class.":
      "Ми використовуємо його лише для привітання і щоб показати вашому викладачеві, якщо ви приєднаєтеся до групи.",
    "How do you type {a}, {b}, {c} and {d}?": "Як ви набираєте {a}, {b}, {c} і {d}?",
    "Show the letters": "Показувати літери",
    "Buttons for these letters appear under every box where you type Estonian.":
      "Кнопки з цими літерами з'являться під кожним полем, де ви пишете естонською.",
    "I have them already": "Вони в мене вже є",
    "Your keyboard already types them, so no extra buttons.": "Ваша клавіатура вже їх набирає, тож зайві кнопки не потрібні.",
    "You can change this any time, in Settings or right from the row of letters.":
      "Це можна змінити будь-коли в налаштуваннях або просто в рядку з літерами.",
    "What language would you like meanings in?": "Якою мовою показувати значення слів?",
    "English": "Англійська",
    "Ukrainian": "Українська",
    "Plain English meanings": "Значення англійською",
    "What stays in English": "Що залишається англійською",
    "You’ll always see the English as well. The Russian and Ukrainian meanings come straight from the Estonian dictionary, written by the same people as the Estonian.":
      "Англійське значення ви теж завжди бачитимете. Українські значення взято просто з естонського словника, їх писали ті самі люди, що й естонську частину.",
    "One honest note before you start: Kodukeel will not score your pronunciation, let an AI grade you, or replace a teacher. It’s where you rehearse. The real conversations happen out there.":
      "Одне чесне застереження, перш ніж почати: Kodukeel не оцінює вашу вимову, не дає ШІ ставити вам оцінки й не замінює викладача. Тут ви репетируєте. А справжні розмови чекають на вас у житті.",

    // FIRST RUN: LEVEL.
    "Where are you now?": "Який у вас зараз рівень?",
    "Take the level check to find out, or just pick the one that sounds like you. The check stops as soon as it has found your level. Either way, you can change it later in Settings.":
      "Пройдіть перевірку рівня, щоб дізнатися, або просто виберіть той, що найбільше схожий на вас. Перевірка закінчиться, щойно визначить ваш рівень. У будь-якому разі його можна потім змінити в налаштуваннях.",
    "Measured just now": "Щойно перевірено",
    "Take it again": "Пройти ще раз",
    "Take the level check": "Пройти перевірку рівня",
    "The level check isn’t ready on this copy of Kodukeel yet, because its dictionary hasn’t been loaded. For now, pick the level that sounds most like you.":
      "У цій копії Kodukeel перевірка рівня поки недоступна: словник ще не завантажено. А поки виберіть рівень, який найбільше схожий на вас.",
    "Or make a guess": "Або оцініть самі",
    "Guess your level": "Оцініть свій рівень",
    "Just starting": "Тільки починаю",
    "{words}, and not much else yet.": "{words}, а більше поки майже нічого.",
    "I get by": "Можу порозумітися",
    "You can shop, order things and put a simple sentence together.":
      "Можете сходити в магазин, щось замовити й скласти просте речення.",
    "Conversational": "Можу підтримати розмову",
    "You can hold up your end of a clear conversation.": "Можете підтримувати розмову, якщо співрозмовник говорить зрозуміло.",
    "Confident": "Упевнено",
    "You can follow a meeting and read an article without stopping.":
      "Можете стежити за нарадою й читати статтю не зупиняючись.",
    "Fluent": "Вільно",
    "Pretty much anything. You're here for the finer shades of meaning.":
      "Майже все. Ви тут заради тонких відтінків значення.",
    "Estonian has four letters English doesn’t: {a}, {b}, {c} and {d}. You’ll see them everywhere. Don’t worry about saying them right yet. That comes with time.":
      "В естонській є чотири літери, яких немає в англійській: {a}, {b}, {c} і {d}. Вони трапляються всюди. Не хвилюйтеся, якщо поки не виходить правильно їх вимовляти. Це прийде з часом.",

    // FIRST RUN: GOAL.
    "Why Estonian?": "Навіщо вам естонська?",
    "Pick every one that’s true. We’ll suggest a level to aim for, and the plan at the bottom changes as you answer.":
      "Позначте все, що підходить. Ми запропонуємо рівень, до якого варто прагнути, а план унизу змінюватиметься разом із вашими відповідями.",
    "Why you are learning Estonian": "Навіщо ви вчите естонську",
    "I live in Estonia": "Я живу в Естонії",
    "The shop, the doctor, the bus, the neighbors, the forms. Everyday life, in the language all around you.":
      "Магазин, лікар, автобус, сусіди, бланки. Повсякденне життя мовою, яка звучить довкола.",
    "Citizenship or residence": "Громадянство або посвідка на проживання",
    "There's a state exam at the end of this one, and it picks the level for you.":
      "Наприкінці на вас чекає державний іспит, і рівень за вас обере він.",
    "Work": "Робота",
    "Meetings, emails and colleagues who talk at full speed. At work you need to be understood exactly, not roughly.":
      "Наради, листи й колеги, які говорять на повній швидкості. На роботі вас мають розуміти точно, а не приблизно.",
    "School or university": "Школа або університет",
    "A course with a syllabus, homework, and a mark waiting at the end of term.":
      "Курс із програмою, домашніми завданнями й оцінкою наприкінці семестру.",
    "Family or a partner": "Родина або партнер",
    "The people you most want to understand won't slow down for you forever.":
      "Ті, кого ви найбільше хочете розуміти, не говоритимуть повільно заради вас вічно.",
    "Roots and heritage": "Коріння й родинна історія",
    "A language your family spoke, or a country you keep coming back to.":
      "Мова, якою говорили у вашій родині, або країна, до якої ви знову й знову повертаєтеся.",
    "Travel": "Подорожі",
    "Enough to order, ask, say thanks and read a sign without reaching for your phone.":
      "Досить, щоб замовити, запитати, подякувати й прочитати вивіску, не хапаючись за телефон.",
    "Curiosity": "Цікавість",
    "Fourteen cases, and words that change shape when you're not looking. Reason enough.":
      "Чотирнадцять відмінків і слова, які змінюють форму, щойно відвернешся. Цілком достатня причина.",
    "What level are you aiming for?": "До якого рівня ви прагнете?",
    "What level are you aiming for": "До якого рівня ви прагнете",
    "Get by": "Порозумітися",
    "Handle everyday life": "Давати раду в побуті",
    "Live in the language": "Жити цією мовою",
    "Work in it": "Працювати нею",
    "Use it like your own": "Володіти як рідною",
    "By when?": "До якого терміну?",
    "By when": "До якого терміну",
    "In three months": "За три місяці",
    "In six months": "За пів року",
    "In a year": "За рік",
    "In two years": "За два роки",
    "No deadline, I'm in no hurry": "Без терміну, я не поспішаю",
    "Days a week you will really practice": "Скільки днів на тиждень ви справді займатиметеся",
    "be honest, the plan is built on it": "чесно, на цьому будується план",
    "What this is going to take": "Що для цього знадобиться",
    "from your answers and published estimates": "за вашими відповідями й опублікованими розрахунками",
    "This plan starts from your own guess at your level. Take the level check whenever you like, and it’ll redo the sums with your real one.":
      "Цей план виходить із вашої власної оцінки рівня. Пройдіть перевірку рівня, коли захочете, і все буде перераховано за вашим справжнім рівнем.",

    // FIRST RUN: TONIGHT.
    "Your first words": "Ваші перші слова",
    "This copy of Kodukeel has no dictionary loaded yet, so there are no first words to give you. Whoever runs it can load one with {command}. You can still pick your pace below, and add words yourself as you come across them.":
      "У цій копії Kodukeel ще не завантажено словник, тож перших слів поки немає. Той, хто нею керує, може завантажити його командою {command}. А темп ви можете вибрати вже зараз, нижче, і додавати слова самі, коли їх зустрічатимете.",
    "How much a day": "Скільки на день",
    "changeable any time in Settings": "можна змінити в налаштуваннях",
    "Casual": "Спокійно",
    "Regular": "Регулярно",
    "Serious": "Серйозно",
    "Intense": "Інтенсивно",
    "{minutes} a day, {days} a week. That’s {cards} to answer, not {goal} new ones. About nine in ten will be words you’ve already met, coming back just as you start to forget them.":
      "{minutes} на день, {days} на тиждень. Це {cards}, на які треба відповісти, а не {goal} нових. Приблизно дев'ять із десяти будуть словами, які ви вже зустрічали: вони повертаються саме тоді, коли ви починаєте їх забувати.",
    "Tonight, and every night after": "Цей вечір і всі наступні",
    "You never have to work out what to study. Kodukeel plans each evening for you: which words, in what order, and which games. About fifteen minutes, and then it tells you you’re done.":
      "Вам ніколи не доведеться вирішувати, що вчити. Kodukeel планує за вас кожен вечір: які слова, у якому порядку і які ігри. Приблизно п'ятнадцять хвилин, а потім він скаже, що на сьогодні все.",
    "You start at {part}": "Ви починаєте з {part}",
    "{evenings}, about {minutes} each.": "{evenings}, приблизно по {minutes}.",
    "Tonight is {title}, {words} and one short round.": "Сьогодні ввечері: {title}, {words} і один короткий раунд.",
    "The whole way to C1": "Увесь шлях до C1",
    "{evenings} in all, and every word in the course turns up in one of them. You can step off the plan whenever you like and use the app your own way. Nothing disappears, and everything you do still counts.":
      "Усього {evenings}, і кожне слово курсу трапиться в одному з них. Ви можете будь-коли відійти від плану й користуватися застосунком по-своєму. Нічого не зникне, і все, що ви робите, однаково зараховується.",
    "picked for your level": "дібрані під ваш рівень",
    "Tonight’s words come from your first {units} at {level}. Each word becomes a flashcard you can hear read aloud, with all its forms.":
      "Слова цього вечора взято з початку рівня {level}: {units}. Кожне слово стане карткою з усіма його формами, яку можна прослухати.",
    "The other {units} at {level}, and every other level, are on the path whenever you want them.":
      "Ще {units} рівня {level} і всі інші рівні відкриті для вас будь-коли.",
    "Nothing here is locked in.": "Усе це можна змінити.",
    "Your first conversation": "Ваша перша розмова",
    "{place}. Once you know these words, you can practice this exact conversation here, typing your side to a stranger who wants something from you. Then go and have the real one.":
      "{place}. Коли вивчите ці слова, зможете відрепетирувати тут саме цю розмову: ви друкуєте свої репліки незнайомцю, якому щось від вас треба. А потім ідіть і поговоріть по-справжньому.",
    "That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the fifteen minutes. About nine in ten will be words you’ve already met, coming back just as you start to forget them. These {deck} take roughly {weeks} to work through this way. A faster setting really does get you through them sooner, but it makes every evening longer for the next year too. Pick the one you’d still open on a bad Wednesday.":
      "Це {cards} на день, на які треба відповісти, а не {goal} нових, і у вечір курсу вони входять у ті самі п'ятнадцять хвилин. Приблизно дев'ять із десяти будуть словами, які ви вже зустрічали: вони повертаються саме тоді, коли ви починаєте їх забувати. У такому темпі ці {deck} займуть приблизно {weeks}. Швидший режим і справді проведе вас через них швидше, але й кожен вечір увесь наступний рік стане довшим. Виберіть той, який ви відкриєте навіть у невдалу середу.",

    // WHY THIS PART.
    "If it turns out too hard or too easy, the course will notice and offer to move you.":
      "Якщо виявиться надто складно або надто легко, курс це помітить і запропонує вас перевести.",
    "You start at the very beginning, with the first words anybody needs.":
      "Ви починаєте з самого початку, з перших слів, які потрібні кожному.",
    "Your level check put you at {level}, which is the top of this course, so you start on its first part.":
      "Перевірка рівня показала {level}, а це вершина курсу, тож ви починаєте з першої частини цього рівня.",
    "You said you’re at {level}, which is the top of this course, so you start on its first part.":
      "Ви вказали рівень {level}, а це вершина курсу, тож ви починаєте з першої частини цього рівня.",
    "Your level check put you at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "Перевірка рівня показала {level}, і ваша мета теж {level}, тож ви починаєте з першої частини цього рівня, щоб закріпити його.",
    "You said you’re at {level} and you’re aiming for {level}, so you start at its first part to make it solid.":
      "Ви вказали рівень {level}, і ваша мета теж {level}, тож ви починаєте з першої частини цього рівня, щоб закріпити його.",
    "Your level check put you at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "Перевірка рівня показала {level}, тож вважатимемо {level} пройденим і почнемо з наступного рівня.",
    "You said you’re at {level}, so we’ll treat {level} as done and start you on the next level up.":
      "Ви вказали рівень {level}, тож вважатимемо {level} пройденим і почнемо з наступного рівня.",

    // THE FIRST CONVERSATION, OFF THE REASON.
    "Going to the shop for milk": "Сходити в магазин по молоко",
    "Your kitchen, then the corner shop, with a friend on the phone": "Ваша кухня, потім магазин за рогом, а на телефоні друг",
    "Handing in a form at a counter": "Здати бланк у віконці",
    "The desk at an office that wants your paperwork": "Стійка в установі, де вимагають ваші документи",
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
    "Turning clauses into phrases": "Як перетворювати підрядні речення на звороти",
    "Long sentences that stay clear": "Довгі речення, що залишаються зрозумілими",
    "Arguing a point": "Аргументація",
    "Research writing": "Наукове письмо",

    // THE FIRST PART OF EACH LEVEL.
    "You start from nothing and build up the way a sentence does. Five words on the first evening, then I, you, he and she, then the verb to be with its six endings. After that come the little words that hold a sentence together, a few greetings and questions, and the people in your life. By the end you can say hello, ask where somebody lives and tell them who's in your family.":
      "Ви починаєте з нуля й будуєте мову так само, як будується речення. П'ять слів першого вечора, потім я, ти, він і вона, потім дієслово «бути» з його шістьма закінченнями. Далі маленькі слова, що скріплюють речення, кілька привітань і запитань і люди у вашому житті. Наприкінці ви зможете привітатися, запитати, де людина живе, і розповісти, хто є у вашій родині.",
    "A2 starts with what makes a conversation possible: asking for something without sounding like a robot. Then the past tense, and your first case endings, starting with the one all the others are built on. By the end you can say what you did yesterday and what's wrong with you, and your first two conversations are waiting.":
      "A2 починається з того, без чого розмова неможлива: як попросити щось і не звучати як робот. Потім минулий час і перші відмінкові закінчення, починаючи з того, на якому будуються всі інші. Наприкінці ви зможете розповісти, що робили вчора і що у вас болить, а на вас чекатимуть перші дві розмови.",
    "Two things separate knowing Estonian words from knowing Estonian: getting the object of a sentence right, and knowing which ending each verb wants after it. You learn each one on everyday words, first the people in your life, then work and money. Then comes would, for wishes and polite requests. Grammar and new words take turns, so it's never two weeks of tables.":
      "Знати естонські слова і знати естонську відрізняють дві речі: правильний додаток у реченні й знання того, якого закінчення вимагає після себе кожне дієслово. Кожну з них ви вчите на повсякденних словах: спершу люди у вашому житті, потім робота й гроші. Далі умовний спосіб, для побажань і ввічливих прохань. Граматика й нові слова чергуються, тож двох тижнів суцільних таблиць не буде.",
    "Estonian has three ways of telling you what happened without saying who did it. You learn each one alongside the words it usually comes with: the impersonal with society, the reported form with the economy, and then the form for doing two things at once. By the end you can read a report that never names anybody.":
      "В естонській є три способи розповісти, що сталося, не кажучи, хто це зробив. Кожен ви вчите разом зі словами, поруч із якими він зазвичай трапляється: безособову форму з темою суспільства, переказовий спосіб з економікою, а потім форму для двох дій одночасно. Наприкінці ви зможете прочитати звіт, у якому нікого не названо.",
    "C1 is mostly about saying more with less: fitting into a phrase what B2 needed a whole clause for. You practise it on academic writing, research and philosophy, which is where you'll need it most.":
      "C1 здебільшого про те, як сказати більше меншою кількістю слів: умістити у зворот те, на що на B2 потрібне було ціле підрядне речення. Ви тренуєте це на академічних текстах, дослідженнях і філософії, де це знадобиться найбільше.",
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
