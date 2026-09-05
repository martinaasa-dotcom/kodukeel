import { describe, expect, it } from "vitest";
import {
  COMPOSE_MAX_TOKENS, COMPOSE_TRANSCRIPT_TURNS,
  composeLive, composeMessages, composeSystem, exchangesFrom,
} from "./compose";
import { MAX_WORDS } from "./retrieval";
import type { TurnRecord } from "./state";

const SCENE = {
  register: "teie",
  words: ["tere", "aeg", "arst", "valu"],
  examples: ["Tere!", "Kas teil on valu?"],
};

const turn = (over: Partial<TurnRecord> = {}): TurnRecord => ({
  beatId: "reason", said: "mul on valu", reading: "complete", met: [true], helped: false, ...over,
});

describe("the block that is cached", () => {
  it("holds the word list, because that is the part that does not change per turn", () => {
    /*
      The whole cost argument. The list is nine tenths of the prompt and is the
      same on every turn of a run, so it belongs behind the cache breakpoint and
      not in the block after it, which is where it used to be.
    */
    const system = composeSystem(SCENE);
    for (const word of SCENE.words) expect(system).toContain(word);
    expect(composeLive({ move: "ask", they: "They ask.", avoid: [] })).not.toContain("arst");
  });

  it("is the same for every turn of one scene", () => {
    expect(composeSystem(SCENE)).toBe(composeSystem({ ...SCENE, words: [...SCENE.words] }));
  });

  it("says the register and the word limit the gate will enforce", () => {
    const system = composeSystem(SCENE);
    expect(system).toContain("teie");
    expect(system).toContain(String(MAX_WORDS));
  });

  it("asks for at most one line, which is what the ceiling is sized for", () => {
    // Fourteen words of Estonian is about forty-five tokens; the rest is slack.
    expect(COMPOSE_MAX_TOKENS).toBeGreaterThan(MAX_WORDS * 3);
    expect(COMPOSE_MAX_TOKENS).toBeLessThan(200);
  });
});

describe("the block that changes per turn", () => {
  it("carries the move and what they are doing, and nothing else", () => {
    const live = composeLive({ move: "offer", they: "They offer a time.", avoid: [] });
    expect(live).toContain("offer");
    expect(live).toContain("They offer a time.");
    expect(live.length).toBeLessThan(400);
  });

  it("names the words a withheld attempt reached for, which is what the one retry gets", () => {
    expect(composeLive({ move: "ask", they: "x", avoid: ["peavalu"] })).toContain("peavalu");
  });
});

describe("the run so far", () => {
  it("goes in as conversation, never concatenated into an instruction", () => {
    const messages = composeMessages([
      { heard: "Tere!", said: "Tere" },
      { heard: "Mis teil viga on?", said: "mul on valu" },
    ]);
    expect(messages).toEqual([
      { role: "user", content: "Tere" },
      { role: "assistant", content: "Mis teil viga on?" },
      { role: "user", content: "mul on valu" },
      { role: "user", content: "Your line:" },
    ]);
  });

  it("opens on the learner, because a conversation cannot start with the other side", () => {
    /*
      Anthropic refuses a message list whose first entry is the assistant's,
      and a scene always opens with the other side speaking, so the first
      `heard` is dropped rather than sent. It costs one line of context out of
      six and it is what stops every composed turn failing at the wire.
    */
    for (const exchanges of [
      [{ heard: "Tere!", said: "Tere" }],
      [{ heard: "Tere!", said: "" }, { heard: "Mis viga?", said: "valu" }],
    ]) {
      expect(composeMessages(exchanges)[0]!.role).toBe("user");
    }
  });

  it("is read off the run's own turns and bounded", () => {
    const turns = Array.from({ length: 20 }, (_, i) => turn({ said: `turn ${i}`, heard: `line ${i}` }));
    const exchanges = exchangesFrom(turns);
    expect(exchanges).toHaveLength(COMPOSE_TRANSCRIPT_TURNS);
    // Oldest first, ending on the most recent thing said.
    expect(exchanges[exchanges.length - 1]!.said).toBe("turn 19");
    expect(exchanges[0]!.heard).toBe(`line ${20 - COMPOSE_TRANSCRIPT_TURNS}`);
  });

  it("survives a turn written before the line it answered was kept", () => {
    // `TurnRecord.heard` is optional: a row written before it was stored has none.
    expect(exchangesFrom([turn({ heard: undefined })])).toEqual([{ heard: null, said: "mul on valu" }]);
  });

  it("is empty at the opening line, which is a run with nothing behind it", () => {
    expect(exchangesFrom([])).toEqual([]);
    expect(composeMessages([])).toEqual([{ role: "user", content: "Your line:" }]);
  });
});
