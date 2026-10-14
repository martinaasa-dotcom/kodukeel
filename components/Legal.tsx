import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LanguageSwitcher, TranslationNotice } from "@/components/PublicLanguage";
import { LOCALES, tr, type Locale } from "@/lib/copy/locale";
import { LANDING_HREF, localeHref } from "@/lib/copy/publicLocale";
import { resolveOperator } from "@/lib/legal/operator";
import { BrandLink } from "@/components/BrandLink";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/Button";

/**
 * "2 September 2026" in the page's language. The months are a table in the
 * legal area (`September@date`), so the date reads as a person writes it in
 * Russian or Ukrainian, in the genitive, and the English stays exactly as typed.
 */
export function updatedIn(updated: string, locale: Locale): string {
  if (locale === "en") return updated;
  const m = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/.exec(updated);
  return m ? `${m[1]} ${tr(locale, m[2]!, "date")} ${m[3]}` : updated;
}

/** The three addresses this page lives at, one per language, for the switcher. */
export function switcherHrefs(path: string): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, localeHref(path, l, true)])) as Record<Locale, string>;
}

/**
 * Shared shell for the policy pages, which are reachable without a session.
 *
 * Drawn in English, Russian or Ukrainian (lib/copy/publicLocale.ts): the page
 * hands in the language it resolved, whether the address asked for it, and its
 * own path, so the switcher and every link at the foot stay in the language the
 * reader chose. `legal` is the two pages whose translation has to say that the
 * English prevails.
 */
export function Legal({ title, updated, children, locale = "en", explicit = false, path, legal = false }: {
  title: string;
  updated: string;
  children: ReactNode;
  locale?: Locale;
  explicit?: boolean;
  /** This page's own address, for the language switcher. */
  path: string;
  legal?: boolean;
}) {
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  /*
    A `main`, because /privacy and /terms are outside both route groups and so
    inherit neither the signed-in shell's landmark nor the landing page's.
    They were the two pages in the app with no landmark on them at all, which
    is the wrong pair to lose: they are the public ones, and the only ones
    somebody might be reading because they have a question about their rights.
  */
  return (
    <main lang={locale} className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PublicHeader locale={locale} path={path} />
      <h1
        className="mt-8 text-3xl font-bold leading-tight tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
        {t("Last updated")} {updatedIn(updated, locale)}
      </p>
      <TranslationNotice locale={locale} legal={legal} className="mt-5" />
      <div className="mt-8 space-y-8">{children}</div>
      <PublicFooter locale={locale} explicit={explicit} href={href} />
    </main>
  );
}

/**
 * THE TOP OF A PUBLIC PAGE: THE PRODUCT, THE LANGUAGE, AND ONE WAY IN.
 *
 * These are the pages a funder, a school and a ministry reader open, and their
 * header was the word "Kodukeel" in small grey capitals: no mark, no sign of
 * the product, nothing to press. It is the landing page's own lockup now,
 * linking home, the language switcher beside it, and one quiet button to start.
 * Quiet on purpose: the page is a document and the reader's one job on it is
 * reading, so the loud action stays the landing page's.
 */
export function PublicHeader({ locale, path }: { locale: Locale; path: string }) {
  const t = (english: string) => tr(locale, english);
  return (
    /*
      On a phone the mark and the button share the first row and the switcher
      takes the second, so the header is two rows rather than three; the button
      says "Start" there, as the landing page's own does under 420.
    */
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <BrandLink href={LANDING_HREF[locale]} label={t("Kodukeel, home")} className="flex min-h-11 items-center">
        <Wordmark size={28} />
      </BrandLink>
      <LanguageSwitcher locale={locale} hrefs={switcherHrefs(path)} className="order-3 w-full sm:order-2 sm:ml-auto sm:w-auto" />
      <ButtonLink
        href={locale === "en" ? "/sign-in" : `/sign-in?lang=${locale}`}
        variant="secondary"
        size="sm"
        className="order-2 sm:order-3"
      >
        <span className="max-sm:hidden">{t("Start free")}</span>
        {/* The short word for the eye, and the whole one for whoever reads the
            link out of context: "Start" alone is the link text a crawler and a
            screen reader's list of links both call meaningless. */}
        <span className="sm:hidden" aria-hidden>{tr(locale, "Start", "begin")}</span>
        <span className="sr-only sm:hidden">{t("Start free")}</span>
      </ButtonLink>
    </header>
  );
}

/** The links at the foot of every public page, in the page's language. */
export function PublicFooter({ locale, href, short = false }: {
  locale: Locale;
  explicit?: boolean;
  href: (to: string) => string;
  /** The state examination's page carries four of them rather than seven. */
  short?: boolean;
}) {
  const t = (english: string) => tr(locale, english);
  const contact = resolveOperator().email;
  const links: readonly (readonly [string, string])[] = short
    ? [["/privacy", "Privacy"], ["/terms", "Terms"], ["/accessibility", "Accessibility"]]
    : [
        ["/privacy", "Privacy"], ["/terms", "Terms"], ["/funding", "Funding"], ["/trust", "Trust"],
        ["/accessibility", "Accessibility"], ["/state-exam", "The state examination"], ["/help", "Help"],
      ];
  return (
    <p className="mt-14 text-sm" style={{ color: "var(--ink-3)" }}>
      {links.map(([to, label]) => (
        <span key={to}>
          <Link href={href(to)} className="underline underline-offset-2">{t(label)}</Link>
          {", "}
        </span>
      ))}
      <Link href={locale === "en" ? "/sign-in" : `/sign-in?lang=${locale}`} className="underline underline-offset-2">
        {t("Sign in")}
      </Link>
      {/*
        A way to write to whoever runs this copy, where they have said who they
        are. Where nobody is named there is nothing to print, rather than an
        address that reaches nobody: the rule /trust follows for the same field.
      */}
      {contact && (
        <>
          {", "}
          <a href={`mailto:${contact}`} className="underline underline-offset-2">{t("Contact")}</a>
        </>
      )}
    </p>
  );
}

export function S({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </h2>
      <div className="mt-2.5 space-y-3">{children}</div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
      {children}
    </p>
  );
}
