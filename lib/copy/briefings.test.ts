import { describe, expect, it } from "vitest";
import { BRIEFINGS, briefingFor } from "./briefings";
import { SONAD_GUESSES, SONAD_LENGTH } from "@/lib/games/sonad";

describe("briefings", () => {
  it("answers for a round somebody wrote, and for nothing else", () => {
    expect(briefingFor("listening")?.title).toBe("Hear a word, pick what it means");
    expect(briefingFor("nothing-like-this")).toBeNull();
  });

  it("says what will be on the screen and what the learner does, as two sentences", () => {
    for (const [id, brief] of Object.entries(BRIEFINGS)) {
      expect(brief.what, id).not.toBe(brief.you);
      expect(brief.what.trim().endsWith("."), id).toBe(true);
      expect(brief.you.trim().endsWith("."), id).toBe(true);
      expect(brief.title.trim().endsWith("."), id).toBe(false);
    }
  });

  it("writes no Estonian, which is what the dictionary is for", () => {
    for (const [id, brief] of Object.entries(BRIEFINGS)) {
      const all = `${brief.title} ${brief.what} ${brief.you} ${brief.action}`;
      expect(/[õäöüšž]/i.test(all), id).toBe(false);
    }
  });

  it("names the round rather than telling somebody it is easy", () => {
    /*
      A briefing is an instruction, so the button says what pressing it does.
      "OK" and "Got it" are what a dialog says, and neither tells a learner
      standing in front of a round what the press is about to open.
    */
    for (const [id, brief] of Object.entries(BRIEFINGS)) {
      expect(["ok", "okay", "got it", "continue"], id).not.toContain(brief.action.toLowerCase());
      expect(brief.action.length, id).toBeGreaterThan(3);
    }
  });

  it("spells out the numbers Sõnad is played with, so a change to either fails here", () => {
    /*
      The briefing is drawn in front of the page whose lead reads these two
      off the constants, so the numbers in its prose are the only ones a
      learner sees before the board. Written out rather than interpolated,
      because the table is plain strings and a table of functions is a table
      nobody can sweep; this is the tripwire that keeps the prose honest.
    */
    expect(SONAD_LENGTH, "the sonad briefing says six-letter").toBe(6);
    expect(SONAD_GUESSES, "the sonad briefing says seven tries").toBe(7);
    expect(BRIEFINGS.sonad.what).toContain("six-letter");
    expect(BRIEFINGS.sonad.what).toContain("seven tries");
  });

  it("keeps every briefing short enough to be read before a round", () => {
    for (const [id, brief] of Object.entries(BRIEFINGS)) {
      const words = `${brief.what} ${brief.you}`.trim().split(/\s+/).length;
      expect(words, id).toBeLessThanOrEqual(60);
    }
  });
});
