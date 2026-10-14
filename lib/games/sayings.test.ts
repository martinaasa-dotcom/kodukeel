import { describe, expect, it } from "vitest";

import { SAYINGS, sayingSet, setCount } from "../estonian/sayings";
import { askedIn, blankOut, buildPlan, isAskedElsewhere, isFit, isGuessRight, isMatch, isRight, type PlayableSaying } from "./sayings";
import { rng as seeded } from "../random/seeded";

/** The sentences as the dictionary would hand them back, with a stand-in English line. */
function playable(set: ReturnType<typeof sayingSet>): PlayableSaying[] {
  return set.map((saying) => {
    const [first, ...rest] = saying.sentences.map((s) => ({ et: s.et, en: `en: ${s.et}`, run: s.run, lexemeId: s.lemma }));
    return { saying, sentences: [first!, ...rest] };
  });
}

describe("blankOut", () => {
  it("cuts a sentence round the one word and no other", () => {
    expect(blankOut("Vaas läks katki.", "katki")).toEqual({ before: "Vaas läks ", after: "." });
  });

  it("refuses a word that is missing or that stands twice, since the other would give the answer away", () => {
    expect(blankOut("Vaas läks katki.", "lahti")).toBeNull();
    expect(blankOut("Katki läks, katki jäi.", "katki")).toBeNull();
  });

  it("refuses a word that opens the sentence, since the answer would come back in lower case", () => {
    expect(blankOut("Kokku saadi kohviku ees.", "kokku")).toBeNull();
  });

  it("does not cut a word out of the middle of another", () => {
    expect(blankOut("Ta tegi katkist.", "katki")).toBeNull();
  });
});

describe("buildPlan", () => {
  for (let n = 0; n < setCount(); n++) {
    const set = sayingSet(n);

    it(`builds sitting ${n + 1} with a step for every saying`, () => {
      const plan = buildPlan(playable(set), seeded(n + 1));
      expect(plan).not.toBeNull();
      expect(plan!.see).toHaveLength(set.length);
      expect(plan!.match.phrases).toHaveLength(set.length);
      expect(plan!.match.meanings).toHaveLength(set.length);
      expect(plan!.fill).toHaveLength(set.length);
      expect(plan!.fit).toHaveLength(set.length);
    });

    it(`gives every word of every saying in sitting ${n + 1} something to say when it is tapped`, () => {
      const plan = buildPlan(playable(set), seeded(5))!;
      for (const step of plan.see) {
        expect(step.words.length, step.id).toBe(step.phrase.split(" ").length);
        for (const w of step.words) expect(w.gloss.trim(), `${step.id}: ${w.word}`).not.toBe("");
        expect(step.words.map((w) => w.word).join(" ")).toBe(step.phrase);
      }
    });

    it(`offers the right meaning once among the guesses in sitting ${n + 1}`, () => {
      const plan = buildPlan(playable(set), seeded(9))!;
      for (const step of plan.see) {
        expect(step.guesses.filter((g) => g === step.means), step.id).toHaveLength(1);
        expect(new Set(step.guesses).size, step.id).toBe(step.guesses.length);
        expect(step.guesses.length, step.id).toBeGreaterThanOrEqual(3);
      }
    });

    it(`puts each situation in sitting ${n + 1} to the learner with its own saying among the options, once`, () => {
      const plan = buildPlan(playable(set), seeded(11))!;
      expect(new Set(plan.fit.map((q) => q.id)).size).toBe(set.length);
      for (const q of plan.fit) {
        expect(q.options.filter((o) => o.id === q.id), q.id).toHaveLength(1);
        expect(new Set(q.options.map((o) => o.id)).size, q.id).toBe(q.options.length);
        expect(new Set(q.options.map((o) => o.phrase)).size, q.id).toBe(q.options.length);
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
        expect(q.when.length).toBeGreaterThan(10);
      }
    });

    it(`puts the right word among the options in sitting ${n + 1}, once, with no repeats`, () => {
      const plan = buildPlan(playable(set), seeded(7))!;
      for (const q of plan.fill) {
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(`${q.before}${q.answer}${q.after}`).toBe(q.sentence.et);
      }
    });

    it(`never lines a meaning up with its own phrase in sitting ${n + 1}`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const plan = buildPlan(playable(set), seeded(seed))!;
        const level = plan.match.meanings.filter((m, i) => m.id === plan.match.phrases[i]!.id);
        expect(level, `seed ${seed}`).toEqual([]);
      }
    });
  }

  it("asks a saying in a different sentence from the one it was met in wherever the dictionary has two", () => {
    const all = playable(SAYINGS);
    const two = all.filter((p) => p.sentences.length > 1);
    expect(two.length).toBeGreaterThan(5);
    for (const p of two) {
      expect(isAskedElsewhere(p), p.saying.id).toBe(true);
      expect(askedIn(p).et, p.saying.id).not.toBe(p.sentences[0].et);
    }
  });

  it("is null where there is too little to match", () => {
    expect(buildPlan(playable(sayingSet(0)).slice(0, 2))).toBeNull();
  });

  it("marks by comparison alone", () => {
    expect(isMatch("a", "a")).toBe(true);
    expect(isMatch("a", "b")).toBe(false);
    const q = buildPlan(playable(sayingSet(0)), seeded(3))!.fill[0]!;
    expect(isRight(q, q.answer)).toBe(true);
    expect(isRight(q, q.options.find((o) => o !== q.answer)!)).toBe(false);
    const plan = buildPlan(playable(sayingSet(0)), seeded(3))!;
    const step = plan.see[0]!;
    expect(isGuessRight(step, step.means)).toBe(true);
    expect(isGuessRight(step, step.guesses.find((g) => g !== step.means)!)).toBe(false);
    const f = plan.fit[0]!;
    expect(isFit(f, f.id)).toBe(true);
    expect(isFit(f, f.options.find((o) => o.id !== f.id)!.id)).toBe(false);
  });
});
