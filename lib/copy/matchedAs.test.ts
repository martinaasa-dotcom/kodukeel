import { describe, expect, it } from "vitest";
import { formLabel, morphCodeFor, VERB_SLOTS } from "@/lib/estonian/morph";
import { CASES } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";
import { matchedAsIn } from "./matchedAs";

describe("what a matched form is called, in the learner's language", () => {
  it("is the search's own English in English", () => {
    const line = "seesütlev (what is it in? where?) of tuba";
    expect(matchedAsIn("en", line)).toBe(line);
  });

  it("keeps the Estonian name and the headword and translates the reading", () => {
    expect(matchedAsIn("ru", "seesütlev (what is it in? where?) of tuba")).toBe("seesütlev (в чём? где?) слова tuba");
    expect(matchedAsIn("uk", "olevik ta (present) of elama")).toBe("olevik ta (теперішній час) слова elama");
  });

  it("reads a reading that holds a bracket of its own, and the plural", () => {
    expect(matchedAsIn("ru", "osastav (what? (some of it)) of tuba")).toBe("osastav (что? (какую-то часть)) слова tuba");
    expect(matchedAsIn("ru", "mitmuse kaasaütlev (with what?, plural) of tuba")).toBe("mitmuse kaasaütlev (с чем?, множественное число) слова tuba");
  });

  it("reads the line under a sentence, which has no headword", () => {
    expect(matchedAsIn("ru", "seesütlev (what is it in? where?)")).toBe("seesütlev (в чём? где?)");
  });

  it("leaves no English in the reading of any form the search can name", () => {
    const labels = new Set<string>();
    for (const c of CASES) {
      for (const plural of [false, true]) {
        const code = morphCodeFor(c.key as CaseKey, plural);
        if (code) labels.add(formLabel({ morphCode: code }));
      }
    }
    for (const code of Object.keys(VERB_SLOTS)) labels.add(formLabel({ morphCode: code }));
    for (const formType of ["GEN_SG", "PART_SG", "ILL_SG_SHORT", "NOM_PL", "PART_PL", "GEN_PL", "INF_MA", "INF_DA", "PRES_1SG", "PAST_1SG", "PART_TUD"]) {
      labels.add(formLabel({ formType }));
    }
    const withReading = [...labels].filter((label) => label.includes("("));
    expect(withReading.length).toBeGreaterThan(20);
    for (const locale of ["ru", "uk"] as const) {
      for (const label of withReading) {
        const out = matchedAsIn(locale, `${label} of tuba`);
        expect(out.endsWith(" слова tuba"), out).toBe(true);
        // An ending named before a hyphen ("nud-", "ma-") is the terminology
        // the translation keeps, not English left behind.
        const reading = out.slice(out.indexOf("(") + 1, out.lastIndexOf(")")).replace(/[a-z]+-/g, "");
        expect(reading, `${locale}: ${label}`).not.toMatch(/[A-Za-z]{3,}/);
      }
    }
  });

  it("returns a line it cannot read as it stands", () => {
    expect(matchedAsIn("ru", "something else entirely")).toBe("something else entirely");
  });
});
