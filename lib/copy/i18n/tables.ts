import { AREAS } from "./index";
import type { Area } from "./area";
import { COUNTED, COUNT_CASES } from "./counted";
import {
  keyOf, type CaseForms, type Forms, type LocaleTable, type PackedTable, type TranslatedLocale,
} from "./table";

/**
 * EVERY LANGUAGE'S WHOLE TABLE, WHERE SIZE COSTS NOTHING: THE SERVER, THE
 * TESTS AND THE SCRIPTS.
 *
 * `#i18n-tables` resolves here under every condition but `browser` (see
 * package.json, "imports"), so a server component, a route handler, a Server
 * Action, a client component rendered on the server and every unit test read
 * the full merged tables exactly as they always did. The browser resolves the
 * same specifier to `tables.browser.ts`, which starts empty, and is handed the
 * one language its learner reads (`lib/copy/i18n/load.ts`).
 *
 * Two areas translating one line differently is a test failure, not a merge
 * (`locale.test.ts`).
 */

function build(locale: TranslatedLocale, areas: readonly (readonly [string, Area])[]): LocaleTable {
  const lines: Record<string, string> = {};
  for (const [, area] of areas) {
    for (const [english, line] of Object.entries(area[locale])) lines[keyOf(english)] = line;
  }
  const counted: Record<string, Forms> = {};
  for (const [noun, forms] of Object.entries(COUNTED)) counted[noun] = forms[locale];
  const cases: Record<string, CaseForms> = {};
  for (const [noun, forms] of Object.entries(COUNT_CASES)) cases[noun] = forms[locale];
  return { lines, counted, cases };
}

export const TABLES: Readonly<Record<TranslatedLocale, LocaleTable>> = {
  ru: build("ru", AREAS),
  uk: build("uk", AREAS),
};

/** True here; the browser's registry says false until it has been handed a language. */
export const HAS_EVERY_TABLE = true;

/** Nothing to register on the server, which has every table already. */
export function registerTable(_locale: TranslatedLocale, _table: LocaleTable | PackedTable, _complete = false): void {}

export function isComplete(_locale: TranslatedLocale): boolean {
  return true;
}

/** The line stored under this English, already keyed (`keyOf`). */
export function lineFor(locale: TranslatedLocale, key: string): string | undefined {
  return TABLES[locale].lines[key];
}

export function formsFor(locale: TranslatedLocale, noun: string): Forms | undefined {
  return TABLES[locale].counted[noun];
}

export function caseFormsFor(locale: TranslatedLocale, noun: string): CaseForms | undefined {
  return TABLES[locale].cases[noun];
}

/**
 * A slice of one language: the named areas' lines, the lines named in
 * `borrowed` from wherever they are translated, and every counted noun.
 *
 * For a page that is static and says little, which is the landing page: it
 * renders once per language at build, carries its own lines in the HTML it was
 * going to send anyway, and asks for no chunk. A page that can be refreshed by
 * a Server Action must not use this, because a prop on a layout travels again
 * with every refresh; the signed-in shell loads a chunk instead.
 */
export function areaTable(
  locale: TranslatedLocale,
  names: readonly string[],
  borrowed: readonly string[] = [],
): LocaleTable {
  const wanted = new Set(names);
  const unknown = names.filter((name) => !AREAS.some(([n]) => n === name));
  if (unknown.length) throw new Error(`No translation area named ${unknown.join(", ")}`);
  const slice = build(locale, AREAS.filter(([name]) => wanted.has(name)));
  const lines: Record<string, string> = { ...slice.lines };
  const whole = TABLES[locale].lines;
  for (const english of borrowed) {
    const key = keyOf(english);
    const line = whole[key];
    if (line === undefined) throw new Error(`No translation of ${JSON.stringify(english)} to borrow`);
    lines[key] = line;
  }
  return { ...slice, lines };
}
