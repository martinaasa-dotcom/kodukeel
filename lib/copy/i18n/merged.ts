import { AREAS } from "./index";
import { COUNTED, COUNT_CASES } from "./counted";
import { linesOf } from "./slice";
import { COUNTED_ET } from "./areas/et/counted";
import type { CaseForms, Forms, LocaleTable, TranslatedLocale } from "./table";

/**
 * EVERY LANGUAGE'S WHOLE TABLE, MERGED FROM THE AREAS: FOR THE GENERATOR, THE
 * TESTS AND THE SCRIPTS, AND NEVER FOR A REQUEST.
 *
 * This is where `generated/<locale>.json` comes from (`npm run i18n:tables`),
 * and `generated.test.ts` holds the file to it. It used to be what the server
 * read as well, on the argument that size costs nothing there, and on a cold
 * start size is most of what it costs: every area of both languages is 3.7 MB
 * of source, and a route's server render and its client render each loaded
 * their own copy, so a cold `/privacy` compiled 7.4 MB of Russian and
 * Ukrainian before it could answer an English reader. The server reads the
 * generated file now, the reader's language only and only once one is asked
 * for (`tables.ts`).
 *
 * Two areas translating one line differently is a test failure, not a merge
 * (`locale.test.ts`).
 */

function build(locale: "ru" | "uk"): LocaleTable {
  const counted: Record<string, Forms> = {};
  for (const [noun, forms] of Object.entries(COUNTED)) counted[noun] = forms[locale];
  const cases: Record<string, CaseForms> = {};
  for (const [noun, forms] of Object.entries(COUNT_CASES)) cases[noun] = forms[locale];
  return { lines: linesOf(locale, AREAS.map(([, area]) => area)), counted, cases };
}

/**
 * Estonian, for the public pages alone (D16 in docs/44-sixth-batch.md): the
 * areas that carry an `et` record, and Estonian's two counted forms, the
 * nominative after one and the partitive singular after any other count,
 * stored in the one, few and many slots as [one, other, other]. No case
 * forms, since an Estonian count keeps its partitive whatever governs it.
 */
function buildEstonian(): LocaleTable {
  const counted: Record<string, Forms> = {};
  for (const [noun, [one, other]] of Object.entries(COUNTED_ET)) counted[noun] = [one, other, other];
  return { lines: linesOf("et", AREAS.map(([, area]) => area)), counted, cases: {} };
}

export const TABLES: Readonly<Record<TranslatedLocale, LocaleTable>> = {
  ru: build("ru"),
  uk: build("uk"),
  et: buildEstonian(),
};
