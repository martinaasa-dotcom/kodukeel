import { describe, expect, it } from "vitest";
import { BANK } from "./bank";
import { SCENES, FALLBACK_PHRASE, sceneById } from "./catalogue";
import { isPhrase } from "@/lib/dict/pos";
import { POOL } from "../../scripts/lib/sceneDraft";
import { passes, gateFor, runGate } from "./gate";
import { words } from "./lexicon";
import { curveballById } from "./curveballs";
import { fitsIn, notBeforeIn } from "./run";
import { askedLemmas } from "./types";
import { answerBeatId, beatById, scriptable, scriptedFor, sceneBeats } from "./scripted";
import { answerForms, asksTheirQuestion, keylessContext, lacksFiniteVerb } from "../../scripts/lib/sceneDraft";
import { sayableAfterHurdles } from "./reply";
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

  it("never asks the question the learner is there to ask", () => {
    // The shop assistant asking the customer what the shop's own coat costs, which passes every gate check.
    const contexts = new Map(SCENES.map((scene) => [scene.id, keylessContext(scene)]));
    let asking = 0;
    for (const row of BANK) {
      const scene = sceneById(row.scene)!;
      const beat = beatById(scene, row.beat)!;
      if (beat.needs.some((need) => need.kind === "question")) asking += 1;
      expect(asksTheirQuestion(row.text, beat, contexts.get(scene.id)!.lexicon), `${row.scene}/${row.beat}: "${row.text}" asks the learner's question`)
        .toBe(false);
    }
    expect(asking, "no row sits on a beat where the learner asks, so this asks nothing").toBeGreaterThan(40);
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
  /*
    A price is dealt per run and said off the card, so a banked line naming one
    is wrong on every run that dealt anything else. "Holds no digit" could not
    see it spelled out: the clothes shop's till answered `See maksab
    kakskümmend eurot.` to a learner whose card said 33.
  */
  it("names no amount of money, since every price is dealt per run", () => {
    let checked = 0;
    for (const scene of SCENES) {
      const { lexicon } = keylessContext(scene);
      const euro = new Set([...(lexicon.byLemma.get("euro") ?? []), "euro", "eurot"].map((form) => form.toLowerCase()));
      for (const row of BANK.filter((r) => r.scene === scene.id)) {
        checked += 1;
        expect(words(row.text).some((word) => euro.has(word)), `${scene.id}/${row.beat}: "${row.text}" names an amount of money`).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("holds every pitched row inside its own band, and names only bands the course has", () => {
    for (const row of BANK) {
      if (row.level === undefined) continue;
      expect(LEVELS, `${row.scene}/${row.beat} names band ${row.level}`).toContain(row.level);
      expect(fitsPitch(row.text, row.level), `${row.scene}/${row.beat} @${row.level}: "${row.text}"`).toBeNull();
    }
  });

  /*
    A run's own band leads, then the unpitched net, then plainer bands nearest
    first, and a harder band only for a beat nothing else holds a line for.
    The clothes shop is the scene that needed the last two: drafted band by
    band with almost no unpitched rows, it had nothing at B2 or C1, and with
    no model a learner there read English stage directions on every beat.
  */
  it("reads a run's own band first, then the net, then plainer bands, and a harder one only where nothing else exists", () => {
    let harderUsed = 0;
    for (const scene of SCENES) {
      for (const beat of sceneBeats(scene)) {
        const rows = BANK.filter((row) => row.scene === scene.id && row.beat === beat.id);
        if (!scriptable(scene, beat)) continue;
        for (const level of LEVELS) {
          const at = LEVELS.indexOf(level);
          const own = rows.filter((row) => row.level === level).map((row) => row.text);
          const unpitched = rows.filter((row) => row.level === undefined).map((row) => row.text);
          const plainer = LEVELS.slice(0, at).reverse().flatMap((one) => rows.filter((row) => row.level === one).map((row) => row.text));
          const harder = LEVELS.slice(at + 1).flatMap((one) => rows.filter((row) => row.level === one).map((row) => row.text));
          const mine = scriptedFor(scene, beat, level);
          const before = [...own, ...unpitched, ...plainer];
          expect(mine, `${scene.id}/${beat.id} at ${level}`).toEqual(before.length > 0 ? before : harder);
          if (before.length === 0 && harder.length > 0) harderUsed += 1;
        }
      }
    }
    // A harder band's line is the last resort; if it becomes the ordinary case, the bank needs plainer lines.
    expect(harderUsed).toBeLessThan(5);
  });

  it("says who drafted each line and when", () => {
    for (const row of BANK) {
      expect(row.model.length).toBeGreaterThan(0);
      expect(row.draftedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
        // At every band a run can be at, since a run reads its own band's lines and not the whole bank's.
        for (const level of LEVELS) {
          expect(
            scriptedFor(scene, beat, level).length,
            `${scene.id}/${beat.id} is asked ${beat.patience} times and has one line at ${level}, so the second ask repeats it verbatim`,
          ).toBeGreaterThan(1);
        }
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
        // At every band: a beat whose lines are all another band's used to be English at this one.
        for (const level of LEVELS) {
          expect(
            scriptedFor(scene, beat, level).length,
            `${scene.id}/${beat.id} has no line at ${level}, so keyless it is English`,
          ).toBeGreaterThan(0);
        }
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

/*
  A CURVEBALL THAT UNSAYS A WORD MAY NOT LEAVE A BEAT WITH NOTHING TO SAY.
  `not-possible` holds back a prepared line saying "today" once it is raised,
  and the restaurant's recommendation had only two lines, both with "today" in
  them: with the curveball raised, the screen printed the English stage
  direction where the waiter's line should be.
*/
describe("the lines a curveball leaves standing", () => {
  it("leave every beat of every scene that admits it a line to say", () => {
    const lexicon = { byLemma: new Map<string, ReadonlySet<string>>() } as unknown as Parameters<typeof sayableAfterHurdles>[2];
    const negators = new Set(["ei", "pole", "mitte"]);
    let checked = 0;
    for (const scene of SCENES) {
      for (const id of scene.curveballs) {
        if (!curveballById(id)?.unsays) continue;
        const state = { hurdle: null, hurdles: [{ id, beat: 1, met: true }] };
        for (const beat of scene.beats) {
          const rows = scriptedFor(scene, beat);
          if (rows.length === 0) continue;
          checked += 1;
          expect(sayableAfterHurdles(rows, state, lexicon, negators).length, `${scene.id}/${beat.id} after ${id}`).toBeGreaterThan(0);
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

/*
  A CURVEBALL'S LINE IS SAID WHEREVER THE CURVEBALL CAN STAND, so it may not
  talk about what the conversation has not reached. The clothes shop's "in a
  hurry" lines all said to put the clothes down and pay, and the corner shop's
  two drafted ones to take the bread and milk; `faster` can stand in front of
  the first question, where nothing has been chosen and nothing is being paid
  for. A mishearing is held to the same rule at runtime instead
  (`sayableAfterHurdles`), since its lines are about one beat each by design,
  and what is asserted for it is that wherever it can stand one is left.
*/
describe("the lines a curveball says while it stands", () => {
  it("say only that they are in a hurry, which is true in front of any beat", () => {
    let checked = 0;
    for (const scene of SCENES.filter((s) => s.curveballs.includes("faster"))) {
      const { lexicon } = keylessContext(scene);
      const from = notBeforeIn(scene)("faster");
      const reached = new Set(scene.beats.slice(0, from + 1).flatMap((beat) => askedLemmas(scene, beat)));
      // Not the goodbye: `Head aega!` holds `aega`, and a hurry has nothing to do with the farewell.
      const later = scene.beats.slice(from + 1).filter((beat) => beat.move !== "close")
        .flatMap((beat) => askedLemmas(scene, beat)).filter((lemma) => !reached.has(lemma));
      const spelled = new Map(later.flatMap((lemma) => [lemma, ...(lexicon.byLemma.get(lemma) ?? [])].map((form) => [form.toLowerCase(), lemma] as const)));
      for (const row of BANK.filter((r) => r.scene === scene.id && r.beat === "hurdle:faster")) {
        checked += 1;
        const named = words(row.text).filter((word) => spelled.has(word)).map((word) => spelled.get(word));
        expect(named, `${scene.id}: "${row.text}" names what a later beat asks for`).toEqual([]);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("leave a mishearing a line about the beat just answered, wherever the planner can stand one", () => {
    let checked = 0;
    for (const scene of SCENES.filter((s) => s.curveballs.includes("misheard"))) {
      const { lexicon } = keylessContext(scene);
      const beat = sceneBeats(scene).find((b) => b.id === "hurdle:misheard")!;
      const pool = scriptedFor(scene, beat);
      const rows = BANK.filter((row) => row.scene === scene.id && row.beat === "hurdle:misheard");
      for (const row of rows) {
        const about = scene.beats.find((b) => b.id === row.about);
        expect(about, `${scene.id}: "${row.text}" does not say which beat it is about`).toBeDefined();
        expect(["greet", "close"], `${scene.id}: "${row.text}" is about the ${about?.move}`).not.toContain(about?.move);
      }
      const fits = fitsIn(scene);
      const places = scene.beats.map((_, at) => at).filter((at) => at >= notBeforeIn(scene)("misheard") && fits("misheard", at));
      expect(places.length, `${scene.id} admits a mishearing and has nowhere to stand one`).toBeGreaterThan(0);
      for (const at of places) {
        checked += 1;
        const state = { hurdle: { id: "misheard" as const, beat: at, tries: 0 }, hurdles: [] };
        const said = sayableAfterHurdles(pool, state, lexicon, new Set(["ei", "pole", "mitte"]), scene)[0];
        const just = scene.beats[at - 1]!.id;
        expect(rows.find((row) => row.text === said)?.about, `${scene.id}: in front of ${scene.beats[at]!.id} it says "${said}"`).toBe(just);
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});
