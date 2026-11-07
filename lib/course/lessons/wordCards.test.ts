import { describe, expect, it } from "vitest";
import { lessonById, LESSONS } from "@/lib/course/lessons";
import { hasWord, rowLabel, wordsLayout, type HeadInfo } from "./wordCards";

/* The dictionary's table for `võti` and `sokk`, the shape `lessonHeads` reads off `buildCaseTable`. */
const VOTI: HeadInfo = {
  lemma: "võti", pos: "NOUN", en: "key", ru: null, uk: null,
  cases: [
    { key: "NOMINATIVE", sg: "võti", pl: "võtmed" },
    { key: "GENITIVE", sg: "võtme", pl: "võtmete" },
    { key: "PARTITIVE", sg: "võtit", pl: "võtmeid" },
  ],
};
const SOKK: HeadInfo = {
  lemma: "sokk", pos: "NOUN", en: "sock", ru: null, uk: null,
  cases: [
    { key: "NOMINATIVE", sg: "sokk", pl: "sokid" },
    { key: "GENITIVE", sg: "soki", pl: "sokkide" },
    { key: "PARTITIVE", sg: "sokki", pl: "sokke" },
  ],
};

describe("the Words step's cards", () => {
  const lesson = lessonById("b1-02-not-one")!;
  const layout = wordsLayout(lesson, [VOTI, SOKK]);

  it("puts every form of one word on one card, a row per case, singular beside plural", () => {
    const card = layout.cards.find((c) => c.head === "võti")!;
    expect(card.kind).toBe("noun");
    expect(card.plural).toBe(true);
    const partitive = card.rows.find((r) => r.sg?.et === "võtit")!;
    expect(partitive.pl).toMatchObject({ et: "võtmeid", fresh: true, name: "mitmuse osastav" });
    expect(partitive.sg).toMatchObject({ fresh: true, name: "osastav" });
    // The nominative's singular is the headword, shown for its place and not new tonight.
    const nominative = card.rows.find((r) => r.pl?.et === "võtmed")!;
    expect(nominative.sg).toMatchObject({ et: "võti", fresh: false });
  });

  it("labels a singular and plural that end the same way by that ending", () => {
    const partitive = layout.cards.find((c) => c.head === "võti")!.rows.find((r) => r.sg?.et === "võtit")!;
    expect(rowLabel(partitive.labels)).toBe("After a no");
  });

  it("makes a word the lesson teaches on its own the card's header rather than a second row", () => {
    const card = layout.cards.find((c) => c.head === "sokk")!;
    expect(card.fresh).toBe(true);
    expect(layout.loose.some((l) => l.item.et === "sokk")).toBe(false);
  });

  it("gives every row a sentence of the lesson that holds the form, with its English", () => {
    const examples = layout.cards.flatMap((c) => c.rows).filter((r) => r.example);
    expect(examples.length).toBeGreaterThan(5);
    for (const r of examples) {
      expect(r.example!.en.length).toBeGreaterThan(0);
      expect(hasWord(r.example!.et, r.hit!)).toBe(true);
    }
  });
});

describe("every lesson's Words step", () => {
  it("only ever shows a sentence that carries English and holds the marked form", () => {
    let rows = 0;
    for (const lesson of LESSONS) {
      const layout = wordsLayout(lesson, []);
      for (const r of [...layout.cards.flatMap((c) => c.rows), ...layout.loose]) {
        if (!r.example) continue;
        rows += 1;
        expect(r.example.en.trim(), lesson.id).not.toBe("");
        expect(hasWord(r.example.et, r.hit!), `${lesson.id}: ${r.hit} in ${r.example.et}`).toBe(true);
      }
    }
    expect(rows).toBeGreaterThan(500);
  });

  it("leaves no taught item off the screen", () => {
    for (const lesson of LESSONS) {
      const layout = wordsLayout(lesson, []);
      const shown = new Set([
        ...layout.cards.flatMap((c) => [c.head, ...c.rows.flatMap((r) => [r.sg?.et, r.pl?.et, ...(r.forms ?? []).map((f) => f.et)])]),
        ...layout.loose.map((l) => l.item.et),
      ]);
      for (const t of lesson.teaches) expect(shown.has(t.et), `${lesson.id}: ${t.et}`).toBe(true);
    }
  });
});

describe("rowLabel", () => {
  it("keeps one label as it is and joins two that differ", () => {
    expect(rowLabel(["the keys"])).toBe("the keys");
    expect(rowLabel(["of the key", "of the keys"])).toBe("of the key; of the keys");
    expect(rowLabel(["a sock, after a no", "socks, after a no"])).toBe("After a no");
  });
});
