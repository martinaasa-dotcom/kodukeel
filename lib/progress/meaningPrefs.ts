import { meaningPrefsFrom, type MeaningPrefs } from "@/lib/collections/glossLanguage";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";

/**
 * Which language this learner's meanings lead in, and what is shown after it.
 *
 * One read of the two rows rather than a `glossLanguageFrom` at every screen,
 * since the second only means something beside the first. It costs nothing:
 * `readSettings` is served from the one settings read the request already made.
 */
export async function meaningPrefsFor(ownerId: string): Promise<MeaningPrefs> {
  const settings = await readSettings(ownerId, [SETTING_KEYS.glossLanguage, SETTING_KEYS.glossAlso]);
  return meaningPrefsFrom(settings[SETTING_KEYS.glossLanguage], settings[SETTING_KEYS.glossAlso]);
}
