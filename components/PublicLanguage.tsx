import { Languages } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { PUBLIC_LOCALE_NAMES, PUBLIC_LOCALES, publicLanguagesBeside, REVIEWED, tr, type PublicLocale } from "@/lib/copy/locale";
import { MACHINE_TRANSLATED_EN, ENTRY_COPY } from "@/lib/copy/entryLocales";
import { LEGAL_NOTICE, LEGAL_NOTICE_EN } from "@/lib/copy/publicLocale";

/**
 * The languages a public page can be read in, as real links: every one the
 * page is drawn in on the English page, and English beside its own on any
 * other (`publicLanguagesBeside`).
 *
 * Each is the language's own name, marked with its own `lang`, so a screen
 * reader says «Русский» in Russian whatever the page around it is in, and the
 * one being read is marked as the current page rather than drawn as a link
 * back to itself. `hrefs` is worked out by the page, because only the page
 * knows its own address (`localeHref` in lib/copy/publicLocale.ts). The name
 * is the link's whole text and it has no `aria-label`, so what a reader sees
 * and what a screen reader says are one name (WCAG 2.5.3).
 */
export function LanguageSwitcher({ locale, hrefs, drawnIn = PUBLIC_LOCALES, className = "" }: {
  locale: PublicLocale;
  hrefs: Readonly<Partial<Record<PublicLocale, string>>>;
  /** The languages this page is drawn in. */
  drawnIn?: readonly PublicLocale[];
  className?: string;
}) {
  return (
    <nav aria-label={tr(locale, "Language")} className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      <Languages size={15} aria-hidden style={{ color: "var(--ink-3)" }} />
      {publicLanguagesBeside(locale, drawnIn).map((l) => (
        <Link
          key={l}
          href={hrefs[l] ?? "#"}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? "page" : undefined}
          className="tap-tint whitespace-nowrap rounded-full px-2.5 py-1"
          style={{
            color: l === locale ? "var(--ink)" : "var(--ink-2)",
            fontWeight: l === locale ? 700 : 500,
          }}
        >
          {PUBLIC_LOCALE_NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}

/**
 * What a translated public page says about itself, at the top.
 *
 * A policy page says the legal line (`LEGAL_NOTICE`): a convenience, made with
 * AI, checked by no lawyer, the English prevailing. Any
 * other public page says the entry pages' line, for as long as nobody fluent
 * has read the language. Both in the page's language and in English beside
 * it, for a reader of neither. Nothing at all in English, which is the
 * original.
 */
export function TranslationNotice({ locale, legal = false, className = "" }: {
  locale: PublicLocale;
  legal?: boolean;
  className?: string;
}) {
  if (locale === "en") return null;
  // Estonian has no `REVIEWED` row, because it is no interface language: its
  // own flag is `reviewed` on its entry copy, false until the native speaker
  // has read the public pages.
  if (!legal && (locale === "et" ? ENTRY_COPY.et.reviewed : REVIEWED[locale])) return null;
  return (
    <p
      role="note"
      className={`flex items-start gap-2 rounded-[var(--r)] px-4 py-3 text-sm ${className}`}
      style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
    >
      <Languages size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>
        {legal ? LEGAL_NOTICE[locale] : ENTRY_COPY[locale].notice}{" "}
        <span lang="en">{legal ? LEGAL_NOTICE_EN : MACHINE_TRANSLATED_EN}</span>
      </span>
    </p>
  );
}
