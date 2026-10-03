/**
 * A mock exam's pool, drawn from the shipped dictionary the way the app draws
 * it from the database.
 *
 * `lib/progress/exam.ts` draws five hundred eligible entries with
 * `poolForSeed` and then adds the course words the paper's written and spoken
 * tasks are about (`planLemmas`). A test or a measurement that draws the first
 * half alone builds a paper the app never builds: its writing tasks have
 * almost nothing on topic to ask for. One helper, so the suites and the scripts
 * cannot draw it two ways.
 */
import { dictionaryRows, type DictionaryRow } from "./dictionary";
import { usableExamples } from "@/lib/dict/examples";
import { planLemmas, type PoolWord } from "@/lib/exam/paper";
import { eligibleFor, poolForSeed } from "@/lib/exam/pool";
import type { ExamLevel } from "@/lib/exam/spec";

let ordered: (DictionaryRow & { id: string })[] | null = null;

function rows(): (DictionaryRow & { id: string })[] {
  if (ordered) return ordered;
  ordered = dictionaryRows()
    .map((e) => ({ ...e, id: `${e.lemma}|${e.pos}` }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return ordered;
}

export function asPoolWord(e: DictionaryRow & { id: string }): PoolWord {
  return {
    lexemeId: e.id, lemma: e.lemma, translation: e.translation, pos: e.pos, cefr: e.cefr,
    semanticTypes: e.semanticTypes ?? null,
    forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null, morphName: null })),
    examples: usableExamples((e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null, source: "EKILEX" as const })))
      .map((x) => ({ et: x.et, en: x.en ?? null })),
    government: e.government, cardId: null,
  };
}

export function shippedPool(level: ExamLevel, seed: string): PoolWord[] {
  const eligible = rows().filter((e) => eligibleFor(level, e.cefr ?? null));
  const byId = new Map(eligible.map((e) => [e.id, e] as const));
  const drawn = poolForSeed(eligible.map((e) => ({ id: e.id, cefr: e.cefr ?? null })), level, seed);
  const inDraw = new Set(drawn);
  const wanted = new Set(planLemmas(level, seed));
  const topical = eligible.filter((e) => wanted.has(e.lemma) && !inDraw.has(e.id)).map((e) => e.id);
  return [...drawn, ...topical].map((id) => asPoolWord(byId.get(id)!));
}
