import type { Area } from "../area";
import { CASE_GLOSS_ROWS } from "../caseGlosses";

/**
 * THE CASE REFERENCE IN RUSSIAN AND UKRAINIAN.
 *
 * What each ending means and does (`CASE_NOTES` and `CASE_GROUPS` in
 * `lib/estonian/grammar.ts`), what each kind of exception is
 * (`KIND_NOTES` and `FAMILY_TITLES` in `lib/estonian/exceptions.ts`), and what
 * a grammar book calls each point (`lib/estonian/terms.ts`). The source files
 * stay English and hold no Estonian; this is the only place their prose is put
 * into the learner's language. These rows used to sit in the reference area
 * and were moved here whole, so a fluent reader can check the grammar in one
 * file and one sitting.
 *
 * WRITTEN AS A GRAMMAR TEACHER WOULD SAY IT, NOT AS THE ENGLISH SAYS IT. The
 * English explains Estonian through English ("like English in"), which helps a
 * reader of English and nobody else. Where Russian or Ukrainian has the same
 * thing, the line says so in their terms instead, and only where that is true:
 * the adessive owner is «у меня есть» / «у мене є» exactly; the essive and the
 * translative are one instrumental in both languages and two endings here; the
 * impersonal is closer to «здесь говорят» than to a passive; the partitive
 * after «налей воды» is the same idea as the Estonian one. Where nothing in
 * either language helps, the English example is kept in quotes.
 *
 * NO ESTONIAN IS WRITTEN HERE (ADR-005). An Estonian case name is never
 * translated or renamed; an ending (sse, -ks, ma, da, tud) is terminology the
 * English already uses and is carried as it stands. Standard school
 * terminology is used where the line describes grammar: падеж / відмінок,
 * окончание / закінчення, основа, множественное число / множина.
 *
 * WHAT IS NOT HERE ON PURPOSE. `lib/estonian/caseReading.ts` puts a word's
 * English gloss into an English frame ("in the room"). A Russian frame would
 * have to decline the noun inside it («в комнате»), which this app has no
 * Russian or Ukrainian morphology to do honestly, so those readings stay
 * English. The topic notes (`TOPIC_NOTES`, `TOPIC_GROUPS`) are their own area.
 */
const LINES: readonly (readonly [en: string, ru: string, uk: string])[] = [
  // WHAT A GRAMMAR BOOK CALLS EACH POINT (lib/estonian/terms.ts).
  ["the present tense", "настоящее время", "теперішній час"],
  ["negation", "отрицание", "заперечення"],
  ["the imperfect, or simple past", "имперфект, или простое прошедшее время", "імперфект, або простий минулий час"],
  ["the perfect", "перфект", "перфект"],
  ["the pluperfect", "плюсквамперфект", "плюсквамперфект"],
  ["the future", "будущее время", "майбутній час"],
  ["the conditional", "условное наклонение", "умовний спосіб"],
  ["the imperative", "повелительное наклонение", "наказовий спосіб"],
  ["the quotative, or oblique mood", "пересказывательное, или косвенное наклонение", "переказовий, або непрямий спосіб"],
  ["the impersonal", "безличный залог", "безособовий стан"],
  ["participles", "причастия", "дієприкметники"],
  ["the past participle", "причастие прошедшего времени", "дієприкметник минулого часу"],
  ["the converb, or gerund", "деепричастие", "дієприслівник"],
  ["the infinitives", "инфинитивы", "інфінітиви"],
  ["particle verbs", "глаголы с частицей", "дієслова з часткою"],
  ["aspect", "аспект", "аспект"],
  ["the object", "дополнение", "додаток"],
  ["agreement", "согласование", "узгодження"],
  ["the comparative", "сравнительная степень", "вищий ступінь порівняння"],
  ["the superlative", "превосходная степень", "найвищий ступінь порівняння"],
  ["numerals", "числительные", "числівники"],
  ["consonant gradation", "чередование согласных", "чергування приголосних"],
  ["derivation", "словообразование", "словотвір"],
  ["verb government", "глагольное управление", "дієслівне керування"],
  ["word order", "порядок слов", "порядок слів"],
  ["subordinate clauses", "придаточные предложения", "підрядні речення"],
  ["punctuation", "пунктуация", "пунктуація"],
  ["time adverbials", "обстоятельства времени", "обставини часу"],

  // THE FOUR AXES OF THE VERB (VERB_AXES).
  ["tense", "время", "час"],
  ["Two tenses the verb makes by itself, for now and before, and two more built with \"to be\", like \"have done\". There's no future among them.",
    "Два времени глагол образует сам, для «сейчас» и для «раньше», и ещё два строятся с глаголом «быть», как английское «have done». Будущего времени среди них нет.",
    "Два часи дієслово утворює саме, для «зараз» і для «раніше», і ще два будуються з дієсловом «бути», як англійське «have done». Майбутнього часу серед них немає."],
  ["mood", "наклонение", "спосіб"],
  ["Are you stating it, imagining it, telling someone to do it, or passing on something you only heard? School grammars count four moods, each with its own endings, and some reference books count five.",
    "Вы что-то утверждаете, представляете, велите сделать или пересказываете то, что только слышали? Школьные грамматики насчитывают четыре наклонения, у каждого свои окончания, а некоторые справочники насчитывают пять.",
    "Ви щось стверджуєте, уявляєте, кажете зробити чи переказуєте те, що тільки чули? Шкільні граматики налічують чотири способи, кожен зі своїми закінченнями, а деякі довідники налічують п'ять."],
  ["voice", "залог", "стан"],
  ["Whether the sentence says who did it. It looks like the English passive but works differently, so keep the two apart.",
    "Говорит ли предложение, кто это сделал. Похоже на страдательный залог, но устроено иначе и ближе к русскому «здесь говорят по-эстонски», где тот, кто действует, просто не назван.",
    "Чи каже речення, хто це зробив. Схоже на пасив, але влаштовано інакше й ближче до українського «тут говорять естонською», де того, хто діє, просто не названо."],
  ["person@grammar", "лицо", "особа"],
  ["Six persons, each with its own verb ending, so \"I\" and \"you\" can often be left out. \"He\", \"she\" and \"they\" usually stay.",
    "Шесть лиц, у каждого своё окончание глагола, поэтому «я» и «ты» часто можно опустить. «Он», «она» и «они» обычно остаются.",
    "Шість осіб, у кожної своє закінчення дієслова, тому «я» і «ти» часто можна пропустити. «Він», «вона» і «вони» зазвичай лишаються."],

  // WHAT EACH ENDING MEANS, IN THE FEWEST WORDS (CASE_NOTES.plain). The index
  // also prints the first sense on its own ("onto", "on", "off").
  // One translation per gloss, shared with the conversation review and the
  // ending chip (`../caseGlosses.ts`).
  ...CASE_GLOSS_ROWS,

  // NIMETAV.
  ["The word as the dictionary lists it, and whoever is doing the action.",
    "Слово в том виде, в каком оно стоит в словаре, и тот, кто совершает действие.",
    "Слово в тому вигляді, у якому воно стоїть у словнику, і той, хто виконує дію."],
  ["Whoever or whatever is doing the action", "Тот, кто совершает действие, или то, что его совершает", "Той, хто виконує дію, або те, що її виконує"],
  ["The word as you'd look it up", "Слово в том виде, в каком его ищут в словаре", "Слово в тому вигляді, у якому його шукають у словнику"],
  ["A whole object after a command, or in the plural",
    "Дополнение целиком после повеления или во множественном числе",
    "Додаток повністю після наказу або в множині"],
  ["It's the object after a command, like \"put the book down\". But in \"I bought the book\", the book takes the next form down, the one meaning \"whose\".",
    "В этой форме стоит дополнение после повеления: «положи книгу». Но в «я купил книгу» книга стоит в следующей форме, той, что значит «чей».",
    "У цій формі стоїть додаток після наказу: «поклади книжку». Але в «я купив книжку» книжка стоїть у наступній формі, тій, що означає «чий»."],
  ["The dog in \"the dog barks\", exactly as it is.",
    "Собака в «собака лает», ровно как в словаре.",
    "Собака в «собака гавкає», точнісінько як у словнику."],

  // OMASTAV.
  ["Whose something is. It's also the base the other eleven endings go onto.",
    "Чьё что-то. А ещё это основа, к которой добавляются остальные одиннадцать окончаний.",
    "Чиє щось. А ще це основа, до якої додаються решта одинадцять закінчень."],
  ["Saying whose something is", "Сказать, чьё что-то", "Сказати, чиє щось"],
  ["A whole object, like the car you bought",
    "Дополнение целиком, как машина, которую вы купили",
    "Додаток повністю, як машина, яку ви купили"],
  ["The base that the eleven endings below are added to",
    "Основа, к которой добавляются одиннадцать окончаний ниже",
    "Основа, до якої додаються одинадцять закінчень нижче"],
  ["Get this one right and eleven more forms come for free, because they're all built on it. Get it wrong and all eleven go wrong with it.",
    "Запомните эту форму правильно, и ещё одиннадцать достанутся даром, потому что все они строятся на ней. Ошибётесь в ней, и ошибка перейдёт во все одиннадцать.",
    "Запам'ятайте цю форму правильно, і ще одинадцять дістануться задарма, бо всі вони будуються на ній. Помилитеся в ній, і помилка перейде в усі одинадцять."],
  ["The book's cover, the cover of the book.", "Обложка книги, дом друга.", "Обкладинка книжки, дім друга."],

  // OSASTAV.
  ["Some of something, an action that isn't finished, and anything after a number.",
    "Часть чего-то, незаконченное действие и всё, что стоит после числа.",
    "Частина чогось, незавершена дія і все, що стоїть після числа."],
  ["Some of a thing rather than all of it", "Часть чего-то, а не всё целиком", "Частина чогось, а не все цілком"],
  ["An action you're still in the middle of", "Действие, которое ещё продолжается", "Дія, яка ще триває"],
  ["After any number above one", "После любого числа больше единицы", "Після будь-якого числа, більшого за одиницю"],
  ["English doesn't mark any of this, so there's no instinct to lean on at first. The form can't be guessed either, so learn it with each new word.",
    "Отчасти это знакомо по русскому: «налей воды», а не «воду», и несовершенный вид для незаконченного действия. В эстонском всё это делает одно окончание. Угадать форму нельзя, поэтому учите её вместе с каждым новым словом.",
    "Почасти це знайомо з української: «налий води», а не «воду», і недоконаний вид для незавершеної дії. В естонській усе це робить одне закінчення. Угадати форму не можна, тож учіть її разом із кожним новим словом."],
  ["Some water. A book you're reading but haven't finished.",
    "Немного воды. Книга, которую вы читаете, но ещё не дочитали.",
    "Трохи води. Книжка, яку ви читаєте, але ще не дочитали."],

  // SISSEÜTLEV.
  ["Going into something: a room, a new language, a bad mood.",
    "Движение внутрь чего-то: в комнату, в новый язык, в плохое настроение.",
    "Рух усередину чогось: у кімнату, у нову мову, у поганий настрій."],
  ["Going into a place or a container", "Движение внутрь места или ёмкости", "Рух усередину місця чи посудини"],
  ["Going into a state or a stretch of time", "Переход в состояние или в отрезок времени", "Перехід у стан чи проміжок часу"],
  ["Many everyday words have a second, shorter form, and that's the one people actually say. The dictionary shows it wherever there is one, and both count.",
    "У многих повседневных слов есть вторая, короткая форма, и в живой речи говорят именно её. Словарь показывает её везде, где она есть, и засчитываются обе.",
    "Багато повсякденних слів мають другу, коротку форму, і в живому мовленні кажуть саме її. Словник показує її скрізь, де вона є, і зараховуються обидві."],
  ["Into the room, into the nineties, into a bad mood.",
    "В комнату, в девяностые, в плохое настроение.",
    "У кімнату, у дев'яності, у поганий настрій."],

  // SEESÜTLEV.
  ["Being inside something, and being in a month, a language or a mood.",
    "Нахождение внутри чего-то, а также в месяце, языке или настроении.",
    "Перебування всередині чогось, а також у місяці, мові чи настрої."],
  ["Position inside a place", "Нахождение внутри места", "Перебування всередині місця"],
  ["Being in a state, a language, or a month", "Нахождение в состоянии, языке или месяце", "Перебування в стані, мові чи місяці"],
  ["Estonian and English don't always agree on what counts as inside. Towns and rooms are, but some islands and open places aren't, so learn those as you meet them.",
    "Что считается «внутри», каждый язык решает сам. Города и комнаты считаются, а некоторые острова и открытые места нет, примерно как в русском «на острове», «на рынке». Такие слова запоминайте, когда встретите.",
    "Що вважається «всередині», кожна мова вирішує сама. Міста й кімнати вважаються, а деякі острови й відкриті місця ні, приблизно як в українському «на острові», «на ринку». Такі слова запам'ятовуйте, коли трапляться."],
  ["In the house, in March, in a good mood.", "В доме, в марте, в хорошем настроении.", "У будинку, у березні, у гарному настрої."],

  // SEESTÜTLEV.
  ["Coming out of something, and also what a book or a chat is about.",
    "Движение изнутри чего-то наружу, а ещё то, о чём книга или разговор.",
    "Рух зсередини чогось назовні, а ще те, про що книжка чи розмова."],
  ["Coming out of a place", "Движение изнутри наружу", "Рух зсередини назовні"],
  ["What something is made of", "Из чего что-то сделано", "З чого щось зроблено"],
  ["What a text or a conversation is about", "О чём текст или разговор", "Про що текст чи розмова"],
  ["The surprise is \"about\". Talking about history takes the same ending as walking out of a building.",
    "Неожиданное здесь значение «о». Разговор об истории получает то же окончание, что и выход из здания.",
    "Несподіванка тут у значенні «про». Розмова про історію отримує те саме закінчення, що й вихід із будівлі."],
  ["Out of the house. A book about history.", "Из дома. Книга об истории.", "З дому. Книжка про історію."],

  // ALALEÜTLEV.
  ["Going onto a surface, and the person you give something to.",
    "Движение на поверхность и тот, кому вы что-то даёте.",
    "Рух на поверхню і той, кому ви щось даєте."],
  ["Going onto a surface", "Движение на поверхность", "Рух на поверхню"],
  ["The person something is given, said or sent to",
    "Тот, кому что-то дают, говорят или отправляют",
    "Той, кому щось дають, кажуть чи надсилають"],
  ["English says \"to the shop\" and \"to Anna\" with one little word. Estonian asks which kind of \"to\": into something is -sse, onto something or to a person is this one.",
    "По-русски это разные конструкции: «в магазин», «на стол», «Анне». Эстонский тоже их различает: движение внутрь чего-то даёт -sse, а на поверхность или к человеку даёт это окончание.",
    "Українською це різні конструкції: «у магазин», «на стіл», «Анні». Естонська теж їх розрізняє: рух усередину чогось дає -sse, а на поверхню чи до людини дає це закінчення."],
  ["Onto the table. To a friend, to your teacher.", "На стол. Другу, вашему преподавателю.", "На стіл. Другові, вашому викладачеві."],

  // ALALÜTLEV.
  ["Being on something, and how Estonian says somebody has something.",
    "Нахождение на чём-то, а также то, как по-эстонски говорят, что у кого-то что-то есть.",
    "Перебування на чомусь, а також те, як естонською кажуть, що в когось щось є."],
  ["Position on a surface", "Положение на поверхности", "Положення на поверхні"],
  ["Having something: the owner takes this ending",
    "Обладание чем-то: это окончание получает владелец",
    "Володіння чимось: це закінчення отримує власник"],
  ["When something happens", "Когда что-то происходит", "Коли щось відбувається"],
  ["There's no verb for \"have\". The owner takes this ending and the thing they own becomes the subject, so the sentence feels inside out at first.",
    "Глагола «иметь» здесь нет. Окончание получает владелец, а то, что у него есть, становится подлежащим, совсем как в русском «у меня есть». Англоязычным это кажется странным, а вам, скорее всего, нет.",
    "Дієслова «мати» тут немає. Закінчення отримує власник, а те, що в нього є, стає підметом, як в українському «у мене є». Англомовним це здається дивним, а вам, найімовірніше, ні."],
  ["On the table. \"I have a cat\" comes out as \"at me is a cat\".",
    "На столе. А «у меня есть кошка» строится ровно как по-русски.",
    "На столі. А «у мене є кішка» будується так само, як українською."],

  // ALALTÜTLEV.
  ["Coming off a surface, and the person you get something from.",
    "Движение с поверхности и тот, от кого вы что-то получаете.",
    "Рух із поверхні і той, від кого ви щось отримуєте."],
  ["Coming off a surface", "Движение с поверхности", "Рух із поверхні"],
  ["The person something is taken, bought or asked from",
    "Тот, у кого что-то берут, покупают или спрашивают",
    "Той, у кого щось беруть, купують чи питають"],
  ["Think \"off a table\", not \"out of a box\". That one difference is all that separates this ending from -st.",
    "Думайте «со стола», а не «из коробки». Только этим оно и отличается от -st.",
    "Думайте «зі столу», а не «з коробки». Лише цим це закінчення й відрізняється від -st."],
  ["Off the table. From the person who sold it to you.",
    "Со стола. У того, кто вам это продал.",
    "Зі столу. У того, хто вам це продав."],

  // SAAV.
  ["Turning into something, what a thing is for, and by when.",
    "Превращение во что-то, для чего что-то нужно и к какому сроку.",
    "Перетворення на щось, для чого щось потрібне і до якого терміну."],
  ["Turning into a state or a role", "Переход в состояние или роль", "Перехід у стан чи роль"],
  ["What something is for", "Для чего что-то нужно", "Для чого щось потрібне"],
  ["A deadline: by when", "Срок: к какому времени", "Термін: до якого часу"],
  ["It covers far more than English \"into\". Becoming a teacher, the weather turning cold and being ready by Friday all use this one ending.",
    "Оно охватывает гораздо больше, чем кажется. Стать учителем, похолодать и успеть к пятнице: везде одно и то же окончание.",
    "Воно охоплює набагато більше, ніж здається. Стати вчителем, похолоднішати й устигнути до п'ятниці: скрізь одне й те саме закінчення."],
  ["Turning cold, getting it as a gift, done by Friday.",
    "Похолодать, получить в подарок, сделать к пятнице.",
    "Похолоднішати, отримати в подарунок, зробити до п'ятниці."],

  // RAJAV.
  ["As far as some point: a place, a moment or an amount.",
    "До какой-то точки: места, момента или количества.",
    "До якоїсь межі: місця, моменту чи кількості."],
  ["As far as a place", "До места", "До місця"],
  ["Until a moment", "До момента", "До моменту"],
  ["Up to an amount", "До определённого количества", "До певної кількості"],
  ["The ending already means \"as far as\", so the extra word people sometimes add when talking says it twice. Harmless, but you don't need it.",
    "Окончание уже значит «до», поэтому лишнее слово, которое иногда добавляют в разговоре, повторяет то же самое. Это не ошибка, но и не нужно.",
    "Закінчення вже означає «до», тож зайве слово, яке іноді додають у розмові, повторює те саме. Це не помилка, але й не потрібно."],
  ["As far as the church. Right up until Friday.", "До церкви. До самой пятницы.", "До церкви. Аж до п'ятниці."],

  // OLEV.
  ["In the role of something, usually for now rather than forever.",
    "В роли кого-то или чего-то, обычно на время, а не навсегда.",
    "У ролі когось чи чогось, зазвичай на певний час, а не назавжди."],
  ["Working as something", "Работать кем-то", "Працювати кимось"],
  ["A role or a capacity you are in for now", "Роль или положение, в котором вы сейчас", "Роль чи становище, у якому ви зараз"],
  ["The -ks ending is for getting into a role. This one means you're already in it. Keep those two apart and you've got it.",
    "По-русски и «стать учителем», и «работать учителем» стоят в творительном падеже, а в эстонском это два окончания: -ks значит, что вы входите в роль, а это окончание значит, что вы уже в ней. Различайте их, и всё получится.",
    "Українською і «стати вчителем», і «працювати вчителем» стоять в орудному відмінку, а в естонській це два закінчення: -ks означає, що ви входите в роль, а це закінчення означає, що ви вже в ній. Розрізняйте їх, і все вийде."],
  ["Working as a teacher, for as long as that lasts.", "Работать учителем, пока это длится.", "Працювати вчителем, поки це триває."],

  // ILMAÜTLEV.
  ["Without something. The exact opposite of \"with\", the next one down.",
    "Без чего-то. Полная противоположность «с», о котором следующая карточка.",
    "Без чогось. Повна протилежність «з», про яке наступна картка."],
  ["The absence of a thing", "Отсутствие чего-то", "Відсутність чогось"],
  ["Doing something without a tool, a person or permission",
    "Делать что-то без инструмента, без человека или без разрешения",
    "Робити щось без інструмента, без людини чи без дозволу"],
  ["You won't hear it much out loud, where people tend to use a separate word for \"without\". Learn to recognize it before you worry about using it.",
    "Вслух его слышно нечасто: в речи обычно говорят отдельным словом «без». Сначала научитесь его узнавать, а уж потом думайте, как им пользоваться.",
    "Уголос його чути нечасто: у мовленні зазвичай кажуть окремим словом «без». Спершу навчіться його впізнавати, а вже потім думайте, як ним користуватися."],
  ["Without a coat. Without asking.", "Без пальто. Не спросив.", "Без пальта. Не спитавши."],

  // KAASAÜTLEV.
  ["With a person, with a tool, and how you got somewhere.",
    "С человеком, с инструментом, а также то, на чём вы добрались.",
    "З людиною, з інструментом, а також те, чим ви дісталися."],
  ["Together with somebody", "Вместе с кем-то", "Разом із кимось"],
  ["The tool you did it with", "Инструмент, которым вы это сделали", "Інструмент, яким ви це зробили"],
  ["How you got somewhere, like by bus", "На чём вы добрались, например на автобусе", "Чим ви дісталися, наприклад автобусом"],
  ["It covers \"with a friend\" and \"with a knife\", which plenty of languages keep apart. It's always -ga, so it's the easiest ending to spot.",
    "Оно передаёт и «с другом», и «ножом», и «на автобусе», а в русском это три разные конструкции. Это всегда -ga, поэтому его проще всего узнать.",
    "Воно передає і «з другом», і «ножем», і «автобусом», а в українській це різні конструкції. Це завжди -ga, тож його найлегше впізнати."],
  ["With a friend, with a fork, and by bus.", "С другом, вилкой и на автобусе.", "З другом, виделкою і автобусом."],

  // THE FOUR GROUPS OF ENDINGS (CASE_GROUPS).
  ["Three to memorize", "Три формы наизусть", "Три форми напам'ять"],
  ["You learn these three with each new word, because no rule gives them to you. The second one matters most: every ending below is added to it.",
    "Эти три формы учат с каждым новым словом, потому что никакое правило их не даёт. Важнее всего вторая: к ней добавляются все окончания ниже.",
    "Ці три форми вчать із кожним новим словом, бо жодне правило їх не дає. Найважливіша друга: до неї додаються всі закінчення нижче."],
  ["Inside", "Внутри", "Усередині"],
  ["Into, in and out of. For boxes, buildings and towns, and for languages, months and moods too.",
    "Внутрь, внутри и изнутри. Для коробок, зданий и городов, а ещё для языков, месяцев и настроений.",
    "Усередину, усередині й зсередини. Для коробок, будівель і міст, а ще для мов, місяців і настроїв."],
  ["On top", "На поверхности", "На поверхні"],
  ["Onto, on and off. For tables and shelves, for people, and for how Estonian says someone has something.",
    "На что-то, на чём-то и с чего-то. Для столов и полок, для людей и для того, как по-эстонски говорят, что у кого-то что-то есть.",
    "На щось, на чомусь і з чогось. Для столів і полиць, для людей і для того, як естонською кажуть, що в когось щось є."],
  ["Five more, one job each", "Ещё пять, у каждого одна задача", "Ще п'ять, у кожного одне завдання"],
  ["Becoming, up to, as, without and with. No puzzles here: each ending is one simple idea.",
    "Становиться, до, в качестве, без и с. Никаких загадок: каждое окончание означает что-то одно и простое.",
    "Ставати, до, у ролі, без і з. Жодних загадок: кожне закінчення означає щось одне й просте."],

  // WHAT EACH KIND OF EXCEPTION IS (lib/estonian/exceptions.ts, KIND_NOTES, FAMILY_TITLES).
  // "The verb" is a topic group's title as well and is translated there.
  ["The base form", "Основа слова", "Основа слова"],
  ["The singular", "Единственное число", "Однина"],
  ["The plural", "Множественное число", "Множина"],
  ["The middle of the word changes", "Меняется середина слова", "Змінюється середина слова"],
  ["Most words make their second form, the one meaning \"of\" or \"whose\", by adding a letter or two. These don't: a consonant swaps, a vowel drops out, or the word changes shape. Every other ending is added to that form, so learn it first.",
    "Обычно вторая форма слова, та, что значит «кого? чего?» или «чей», получается добавлением одной-двух букв. У этих слов не так: меняется согласная, выпадает гласная или слово меняет облик. Все остальные окончания добавляются именно к этой форме, поэтому учите её первой.",
    "Зазвичай друга форма слова, та, що означає «кого? чого?» або «чий», утворюється додаванням однієї-двох літер. У цих слів не так: змінюється приголосна, випадає голосна або слово змінює вигляд. Усі інші закінчення додаються саме до цієї форми, тому вчіть її першою."],
  ["Its own \"some of it\" form", "Своя форма «часть чего-то»", "Власна форма «частина чогось»"],
  ["The \"some of it\" form is usually the \"whose\" form plus t or d, or just the plain word. Here it brings back a consonant the other forms lost, or ends in a way nothing predicts. This one you remember rather than work out.",
    "Форма «часть чего-то» обычно равна форме «чей» плюс t или d либо просто начальной форме. Здесь она возвращает согласную, которую потеряли другие формы, или кончается так, как ничто не предсказывает. Эту форму запоминают, а не выводят.",
    "Форма «частина чогось» зазвичай дорівнює формі «чий» плюс t чи d або просто початковій формі. Тут вона повертає приголосну, яку втратили інші форми, або закінчується так, як ніщо не передбачає. Цю форму запам'ятовують, а не виводять."],
  ["Two ways to say \"into\"", "Два способа сказать «внутрь»", "Два способи сказати «всередину»"],
  ["This word has two ways to say \"into\". The long one adds sse to the \"whose\" form and is always right. The short one is what you'll actually hear, and no rule gets you there. Both are shown, and either one counts.",
    "У этого слова два способа сказать «внутрь». Длинный добавляет sse к форме «чей» и всегда верен. Короткий вы и будете слышать на деле, и никакое правило к нему не приведёт. Показаны оба, и засчитывается любой.",
    "Це слово має два способи сказати «всередину». Довгий додає sse до форми «чий» і завжди правильний. Короткий ви й чутимете насправді, і жодне правило до нього не приведе. Показано обидва, і зараховується будь-який."],
  ["A plural base of its own", "Своя основа множественного числа", "Власна основа множини"],
  ["All the plural endings go onto one form: the plural of \"whose\". For these words you can't get it by adding an ending to the singular. Learn this one and the rest of the plural follows.",
    "Все окончания множественного числа добавляются к одной форме: к форме «чей» во множественном числе. У этих слов её не получить, добавив окончание к единственному числу. Выучите её, и остальное множественное число выстроится само.",
    "Усі закінчення множини додаються до однієї форми: до форми «чий» у множині. У цих слів її не отримати, додавши закінчення до однини. Вивчіть її, і решта множини складеться сама."],
  ["A plural \"some of it\" form to learn", "Форма «часть чего-то» во множественном, которую надо выучить", "Форма «частина чогось» у множині, яку треба вивчити"],
  ["Most plural \"some of it\" forms just add a vowel, id or sid to a form you already know. These don't, so this one you remember rather than work out.",
    "Обычно форма «часть чего-то» во множественном числе просто добавляет гласную, id или sid к уже известной форме. У этих слов не так, поэтому её запоминают, а не выводят.",
    "Зазвичай форма «частина чогось» у множині просто додає голосну, id або sid до вже відомої форми. У цих слів не так, тому її запам'ятовують, а не виводять."],
  ["A plural you wouldn't guess", "Множественное число, которое не угадать", "Множина, яку не вгадати"],
  ["For nearly every word, the plural is the \"whose\" form plus d. Not here, so the plural is a second word to learn alongside the singular.",
    "Почти у любого слова множественное число равно форме «чей» плюс d. Здесь не так, поэтому множественное число приходится учить как второе слово рядом с единственным.",
    "Майже в будь-якого слова множина дорівнює формі «чий» плюс d. Тут не так, тому множину доводиться вчити як друге слово поруч з одниною."],
  ["No plural", "Нет множественного числа", "Немає множини"],
  ["Nobody counts these, so there's no plural to learn. The dictionary doesn't list one, and you won't need one either.",
    "Такое не считают поштучно, так что множественного числа учить не нужно. В словаре его нет, и вам оно не понадобится.",
    "Таке не рахують поштучно, тож множини вчити не треба. У словнику її немає, і вам вона не знадобиться."],
  ["An \"I\" form to learn", "Форма «я», которую надо выучить", "Форма «я», яку треба вивчити"],
  ["Every person, the \"not\" form, the \"would\" form and the commands are built on the \"I\" form. For these verbs you can't get it by swapping the ending on the dictionary word, so get it wrong and the whole present goes wrong with it.",
    "Все лица, форма с «не», форма с «бы» и повелительные формы строятся на форме «я». У этих глаголов её не получить, заменив окончание у словарной формы, так что ошибка в ней тянет за собой всё настоящее время.",
    "Усі особи, форма з «не», форма з «би» і наказові форми будуються на формі «я». У цих дієслів її не отримати, замінивши закінчення у словниковій формі, тож помилка в ній тягне за собою весь теперішній час."],
  ["The past takes a different shape", "Прошедшее время меняет облик", "Минулий час змінює вигляд"],
  ["\"I did\" is usually the dictionary word minus ma, plus sin. These verbs change a vowel or their whole shape, and they're some of the most common verbs there are.",
    "«Я сделал» обычно получается из словарной формы: минус ma, плюс sin. Эти глаголы меняют гласную или весь облик, и это одни из самых частых глаголов в языке.",
    "«Я зробив» зазвичай виходить зі словникової форми: мінус ma, плюс sin. Ці дієслова змінюють голосну або весь вигляд, і це одні з найуживаніших дієслів у мові."],
  ["He, she and it in the past", "Он, она и оно в прошедшем времени", "Він, вона й воно в минулому часі"],
  ["No rule turns \"I did\" into \"she did\": some verbs drop the ending and some add a vowel. It's the one form nothing predicts, for any verb.",
    "Никакое правило не превращает «я сделал» в «она сделала»: одни глаголы теряют окончание, другие добавляют гласную. Это единственная форма, которую ничто не предсказывает ни у одного глагола.",
    "Жодне правило не перетворює «я зробив» на «вона зробила»: одні дієслова втрачають закінчення, інші додають голосну. Це єдина форма, якої ніщо не передбачає в жодного дієслова."],
  ["The da form", "Форма на da", "Форма на da"],
  ["da form", "форма на da", "форма на da"],
  ["The form you need after \"want\", \"can\" and \"know how to\". It's usually the dictionary word minus ma, plus da. Not in these verbs: the word changes before the ending, so this one you learn rather than work out.",
    "Форма, которая нужна после «хотеть», «мочь» и «уметь». Обычно это словарная форма минус ma, плюс da. Но не у этих глаголов: слово меняется перед окончанием, так что эту форму учат, а не выводят.",
    "Форма, потрібна після «хотіти», «могти» і «вміти». Зазвичай це словникова форма мінус ma, плюс da. Але не в цих дієслів: слово змінюється перед закінченням, тож цю форму вчать, а не виводять."],
  ["The tud form", "Форма на tud", "Форма на tud"],
  ["tud form", "форма на tud", "форма на tud"],
  ["The form behind \"it has been done\". It's usually the dictionary word minus ma, plus tud or dud, but here the word changes first, so learn the whole thing.",
    "Форма, которая стоит за «сделано», как в «работа сделана». Обычно это словарная форма минус ma, плюс tud или dud, но здесь слово сначала меняется, так что учите её целиком.",
    "Форма, що стоїть за «зроблено», як у «роботу зроблено». Зазвичай це словникова форма мінус ma, плюс tud або dud, але тут слово спочатку змінюється, тож учіть її цілком."],
  ["Telling somebody politely", "Просьба на «вы»", "Прохання на «ви»"],
  ["The form every shop assistant and official will use with you. It isn't built on the \"I\" form, so where the present changes a consonant, this one keeps the other.",
    "Форма, которой к вам обратится любой продавец и чиновник: «возьмите», «подождите». Она строится не на форме «я», поэтому там, где настоящее время меняет согласную, эта форма сохраняет другую.",
    "Форма, якою до вас звернеться будь-який продавець і службовець: «візьміть», «зачекайте». Вона будується не на формі «я», тому там, де теперішній час змінює приголосну, ця форма зберігає іншу."],
];

export const GRAMMAR_CASES: Area = {
  ru: Object.fromEntries(LINES.map(([en, ru]) => [en, ru])),
  uk: Object.fromEntries(LINES.map(([en, , uk]) => [en, uk])),
};
