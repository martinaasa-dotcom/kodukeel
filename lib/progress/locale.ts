import { cache } from "react";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { localeFrom, type Locale } from "@/lib/copy/locale";

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
