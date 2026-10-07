import { describe, expect, it } from "vitest";
import { AREAS } from "./i18n";
import { COUNTED_CORE, MACHINE_NOTICE, MACHINE_SHORT } from "./locale";
import { ENTRY_COPY } from "./entryLocales";

/**
 * Every Ukrainian line the app holds is Ukrainian and nothing else.
 *
 * Most people reading Kodukeel in Ukrainian live in Estonia because of the
 * war, and a Russian letter, a Russian word or a sentence about Russia on
 * a screen they chose to read in Ukrainian is not a typo to them. So the
 * check is mechanical where a machine can see it: no letter Ukrainian does
 * not have (ы, э, ъ, ё), and no line naming Russia or the Russian language.
 * The Russian half has its own check; this one is the Ukrainian half only.
 */

/** Every string inside a value, however deep, so the entry page's nested copy is read too. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

function ukrainianLines(): string[] {
  const lines: string[] = [];
  for (const [, area] of AREAS) {
    lines.push(...Object.values(area.uk));
    for (const forms of Object.values(area.counted ?? {})) lines.push(...forms.uk);
  }
  for (const forms of Object.values(COUNTED_CORE)) lines.push(...forms.uk);
  lines.push(MACHINE_NOTICE.uk, MACHINE_SHORT.uk);
  // The entry page's language name is a label for the switcher, not a line; the rest is copy.
  for (const [key, value] of Object.entries(ENTRY_COPY.uk)) {
    if (key !== "name" && key !== "href") lines.push(...strings(value));
  }
  return lines;
}

/** A letter Russian has and Ukrainian does not. */
const RUSSIAN_LETTER = /[ыэъёЫЭЪЁ]/u;

/**
 * Russia, a Russian, the Russian language or Moscow, at the start of a word,
 * so «попросіть» is not read as «росі».
 */
const NAMES_RUSSIA = /(?<![\p{L}'’])(?:Росі|[Рр]осійськ|[Рр]осіян|[Мм]оскв)/u;

describe("the Ukrainian translation", () => {
  const lines = ukrainianLines();

  it("reads a real number of lines, so an empty table cannot pass", () => {
    expect(lines.length).toBeGreaterThan(3000);
  });

  it("holds no letter that only Russian has", () => {
    expect(lines.filter((line) => RUSSIAN_LETTER.test(line))).toEqual([]);
  });

  it("never names Russia or the Russian language", () => {
    expect(lines.filter((line) => NAMES_RUSSIA.test(line))).toEqual([]);
  });

  it("has checks that fire on the shapes they are for", () => {
    expect(RUSSIAN_LETTER.test("Это слово")).toBe(true);
    expect(NAMES_RUSSIA.test("естонською й російською")).toBe(true);
    expect(NAMES_RUSSIA.test("Росія")).toBe(true);
    expect(NAMES_RUSSIA.test("Попросіть рахунок.")).toBe(false);
  });
});
