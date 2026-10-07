/**
 * The interface in Ukrainian, keyed on the English it translates. See
 * `lib/copy/locale.ts` for why it is keyed that way, why a missing line falls
 * back to English, and why every screen that shows this says it was machine
 * translated. No Estonian in here (ADR-005).
 */
export const UK: Readonly<Record<string, string>> = {
  // THE NAVIGATION: headings, places and what each is for.
  "Every day": "Щодня",
  "Learn new words, keep the old ones fresh, and try them out.": "Вивчайте нові слова, освіжайте старі й пробуйте їх у справі.",
  "Today": "Сьогодні",
  "What's waiting for you today, and your streak": "Що чекає на вас сьогодні і ваша серія днів",
  "Today's module": "Заняття на сьогодні",
  "Tonight's words and games, already picked for you": "Слова й ігри на цей вечір, уже дібрані для вас",
  "Learn": "Вивчати",
  "New words, five at a time, straight from the course": "Нові слова по п'ять за раз, просто з курсу",
  "Practice": "Практика",
  "What's due, plus sprints, matching, sentences and games": "Що пора повторити, а ще спринти, пари, речення та ігри",
  "Review": "Повторення",
  "Everything due, right before you'd forget it": "Усе, що пора повторити, якраз перед тим, як ви його забудете",
  "Situations": "Ситуації",
  "Book a doctor, order a coffee, ring your landlord": "Записатися до лікаря, замовити каву, зателефонувати орендодавцю",
  "Look it up": "Знайти",
  "Any word, any ending, and why it works that way.": "Будь-яке слово, будь-яке закінчення і чому все влаштовано саме так.",
  "Dictionary": "Словник",
  "Look up any word, in any form": "Будь-яке слово в будь-якій формі",
  "Grammar": "Граматика",
  "What each of the fourteen cases is for": "Для чого потрібен кожен із чотирнадцяти відмінків",
  "Build a word": "Побудуйте слово",
  "Learn three forms of a word and get eleven more for free": "Вивчіть три форми слова й отримайте ще одинадцять безкоштовно",
  "Exceptions": "Винятки",
  "The words that break the usual rules": "Слова, які порушують звичні правила",
  "Commonest words": "Найуживаніші слова",
  "The 400 words Estonians use most, in four lists": "400 слів, які естонці кажуть найчастіше, у чотирьох списках",
  "Scan a page": "Сфотографувати сторінку",
  "Photograph a word list and turn it into cards": "Сфотографуйте список слів і перетворіть його на картки",
  "Ask Anu": "Запитати Ану",
  "Ask your tutor anything about Estonian": "Запитайте Ану про будь-що, що стосується естонської",
  "How it's going": "Як ідуть справи",
  "Your week ahead, and how far you've come.": "Що у вас на тижні і скільки ви вже пройшли.",
  "Calendar": "Календар",
  "Your classes, study times and what's due": "Ваші заняття в групі, час навчання і терміни",
  "Classes": "Групи",
  "Teach a class, or join one": "Ведіть групу або приєднуйтеся до неї",
  "Progress": "Поступ",
  "What's sticking, what isn't, and when you study": "Що запам'ятовується, що ні, і коли ви вчитеся",
  "My words": "Мої слова",
  "Every word you're learning, card by card": "Кожне слово, яке ви вчите, картка за карткою",
  "Word mastery": "Опанування слів",
  "Your favorites, what you've mastered and what needs work": "Обрані слова, опановані слова і ті, над якими ще варто попрацювати",
  "Decks": "Колоди",
  "Make your own word lists and add to them as you go": "Складайте власні списки слів і поповнюйте їх із часом",
  "In real life": "У реальному житті",
  "Which real conversations you could follow, join or lead": "Які справжні розмови ви змогли б зрозуміти, підтримати чи вести самі",
  "Level check": "Перевірка рівня",
  "Find out your level in reading, listening, writing and speaking": "Дізнайтеся свій рівень у читанні, аудіюванні, письмі та говорінні",
  "Mock exam": "Пробний іспит",
  "A practice run at the state language exam": "Тренування перед державним іспитом з мови",
  "This app": "Про застосунок",
  "Your settings, and the fixes you've suggested.": "Ваші налаштування та виправлення, які ви запропонували.",
  "Settings": "Налаштування",
  "Your goal, how cards ask you, sound and backups": "Ваша мета, як картки ставлять запитання, звук і резервні копії",
  "Suggested fixes": "Запропоновані виправлення",
  "What you've reported, and what happened next": "Про що ви повідомили і що було далі",

  // THE RAIL'S OWN CHROME.
  "More": "Ще",
  "More places to go": "Інші розділи",
  "Close": "Закрити",
  "Your class": "Ваша група",
  "Your classes": "Ваші групи",
  "Edit sidebar": "Налаштувати меню",
  "Theme": "Тема",
  "Light": "Світла",
  "Dark": "Темна",
  "Sign out": "Вийти з облікового запису",
  "Skip to content": "Перейти до вмісту",
  "Estonian, daily": "Естонська щодня",

  // THE SCREEN THAT OPENS EVERY ROUND.
  "The words that are due today": "Слова, які пора повторити сьогодні",
  "Words you've met before, back just as you're about to forget them. Some cards ask what a word means, others ask you to fill a gap in a real sentence.":
    "Слова, які ви вже зустрічали, повертаються саме тоді, коли ви починаєте їх забувати. Одні картки запитують, що слово означає, інші просять заповнити пропуск у справжньому реченні.",
  "Type your answer where there's a box. Where there isn't, think of it, turn the card over and say whether you had it.":
    "Якщо є поле, впишіть відповідь. Якщо поля немає, пригадайте відповідь, переверніть картку й позначте, чи ви її знали.",
  "Start reviewing": "Почати повторення",
  "Tonight's words, one more time": "Слова цього вечора, ще раз",
  "A few quick questions on the words you've just learned, and any older ones that are due today.":
    "Кілька швидких запитань про слова, які ви щойно вивчили, і про старі, які пора повторити сьогодні.",
  "Type your answer where there's a box, or pick one where there's a choice. Then the evening's done.":
    "Впишіть відповідь, якщо є поле, або виберіть варіант, якщо їх дано. І на сьогодні все.",
  "Start": "Почати",
  "Your words, asked a new way": "Ваші слова, але по-новому",
  "Words you've already met, one at a time: from their meaning, as a form in a sentence, read out to you, or for a sentence of your own, depending on how well each has settled.":
    "Слова, які ви вже зустрічали, по одному: за значенням, як форма в реченні, на слух або у вашому власному реченні, залежно від того, наскільки добре кожне вже запам'яталося.",
  "Type each answer and check it. Each time a word comes back right, it's asked a harder way next time.":
    "Впишіть кожну відповідь і перевірте її. Щоразу, коли ви відповідаєте правильно, наступного разу запитання буде складнішим.",
  "The words you'll hear most": "Слова, які ви чутимете найчастіше",
  "Words from one of the lists of what Estonians say most, counted from real films and TV rather than picked by us.":
    "Слова зі списку того, що естонці кажуть найчастіше. Список пораховано за справжніми фільмами й серіалами, а не складено нами.",
  "Type each answer. A word comes back with a new ending each time, so you learn it the way it's really used.":
    "Впишіть кожну відповідь. Слово щоразу повертається з новим закінченням, тож ви вчите його таким, яким його справді вживають.",
  "Your own deck": "Ваша колода",
  "The cards you put in this deck, one at a time, the most overdue first.":
    "Картки, які ви поклали в цю колоду, по одній, починаючи з найбільш прострочених.",
  "Words you looked up": "Слова, які ви шукали",
  "The words you added yourself, from the dictionary, a photo or a chat with Anu, instead of the ones the course gave you.":
    "Слова, які ви додали самі зі словника, з фотографії або з розмови з Ану, а не ті, що дав курс.",
  "Type each answer. You picked these, so they get their turn now instead of waiting behind the course.":
    "Впишіть кожну відповідь. Ці слова обрали ви, тому їхня черга зараз, а не після курсу.",
  "Your own Estonian, with gaps": "Ваш естонський текст із пропусками",
  "Paste in anything in Estonian, an article or your homework, and we'll blank out words you've learned.":
    "Вставте будь-який текст естонською, статтю чи домашнє завдання, і ми замінимо пропусками слова, які ви вже вчили.",
  "Type each missing word back in, the way the writer had it.": "Впишіть кожне пропущене слово так, як воно було в автора.",
  "Paste something in": "Вставити текст",
  "One verb, all six people": "Одне дієслово, усі шість осіб",
  "A verb with the \"I\" form filled in and the other five boxes empty.": "Дієслово, у якого заповнено форму «я», а решта п'ять полів порожні.",
  "Fill in the rest, one box at a time. The \"I\" form is your clue.": "Заповніть решту полів по одному. Форма «я» вам підказка.",
  "A verb's six forms, already on the screen but jumbled up.": "Шість форм дієслова вже на екрані, але перемішані.",
  "Put each form next to the person it goes with. There's nothing to type.": "Поставте кожну форму поруч із потрібною особою. Друкувати нічого не треба.",
  "Say what you see": "Опишіть, що бачите",
  "A little scene with three things in it. We'll name one of them and tell you which ending it needs.":
    "Невелика сценка, у якій три предмети. Ми назвемо один із них і скажемо, яке закінчення йому потрібне.",
  "Write one sentence about the picture using that word, with that ending.": "Напишіть одне речення про картинку з цим словом і з цим закінченням.",
  "Show me the picture": "Показати картинку",
  "Hear it, write it": "Почути й записати",
  "A real sentence read out loud. Play it again as often as you like, and slow it down if it's fast.":
    "Справжнє речення, прочитане вголос. Вмикайте його скільки завгодно разів і сповільнюйте, якщо надто швидко.",
  "Type the whole sentence. Forgetting a dot or a squiggle on a letter costs you a little but won't be marked wrong, so it's worth trying.":
    "Надрукуйте все речення. Якщо забудете крапку чи значок над літерою, це трохи знизить оцінку, але помилкою не вважатиметься, тож сміливо пробуйте.",
  "Play the first one": "Увімкнути перше",
  "The words that break the rules": "Слова, які порушують правила",
  "Words that don't do what the usual pattern says. You'll see each one first, then type it, then put it in a real sentence.":
    "Слова, які поводяться не так, як зазвичай. Спершу ви побачите кожне, потім надрукуєте його, а потім вставите у справжнє речення.",
  "Just have a look at the first step, nothing's scored there. After that, the typing counts.":
    "На першому кроці просто подивіться, він не оцінюється. Далі те, що ви друкуєте, уже зараховується.",
  "Which case does this verb want?": "Який відмінок потрібен цьому дієслову?",
  "A verb, and four cases it might take. Only one is right.": "Дієслово і чотири відмінки, які йому могли б підійти. Правильний лише один.",
  "Pick it. There's nothing to type and no clock.": "Виберіть його. Друкувати нічого не треба, і час не обмежено.",
  "Put the word back together": "Зберіть слово",
  "A word you know, read out loud with its meaning shown, and its letters jumbled up on tiles.":
    "Знайоме вам слово звучить уголос, його значення показано, а літери перемішані на плитках.",
  "Tap the letters in the right order. Miss once and we'll put the first letter in for you.":
    "Натискайте на літери в правильному порядку. Якщо помилитеся, ми поставимо першу літеру за вас.",
  "Hear a word, pick what it means": "Послухайте слово й виберіть його значення",
  "One word at a time, read out loud by a different voice each time, with four meanings to choose from. You won't see it written until you've answered.":
    "По одному слову, щоразу новим голосом, і чотири значення на вибір. Як слово пишеться, ви побачите лише після відповіді.",
  "Pick the meaning. Play the word again as often as you like.": "Виберіть значення. Слово можна вмикати скільки завгодно разів.",
  "Match the pairs": "Знайдіть пари",
  "Estonian words and their meanings, all mixed up together on one board.": "Естонські слова та їхні значення, перемішані на одному полі.",
  "Tap a word, then its meaning, to pair them. The clock runs until the board is empty.":
    "Натисніть на слово, а потім на його значення, щоб з'єднати їх. Час іде, доки поле не спорожніє.",
  "Long or short": "Довгий чи короткий",
  "Two words that sound almost the same, except one sound is held a little longer. You'll hear one of them.":
    "Два слова звучать майже однаково, тільки в одному звук тягнеться трохи довше. Ви почуєте одне з них.",
  "Say which one you heard. Play it again if you need to, it's recorded in a quiet room.":
    "Скажіть, яке ви почули. Якщо треба, увімкніть ще раз: запис зроблено в тихій кімнаті.",
  "Put the sentence back in order": "Зберіть речення",
  "A real sentence, cut up into words and shuffled.": "Справжнє речення, розрізане на слова й перемішане.",
  "Tap the words into order. Estonian often allows more than one order, and we'll accept those too.":
    "Розставте слова по порядку. В естонській часто можливий не один порядок слів, і такі варіанти ми теж зарахуємо.",
  "Say it out loud": "Скажіть уголос",
  "A word to say, a recording of a native speaker saying it, and your own voice played back beside it.":
    "Слово, яке треба вимовити, запис носія мови і ваш власний голос поруч.",
  "Record yourself, listen to both, and decide how close you got. No machine grades your accent.":
    "Запишіть себе, послухайте обидва записи й вирішіть, наскільки близько вийшло. Ваш акцент не оцінює жодна машина.",
  "As many as you can": "Скільки встигнете",
  "Cards from your deck against the clock. You turn them over instead of typing.": "Картки з вашої колоди на час. Ви перевертаєте їх, а не друкуєте.",
  "Go as fast as you can until time's up. Stopping early costs you nothing.": "Відповідайте якомога швидше, поки не мине час. Якщо зупинитеся раніше, нічого не втратите.",
  "Start the clock": "Запустити таймер",
  "Hit the right ending": "Влучте в потрібне закінчення",
  "A word, a question, and four answers to pick from, mostly the same word with different endings. Every hit makes the next clock a little shorter.":
    "Слово, запитання і чотири відповіді на вибір, найчастіше те саме слово з різними закінченнями. З кожним влученням час на наступне запитання трохи скорочується.",
  "Tap the one the question is asking for.": "Натисніть на відповідь, якої вимагає запитання.",
  "Write your own sentence": "Напишіть своє речення",
  "One word, and the ending we'd like you to give it.": "Одне слово і закінчення, яке ми просимо йому дати.",
  "Write a sentence with it. The dictionary checks the ending, and Anu leaves you a note on the rest.":
    "Напишіть із ним речення. Закінчення перевірить словник, а про решту Ану залишить вам нотатку.",
  "The endings you keep missing": "Закінчення, у яких ви найчастіше помиляєтеся",
  "Cards from the cases you get wrong most, picked from your own answers, against the clock.":
    "Картки на відмінки, у яких ви найчастіше помиляєтеся, дібрані за вашими ж відповідями, на час.",
  "Answer as many as you can before time runs out.": "Дайте якомога більше відповідей, поки не скінчиться час.",
  "Guess today's word": "Вгадайте слово дня",
  "One six-letter Estonian word a day, and seven tries to find it. After each guess, the letters show whether they're in the right spot, somewhere else, or not in the word at all.":
    "Одне естонське слово з шести літер на день і сім спроб його знайти. Після кожної спроби літери показують, чи стоять вони на своєму місці, чи є вони в слові в іншому місці, чи їх у слові немає зовсім.",
  "Type any real six-letter word and send it. If it's getting close to the end, we'll slip you a clue.":
    "Надрукуйте будь-яке справжнє слово з шести літер і надішліть. Коли спроби добігатимуть кінця, ми підкинемо підказку.",
  "Today's crossword": "Кросворд дня",
  "Estonian words crossing each other, with English clues. Each clue also says whether it wants a noun, a verb or so on, so only one word fits.":
    "Естонські слова перетинаються одне з одним, підказки англійською. Кожна підказка ще каже, чи потрібен іменник, дієслово тощо, тому підходить лише одне слово.",
  "Fill in the grid, then check it. Take as long as you like.": "Заповніть сітку, а потім перевірте. Часу скільки завгодно.",
  "This unit, one word at a time": "Цей розділ, слово за словом",
  "You'll meet each of the unit's words first, then use them in real sentences.": "Спершу ви познайомитеся з кожним словом розділу, а потім використаєте їх у справжніх реченнях.",
  "Meeting a word isn't scored, so take your time with it. Then answer.": "Знайомство зі словом не оцінюється, тож не поспішайте. Потім відповідайте.",
  "Start the lesson": "Почати урок",
  "A checkpoint, not a test": "Контрольна точка, а не тест",
  "A short set of questions from across the level. You'll find out how you did at the end, not after each one.":
    "Короткий набір запитань з усього рівня. Результат ви дізнаєтеся наприкінці, а не після кожного запитання.",
  "Answer each one as best you can and keep going. Leaving one blank is an honest answer.":
    "Відповідайте на кожне як зможете й рухайтеся далі. Порожня відповідь теж чесна відповідь.",

  // THE BRIEFING'S OWN CHROME.
  "{count} in this round": "{count} у цьому раунді",
  "Before you start": "Перед початком",
  "What you'll see": "Що ви побачите",
  "What you do": "Що треба робити",

  // SETTINGS: THE LANGUAGE ITSELF.
  "Language of the app": "Мова застосунку",
  "The words around the Estonian. The Estonian itself never changes.": "Слова навколо естонського тексту. Сама естонська не змінюється.",
  "Got it": "Зрозуміло",
  "More about your progress": "Ще про ваш поступ",
  "{day}: {count} reviews": "{day}, повторень: {count}",
  "{total} reviews, spread over {active} of the last {days} days": "Повторень: {total}. Днів із заняттями: {active} з {days}.",
  "Quiet": "Мало",
  "You@person": "Ви",
  "Busy": "Багато",
  "Reviews per day, last six months": "Повторення по днях за останні півроку",
};
