import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { recapOf } from "./recap";
import { startScene, type SceneState, type TurnRecord } from "./state";
import type { SceneSpec } from "./types";

const SCENE: SceneSpec = {
  id: "fixture", title: "A fixture", place: "Nowhere",
  tests: "keha-ja-tervis", units: ["tervitused"], register: "teie",
  role: "You are somebody, and it is not you.", props: [], curveballs: [],
  beats: [
    {
      id: "reason", goal: "Say what is wrong.", they: "They ask.", move: "ask", topic: ["valu"],
      needs: [{ kind: "lemma", oneOf: ["valu"] }], required: true, patience: 2, shape: "word",
    },
    {
      id: "where", goal: "Say where it hurts.", they: "They ask.", move: "ask", topic: ["pea"],
      needs: [{ kind: "case", lemma: "pea", grammCase: "INESSIVE" }], required: true, patience: 2, shape: "word",
    },
  ],
  outcomes: [{ id: "done", when: ["reason", "where"], says: "Done." }, { id: "left", when: [], says: "You left." }],
};

function turn(over: Partial<TurnRecord> = {}): TurnRecord {
  return { beatId: "reason", said: "x", reading: "complete", met: [true], helped: false, ...over };
}
function state(turns: TurnRecord[], done: string[]): SceneState {
  return { ...startScene(SCENE), turns, done };
}

describe("the recap of a conversation", () => {
  it("leads on what got done and counts the turns that landed", () => {
    const recap = recapOf(SCENE, state([
      turn({ said: "mul on valu peas täna" }),
      turn({ beatId: "where", said: "pea", slips: [{ kind: "case", said: "pea", form: "peas", lemma: "pea", grammCase: "INESSIVE" }] }),
    ], ["reason", "where"]), "en");
    expect(recap.headline).toBe("You got everything done.");
    expect(recap.stats.find((s) => s.label === "Things done")?.value).toBe(2);
    expect(recap.stats.find((s) => s.label === "Turns understood")?.value).toBe(2);
    expect(recap.moments).toHaveLength(2);
    expect(recap.moments[1]?.fixes).toEqual([{ said: "pea", form: "peas" }]);
    expect(recap.moments[1]?.tone).toBe("nearly");
  });

  it("quotes the learner's own words in a highlight", () => {
    const recap = recapOf(SCENE, state([turn({ said: "mul on väga suur valu" })], ["reason"]), "en");
    const longest = recap.highlights.find((h) => h.title === "Your longest sentence");
    expect(longest?.said).toBe("mul on väga suur valu");
  });

  it("never quotes the same sentence in two highlights", () => {
    const said = "mul on külm, üks suur tee palun";
    const recap = recapOf(SCENE, state([turn({ said, chose: [{ slot: "x", value: "tee" }] as never })], ["reason"]), "en");
    const quotes = recap.highlights.flatMap((h) => (h.said ? [h.said] : []));
    expect(new Set(quotes).size).toBe(quotes.length);
  });

  it("names what is left as a thing to try, never as a failure", () => {
    const recap = recapOf(SCENE, state([turn({ reading: "offtarget", met: [false] })], []), "en");
    expect(recap.headline).not.toMatch(/fail|wrong|mistake/i);
    expect(recap.nextTime[0]?.detail).toContain("Say what is wrong.");
    for (const m of recap.moments) expect(m.tone).not.toBe("wrong");
  });

  it("always has something to try next, and at most three of anything", () => {
    const recap = recapOf(SCENE, state([turn(), turn({ beatId: "where" })], ["reason", "where"]), "en");
    expect(recap.nextTime.length).toBeGreaterThan(0);
    expect(recap.nextTime.length).toBeLessThanOrEqual(3);
    expect(recap.highlights.length).toBeLessThanOrEqual(3);
  });

  it("writes no Estonian of its own", () => {
    const code = readFileSync("lib/scenes/recap.ts", "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(code).not.toMatch(/[õäöüšžÕÄÖÜŠŽ]/);
  });
});
