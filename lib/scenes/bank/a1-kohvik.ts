/* The prepared lines of a lesson scene, typed in a session rather than drafted
   (model `authored`), for the deployment with no model and as the net under one.
   Every word of every row is one the lessons have taught by the scene's own
   lesson, which `lessonScenes.test.ts` asserts by playing the scene through the
   app's own reply and reading every word said, and every row passes the same
   checks in lib/scenes/gate.ts as any banked line. Read by the native Estonian
   speaker in the pull request that adds it (ADR-025 amendment 1). */
import type { ScriptedLine } from "../scripted";

/** The prepared lines of `a1-kohvik`. */
const LINES: readonly ScriptedLine[] = [
  { scene: "a1-kohvik", beat: "greet", text: "Tere õhtust!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "greet", text: "Tere!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "order", text: "Mida soovite?", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "order", text: "Mida te soovite?", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "more", text: "Kas veel midagi?", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "more", text: "Kas soovite veel?", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "price", text: "Palun!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "price", text: "Palun, see on teile.", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "close", text: "Aitäh! Head aega!", model: "authored", draftedAt: "2026-10-17" },
  { scene: "a1-kohvik", beat: "close", text: "Aitäh, nägemist!", model: "authored", draftedAt: "2026-10-17" },
];

export default LINES;
