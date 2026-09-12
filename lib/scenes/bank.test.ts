import { describe, expect, it } from "vitest";
import { BANK } from "./bank";
import { SCENES, FALLBACK_PHRASE, sceneById } from "./catalogue";
import { isPhrase } from "@/lib/dict/pos";
import { POOL } from "../../scripts/lib/sceneDraft";
import { passes, gateFor, runGate } from "./gate";
import { words } from "./lexicon";
import { curveballById } from "./curveballs";
import { answerBeatId, beatById, scriptable, scriptedFor, sceneBeats } from "./scripted";
import { answerForms, keylessContext, lacksFiniteVerb } from "../../scripts/lib/sceneDraft";
import { fitsPitch } from "./pitch";
import { LEVELS } from "@/lib/collections/syllabus";

/**
 * The bank is Estonian a model wrote, so it is held to the gate every time
 * the suite runs and not only on the day it was drafted.
 *
 * The context is built from the shipped dictionary rather than a database,
 * the way `scripts/eval-scene.ts` builds it, which is what lets this run on
 * any checkout: a scene edited after a row was drafted, a unit that lost a
 * word in a reseed, or a gate that grew a fifth check all show up here as a
 * row that no longer passes, which is the row a learner would otherwise meet.
 */
describe("the scripted bank", () => {
  it("names only scenes and beats the catalog has", () => {
    for (const row of BANK) {
      const scene = sceneById(row.scene);
      expect(scene, `${row.scene} is not a scene`).toBeDefined();
      expect(scene ? sceneBeats(scene).map((b) => b.id) : [], `${row.scene}/${row.beat} is not a beat`).toContain(row.beat);
    }
  });

  it("holds no line for a beat whose value is drawn per run", () => {
    for (const row of BANK) {
      const scene = sceneById(row.scene)!;
      const beat = beatById(scene, row.beat)!;
      expect(scriptable(scene, beat), `${row.scene}/${row.beat} draws a value per run`).toBe(true);
    }
  });

  it("passes the gate today, against its scene's own word list", () => {
    const contexts = new Map(SCENES.map((scene) => [scene.id, keylessContext(scene)]));
    for (const row of BANK) {
      const scene = sceneById(row.scene)!;
      const beat = beatById(scene, row.beat)!;
      const verdict = runGate(row.text, beat, gateFor(row.beat, contexts.get(scene.id)!.gate));
      expect(passes(verdict), `${row.scene}/${row.beat}: "${row.text}" fails ${verdict.failed.join(", ")} [${verdict.unknown.join(" ")}]`)
        .toBe(true);
    }
  });

  it("never hands over the form the beat is about to ask for", () => {
    /*
      The answer printed in the question, which is the fault `audit:questions`
      hunts on every card. "Kas sa tahad piima osta?" before a beat that wants
      `piima` was the first thing the drafter produced, three times over.
    */
    const contexts = new Map(SCENES.map((scene) => [scene.id, keylessContext(scene)]));
    for (const row of BANK) {
      const scene = sceneById(row.scene)!;
      const beat = beatById(scene, row.beat)!;
      const answers = answerForms(beat, contexts.get(scene.id)!.lexicon);
      const given = words(row.text).filter((w) => answers.has(w));
      expect(given, `${row.scene}/${row.beat}: "${row.text}" hands over ${given.join(" ")}`).toEqual([]);
    }
  });

  it("has a finite verb in every line long enough to need one, which is the fault the gate cannot see", () => {
    // "Kus pood praegu olema?" passes all four checks and is not a sentence anybody says.
    for (const row of BANK) {
      const scene = sceneById(row.scene)!;
      const beat = beatById(scene, row.beat)!;
      expect(lacksFiniteVerb(row.text, beat), `${row.scene}/${row.beat}: "${row.text}" has no finite verb`).toBe(false);
    }
  });

  it("holds no digit, no dash and never the way out", () => {
    for (const row of BANK) {
      expect(row.text, `${row.scene}/${row.beat} holds a digit`).not.toMatch(/\d/);
      expect(row.text, `${row.scene}/${row.beat} holds a dash or colon`).not.toMatch(/[\u2013\u2014:;]/);
      expect(words(row.text).join(" ")).not.toBe(words(FALLBACK_PHRASE).join(" "));
    }
  });

  /*
    A ROW DRAFTED FOR A BAND FITS IT, as far as counting can tell. The pitch
    is mostly a description the model reads, and the two figures in it are
    the half a test can hold a row to: a forty-word A1 line is not an A1 line
    whatever the model was told. What a band a row names is one the course
    names, since `scriptedFor` reads rows by it and a typo there is a row no
    run ever says.
  */
  it("holds every pitched row inside its own band, and names only bands the course has", () => {
    for (const row of BANK) {
      if (row.level === undefined) continue;
      expect(LEVELS, `${row.scene}/${row.beat} names band ${row.level}`).toContain(row.level);
      expect(fitsPitch(row.text, row.level), `${row.scene}/${row.beat} @${row.level}: "${row.text}"`).toBeNull();
    }
  });

  it("reads a run's own band first and never another band's", () => {
    const shop = sceneById("poodi-piima")!;
    const beat = shop.beats[1]!;
    const all = scriptedFor(shop, beat);
    for (const level of LEVELS) {
      const mine = scriptedFor(shop, beat, level);
      const rows = BANK.filter((row) => row.scene === shop.id && row.beat === beat.id);
      const own = rows.filter((row) => row.level === level).map((row) => row.text);
      const unpitched = rows.filter((row) => row.level === undefined).map((row) => row.text);
      expect(mine).toEqual([...own, ...unpitched]);
      for (const text of mine) expect(all).toContain(text);
    }
  });

  it("says who drafted each line and when, and whether a person has read it", () => {
    for (const row of BANK) {
      expect(row.model.length).toBeGreaterThan(0);
      expect(row.draftedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof row.reviewed).toBe("boolean");
    }
  });

  it("never repeats a line within one beat", () => {
    const seen = new Set<string>();
    for (const row of BANK) {
      const key = `${row.scene}|${row.beat}|${row.text.toLowerCase()}`;
      expect(seen.has(key), `${key} twice`).toBe(false);
      seen.add(key);
    }
  });

  it("is read through the scriptable rule rather than trusted", () => {
    // A beat that draws a time can have no scripted line, whatever the bank holds.
    const doctor = sceneById("arsti-aeg")!;
    const offer = doctor.beats.find((b) => b.id === "offer")!;
    expect(scriptable(doctor, offer)).toBe(false);
    expect(scriptedFor(doctor, offer)).toEqual([]);
    // And one that does not is scriptable, whether or not anything was drafted yet.
    const shop = sceneById("poodi-piima")!;
    expect(scriptable(shop, shop.beats[1]!)).toBe(true);
  });

  /*
    A BEAT THEY WILL ASK TWICE HAS TWO WAYS OF ASKING IT, or the second ask is
    the first one again, word for word.

    `patience` is how many times the other side tries again before letting a
    beat go, so a beat with patience above one is a beat a learner who is
    *engaging* meets more than once: an `incomplete` or an `offtarget` turn is
    read as `narrow`, which asks for a fresh line rather than repeating the
    heard one. The ladder passes over a scripted line this run has already
    used, so on a beat holding exactly one the scripted rung comes back empty,
    and keyless there is nothing under it: `replyFor` falls through to
    `{ text: heard, provenance: "again" }` and says the identical sentence to
    somebody whose answer was nearly right. A person rephrases. Twenty-seven
    beats were in that state when this was written, twenty-six of them
    curveballs, which is exactly where a learner is most likely to need two
    goes.

    Drawn on patience rather than on every beat, because a beat nobody asks
    twice cannot repeat itself and a second line there is a line nobody hears.
    The exemptions are the coverage test's own, for its reasons: a phrase beat
    is answered by the dictionary, a beat that waits opens with nothing, and a
    beat naming a value off the card is said by `datumLine` per run and is
    therefore never the same sentence twice anyway.
  */
  it("holds a second way of asking every beat the other side asks more than once", () => {
    const phrases = new Set(POOL.filter((e) => isPhrase(e.pos)).map((e) => e.lemma));
    for (const scene of SCENES) {
      for (const beat of sceneBeats(scene)) {
        if (beat.patience <= 1) continue;
        if (beat.topic.some((lemma) => phrases.has(lemma)) || beat.says) continue;
        if (!scriptable(scene, beat) || beat.awaits) continue;
        expect(
          scriptedFor(scene, beat).length,
          `${scene.id}/${beat.id} is asked ${beat.patience} times and has one line, so the second ask repeats it verbatim`,
        ).toBeGreaterThan(1);
      }
    }
  });

  /*
    EVERY SCENE PLAYS KEYLESS FROM THE FIRST LINE TO THE DEBRIEF, and this is
    what makes that a property rather than a claim: every beat that can carry
    a line has one, or is a phrase beat the dictionary answers, or names a
    value off the card and is said by `datumLine`. Every curveball a scene
    admits that has a move to make has a line for that scene. A scene added
    without its lines fails here rather than greeting a learner in English.
  */
  /*
    AND THE CLAIM ABOVE IS ONLY AS WIDE AS `sceneBeats`, WHICH IS WHERE ONE
    CURVEBALL FELL THROUGH IT.

    A curveball with no `move` makes no beat, so nothing could be banked for it
    and the sweep above skipped it in silence. `other-register` was in that
    state for its whole life: the live composer's line was withheld by the very
    check the curveball exists to break, no line was bankable, and what a
    learner met mid-conversation was the English sentence describing what was
    supposed to be happening. Two curveballs are legitimately silent here and
    both say so in their own spec, so a third arriving without a move fails.
  */
  it("and every curveball a scene admits is a beat, unless it is silent or speaks English", () => {
    for (const scene of SCENES) {
      for (const id of scene.curveballs) {
        const spec = curveballById(id);
        expect(spec, `${scene.id} admits ${id}, which is not a curveball`).toBeTruthy();
        if (spec!.silent || spec!.said) continue;
        expect(
          sceneBeats(scene).some((beat) => beat.id === `hurdle:${id}`),
          `${scene.id}/${id} makes no beat, so nothing can be said for it and the screen prints English`,
        ).toBe(true);
      }
    }
  });

  it("holds a line for every beat and every curveball of every scene, so keyless is whole", () => {
    const phrases = new Set(POOL.filter((e) => isPhrase(e.pos)).map((e) => e.lemma));
    for (const scene of SCENES) {
      for (const beat of sceneBeats(scene)) {
        const phraseBeat = beat.topic.some((lemma) => phrases.has(lemma));
        if (phraseBeat || beat.says) continue;
        if (!scriptable(scene, beat)) continue;
        // A beat the other side opens with nothing has no opening line by design; its answers are banked under `answer:`.
        if (beat.awaits) continue;
        /*
          AND AN ANSWER BEAT IS HELD TO THE SAME CLAIM AS EVERY OTHER, WHICH
          THIS USED TO WAIVE WHOLESALE.

          It skipped every answer beat whose question beat did not open with
          nothing, on the argument that the next move is the answer. That is
          true of four of the eleven beats whose goal is to ask something and
          false of the rest, and seven of them had no answer banked at all: at
          a job interview a learner did as they were told, asked about the
          pay, and was answered with the next question three times while they
          insisted. `answeredNext` is the scene saying which it is, and
          `sceneBeats` makes no answer beat for those, so there is nothing
          left here to waive.
        */
        expect(
          scriptedFor(scene, beat).length,
          `${scene.id}/${beat.id} has no line, so keyless it is English`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("the answers to the questions a beat asks for", () => {
  it("are banked under the beat's own answer id, and every waiting beat has one", () => {
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        if (!beat.awaits) continue;
        const answer = beatById(scene, answerBeatId(beat));
        expect(answer, `${scene.id}/${beat.id} waits and has no answer beat`).toBeDefined();
        expect(scriptedFor(scene, answer!).length, `${scene.id}/${beat.id} waits and the bank holds no answer`).toBeGreaterThan(0);
      }
    }
  });
});
