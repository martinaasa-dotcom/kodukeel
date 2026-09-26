/**
 * The entry page, in the two languages most people learning Estonian in
 * Estonia already read.
 *
 * Most adults learning Estonian here speak Russian or Ukrainian, and a landing
 * page they have to read in their third language is one they close. The app
 * itself is in English and says so on these pages; what it already does in
 * both languages is show a word's meaning, from the Institute of the Estonian
 * Language's own equivalents (`lib/collections/glossLanguage.ts`).
 *
 * MACHINE-TRANSLATED AND SAID SO. These were translated by a model and nobody
 * who speaks either language as a first language has read them yet. So every
 * page built from this table prints `notice` in its own language and in
 * English, at the top, for as long as `reviewed` is false, and an invariant
 * holds it there. When somebody fluent has read and corrected a locale, they
 * set `reviewed` to true with their name in the commit, and the notice goes.
 *
 * No Estonian is written here beyond the app's own name, which is the rule
 * every other copy table keeps (ADR-005).
 */

export type EntryLocale = "ru" | "uk";

export interface EntryCopy {
  /** The BCP 47 tag, for `lang`. */
  readonly lang: EntryLocale;
  /** The language's own name for itself, for the switcher. */
  readonly name: string;
  /** Where the page lives, written out so the route checker can see it. */
  readonly href: string;
  /** Whether a fluent reader has checked this locale. False until somebody has. */
  readonly reviewed: boolean;
  readonly notice: string;
  readonly title: string;
  readonly description: string;
  readonly headline: string;
  readonly sub: string;
  readonly cta: string;
  readonly whoTitle: string;
  readonly who: readonly { readonly title: string; readonly body: string }[];
  readonly whatTitle: string;
  readonly what: readonly string[];
  /** That the app itself is in English, said before anybody signs up. */
  readonly appInEnglish: string;
  readonly examLink: string;
}

/** Said in English beside the translated notice, for a reader of neither. */
export const MACHINE_TRANSLATED_EN = "Machine-translated, not yet reviewed by a native speaker.";

export const ENTRY_COPY: Readonly<Record<EntryLocale, EntryCopy>> = {
  ru: {
    lang: "ru",
    name: "Русский",
    href: "/welcome/ru",
    reviewed: false,
    notice: "Эта страница переведена машинным способом, и носитель языка её ещё не проверил.",
    title: "Kodukeel: эстонский, который наконец запоминается",
    description:
      "Бесплатное приложение для изучения эстонского: падежи по словарю, повторение вовремя и разговоры, к которым можно подготовиться.",
    headline: "Эстонский, который наконец запоминается.",
    sub:
      "Сосед здоровается. Коллега задаёт вопрос. Нужны правильные слова, когда на вас смотрят. Kodukeel готовит к этому по пятнадцать минут в день.",
    cta: "Начать бесплатно",
    whoTitle: "Для кого это",
    who: [
      {
        title: "Вы живёте в Эстонии",
        body: "Магазин, врач, письмо из города. Эстонский, который встречается каждую неделю, в том порядке, в каком он встречается.",
      },
      {
        title: "Ваш близкий говорит по-эстонски",
        body: "Его семья, его шутки, его мама по телефону. Потренируйтесь до воскресного обеда, а не во время него.",
      },
      {
        title: "У вас назначен экзамен",
        body: "Пробные экзамены от A2 до C1, которые проверяются по правилам, а не нейросетью, и понятное описание настоящего экзамена.",
      },
      {
        title: "Ваши рабочие встречи на эстонском",
        body: "Слова для работы и репетиция разговора с человеком, которому от вас что-то нужно.",
      },
    ],
    whatTitle: "Что внутри",
    what: [
      "Значения слов по-русски из словаря Института эстонского языка.",
      "Все четырнадцать падежей, с формами из словаря, а не придуманными моделью.",
      "Повторение в тот день, когда слово начинает забываться. Бесплатно, и работает без интернета.",
    ],
    appInEnglish:
      "Само приложение пока на английском. Значения слов можно показывать по-русски, это включается в настройках (Settings).",
    examLink: "Как устроен государственный экзамен (на английском)",
  },
  uk: {
    lang: "uk",
    name: "Українська",
    href: "/welcome/uk",
    reviewed: false,
    notice: "Цю сторінку перекладено машинно, і носій мови її ще не перевірив.",
    title: "Kodukeel: естонська, яка нарешті запам’ятовується",
    description:
      "Безкоштовний застосунок для вивчення естонської: відмінки зі словника, повторення вчасно і розмови, до яких можна підготуватися.",
    headline: "Естонська, яка нарешті запам’ятовується.",
    sub:
      "Сусід вітається. Колега ставить запитання. Потрібні правильні слова, коли на вас дивляться. Kodukeel готує до цього по п’ятнадцять хвилин на день.",
    cta: "Почати безкоштовно",
    whoTitle: "Для кого це",
    who: [
      {
        title: "Ви живете в Естонії",
        body: "Магазин, лікар, лист від міста. Естонська, яку ви зустрічаєте щотижня, у тому порядку, в якому вона трапляється.",
      },
      {
        title: "Ваша близька людина говорить естонською",
        body: "Її родина, її жарти, її мама по телефону. Потренуйтеся до недільного обіду, а не під час нього.",
      },
      {
        title: "У вас призначено іспит",
        body: "Пробні іспити від A2 до C1, які перевіряються за правилами, а не нейромережею, і зрозумілий опис справжнього іспиту.",
      },
      {
        title: "Ваші робочі зустрічі естонською",
        body: "Слова для роботи й репетиція розмови з людиною, якій щось від вас потрібно.",
      },
    ],
    whatTitle: "Що всередині",
    what: [
      "Значення слів українською для більшості слів, зі словника Інституту естонської мови.",
      "Усі чотирнадцять відмінків, з формами зі словника, а не вигаданими моделлю.",
      "Повторення саме того дня, коли слово починає забуватися. Безкоштовно, і працює без інтернету.",
    ],
    appInEnglish:
      "Сам застосунок поки що англійською. Значення слів можна показувати українською, це вмикається в налаштуваннях (Settings).",
    examLink: "Як влаштовано державний іспит (англійською)",
  },
};

export const ENTRY_LOCALES = Object.keys(ENTRY_COPY) as EntryLocale[];
