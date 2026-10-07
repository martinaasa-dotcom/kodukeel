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
  ru: "Переведено с помощью ИИ и ещё не проверено носителем языка.",
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
  ru: plainKeys(Object.assign({}, ...AREAS.map(([, a]) => a.ru))),
  uk: plainKeys(Object.assign({}, ...AREAS.map(([, a]) => a.uk))),
};

/** A table with every key written with the straight apostrophe, which is what a lookup asks with. */
function plainKeys(table: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [english, line] of Object.entries(table)) out[keyOf(english)] = line;
  return out;
}

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
  const key = keyOf(english);
  if (context) {
    const specific = table[`${key}@${context}`];
    if (specific !== undefined) return specific;
  }
  const plain = table[key];
  if (plain !== undefined) return plain;
  const slotted = estonianSlots(key);
  if (slotted) {
    const template = table[slotted.key];
    if (template !== undefined) return fill(template, slotted.values);
  }
  return english;
}

/**
 * The English as the tables hold it: with the straight apostrophe. The screen
 * prints the curly one (`won’t`), which is what the English copy always used,
 * and the tables are keyed on the plain one, so a line looks itself up by
 * either and one apostrophe can never cost a translation.
 */
function keyOf(english: string): string {
  return english.includes("\u2019") ? english.replace(/\u2019/g, "'") : english;
}

/** Whether a line has a translation in this locale. English always has. */
export function translated(locale: Locale, english: string): boolean {
  const key = keyOf(english);
  if (locale === "en" || key in TABLES[locale]) return true;
  const slotted = estonianSlots(key);
  return slotted !== null && slotted.key in TABLES[locale];
}

/**
 * AN ESTONIAN WORD INSIDE AN ENGLISH LINE TRAVELS IN A SLOT.
 *
 * Some of the course's own English quotes Estonian to make its point
 * (`köögis is in the kitchen`), and a translation table may not hold an
 * Estonian letter (ADR-005, asserted in `locale.test.ts`): copying `köögis`
 * into the Russian would be this file writing Estonian. So a line holding a
 * word with õ, ä, ö, ü, š or ž is stored under its English with each such
 * word replaced by `{e1}`, `{e2}` and so on in order, and the words are put
 * back from the English the caller handed in. The Estonian on screen is
 * therefore always the Estonian the source wrote, character for character.
 * A word without one of those letters is not a slot and is carried as it
 * stands, which is what every area already does with `tuba` and `tuppa`.
 */
const ESTONIAN_WORD = /[\p{L}'-]*[õäöüšžÕÄÖÜŠŽ][\p{L}'-]*/gu;

export function estonianSlots(english: string): { key: string; values: Record<string, string> } | null {
  let n = 0;
  const values: Record<string, string> = {};
  const key = english.replace(ESTONIAN_WORD, (word) => {
    n += 1;
    values[`e${n}`] = word;
    return `{e${n}}`;
  });
  return n === 0 ? null : { key, values };
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
export const COUNTED_CORE: Readonly<Record<string, { en: readonly [string, string]; ru: Forms; uk: Forms }>> = {
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
