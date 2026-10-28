/**
 * WHICH POINTS OF A STORY CAME ACROSS (B1 on, `components/course/RetellIt.tsx`).
 *
 * A point is lit where any of its spellings stands in what was said as whole
 * words, the Estonian way lower-cased, and with diacritics as they are: a
 * retelling heard as `paranda` rather than `parandas` is a different word,
 * and saying so is the honest reading of what came across. Multi-word
 * spellings (`oli parandatud`) have to stand together.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { standsIn } from "./ledger";
import type { Retell } from "./types";

export function pointsHeard(retell: Pick<Retell, "points">, said: string): boolean[] {
  return retell.points.map((point) => point.any.some((et) => standsIn(said, et)));
}
