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

/**
 * The lines that have to name Russian to be true, each with its reason. A
 * Ukrainian reader is owed these facts in their own language; leaving Russian
 * out of them would make the line false rather than kinder.
 */
const MAY_NAME_RUSSIAN: Readonly<Record<string, string>> = {
  // Safety: who answers the emergency number. A reader in trouble may need it.
  "Let's hope you never need these words. You shout appi when you're in trouble, and ask for abi when you just need a hand. The emergency number is 112, and they answer in Estonian, Russian and English.":
    "the languages 112 answers in",
  // Settings says which languages the dictionary records meanings in.
  "Meanings can appear in Russian or Ukrainian too. The English always stays, and the language you choose shows up next to it.":
    "the meaning languages on offer",
  "The Russian and Ukrainian come from the same dictionary as the Estonian. If none was recorded for a word, you'll just see the English.":
    "where the meanings come from",
  // Fact about a state exam: which languages its official handbook exists in.
  "It's held once a month except in July, in Tallinn, Tartu and Narva, and you get your result as soon as it ends. Harno publishes a handbook for it in English and Russian.":
    "the languages the citizenship exam handbook is published in",
};

function ukrainianLines(): string[] {
  const lines: string[] = [];
  for (const [, area] of AREAS) {
    lines.push(...Object.entries(area.uk).filter(([en]) => !(en in MAY_NAME_RUSSIAN)).map(([, uk]) => uk));
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

  it("names Russian only where a line would be false without it, and every such line still does", () => {
    for (const en of Object.keys(MAY_NAME_RUSSIAN)) {
      const uk = AREAS.map(([, area]) => area.uk[en]).find((v) => v !== undefined);
      expect(uk, `${en} is no longer translated, so its exemption is stale`).toBeDefined();
      expect(NAMES_RUSSIA.test(uk ?? ""), `${en} no longer names Russian, so its exemption is stale`).toBe(true);
      expect(RUSSIAN_LETTER.test(uk ?? ""), en).toBe(false);
    }
  });

  it("has checks that fire on the shapes they are for", () => {
    expect(RUSSIAN_LETTER.test("Это слово")).toBe(true);
    expect(NAMES_RUSSIA.test("естонською й російською")).toBe(true);
    expect(NAMES_RUSSIA.test("Росія")).toBe(true);
    expect(NAMES_RUSSIA.test("Попросіть рахунок.")).toBe(false);
  });
});
