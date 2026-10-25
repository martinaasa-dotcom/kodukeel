import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { PUBLIC_LOCALES, tr, type Locale, type PublicLocale as PublicLanguage } from "@/lib/copy/locale";
import { asksForEstonian, langParam, publicLangParam } from "@/lib/copy/publicLocale";
import { supabaseConfigured } from "@/lib/auth/mode";
import { hasSessionCookie } from "@/lib/auth/identity";
import { requireUserId } from "@/lib/auth/session";
import { localeFor } from "@/lib/progress/locale";
import type { PublicPageCard } from "@/lib/copy/publicCards";

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

/** A public page's language, out of the four `PUBLIC_LOCALES` can name. */
export interface PublicPageLocale {
  readonly locale: PublicLanguage;
  readonly explicit: boolean;
}

/**
 * Which language a page built on `Legal` is drawn in, Estonian included
 * (D16 in docs/44-sixth-batch.md): what the address asks for, then a signed-in
 * learner's own interface language, then a browser that asks for Estonian
 * before English, Russian or Ukrainian, then English.
 *
 * A signed-in learner keeps their own language, which is never Estonian,
 * because what they chose in Settings is a stronger statement than what
 * their browser was set to. `drawnIn` is the languages the page itself has
 * (a page written in English and Estonian alone passes those two), and a
 * language outside it is never answered: it falls to the next in the chain.
 */
export async function resolvePublicPage(
  searchParams: PublicSearch,
  drawnIn: readonly PublicLanguage[] = PUBLIC_LOCALES,
): Promise<PublicPageLocale> {
  const asked = publicLangParam((await searchParams)?.lang);
  if (asked && drawnIn.includes(asked)) return { locale: asked, explicit: true };
  const learner = await resolvePublicLocale(undefined);
  if (learner.locale !== "en" && drawnIn.includes(learner.locale)) return learner;
  try {
    if (drawnIn.includes("et") && !(await signedIn()) && asksForEstonian((await headers()).get("accept-language"))) {
      return { locale: "et", explicit: false };
    }
  } catch {
    // Outside a request, which is a test or a build: English.
  }
  return { locale: "en", explicit: false };
}

/** Whether a session cookie is present, which is all the browser rule needs to know. */
async function signedIn(): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const jar = await cookies();
  return hasSessionCookie(jar.getAll().map((c) => c.name));
}

/** `publicTitle` for a page built on `Legal`, in whichever of its languages it is drawn. */
export async function publicPageTitle(
  searchParams: PublicSearch,
  english: string,
  extra?: Omit<Metadata, "title">,
  card?: PublicPageCard,
  drawnIn: readonly PublicLanguage[] = PUBLIC_LOCALES,
): Promise<Metadata> {
  const { locale } = await resolvePublicPage(searchParams, drawnIn);
  const title = tr(locale, english);
  if (!card) return { ...extra, title };
  return { ...extra, title, ...shareCard(locale, title, tr(locale, card.description), card.path) };
}

export type { PublicPageCard } from "@/lib/copy/publicCards";

/**
 * The picture every share card carries: `app/opengraph-image.tsx`, the app's
 * own card. Named here because a page that sets `openGraph` replaces the
 * root's whole object, and the file-based image goes with it, so a page with
 * a description of its own shared as a gray row with no picture. Its size and
 * alt are the route's, which a test holds them to.
 */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "kodukeel. Estonian that finally sticks",
} as const;

/** A page's own description, Open Graph and Twitter card, in the language it is drawn in. */
export function shareCard(locale: PublicLanguage, title: string, description: string, path: string): Metadata {
  const titled = `${title} | kodukeel`;
  return {
    description,
    openGraph: {
      title: titled,
      description,
      url: path,
      type: "website",
      siteName: "kodukeel",
      // The card is in the language the page is drawn in, read in Estonia.
      locale: `${locale}_EE`,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: titled, description, images: [SHARE_IMAGE] },
  };
}

/**
 * A public page's tab title in the language it is drawn in, and, where the
 * page says what it is, its own description and share card. Without one, a
 * page inherits the root layout's description, which is the pitch to a
 * learner: a teacher pasting /teachers into a staffroom chat would get a card
 * about the shop counter, pointing at /welcome.
 */
export async function publicTitle(
  searchParams: PublicSearch,
  english: string,
  extra?: Omit<Metadata, "title">,
  card?: PublicPageCard,
): Promise<Metadata> {
  const { locale } = await resolvePublicLocale(searchParams);
  const title = tr(locale, english);
  if (!card) return { ...extra, title };
  return { ...extra, title, ...shareCard(locale, title, tr(locale, card.description), card.path) };
}
