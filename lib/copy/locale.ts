import { AREAS } from "./i18n";

/**
 * THE LANGUAGE THE APP ITSELF IS WRITTEN IN, FOR A LEARNER WHO READS RUSSIAN
 * OR UKRAINIAN BETTER THAN ENGLISH.
 *
 * Most adults learning Estonian in Estonia already speak Russian or Ukrainian,
 * and an app they have to read in their third language is an app they work
 * twice as hard at. The entry pages were translated first
 * (`lib/copy/entryLocales.ts`); this is the inside of the app, started with
 * the screens somebody meets every evening: the navigation, the screen that
 * opens every round, and Settings.
 *
 * KEYED ON THE ENGLISH, AND FALLING BACK TO IT. A line nobody has translated
 * yet is printed in English rather than as a blank or a key, so a half
 * translated app reads as a translated app with some English in it, which is
 * the honest state of it. The English is the key because it is the source:
 * a table keyed on ids would need every caller to stop holding its own copy,
 * and a line changed in English then simply falls back until somebody
 * translates the new one, which `locale.test.ts` reports for the surfaces it
 * covers.
 *
 * MACHINE TRANSLATED AND SAID SO. Nobody who speaks either language as a
 * first language has read these yet. Settings says so in the language itself
 * and in English beside the choice, and the shell says it once on arrival
 * (`components/LocaleNotice.tsx`). When somebody fluent has read a locale,
 * `REVIEWED` is set for it, with their name in the commit.
 *
 * NO ESTONIAN IS WRITTEN HERE OR IN THE TABLES (ADR-005). An Estonian word on
 * a screen still comes off the dictionary; this only changes the words around
 * it. And it is not the gloss language (`lib/collections/glossLanguage.ts`),
 * which decides what is printed beside a word's English meaning and is the
 * Institute's own equivalent rather than a translation of ours.
 */
export const LOCALES = ["en", "ru", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language's own name for itself, for the picker. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
};

/** Whether a fluent reader has checked this locale. */
export const REVIEWED: Readonly<Record<Locale, boolean>> = { en: true, ru: false, uk: false };

/**
 * The disclaimer, in the language it is about. Said beside the English one
 * (`MACHINE_NOTICE_EN`) wherever it is shown, for a reader of neither.
 */
export const MACHINE_NOTICE: Readonly<Record<Exclude<Locale, "en">, string>> = {
  ru: "Интерфейс переведён с помощью ИИ, и носитель языка его ещё не проверял, поэтому в переводе возможны ошибки. Часть экранов пока на английском.",
  uk: "Інтерфейс перекладено за допомогою ШІ, і носій мови його ще не перевіряв, тож у перекладі можливі помилки. Частина екранів поки що англійською.",
};

/** The same, short enough for the line under a choice. */
export const MACHINE_SHORT: Readonly<Record<Exclude<Locale, "en">, string>> = {
  ru: "Переведено с помощью ИИ, носитель языка ещё не проверял.",
  uk: "Перекладено за допомогою ШІ, носій мови ще не перевіряв.",
};

export const MACHINE_NOTICE_EN =
  "This translation was made with AI and no native speaker has reviewed it yet, so it may contain mistakes. Some screens are still in English.";

/** A stored row read back as a locale. Absent or unknown is English, which is what everybody had. */
export function localeFrom(stored: string | null | undefined): Locale {
  return stored === "ru" || stored === "uk" ? stored : "en";
}

/** Every area merged, per language. Two areas translating one line differently is a test failure, not a merge. */
const TABLES: Readonly<Record<Exclude<Locale, "en">, Readonly<Record<string, string>>>> = {
  ru: Object.assign({}, ...AREAS.map(([, a]) => a.ru)),
  uk: Object.assign({}, ...AREAS.map(([, a]) => a.uk)),
};

/**
 * The line in this locale, or the English where nobody has translated it yet.
 *
 * `context` is for the rare English word that means two things on two screens
 * and needs two translations: "person" is a grammatical person in the verb
 * tables and a strength on a job-interview card. Such a line is stored under
 * `english@context` (`person@grammar`) and looked up there first.
 */
export function tr(locale: Locale, english: string, context?: string): string {
  if (locale === "en") return english;
  const table = TABLES[locale];
  if (context) {
    const specific = table[`${english}@${context}`];
    if (specific !== undefined) return specific;
  }
  return table[english] ?? english;
}

/** Whether a line has a translation in this locale. English always has. */
export function translated(locale: Locale, english: string): boolean {
  return locale === "en" || english in TABLES[locale];
}

/** A template's `{name}` slots filled in, after it has been through `tr`. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/**
 * THE THREE PLURALS RUSSIAN AND UKRAINIAN HAVE, WHERE ENGLISH HAS TWO.
 *
 * "1 card, 2 cards, 5 cards" is one, few and many in both: 1 карточка,
 * 2 карточки, 5 карточек. A count built as the English noun plus an `s` reads
 * as a machine to anybody who speaks either language, so a counted noun is
 * written out per language and chosen by `Intl.PluralRules`, which knows that
 * 21 takes the singular and 12 does not.
 */
type Forms = readonly [one: string, few: string, many: string];
const COUNTED_CORE: Readonly<Record<string, { en: readonly [string, string]; ru: Forms; uk: Forms }>> = {
  card: { en: ["card", "cards"], ru: ["карточка", "карточки", "карточек"], uk: ["картка", "картки", "карток"] },
  pair: { en: ["pair", "pairs"], ru: ["пара", "пары", "пар"], uk: ["пара", "пари", "пар"] },
  picture: { en: ["picture", "pictures"], ru: ["картинка", "картинки", "картинок"], uk: ["картинка", "картинки", "картинок"] },
  sentence: { en: ["sentence", "sentences"], ru: ["предложение", "предложения", "предложений"], uk: ["речення", "речення", "речень"] },
  verb: { en: ["verb", "verbs"], ru: ["глагол", "глагола", "глаголов"], uk: ["дієслово", "дієслова", "дієслів"] },
  word: { en: ["word", "words"], ru: ["слово", "слова", "слов"], uk: ["слово", "слова", "слів"] },
};

const COUNTED: Readonly<Record<string, { en: readonly [string, string]; ru: Forms; uk: Forms }>> =
  Object.assign({}, COUNTED_CORE, ...AREAS.map(([, a]) => a.counted ?? {}));

/** Which of the three forms a count takes in Russian or Ukrainian. */
export function pluralIndex(locale: Exclude<Locale, "en">, n: number): 0 | 1 | 2 {
  const category = new Intl.PluralRules(locale).select(n);
  return category === "one" ? 0 : category === "few" ? 1 : 2;
}

/** "5 cards", "5 карточек", "5 карток". A noun the table does not hold falls back to English. */
export function countOf(locale: Locale, n: number, noun: string): string {
  const forms = COUNTED[noun];
  if (!forms) return `${n} ${n === 1 ? noun : `${noun}s`}`;
  if (locale === "en") return `${n} ${forms.en[n === 1 ? 0 : 1]}`;
  return `${n} ${forms[locale][pluralIndex(locale, n)]}`;
}
