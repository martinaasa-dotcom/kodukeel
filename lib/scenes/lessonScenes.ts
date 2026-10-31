/**
 * THE CONVERSATIONS PLAYED INSIDE A LESSON.
 *
 * Kept off the catalog on purpose: `SCENES` is what the situations page
 * lists for anybody to choose, and these belong to the lesson whose role-play
 * they are (`SceneSpec.lesson`). A lesson still in preview keeps its scene in
 * preview with it, open to a reviewer only, as the lesson is: `beginSceneFor`
 * refuses one (`isPreviewScene`) unless its caller says a reviewer is asking,
 * which only the web door can know. `sceneById` reads this list after the
 * catalog, so a run, the route and the debrief treat one exactly like any
 * other scene once it has been opened.
 */
import { LESSONS } from "@/lib/course/lessons";
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
import B2_OHTUSOOK from "./specs/b2-ohtusook";
import B2_PEREARST from "./specs/b2-perearst";
import B2_TEADE from "./specs/b2-teade";

export const LESSON_SCENES: readonly SceneSpec[] = [
  A1_TREPIL, A1_KURSUS, A1_PLAAN, A1_KOHVIK, A1_TEE, A1_MUTSIPOOD, A1_NADAL, A1_KUTSE,
  A2_RAAMATUKOGU, A2_LINNAS, A2_SUVI, A2_ARST, A2_PILETIKASSA, A2_RESTORAN, A2_INTERVJUU, A2_VANA_SOBER,
  B1_MEISTER, B1_KOLLEEG, B1_PALGATOUS, B1_TAGATIS, B1_UHISTU, B1_VAIDLUS, B1_EKSAM,
  B2_OHTUSOOK,
  B2_PEREARST,
  B2_TEADE,
];

/** The conversation a lesson's role-play opens, if it has one. */
export function sceneForLesson(lessonId: string): SceneSpec | undefined {
  return LESSON_SCENES.find((scene) => scene.lesson === lessonId);
}

/**
 * Whether a scene belongs to a lesson still in preview: one whose lesson is
 * not in the course (`LESSONS`). Such a scene is opened by a reviewer and by
 * nobody else, the way the lesson is (`beginSceneFor` asks this).
 */
export function isPreviewScene(scene: Pick<SceneSpec, "lesson">): boolean {
  return Boolean(scene.lesson) && !COURSE_LESSON_IDS.has(scene.lesson!);
}

const COURSE_LESSON_IDS: ReadonlySet<string> = new Set(LESSONS.map((l) => l.id));
