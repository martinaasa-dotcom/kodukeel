import type { Locale, PublicLocale } from "./locale";

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
 * A `?lang=` value read as one of the public pages' languages, Estonian
 * included, or null. Only a page drawn by `Legal` or the landing page asks
 * this (`resolvePublicPage` in lib/progress/publicLocale.ts); the grammar
 * reference and every signed-in screen ask `langParam`, which cannot answer
 * Estonian.
 */
export function publicLangParam(raw: unknown): PublicLocale | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "et" ? "et" : langParam(value);
}

/**
 * WHETHER A BROWSER ASKS FOR ESTONIAN BEFORE ANY OTHER LANGUAGE A PUBLIC PAGE
 * HAS.
 *
 * Read off `Accept-Language`, its weights honored, and only the four public
 * languages counted: "et, en" is Estonian, "en, et" and "ru, et" are not.
 * Only Estonian is read this way, because a Russian or Ukrainian browser is
 * not a reason to change what these pages have always done for a stranger.
 */
export function asksForEstonian(header: string | null | undefined): boolean {
  if (!header) return false;
  let best: { lang: string; q: number } | null = null;
  for (const part of header.split(",")) {
    const [tag, ...params] = part.trim().split(";");
    const lang = (tag ?? "").trim().toLowerCase().split("-")[0] ?? "";
    if (!["en", "ru", "uk", "et"].includes(lang)) continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (!Number.isFinite(q) || q <= 0) continue;
    if (!best || q > best.q) best = { lang, q };
  }
  return best?.lang === "et";
}

/**
 * A link to another public page in the same language.
 *
 * English carries `?lang=en` only where the reader asked for it, which is the
 * one case it changes anything: a learner who reads the app in Russian and
 * chose the English notice should stay on the English one as they follow its
 * links, and everybody else gets the plain address they always had.
 */
export function localeHref(path: string, locale: PublicLocale, explicit = false): string {
  if (locale === "en" && !explicit) return path;
  if (path.startsWith("/welcome") && !path.includes("?") && !path.includes("#")) return LANDING_HREF[locale];
  const hashAt = path.indexOf("#");
  const base = hashAt === -1 ? path : path.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  return `${base}${base.includes("?") ? "&" : "?"}lang=${locale}${hash}`;
}

/** Where the landing page lives in each language. */
export const LANDING_HREF: Readonly<Record<PublicLocale, string>> = {
  en: "/welcome",
  ru: "/welcome/ru",
  uk: "/welcome/uk",
  et: "/welcome/et",
};

/**
 * Where "Start" goes from a public page. Russian and Ukrainian carry the
 * language into sign-in, which opens the app in it; Estonian does not, since
 * the app itself is never in Estonian (D16), so it is the plain address.
 */
export function signInHref(locale: PublicLocale): string {
  return locale === "en" || locale === "et" ? "/sign-in" : `/sign-in?lang=${locale}`;
}

/**
 * WHAT A TRANSLATED LEGAL TEXT HAS TO SAY ABOUT ITSELF, ABOVE EVERYTHING ELSE.
 *
 * A privacy notice and a set of terms are the two pages where a translation
 * that reads well and is wrong costs somebody something. So the Russian and
 * Ukrainian versions open on a line saying what they are: a convenience, made
 * with AI, read by a fluent speaker and checked by no lawyer, with the
 * English deciding wherever the two differ. Said in the page's own language
 * and in English beside it, for a reader of neither. It stayed when a fluent
 * reader checked the language, because "the English prevails" is true
 * whoever has read it.
 */
export const LEGAL_NOTICE: Readonly<Record<Exclude<PublicLocale, "en">, string>> = {
  ru: "Этот перевод сделан для удобства с помощью ИИ. Его не проверял юрист. Если перевод расходится с английским текстом, действует английский текст.",
  uk: "Цей переклад зроблено для зручності за допомогою ШІ. Його не перевіряв юрист. Якщо переклад розходиться з англійським текстом, чинним є англійський текст.",
  // Read by the native speaker with the rest of the public pages (D16); the
  // English prevails whoever has read it.
  et: "See tõlge on mõeldud lugemise hõlbustamiseks ja koostatud tehisintellekti abil. Jurist ei ole seda üle vaadanud. Kui tõlge erineb ingliskeelsest tekstist, kehtib ingliskeelne tekst.",
};

export const LEGAL_NOTICE_EN =
  "This translation is a convenience, made with AI and not checked by a lawyer. Where it differs from the English text, the English text prevails.";
