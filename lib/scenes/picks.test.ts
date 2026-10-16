import { describe, expect, it } from "vitest";
import { SCENES } from "./catalogue";
import { planRun, fitsIn, notBeforeIn } from "./run";
import { hurdleBeat, isOver } from "./state";
import { words } from "./lexicon";
import { buildPick, literalOf, pickSpecsFor, picksFor, slotsOf } from "./picks";
import { acceptFromRows, contextFromRows, replay, sceneLemmas, type Row, type SentTurn, type StoredDraw } from "@/lib/progress/scene";
import { shippedDictionary } from "../../scripts/lib/dictionary";
import type { SceneSpec } from "./types";

/**
 * EVERY PICK IS A RIGHT ANSWER, AND EVERY BEAT HAS SOME.
 *
 * A pick is offered as the thing to say, so a pick the app's own reader would
 * refuse is the app marking its own suggestion wrong. Each scene is walked with
 * the shipped dictionary, keyless, against several dealt cards: at every beat
 * each pick is tried and the beat has to be met by it, and the walk goes on
 * with the first. Then each curveball the scene admits is raised and answered
 * by its picks. The words are held too: every literal word in a pick is a form
 * of the scene's own dictionary, so a pick cannot bring in vocabulary.
 */

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
}));

const SEEDS = ["picks-a", "picks-b", "picks-c", "picks-d"];
const MIN_PICKS = 2;
const MAX_PICKS = 3;
const ESTONIAN = /[õäöüšž]/i;

function contextFor(scene: SceneSpec) {
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), "A2");
  return { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
}

/** The beat a learner is answering now: a standing curveball's, else the scene's own. */
function beatInPlay(scene: SceneSpec, state: ReturnType<typeof replay>["state"]) {
  return state.hurdle ? hurdleBeat(state.hurdle) : scene.beats[state.beat];
}

describe.each(SCENES.map((s) => [s.id, s] as const))("picks in %s", (_id, scene) => {
  const context = contextFor(scene);

  it("has two or three picks on every beat, each with its English", () => {
    for (const beat of scene.beats) {
      const specs = pickSpecsFor(scene, beat.id);
      expect(specs.length, `${beat.id} has ${specs.length} picks`).toBeGreaterThanOrEqual(MIN_PICKS);
      expect(specs.length, `${beat.id} has ${specs.length} picks`).toBeLessThanOrEqual(MAX_PICKS);
      for (const spec of specs) {
        expect(spec.en.trim().length, `${beat.id}: "${spec.et}" has no English`).toBeGreaterThan(0);
        expect(spec.en, `${beat.id}: the English of "${spec.et}" holds an Estonian letter`).not.toMatch(ESTONIAN);
        expect(new Set(specs.map((s) => s.et)).size, `${beat.id} offers one line twice`).toBe(specs.length);
      }
    }
  });

  it("writes no word the scene's own dictionary does not hold, and names only slots on its card", () => {
    const slots = new Set(scene.props.map((p) => p.slot));
    const ids = [...scene.beats.map((b) => b.id), ...scene.curveballs.map((c) => `hurdle:${c}`)];
    for (const id of ids) {
      for (const spec of pickSpecsFor(scene, id)) {
        for (const word of words(literalOf(spec.et))) {
          expect(context.lexicon.forms.has(word), `${id}: "${word}" in "${spec.et}" is not a form the scene holds`).toBe(true);
        }
        for (const { slot } of [...slotsOf(spec.et), ...slotsOf(spec.en)]) {
          expect(slots.has(slot), `${id}: "${spec.et}" names {${slot}}, which the card does not deal`).toBe(true);
        }
      }
    }
  });

  it.each(SEEDS)("meets every beat with every pick, and finishes the scene, on the card dealt by %s", (seed) => {
    const run = planRun(scene, seed, "A2", "textbook");
    const draw: StoredDraw = { persona: run.persona.id, card: run.card, curveballs: [], lines: "scripted", patience: run.patience };
    const turns: SentTurn[] = [];
    let state = replay(context, draw, turns).state;
    for (let guard = 0; guard < scene.beats.length + 2 && !isOver(scene, state); guard++) {
      const beat = beatInPlay(scene, state);
      if (!beat) break;
      const picks = picksFor(scene, beat, run.card, context.lexicon);
      expect(picks.length, `${beat.id} built no pick on ${seed}'s card`).toBeGreaterThanOrEqual(MIN_PICKS);
      for (const pick of picks) {
        const tried = replay(context, draw, [...turns, { beatId: beat.id, said: pick.et, helped: false, heard: "" }]).state;
        expect(tried.done, `"${pick.et}" does not meet ${beat.id} on ${seed}'s card`).toContain(beat.id);
      }
      turns.push({ beatId: beat.id, said: picks[0]!.et, helped: false, heard: "" });
      state = replay(context, draw, turns).state;
    }
    expect(isOver(scene, state), `picking the first line every time does not finish ${scene.id}`).toBe(true);
    for (const beat of scene.beats.filter((b) => b.required)) expect(state.done).toContain(beat.id);
  });

  it("answers every curveball it admits with picks the reader counts as dealing with it", () => {
    const run = planRun(scene, "picks-curveballs", "A2", "textbook");
    const fits = fitsIn(scene);
    const notBefore = notBeforeIn(scene);
    for (const id of scene.curveballs) {
      const at = scene.beats.findIndex((_, i) => i >= Math.max(1, notBefore(id)) && fits(id, i));
      if (at < 0) continue;
      const specs = pickSpecsFor(scene, `hurdle:${id}`);
      const beat = hurdleBeat({ id, beat: at, tries: 0 });
      // A curveball that asks nothing of the learner needs no pick.
      if (!beat || beat.needs.length === 0) continue;
      expect(specs.length, `${id} has no picks, in the scene or shared`).toBeGreaterThanOrEqual(MIN_PICKS);
      const draw: StoredDraw = { persona: run.persona.id, card: run.card, curveballs: [{ id, at }], lines: "scripted", patience: run.patience };
      const turns: SentTurn[] = [];
      let state = replay(context, draw, turns).state;
      for (let guard = 0; guard < at + 2 && !state.hurdle; guard++) {
        const own = scene.beats[state.beat];
        if (!own) break;
        const first = picksFor(scene, own, run.card, context.lexicon)[0];
        if (!first) break;
        turns.push({ beatId: own.id, said: first.et, helped: false, heard: "" });
        state = replay(context, draw, turns).state;
      }
      if (!state.hurdle) continue;
      for (const spec of specs) {
        const built = buildPick(spec, run.card, context.lexicon);
        expect(built, `${id}: "${spec.et}" does not build on this card`).not.toBeNull();
        const tried = replay(context, draw, [...turns, { beatId: `hurdle:${id}`, said: built!.et, helped: false, heard: "" }]).state;
        expect(tried.hurdles.find((h) => h.id === id)?.met, `"${built!.et}" does not deal with ${id} in ${scene.id}`).toBe(true);
      }
    }
  });
});
