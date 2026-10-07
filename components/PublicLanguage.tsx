import { Languages } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LOCALES, LOCALE_NAMES, REVIEWED, tr, type Locale } from "@/lib/copy/locale";
import { MACHINE_TRANSLATED_EN, ENTRY_COPY } from "@/lib/copy/entryLocales";
import { LEGAL_NOTICE, LEGAL_NOTICE_EN } from "@/lib/copy/publicLocale";

/**
 * The three languages a public page can be read in, as real links.
 *
 * Each is the language's own name, marked with its own `lang`, so a screen
 * reader says «Русский» in Russian whatever the page around it is in, and the
 * one being read is marked as the current page rather than drawn as a link
 * back to itself. `hrefs` is worked out by the page, because only the page
 * knows its own address (`localeHref` in lib/copy/publicLocale.ts).
 */
export function LanguageSwitcher({ locale, hrefs, className = "" }: {
  locale: Locale;
  hrefs: Readonly<Record<Locale, string>>;
  className?: string;
}) {
  return (
    <nav aria-label={tr(locale, "Language")} className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      <Languages size={15} aria-hidden style={{ color: "var(--ink-3)" }} />
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={hrefs[l]}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? "page" : undefined}
          className="tap-tint whitespace-nowrap rounded-full px-2.5 py-1"
          style={{
            color: l === locale ? "var(--ink)" : "var(--ink-2)",
            fontWeight: l === locale ? 700 : 500,
          }}
        >
          {LOCALE_NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}

/**
 * What a translated public page says about itself, at the top.
 *
 * A policy page says the legal line (`LEGAL_NOTICE`): a convenience, made with
 * AI, checked by no native speaker and no lawyer, the English prevailing. Any
 * other public page says the entry pages' line, for as long as nobody fluent
 * has read the language. Both in the page's language and in English beside
 * it, for a reader of neither. Nothing at all in English, which is the
 * original.
 */
export function TranslationNotice({ locale, legal = false, className = "" }: {
  locale: Locale;
  legal?: boolean;
  className?: string;
}) {
  if (locale === "en") return null;
  if (!legal && REVIEWED[locale]) return null;
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
