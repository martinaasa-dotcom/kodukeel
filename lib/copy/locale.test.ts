import { describe, expect, it } from "vitest";
import { BRIEFINGS } from "./briefings";
import { SECTIONS } from "@/lib/ux/nav";
import { AREAS } from "./i18n";
import { countOf, estonianSlots, fill, localeFrom, pluralIndex, tr, translated, MACHINE_NOTICE, MACHINE_SHORT } from "./locale";

const TABLES = {
  ru: Object.assign({}, ...AREAS.map(([, a]) => a.ru)) as Record<string, string>,
  uk: Object.assign({}, ...AREAS.map(([, a]) => a.uk)) as Record<string, string>,
} as const;

/** Every line the translated surfaces draw, read off the tables they come from. */
function surfaceLines(): string[] {
  const lines = new Set<string>();
  for (const b of Object.values(BRIEFINGS)) for (const k of ["title", "what", "you", "action"] as const) lines.add(b[k]);
  for (const s of SECTIONS) {
    lines.add(s.title);
    if (s.blurb) lines.add(s.blurb);
    for (const item of s.items) {
      lines.add(item.label);
      if (item.blurb) lines.add(item.blurb);
    }
  }
  return [...lines];
}

describe("the interface language", () => {
  it("reads an absent or unknown row as English", () => {
    expect(localeFrom(null)).toBe("en");
    expect(localeFrom("de")).toBe("en");
    expect(localeFrom("ru")).toBe("ru");
    expect(localeFrom("uk")).toBe("uk");
  });

  it("falls back to the English for a line nobody has translated", () => {
    expect(tr("ru", "a line that is in no table")).toBe("a line that is in no table");
    expect(tr("en", "Settings")).toBe("Settings");
    expect(tr("ru", "Settings")).toBe("Настройки");
    expect(tr("uk", "Settings")).toBe("Налаштування");
  });

  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: translates every line of the navigation and every round's opening screen`, () => {
      const lines = surfaceLines();
      expect(lines.length).toBeGreaterThan(100);
      const missing = lines.filter((l) => !translated(locale, l));
      expect(missing, `untranslated in ${locale}`).toEqual([]);
    });

    it(`${locale}: holds no line left in English, and no empty one`, () => {
      for (const [en, out] of Object.entries(TABLES[locale])) {
        expect(out.trim(), en).not.toBe("");
        // Cyrillic in every line except a name or a bare placeholder.
        if (!/^[{}\w\s]*$/.test(en) || en === "Start") expect(/[Ѐ-ӿ]/.test(out), `${en} -> ${out}`).toBe(true);
      }
    });

    it(`${locale}: keeps every placeholder its English had`, () => {
      for (const [en, out] of Object.entries(TABLES[locale])) {
        const want = (en.match(/\{\w+\}/g) ?? []).sort();
        const have = (out.match(/\{\w+\}/g) ?? []).sort();
        expect(have, en).toEqual(want);
      }
    });

    it(`${locale}: writes no Estonian letter and no dash a person reads`, () => {
      for (const out of [...Object.values(TABLES[locale]), MACHINE_NOTICE[locale], MACHINE_SHORT[locale]]) {
        expect(out, out).not.toMatch(/[õäöüšžÕÄÖÜŠŽ]/);
        expect(out, out).not.toMatch(/[–—]/);
      }
    });

    it(`${locale}: uses the right quotation marks, never the English ones`, () => {
      for (const out of Object.values(TABLES[locale])) expect(out, out).not.toMatch(/["“”]/);
    });
  }

  it("never has two areas translate one English line two ways", () => {
    for (const locale of ["ru", "uk"] as const) {
      const seen = new Map<string, [string, string]>();
      const clashes: string[] = [];
      for (const [name, area] of AREAS) {
        for (const [en, out] of Object.entries(area[locale])) {
          const before = seen.get(en);
          if (before && before[1] !== out) clashes.push(`${locale} "${en}": ${before[0]} says "${before[1]}", ${name} says "${out}"`);
          else seen.set(en, [name, out]);
        }
      }
      expect(clashes).toEqual([]);
    }
  });

  it("gives every counted noun all three forms in both languages", () => {
    for (const [name, area] of AREAS) {
      for (const [noun, forms] of Object.entries(area.counted ?? {})) {
        expect(forms.ru.every((f) => f.trim()), `${name}: ${noun}`).toBe(true);
        expect(forms.uk.every((f) => f.trim()), `${name}: ${noun}`).toBe(true);
      }
    }
  });

  it("counts in the three plural forms Russian and Ukrainian have", () => {
    expect(countOf("en", 1, "card")).toBe("1 card");
    expect(countOf("en", 5, "card")).toBe("5 cards");
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => countOf("ru", n, "card"))).toEqual([
      "1 карточка", "2 карточки", "5 карточек", "11 карточек", "21 карточка", "22 карточки", "25 карточек",
    ]);
    expect([1, 3, 12, 31].map((n) => countOf("uk", n, "word"))).toEqual(["1 слово", "3 слова", "12 слів", "31 слово"]);
    expect(pluralIndex("ru", 14)).toBe(2);
  });

  it("finds a line by either apostrophe, and prints the English one it was given", () => {
    expect(tr("ru", "That\u2019s the round done")).toBe(tr("ru", "That's the round done"));
    expect(tr("ru", "That\u2019s the round done")).toMatch(/[\u0400-\u04FF]/);
    expect(tr("en", "That\u2019s the round done")).toBe("That\u2019s the round done");
    expect(translated("uk", "That\u2019s the round done")).toBe(true);
  });

  it("carries an Estonian word with an Estonian letter in a slot, so the table never holds one", () => {
    expect(estonianSlots("toas is in the room")).toBeNull();
    const slotted = estonianSlots("Kõndides, mõeldes, lugedes: while walking.");
    expect(slotted?.key).toBe("{e1}, {e2}, lugedes: while walking.");
    expect(slotted?.values).toEqual({ e1: "Kõndides", e2: "mõeldes" });
    // Read back off a real course line: the Russian has the source's own words in it.
    const line = "Use the small words like ära, üles and läbi that completely change what a verb means.";
    expect(translated("ru", line)).toBe(true);
    expect(tr("ru", line)).toContain("ära, üles и läbi");
    expect(tr("uk", line)).toContain("ära, üles і läbi");
    expect(tr("en", line)).toBe(line);
  });

  it("fills a template after it is translated", () => {
    expect(fill(tr("ru", "{count} in this round"), { count: countOf("ru", 3, "word") })).toBe("3 слова в этом раунде");
  });
});
