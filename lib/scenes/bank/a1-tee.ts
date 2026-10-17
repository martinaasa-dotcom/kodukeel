/* The prepared lines of a lesson scene, typed in a session rather than drafted
   (model `authored`), for the deployment with no model and as the net under one.
   Every word of every row is one the lessons have taught by the scene's own
   lesson, which `lessonScenes.test.ts` asserts by playing the scene through the
   app's own reply and reading every word said, and every row passes the same
   checks in lib/scenes/gate.ts as any banked line. Read by the native Estonian
   speaker in the pull request that adds it (ADR-025 amendment 1). */
import type { ScriptedLine } from "../scripted";

/** The prepared lines of `a1-tee`. */
const LINES: readonly ScriptedLine[] = [
  { scene: "a1-tee", beat: "greet", text: "Tere!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "greet", text: "Tere päevast!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "where", text: "Jah?", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "where", text: "Jah, palun?", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "way", text: "Otse, siis paremale.", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "way", text: "Otse, siis vasakule.", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "way", text: "See on otse.", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "answer:far", text: "Ei, see on lähedal.", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "answer:far", text: "See ei ole kaugel.", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "close", text: "Palun! Head aega!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-tee", beat: "close", text: "Head aega!", model: "authored", draftedAt: "2026-10-17" },
];

export default LINES;
