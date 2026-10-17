import type { Level } from "@/lib/collections/syllabus";
import { pickSpecsFor, slotsOf } from "./picks";
import { scriptable, scriptedFor } from "./scripted";
import type { SceneSpec } from "./types";

/**
 * WHAT A LEARNER MAY HEAR AND SAY BEFORE A CONVERSATION BEGINS (docs/41-fifth-batch.md, VB-4).
 *
 * Two moments rehearse a scene without starting one. The briefing offers "Hear
 * them first": the other side's opening lines, played one at a time so the
 * learner can say them along. And on a day Today offers an errand a scene
 * rehearses, "Say it once before you go": the scene's first line, and then the
 * learner's own opening line said aloud.
 *
 * NOTHING HERE IS NEW ESTONIAN (D10). Every line is one the scene bank already
 * holds, gated and read (`lib/scenes/scripted.ts`), or one of batch 4's picks
 * that carries no value off a card, which is a line a person wrote and the
 * dictionary vouches for (`lib/scenes/picks.ts`). Nothing is marked: a bank
 * line here is shown and spoken, never graded, which stays inside the bank's
 * own rule, and saying a line you can see is the bridge to saying your own
 * rather than a recall.
 *
 * Pure: no React, no Next, no Prisma, no clock.
 */

/** How many of the other side's lines "Hear them first" plays. Enough to hear the shape of the opening, not the scene. */
export const OPENING_LINES = 3;

/**
 * The other side's first lines, in the order they would say them, at the
 * learner's band where the bank holds one and the band's own fallbacks where it
 * does not (`scriptedFor`). A beat whose line names a value off the card cannot
 * be said before a card is dealt, and a beat that waits says nothing first, so
 * both are passed over rather than given a line nobody would hear in the scene.
 */
export function openingLines(scene: SceneSpec, level: Level, count = OPENING_LINES): string[] {
  const out: string[] = [];
  for (const beat of scene.beats) {
    if (out.length >= count) break;
    if (beat.awaits || !scriptable(scene, beat)) continue;
    const line = scriptedFor(scene, beat, level)[0];
    if (line && !out.includes(line)) out.push(line);
  }
  return out;
}

/** The two lines of an errand's rehearsal: theirs, from the bank, and the learner's own opening line, with its English. */
export interface ErrandRehearsal {
  readonly sceneId: string;
  readonly theirs: string;
  readonly yours: { readonly et: string; readonly en: string };
}

/**
 * The scene's first line and the learner's answer to it, or nothing where the
 * scene cannot offer both.
 *
 * The answer is the first pick written for the first beat that needs nothing
 * off a card, which is "Tere!" at a café counter: a line on a card nobody has
 * been dealt would be a sentence about a drink this learner never chose.
 */
export function errandRehearsal(scene: SceneSpec, level: Level): ErrandRehearsal | null {
  const first = scene.beats.find((beat) => !beat.awaits && scriptable(scene, beat));
  if (!first) return null;
  const theirs = scriptedFor(scene, first, level)[0];
  if (!theirs) return null;
  const yours = pickSpecsFor(scene, first.id).find((spec) => slotsOf(spec.et).length === 0);
  if (!yours) return null;
  return { sceneId: scene.id, theirs, yours: { et: yours.et, en: yours.en } };
}
