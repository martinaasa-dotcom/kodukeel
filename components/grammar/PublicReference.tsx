import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { LocaleProvider } from "@/components/Locale";
import { PublicReader } from "@/components/PublicReader";
import { PublicFooter, PublicHeader } from "@/components/Legal";
import { tr, type Locale } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";

/**
 * THE FRAME ROUND THE GRAMMAR REFERENCE FOR A READER WITH NO ACCOUNT (FB-8).
 *
 * Signed in, a grammar page sits inside the app's shell, which needs a learner
 * to draw. Signed out, the layout hands the page over bare
 * (`app/(app)/layout.tsx`) and the page draws this round itself: the public
 * header every other public page carries, the reference, one line saying the
 * practice is in the app with the way in, and the public footer, which credits
 * Ekilex for every form on the page.
 *
 * The page is handed in rather than drawn here so each page keeps its one
 * `h1`, its own sections and its own provenance chips exactly as a learner
 * sees them.
 */
export async function PublicReference({ locale, explicit, path, children }: {
  locale: Locale;
  explicit: boolean;
  /** The page's own path, for the language switcher. */
  path: string;
  children: ReactNode;
}) {
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  return (
    <LocaleProvider locale={locale}>
      <div lang={locale} className="min-h-screen">
        <div className="mx-auto max-w-4xl px-5 pt-6 md:px-10 md:pt-8">
          <PublicHeader locale={locale} path={path} />
        </div>
        <main id="main" data-public-reference>
          <PublicReader>{children}</PublicReader>
        </main>
        <div className="mx-auto max-w-4xl px-5 pb-12 md:px-10">
          <p
            className="rounded-[var(--r-lg)] border p-5 text-md"
            style={{ borderColor: "var(--edge)", background: "var(--surface)", color: "var(--ink-2)" }}
          >
            {t("Practice these in the app, on words you are learning, with every answer marked.")}{" "}
            <Link
              href={href("/sign-in")}
              className="font-bold underline underline-offset-2"
              style={{ color: "var(--accent-deep)" }}
            >
              {t("Sign in, it’s free")}
            </Link>
          </p>
          <PublicFooter locale={locale} href={href} />
        </div>
      </div>
    </LocaleProvider>
  );
}

/** A link inside the reference, carrying the page's language where the address asked for one. */
export function referenceHref(locale: Locale, explicit: boolean) {
  return (to: string) => localeHref(to, locale, explicit);
}
