/**
 * A paper for any seed, random or numbered, whole or one part.
 *
 * `buildPaper` is left exactly as it is, since a paper started before a deploy
 * is rebuilt by it after, to be marked. What a numbered seed changes is only
 * the key it is built with and which of its parts are kept, both decided here,
 * so the page that sets the paper and the action that marks it cannot set two
 * different papers from one seed.
 *
 * Pure.
 */
import type { OrderContext } from "@/lib/estonian/wordOrder";
import { buildPaper, type Paper, type PoolWord } from "./paper";
import { drawKeyOf, numberedOf } from "./seed";
import type { ExamLevel } from "./spec";

export function assemblePaper(
  level: ExamLevel,
  pool: readonly PoolWord[],
  seed: string,
  wordOrder: OrderContext,
): Paper {
  const numbered = numberedOf(seed);
  if (!numbered) return buildPaper(level, pool, seed, wordOrder);

  /*
    Built whole on the number, then cut to the part. Built whole because the
    parts share one draw: the reading of paper 7 has to be the reading a
    learner meets when they sit the whole of paper 7, and building the part
    alone would hand its tasks the words the other three parts would have used.
  */
  const whole = buildPaper(level, pool, drawKeyOf(seed), wordOrder);
  const parts = numbered.part ? whole.parts.filter((p) => p.spec.skill === numbered.part) : whole.parts;
  return {
    ...whole,
    seed,
    number: numbered.number,
    part: numbered.part,
    parts,
    thin: parts.some((p) => p.tasks.some((t) => t.shortfall > 0)),
    substituted: parts.some((p) => p.tasks.some((t) => t.fallbackFrom !== null)),
  };
}
