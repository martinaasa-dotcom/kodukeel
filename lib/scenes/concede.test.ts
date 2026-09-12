import { describe, expect, it } from "vitest";
import { concede, type Evidence } from "./turn";
import { gradesFor } from "./grades";
import { sceneById } from "./catalogue";
import { startScene, advance } from "./state";
import { buildJudgeSystemPrompt, buildJudgeUserPrompt, parseJudgement } from "./judge";

function refused(met: boolean[]): Evidence {
  return {
    reading: "offtarget",
    met,
    missing: met.flatMap((ok, i) => (ok ? [] : [i])),
    words: [],
    matched: [],
    satisfiedBy: [],
    slips: [],
    substituted: [],
    wantsEnglish: false,
    asked: null,
  };
}

describe("a beat the model concedes", () => {
  it("is met, and only where the dictionary had refused", () => {
    const one = concede(refused([false]), [0]);
    expect(one.reading).toBe("complete");
    expect(one.met).toEqual([true]);
    expect(one.conceded).toEqual([0]);
    // Nothing the learner did not produce appears anywhere the reply reads.
    expect(one.satisfiedBy).toEqual([]);
    expect(one.matched).toEqual([]);

    // An index already met, or out of range, changes nothing.
    const half = concede(refused([true, false]), [0, 7, 1.5]);
    expect(half).toBe(half);
    expect(half.conceded).toBeUndefined();
    expect(half.reading).toBe("offtarget");

    // Part of a beat conceded is still incomplete.
    const part = concede(refused([false, false]), [1]);
    expect(part.reading).toBe("incomplete");
    expect(part.missing).toEqual([0]);
  });

  it("ends the beat in the machine and writes no grade for it", () => {
    /*
      THE WHOLE OF WHAT A MODEL MAY DO. The café's bill beat wants a word about
      paying; a learner who said it some other way is conceded, the scene moves
      on, and the review log gets nothing: a beat ended on a judge's reading is
      a beat ended, never a form recalled (ADR-025 amendment 2).
    */
    const scene = sceneById("kohvikus")!;
    let state = startScene(scene);
    // Walk to the bill beat by conceding everything in front of it.
    for (const beat of scene.beats) {
      if (beat.id === "bill") break;
      state = advance(scene, state, concede(refused(beat.needs.map(() => false)), beat.needs.map((_, i) => i)), "x").state;
    }
    const bill = scene.beats[state.beat]!;
    expect(bill.id).toBe("bill");
    const after = advance(scene, state, concede(refused([false]), [0]), "ma tahan lõpetada");
    expect(after.response).toBe("answer");
    expect(after.state.done).toContain("bill");
    expect(after.state.turns.at(-1)?.conceded).toEqual([0]);
    const rows = gradesFor(scene, after.state);
    expect(rows.filter((row) => row.beatId === "bill")).toEqual([]);
    expect(rows).toEqual([]);
  });
});

describe("the judge's question", () => {
  it("names the goal, what the other side did, the turn and the reading, and holds no Estonian", () => {
    const system = buildJudgeSystemPrompt();
    const user = buildJudgeUserPrompt({
      goal: "Tell them you would like to pay.",
      they: "They set it down and ask whether that is everything.",
      said: "ei, ma tahan ka ühe saiakese",
      reading: "no, I want also one bun",
      dealt: [],
    });
    expect(user).toContain("Tell them you would like to pay.");
    expect(user).toContain("ask whether that is everything");
    expect(user).toContain("saiakese");
    expect(user).toContain("one bun");
    expect(system).toMatch(/JSON/);
    // The module writes no Estonian of its own; the turn is the only Estonian in the prompt.
    expect(system).not.toMatch(/[õäöüšž]/i);
  });

  it("reads a verdict and nothing that is not one", () => {
    expect(parseJudgement('{"done": true, "why": "They asked to pay."}')).toEqual({ done: true, why: "They asked to pay." });
    expect(parseJudgement('Sure! {"done":false,"why":"They asked for a bun."} ')).toEqual({ done: false, why: "They asked for a bun." });
    expect(parseJudgement('{"done": "yes"}')).toBeNull();
    expect(parseJudgement("not json")).toBeNull();
    expect(parseJudgement("")).toBeNull();
  });
});
