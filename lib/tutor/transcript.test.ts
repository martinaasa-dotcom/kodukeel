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

  it("drops a warning the app wrote under the end of a real reply, not only a whole failed turn", () => {
    /*
      The route itself appends one when the reply hits its ceiling or the
      stream breaks, and the chat hook appends one when the connection drops
      mid-answer. All three land after text Anu did write, so they are not at
      the start of the turn, and the browser sends the lot back as hers.
    */
    const cut = `Kohvi is the partitive.\n\n${FAILURE_MARK} That ran long and got cut off. Ask again, or ask for the short version.`;
    expect(saidByAnu(cut)).toBe("Kohvi is the partitive.");
    expect(saidByAnu(`${cut}\nUNVERIFIED: kohvi`)).toBe("Kohvi is the partitive.");
    expect(saidByAnu(`Half an answer\n\n${FAILURE_MARK} Lost the connection to Anu. Ask that again when you are ready.`))
      .toBe("Half an answer");
    expect(saidByAnu(`Half\n\n${FAILURE_MARK} Anu could not be reached.`)).toBe("Half");
    // A mark inside her own prose is hers and stays.
    expect(saidByAnu(`Watch out: ${FAILURE_MARK} is not a letter.\nIt stays.`)).toBe(`Watch out: ${FAILURE_MARK} is not a letter.\nIt stays.`);
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
