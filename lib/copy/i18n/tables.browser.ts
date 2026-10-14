import {
  lineKey, type CaseForms, type Forms, type LocaleTable, type PackedTable, type TranslatedLocale,
} from "./table";

/**
 * THE TABLES AS A BROWSER HAS THEM: WHAT HAS BEEN HANDED OVER, AND NOTHING ELSE.
 *
 * `#i18n-tables` resolves here under the `browser` condition (package.json,
 * "imports"), so no client bundle carries an area. A page hands over what it
 * needs: the landing page and sign-in a slice of their own lines as a prop,
 * the signed-in shell the learner's whole language as one chunk
 * (`lib/copy/i18n/load.ts`), and English nothing at all, since the English is
 * the key.
 *
 * Lines are held under `lineKey` of their English, which is how the chunk
 * arrives (`PackedTable`); a slice handed over as a prop is keyed on the
 * English and packed here as it is registered.
 *
 * MERGED, NEVER REPLACED. Two pages can hand over two different slices of one
 * language, and every slice is cut from the same areas, so a key means the same
 * line in each and the union is consistent. Replacing would let a small slice
 * registered later take lines away from a screen already drawn with them.
 *
 * Keyed by language rather than held as "the current table", which is the
 * trap the plan names: requests in different languages share a process, and a
 * single slot written by whoever rendered last is a page drawn in somebody
 * else's language. In a browser there is one learner, and the server never
 * reads this file.
 */
interface Held {
  lines: Record<string, string>;
  counted: Record<string, Forms>;
  cases: Record<string, CaseForms>;
}

const blank = (): Held => ({ lines: {}, counted: {}, cases: {} });
const HELD: Record<TranslatedLocale, Held> = { ru: blank(), uk: blank() };

/** The languages whose whole table is here, not a slice of it. */
const COMPLETE = new Set<TranslatedLocale>();

/** False here; the server's tables module says true. */
export const HAS_EVERY_TABLE = false;

export function registerTable(locale: TranslatedLocale, table: LocaleTable | PackedTable, complete = false): void {
  const into = HELD[locale];
  if ("packed" in table) Object.assign(into.lines, table.lines);
  else for (const [english, line] of Object.entries(table.lines)) into.lines[lineKey(english)] = line;
  Object.assign(into.counted, table.counted);
  Object.assign(into.cases, table.cases);
  if (complete) COMPLETE.add(locale);
}

export function isComplete(locale: TranslatedLocale): boolean {
  return COMPLETE.has(locale);
}

/** The line stored under this English, already keyed (`keyOf`). */
export function lineFor(locale: TranslatedLocale, key: string): string | undefined {
  return HELD[locale].lines[lineKey(key)];
}

export function formsFor(locale: TranslatedLocale, noun: string): Forms | undefined {
  return HELD[locale].counted[noun];
}

export function caseFormsFor(locale: TranslatedLocale, noun: string): CaseForms | undefined {
  return HELD[locale].cases[noun];
}
