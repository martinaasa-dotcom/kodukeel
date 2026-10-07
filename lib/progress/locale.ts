import { cache } from "react";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import type { Metadata } from "next";
import { localeFrom, tr, type Locale } from "@/lib/copy/locale";
import { requireUserId } from "@/lib/auth/session";

/**
 * Which language this learner reads the app in, read once per request.
 *
 * Memoised for the render, since the shell, the page and a briefing inside it
 * all ask, and a fact about one learner wanted three times in one render is
 * the rule `lib/settings/store.ts` already follows. See lib/copy/locale.ts.
 */
export const localeFor = cache(async (ownerId: string): Promise<Locale> =>
  localeFrom(await readSetting(ownerId, SETTING_KEYS.uiLocale)),
);

/**
 * A signed-in page's tab title in the learner's own language.
 *
 * The browser tab, the history and a screen reader's announcement of the
 * document all read this, so a page translated down to its last button still
 * introduced itself in English. Every page inside the shell names itself
 * through this rather than a static `metadata`, which cannot know who is
 * asking. The app's name is added by the template in app/layout.tsx. Pages
 * outside the shell keep their English titles: there is nobody signed in to
 * ask.
 */
export async function titleFor(english: string, extra?: Omit<Metadata, "title">): Promise<Metadata> {
  return { ...extra, title: tr(await localeFor(await requireUserId()), english) };
}
