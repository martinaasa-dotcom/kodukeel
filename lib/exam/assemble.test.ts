import { describe, expect, it } from "vitest";

import { dictionaryRows } from "../../scripts/lib/dictionary";
import { usableExamples } from "@/lib/dict/examples";
import { orderContextFrom } from "@/lib/estonian/wordOrder";
import { assemblePaper } from "./assemble";
import type { Paper, PoolWord } from "./paper";
import { POOL_SIZE, drawStablePool, eligibleFor, poolForSeed } from "./pool";
import { buildReport } from "./report";
import { markPaper } from "./score";
import { freshSeed, numberedSeed } from "./seed";

/*
  Over the shipped dictionary rather than a fixture, because what this asserts
  is that a numbered paper is the same paper on two evenings, and a fixture of
  forty invented words is too small for a draw to have anything to disagree
  about. Drawn the way the app draws, through `poolForSeed`.
*/
const entries = dictionaryRows();
const WORD_ORDER = orderContextFrom(entries);
const ordered = [...entries].sort((a, b) =>
  `${a.lemma}|${a.pos}` < `${b.lemma}|${b.pos}` ? -1 : `${a.lemma}|${a.pos}` > `${b.lemma}|${b.pos}` ? 1 : 0);
const byId = new Map<string, (typeof ordered)[number]>(ordered.map((e) => [`${e.lemma}|${e.pos}`, e] as const));

function paperFor(seed: string): Paper {
  const rows = ordered.filter((e) => eligibleFor("B1", e.cefr ?? null)).map((e) => ({ id: `${e.lemma}|${e.pos}`, cefr: e.cefr ?? null }));
  const pool: PoolWord[] = poolForSeed(rows, "B1", seed).map((id) => {
    const e = byId.get(id)!;
    return {
      lexemeId: id, lemma: e.lemma, translation: e.translation, pos: e.pos, cefr: e.cefr,
      semanticTypes: e.semanticTypes ?? null,
      forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null, morphName: null })),
      examples: usableExamples((e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null, source: "EKILEX" as const })))
        .map((x) => ({ et: x.et, en: x.en ?? null })),
      government: e.government, cardId: null,
    };
  });
  return assemblePaper("B1", pool, seed, WORD_ORDER);
}

const questions = (paper: Paper) =>
  paper.parts.flatMap((p) => p.tasks.flatMap((t) => t.items.map((i) => JSON.stringify(i))));

const MONDAY = new Date("2026-09-21T18:00:00Z");
const FRIDAY = new Date("2026-09-25T18:00:00Z");

describe("the numbered set", () => {
  it("shares no more between neighbouring pools than chance, over the real dictionary", () => {
    const rows = ordered.filter((e) => eligibleFor("B1", e.cefr ?? null)).map((e) => ({ id: `${e.lemma}|${e.pos}`, cefr: e.cefr ?? null }));
    for (let n = 1; n < 12; n++) {
      const here = new Set(drawStablePool(rows, "B1", `set-${n}`));
      const next = drawStablePool(rows, "B1", `set-${n + 1}`);
      // Two random pools of 500 share about a quarter here, because half of
      // each is drawn from the thousand B1 words.
      expect(next.filter((id) => here.has(id)).length / POOL_SIZE, `set-${n} and set-${n + 1}`).toBeLessThan(0.35);
    }
  });
});

describe("a numbered paper", () => {
  it("is the same paper whenever it is sat, and keeps the seed it was sat under", () => {
    const monday = paperFor(numberedSeed(7, null, MONDAY));
    const friday = paperFor(numberedSeed(7, null, FRIDAY));
    expect(monday.number).toBe(7);
    expect(questions(monday).length).toBeGreaterThan(20);
    expect(questions(friday)).toEqual(questions(monday));
    expect(friday.seed).toBe(numberedSeed(7, null, FRIDAY));
  });

  it("is a different paper from its neighbour", () => {
    expect(questions(paperFor(numberedSeed(8, null, MONDAY)))).not.toEqual(questions(paperFor(numberedSeed(7, null, MONDAY))));
  });

  it("sets one part as exactly that part of the whole paper, nothing more", () => {
    const whole = paperFor(numberedSeed(7, null, MONDAY));
    const reading = paperFor(numberedSeed(7, "reading", FRIDAY));
    expect(reading.part).toBe("reading");
    expect(reading.parts.map((p) => p.spec.skill)).toEqual(["reading"]);
    expect(questions(reading)).toEqual(questions({ ...whole, parts: whole.parts.filter((p) => p.spec.skill === "reading") }));
  });

  it("marks one part as a mark for that part, never as the examination passed or failed", () => {
    const reading = paperFor(numberedSeed(7, "reading", FRIDAY));
    const result = markPaper(reading, new Map());
    expect(result.part).toBe("reading");
    expect(result.parts).toHaveLength(1);
    expect(result.waitBeforeResit).toBe(false);
    const report = buildReport(result);
    expect(report.headline).toMatch(/^Reading on its own/);
    expect(report.consequence).not.toMatch(/six months|certificate/);
  });

  it("leaves a random paper exactly as it was built before numbered papers existed", () => {
    const seed = freshSeed(MONDAY, () => 0.25);
    const paper = paperFor(seed);
    expect(paper.number).toBeUndefined();
    expect(paper.part).toBeUndefined();
    expect(paper.parts).toHaveLength(4);
  });
});
