import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { grammarTopic } from "@/lib/estonian/grammar";
import { SCENES } from "@/lib/scenes/catalogue";
import { SYLLABUS, unitById } from "@/lib/collections/syllabus";
import { modeAt } from "@/lib/ux/modes";
import {
  ACTIVITIES, type ActivitySpec, DAY_MINUTES, DEFAULT_PROGRAMME, MAX_DAY_WORDS, MINUTES_PER_WORD,
  PARTS, PROGRAMMES, ROTATION, SCENE_FOR_UNIT, dayStanding, ordinaryWords, programmeAfter,
  programmeStanding, programmeUnits, slice, wordsThrough, activityTitle,
  MEET_STEP, REVIEW_STEP,
} from "./index";

const DAYS = PROGRAMMES.flatMap((p) => p.days.map((d) => ({ programme: p, day: d })));

describe("the programme is a request against the course, never a copy of it", () => {
  it("names a unit that exists", () => {
    for (const { day } of DAYS) expect(unitById(day.unitId), day.id).toBeDefined();
  });

  /*
    THE ONE CHECK THAT KEEPS ADR-005 WHOLE HERE. A day names Estonian lemmas,
    and a lemma this file invented would be a word the app wrote. It cannot
    become one, because the harvest only ever fetches what a unit asks for, so
    an invented lemma would simply teach nothing and the day would be short by
    a word in silence. This is what says so out loud instead.
  */
  it("teaches only words its own unit teaches", () => {
    for (const { day } of DAYS) {
      const unit = unitById(day.unitId)!;
      for (const word of day.words) {
        expect(unit.lemmas, `${day.id} asks for ${word}`).toContain(word);
      }
    }
  });

  it("teaches each word once across the whole programme", () => {
    for (const programme of PROGRAMMES) {
      const seen = new Set<string>();
      for (const day of programme.days) {
        for (const word of day.words) {
          expect(seen.has(word), `${programme.id} repeats ${word}`).toBe(false);
          seen.add(word);
        }
      }
    }
  });

  it("keeps a day inside one evening, at that level's own size", () => {
    for (const { programme, day } of DAYS) {
      expect(day.words.length, day.id).toBeGreaterThan(0);
      expect(day.words.length, day.id).toBeLessThanOrEqual(MAX_DAY_WORDS);
      expect(day.words.length, day.id).toBeLessThanOrEqual(ordinaryWords(programme.level));
    }
  });

  /*
    THE CLAIM THAT MAKES THE SHORT WAY A COURSE RATHER THAN A SAMPLE. Every
    word of all 82 units is in exactly one evening of exactly one part, so
    nothing in the syllabus is unreachable to somebody who only ever presses
    the one button. Two words are allowed to fall out, and both are a unit
    naming a lemma an earlier unit in the same part already taught.
  */
  it("teaches the whole syllabus", () => {
    const planned = new Set(DAYS.flatMap(({ day }) => day.words));
    const missing = SYLLABUS.flatMap((u) => u.lemmas).filter((l) => !planned.has(l));
    expect(new Set(missing).size).toBeLessThanOrEqual(2);
  });

  it("covers every unit the plan names, and nothing else", () => {
    const planned = new Set(PARTS.flatMap((p) => p.units));
    for (const unit of SYLLABUS) {
      expect(planned.has(unit.id), `${unit.id} is in no part`).toBe(true);
    }
    for (const id of planned) expect(unitById(id), id).toBeDefined();
    const flat = PARTS.flatMap((p) => p.units);
    expect(new Set(flat).size, "a unit is in two parts").toBe(flat.length);
  });

  it("works a unit's words in the syllabus's own order", () => {
    for (const { programme } of DAYS.filter((d) => d.day.part.n === 1)) {
      expect(programme.days.length).toBeGreaterThan(0);
    }
    for (const programme of PROGRAMMES) {
      for (const unitId of new Set(programme.days.map((d) => d.unitId))) {
        const unit = unitById(unitId)!;
        const taught = programme.days.filter((d) => d.unitId === unitId).flatMap((d) => d.words);
        const expected = unit.lemmas.filter((l) => taught.includes(l));
        expect(taught, `${programme.id}/${unitId}`).toEqual(expected);
      }
    }
  });

  it("splits a unit evenly rather than filling each evening to the ceiling", () => {
    expect(slice([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2], [3, 4], [5, 6]]);
    expect(slice([1, 2, 3, 4, 5], 2)).toEqual([[1, 2, 3], [4, 5]]);
    expect(slice([1], 1)).toEqual([[1]]);
    for (const { day } of DAYS) {
      const sameUnit = PROGRAMMES
        .flatMap((p) => p.days)
        .filter((d) => d.id.startsWith(day.id.slice(0, 5)) && d.unitId === day.unitId);
      const sizes = sameUnit.map((d) => d.words.length);
      expect(Math.max(...sizes) - Math.min(...sizes), day.id).toBeLessThanOrEqual(1);
      expect(Math.max(...sizes), day.id).toBeLessThanOrEqual(MAX_DAY_WORDS);
    }
  });
});

describe("what a day reads and where it goes", () => {
  it("names at most one thing to read, and it exists", () => {
    for (const { day } of DAYS) {
      expect(Boolean(day.grammar && day.grammarCase), day.id).toBe(false);
      if (day.grammar) {
        expect(grammarTopic(day.grammar), day.id).toBeDefined();
      }
      if (day.grammarCase) {
        expect(CASES.some((c) => c.key === day.grammarCase), day.id).toBe(true);
      }
    }
  });

  it("only sends somebody to a conversation the app has", () => {
    for (const { day } of DAYS) {
      if (!day.scene) continue;
      expect(SCENES.some((s) => s.id === day.scene), day.id).toBe(true);
    }
    for (const [unitId, sceneId] of Object.entries(SCENE_FOR_UNIT)) {
      expect(unitById(unitId), unitId).toBeDefined();
      expect(SCENES.some((s) => s.id === sceneId), sceneId).toBe(true);
    }
  });

  /*
    A CONVERSATION NEVER ARRIVES BEFORE ITS WORDS, which is the whole of what
    makes one fair at this point rather than a wall. A scene declares the units
    it may draw on, and every one of them has to have been taught by the
    evening the programme opens it: by an earlier part of the ladder, or by an
    earlier evening of this one.
  */
  it("opens a conversation only once its units have been taught", () => {
    const order = PROGRAMMES.flatMap((p) => p.days.map((d) => ({ programme: p, day: d })));
    const met = new Set<string>();
    for (const { day } of order) {
      met.add(day.unitId);
      if (!day.scene) continue;
      const scene = SCENES.find((s) => s.id === day.scene)!;
      const early = scene.units.filter((u) => !met.has(u));
      expect(early, `${day.id} opens ${day.scene} before ${early.join(", ")}`).toEqual([]);
    }
  });

  it("uses every conversation the app has, once", () => {
    const used = DAYS.map(({ day }) => day.scene).filter(Boolean);
    expect(new Set(used).size, "a conversation is opened by two evenings").toBe(used.length);
    expect(new Set(used).size).toBe(SCENES.length);
  });

  /*
    ONE TABLE OF WHAT A MODE IS CALLED, AND THIS IS NOT IT. An activity that
    opens a practice mode reads its title out of `PRACTICE_MODES`, so a mode
    renamed once is renamed on the course screen too; one that opens something
    else carries its own. Both, or neither, is the fault worth catching.
  */
  it("reads a mode's name from the mode table and nowhere else", () => {
    const entries: [string, ActivitySpec][] = Object.entries(ACTIVITIES);
    for (const [key, spec] of entries) {
      const mode = modeAt(spec.href);
      expect(Boolean(mode) !== Boolean(spec.title), key).toBe(true);
      expect(activityTitle(spec).length, key).toBeGreaterThan(2);
    }
  });

  it("gives every day a first rung and a last one", () => {
    for (const { day } of DAYS) {
      expect(day.steps[0]?.id, day.id).toBe(MEET_STEP);
      expect(day.steps.at(-1)?.id, day.id).toBe(REVIEW_STEP);
    }
  });

  /*
    A day that is four drills long is homework. This is the only check in the
    file about how a day *feels*, and it is worth one: the whole claim of a
    planned programme is that somebody comes back tomorrow.
  */
  it("puts something to play in every day", () => {
    for (const { day } of DAYS) {
      const playful = day.steps.filter((s) => s.kind === "game" || s.kind === "talk");
      expect(playful.length, day.id).toBeGreaterThan(0);
    }
  });

  /*
    THE ALTERNATION IS LOAD-BEARING AND IS ASSERTED RATHER THAN TRUSTED. Each
    rotation runs game, drill, game, drill, and an evening takes two
    neighbours, which is what guarantees the check above over 182 evenings
    without anybody reading them. A list that stopped alternating would give
    some level a fortnight of drills and nothing would say so.
  */
  it("alternates a game and a drill in every rotation", () => {
    for (const [level, keys] of Object.entries(ROTATION)) {
      expect(keys.length % 2, level).toBe(0);
      keys.forEach((key, at) => {
        const want = at % 2 === 0 ? "game" : "drill";
        expect(ACTIVITIES[key].kind, `${level} ${key} at ${at}`).toBe(want);
      });
      expect(new Set(keys).size, `${level} repeats a round`).toBe(keys.length);
    }
  });

  it("never runs the same pair of rounds two evenings running", () => {
    for (const programme of PROGRAMMES) {
      programme.days.forEach((day, at) => {
        if (at === 0) return;
        const before = programme.days[at - 1]!.practice.join("+");
        expect(day.practice.join("+"), `${day.id}`).not.toBe(before);
      });
    }
  });

  it("conjugates a unit of verbs", () => {
    const verbDay = DAYS.find(({ day }) => day.unitId === "pohiverbid")!;
    expect(verbDay.day.practice).toContain("conjugation");
    const nounDay = DAYS.find(({ day }) => day.unitId === "kodu")!;
    expect(nounDay.day.practice).not.toContain("conjugation");
  });

  /*
    THE ONE NUMBER THIS WHOLE MODEL EXISTS TO HOLD. A day that is fifteen
    minutes on Monday and twenty-eight on Tuesday is a day somebody starts
    skipping on Wednesday, so the evening is the constant and the word count is
    what moves. Two minutes either side is the rounding in the word count, not
    slack: a unit is sliced evenly, so the short night of a unit is one word
    short and no more.
  */
  it("is fifteen minutes, every evening", () => {
    for (const { day } of DAYS) {
      expect(day.minutes, `${day.id} claims ${day.minutes} minutes`)
        .toBeGreaterThanOrEqual(DAY_MINUTES - 2);
      expect(day.minutes, `${day.id} claims ${day.minutes} minutes`)
        .toBeLessThanOrEqual(DAY_MINUTES + 2);
    }
  });

  /*
    A conversation replaces the reading and both rounds rather than joining
    them. Written the other way first, the conversation evening came out at
    twenty-three minutes against fifteen for every other.
  */
  it("spends the same fixed minutes on a conversation as on a reading and two rounds", () => {
    const talk = DAYS.find(({ day }) => day.scene)!.day;
    const ordinary = DAYS.find(({ day }) => !day.scene)!.day;
    const fixed = (d: typeof talk) =>
      d.steps.filter((s) => s.id !== MEET_STEP).reduce((n, s) => n + s.minutes, 0);
    expect(fixed(talk)).toBe(fixed(ordinary));
    expect(talk.steps.some((s) => s.kind === "read"), "a talking evening also reads").toBe(false);
    expect(talk.steps.some((s) => s.kind === "game" || s.kind === "drill")).toBe(false);
  });

  it("gives every step in a day its own id", () => {
    for (const { day } of DAYS) {
      const ids = day.steps.map((s) => s.id);
      expect(new Set(ids).size, day.id).toBe(ids.length);
    }
  });

  /*
    Only the two steps the review log can actually prove are derived. If a
    third ever claims to be, something is reading a fact it does not have.
  */
  it("says which slice of its unit an evening is", () => {
    for (const programme of PROGRAMMES) {
      for (const unitId of new Set(programme.days.map((d) => d.unitId))) {
        const slices = programme.days.filter((d) => d.unitId === unitId);
        slices.forEach((d, at) => {
          expect(d.part.n, d.id).toBe(at + 1);
          expect(d.part.of, d.id).toBe(slices.length);
        });
      }
    }
  });

  it("derives exactly the two steps a log can prove", () => {
    for (const { day } of DAYS) {
      const derived = day.steps.filter((s) => s.derived).map((s) => s.id);
      expect(derived, day.id).toEqual([MEET_STEP, REVIEW_STEP]);
    }
  });
});

describe("the ladder", () => {
  it("runs from A1 to C1 with no gap", () => {
    expect(PROGRAMMES.length).toBe(PARTS.length);
    const levels = [...new Set(PROGRAMMES.map((p) => p.level))];
    expect(levels).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    for (const level of levels) {
      expect(PROGRAMMES.filter((p) => p.level === level).length, level).toBeGreaterThan(1);
    }
  });

  it("gives every part an id nothing else has, and a real evening's worth of days", () => {
    const ids = PROGRAMMES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const programme of PROGRAMMES) {
      expect(programme.days.length, programme.id).toBeGreaterThanOrEqual(8);
      expect(programme.days.length, programme.id).toBeLessThanOrEqual(26);
      const dayIds = programme.days.map((d) => d.id);
      expect(new Set(dayIds).size, programme.id).toBe(dayIds.length);
      programme.days.forEach((d, at) => expect(d.index, d.id).toBe(at + 1));
    }
  });

  it("points each part at the next one, and stops at the end", () => {
    for (let at = 0; at < PROGRAMMES.length - 1; at += 1) {
      expect(programmeAfter(PROGRAMMES[at]!)?.id).toBe(PROGRAMMES[at + 1]!.id);
    }
    expect(programmeAfter(PROGRAMMES.at(-1)!)).toBeUndefined();
  });

  /*
    The evening does not get longer further up the ladder, it gets denser: a
    word costs less to meet once you have the stem, the case and the register
    already, so the same fifteen minutes carries more of them.
  */
  it("carries more words a night as the level rises, in the same fifteen minutes", () => {
    const levels = ["A1", "A2", "B1", "B2", "C1"];
    const costs = levels.map((l) => MINUTES_PER_WORD[l]!);
    for (let at = 1; at < costs.length; at += 1) {
      expect(costs[at]!, levels[at]).toBeLessThan(costs[at - 1]!);
    }
    const sizes = levels.map((l) => ordinaryWords(l));
    expect(sizes.at(-1)!).toBeGreaterThan(sizes[0]!);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_DAY_WORDS);
  });
});

describe("where somebody is", () => {
  const programme = DEFAULT_PROGRAMME;
  const allOf = (index: number) => new Set(programme.days[index]!.steps.map((s) => s.id));

  it("starts on day one with nothing done", () => {
    const standing = programmeStanding(programme, new Map());
    expect(standing.current?.day.index).toBe(1);
    expect(standing.daysDone).toBe(0);
    expect(standing.finished).toBe(false);
    expect(standing.current?.next?.id).toBe(MEET_STEP);
  });

  it("moves on once every step of a day is finished", () => {
    const done = new Map([[programme.days[0]!.id, allOf(0)]]);
    const standing = programmeStanding(programme, done);
    expect(standing.daysDone).toBe(1);
    expect(standing.current?.day.index).toBe(2);
    expect(standing.upcoming?.index).toBe(3);
  });

  /*
    A day left half done is where you come back to, not a day to skip past.
    The first version walked forward from the last finished day, which sent
    somebody who had done one round of day four straight to day five.
  */
  it("comes back to a half-finished day rather than past it", () => {
    const partial = new Set([MEET_STEP]);
    const standing = programmeStanding(programme, new Map([[programme.days[0]!.id, partial]]));
    expect(standing.current?.day.index).toBe(1);
    expect(standing.current?.complete).toBe(false);
    expect(standing.current?.next?.id).not.toBe(MEET_STEP);
  });

  it("finishes", () => {
    const done = new Map(programme.days.map((d, i) => [d.id, allOf(i)] as const));
    const standing = programmeStanding(programme, done);
    expect(standing.finished).toBe(true);
    expect(standing.current).toBeNull();
    expect(standing.upcoming).toBeNull();
    expect(standing.daysDone).toBe(programme.days.length);
  });

  it("counts what is left in minutes rather than in steps", () => {
    const first = programme.days[0]!;
    const standing = dayStanding(first, new Set([MEET_STEP]));
    expect(standing.minutesLeft).toBe(first.minutes - first.steps[0]!.minutes);
    expect(standing.pct).toBeGreaterThan(0);
    expect(standing.pct).toBeLessThan(100);
  });

  it("knows which words have been taught by a given day", () => {
    expect(wordsThrough(programme, 0)).toEqual([]);
    expect(wordsThrough(programme, 1)).toEqual([...programme.days[0]!.words]);
    expect(wordsThrough(programme, programme.days.length))
      .toHaveLength(programme.days.reduce((n, d) => n + d.words.length, 0));
  });

  it("draws on units in the order it first needs them", () => {
    const units = programmeUnits(programme);
    expect(units.length).toBeGreaterThan(2);
    expect(new Set(units).size).toBe(units.length);
    expect(units[0]).toBe(programme.days[0]!.unitId);
  });
});
