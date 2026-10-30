/**
 * THE CONVERSATIONS PLAYED INSIDE A LESSON.
 *
 * Kept off the catalog on purpose: `SCENES` is what the situations page
 * lists for anybody to choose, and these belong to the lesson whose role-play
 * they are (`SceneSpec.lesson`). A lesson still in preview keeps its scene in
 * preview with it, open to a reviewer only, as the lesson is (`lessonOrPreview`
 * in `app/actions.ts`). `sceneById` reads this list
 * after the catalog, so a run, the route and the debrief treat one exactly
 * like any other scene.
 */
import type { SceneSpec } from "./types";
import A1_TREPIL from "./specs/a1-trepil";
import A1_KURSUS from "./specs/a1-kursus";
import A1_PLAAN from "./specs/a1-plaan";
import A1_KOHVIK from "./specs/a1-kohvik";
import A1_TEE from "./specs/a1-tee";
import A1_MUTSIPOOD from "./specs/a1-mutsipood";
import A1_NADAL from "./specs/a1-nadal";
import A1_KUTSE from "./specs/a1-kutse";
import A2_RAAMATUKOGU from "./specs/a2-raamatukogu";
import A2_LINNAS from "./specs/a2-linnas";
import A2_SUVI from "./specs/a2-suvi";
import A2_ARST from "./specs/a2-arst";
import A2_PILETIKASSA from "./specs/a2-piletikassa";
import A2_RESTORAN from "./specs/a2-restoran";
import A2_INTERVJUU from "./specs/a2-intervjuu";
import A2_VANA_SOBER from "./specs/a2-vana-sober";
import B1_VAIDLUS from "./specs/b1-vaidlus";
import B1_UHISTU from "./specs/b1-uhistu";
import B1_PALGATOUS from "./specs/b1-palgatous";
import B1_MEISTER from "./specs/b1-meister";
import B1_TAGATIS from "./specs/b1-tagatis";
import B1_EKSAM from "./specs/b1-eksam";
import B1_KOLLEEG from "./specs/b1-kolleeg";

export const LESSON_SCENES: readonly SceneSpec[] = [
  A1_TREPIL, A1_KURSUS, A1_PLAAN, A1_KOHVIK, A1_TEE, A1_MUTSIPOOD, A1_NADAL, A1_KUTSE,
  A2_RAAMATUKOGU, A2_LINNAS, A2_SUVI, A2_ARST, A2_PILETIKASSA, A2_RESTORAN, A2_INTERVJUU, A2_VANA_SOBER,
  B1_VAIDLUS,
  B1_UHISTU,
  B1_PALGATOUS,
  B1_MEISTER,
  B1_TAGATIS,
  B1_EKSAM,
  B1_KOLLEEG,
];

/** The conversation a lesson's role-play opens, if it has one. */
export function sceneForLesson(lessonId: string): SceneSpec | undefined {
  return LESSON_SCENES.find((scene) => scene.lesson === lessonId);
}
