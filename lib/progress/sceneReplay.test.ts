import { describe, expect, it } from "vitest";
import { sceneById } from "@/lib/scenes/catalogue";
import { planRun } from "@/lib/scenes/run";
import { acceptFromRows, contextFromRows, replay, sceneLemmas, type Row } from "./scene";
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

/*
  A SECOND WORD FOR THE SAME THING ANSWERS THE QUESTION THAT WAS ASKED, NOT
  ONE FURTHER ON. `aeg` and `kord` are both "time" in the dictionary's English,
  so told the time they wanted had gone, a tenant asking `Mis aeg siis sobib?`
  was credited with saying which floor through the beat behind the curveball,
  and the landlord never asked it.
*/
describe("crediting a beat nobody asked yet", () => {
  const rows: Row[] = shippedDictionary().map((e) => ({
    id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
    extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
  }));
  const scene = sceneById("uuri-remont")!;
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), "A2");
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
  const run = planRun(scene, "synonym-ahead", "A2", "textbook");
  const at = scene.beats.findIndex((b) => b.id === "where");
  const draw = { persona: run.persona.id, card: run.card, curveballs: [{ id: "slot-gone", at }], lines: "scripted" as const, patience: run.patience };

  it("never happens through a synonym", () => {
    expect(at).toBeGreaterThan(0);
    const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
    let state = replay(context, draw, []).state;
    for (const one of ["Tere!", "küte", "Mis aeg siis sobib?"]) {
      const target = state.hurdle ? `hurdle:${state.hurdle.id}` : scene.beats[state.beat]?.id ?? "";
      turns.push({ beatId: target, said: one, helped: false, heard: "" });
      state = replay(context, draw, turns).state;
    }
    expect(state.hurdles.map((h) => h.id)).toContain("slot-gone");
    expect(state.done).not.toContain("where");
    expect(scene.beats[state.beat]?.id).toBe("where");
  });
});

/*
  NOTHING IS TAKEN THAT THE OTHER SIDE HAS NOT YET SAID. At the pharmacy a
  learner who mentioned the price in their first turn met "tell them you'll
  take it and pay" two beats early, so the pharmacist never explained how to
  take the medicine, and the learner who then asked how often was told
  `Nägemist!`. A beat whose move is to explain, refuse or correct waits for
  its own line.
*/
describe("a beat that explains something", () => {
  const rows: Row[] = shippedDictionary().map((e) => ({
    id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
    extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
  }));
  const scene = sceneById("apteek")!;
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), "A2");
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
  const run = planRun(scene, "says-first", "A2", "textbook");
  const draw = { persona: run.persona.id, card: run.card, curveballs: [], lines: "scripted" as const, patience: run.patience };

  it("is not met from a distance before it is said", () => {
    const pay = scene.beats.find((b) => b.id === "pay");
    expect(pay?.move).toBe("instruct");
    const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
    let state = replay(context, draw, []).state;
    turns.push({ beatId: scene.beats[state.beat]?.id ?? "", said: "Tere! Mul on kõrv haige. Kas see maksab kuus eurot?", helped: false, heard: "" });
    state = replay(context, draw, turns).state;
    expect(state.done).not.toContain("pay");
  });
});

/*
  A TURN READ IN FRONT OF A CURVEBALL STILL ANSWERS WHAT ELSE IT SAYS.

  Told the price had changed, a learner at the ticket window wrote that they
  would like a bus ticket to the hospital. The ticket was met behind the
  curveball, and the turn stopped there: the clerk asked where they were going
  on the next three turns. The path through a curveball now walks on and looks
  ahead exactly as the ordinary path does.
*/
describe("a turn read in front of a curveball", () => {
  const rows: Row[] = shippedDictionary().map((e) => ({
    id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
    extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
  }));
  const scene = sceneById("bussipilet")!;
  const context = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), "B2");
  const run = planRun(scene, "hurdle-cascade", "B2", "textbook");
  const at = scene.beats.findIndex((b) => b.id === "want");
  const draw = {
    persona: run.persona.id, card: run.card, curveballs: [{ id: "wrong-price" as const, at }],
    lines: "scripted" as const, patience: run.patience,
  };

  const play = (said: readonly string[]) => {
    const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
    let state = replay(context, draw, []).state;
    for (const one of said) {
      turns.push({ beatId: scene.beats[state.beat]?.id ?? "", said: one, helped: false, heard: "" });
      state = replay(context, draw, turns).state;
    }
    return state;
  };

  it("does not read asking the price as having paid", () => {
    const asked = play(["Tere!", "Ma tahaksin osta ühe pileti haiglasse.", "Kell üheksa.", "Kui palju see maksab?"]);
    expect(asked.done).not.toContain("pay");
    const paid = play(["Tere!", "Ma tahaksin osta ühe pileti haiglasse.", "Kell üheksa.", "Kaardiga."]);
    expect(paid.done).toContain("pay");
  });

  it("takes the new price with a hästi", () => {
    const state = play(["Tere!", "Hästi."]);
    expect(state.hurdles).toEqual([expect.objectContaining({ id: "wrong-price", met: true })]);
  });

  it("credits the destination said in the same breath as the ticket", () => {
    expect(at).toBeGreaterThan(0);
    const state = play(["Tere!", "Ma tahaksin osta ühe pileti haiglasse."]);
    expect(state.done).toEqual(expect.arrayContaining(["want", "to"]));
    expect(scene.beats[state.beat]?.id).toBe("when");
  });
});
