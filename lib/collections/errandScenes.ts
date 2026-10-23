/**
 * WHICH SCENE REHEARSES AN ERRAND, AND WHICH ERRAND A SCENE REHEARSES.
 *
 * Kept out of `lib/collections/errands.ts` because these two read the scene
 * catalog, and Today's errand card is a client component that imports that
 * module for its labels: with the lookups in it, the home page downloaded every
 * scene the course has and every A1 lesson behind them, about 100 KB gzipped,
 * to draw a link. The card is handed the scene id by the server instead.
 */

import { SCENES, sceneById } from "@/lib/scenes/catalogue";
import { ERRANDS, type Errand } from "@/lib/collections/errands";

/**
 * The scene an errand rehearses, or nothing.
 *
 * Resolved here rather than by the screen so a stale id fails the test in
 * `errands.test.ts` rather than rendering a link to a page that is not there.
 */
export function sceneForErrand(errand: Errand) {
  return errand.scene === undefined ? undefined : sceneById(errand.scene);
}

/**
 * The errand a scene was rehearsing, for the debrief.
 *
 * The first one that names the scene, which is a choice only where two do
 * (`bread` and `price` both go to the shop), and the first is the plainer
 * ask. A scene with none returns nothing rather than the day's errand, since
 * "now go and do it" has to be about the thing just rehearsed.
 */
export function errandForScene(sceneId: string): Errand | undefined {
  if (!SCENES.some((s) => s.id === sceneId)) return undefined;
  return ERRANDS.find((e) => e.scene === sceneId);
}
