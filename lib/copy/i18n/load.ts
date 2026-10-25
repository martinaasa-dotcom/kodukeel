import { HAS_EVERY_TABLE, isComplete, registerTable } from "#i18n-tables";
import type { PackedTable, TranslatedLocale } from "./table";

/**
 * ONE LANGUAGE'S WHOLE TABLE, LOADED ONCE, AS A FILE OF ITS OWN.
 *
 * A learner who reads the app in Russian needs the Russian table on every
 * screen, and a visitor reading English needs none of it. So the table is not
 * in any page's bundle: it is `generated/<locale>.json`, imported here behind
 * a dynamic import, which the bundler turns into a chunk of its own that the
 * browser caches like every other build file and the service worker keeps for
 * the offline review path (`public/sw.js`).
 *
 * NOT A PROP. A prop on the signed-in layout would travel again with every
 * refresh, and every Server Action here revalidates a path, so grading one
 * card would download the whole table again. A chunk is fetched once.
 *
 * On the server and in a test `#i18n-tables` is the full merge and this does
 * nothing: every table is already there.
 */
const pending = new Map<TranslatedLocale, Promise<void>>();

/** Whether every line of this language is here, so nothing on screen falls back. */
export function tableReady(locale: TranslatedLocale): boolean {
  return HAS_EVERY_TABLE || isComplete(locale);
}

function fetchTable(locale: TranslatedLocale): Promise<{ default: PackedTable }> {
  // Literal specifiers rather than a template, so the bundler makes one chunk
  // a language and none carries another.
  // Estonian only ever reaches here from a public page (`PUBLIC_LOCALES`).
  if (locale === "et") return import("./generated/et.json") as unknown as Promise<{ default: PackedTable }>;
  return locale === "ru"
    ? (import("./generated/ru.json") as unknown as Promise<{ default: PackedTable }>)
    : (import("./generated/uk.json") as unknown as Promise<{ default: PackedTable }>);
}

/**
 * The same promise for as long as it is pending or kept, which is what React's
 * `use` asks of one.
 *
 * IT NEVER REJECTS. A load that fails, which is a first visit with the network
 * gone or a deploy that removed the chunk under an open tab, leaves the screen
 * in English rather than on the error page: English is every line's fallback
 * already, and a learner who can read the app in a second language is better
 * served by it than by a screen saying something broke. The failure is kept
 * for half a minute, so a render in that time does not ask again in a loop, and
 * then forgotten, so the next screen tries again.
 */
const RETRY_AFTER_MS = 30_000;

export function loadTable(locale: TranslatedLocale): Promise<void> {
  if (tableReady(locale)) return Promise.resolve();
  let promise = pending.get(locale);
  if (!promise) {
    promise = fetchTable(locale).then(
      (module) => registerTable(locale, module.default, true),
      () => {
        setTimeout(() => pending.delete(locale), RETRY_AFTER_MS);
      },
    );
    pending.set(locale, promise);
  }
  return promise;
}
