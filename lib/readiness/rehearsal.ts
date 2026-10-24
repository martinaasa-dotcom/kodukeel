import { SCENES } from "@/lib/scenes/catalogue";
import type { SceneSpec } from "@/lib/scenes/types";

/**
 * THE CONVERSATION THAT CAN PROVE AN EAR FOR A SITUATION (docs/44-sixth-batch.md, C-4).
 *
 * Since VB-14, ten conversation turns said aloud to a line only heard, at or
 * above a situation's band, count as evidence that a learner can follow
 * speech there (`HEARD_TURNS_FOR_EAR` in `rungs.ts`). The situation page used
 * to send somebody one conversation short of the top rung to a test. This
 * finds the conversation to send them to instead: a scene whose declared units
 * include the situation's own unit, read off the scene specs the way
 * `sceneForErrand` reads an errand's, never typed into a second table.
 *
 * Where several fit, the one the learner has played least, since a second
 * run of a scene they know by heart is the weaker evidence of following
 * speech; a tie goes to the scene that tests this very situation, then to the
 * catalog's order, which puts the plainer rooms first. Where none fits, null,
 * and the level check stays the way through.
 *
 * Pure: the catalog is pure, and the play counts arrive from the page.
 */

/** Every catalog scene whose declared units include this situation's unit, in catalog order. */
export function scenesRehearsing(situationId: string, scenes: readonly SceneSpec[] = SCENES): SceneSpec[] {
  return scenes.filter((scene) => scene.units.includes(situationId));
}

/**
 * The conversation to offer for an ear, or null.
 *
 * `plays` is how many times the learner has had each scene, by id; a scene
 * missing from it has never been played.
 */
export function sceneForEar(
  situationId: string,
  plays: ReadonlyMap<string, number>,
  scenes: readonly SceneSpec[] = SCENES,
): SceneSpec | null {
  const fits = scenesRehearsing(situationId, scenes);
  let best: SceneSpec | null = null;
  let bestKey: readonly number[] = [];
  for (const [order, scene] of fits.entries()) {
    const key = [plays.get(scene.id) ?? 0, scene.tests === situationId ? 0 : 1, order];
    if (best === null || compare(key, bestKey) < 0) {
      best = scene;
      bestKey = key;
    }
  }
  return best;
}

function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
