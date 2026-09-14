import { describe, expect, it } from "vitest";
import { FAILURE_MARK, MAX_HISTORY, MAX_HISTORY_CHARS, MAX_MESSAGE_CHARS, forTheModel, saidByAnu } from "./transcript";

describe("what of the conversation goes back to Anu", () => {
  it("drops a failure the app wrote into her bubble, and the dictionary's note under a reply", () => {
    expect(saidByAnu(`${FAILURE_MARK} Anu could not be reached.`)).toBeNull();
    expect(saidByAnu("Kohvi is the partitive.\nUNVERIFIED: kohvi")).toBe("Kohvi is the partitive.");
    expect(saidByAnu("Two lines.\nUNVERIFIED: a\nUNVERIFIED: b")).toBe("Two lines.");
    expect(saidByAnu("   ")).toBeNull();
    const kept = forTheModel([
      { role: "user", content: "why kohvi?" },
      { role: "assistant", content: `${FAILURE_MARK} Lost the connection to Anu.` },
      { role: "user", content: "why kohvi?" },
      { role: "assistant", content: "Because it is the object.\nUNVERIFIED: kohvi" },
    ]);
    expect(kept).toEqual([
      { role: "user", content: "why kohvi?" },
      { role: "user", content: "why kohvi?" },
      { role: "assistant", content: "Because it is the object." },
    ]);
  });

  it("keeps the newest turns that fit the budget, whole, oldest first", () => {
    const many = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "user" as const, content: `turn ${i}` }));
    const kept = forTheModel(many);
    expect(kept).toHaveLength(MAX_HISTORY);
    expect(kept[kept.length - 1]!.content).toBe(`turn ${MAX_HISTORY + 4}`);
    const big = "x".repeat(MAX_MESSAGE_CHARS);
    const pasted = forTheModel([
      { role: "user", content: big }, { role: "assistant", content: "ok" },
      { role: "user", content: big }, { role: "assistant", content: "ok" },
      { role: "user", content: big }, { role: "assistant", content: "ok" },
      { role: "user", content: big }, { role: "assistant", content: "ok" },
      { role: "user", content: "why?" },
    ]);
    const spent = pasted.reduce((n, m) => n + m.content.length, 0);
    expect(spent).toBeLessThanOrEqual(MAX_HISTORY_CHARS);
    expect(pasted[pasted.length - 1]!.content).toBe("why?");
    /* A message past the cap is cut rather than dropped, and never a turn cut in the middle of the budget. */
    expect(forTheModel([{ role: "user", content: "y".repeat(MAX_MESSAGE_CHARS + 10) }])[0]!.content).toHaveLength(MAX_MESSAGE_CHARS);
  });
});
