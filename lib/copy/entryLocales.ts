/**
 * The landing page's facts about itself, in the two languages most people
 * learning Estonian in Estonia already read.
 *
 * Most adults learning Estonian here speak Russian or Ukrainian, and a landing
 * page they have to read in their third language is one they close. The page
 * itself is one component in three languages (`app/(chromeless)/welcome/page.tsx`,
 * with its lines in `lib/copy/i18n/areas/landing.ts`); what lives here is what
 * the page says about being a translation: its address, its title for a search
 * engine, the notice, and what language the app opens in.
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
  /**
   * What language the app itself is in, said before anybody signs up: the
   * language chosen here is carried through sign-in to first run. The page
   * prints `MACHINE_SHORT` after it, since the inside is machine translated
   * too and somebody deciding whether to sign up should know that first.
   */
  readonly appLanguage: string;
}

/** Said in English beside the translated notice, for a reader of neither. */
export const MACHINE_TRANSLATED_EN = "A machine translated this page, and no native speaker has checked it yet.";

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
    appLanguage:
      "Внутри приложение тоже на русском: этот язык будет выбран сразу, а сменить его можно в настройках.",
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
    appLanguage:
      "Усередині застосунок теж українською: цю мову буде вибрано одразу, а змінити її можна в налаштуваннях.",
  },
};

export const ENTRY_LOCALES = Object.keys(ENTRY_COPY) as EntryLocale[];
