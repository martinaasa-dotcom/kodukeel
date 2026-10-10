import { describe, expect, it } from "vitest";
import {
  ARROW, GIFT, MAP_CASES, MAP_OPTIONS, RUNG_WINDOW, dealByCase, hourGlyph, humansIn, pickWrong, rungFrom, sceneFor, trioOf,
  type FormChoice,
} from "./map";
import { CASES } from "@/lib/estonian/cases";
import { RU } from "@/lib/copy/i18n/ru";
import { UK } from "@/lib/copy/i18n/uk";
import type { CaseKey } from "@/lib/estonian/types";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const nearness = (c: string, a: string) => (c.slice(0, 3) === a.slice(0, 3) ? 5 : 0) - Math.abs(c.length - a.length);

const thing = { animate: false, glyph: "🏠", hour: null };
const person = { animate: true, glyph: "👧", hour: null };
const five = { animate: false, glyph: null, hour: 5 };

describe("sceneFor", () => {
  it("draws every case Map asks, and says what it asks without any Estonian", () => {
    let drawn = 0;
    for (const key of MAP_CASES) {
      for (const word of [thing, person, five]) {
        const scene = sceneFor(key, word);
        if (!scene) continue;
        drawn++;
        expect(scene.ask).toMatch(/\?$/);
        expect(scene.ask).not.toMatch(/[õäöüšž]/i);
        expect(scene.alt.length).toBeGreaterThan(10);
      }
    }
    // Every case but the terminative is drawn for a thing and a person; the terminative for an hour.
    expect(drawn).toBe((MAP_CASES.length - 1) * 2 + 1);
  });

  it("puts the word's own emoji in the picture, marked as the word", () => {
    for (const key of MAP_CASES.filter((k) => k !== "TERMINATIVE")) {
      const { layout } = sceneFor(key, thing)!;
      const word = layout.kind === "row" ? layout.parts.find((p) => p.word)?.glyph : layout.host;
      expect(word, key).toBe("🏠");
    }
  });

  it("says they of a person and it of a thing, which is the rule for every human emoji", () => {
    let people = 0;
    for (const key of MAP_CASES) {
      for (const word of [thing, person, five]) {
        const scene = sceneFor(key, word);
        if (!scene) continue;
        if (humansIn(scene.layout).length > 0) {
          people++;
          expect(scene.ask, key).toMatch(/\bthey\b/);
          expect(scene.ask, key).not.toMatch(/\bit\b/);
        } else {
          expect(scene.ask, key).not.toMatch(/\bthey\b/);
        }
      }
    }
    expect(people).toBeGreaterThan(0);
  });

  it("asks nothing of a word with no emoji, and asks the terminative only of an hour", () => {
    expect(sceneFor("ILLATIVE", { ...thing, glyph: null })).toBeNull();
    expect(sceneFor("TERMINATIVE", thing)).toBeNull();
    const until = sceneFor("TERMINATIVE", five)!;
    expect(until.ask).toBe("Until when?");
    expect(until.layout.kind === "row" && until.layout.parts.map((p) => p.glyph)).toEqual([ARROW, "5️⃣", "🕔"]);
  });

  it("draws the essive and the three principal forms nowhere", () => {
    for (const key of ["ESSIVE", "NOMINATIVE", "GENITIVE", "PARTITIVE"] as CaseKey[]) {
      expect(MAP_CASES).not.toContain(key);
      expect(sceneFor(key, thing)).toBeNull();
    }
  });

  it("covers ten cases and every one of them is a real case", () => {
    expect(MAP_CASES).toHaveLength(10);
    for (const key of MAP_CASES) expect(CASES.some((c) => c.key === key)).toBe(true);
  });

  it("turns the outside trio into a present for a person, and a box for a thing", () => {
    expect(sceneFor("ADESSIVE", thing)!.ask).toBe("Where is it?");
    expect(sceneFor("ADESSIVE", person)!.ask).toBe("Who has it?");
    expect(sceneFor("ALLATIVE", person)!.ask).toBe("Who is it going to?");
  });

  it("asks three different things of the three moves of a place", () => {
    const asks = (["INESSIVE", "ELATIVE", "ILLATIVE"] as const).map((k) => sceneFor(k, thing)!.ask);
    expect(new Set(asks).size).toBe(3);
  });

  it("never draws a word with the same emoji as its companion", () => {
    expect(sceneFor("ADESSIVE", { ...person, glyph: GIFT })).toBeNull();
  });

  it("has a Russian and a Ukrainian line for every question and description it can show", () => {
    let lines = 0;
    for (const key of MAP_CASES) {
      for (const word of [thing, person, five]) {
        const scene = sceneFor(key, word);
        if (!scene) continue;
        for (const line of [scene.ask, scene.alt]) {
          lines++;
          expect(RU[line], `ru: ${line}`).toBeTruthy();
          expect(UK[line], `uk: ${line}`).toBeTruthy();
        }
      }
    }
    expect(lines).toBeGreaterThan(0);
  });

  it("draws every hour from one to twelve", () => {
    for (let h = 1; h <= 12; h++) expect(hourGlyph(h), String(h)).not.toBeNull();
    expect(hourGlyph(0)).toBeNull();
  });
});

describe("trioOf", () => {
  it("pairs each local case with the other two of its own set", () => {
    expect(trioOf("ELATIVE")).toEqual(["INESSIVE", "ELATIVE", "ILLATIVE"]);
    expect(trioOf("ALLATIVE")).toEqual(["ADESSIVE", "ABLATIVE", "ALLATIVE"]);
    expect(trioOf("COMITATIVE")).toBeNull();
  });
});

describe("pickWrong", () => {
  const word: FormChoice[] = [
    { key: "INESSIVE", text: "toas" }, { key: "ELATIVE", text: "toast" }, { key: "ILLATIVE", text: "tuppa" },
    { key: "COMITATIVE", text: "toaga" }, { key: "TRANSLATIVE", text: "toaks" },
  ];

  it("offers the rest of the trio for a local case, which is the whole exercise", () => {
    const answer = word[2]!;
    const wrong = pickWrong({ answer, others: word.filter((w) => w !== answer), accepted: ["tuppa", "toasse"], nearness, same })!;
    expect(wrong.map((w) => w.key).sort()).toEqual(["ELATIVE", "INESSIVE"]);
    expect(wrong.length + 1).toBe(MAP_OPTIONS);
  });

  it("falls back to the nearest other forms for a case with no trio", () => {
    const answer = word[3]!;
    const wrong = pickWrong({ answer, others: word.filter((w) => w !== answer), accepted: ["toaga"], nearness, same })!;
    expect(wrong).toHaveLength(2);
    expect(wrong.map((w) => w.key)).not.toContain("COMITATIVE");
  });

  it("never offers a spelling the answer also accepts, which would be two right answers", () => {
    const answer = word[2]!;
    const others = [...word.filter((w) => w !== answer), { key: "ADESSIVE" as const, text: "toasse" }];
    const wrong = pickWrong({ answer, others, accepted: ["tuppa", "toasse"], nearness, same })!;
    expect(wrong.map((w) => w.text)).not.toContain("toasse");
  });

  it("never offers two options spelled alike", () => {
    const answer = word[0]!;
    const others: FormChoice[] = [
      { key: "ELATIVE", text: "toas" }, { key: "ILLATIVE", text: "tuppa" }, { key: "COMITATIVE", text: "tuppa" }, { key: "TRANSLATIVE", text: "toaks" },
    ];
    const wrong = pickWrong({ answer, others, accepted: ["toas"], nearness, same })!;
    expect(new Set(wrong.map((w) => w.text.toLowerCase())).size).toBe(wrong.length);
    expect(wrong.map((w) => w.text)).not.toContain("toas");
  });

  it("asks nothing rather than pad a question it cannot fill", () => {
    const answer = word[0]!;
    expect(pickWrong({ answer, others: [{ key: "ELATIVE", text: "toast" }], accepted: ["toas"], nearness, same })).toBeNull();
  });
});

describe("dealByCase", () => {
  const pool = (n: number, key: string) => Array.from({ length: n }, (_, i) => ({ id: `${key}${i}`, word: `${key}${i}` }));

  it("deals the cases in turn, so a rare one is not drowned by a common one", () => {
    const byCase = new Map<CaseKey, { id: string; word: string }[]>([
      ["COMITATIVE", pool(50, "ga")], ["ABLATIVE", pool(3, "lt")], ["INESSIVE", pool(50, "s")],
    ]);
    const dealt = dealByCase(byCase, 9, (x) => x.word);
    expect(dealt).toHaveLength(9);
    expect(dealt.filter((d) => d.id.startsWith("lt"))).toHaveLength(3);
  });

  it("asks a word once, whatever case it comes up under", () => {
    const byCase = new Map<CaseKey, { id: string; word: string }[]>([
      ["INESSIVE", [{ id: "a", word: "tuba" }, { id: "b", word: "maja" }]],
      ["ELATIVE", [{ id: "c", word: "tuba" }, { id: "d", word: "kool" }]],
    ]);
    const dealt = dealByCase(byCase, 10, (x) => x.word);
    expect(new Set(dealt.map((d) => d.word)).size).toBe(dealt.length);
    expect(dealt).toHaveLength(3);
  });

  it("stops at what there is", () => {
    expect(dealByCase(new Map(), 10, () => "")).toEqual([]);
  });
});

describe("rungFrom", () => {
  it("starts every word on the picture, with no history at all", () => {
    expect(rungFrom([])).toBe(1);
  });

  it("climbs one rung for each Good answer and stops at typing", () => {
    expect(rungFrom([3])).toBe(2);
    expect(rungFrom([3, 3])).toBe(3);
    expect(rungFrom([3, 3, 3, 3, 3])).toBe(3);
    expect(rungFrom([4, 4])).toBe(3);
  });

  it("steps down one for anything that was not Good, and never below the picture", () => {
    expect(rungFrom([3, 3, 1])).toBe(2);
    expect(rungFrom([3, 3, 1, 1])).toBe(1);
    expect(rungFrom([1, 1, 1])).toBe(1);
  });

  it("does not climb on a hint-capped answer, which is Hard rather than Good", () => {
    expect(rungFrom([2, 2, 2])).toBe(1);
    expect(rungFrom([3, 2])).toBe(1);
  });

  it("reads only the newest answers, so a long history does not keep a word on the top rung", () => {
    const old = Array.from({ length: 20 }, () => 3);
    expect(rungFrom([...old, 1, 1, 1, 1, 1, 1])).toBe(1);
    expect(RUNG_WINDOW).toBe(6);
  });

  it("is a function of the order, which is the point of a ladder", () => {
    expect(rungFrom([1, 3, 3])).toBe(3);
    expect(rungFrom([3, 3, 1])).toBe(2);
  });
});
