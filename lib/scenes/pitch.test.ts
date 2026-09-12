/**
 * The band decides how the other side talks, and the table has to be total,
 * ordered, inside the gate and free of Estonian.
 */
import { describe, expect, it } from "vitest";
import { LEVELS } from "@/lib/collections/syllabus/types";
import { MAX_COMPOSED_WORDS, NEW_WORDS } from "./gate";
import { PITCH, PITCHES, pitchFor } from "./pitch";

describe("the pitch of a scene", () => {
  it("has a row for every band the course names", () => {
    for (const level of LEVELS) {
      expect(PITCH[level], level).toBeDefined();
      expect(PITCH[level].voice.length, level).toBeGreaterThan(80);
      expect(PITCH[level].listener.length, level).toBeGreaterThan(20);
    }
    expect(PITCHES.map(([level]) => level)).toEqual(LEVELS);
  });

  /*
    A band never asks for more room than the gate allows: the gate is what
    keeps a composed line honest and none of its checks was relaxed for this.
    The figures here narrow the ask and can never widen it.
  */
  it("sits under the gate's ceilings at every band", () => {
    for (const [level, pitch] of PITCHES) {
      expect(pitch.words, level).toBeLessThanOrEqual(MAX_COMPOSED_WORDS);
      expect(pitch.newWords, level).toBeLessThanOrEqual(NEW_WORDS);
      expect(pitch.sentences[0], level).toBeGreaterThanOrEqual(1);
      expect(pitch.sentences[1], level).toBeGreaterThanOrEqual(pitch.sentences[0]);
    }
  });

  /*
    And the room grows with the band. A1 asking for more words than B1 would be
    the ladder upside down, and nothing else in the app would notice.
  */
  it("gives a harder scene at least as much room as an easier one", () => {
    for (let i = 1; i < PITCHES.length; i += 1) {
      const [below, lower] = PITCHES[i - 1]!;
      const [above, upper] = PITCHES[i]!;
      const pair = `${below} to ${above}`;
      expect(upper.words, pair).toBeGreaterThanOrEqual(lower.words);
      expect(upper.newWords, pair).toBeGreaterThanOrEqual(lower.newWords);
      expect(upper.sentences[1], pair).toBeGreaterThanOrEqual(lower.sentences[1]);
    }
    // And the two ends really differ, or the table is one row written five times.
    expect(PITCH.A1.words).toBeLessThan(PITCH.C1.words);
    expect(PITCH.A1.newWords).toBeLessThan(PITCH.C1.newWords);
  });

  /*
    A description of a register, never a line in it (ADR-005). Every Estonian
    word the model reads comes in through the scene's own list.
  */
  it("holds no Estonian", () => {
    for (const [level, pitch] of PITCHES) {
      expect(pitch.voice, level).not.toMatch(/[õäöüšž]/i);
      expect(pitch.listener, level).not.toMatch(/[õäöüšž]/i);
    }
  });

  it("tells the model the band, the shape and the figures", () => {
    const text = pitchFor("A1");
    expect(text).toContain("pitched at A1");
    expect(text).toContain(PITCH.A1.voice);
    expect(text).toContain(`at most ${PITCH.A1.words} words`);
    expect(text).toContain(`at most ${PITCH.A1.newWords} words outside`);
    expect(pitchFor("B1")).not.toContain(PITCH.A1.voice);
  });
});
