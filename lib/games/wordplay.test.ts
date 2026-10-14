import { describe, expect, it } from "vitest";

import { COMPOUNDS, FALSE_FRIENDS, contentWords } from "../estonian/literally";
import {
  COMPOUNDS_PER_SITTING, FRIENDS_PER_SITTING, OPTIONS, buildWordplay, dealSitting,
  SAME_ANSWER, alsoRight, fellFor, isGuessRight, isNamed, isSeenThrough,
} from "./wordplay";
import { rng } from "../random/seeded";
import { tr } from "../copy/locale";

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

  /*
    Every sitting there is, not five days of them: a round walks the lists in
    sittings, so the rounds from 0 to one past the last sitting reach each
    sitting from every starting point a day can give it.
  */
  it("never offers two right answers or two options that read alike, in any language", () => {
    const sittings = Math.ceil(COMPOUNDS.length / COMPOUNDS_PER_SITTING) + Math.ceil(FALSE_FRIENDS.length / FRIENDS_PER_SITTING);
    let lists = 0;
    for (let round = 0; round <= sittings; round++) {
      const plan = buildWordplay("2026-10-14", round, rng(round + 7))!;
      const optionLists = [
        ...plan.apart.map((a) => ({ right: a.means, options: a.guesses })),
        ...plan.friends.map((f) => ({ right: f.means, options: f.options })),
      ];
      for (const { right, options } of optionLists) {
        const mates = alsoRight(right);
        expect(options.filter((o) => mates.has(o.toLowerCase())), right).toEqual([right]);
        for (const locale of ["ru", "uk"] as const) {
          const read = options.map((o) => tr(locale, o, "wordplay").toLowerCase());
          expect(new Set(read).size, `${locale}: ${options.join(" / ")}`).toBe(options.length);
        }
        lists++;
      }
    }
    expect(lists).toBeGreaterThan(100);
  });

  it("names only meanings the lists hold as two names for one thing", () => {
    const meanings = new Set(COMPOUNDS.map((c) => c.means));
    expect(SAME_ANSWER.flat().filter((m) => !meanings.has(m))).toEqual([]);
    expect([...alsoRight("world")]).toContain("the earth");
    expect([...alsoRight("the Earth")]).toContain("world");
    expect([...alsoRight("toad")]).toEqual(["toad"]);
  });
});

/*
  A sitting deals five compounds and three look-alikes that sit side by side,
  so two lines that are each fine alone can tell one joke twice in a row:
  "it isn't a pig" twice, "tells the time" twice, "put the town first" under
  "put the head first". Two content words in a row shared by two lines of one
  sitting is that, and every sitting the dealer can deal is read.
*/
describe("one sitting", () => {
  it("never tells the same joke twice", () => {
    // Every sitting is a full one: the tables are a whole number of sittings
    // long, so no word is dealt twice as often by wrapping round.
    expect(COMPOUNDS.length % COMPOUNDS_PER_SITTING).toBe(0);
    expect(FALSE_FRIENDS.length % FRIENDS_PER_SITTING).toBe(0);
    const pairs = (text: string) => {
      const said = text.toLowerCase().split(/[^a-z']+/).filter((w) => contentWords(w).size > 0);
      // A pair with a word of five letters or more is a phrase; "as well" and
      // "you may" are how English joins things, said by every other line.
      return new Set(said.slice(1).flatMap((w, i) => (w.length >= 5 || said[i]!.length >= 5 ? [`${said[i]} ${w}`] : [])));
    };
    // How a line about a piece starts, rather than what it says.
    const frame = new Set(["first half", "second half", "half means"]);
    // And the small words a writer leans on: one of them twice in a sitting
    // is a tic the reader hears even where no phrase repeats.
    const tics = ["anyway", "just", "exactly", "really", "still", "honest", "though", "either", "plenty"];
    const leansOn = (text: string) => new Set(tics.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text)));
    const twice: string[] = [];
    let sittings = 0;
    for (let round = 0; round < Math.ceil(COMPOUNDS.length / COMPOUNDS_PER_SITTING); round++) {
      const { compounds, friends } = dealSitting("2026-01-01", round);
      sittings++;
      for (const lines of [compounds, friends]) {
        for (let a = 0; a < lines.length; a++) {
          for (let b = a + 1; b < lines.length; b++) {
            const otherTics = leansOn(lines[b]!.quip);
            for (const w of leansOn(lines[a]!.quip)) if (otherTics.has(w)) twice.push(`${lines[a]!.word} / ${lines[b]!.word}: ${w}`);
            const other = pairs(lines[b]!.quip);
            for (const p of pairs(lines[a]!.quip)) {
              if (other.has(p) && !frame.has(p)) twice.push(`${lines[a]!.word} / ${lines[b]!.word}: ${p}`);
            }
          }
        }
      }
    }
    expect(sittings).toBeGreaterThan(10);
    // "Another round" deals the next sitting, so a leaned-on word may not
    // close one sitting and open the next either.
    const rounds = Math.ceil(COMPOUNDS.length / COMPOUNDS_PER_SITTING);
    for (let round = 0; round < rounds; round++) {
      const here = dealSitting("2026-01-01", round).compounds;
      const next = dealSitting("2026-01-01", round + 1).compounds;
      for (const a of here) {
        for (const b of next) {
          const theirs = leansOn(b.quip);
          for (const w of leansOn(a.quip)) if (theirs.has(w)) twice.push(`${a.word} / ${b.word} (next sitting): ${w}`);
        }
      }
    }
    // And a compound sitting can be dealt beside any look-alike sitting.
    for (const c of COMPOUNDS) {
      const mine = pairs(c.quip);
      for (const f of FALSE_FRIENDS) {
        for (const p of pairs(f.quip)) if (mine.has(p) && !frame.has(p)) twice.push(`${c.word} / ${f.word}: ${p}`);
      }
    }
    expect(twice).toEqual([]);
  });
});
