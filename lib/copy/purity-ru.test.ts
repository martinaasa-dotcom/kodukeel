import { describe, expect, it } from "vitest";
import { AREAS } from "./i18n";
import { COUNTED_CORE, MACHINE_NOTICE, MACHINE_SHORT } from "./locale";
import { ENTRY_COPY } from "./entryLocales";

/**
 * THE RUSSIAN STAYS RUSSIAN.
 *
 * Most people reading this app in Russian or in Ukrainian would find the other
 * language turning up in their own setting out of place, and many would find it
 * offensive. So no Russian line may carry a letter only Ukrainian has (і, ї, є,
 * ґ), an apostrophe inside a word (Ukrainian spells «п'ять» that way, Russian
 * never does), or a word about Ukraine or the Ukrainian language. A Russian
 * reader is offered English and Russian, never the other one: the language
 * pickers already leave it out (`GlossLanguagePanel`, the welcome wizard).
 *
 * The Ukrainian half has its own test beside this one.
 */

/** Every string inside a value, however deeply it is nested. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

function russianLines(): [where: string, line: string][] {
  const lines: [string, string][] = [];
  for (const [name, area] of AREAS) {
    for (const [en, ru] of Object.entries(area.ru)) lines.push([`${name}: ${en}`, ru]);
    for (const [noun, forms] of Object.entries(area.counted ?? {})) {
      for (const form of forms.ru) lines.push([`${name}, counted: ${noun}`, form]);
    }
  }
  for (const [noun, forms] of Object.entries(COUNTED_CORE)) {
    for (const form of forms.ru) lines.push([`core counted: ${noun}`, form]);
  }
  lines.push(["MACHINE_NOTICE", MACHINE_NOTICE.ru], ["MACHINE_SHORT", MACHINE_SHORT.ru]);
  for (const line of strings(ENTRY_COPY.ru)) lines.push(["entry page", line]);
  return lines;
}

const UKRAINIAN_LETTER = /[іїєґІЇЄҐ]/;
const APOSTROPHE_IN_WORD = /[Ѐ-ӿ]['’ʼ][Ѐ-ӿ]/;
const ABOUT_UKRAINE = /украин|Украин/i;

describe("the Russian interface", () => {
  const lines = russianLines();

  it("has lines to check", () => {
    expect(lines.length).toBeGreaterThan(5000);
  });

  it("holds no letter only Ukrainian has", () => {
    const found = lines.filter(([, line]) => UKRAINIAN_LETTER.test(line));
    expect(found).toEqual([]);
  });

  it("holds no apostrophe inside a Cyrillic word", () => {
    const found = lines.filter(([, line]) => APOSTROPHE_IN_WORD.test(line));
    expect(found).toEqual([]);
  });

  it("never mentions Ukraine or the Ukrainian language", () => {
    const found = lines.filter(([, line]) => ABOUT_UKRAINE.test(line));
    expect(found).toEqual([]);
  });

  it("is a check that can fail", () => {
    expect(UKRAINIAN_LETTER.test("Дякую, це їхнє")).toBe(true);
    expect(APOSTROPHE_IN_WORD.test("п'ять")).toBe(true);
    expect(APOSTROPHE_IN_WORD.test("grappa'st")).toBe(false);
    expect(ABOUT_UKRAINE.test("Украинский")).toBe(true);
  });
});
