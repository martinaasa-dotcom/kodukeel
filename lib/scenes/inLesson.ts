/**
 * A SCENE PLAYED INSIDE A LESSON: THE ROLE-PLAY AT THE END OF AN A1 PART.
 *
 * A catalogue scene draws its words from whole units of the old course, and
 * every one of them declares the A2 unit for asking and offering, so the
 * engine could not hold a conversation with somebody who has only had the A1
 * lessons. A lesson scene is the same machine with its closed list taken from
 * the lessons instead (docs/43-lessons.md): everything taught through the
 * lesson it belongs to, as the dictionary heads it (`ledgerLemmas`). And the
 * list is a ceiling rather than a budget. Every line the other side can say
 * is held spelling by spelling to that lesson's ledger: a banked one by
 * `lessonScenes.test.ts`, which plays each scene keyless and reads every word
 * said, and a composed one by the gate's `taught` check. So the rule the
 * lessons are built on, that nothing is shown before it is taught, holds in
 * the conversation as well.
 *
 * Pure: no React, no Next, no Prisma, no clock.
 */
import { LESSONS, ledgerLemmas, ledgerThrough, untaughtIn, wordsOf, type Ledger } from "@/lib/course/lessons";
import type { GateContext } from "./gate";
import type { Lexicon } from "./lexicon";
import type { SceneSpec } from "./types";

/** A scene, with its word list read off the lessons through `lesson`. */
export function inLesson(lesson: string, spec: Omit<SceneSpec, "units" | "lemmas" | "lesson">): SceneSpec {
  const ledger = ledgerThrough(LESSONS, lesson);
  if (!ledger) throw new Error(`The scene ${spec.id} names lesson ${lesson}, which no list holds.`);
  return { ...spec, units: [], lemmas: ledgerLemmas(ledger), lesson };
}

/** Each lesson's ledger, built once: the context is built on every turn and the ledger is a walk over the level. */
const LEDGERS = new Map<string, Ledger | null>();
function ledgerOf(lesson: string): Ledger | null {
  if (!LEDGERS.has(lesson)) LEDGERS.set(lesson, ledgerThrough(LESSONS, lesson));
  return LEDGERS.get(lesson) ?? null;
}

/**
 * WHAT THE GATE IS HANDED ON A SCENE PLAYED INSIDE A LESSON, AND NOTHING ON
 * ANY OTHER. Read by the app's context and by the harness's alike, so the two
 * hold a line to one rule.
 *
 * `untaught` is the `taught` check. `vouched` widens what counts as Estonian
 * by the lessons' own words, phrase words included: `Tere õhtust!` is taught
 * as a phrase, so `õhtust` is a word the lessons put in front of the learner
 * and that the dictionary heads under no lemma of its own, and every spelling
 * a lesson shows is already held to the forms list by `lessons.test.ts`. A
 * lesson the list does not hold refuses every word rather than none, which is
 * the safe way to be wrong.
 */
export function lessonGate(scene: SceneSpec, lexicon: Lexicon): Pick<GateContext, "untaught" | "vouched"> | Record<string, never> {
  if (!scene.lesson) return {};
  const ledger = ledgerOf(scene.lesson);
  if (!ledger) return { untaught: (text: string) => wordsOf(text).map((w) => w.raw) };
  const taught = new Set<string>(ledger.spellings);
  for (const phrase of ledger.phrases) for (const word of phrase) taught.add(word);
  return {
    untaught: untaughtIn(ledger),
    vouched: (word: string) => lexicon.forms.has(word) || taught.has(word),
  };
}
