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

  /*
    A persona is drawn for every scene, a friend on the phone and a neighbor
    on the stairs as readily as a clerk, so the learner's line may promise a
    way of talking and never a setting: "the queue behind you" or "their first
    week" is nonsense on a call from a friend. A form may be named only on the
    condition that there is one.
  */
  it("never name a setting the scene may not have", () => {
    const settings = /\b(queue|counter|desk|office|shop|job|week|coffee|customer|boss|colleague)s?\b/i;
    for (const p of PERSONAS) {
      expect(p.meet, p.id).not.toMatch(settings);
      expect(p.meet.replace(/if there's a form, the form/i, ""), p.id).not.toMatch(/\bform\b/i);
    }
  });

  it("never take a beat below one try", () => {
    for (const p of PERSONAS) expect(patienceFor(1, p)).toBeGreaterThanOrEqual(1);
  });

  it("only speak in voices the speech route accepts", () => {
    expect(voicesAreReal()).toBe(true);
  });
});
