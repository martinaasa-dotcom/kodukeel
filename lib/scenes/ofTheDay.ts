import { dayIndex } from "@/lib/random/dayHash";
import type { SceneSpec } from "./types";

/**
 * TODAY'S CONVERSATION, CHOSEN BY THE DATE.
 *
 * Today names one situation to rehearse, for the same reason it names one word:
 * a menu of fifteen is a decision to make before you can start, and one with a
 * day on it is an invitation. It walks the scenes the way the word of the day
 * walks the dictionary (`dayIndex`, a prime stride, so nothing repeats until
 * every scene has had its turn) and never draws two days alike in a row.
 *
 * WHAT MAY BE OFFERED IS WHAT THE COURSE HAS REACHED. The module deals a
 * conversation only once every unit it draws its words from has been taught,
 * so a learner it holds is offered only those, and `null` units means nobody
 * holds them and every scene is open. Where none is open yet, which is most of
 * A1, there is no conversation to offer and the answer is null rather than a
 * scene whose words the evenings have not handed over.
 *
 * Pure: a day and a catalogue in, a scene out.
 */
export function sceneOfDay(
  day: string,
  scenes: readonly SceneSpec[],
  unitsMet: ReadonlySet<string> | null,
): SceneSpec | null {
  const open = scenes
    .filter((scene) => !unitsMet || scene.units.every((unit) => unitsMet.has(unit)))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (open.length === 0) return null;
  return open[dayIndex(day, "scene-of-the-day", open.length)] ?? null;
}
