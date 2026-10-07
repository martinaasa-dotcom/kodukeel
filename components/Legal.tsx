import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LanguageSwitcher, TranslationNotice } from "@/components/PublicLanguage";
import { LOCALES, tr, type Locale } from "@/lib/copy/locale";
import { LANDING_HREF, localeHref } from "@/lib/copy/publicLocale";

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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href={locale === "en" ? "/" : LANDING_HREF[locale]}
          className="label-xs inline-block"
          style={{ color: "var(--ink-3)" }}
        >
          Kodukeel
        </Link>
        <LanguageSwitcher locale={locale} hrefs={switcherHrefs(path)} />
      </div>
      <h1
        className="mt-3 text-3xl font-bold leading-tight tracking-tight"
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

/** The links at the foot of every public page, in the page's language. */
export function PublicFooter({ locale, href, short = false }: {
  locale: Locale;
  explicit?: boolean;
  href: (to: string) => string;
  /** The state examination's page carries four of them rather than seven. */
  short?: boolean;
}) {
  const t = (english: string) => tr(locale, english);
  const links: readonly (readonly [string, string])[] = short
    ? [["/privacy", "Privacy"], ["/terms", "Terms"], ["/accessibility", "Accessibility"]]
    : [
        ["/privacy", "Privacy"], ["/terms", "Terms"], ["/funding", "Funding"], ["/trust", "Trust"],
        ["/accessibility", "Accessibility"], ["/state-exam", "The state examination"],
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
