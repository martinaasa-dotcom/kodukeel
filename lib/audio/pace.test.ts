import { describe, expect, it } from "vitest";
import { LEVELS } from "@/lib/collections/syllabus";
import {
  DEFAULT_PACE, PACE_FOR_LEVEL, paceFor, paceFrom, SLOWEST, SLOW_OF_NORMAL, SPEECH_PACES,
} from "./pace";
import { LEARNING_RATE, rateFor } from "./clip";
import { CONDITIONS } from "./conditions";

describe("the ladder", () => {
  it("gives every level a pace, and none of them is faster than the recording", () => {
    for (const level of LEVELS) {
      const pace = paceFor(level);
      expect(SPEECH_PACES.some((p) => p.id === pace.id)).toBe(true);
      expect(pace.normal).toBeGreaterThan(0);
      expect(pace.normal).toBeLessThanOrEqual(1);
    }
  });

  /*
    The ladder is the whole argument: a learner who never hears Estonian at
    speed has learned a pace rather than a language. So it may not go backwards,
    and it has to actually reach the recording's own pace rather than
    approaching it, which is the one thing "and finally full speed" claims.
  */
  it("never slows down as the level goes up, and reaches full speed", () => {
    const rates = LEVELS.map((l) => paceFor(l).normal);
    for (let i = 1; i < rates.length; i++) expect(rates[i]!).toBeGreaterThanOrEqual(rates[i - 1]!);
    expect(rates[0]!).toBeLessThan(0.75);
    expect(paceFor("B2").normal).toBe(1);
    expect(Math.max(...rates)).toBe(1);
  });

  it("has a slow button that is always slower than the everyday play", () => {
    for (const level of LEVELS) {
      const pace = paceFor(level);
      expect(pace.slow).toBeLessThan(pace.normal);
      expect(pace.slow).toBeGreaterThanOrEqual(SLOWEST);
      // Either the ratio, or the floor where the ratio would go under it.
      expect(pace.slow).toBeCloseTo(Math.max(SLOWEST, pace.normal * SLOW_OF_NORMAL), 6);
    }
  });

  /*
    A MISSING ROW IS THE LEVEL'S OWN, NOT A FIXED SPEED. Everybody signed up
    before this existed has no row, and reading absence as one particular pace
    would hold a beginner at whatever that pace happened to be.
  */
  it("falls back to the level for an unset, unknown or auto row", () => {
    for (const stored of [null, undefined, "", "auto", "medium", "0.8"]) {
      expect(paceFrom(stored, "A1")).toEqual(paceFor("A1"));
      expect(paceFrom(stored, "B2")).toEqual(paceFor("B2"));
    }
  });

  it("lets the learner overrule the level, and says that they did", () => {
    const chosen = paceFrom("natural", "A1");
    expect(chosen.normal).toBe(1);
    expect(chosen.chosen).toBe(true);
    expect(paceFor("A1").chosen).toBe(false);
    // Slower than the level as readily as faster: the point is that it is theirs.
    expect(paceFrom("verySlow", "C1").normal).toBe(paceFor("A1").normal);
  });

  it("has a level for every pace it offers, so no pace is unreachable", () => {
    const reachable = new Set(LEVELS.map((l) => PACE_FOR_LEVEL[l]));
    for (const pace of SPEECH_PACES) {
      // `natural` is shared by B2 and C1; every other pace is some level's own.
      expect(reachable.has(pace.id) || pace.id === "natural").toBe(true);
    }
  });
});

describe("what a request plays at", () => {
  const pace = paceFor("A1");
  const clean = CONDITIONS[0]!;
  const quick = CONDITIONS.find((c) => c.id === "quick")!;

  it("plays a plain request at this learner's own pace", () => {
    expect(rateFor({ text: "õde", pace })).toBe(pace.normal);
    expect(rateFor({ text: "õde" })).toBe(DEFAULT_PACE.normal);
  });

  it("reads a caller's rate as a ceiling, never as a speed-up", () => {
    // The dictation asks for 0.8, and an A1 learner already hears 0.6.
    expect(rateFor({ text: "õde", rate: LEARNING_RATE, pace })).toBe(pace.normal);
    // Somebody at full speed gets the gentler play the screen asked for.
    expect(rateFor({ text: "õde", rate: LEARNING_RATE, pace: paceFor("B2") })).toBe(LEARNING_RATE);
  });

  /*
    A CONDITION IS HARDER THAN USUAL, AND "USUAL" IS A FACT ABOUT THE LISTENER.
    It used to be a fraction of the recording, so "at speed" was 1.3 for
    everybody and an A1 learner met one clip in five at more than twice their
    own pace.
  */
  it("scales a condition against the learner's pace rather than the recording", () => {
    expect(rateFor({ text: "õde", condition: clean, pace })).toBe(pace.normal);
    expect(rateFor({ text: "õde", condition: quick, pace })).toBeCloseTo(pace.normal * quick.speed, 6);
    expect(rateFor({ text: "õde", condition: quick, pace })).toBeLessThan(1);
    expect(rateFor({ text: "õde", condition: quick, pace })).toBeGreaterThan(pace.normal);
  });

  it("gives the slow button the pace's own slow rate, over anything else", () => {
    expect(rateFor({ text: "õde", slow: true, pace })).toBe(pace.slow);
    expect(rateFor({ text: "õde", slow: true, condition: quick, rate: 1, pace })).toBe(pace.slow);
  });
});
