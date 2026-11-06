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

/**
 * HOW LONG A FINISHED RETELLING WAITS BEFORE THE MICROPHONE CLOSES ITSELF.
 *
 * A retelling is one turn the learner holds open for as long as the story
 * takes: nothing on the screen closes it while a point is still dark, because
 * a learner moving from one point to the next pauses to think and must not be
 * made to press the microphone again. The one time it closes by itself is
 * once every point has come across and the learner has stopped talking for
 * this long. Longer than the 1.2 s an ordinary turn waits (lib/speech/settings.ts),
 * since somebody who has said everything may still be adding a sentence.
 */
export const RETELL_DONE_QUIET_MS = 1800;

/** The microphone may close itself only with every point lit and the learner quiet. */
export function retellMayStop(lit: readonly boolean[], quietMs: number): boolean {
  return lit.length > 0 && lit.every(Boolean) && quietMs >= RETELL_DONE_QUIET_MS;
}

/**
 * Whether a turn that closed by itself is opened again at once. Only the
 * learner's press and a finished retelling end the telling: a turn that ran
 * into the engine's length cap with a point still dark carries straight on.
 */
export function retellListensOn(why: "pressed" | "silence" | "nothing-said" | "too-long", lit: readonly boolean[]): boolean {
  return why === "too-long" && !lit.every(Boolean);
}
