import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { grammarTopic } from "@/lib/estonian/grammar";
import { SCENES } from "@/lib/scenes/catalogue";
import { SYLLABUS, unitById } from "@/lib/collections/syllabus";
import { modeAt } from "@/lib/ux/modes";
import {
  ACTIVITIES, type ActivitySpec, DAY_MINUTES, DEFAULT_PROGRAMME, MAX_DAY_WORDS, MINUTES_PER_WORD,
  READ_MINUTES,
  PARTS, PROGRAMMES, ROTATION, SCENE_FOR_UNIT, VERB_HEAVY, dayStanding, ordinaryWords, programmeAfter,
  programmeStanding, programmeUnits, slice, wordsThrough, taughtThrough, activityTitle,
  MEET_STEP, REVIEW_STEP, NEEDS, supportedRounds, supportsRound, taughtFrom, grammarThrough, readingPlan,
  PICTURES_FOR_BOARD,
} from "./index";
import { readFileSync } from "node:fs";
import { cardWithin, moduleScopeFrom, slotWithin } from "./scope";
import { emojiFor } from "@/lib/collections/emoji";

/**
 * What the ladder had taught by the end of a day, in the shape the builder
 * decides a round against: every word of every part before, then this part's
 * own through the day. Rebuilt here from the syllabus rather than read off the
 * builder, so the test is a second opinion rather than the builder agreeing
 * with itself.
 */
function taughtBy(programme: (typeof PROGRAMMES)[number], index: number) {
  const lemmas = new Set(taughtThrough(programme, index));
  const grammar = grammarThrough(programme, index);
  return taughtFrom(
    SYLLABUS.flatMap((u) => u.vocabulary).filter((v) => lemmas.has(v.lemma)),
    [...grammar.cases.map((c) => ({ grammarCase: c })), ...grammar.topics.map((t) => ({ grammar: t }))],
  );
}

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

  /*
    Except where the words cannot carry a different pair yet: the first two
    evenings of A1 have no verb and no pictured noun, so Match and Listening
    are the whole of what may be dealt, and a repeat there is a fact about the
    words rather than a fault in the walk. The allowance is exactly that case,
    read off what had been taught, and nothing wider.
  */
  it("never runs the same pair of rounds two evenings running, once the words allow another", () => {
    for (const programme of PROGRAMMES) {
      programme.days.forEach((day, at) => {
        if (at === 0) return;
        const before = programme.days[at - 1]!.practice.join("+");
        const could = supportedRounds(programme.level, taughtBy(programme, day.index));
        // One game and one drill is one pair; and a unit of verbs pins its
        // drill to the table, so two verb evenings with one game between them
        // are one pair as well.
        const games = could.filter((key) => ACTIVITIES[key].kind === "game");
        if (could.length <= 2 || games.length <= 1) return;
        expect(day.practice.join("+"), `${day.id}`).not.toBe(before);
      });
    }
  });

  /*
    A ROUND IS DEALT ONLY ONCE THE WORDS BEHIND IT HAVE BEEN TAUGHT. The
    conjugation table on the module's second evening was a table of verbs
    nobody had met, filled from the dictionary a band up; a picture board
    before a pictured noun is an empty board with a way out on it. The builder
    asks `taughtFrom` before it deals either, and this walks every evening of
    the ladder and asks the same question a second way.
  */
  it("never deals a round before the words it needs have been taught", () => {
    for (const { programme, day } of DAYS) {
      const taught = taughtBy(programme, day.index);
      for (const key of day.practice) {
        const need = NEEDS[key];
        if (need) expect(Boolean(taught[need]), `${day.id} deals ${key} before a ${need} word`).toBe(true);
        if (key === "picture") expect(taught.pictured, `${day.id} deals a board it cannot fill`).toBeGreaterThanOrEqual(PICTURES_FOR_BOARD);
        expect(supportsRound(key, taught, programme.level), `${day.id} deals ${key} before its material`).toBe(true);
      }
    }
  });

  /*
    A CASE IS ASKED ONLY AFTER ITS PAGE HAS BEEN READ, ON EVERY LEVEL. The
    sprint, Target, Write, Describe and the case board each ask for an ending,
    and the first evening of A2 has read no case page; the first case page is
    the inessive, in the third unit of A2.1. So those rounds wait for it, and
    dictation and word ordering wait for a sentence made entirely of taught
    words to exist, and government waits for its page and a handful of verbs.
  */
  it("asks a case round only once a case page has been read, and a sentence round only once a sentence exists", () => {
    const caseRounds = new Set(["sprint", "target", "write", "describe"]);
    let firstCase: string | null = null;
    for (const { programme, day } of DAYS) {
      const taught = taughtBy(programme, day.index);
      if (taught.cases.size > 0 && !firstCase) firstCase = day.id;
      for (const key of day.practice) {
        if (caseRounds.has(key)) expect(taught.cases.size, `${day.id} deals ${key} with no case read`).toBeGreaterThan(0);
        if (key === "target") expect(taught.cases.size, `${day.id} deals Target with too few cases`).toBeGreaterThanOrEqual(4);
        if (key === "describe") expect(taught.scene, `${day.id} deals Describe with no scene of taught words`).toBe(true);
        if (key === "dictation" || key === "sentences") expect(taught.readable, `${day.id} deals ${key}`).toBe(true);
        if (key === "government") expect(taught.topics.has("government"), `${day.id} deals government unread`).toBe(true);
      }
    }
    expect(firstCase, "no evening ever reads a case page").not.toBeNull();
    expect(firstCase!.startsWith("a2."), `the first case page is read on ${firstCase}`).toBe(true);
    // And every case round is actually dealt somewhere, or the gate is a wall.
    for (const key of [...caseRounds, "dictation", "sentences", "government", "picture"]) {
      expect(DAYS.some(({ day }) => day.practice.includes(key as never)), `${key} is never dealt`).toBe(true);
    }
  });

  it("needs as many pictured nouns as the board has pairs", () => {
    const page = readFileSync("app/(app)/review/emoji/page.tsx", "utf8");
    expect(page).toMatch(new RegExp(`const PAIRS = ${PICTURES_FOR_BOARD};`));
  });

  it("puts Sõnad on no rotation, since its word is dealt off the dictionary and marked from the date", () => {
    for (const [level, keys] of Object.entries(ROTATION)) expect(keys, level).not.toContain("sonad");
    expect(supportsRound("sonad", taughtBy(PROGRAMMES.at(-1)!, 999), "C1")).toBe(false);
  });

  /*
    AND A1 IS HELD TO THE FOUR ROUNDS A BEGINNER'S OWN WORDS CAN CARRY. Every
    other round on the app either deals a word off the dictionary, asks for a
    case, or puts a whole attested sentence in front of somebody, and at A1
    every one of those is something nobody has taught. The list is the
    rotation's, and the rotation is the argument: see `plan.ts`.
  */
  it("opens no case page at A1, and only a topic page a beginner can use", () => {
    for (const { programme, day } of DAYS) {
      if (programme.level !== "A1") continue;
      expect(day.grammarCase, `${day.id} reads a case page`).toBeUndefined();
      if (day.grammar) expect(grammarTopic(day.grammar), day.id).toBeTruthy();
      expect(day.grammar, `${day.id} reads the B1 object rule`).not.toBe("object");
    }
    // And the pages are still read from A2, where the cases are drilled.
    expect(DAYS.some(({ programme, day }) => programme.level === "A2" && day.grammarCase)).toBe(true);
  });

  it("keeps A1 to rounds played on the words the module has taught", () => {
    const allowed = new Set<string>(["match", "listening", "picture", "conjugation"]);
    for (const { programme, day } of DAYS) {
      if (programme.level !== "A1") continue;
      for (const key of day.practice) expect(allowed.has(key), `${day.id} deals ${key}`).toBe(true);
    }
    expect(ROTATION.A1!.every((key) => allowed.has(key))).toBe(true);
  });

  /*
    THE PRONOUNS ON THE SECOND EVENING AND THE VERB TO BE ON THE THIRD. A
    conjugation table asked of somebody who has never been shown `sina` is a
    guess at both halves of every row, which is what the second evening of
    the first version of this ladder was, and it took forty minutes.
  */
  it("teaches the pronouns on the second evening and the verb to be straight after", () => {
    const a1 = PROGRAMMES[0]!;
    expect(a1.days[0]!.unitId).toBe("vastused");
    expect(a1.days[0]!.words.length).toBeLessThanOrEqual(5);
    expect(a1.days[1]!.unitId).toBe("asesonad");
    expect(a1.days[1]!.words).toContain("mina");
    const be = a1.days.find((d) => d.unitId === "esimesed-verbid")!;
    expect(be.index).toBeLessThanOrEqual(4);
    expect(be.words).toContain("olema");
    expect(be.practice).toContain("conjugation");
  });

  /*
    And a round the module opens can find out what the module has taught, off
    the address the step wrote (`scope.ts`), which is what lets Match,
    Listening, the board and the table narrow themselves to it.
  */
  it("tells a round what has been taught, off the step's own address", () => {
    const a1 = PROGRAMMES[0]!;
    const third = a1.days[2]!;
    const scope = moduleScopeFrom({ module: `${a1.id}~${third.id}~do:match~3~5~0` });
    expect(scope?.day.id).toBe(third.id);
    expect(scope?.lemmas).toContain("tere");
    expect(scope?.lemmas).toContain("mina");
    expect(scope?.lemmas).not.toContain("õpetaja");
    expect(moduleScopeFrom({ module: "a1.1~nowhere~do:match~1~5~0" })).toBeNull();
    expect(moduleScopeFrom(undefined)).toBeNull();
    // A pictured noun is what the board needs, and the pronouns carry none.
    expect(scope!.lemmas.some((l) => emojiFor(l))).toBe(false);
    // No case page has been read by then, and the topics are the ones read.
    expect(scope!.cases).toEqual([]);
    expect(scope!.topics).toContain("politeness");

    // Deep into A2, the cases read so far and not the ones ahead.
    const a2 = PROGRAMMES.find((p) => p.id === "a2.1")!;
    const lastOfLoodus = [...a2.days].reverse().find((d) => d.unitId === "loodus")!;
    const later = moduleScopeFrom({ module: `${a2.id}~${lastOfLoodus.id}~do:sprint~3~5~0` })!;
    expect(later.cases).toContain("INESSIVE");
    expect(later.cases).not.toContain("COMITATIVE");
    expect(later.lemmas).toContain("tere");
    expect(later.topics).toContain("imperative");
  });

  it("asks a part of a verb only once the page teaching it has been read", () => {
    const a1 = PROGRAMMES[0]!;
    // The second evening: pronouns, no verb page yet.
    const second = a1.days[1]!;
    const early = moduleScopeFrom({ module: `${a1.id}~${second.id}~do:flash~3~5~0` })!;
    expect(early.topics).not.toContain("present-tense");
    expect(slotWithin(early, "IndPrSg3")).toBe(false);
    expect(slotWithin(early, "PRODUCTION")).toBe(true);
    expect(slotWithin(early, "INESSIVE")).toBe(false);
    // Once the present tense has been read, the persons and not the past.
    const verbDay = [...a1.days].reverse().find((d) => d.unitId === "esimesed-verbid")!;
    const later = moduleScopeFrom({ module: `${a1.id}~${verbDay.id}~do:flash~3~5~0` })!;
    expect(later.topics).toContain("present-tense");
    expect(slotWithin(later, "IndPrSg3")).toBe(true);
    expect(slotWithin(later, "IndIpfSg3")).toBe(false);
    expect(slotWithin(later, "KndPrSg1")).toBe(false);
    // The past arrives with its page in A2, and a code nobody listed fails closed.
    const a2 = PROGRAMMES.find((p) => p.id === "a2.1")!;
    const pastDay = [...a2.days].reverse().find((d) => d.unitId === "minevik")!;
    const a2scope = moduleScopeFrom({ module: `${a2.id}~${pastDay.id}~do:flash~3~5~0` })!;
    expect(slotWithin(a2scope, "IndIpfSg3")).toBe(true);
    expect(slotWithin(a2scope, "IndPrPs_")).toBe(true);
    expect(slotWithin(a2scope, "PtcPtPs")).toBe(false);
    expect(slotWithin(null, "IndIpfSg3")).toBe(true);
  });

  /*
    A PAGE IS READ ONLY ONCE THE PAGE IT STANDS ON HAS BEEN. Every oblique case
    is the genitive stem with an ending glued on, so a learner told `toas` is
    `toa` plus `s` before being told what `toa` is has been handed a rule with
    a hole under it; A2 read eight case pages before the genitive's. The table
    is the reference's own dependencies and nothing finer: what a page
    explains is built out of what an earlier page explained.
  */
  it("reads a grammar page only after the pages it is built on, over the whole ladder", () => {
    const CASE_FREE = new Set(["NOMINATIVE", "GENITIVE", "PARTITIVE"]);
    const NEEDS_FIRST: Record<string, readonly string[]> = {
      partitive: ["genitive"],
      gradation: ["genitive"],
      object: ["genitive", "partitive"],
      government: ["genitive", "partitive"],
      imperfect: ["present-tense"],
      conditional: ["present-tense"],
      imperative: ["present-tense"],
      perfect: ["participles"],
      pluperfect: ["participles"],
      impersonal: ["participles"],
      superlative: ["comparative"],
      nominalisation: ["derivation"],
      "relative-clause": ["subordination"],
      concession: ["subordination"],
      "reported-speech": ["quotative"],
    };
    const read = new Set<string>();
    for (const { day } of DAYS) {
      const page = day.grammarCase ? day.grammarCase.toLowerCase() : day.grammar;
      if (!page) continue;
      const needs = day.grammarCase && !CASE_FREE.has(day.grammarCase)
        ? ["genitive"]
        : NEEDS_FIRST[page] ?? [];
      for (const need of needs) {
        expect(read.has(need), `${day.id} reads ${page} before ${need}`).toBe(true);
      }
      read.add(page);
    }
    // And the genitive is the first case page anybody reads.
    const firstCase = DAYS.find(({ day }) => day.grammarCase)!;
    expect(firstCase.day.grammarCase).toBe("GENITIVE");
  });

  it("does not read the B1 object rule at A2 either", () => {
    for (const { programme, day } of DAYS) {
      if (programme.level === "A2") expect(day.grammar, day.id).not.toBe("object");
    }
    expect(DAYS.some(({ programme, day }) => programme.level === "B1" && day.grammar === "object")).toBe(true);
  });

  it("alternates the table with the rotation's drill on a unit of verbs", () => {
    // Six tables running opened A2. The first evening of a verb unit is the
    // table and the second is not, wherever the unit has two.
    const seen = new Map<string, string[][]>();
    for (const { day } of DAYS) {
      const rows = seen.get(day.unitId) ?? [];
      rows.push([...day.practice]);
      seen.set(day.unitId, rows);
    }
    let checked = 0;
    for (const [unitId, rows] of seen) {
      const unit = unitById(unitId)!;
      if (!unit.cardTypes.includes("CONJUGATION") || rows.length < 2) continue;
      if (!rows[0]!.includes("conjugation")) continue;
      expect(rows[1], `${unitId} deals the table twice running`).not.toContain("conjugation");
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });

  /*
    THE SYLLABUS SAYS WHAT A UNIT NEEDS, AND THE LADDER HAS TO HONOR IT. Every
    unit declares `requires`, which is its author saying what a learner has to
    have met first, and A2 opened on the request unit whose own declaration
    named the past tense, taught the fortnight after. Read off the ladder in
    order, since the order a learner meets the units is the ladder's and not
    the syllabus file's.
  */
  it("teaches every unit after the units it says it requires", () => {
    const met = new Set<string>();
    for (const part of PARTS) {
      for (const id of part.units) {
        for (const need of unitById(id)!.requires ?? []) {
          expect(met.has(need), `${part.id} teaches ${id} before ${need}`).toBe(true);
        }
        met.add(id);
      }
    }
  });

  /*
    AND A GRAMMAR UNIT IS FOLLOWED BY WORDS TO USE IT ON. B1 opened on four
    units of verbs running and B2 on four, each pinned to a table or a
    government round: a month of the same drill under four names. Never three
    verb units in a row, anywhere on the ladder.
  */
  it("never runs three units of verbs together", () => {
    const ladder = PARTS.flatMap((p) => p.units).map((id) => unitById(id)!);
    const verbHeavy = (u: (typeof ladder)[number]) =>
      u.vocabulary.filter((v) => v.pos === "VERB").length / Math.max(1, u.vocabulary.length) >= VERB_HEAVY;
    for (let i = 2; i < ladder.length; i += 1) {
      const run = [ladder[i - 2]!, ladder[i - 1]!, ladder[i]!];
      expect(run.every(verbHeavy), `${run.map((u) => u.id).join(", ")} run together`).toBe(false);
    }
  });

  /*
    A PAGE IS READ ONCE. The greetings read the politeness page four evenings
    running and the impersonal was read nineteen times between B1 and C1,
    which is a step a learner skips past and then stops trusting.
  */
  it("reads a page once in a unit and once in a part, in the order its author wrote", () => {
    for (const programme of PROGRAMMES) {
      const seen = new Set<string>();
      for (const day of programme.days) {
        const page = day.grammarCase ?? day.grammar;
        if (!page) continue;
        expect(seen.has(page), `${day.id} reads ${page} again inside ${programme.id}`).toBe(false);
        seen.add(page);
      }
    }
    // The pages a unit declares are its plan, in its order, each once.
    const keha = unitById("keha-ja-tervis")!;
    expect(readingPlan(keha, "A2", new Set())).toEqual(["partitive", "adessive", "gradation"]);
    expect(readingPlan(keha, "A2", new Set(["partitive"]))).toEqual(["adessive", "gradation"]);
    // At A1 a case is not a page, and a unit of nothing but cases reads nothing.
    expect(readingPlan(unitById("kodu")!, "A1", new Set())).toEqual([]);
    // And every page a unit declares above A1 is read somewhere on the ladder,
    // except the one page a unit with as many pages as evenings loses to the
    // conversation on its last evening, which is named here rather than waived.
    const LOST_TO_A_SCENE: Record<string, string> = { reisimine: "terminative" };
    const everRead = new Set(DAYS.map(({ day }) => (day.grammarCase ?? day.grammar)?.toLowerCase()));
    for (const unit of SYLLABUS) {
      if (unit.level === "A1") continue;
      for (const name of unit.grammar) {
        if (!grammarTopic(name) && !CASES.some((c) => c.key === name.toUpperCase())) continue;
        if (LOST_TO_A_SCENE[unit.id] === name) {
          expect(SCENE_FOR_UNIT[unit.id], `${unit.id} ends on no scene`).toBeDefined();
          expect(everRead.has(name), `${unit.id} reads ${name} after all; take it off the list`).toBe(false);
          continue;
        }
        expect(everRead.has(name), `${unit.id} declares ${name} and the ladder never reads it`).toBe(true);
      }
    }
  });

  it("counts no page as read on a scene evening, since the conversation replaces the reading", () => {
    let scenes = 0;
    for (const { day } of DAYS) {
      if (!day.scene) continue;
      scenes += 1;
      expect(day.grammar ?? day.grammarCase, `${day.id} reads a page nobody is shown`).toBeUndefined();
      expect(day.steps.some((s) => s.kind === "read"), day.id).toBe(false);
    }
    expect(scenes).toBe(Object.keys(SCENE_FOR_UNIT).length);
  });

  it("holds a verb card in the closing review to the page teaching its part", () => {
    const a2 = PROGRAMMES.find((p) => p.id === "a2.1")!;
    const first = a2.days[0]!;
    const scope = moduleScopeFrom({ module: `${a2.id}~${first.id}~do:review~3~5~0` })!;
    const past = { cardType: "CONJUGATION", targetCase: null, front: "Ta ____ eile.", slot: "IndIpfSg3" };
    const present = { ...past, slot: "IndPrSg3" };
    const spellings = new Set(["ta", "eile"]);
    expect(cardWithin(scope, past, spellings)).toBe(false);
    expect(cardWithin(scope, present, spellings)).toBe(true);
    // The conditional waits for B1 even once A2's request unit has read its page.
    const later = [...a2.days].reverse().find((d) => d.unitId === "korraldused")!;
    const afterPage = moduleScopeFrom({ module: `${a2.id}~${later.id}~do:review~3~5~0` })!;
    expect(afterPage.topics).toContain("conditional");
    expect(cardWithin(afterPage, { ...past, slot: "KndPrSg1" }, spellings)).toBe(false);
    const b1 = PROGRAMMES.find((p) => p.id === "b1.1")!;
    const tingiv = [...b1.days].reverse().find((d) => d.unitId === "tingiv")!;
    const b1scope = moduleScopeFrom({ module: `${b1.id}~${tingiv.id}~do:review~3~5~0` })!;
    expect(cardWithin(b1scope, { ...past, slot: "KndPrSg1" }, spellings)).toBe(true);
  });

  it("conjugates a unit of verbs, and not a grammar unit that happens to hold verbs", () => {
    const verbDay = DAYS.find(({ day }) => day.unitId === "pohiverbid")!;
    expect(verbDay.day.practice).toContain("conjugation");
    // `rektsioon` is mostly verbs and is about government; it declares no
    // conjugation card, and above A1 the rotation carries no table, so it is
    // never dealt one.
    for (const { programme, day } of DAYS) {
      if (programme.level === "A1") continue;
      const declares = unitById(day.unitId)!.cardTypes.includes("CONJUGATION");
      if (!declares) expect(day.practice, `${day.id} is pinned to the table`).not.toContain("conjugation");
    }
    expect(DAYS.some(({ day }) => day.unitId === "rektsioon" && !day.practice.includes("conjugation"))).toBe(true);
    // An A2 unit of nouns, because A1's own rotation carries the table once a
    // verb has been taught, so a noun evening there may honestly deal it.
    const nounDay = DAYS.find(({ day }) => day.unitId === "loodus")!;
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
  it("is fifteen minutes, every evening, and shorter only where there is nothing to read", () => {
    for (const { day } of DAYS) {
      /*
        An evening with nothing new to read reads nothing: a beginner reads
        no case page, and a page read last night is not put in front of
        anybody again as tonight's step (`readingPlan`). It is two minutes
        shorter for it rather than two minutes of something invented to fill
        the slot. A quarter of an hour is the ceiling somebody planned their
        evening around; thirteen is that promise kept.
      */
      const reads = day.steps.some((s) => s.kind === "read" || s.kind === "talk");
      const floor = reads ? DAY_MINUTES - 2 : DAY_MINUTES - 2 - READ_MINUTES;
      expect(day.minutes, `${day.id} claims ${day.minutes} minutes`)
        .toBeGreaterThanOrEqual(floor);
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

  /*
    AND EVERY DAY HAS SOMETHING THE LOG CANNOT PROVE, which the reading leans
    on twice. It is what makes a tick the pointer, since a day nobody ticked
    anything on is a day nobody started; and it is why the reading asks the log
    about two days and never three, because the day after the one it advances
    to has no ticks and so can never complete unasked. A day of nothing but a
    meet and a review would finish itself the moment its words were met
    somewhere else and walk the learner through the programme.
  */
  it("gives every evening a step only the learner can say they did", () => {
    for (const { day } of DAYS) {
      expect(day.steps.some((s) => !s.derived), day.id).toBe(true);
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

  it("credits every part before this one, not only the part in hand", () => {
    /*
      A `Programme` is one part of seventeen, so `wordsThrough` answers about a
      fortnight and `taughtThrough` about the ladder. Drawn against the part,
      the readability rule credited a learner on their first evening of a1.5
      with eight words rather than 394 and refused nearly every sentence they
      could read, so the difference between the two is the whole test.
    */
    const later = PROGRAMMES.find((p) => p.id === "a1.5")!;
    const earlier = PROGRAMMES.slice(0, PROGRAMMES.indexOf(later));
    const before = new Set(earlier.flatMap((p) => p.days.flatMap((d) => d.words)));

    const firstEvening = taughtThrough(later, 1);
    expect(wordsThrough(later, 1)).toEqual([...later.days[0]!.words]);
    expect(firstEvening.length).toBeGreaterThan(before.size);
    for (const word of before) expect(firstEvening).toContain(word);
    for (const word of later.days[0]!.words) expect(firstEvening).toContain(word);
    expect(new Set(firstEvening).size).toBe(firstEvening.length);

    // The first part of the ladder has nothing ahead of it, so the two agree.
    expect(taughtThrough(PROGRAMMES[0]!, 2)).toEqual(wordsThrough(PROGRAMMES[0]!, 2));
  });

  it("draws on units in the order it first needs them", () => {
    const units = programmeUnits(programme);
    expect(units.length).toBeGreaterThan(2);
    expect(new Set(units).size).toBe(units.length);
    expect(units[0]).toBe(programme.days[0]!.unitId);
  });
});
