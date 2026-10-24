import type { Area } from "./area";
import { countedTable, lineFor } from "./tables";
import { keyOf, type LocaleTable, type TranslatedLocale } from "./table";

/** One language's lines out of the areas given, keyed the way a table is (`keyOf`). */
export function linesOf(locale: TranslatedLocale, areas: readonly Area[]): Record<string, string> {
  const lines: Record<string, string> = {};
  for (const area of areas) {
    for (const [english, line] of Object.entries(area[locale] ?? {})) lines[keyOf(english)] = line;
  }
  return lines;
}

/**
 * A slice of one language: the given areas' lines, the lines named in
 * `borrowed` from wherever they are translated, and every counted noun.
 *
 * For a page that is static and says little, which is the landing page: it
 * renders once per language at build, carries its own lines in the HTML it was
 * going to send anyway, and asks for no chunk. A page that can be refreshed by
 * a Server Action must not use this, because a prop on a layout travels again
 * with every refresh; the signed-in shell loads a chunk instead.
 *
 * The page passes the area itself rather than its name, so it loads that one
 * area's source and not the other forty. A borrowed line and the counted nouns
 * are read out of the generated table (`tables.ts`), which holds every area's.
 */
export function areaTable(
  locale: TranslatedLocale,
  areas: readonly Area[],
  borrowed: readonly string[] = [],
): LocaleTable {
  const lines = linesOf(locale, areas);
  for (const english of borrowed) {
    const key = keyOf(english);
    const line = lineFor(locale, key);
    if (line === undefined) throw new Error(`No translation of ${JSON.stringify(english)} to borrow`);
    lines[key] = line;
  }
  return { lines, ...countedTable(locale) };
}
