import { describe, expect, it } from "vitest";

import { PERSONAS, patienceFor, voicesAreReal } from "./personas";
import { findTells } from "../copy/voice";

describe("personas", () => {
  it("introduce every one of them to the learner with a line of their own", () => {
    for (const p of PERSONAS) {
      expect(p.meet.trim(), p.id).not.toBe("");
      expect(p.meet, p.id).not.toBe(p.who);
    }
  });

  it("say on the role card what the composer is told, so the joke never promises a different person", () => {
    // The learner's line opens with the composer's own claim, reworded at most at its edges.
    const key = (text: string) => text.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter((w) => w.length > 3);
    for (const p of PERSONAS) {
      const told = key(p.who);
      const shown = new Set(key(p.meet));
      const kept = told.filter((w) => shown.has(w)).length;
      expect(kept / told.length, `${p.id}: "${p.meet}" drifts from "${p.who}"`).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("keep the learner's line clear of the tells the voice table bans, and of an exclamation mark", () => {
    for (const p of PERSONAS) {
      expect(findTells(p.meet).map((t) => t.name), p.id).toEqual([]);
      expect(p.meet, p.id).not.toContain("!");
    }
  });

  it("never take a beat below one try", () => {
    for (const p of PERSONAS) expect(patienceFor(1, p)).toBeGreaterThanOrEqual(1);
  });

  it("only speak in voices the speech route accepts", () => {
    expect(voicesAreReal()).toBe(true);
  });
});
