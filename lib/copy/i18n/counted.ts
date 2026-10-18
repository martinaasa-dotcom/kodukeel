import { AREAS } from "./index";
import type { CaseForms, Forms } from "./table";

/**
 * THE COUNTED NOUNS, IN ALL THREE LANGUAGES, ON THE SERVER ONLY.
 *
 * These lived in `lib/copy/locale.ts` and so reached every browser that
 * imported `countOf`, Russian and Ukrainian forms included, for a visitor
 * reading English. They are part of each language's table now
 * (`lib/copy/i18n/table.ts`); English keeps only its own two forms, in
 * `locale.ts`, which `countCases.test.ts` holds to the forms written here.
 */

/**
 * THE THREE PLURALS RUSSIAN AND UKRAINIAN HAVE, WHERE ENGLISH HAS TWO.
 *
 * "1 card, 2 cards, 5 cards" is one, few and many in both: 1 карточка,
 * 2 карточки, 5 карточек. A count built as the English noun plus an `s` reads
 * as a machine to anybody who speaks either language, so a counted noun is
 * written out per language and chosen by `Intl.PluralRules`, which knows that
 * 21 takes the singular and 12 does not.
 */
export const COUNTED_CORE: Readonly<Record<string, { en: readonly [string, string]; ru: Forms; uk: Forms }>> = {
  card: { en: ["card", "cards"], ru: ["карточка", "карточки", "карточек"], uk: ["картка", "картки", "карток"] },
  game: { en: ["game", "games"], ru: ["игра", "игры", "игр"], uk: ["гра", "гри", "ігор"] },
  pair: { en: ["pair", "pairs"], ru: ["пара", "пары", "пар"], uk: ["пара", "пари", "пар"] },
  picture: { en: ["picture", "pictures"], ru: ["картинка", "картинки", "картинок"], uk: ["картинка", "картинки", "картинок"] },
  sentence: { en: ["sentence", "sentences"], ru: ["предложение", "предложения", "предложений"], uk: ["речення", "речення", "речень"] },
  verb: { en: ["verb", "verbs"], ru: ["глагол", "глагола", "глаголов"], uk: ["дієслово", "дієслова", "дієслів"] },
  word: { en: ["word", "words"], ru: ["слово", "слова", "слов"], uk: ["слово", "слова", "слів"] },
};

/**
 * THE CASE A COUNT STANDS IN, WHICH THE THREE FORMS ABOVE DO NOT COVER.
 *
 * The one, few and many forms are what a count takes as the subject of a
 * sentence. Put the same count after "через", "за" or "на" and a feminine
 * noun moves into the accusative ("через 1 минуту"); after "не хватает" or
 * "из" the whole count is genitive ("не хватает 2 слов"). And a fraction
 * takes none of the three: "1,5 минуты", "1,5 тижня", which is the genitive
 * singular in both languages.
 *
 * So a count is asked for in a case, and the two forms the tables do not
 * already hold are written out here per noun: the genitive singular and the
 * accusative singular. The genitive plural is the many form in both
 * languages, which is what a count of five or more already takes, so it is
 * not repeated. An animate noun's accusative singular is its genitive
 * ("1 ученика"), written out rather than worked out. A noun counted
 * anywhere and missing here fails `countCases.test.ts`.
 */
export const COUNT_CASES: Readonly<Record<string, { ru: CaseForms; uk: CaseForms }>> = {
  card: { ru: ["карточки", "карточку"], uk: ["картки", "картку"] },
  game: { ru: ["игры", "игру"], uk: ["гри", "гру"] },
  pair: { ru: ["пары", "пару"], uk: ["пари", "пару"] },
  picture: { ru: ["картинки", "картинку"], uk: ["картинки", "картинку"] },
  sentence: { ru: ["предложения", "предложение"], uk: ["речення", "речення"] },
  verb: { ru: ["глагола", "глагол"], uk: ["дієслова", "дієслово"] },
  word: { ru: ["слова", "слово"], uk: ["слова", "слово"] },
  unit: { ru: ["раздела", "раздел"], uk: ["розділу", "розділ"] },
  week: { ru: ["недели", "неделю"], uk: ["тижня", "тиждень"] },
  minute: { ru: ["минуты", "минуту"], uk: ["хвилини", "хвилину"] },
  day: { ru: ["дня", "день"], uk: ["дня", "день"] },
  evening: { ru: ["вечера", "вечер"], uk: ["вечора", "вечір"] },
  part: { ru: ["части", "часть"], uk: ["частини", "частину"] },
  "new word": { ru: ["нового слова", "новое слово"], uk: ["нового слова", "нове слово"] },
  second: { ru: ["секунды", "секунду"], uk: ["секунди", "секунду"] },
  thing: { ru: ["дела", "дело"], uk: ["справи", "справу"] },
  task: { ru: ["задания", "задание"], uk: ["завдання", "завдання"] },
  letter: { ru: ["буквы", "букву"], uk: ["літери", "літеру"] },
  phrase: { ru: ["фразы", "фразу"], uk: ["фрази", "фразу"] },
  answer: { ru: ["ответа", "ответ"], uk: ["відповіді", "відповідь"] },
  grade: { ru: ["ответа", "ответ"], uk: ["відповіді", "відповідь"] },
  time: { ru: ["раза", "раз"], uk: ["разу", "раз"] },
  place: { ru: ["места", "место"], uk: ["місця", "місце"] },
  "other match": { ru: ["другого совпадения", "другое совпадение"], uk: ["іншого збігу", "інший збіг"] },
  point: { ru: ["балла", "балл"], uk: ["бала", "бал"] },
  review: { ru: ["повторения", "повторение"], uk: ["повторення", "повторення"] },
  "scanned page": {
    ru: ["отсканированной страницы", "отсканированную страницу"],
    uk: ["відсканованої сторінки", "відскановану сторінку"],
  },
  member: { ru: ["участника", "участника"], uk: ["учасника", "учасника"] },
  person: { ru: ["человека", "человека"], uk: ["людини", "людину"] },
  hour: { ru: ["часа", "час"], uk: ["години", "годину"] },
  "week, as a span": { ru: ["недели", "неделю"], uk: ["тижня", "тиждень"] },
  "open report": {
    ru: ["открытого сообщения", "открытое сообщение"],
    uk: ["відкритого повідомлення", "відкрите повідомлення"],
  },
  report: { ru: ["сообщения", "сообщение"], uk: ["повідомлення", "повідомлення"] },
  group: { ru: ["группы", "группу"], uk: ["групи", "групу"] },
  match: { ru: ["совпадения", "совпадение"], uk: ["збігу", "збіг"] },
  learner: { ru: ["ученика", "ученика"], uk: ["учня", "учня"] },
  shot: { ru: ["выстрела", "выстрел"], uk: ["пострілу", "постріл"] },
  form: { ru: ["формы", "форму"], uk: ["форми", "форму"] },
  "card waiting": { ru: ["карточки ждут", "карточка ждёт"], uk: ["картки чекають", "картка чекає"] },
  lapse: { ru: ["провала", "провал"], uk: ["провалу", "провал"] },
  month: { ru: ["месяца", "месяц"], uk: ["місяця", "місяць"] },
  year: { ru: ["года", "год"], uk: ["року", "рік"] },
  mark: { ru: ["балла", "балл"], uk: ["бала", "бал"] },
  sitting: { ru: ["попытки", "попытку"], uk: ["спроби", "спробу"] },
  "scored question": {
    ru: ["оцениваемого вопроса", "оцениваемый вопрос"],
    uk: ["оцінюваного запитання", "оцінюване запитання"],
  },
  "new one": { ru: ["новой", "новую"], uk: ["нової", "нову"] },
  "brand new card": {
    ru: ["совсем новой карточки", "совсем новую карточку"],
    uk: ["зовсім нової картки", "зовсім нову картку"],
  },
  step: { ru: ["шага", "шаг"], uk: ["кроку", "крок"] },
  shield: { ru: ["щита", "щит"], uk: ["щита", "щит"] },
  conversation: { ru: ["разговора", "разговор"], uk: ["розмови", "розмову"] },
  cent: { ru: ["цента", "цент"], uk: ["цента", "цент"] },
  pages: { ru: ["страницы", "страницу"], uk: ["сторінки", "сторінку"] },
  clips: { ru: ["аудиозаписи", "аудиозапись"], uk: ["аудіозапису", "аудіозапис"] },
  characters: { ru: ["символа", "символ"], uk: ["символу", "символ"] },
  questions: { ru: ["вопроса", "вопрос"], uk: ["запитання", "запитання"] },
  notes: { ru: ["отзыва", "отзыв"], uk: ["відгуку", "відгук"] },
  emails: { ru: ["письма", "письмо"], uk: ["листа", "лист"] },
  milliseconds: { ru: ["миллисекунды", "миллисекунду"], uk: ["мілісекунди", "мілісекунду"] },
  kilobytes: { ru: ["килобайта", "килобайт"], uk: ["кілобайта", "кілобайт"] },
  "percent of the month's learners": {
    ru: ["процента учеников за месяц", "процент учеников за месяц"],
    uk: ["відсотка учнів за місяць", "відсоток учнів за місяць"],
  },
  times: { ru: ["раза", "раз"], uk: ["разу", "раз"] },
};

/** Every counted noun with its three languages: the core above and every area's own. */
export const COUNTED: Readonly<Record<string, { en: readonly [string, string]; ru: Forms; uk: Forms }>> =
  Object.assign({}, COUNTED_CORE, ...AREAS.map(([, a]) => a.counted ?? {}));

/** Every counted noun, for the test that walks them all. */
export const COUNTED_NOUNS: readonly string[] = Object.keys(COUNTED);
