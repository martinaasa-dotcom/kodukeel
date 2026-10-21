import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  lineKey, type CaseForms, type Forms, type LocaleTable, type PackedTable, type TranslatedLocale,
} from "./table";

/**
 * EVERY LANGUAGE'S WHOLE TABLE, OFF THE GENERATED FILE, AND ONLY ONCE A PAGE
 * IN THAT LANGUAGE IS RENDERED.
 *
 * `#i18n-tables` resolves here under every condition but `browser` (see
 * package.json, "imports"), so a server component, a route handler, a Server
 * Action, a client component rendered on the server and every unit test read
 * the full table. The browser resolves the same specifier to
 * `tables.browser.ts`, which starts empty, and is handed the one language its
 * learner reads (`lib/copy/i18n/load.ts`).
 *
 * WHAT IS READ IS `generated/<locale>.json`, THE FILE THE BROWSER LOADS. The
 * server used to merge every area of both languages at import, on the argument
 * that size costs nothing here. On a cold start it is most of the cost: the
 * areas are 3.7 MB of source, a route's server render and its client render
 * each held a copy, and every route reached them through `app/actions.ts`, so a
 * cold `/privacy` compiled 7.4 MB of Russian and Ukrainian before answering an
 * English reader. Read here, an English page parses nothing, a Russian one
 * parses one 1.5 MB file the first time an instance needs it, and the server
 * and the browser cannot disagree about a line, because they read the same
 * file. `generated.test.ts` holds the file to the areas (`merged.ts`), and
 * `npm run i18n:tables` writes it.
 *
 * The files travel with a deployment through `outputFileTracingIncludes` in
 * next.config.ts, for the reason the forms list does: a bundler traces what a
 * module imports rather than what it opens.
 */
const HELD: Partial<Record<TranslatedLocale, PackedTable>> = {};

function table(locale: TranslatedLocale): PackedTable {
  const held = HELD[locale];
  if (held) return held;
  const file = join(process.cwd(), "lib", "copy", "i18n", "generated", `${locale}.json`);
  const read = JSON.parse(readFileSync(file, "utf8")) as PackedTable;
  HELD[locale] = read;
  return read;
}

/** True here; the browser's registry says false until it has been handed a language. */
export const HAS_EVERY_TABLE = true;

/** Nothing to register on the server, which reads every table it needs. */
export function registerTable(_locale: TranslatedLocale, _table: LocaleTable | PackedTable, _complete = false): void {}

export function isComplete(_locale: TranslatedLocale): boolean {
  return true;
}

/** The line stored under this English, already keyed (`keyOf`). */
export function lineFor(locale: TranslatedLocale, key: string): string | undefined {
  return table(locale).lines[lineKey(key)];
}

export function formsFor(locale: TranslatedLocale, noun: string): Forms | undefined {
  return table(locale).counted[noun];
}

export function caseFormsFor(locale: TranslatedLocale, noun: string): CaseForms | undefined {
  return table(locale).cases[noun];
}

/** Every counted noun's forms, for a page handing a language slice to the browser (`slice.ts`). */
export function countedTable(locale: TranslatedLocale): Pick<LocaleTable, "counted" | "cases"> {
  const { counted, cases } = table(locale);
  return { counted, cases };
}
