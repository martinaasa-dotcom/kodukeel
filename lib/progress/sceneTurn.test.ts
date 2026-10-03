import { describe, expect, it } from "vitest";
import { SCENES, sceneById } from "@/lib/scenes/catalogue";
import { planRun } from "@/lib/scenes/run";
import { PERSONAS } from "@/lib/scenes/personas";
import type { SpokenLine } from "@/lib/scenes/line";
import type { SceneSpec } from "@/lib/scenes/types";
import { acceptFromRows, contextFromRows, replay, sceneLemmas, type Row, type StoredDraw } from "./scene";
import {
  AFTER_BREAK_NOTE, BEFORE_BREAK_NOTE, composeTurn, planTurn, speakTurn, type Composition, type TurnAsk,
} from "./sceneTurn";
import { shippedDictionary } from "../../scripts/lib/dictionary";

/*
  ONE ASSEMBLY FOR THE ROUTE AND EVERY HARNESS (`lib/progress/sceneTurn.ts`).

  The route proved byte for byte that moving its reply assembly here changed
  nothing it says. What these hold is the contract the route and the
  harnesses now share: the model step is handed a turn only where a line is
  built, a refused booking says exactly what a keyless deployment says, a line
  the model wrote wins over the bank and carries only the answer written
  before a break in time in front of it, and a turn that crosses a break asks
  for that answer first.
*/
const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
}));

function setUp(scene: SceneSpec, lines: StoredDraw["lines"] = "scripted") {
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), "A2");
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
  const run = planRun(scene, `scene-turn-${scene.id}`, "A2", "textbook");
  const draw: StoredDraw = {
    persona: run.persona.id, card: run.card, curveballs: [], lines, patience: run.patience,
  };
  const persona = PERSONAS.find((p) => p.id === run.persona.id);
  /*
    Played the way the screen plays it: each turn is sent with the line it was
    answering, and the lines the bank has said are not said again.
  */
  const planFor = async (said: readonly string[], composing = false) => {
    const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
    const used = new Set<string>();
    const planAt = () => {
      const { state, response, elsewhere } = replay(context, draw, turns);
      return planTurn({
        scene, context, draw, state, response, elsewhere, taken: turns.length, used, persona, composing,
        rotate: 7, level: "A2",
      });
    };
    let heard = "";
    for (const one of said) {
      const { lines } = await speakTurn(planAt());
      for (const line of lines) if (line.provenance === "attested" || line.provenance === "scripted") used.add(line.text);
      const move = [...lines].reverse().find((line) => !line.reaction);
      if (move) heard = move.text;
      turns.push({ beatId: planAt().current?.id ?? "", said: one, helped: false, heard });
    }
    return planAt();
  };
  return { context, planFor };
}

const texts = (lines: readonly SpokenLine[]) => lines.map((l) => `${l.provenance}:${l.text}`);

describe("speakTurn", () => {
  it("says exactly what a keyless deployment says where the model step books nothing", async () => {
    let compared = 0;
    for (const scene of SCENES) {
      const { planFor } = setUp(scene);
      for (const said of [[], ["Tere!"], ["Tere!", "Ma ei tea."]]) {
        const keyless = await speakTurn(await planFor(said));
        const refused = await speakTurn(await planFor(said), async (): Promise<Composition> => ({ kind: "none" }));
        expect(texts(refused.lines), `${scene.id} after ${said.length} turns`).toEqual(texts(keyless.lines));
        compared += 1;
      }
    }
    expect(compared).toBe(SCENES.length * 3);
  });

  it("never hands the model a turn that only handed the other side's line back", async () => {
    const scene = sceneById("poodi-piima")!;
    const { planFor } = setUp(scene);
    // Asked where they are going, the learner says the question back: there is nothing to answer.
    const plan = await planFor(["Tere!", "Kuhu sa lähed?"]);
    expect(plan.reading).toBe("echo");
    expect(plan.line, "a line is built for an echo, which is answered by saying the line again").toBeNull();
    let asked = 0;
    const { lines } = await speakTurn(plan, async () => { asked += 1; return { kind: "none" }; });
    expect(asked).toBe(0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("says a composed line with only the answer written before the break in front of it", async () => {
    const scene = sceneById("poodi-piima")!;
    const { planFor } = setUp(scene, "composed");
    // Says where they are going, so the next beat is the one inside the shop, which the bank holds a line for.
    const plan = await planFor(["Tere!", "Ma lähen poodi."], true);
    expect(plan.line, "the beat inside the shop builds a line").not.toBeNull();
    const move: SpokenLine = { text: "Kus sa nüüd oled?", provenance: "composed" };
    const before: SpokenLine = { text: "Jah, kõik on hästi.", provenance: "composed" };
    const { lines, extra } = await speakTurn(plan, async () => ({
      kind: "composed", line: move, preBreak: before, extra: { composed: true },
    }));
    expect(extra).toEqual({ composed: true });
    const said = texts(lines);
    expect(said).toContain(`composed:${move.text}`);
    expect(said.indexOf(`composed:${before.text}`)).toBeLessThan(said.indexOf(`composed:${move.text}`));
    expect(lines.filter((l) => l.provenance === "composed")).toHaveLength(2);
  });

  it("falls back to the net where the model's line was withheld, and to the withheld line where the net has nothing", async () => {
    const scene = sceneById("poodi-piima")!;
    const { planFor } = setUp(scene, "composed");
    const plan = await planFor(["Tere!", "Ma lähen poodi."], true);
    const keyless = await speakTurn(plan);
    const withheld: SpokenLine = { text: "Vabandust?", provenance: "fallback" };
    const { lines } = await speakTurn(plan, async () => ({ kind: "withheld", line: withheld, preBreak: null }));
    // The bank holds a line for this beat, so the net is said, exactly as a keyless run says it.
    expect(texts(lines)).toEqual(texts(keyless.lines));
  });
});

describe("composeTurn", () => {
  it("asks for the answer before a break in time first, and then the move knowing it", async () => {
    const scene = sceneById("poodi-piima")!;
    expect(scene.beats.find((b) => b.id === "inside")?.meanwhile, "the shop beat no longer walks the learner there").toBeTruthy();
    const { planFor } = setUp(scene, "composed");
    // Says where they are going, which meets the beat before the walk to the shop, and asks something.
    const plan = await planFor(["Tere!", "Ma lähen poodi. Kas sul on raha?"], true);
    expect(plan.askedNow, "the turn is not read as asking anything").not.toBeNull();
    expect(plan.line?.beat.id).toBe("inside");
    const asks: TurnAsk[] = [];
    const lines = ["Jah, mul on natuke raha.", "Kus sa praegu oled?"];
    await composeTurn(plan, plan.line!, {
      compose: async (ask) => { asks.push(ask); return lines[Math.min(asks.length - 1, 1)]!; },
      vouch: async (spellings) => new Set(spellings),
    });
    expect(asks.length).toBeGreaterThan(1);
    expect(asks[0]!.note).toBe(BEFORE_BREAK_NOTE);
    expect(asks[0]!.move).toBe("confirm");
    // Every ask after the answer before the break is the move, and never asks for that answer again.
    expect(asks.slice(1).every((ask) => ask.note !== BEFORE_BREAK_NOTE)).toBe(true);
    if (asks.some((ask) => ask.note === AFTER_BREAK_NOTE)) {
      expect(asks.findIndex((ask) => ask.note === AFTER_BREAK_NOTE)).toBeGreaterThan(0);
    }
  });
});
