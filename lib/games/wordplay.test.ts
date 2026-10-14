import { describe, expect, it } from "vitest";

import { COMPOUNDS, FALSE_FRIENDS } from "../estonian/literally";
import {
  COMPOUNDS_PER_SITTING, FRIENDS_PER_SITTING, OPTIONS, buildWordplay, dealSitting,
  fellFor, isGuessRight, isNamed, isSeenThrough,
} from "./wordplay";
import { rng } from "../random/seeded";

const DAYS = ["2026-01-01", "2026-03-15", "2026-07-04", "2026-10-14", "2026-12-31"];

describe("dealSitting", () => {
  it("deals a full sitting of different compounds and false friends", () => {
    for (const day of DAYS) {
      for (let round = 0; round < 12; round++) {
        const { compounds, friends } = dealSitting(day, round);
        expect(compounds).toHaveLength(COMPOUNDS_PER_SITTING);
        expect(new Set(compounds.map((c) => c.id)).size).toBe(COMPOUNDS_PER_SITTING);
        expect(friends).toHaveLength(FRIENDS_PER_SITTING);
        expect(new Set(friends.map((f) => f.id)).size).toBe(FRIENDS_PER_SITTING);
      }
    }
  });

  it("moves on to new words when another round is asked for", () => {
    const first = dealSitting("2026-10-14", 0).compounds.map((c) => c.id);
    const second = dealSitting("2026-10-14", 1).compounds.map((c) => c.id);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it("reaches every compound and every false friend over enough rounds", () => {
    const seen = new Set<string>();
    const friends = new Set<string>();
    for (let round = 0; round < 40; round++) {
      const { compounds, friends: f } = dealSitting("2026-10-14", round);
      compounds.forEach((c) => seen.add(c.id));
      f.forEach((x) => friends.add(x.id));
    }
    expect(seen.size).toBe(COMPOUNDS.length);
    expect(friends.size).toBe(FALSE_FRIENDS.length);
  });

  it("deals the same sitting for the same day and round", () => {
    expect(dealSitting("2026-10-14", 3)).toEqual(dealSitting("2026-10-14", 3));
  });
});

describe("buildWordplay", () => {
  for (const day of DAYS) {
    it(`builds a playable sitting on ${day}`, () => {
      for (let round = 0; round < 6; round++) {
        const plan = buildWordplay(day, round, rng(round + 1))!;
        expect(plan).not.toBeNull();
        expect(plan.apart).toHaveLength(COMPOUNDS_PER_SITTING);
        expect(plan.name).toHaveLength(COMPOUNDS_PER_SITTING);
        expect(plan.friends).toHaveLength(FRIENDS_PER_SITTING);

        let asked = 0;
        for (const step of plan.apart) {
          expect(step.guesses.filter((g) => g === step.means), step.id).toHaveLength(1);
          expect(new Set(step.guesses.map((g) => g.toLowerCase())).size, step.id).toBe(step.guesses.length);
          expect(step.guesses).toHaveLength(OPTIONS);
          expect(step.parts.map((x) => x.text).join("")).toBe(step.word);
          asked++;
        }
        for (const q of plan.name) {
          expect(q.options.filter((o) => o.id === q.id), q.id).toHaveLength(1);
          expect(new Set(q.options.map((o) => o.word)).size).toBe(q.options.length);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          asked++;
        }
        for (const q of plan.friends) {
          expect(q.options.filter((o) => o === q.means), q.id).toHaveLength(1);
          expect(q.options.filter((o) => o === q.looksLike), q.id).toHaveLength(1);
          expect(new Set(q.options.map((o) => o.toLowerCase())).size, q.id).toBe(q.options.length);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          asked++;
        }
        expect(asked).toBe(2 * COMPOUNDS_PER_SITTING + FRIENDS_PER_SITTING);
      }
    });
  }

  it("marks by comparison alone", () => {
    const plan = buildWordplay("2026-10-14", 0, rng(9))!;
    const step = plan.apart[0]!;
    expect(isGuessRight(step, step.means)).toBe(true);
    expect(isGuessRight(step, step.guesses.find((g) => g !== step.means)!)).toBe(false);
    const q = plan.name[0]!;
    expect(isNamed(q, q.id)).toBe(true);
    expect(isNamed(q, q.options.find((o) => o.id !== q.id)!.id)).toBe(false);
    const f = plan.friends[0]!;
    expect(isSeenThrough(f, f.means)).toBe(true);
    expect(isSeenThrough(f, f.looksLike)).toBe(false);
    expect(fellFor(f, f.looksLike)).toBe(true);
    expect(fellFor(f, f.means)).toBe(false);
  });
});
