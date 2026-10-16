/**
 * WHY A BANK LINE WOULD BE REFUSED, ASKED THE ONE WAY.
 *
 * `npm run check:lines` asks it of lines somebody typed, and
 * `npm run apply:scene-review` asks it of a reviewer's correction before the
 * correction may replace a line in the bank. One function, because a line the
 * checker passes and the importer refuses, or the other way round, is two
 * answers to whether a line may be said.
 *
 * The four checks in `lib/scenes/gate.ts` against the scene's own word list
 * (`gateFor`, as the route runs them), and the drafter's own refusals: no
 * digit, no dash or colon, not the form the beat is about to ask for, a verb
 * where the beat wants a clause, and never the way out.
 */
import { SCENES, FALLBACK_PHRASE } from "../../lib/scenes/catalogue";
import { gateFor, runGate } from "../../lib/scenes/gate";
import { words } from "../../lib/scenes/lexicon";
import { beatById } from "../../lib/scenes/scripted";
import { answerForms, keylessContext, lacksFiniteVerb } from "./sceneDraft";

type Context = ReturnType<typeof keylessContext>;
const contexts = new Map<string, Context>();

function contextFor(sceneId: string): Context | null {
  const scene = SCENES.find((s) => s.id === sceneId);
  if (!scene) return null;
  let context = contexts.get(sceneId);
  if (!context) {
    context = keylessContext(scene);
    contexts.set(sceneId, context);
  }
  return context;
}

/** What would refuse `text` on this beat, or nothing. "no such beat" where there is none. */
export function lineRefusals(sceneId: string, beatId: string, text: string): string[] {
  const scene = SCENES.find((s) => s.id === sceneId);
  const beat = scene ? beatById(scene, beatId) : undefined;
  const context = contextFor(sceneId);
  if (!scene || !beat || !context) return ["no such beat"];
  const verdict = runGate(text, beat, gateFor(beatId, context.gate));
  const why = verdict.failed.map((f) => (f === "vouching" ? `vouching [${verdict.unknown.join(" ")}]` : f));
  if (/\d/.test(text)) why.push("digit");
  if (/[–—:;]/.test(text)) why.push("dash or colon");
  if (words(text).some((w) => answerForms(beat, context.lexicon).has(w))) why.push("hands over the answer");
  if (lacksFiniteVerb(text, beat)) why.push("no finite verb");
  if (words(text).join(" ") === words(FALLBACK_PHRASE).join(" ")) why.push("the way out");
  return why;
}
