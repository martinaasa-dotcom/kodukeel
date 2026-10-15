/*
  WHICH SENTENCES A MODULE READING MAY SHOW, DRIVEN WITHOUT A DATABASE.

  The page that uses this was reported for putting `Alustame tööd esmaspäeval`
  under the present tense on the fourth evening of A1, with the verb marked, to
  somebody who had met `alustama` never. Every check here asks about the marked
  word, because that is the one the learner is meant to look at.
*/
import { describe, expect, it } from "vitest";

import { TOPIC_NOTES } from "../estonian/grammar";
import { TOPIC_EXAMPLES } from "../estonian/grammarExamples";
import {
  FILLS_BY_SLOT, PER_POINT, fillPoints, fromMetVerbs, keepMet, slotFamily, type MetVerb,
} from "./pointExamples";

const spellings = new Set([
  "ma", "sa", "elan", "elad", "elab", "loen", "loe", "loeb", "raamatut", "kodus", "ei", "kuidas", "tahan", "ta",
]);

const elama: MetVerb = {
  lexemeId: "elama", lemma: "elama",
  forms: [
    { code: "IndPrSg1", value: "elan" }, { code: "IndPrSg2", value: "elad" }, { code: "IndPrSg3", value: "elab" },
    { code: "IndPrPs_", value: "ela" }, { code: "ImpPrSg2", value: "ela" },
  ],
  sentences: [
    { et: "Kuidas sa elad?", en: "How are you?" },
    { et: "Ma elan kodus.", en: "I live at home." },
    { et: "Ma ei ela kodus.", en: "I do not live at home." },
    { et: "Ela hästi, kuni sa elad!", en: null },
  ],
};
const lugema: MetVerb = {
  lexemeId: "lugema", lemma: "lugema",
  forms: [
    { code: "IndPrSg1", value: "loen" }, { code: "IndPrSg3", value: "loeb" },
    { code: "IndPrPs_", value: "loe" }, { code: "ImpPrSg2", value: "loe" },
  ],
  sentences: [
    { et: "Ma loen raamatut.", en: "I am reading a book." },
    { et: "Ma ei loe raamatut.", en: "I am not reading a book." },
    { et: "Loe raamatut!", en: "Read the book!" },
  ],
};

describe("keepMet", () => {
  it("keeps a pin whose marked word is a taught spelling, whatever its case", () => {
    const pins = [{ form: "Elan" }, { form: "Alustame" }];
    expect(keepMet(pins, spellings)).toEqual([{ form: "Elan" }]);
  });
  it("keeps nothing when nothing marked has been taught", () => {
    expect(keepMet([{ form: "Alustame" }, { form: "sööb" }], spellings)).toEqual([]);
  });
});

describe("slotFamily", () => {
  it("takes the person off a verb slot, so any person stands", () => {
    expect(slotFamily("VERB:IndPrPl1")).toBe("IndPr");
    expect(slotFamily("VERB:KndPrSg1")).toBe("KndPr");
    expect(slotFamily("VERB:IndPrPs_")).toBe("IndPrPs_");
  });
  it("says nothing for a case or no slot at all", () => {
    expect(slotFamily("CASE:ADESSIVE")).toBeNull();
    expect(slotFamily(undefined)).toBeNull();
  });
});

describe("fromMetVerbs", () => {
  it("finds the learner's own verbs in a sentence recorded under them, with the form marked", () => {
    const picks = fromMetVerbs([elama], "IndPr", spellings);
    expect(picks.map((p) => [p.et, p.form])).toEqual(
      expect.arrayContaining([["Kuidas sa elad?", "elad"], ["Ma elan kodus.", "elan"]]),
    );
  });

  it("never offers a sentence with no English, so a keyless deployment draws no bare line", () => {
    const picks = fromMetVerbs([elama], "IndPr", spellings);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((p) => p.en)).toBe(true);
    expect(picks.some((p) => p.et.startsWith("Ela hästi"))).toBe(false);
  });

  it("takes the negative only straight after ei", () => {
    const picks = fromMetVerbs([lugema], "IndPrPs_", spellings);
    expect(picks.map((p) => p.et)).toEqual(["Ma ei loe raamatut."]);
  });

  it("refuses a spelling the verb has another slot for, so a bare imperative is not a present", () => {
    // `loe` is the negative and the singular imperative, and `Loe raamatut!` is a command.
    expect(fromMetVerbs([lugema], "IndPr", spellings).map((p) => p.et)).toEqual(["Ma loen raamatut."]);
  });

  it("does not read a word after ei as the positive present", () => {
    expect(fromMetVerbs([elama], "IndPr", spellings).some((p) => p.et === "Ma ei ela kodus.")).toBe(false);
  });

  it("holds a sentence to two strangers at most, and to eight words", () => {
    const verb: MetVerb = {
      ...lugema,
      sentences: [
        { et: "Ma loen punast paksu vana raamatut.", en: "x" },
        { et: "Ma loen väga põnevat raamatut täna õhtul koos sõbraga kodus.", en: "x" },
      ],
    };
    expect(fromMetVerbs([verb], "IndPr", spellings)).toEqual([]);
  });

  it("marks nothing in a particle verb, whose particle rides along in every form", () => {
    const verb: MetVerb = {
      lexemeId: "x", lemma: "läbi lugema",
      forms: [{ code: "IndPrSg1", value: "loen läbi" }],
      sentences: [{ et: "Ma loen läbi raamatut.", en: "x" }],
    };
    expect(fromMetVerbs([verb], "IndPr", spellings)).toEqual([]);
  });

  it("puts the sentence it can read straight through first, then the verb met most recently", () => {
    const picks = fromMetVerbs([elama, lugema], "IndPr", spellings);
    expect(picks.every((p, i) => i === 0 || picks[i - 1]!.strangers <= p.strangers)).toBe(true);
    const tied = picks.filter((p) => p.strangers === 0 && p.et.length === "Ma elan kodus.".length);
    expect(tied.length).toBeGreaterThan(0);
  });
});

describe("fillPoints", () => {
  const point = (name: string, family: string | null, kept: { et: string; form: string }[] = []) => ({
    point: name, family,
    kept: kept.map((k) => ({ ...k, en: "x", lexemeId: "pin" })),
  });

  it("tops a point up to the page's two, and keeps what a pin already showed", () => {
    const out = fillPoints([point("a", "IndPr", [{ et: "Olen kodus.", form: "Olen" }])], [elama, lugema], spellings);
    const lines = out.get("a")!;
    expect(lines).toHaveLength(PER_POINT);
    expect(lines[0]!.et).toBe("Olen kodus.");
  });

  it("spreads verbs across the page: a verb nothing has used yet leads the next point", () => {
    const tahtma: MetVerb = {
      lexemeId: "tahtma", lemma: "tahtma",
      forms: [{ code: "IndPrSg1", value: "tahan" }],
      sentences: [{ et: "Ma tahan kodus.", en: "I want to be at home." }],
    };
    const out = fillPoints([point("a", "IndPr"), point("b", "IndPr")], [elama, lugema, tahtma], spellings);
    const all = [...out.values()].flat();
    expect(new Set(all.map((l) => l.et)).size).toBe(all.length);
    // The first point takes two verbs, so the second does not start on either of them.
    const first = new Set(out.get("a")!.map((l) => l.lexemeId));
    expect(first.has(out.get("b")![0]!.lexemeId)).toBe(false);
  });

  it("draws one verb at most once under one point", () => {
    const out = fillPoints([point("a", "IndPr")], [elama], spellings);
    expect(out.get("a")).toHaveLength(1);
  });

  it("leaves a point with no family to its pins, and omits it when they left nothing", () => {
    const out = fillPoints([point("a", null), point("b", null, [{ et: "Ma elan.", form: "elan" }])], [elama], spellings);
    expect(out.has("a")).toBe(false);
    expect(out.get("b")).toHaveLength(1);
  });
});

describe("FILLS_BY_SLOT", () => {
  it("names only points a topic really has, so a reorder or a rewording cannot orphan one", () => {
    let seen = 0;
    for (const [topic, points] of Object.entries(FILLS_BY_SLOT)) {
      const real = TOPIC_NOTES.find((t) => t.id === topic)?.points ?? [];
      for (const point of points) {
        seen++;
        expect(real, `${topic}: ${point}`).toContain(point);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("only lists a point whose pins say which verb slot it shows, or it could never be filled", () => {
    let seen = 0;
    for (const [topic, points] of Object.entries(FILLS_BY_SLOT)) {
      for (const point of points) {
        seen++;
        const pins = TOPIC_EXAMPLES[topic]?.[point] ?? [];
        expect(pins.some((p) => slotFamily(p.slot) !== null), `${topic}: ${point}`).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
