/*
  Every area merged, per language, on the server; in a browser, only what the
  page has handed over (`lib/copy/i18n/tables.browser.ts`). The specifier is
  resolved by package.json ("imports"), so this module is one file in both
  places and none of the seventy modules that call `tr` had to change.
*/
import { caseFormsFor, formsFor, lineFor } from "#i18n-tables";
import { keyOf } from "./i18n/table";

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

/**
 * THE LANGUAGES A PUBLIC PAGE CAN BE READ IN, WHICH IS ONE MORE THAN THE APP.
 *
 * Estonian is here and not in `LOCALES` (docs/44-sixth-batch.md, D16): a
 * reviewer at the Institute or a ministry reads what the app is, what it
 * costs and what it keeps in Estonian, and a learner is never offered the app
 * itself in the language they are learning. `LOCALES` decides what a learner
 * can choose, what every letter and every signed-in screen is drawn in and
 * what every translation check walks; this list decides only what the pages
 * built on `Legal` and the landing page can be read in. A signed-in screen
 * holds a `Locale`, which cannot be Estonian, and
 * `scripts/invariants/the-app-is-never-in-estonian.ts` holds the line.
 *
 * The Estonian lines are drafted by a model and wait for the native speaker
 * who develops this app to read them (docs/34-interface-languages.md). They
 * are prose about the app and never Estonian that teaches (ADR-005,
 * amendment 7).
 */
export const PUBLIC_LOCALES = ["en", "ru", "uk", "et"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

/**
 * The languages a public page in `locale` offers a link to, itself included,
 * out of the ones it is drawn in. English offers every one; each other
 * language offers English and itself and never names another, because a
 * reader of Russian would find Ukrainian on their own page a slight, and the
 * other way round. Switching between two of them goes through English, one
 * press away.
 */
export function publicLanguagesBeside(
  locale: PublicLocale,
  drawnIn: readonly PublicLocale[] = PUBLIC_LOCALES,
): readonly PublicLocale[] {
  const offered = locale === "en" ? PUBLIC_LOCALES : (["en", locale] as const);
  return offered.filter((l) => drawnIn.includes(l));
}

/** Each public language's own name for itself, for a public page's switcher. */
export const PUBLIC_LOCALE_NAMES: Readonly<Record<PublicLocale, string>> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  et: "Eesti",
};

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
  ru: "Интерфейс переведён с помощью ИИ, и носитель языка его ещё не проверял, поэтому в переводе возможны ошибки.",
  uk: "Інтерфейс перекладено за допомогою ШІ, і носій мови його ще не перевіряв, тож у перекладі можливі помилки.",
};

/** The same, short enough for the line under a choice. */
export const MACHINE_SHORT: Readonly<Record<Exclude<Locale, "en">, string>> = {
  ru: "Переведено с помощью ИИ и ещё не проверено носителем языка.",
  uk: "Перекладено за допомогою ШІ, носій мови ще не перевіряв.",
};

export const MACHINE_NOTICE_EN =
  "This translation was made with AI and no native speaker has reviewed it yet, so it may contain mistakes.";

/** A stored row read back as a locale. Absent or unknown is English, which is what everybody had. */
export function localeFrom(stored: string | null | undefined): Locale {
  return stored === "ru" || stored === "uk" ? stored : "en";
}

/**
 * The line in this locale, or the English where nobody has translated it yet.
 *
 * `context` is for the rare English word that means two things on two screens
 * and needs two translations: "person" is a grammatical person in the verb
 * tables and a strength on a job-interview card. Such a line is stored under
 * `english@context` (`person@grammar`) and looked up there first.
 */
export function tr(locale: PublicLocale, english: string, context?: string): string {
  if (locale === "en") return english;
  const key = keyOf(english);
  if (context) {
    const specific = lineFor(locale, `${key}@${context}`);
    if (specific !== undefined) return specific;
  }
  const plain = lineFor(locale, key);
  if (plain !== undefined) return plain;
  const slotted = estonianSlots(key);
  if (slotted) {
    const template = lineFor(locale, slotted.key);
    if (template !== undefined) return fill(template, slotted.values);
  }
  return english;
}

/** Whether a line has a translation in this locale. English always has. */
export function translated(locale: PublicLocale, english: string): boolean {
  const key = keyOf(english);
  if (locale === "en" || lineFor(locale, key) !== undefined) return true;
  const slotted = estonianSlots(key);
  return slotted !== null && lineFor(locale, slotted.key) !== undefined;
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
 * 2 карточки, 5 карточек. The forms are written out per language in
 * `lib/copy/i18n/counted.ts` and travel with each language's table, so a
 * browser reading English carries none of them. English needs only its own
 * two, which are the noun and an `s` except where this table says otherwise;
 * `countCases.test.ts` holds every counted noun's English to what the areas
 * write.
 *
 * `grammaticalCase` is the case the sentence puts the count in: "acc" after
 * "через", "за", "на" ("через 1 минуту"), "gen" after "не хватает", "из" or
 * "до" ("не хватает 2 слов"). See `COUNT_CASES` for the two forms the
 * three do not cover.
 */
export type CountCase = "nom" | "acc" | "gen";

const ENGLISH_FORMS: Readonly<Record<string, readonly [string, string]>> = {
  pages: ["page", "pages"],
  "exam point": ["point", "points"],
  "grammar point": ["point", "points"],
  clips: ["clip", "clips"],
  characters: ["character", "characters"],
  questions: ["question", "questions"],
  notes: ["note", "notes"],
  emails: ["email", "emails"],
  milliseconds: ["millisecond", "milliseconds"],
  kilobytes: ["kilobyte", "kilobytes"],
  "percent of the month's learners": ["percent of the month's learners", "percent of the month's learners"],
  times: ["time", "times"],
  devices: ["device", "devices"],
  "card waiting": ["card waiting", "cards waiting"],
  person: ["person", "people"],
  "week, as a span": ["week", "weeks"],
  match: ["match", "matches"],
  "other match": ["other match", "other matches"],
};

/**
 * A whole number grouped the way its reader groups digits: "6,274" in English
 * and "6 274" in Russian and Ukrainian, with a no-break space so the figure
 * never splits across two lines. One place, because the landing page grouped
 * its counts and the dictionary and the course printed the same count as
 * "6274", which reads as a different kind of number.
 */
export function grouped(locale: PublicLocale, n: number): string {
  return n.toLocaleString(locale === "en" ? "en-GB" : locale);
}

/** `countOf` with its figure grouped: "6,274 words", "6 274 слова". */
export function countGrouped(locale: PublicLocale, n: number, noun: string, grammaticalCase: CountCase = "nom"): string {
  return countOf(locale, n, noun, grammaticalCase).replace(String(n), grouped(locale, n));
}

/** A counted noun's two English forms. */
export function englishForms(noun: string): readonly [string, string] {
  return ENGLISH_FORMS[noun] ?? [noun, `${noun}s`];
}

/** Which form a count takes: one, few, many, or "other", the genitive singular a fraction takes. */
function categoryOf(locale: Exclude<Locale, "en">, n: number): "one" | "few" | "many" | "other" {
  const category = new Intl.PluralRules(locale).select(n);
  return category === "one" || category === "few" || category === "many" ? category : "other";
}

/**
 * Which of the three forms a count takes in Russian or Ukrainian. A fraction
 * answers the few slot, which is right in Russian (the few form is the
 * genitive singular) and is the nearest of the three in Ukrainian; `countOf`
 * itself takes the genitive singular from `COUNT_CASES`.
 */
export function pluralIndex(locale: Exclude<Locale, "en">, n: number): 0 | 1 | 2 {
  const category = categoryOf(locale, n);
  return category === "one" ? 0 : category === "many" ? 2 : 1;
}

/**
 * "5 cards", "5 карточек", "5 карток". A noun the table does not hold falls back to English.
 *
 * `grammaticalCase` is the case the sentence puts the count in: "acc" after
 * "через", "за", "на" ("через 1 минуту"), "gen" after "не хватает", "из" or
 * "до" ("не хватает 2 слов"). Nominative is the default and is what a count
 * standing as the subject, or after a colon, takes.
 */
export function countOf(locale: PublicLocale, n: number, noun: string, grammaticalCase: CountCase = "nom"): string {
  if (locale === "et") {
    // Estonian has two: the nominative after one and the partitive singular
    // after every other count ("1 sõna", "5 sõna", "1 õppija", "5 õppijat"),
    // whatever case the sentence is in, so `grammaticalCase` is not read.
    const forms = formsFor("et", noun);
    if (forms) return `${n.toLocaleString("et")} ${n === 1 ? forms[0] : forms[1]}`;
    return `${n} ${englishForms(noun)[n === 1 ? 0 : 1]}`;
  }
  if (locale !== "en" && formsFor(locale, noun)) {
    return `${figure(locale, n)} ${countedNoun(locale, n, noun, grammaticalCase)}`;
  }
  return `${n} ${englishForms(noun)[n === 1 ? 0 : 1]}`;
}

/** The noun alone, in the form and the case a count of `n` takes. */
export function countedNoun(
  locale: Exclude<Locale, "en">,
  n: number,
  noun: string,
  grammaticalCase: CountCase = "nom",
): string {
  const forms = formsFor(locale, noun);
  if (!forms) return noun;
  const [one, few, many] = forms;
  const extra = caseFormsFor(locale, noun);
  const gen1 = extra?.[0] ?? few;
  const acc1 = extra?.[1] ?? one;
  const category = categoryOf(locale, n);
  if (grammaticalCase === "gen") return category === "one" || category === "other" ? gen1 : many;
  if (category === "other") return gen1;
  if (category === "one") return grammaticalCase === "acc" ? acc1 : one;
  return category === "few" ? few : many;
}

/** A whole number as it stands; a fraction with the reader's decimal comma. */
function figure(locale: Exclude<Locale, "en">, n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString(locale === "ru" ? "ru-RU" : "uk-UA");
}
