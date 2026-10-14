/**
 * ONE LANGUAGE'S WHOLE INTERFACE, AS THE BROWSER RECEIVES IT.
 *
 * The areas (`lib/copy/i18n/areas/`) hold every line in all three languages
 * side by side, because that is how somebody fluent reads them. A browser needs
 * one language and only when the learner reads it, so what travels is this:
 * the lines keyed on their English, and the counted nouns' forms and cases.
 *
 * Built on the server by `tables.ts`; in the browser `tables.browser.ts` holds
 * whatever has been registered so far. `lib/copy/locale.ts` reads either
 * through the same `#i18n-tables` specifier, which package.json resolves to the
 * browser registry under the `browser` condition and to the full tables
 * everywhere else. See docs/35-launch-quick-wins.md, QW-8 and QW-9.
 */

/** One, few, many: the three plural forms Russian and Ukrainian both have. */
export type Forms = readonly [one: string, few: string, many: string];

/** The genitive singular and the accusative singular, which the three do not cover. */
export type CaseForms = readonly [gen1: string, acc1: string];

export interface LocaleTable {
  readonly lines: Readonly<Record<string, string>>;
  readonly counted: Readonly<Record<string, Forms>>;
  readonly cases: Readonly<Record<string, CaseForms>>;
}

export type TranslatedLocale = "ru" | "uk";

/**
 * The English as the tables hold it: with the straight apostrophe. The screen
 * prints the curly one (`won’t`), which is what the English copy always used,
 * and the tables are keyed on the plain one, so a line looks itself up by
 * either and one apostrophe can never cost a translation.
 */
export function keyOf(english: string): string {
  return english.includes("’") ? english.replace(/’/g, "'") : english;
}

/**
 * A table as the browser loads it: the same lines, keyed on `lineKey` of their
 * English rather than on the English itself.
 *
 * The English is half of every entry and the browser never reads it, it only
 * looks a line up by it, so a short fixed-length key carries the same lookup
 * in a quarter less to download (421 KB gzip down to 316 for Russian, measured
 * on the tables as they stood on 2026-10-14). `packTable` refuses a collision,
 * so two lines can never answer to one key.
 */
export interface PackedTable {
  readonly packed: 1;
  readonly lines: Readonly<Record<string, string>>;
  readonly counted: Readonly<Record<string, Forms>>;
  readonly cases: Readonly<Record<string, CaseForms>>;
}

/**
 * The key a line is packed under: cyrb53, a 53-bit string hash, in base 36.
 * Fifty-three bits over ten thousand lines puts the chance of any two sharing
 * a key at about one in two hundred million, and `packTable` checks anyway.
 * Pure arithmetic, so the browser and the script that writes the file agree.
 */
export function lineKey(key: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function packTable(table: LocaleTable): PackedTable {
  const lines: Record<string, string> = {};
  const owner = new Map<string, string>();
  for (const [english, line] of Object.entries(table.lines)) {
    const key = lineKey(english);
    const had = owner.get(key);
    if (had !== undefined && had !== english) {
      throw new Error(`Two lines pack to one key, ${JSON.stringify(had)} and ${JSON.stringify(english)}`);
    }
    owner.set(key, english);
    lines[key] = line;
  }
  return { packed: 1, lines, counted: table.counted, cases: table.cases };
}

/**
 * A table as the generated file holds it: packed, keys sorted, one entry a
 * line, so a change to one translation is a one-line diff in review rather
 * than a rewrite of the whole file.
 */
export function serializeTable(table: LocaleTable): string {
  const packed = packTable(table);
  const sorted = <T>(record: Readonly<Record<string, T>>): Record<string, T> =>
    Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]!]));
  return `${JSON.stringify(
    { packed: 1, lines: sorted(packed.lines), counted: sorted(packed.counted), cases: sorted(packed.cases) },
    null,
    1,
  )}\n`;
}
