import type { Area } from "../area";

/**
 * Estonian for Ukrainian speakers: the guide that compares Estonian with Ukrainian, its sounds, its grammar and the words that look familiar.
 * Keyed on the English each line translates; see `lib/copy/locale.ts`. No
 * Estonian in here (ADR-005): a word inside a line arrives through a
 * `{placeholder}` or an `{e1}` slot.
 *
 * There is no Russian half, on purpose. The page is about Ukrainian, a Russian
 * line may not name Ukraine or the Ukrainian language (`purity-ru.test.ts`),
 * and it is linked only for a learner who reads the app or its meanings in
 * Ukrainian. A Russian reader who reaches it by its address is sent to /grammar.
 */
export const SPEAKERS: Area = {
  ru: {
  },
  uk: {
    // The page and its link on the grammar index.
    "Estonian for Ukrainian speakers": "Естонська для україномовних",
    "What your Ukrainian already gives you, and where it leads you astray.":
      "Що вам уже дає українська і де вона збиває з пантелику.",
    "Practise it: {round}": "Потренуйтеся у вправі «{round}»",
    "In the dictionary: {gloss}": "У словнику: {gloss}",

    // What you already have.
    "What you already have": "Що у вас уже є",
    "Much of what makes Estonian hard for English speakers is already in your Ukrainian.":
      "Багато з того, що англомовним здається в естонській важким, у вашій українській уже є.",
    "Cases. Ukrainian has seven and Estonian has fourteen, but eleven of the fourteen are one form with an ending added.":
      "Відмінки. В українській їх сім, в естонській чотирнадцять, але одинадцять із чотирнадцяти утворюються від однієї форми додаванням закінчення.",
    "No articles, just as in Ukrainian, and the same free word order.":
      "Артиклів немає, як і в українській, і порядок слів такий самий вільний.",
    "A whole object against a partial one works much like aspect. A finished «прочитав книжку» takes the whole object, and an unfinished «читав книжку» puts it in the {part}.":
      "Повний і частковий додаток працюють майже як вид дієслова. Доконане «прочитав книжку» бере повний додаток, а недоконане «читав книжку» ставить його у форму {part}.",
    "The {part} also does what the Ukrainian «родовий» does in «налий води», and after a no, as in «не маю часу». After {not}, the object goes into it too.":
      "Форма {part} робить те саме, що український родовий відмінок у «налий води» і після заперечення, як у «не маю часу». Після {not} додаток теж стоїть у цій формі.",
    "«У мене є» is built exactly the Estonian way: the owner takes the {have} ending and the verb to be follows.":
      "«У мене є» побудовано точно як в естонській: власник отримує закінчення {have}, а за ним іде дієслово «бути».",
    "The {with} ending covers what the instrumental does with «з» and without it: «з другом», «ножем», «автобусом».":
      "Закінчення {with} передає орудний відмінок і з прийменником «з», і без нього: «з другом», «ножем», «автобусом».",

    // What is new.
    "What is new": "Що нового",
    "Five places where Ukrainian habits lead you the wrong way.":
      "П'ять місць, де українські звички ведуть вас не туди.",
    "No grammatical gender. The one word {he} means both «він» and «вона», and an adjective never changes to match.":
      "Граматичного роду немає. Одне слово {he} означає і «він», і «вона», а прикметник ніколи не змінюється за родом.",
    "The verb {be} stays in the present. Ukrainian says «Я студент»; Estonian needs the verb every time.":
      "Дієслово {be} не зникає в теперішньому часі. Українською кажуть «Я студент», а естонською дієслово потрібне щоразу.",
    "No future tense. The present does the job, often with a word like {tomorrow}, where Ukrainian says «буду читати» or «читатиму».":
      "Майбутнього часу немає. Його роль виконує теперішній, часто зі словом на кшталт {tomorrow}, там, де українською кажуть «буду читати» або «читатиму».",
    "After every number from {two} up, the noun takes the {part} and stays singular. Ukrainian says «п'ять книжок» with a plural; Estonian never does.":
      "Після будь-якого числа від {two} і більше іменник стоїть у формі {part} і в однині. Українською кажуть «п'ять книжок» у множині, естонською так не кажуть ніколи.",
    "Ukrainian uses one instrumental for «працювати вчителем» and «стати вчителем». Estonian splits it: {as} for a role you have, {become} for one you take on.":
      "В українській і «працювати вчителем», і «стати вчителем» мають один орудний відмінок. Естонська їх розділяє: {as} для ролі, яку ви маєте, {become} для ролі, якої набуваєте.",

    // Sounds.
    "Sounds": "Звуки",
    "Four vowels Ukrainian does not have, and a few habits to unlearn.":
      "Чотири голосні, яких немає в українській, і кілька звичок, яких варто позбутися.",
    "Say «о», then spread your lips as if smiling, keeping the tongue where it was.":
      "Скажіть «о», а потім розтягніть губи, ніби в усмішці, не рухаючи язика.",
    "Between «е» and «а», with the mouth open wide.": "Щось середнє між «е» і «а», з широко відкритим ротом.",
    "Say «е» with your lips rounded.": "Скажіть «е» з округленими губами.",
    "Say «і» and push your lips forward as for «у».": "Скажіть «і» і витягніть губи вперед, як для «у».",
    "Estonian has three lengths of sound, and a doubled letter is a long one. Ukrainian has no long vowels, but its long consonants in «знання» and «життя» are the same idea.":
      "В естонській три ступені довготи звука, і подвоєна літера позначає довгий звук. В українській довгих голосних немає, але довгі приголосні в «знання» і «життя» працюють так само.",
    "Estonian g is always «ґ», never «г». Estonian h is close to «г», only without the voice.":
      "Естонське g завжди звучить як «ґ», ніколи як «г». Естонське h близьке до «г», тільки без голосу.",
    "The letters b, d and g are less voiced than «б», «д» and «ґ», and p, t and k have no puff of air. What tells them apart is mostly length and strength.":
      "Літери b, d і g менш дзвінкі, ніж «б», «д» і «ґ», а p, t і k вимовляються без придиху. Розрізняють їх переважно за довготою та силою.",
    "The stress always falls on the first syllable.": "Наголос завжди падає на перший склад.",

    // Typing.
    "Typing": "Набір тексту",
    "A Ukrainian keyboard has no {a}, {b}, {c} or {d}. Add the Estonian layout and switch to it when you write Estonian.":
      "На українській клавіатурі немає {a}, {b}, {c} і {d}. Додайте естонську розкладку й перемикайтеся на неї, коли пишете естонською.",
    "Android, with Gboard: in the keyboard, tap Settings, then Languages, then Add keyboard, and choose Estonian. Touch and hold the space bar to switch.":
      "Android, Gboard: на клавіатурі торкніться «Налаштування», потім «Мови», потім «Додати клавіатуру» й виберіть естонську. Щоб перемкнути мову, торкніться пробілу й утримуйте.",
    "iPhone: Settings, General, Keyboard, Keyboards, Add New Keyboard, then Estonian. Touch and hold the globe key to switch.":
      "iPhone: «Параметри», «Загальні», «Клавіатура», «Клавіатури», «Додати нову клавіатуру», потім естонська. Щоб перемкнути, торкніться клавіші з глобусом і утримуйте.",
    "Windows 11: Settings, Time and language, Language and region. Open the menu beside your language, choose Language options, then Add a keyboard and pick Estonian. The Windows key and Space switch layouts.":
      "Windows 11: «Налаштування», «Час і мова», «Мова та регіон». Відкрийте меню поруч із вашою мовою, виберіть «Параметри мови», потім «Додати клавіатуру» й виберіть естонську. Розкладку перемикають клавіші Windows і пробіл.",
    "Mac: System Settings, Keyboard, then Edit beside Input Sources under Text Input. Press the plus button, choose Estonian and press Add. Control and Space switch.":
      "Mac: «Системні параметри», «Клавіатура», потім «Змінити» поруч із «Джерела введення» в розділі «Введення тексту». Натисніть «+», виберіть естонську й натисніть «Додати». Перемикають клавіші Control і пробіл.",
    "On a computer, the row of letters under every box types them for you, if you asked for it. You can turn it on or off in Settings.":
      "На комп'ютері їх набирає за вас рядок літер під кожним полем, якщо ви його ввімкнули. Увімкнути чи вимкнути його можна в налаштуваннях.",

    // Ти or ви.
    "«Ти» or «ви»": "«Ти» чи «ви»",
    "Customs vary, so follow the other person's lead.": "Звичаї бувають різні, тож орієнтуйтеся на співрозмовника.",
    "Estonians move to {youOne} sooner than Ukrainians move to «ти»: with colleagues, with people your own age, and often in shops.":
      "Естонці переходять на {youOne} швидше, ніж українці на «ти»: з колегами, з ровесниками, а часто й у магазинах.",
    "Use {youMany} with officials, with older people you do not know, and with more than one person.":
      "Звертайтеся на {youMany} до посадовців, до незнайомих старших людей і до кількох людей одразу.",

    // Words that look familiar.
    "Words that look familiar": "Слова, що здаються знайомими",
    "A few Estonian words you will recognize, and a few that only look like Ukrainian.":
      "Кілька естонських слів, які ви впізнаєте, і кілька таких, що лише схожі на українські.",
    "You will recognize these, or a relative of them in Ukrainian.":
      "Ці слова ви впізнаєте самі або за їхніми українськими родичами.",
    "These look like Ukrainian words and mean something else.":
      "Ці слова схожі на українські, але означають інше.",
    "It came into Estonian from German.": "В естонську прийшло з німецької.",
    "It came into Estonian from a Slavic language. Compare «грамота».":
      "В естонську прийшло зі слов'янської мови. Порівняйте «грамота».",
    "It came into Estonian from a Slavic language. Compare «торг».":
      "В естонську прийшло зі слов'янської мови. Порівняйте «торг».",
    "It came into Estonian from a Slavic language.": "В естонську прийшло зі слов'янської мови.",
    "A week, not «неділя».": "Тиждень, а не «неділя».",
    "A stage, not «лава», the bench.": "Сцена, а не «лава», на якій сидять.",
    "A cat, however much it sounds like «каса», the till.": "Кіт, хоч і звучить майже як «каса».",
  },
};
