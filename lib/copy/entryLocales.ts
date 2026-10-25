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
 * MACHINE-TRANSLATED, THEN READ. These were translated by a model, and every
 * page built from this table prints `notice` in its own language and in
 * English, at the top, for as long as `reviewed` is false, and an invariant
 * holds it there. A fluent reader read and corrected all three on 2026-10-25
 * (Martin Aasa), so `reviewed` is true for each and the notice is gone; a new
 * locale starts false and is set with the reader's name in the commit.
 *
 * No Estonian is written here beyond the app's own name, which is the rule
 * every other copy table keeps (ADR-005), except in the `et` row: Estonian
 * prose about the app for the public pages (ADR-005 amendment 7), drafted by
 * a model and read by the native speaker who develops this app.
 * The app itself is never in Estonian, so that row's `appLanguage` says which
 * languages it is in rather than promising this one.
 */

export type EntryLocale = "ru" | "uk" | "et";

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
    reviewed: true,
    notice: "Эта страница переведена с помощью ИИ, и носитель языка её ещё не проверял.",
    title: "Kodukeel: эстонский, который наконец остаётся в голове",
    description:
      "Бесплатное приложение для изучения эстонского: падежи, проверенные по словарю, повторение в нужный момент и разговоры, к которым можно подготовиться.",
    appLanguage:
      "Внутри приложение тоже на русском: этот язык будет выбран сразу, а сменить его можно в настройках.",
  },
  uk: {
    lang: "uk",
    name: "Українська",
    href: "/welcome/uk",
    reviewed: true,
    notice: "Цю сторінку перекладено за допомогою ШІ, і носій мови її ще не перевіряв.",
    title: "Kodukeel: естонська, яка нарешті лишається в голові",
    description:
      "Безкоштовний застосунок для вивчення естонської: відмінки, перевірені за словником, повторення в потрібний момент і розмови, до яких можна підготуватися.",
    appLanguage:
      "Усередині застосунок теж українською: цю мову буде вибрано одразу, а змінити її можна в налаштуваннях.",
  },
  et: {
    lang: "et",
    name: "Eesti",
    href: "/welcome/et",
    reviewed: true,
    notice: "Selle lehe eestikeelne tekst on koostatud tehisintellekti abil ja ootab veel emakeelse kõneleja ülevaatust.",
    title: "Kodukeel: eesti keel, mis lõpuks meelde jääb",
    description:
      "Tasuta rakendus eesti keele õppimiseks: sõnaraamatu järgi kontrollitud käändevormid, kordamine õigel ajal ja vestlused, mida saab enne päris elu läbi harjutada.",
    appLanguage:
      "Rakendus ise on inglise, vene ja ukraina keeles, sest eesti keelt seal õpitakse. Eesti keeles on ainult need avalikud lehed.",
  },
};

export const ENTRY_LOCALES = Object.keys(ENTRY_COPY) as EntryLocale[];
