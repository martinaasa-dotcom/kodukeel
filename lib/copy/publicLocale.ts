import type { Locale } from "./locale";

/**
 * THE PUBLIC PAGES IN THE READER'S LANGUAGE, CHOSEN WITHOUT A SETTING.
 *
 * The landing page, the policy pages and the rest of what a stranger can open
 * have nobody signed in to read a preference from, so the language travels in
 * the address: `?lang=ru` on /privacy, /terms, /trust, /accessibility,
 * /funding, /state-exam and /offline, and its own path on the landing page
 * (`/welcome/ru`, `/welcome/uk`), which is the address the entry pages always
 * had. Where nothing is asked for and somebody is signed in, their own
 * interface language decides (`lib/progress/publicLocale.ts`); otherwise it is
 * English, which is what every one of these pages was written in.
 *
 * Pure: the resolution that needs a session lives in lib/progress.
 */

/** A `?lang=` value read as a locale, or null where nothing usable was asked for. */
export function langParam(raw: unknown): Locale | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "en" || value === "ru" || value === "uk" ? value : null;
}

/**
 * A link to another public page in the same language.
 *
 * English carries `?lang=en` only where the reader asked for it, which is the
 * one case it changes anything: a learner who reads the app in Russian and
 * chose the English notice should stay on the English one as they follow its
 * links, and everybody else gets the plain address they always had.
 */
export function localeHref(path: string, locale: Locale, explicit = false): string {
  if (locale === "en" && !explicit) return path;
  if (path.startsWith("/welcome") && !path.includes("?") && !path.includes("#")) return LANDING_HREF[locale];
  const hashAt = path.indexOf("#");
  const base = hashAt === -1 ? path : path.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  return `${base}${base.includes("?") ? "&" : "?"}lang=${locale}${hash}`;
}

/** Where the landing page lives in each language. */
export const LANDING_HREF: Readonly<Record<Locale, string>> = {
  en: "/welcome",
  ru: "/welcome/ru",
  uk: "/welcome/uk",
};

/**
 * WHAT A TRANSLATED LEGAL TEXT HAS TO SAY ABOUT ITSELF, ABOVE EVERYTHING ELSE.
 *
 * A privacy notice and a set of terms are the two pages where a translation
 * that reads well and is wrong costs somebody something. So the Russian and
 * Ukrainian versions open on a line saying what they are: a convenience, made
 * with AI, read by neither a native speaker nor a lawyer, with the English
 * deciding wherever the two differ. Said in the page's own language and in
 * English beside it, for a reader of neither. This stays even once a fluent
 * reader has checked the language, because "the English prevails" is true
 * whoever has read it.
 */
export const LEGAL_NOTICE: Readonly<Record<Exclude<Locale, "en">, string>> = {
  ru: "Этот перевод сделан для удобства с помощью ИИ. Его не проверяли ни носитель языка, ни юрист. Если перевод расходится с английским текстом, действует английский текст.",
  uk: "Цей переклад зроблено для зручності за допомогою ШІ. Його не перевіряли ні носій мови, ні юрист. Якщо переклад розходиться з англійським текстом, чинним є англійський текст.",
};

export const LEGAL_NOTICE_EN =
  "This translation is a convenience, made with AI and reviewed by neither a native speaker nor a lawyer. Where it differs from the English text, the English text prevails.";
