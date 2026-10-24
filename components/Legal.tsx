import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LanguageSwitcher, TranslationNotice } from "@/components/PublicLanguage";
import { PUBLIC_LOCALES, tr, type PublicLocale } from "@/lib/copy/locale";
import { LANDING_HREF, localeHref, signInHref } from "@/lib/copy/publicLocale";
import { resolveOperator } from "@/lib/legal/operator";
import { impactIsListed } from "@/lib/progress/impactListed";
import { BrandLink } from "@/components/BrandLink";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/Button";

/**
 * "2 September 2026" in the page's language. The months are a table in the
 * legal area (`September@date`), so the date reads as a person writes it in
 * Russian or Ukrainian, in the genitive, and the English stays exactly as typed.
 * Estonian writes the day with a stop and the month in the adessive after
 * "Uuendatud", "2. septembril 2026".
 */
export function updatedIn(updated: string, locale: PublicLocale): string {
  if (locale === "en") return updated;
  const m = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/.exec(updated);
  if (!m) return updated;
  const month = tr(locale, m[2]!, "date");
  return locale === "et" ? `${m[1]}. ${month} ${m[3]}` : `${m[1]} ${month} ${m[3]}`;
}

/** The addresses this page lives at, one per language it is drawn in, for the switcher. */
export function switcherHrefs(path: string, drawnIn: readonly PublicLocale[] = PUBLIC_LOCALES): Partial<Record<PublicLocale, string>> {
  return Object.fromEntries(drawnIn.map((l) => [l, localeHref(path, l, true)])) as Partial<Record<PublicLocale, string>>;
}

/**
 * The two shapes of a public page's languages: every one, and English with
 * Estonian, for a page whose English is not yet in Russian and Ukrainian
 * (/curriculum, /how-we-know, /pilots). A page offers only the languages it
 * is drawn in.
 */
export const ENGLISH_AND_ESTONIAN: readonly PublicLocale[] = ["en", "et"];

/**
 * Shared shell for the policy pages, which are reachable without a session.
 *
 * Drawn in English, Russian, Ukrainian or Estonian (lib/copy/publicLocale.ts):
 * the page hands in the language it resolved, whether the address asked for
 * it, and its own path, so the switcher and every link at the foot stay in the
 * language the reader chose. `legal` is the two pages whose translation has to
 * say that the English prevails.
 */
export function Legal({ title, updated, children, locale = "en", explicit = false, path, legal = false, drawnIn = PUBLIC_LOCALES }: {
  title: string;
  updated: string;
  children: ReactNode;
  locale?: PublicLocale;
  explicit?: boolean;
  /** This page's own address, for the language switcher. */
  path: string;
  legal?: boolean;
  /** The languages this page is drawn in, which are all it offers. */
  drawnIn?: readonly PublicLocale[];
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
      <PublicHeader locale={locale} path={path} drawnIn={drawnIn} />
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
 * header was the word "Kodukeel" in small gray capitals: no mark, no sign of
 * the product, nothing to press. It is the landing page's own lockup now,
 * linking home, the language switcher beside it, and one quiet button to start.
 * Quiet on purpose: the page is a document and the reader's one job on it is
 * reading, so the loud action stays the landing page's.
 */
export function PublicHeader({ locale, path, drawnIn }: {
  locale: PublicLocale;
  path: string;
  /**
   * The languages the page is drawn in, said by every caller: the grammar
   * reference is drawn in the three interface languages and never Estonian,
   * and a page built on `Legal` in whichever of the four it has.
   */
  drawnIn: readonly PublicLocale[];
}) {
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
      <LanguageSwitcher
        locale={locale}
        hrefs={switcherHrefs(path, drawnIn)}
        drawnIn={drawnIn}
        className="order-3 w-full sm:order-2 sm:ml-auto sm:w-auto"
      />
      <ButtonLink
        href={signInHref(locale)}
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

/**
 * The links at the foot of every public page, in the page's language.
 *
 * /impact joins them only once its headline clears the research floors
 * (`impactIsListed`, docs/38-third-batch.md D3): before that it is a page of
 * "not enough data yet", and a footer link to it would send every reader there.
 */
export async function PublicFooter({ locale, href, short = false }: {
  locale: PublicLocale;
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
        ["/privacy", "Privacy"], ["/terms", "Terms"], ["/funding", "Funding"], ["/trust", "Trust"], ["/teachers", "For teachers"], ["/pilots", "Running a pilot"],
        ["/accessibility", "Accessibility"], ["/state-exam", "The state examination"], ["/help", "Help"],
        ...(await impactIsListed() ? [["/impact", "What this installation has done"] as const] : []),
      ];
  return (
    <p className="mt-14 text-sm" style={{ color: "var(--ink-3)" }}>
      {links.map(([to, label]) => (
        <span key={to}>
          <Link href={href(to)} className="underline underline-offset-2">{t(label)}</Link>
          {", "}
        </span>
      ))}
      <Link href={signInHref(locale)} className="underline underline-offset-2">
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
