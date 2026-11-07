import { describe, expect, it } from "vitest";
import { afterGo, needed, passed, PASS_MARK, startGate } from "./gate";

describe("Practice's pass mark", () => {
  it("is 70 percent, rounded up", () => {
    expect(PASS_MARK).toBe(0.7);
    expect(needed(22)).toBe(16);
    expect(needed(10)).toBe(7);
  });

  it("passes on the first go at the mark and holds below it", () => {
    const all = Array.from({ length: 22 }, (_, i) => i);
    expect(passed(afterGo(startGate(22), all, new Set(all.slice(0, 16)), true))).toBe(true);
    const short = afterGo(startGate(22), all, new Set(all.slice(0, 11)), true);
    expect(passed(short)).toBe(false);
    expect(short.missed).toEqual(all.slice(11));
  });

  it("counts a question put right on a later go, and asks only what is still wrong", () => {
    const all = Array.from({ length: 22 }, (_, i) => i);
    let gate = afterGo(startGate(22), all, new Set(all.slice(0, 11)), true);
    gate = afterGo(gate, gate.missed, new Set(gate.missed.slice(0, 3)), false);
    expect(gate.firstTime).toBe(11);
    expect(gate.fixed).toBe(3);
    expect(passed(gate)).toBe(false);
    expect(gate.missed).toHaveLength(8);
    gate = afterGo(gate, gate.missed, new Set(gate.missed.slice(0, 2)), false);
    expect(gate.firstTime + gate.fixed).toBe(16);
    expect(passed(gate)).toBe(true);
  });
});
