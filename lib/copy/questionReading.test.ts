import { describe, expect, it } from "vitest";
import { QUESTION_WORDS, questionInEnglish } from "@/lib/estonian/cases";
import { translated } from "./locale";
import { localiseReadings, questionIn } from "./questionReading";

describe("a case question read in the learner's language", () => {
  it("is exactly the English reading in English", () => {
    for (const q of ["milles? kus?", "kellele? millele?", "mida?"]) expect(questionIn("en", q)).toBe(questionInEnglish(q));
  });

  it("translates every question word, so no English is left in a two-word question", () => {
    for (const locale of ["ru", "uk"] as const) {
      const out = questionIn(locale, "milles? kus?");
      expect(out).toBeTruthy();
      expect(out, out ?? "").toMatch(/[Ѐ-ӿ]/);
      expect(out, out ?? "").not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("has a Russian and a Ukrainian line for every reading a question word can produce", () => {
    const readings = [...new Set(QUESTION_WORDS.map((q) => questionInEnglish(q)).filter((x): x is string => Boolean(x)))];
    expect(readings.length).toBeGreaterThan(10);
    for (const locale of ["ru", "uk"] as const) {
      for (const reading of readings) expect(translated(locale, reading), `${locale}: ${reading}`).toBe(true);
    }
  });

  it("says nothing for nothing", () => {
    expect(questionIn("ru", null)).toBeNull();
    expect(questionIn("ru", "")).toBeNull();
  });
});

describe("readings already written into a stored line", () => {
  it("are translated in place, and the Estonian beside them is left as it is", () => {
    const stored = `keda/mida* (${questionInEnglish("keda? mida?")}), millest (${questionInEnglish("millest?")})`;
    const ru = localiseReadings("ru", stored);
    expect(ru.startsWith("keda/mida* (")).toBe(true);
    expect(ru).toContain("millest (");
    expect(ru).not.toMatch(/whom|what/);
    expect(localiseReadings("en", stored)).toBe(stored);
  });
});
