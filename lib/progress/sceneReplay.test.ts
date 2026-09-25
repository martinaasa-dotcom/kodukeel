import { describe, expect, it } from "vitest";
import { sceneById } from "@/lib/scenes/catalogue";
import { planRun } from "@/lib/scenes/run";
import { contextFromRows, replay, sceneLemmas, type Row } from "./scene";
import { shippedDictionary } from "../../scripts/lib/dictionary";

/*
  AN OFFER IS MADE ON ITS OWN BEAT, SO NO TURN BEFORE IT CAN TAKE IT.

  The look-ahead in `replay` already passed over an offer beat ahead of the
  pointer; the forward cascade did not. Asked since when it has hurt, a
  learner who answered and then asked whether tomorrow would do walked the
  cascade into the offer beat, `sobib` accepted an appointment the
  receptionist had not proposed, and the next line read a time back to
  somebody who had never been given one.
*/
describe("the cascade in replay", () => {
  const rows: Row[] = shippedDictionary().map((e) => ({
    id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
    extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
  }));
  const scene = sceneById("arsti-aeg")!;
  const context = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), "A2");
  const run = planRun(scene, "offer-cascade", "A2", "textbook");
  const draw = { persona: run.persona.id, card: run.card, curveballs: [], lines: "scripted" as const, patience: run.patience };

  const play = (said: readonly string[]) => {
    const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
    let state = replay(context, draw, []).state;
    for (const one of said) {
      turns.push({ beatId: scene.beats[state.beat]?.id ?? "", said: one, helped: false, heard: "" });
      state = replay(context, draw, turns).state;
    }
    return state;
  };

  it("stops in front of an offer the other side has not made", () => {
    expect(scene.beats.map((b) => b.move)).toContain("offer");
    const state = play(["Tere!", "Mul on valu.", "Pea.", "Neljapäevast. Kas homme sobib?"]);
    expect(scene.beats[state.beat]?.move).toBe("offer");
    expect(state.done).not.toContain("offer");
  });
});
