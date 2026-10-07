import { cookies } from "next/headers";
import type { Metadata } from "next";
import { tr, type Locale } from "@/lib/copy/locale";
import { langParam } from "@/lib/copy/publicLocale";
import { supabaseConfigured } from "@/lib/auth/mode";
import { hasSessionCookie } from "@/lib/auth/identity";
import { requireUserId } from "@/lib/auth/session";
import { localeFor } from "@/lib/progress/locale";

/** What a public page is handed by Next as its query. */
export type PublicSearch = Promise<Record<string, string | string[] | undefined>> | undefined;

export interface PublicLocale {
  readonly locale: Locale;
  /** Whether the address asked for it, which is what decides whether links carry it on. */
  readonly explicit: boolean;
}

/**
 * Which language a public page is drawn in: what the address asks for, or the
 * signed-in learner's own interface language, or English.
 *
 * The learner is asked about only where a session cookie exists, so a stranger
 * costs no client and no round trip, and any failure on the way (no session,
 * a database having a bad minute) is English, which is what the page always
 * said. See lib/copy/publicLocale.ts.
 */
export async function resolvePublicLocale(searchParams: PublicSearch): Promise<PublicLocale> {
  const asked = langParam((await searchParams)?.lang);
  if (asked) return { locale: asked, explicit: true };
  try {
    if (supabaseConfigured()) {
      const jar = await cookies();
      if (!hasSessionCookie(jar.getAll().map((c) => c.name))) return { locale: "en", explicit: false };
    }
    return { locale: await localeFor(await requireUserId()), explicit: false };
  } catch {
    return { locale: "en", explicit: false };
  }
}

/** A public page's tab title in the language it is drawn in. */
export async function publicTitle(
  searchParams: PublicSearch,
  english: string,
  extra?: Omit<Metadata, "title">,
): Promise<Metadata> {
  const { locale } = await resolvePublicLocale(searchParams);
  return { ...extra, title: tr(locale, english) };
}
