/**
 * What a scene file is allowed to say.
 *
 * `docs/21-situations.md` §21 named this as invariant 1 and named it wrongly:
 * "no file under the catalog contains an Estonian letter", modeled on the
 * tripwire over `lib/estonian/grammar.ts`. Building the catalog is what
 * showed the rule was incoherent, because a scene has to name the words its
 * beats are about, and a check keyed on `õäöüšž` would allow `valu` and reject
 * `küte`, which is not a distinction about anything.
 *
 * What holds instead is stronger and is what is asserted here: every lemma a
 * scene names is a word one of its own declared units already teaches. A scene
 * cannot introduce vocabulary at all, only point at vocabulary the Ekilex
 * harvest already brought back, so a typo in this catalog fails here rather
 * than becoming a word the app believes in. That is exactly the standing
 * `lib/collections/syllabus/` has, one layer up: a lemma is a request, and
 * `syllabus.test.ts` fails when the harvest did not honor it.
 */
import { describe, expect, it } from "vitest";
import { ASIDES, FALLBACK_PHRASE, REACTIONS, SCENES, sceneById } from "./catalogue";
import { HARVESTED } from "@/prisma/data/harvested";
import { curveballById } from "./curveballs";
import { LEFT_OUTCOME, QUESTION_SHAPE, leafNeeds } from "./types";
import { unitById } from "@/lib/collections/syllabus";
import { CLOCK_LEMMA, TIME_LEMMAS } from "./props";
import { CHOICE_WORD } from "./choice";

/** Every lemma a scene names, from its beats' topics and its requirements. */
function lemmasOf(scene: (typeof SCENES)[number]): string[] {
  const out: string[] = [];
  for (const beat of scene.beats) {
    out.push(...beat.topic);
    for (const part of [...(beat.says ?? []), ...(beat.counter?.says ?? [])]) if ("lemma" in part) out.push(part.lemma);
    for (const { need } of leafNeeds(beat.needs)) {
      if (need.kind === "lemma") out.push(...need.oneOf);
      if (need.kind === "case") out.push(need.lemma);
    }
  }
  return out;
}

describe("the scene catalog", () => {
  it("has scenes", () => {
    expect(SCENES.length).toBeGreaterThan(0);
    expect(sceneById(SCENES[0]!.id)?.title).toBe(SCENES[0]!.title);
  });

  it("gives every scene a unique id", () => {
    const ids = SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names only units that exist", () => {
    for (const scene of SCENES) {
      for (const id of scene.units) {
        expect(unitById(id), `${scene.id} names unit ${id}`).toBeDefined();
      }
    }
  });

  /*
    The one that matters. A scene may not write Estonian; it may point at
    Estonian the course already teaches, and this is what makes that mechanical
    rather than a promise in a comment.
  */
  it("names only words its own units teach", () => {
    for (const scene of SCENES) {
      const taught = new Set<string>();
      for (const id of scene.units) {
        for (const lemma of unitById(id)?.lemmas ?? []) taught.add(lemma);
      }
      // The reactions are said in every scene, so every scene has to teach them.
      const asides = Object.values(ASIDES).flatMap((parts) => parts.map((part) => part.lemma));
      /*
        Every reaction, read off the table rather than named here. The first
        version listed `acknowledge` and `waiting`, so the day a third kind
        of reaction was added it was said in every scene and checked in none,
        which is the fault this file's own header describes one layer out.
      */
      const reactions = Object.values(REACTIONS).flat();
      // The word between two options, said in every scene that narrows a question.
      /*
        And the word a time is told with, which the gate reads to tell a count
        from an appointment: a scene whose units do not teach `kell` cannot be
        checked for offering an hour nobody dealt.
      */
      const named = [
        ...lemmasOf(scene), ...reactions, ...asides, ...TIME_LEMMAS, CHOICE_WORD, CLOCK_LEMMA,
      ];
      const strangers = [...new Set(named)].filter((lemma) => !taught.has(lemma));
      expect(strangers, `${scene.id} names words none of its units teach`).toEqual([]);
    }
  });

  /*
    A CARD MAY NOT DEAL A WORD THE SCENE WILL NOT TAKE.

    The landlord's card drew from six problems and the beat that asks what
    has gone wrong accepted a different six: two of the draws, a third of
    runs, dealt a card whose word the beat refused. The learner reads "the
    window is broken", says so correctly, and is treated as having said
    nothing, which is the worst thing this module can do to somebody.
  */
  it("deals no word its own beats cannot accept", () => {
    for (const scene of SCENES) {
      const accepted = new Set<string>();
      for (const beat of scene.beats) {
        for (const { need } of leafNeeds(beat.needs)) {
          if (need.kind === "lemma") for (const lemma of need.oneOf) accepted.add(lemma);
          if (need.kind === "case") accepted.add(need.lemma);
          // A datum requirement takes whatever the card dealt for that slot.
          if (need.kind === "datum") accepted.add(`slot:${need.slot}`);
        }
      }
      for (const prop of scene.props) {
        if (prop.kind !== "word" && prop.kind !== "weekday") continue;
        if (accepted.has(`slot:${prop.slot}`)) continue;
        const refused = prop.oneOf.filter((lemma) => !accepted.has(lemma));
        expect(refused, `${scene.id} deals ${prop.slot} words no beat accepts`).toEqual([]);
      }
    }
  });

  /*
    A BEAT'S GOAL NAMES THE ANSWER, WHEREVER THERE IS EXACTLY ONE.

    A goal is the objective printed on the screen, and where the beat accepts
    exactly one word a goal that does not name it is a trap rather than an
    instruction. The milk scene had four of them: it asked "Say where you are
    now" and took only "at the shop", so a learner reading their own card,
    which had put them at home, answered honestly three times and was refused
    three times. There is nothing wrong with the marker in that story; the
    screen simply never told them what was wanted.

    The English gloss is what the check reads, because that is the one column
    of the harvest a person authored and it is how the word would be named to
    somebody who does not have it yet. A gloss is a list of senses and any of
    them counts: `pood` is "shop, store", and either word in the goal is the
    goal naming it.

    Deliberately not asked of a beat that would take any of several words: the
    landlord's "say what has gone wrong" accepts eleven, and naming one would
    be the fault `offerFor` already had, where a learner is told to say the
    heating is broken by a scene whose card says it is the door. Nor of a
    `datum`, whose answer is on the card and differs per run; that one is
    covered by the check below.
  */
  it("names the one word it will take, wherever a beat will take exactly one", () => {
    const glosses = new Map(HARVESTED.map((word) => [word.lemma, word.gloss]));
    /* The senses of a gloss, since `shop, store` offers two names for one word. */
    const senses = (gloss: string) =>
      gloss.split(/[,;]/).map((sense) => sense.replace(/\([^)]*\)/g, "").trim()).filter(Boolean);
    const missing: string[] = [];
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        const leaves = leafNeeds(beat.needs);
        /*
          One requirement, and one word that would meet it. A beat that offers
          a choice is a beat with no single answer to name.
        */
        if (leaves.length !== 1) continue;
        const only = leaves[0]!.need;
        const lemma = only.kind === "case" ? only.lemma
          : only.kind === "lemma" && only.oneOf.length === 1 ? only.oneOf[0]!
          : null;
        if (!lemma) continue;
        const gloss = glosses.get(lemma);
        if (!gloss) continue;
        const goal = beat.goal.toLowerCase();
        if (senses(gloss).some((sense) => goal.includes(sense.toLowerCase()))) continue;
        missing.push(`${scene.id}/${beat.id}: "${beat.goal}" never names ${lemma} (${gloss})`);
      }
    }
    expect(missing, "a beat takes one word and its goal does not say which").toEqual([]);
  });

  /*
    EVERY QUESTION A BEAT ASKS THE LEARNER FOR IS ANSWERED BY SOMEBODY.

    A beat whose whole goal is "ask about the pay" is met by a question, and a
    question is owed an answer. Seven of the eleven such beats had none and
    nothing said so: `asideFor` returned nothing and `asideOwed` reported that
    nothing was owed, on the argument that the next move is the answer. That is
    true of four of them, and at a job interview the next move is "when could
    you start", so a learner who did as they were told was answered with a
    fresh question, three times, while they insisted. It was reported as the
    app leaving them hanging, which it did.

    So the scene says which it is, and this is the check: `answer` for what
    they say when asked, or `answeredNext` where the move after it is the
    answer. Never both, because a beat whose next move answers it has nothing
    to bank.
  */
  it("says who answers every question a beat asks the learner for", () => {
    const silent: string[] = [];
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        const wanted = leafNeeds(beat.needs).some(({ need }) => need.kind === "question");
        if (!wanted) {
          expect(beat.answer, `${scene.id}/${beat.id} answers a question nobody asked for`).toBeUndefined();
          expect(beat.answeredNext, `${scene.id}/${beat.id} answers a question nobody asked for`).toBeUndefined();
          continue;
        }
        if (Boolean(beat.answer) === Boolean(beat.answeredNext)) {
          silent.push(`${scene.id}/${beat.id}: "${beat.goal}"`);
        }
      }
    }
    expect(silent, "a beat asks the learner for a question and nothing says who answers it").toEqual([]);
  });

  /*
    AND NO GOAL SENDS THE LEARNER TO THEIR CARD, BECAUSE THE VALUE IS BESIDE
    THE GOAL.

    It used to say so, and had to: the objective read "Say which floor you
    live on. It is on your card", and the card was a disclosure two lines up
    with three lines of prose in it. A learner sent a screenshot of that card
    and said the information was hard to find and that the instruction should
    carry it. They are right, and the sentence pointing at the card is the
    thing that was covering for it, exactly as "read it off the word below"
    covered for a card that printed no word.

    So the objective carries the value (`SceneSession`, checked in the
    invariant suite because it is a fact about a screen), and a goal that
    sends somebody somewhere else to read it is the fault coming back. That
    every datum a beat asks for is a slot the card actually deals is checked
    below, and is what makes the value there to print.
  */
  it("never sends the learner off to read their card, since the objective carries the value", () => {
    const pointing: string[] = [];
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        /*
          THE ROLE CARD, NOT EVERY CARD. Written as a bare word this fired on
          `or just agree to the card`, which is how anybody pays at a ticket
          window and is not a learner being sent off to read anything. A check
          that fires on honest copy gets waived, so the rule is widened to the
          shapes that actually send somebody away.
        */
        if (/your card|card says|on the card|off the card/i.test(beat.goal)) {
          pointing.push(`${scene.id}/${beat.id}: "${beat.goal}"`);
        }
      }
    }
    expect(pointing, "a goal sends the learner to their card instead of naming the value").toEqual([]);
  });

  /*
    TIME PASSING IS ENGLISH, AND A SENTENCE. `meanwhile` is printed as a break
    in the conversation, so it is held to what every other authored line in
    this file is held to: no Estonian, and a sentence rather than a fragment.
  */
  it("writes what has happened since in English, as a sentence", () => {
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        if (!beat.meanwhile) continue;
        expect(beat.meanwhile, `${scene.id}/${beat.id} is not a sentence`).toMatch(/^[A-Z].*\.$/);
        expect(beat.meanwhile, `${scene.id}/${beat.id} carries an Estonian letter`).not.toMatch(/[õäöüšž]/i);
      }
    }
  });

  /*
    A scene exists to check one of the course's own claims, so it says which.
    Without this the catalog drifts into a list of situations somebody thought
    sounded useful, which is the failure mode that has no test.
  */
  it("tests a unit it draws on", () => {
    for (const scene of SCENES) {
      expect(unitById(scene.tests), `${scene.id} tests ${scene.tests}`).toBeDefined();
      expect(scene.units, `${scene.id} tests a unit it does not draw on`).toContain(scene.tests);
      expect(unitById(scene.tests)?.canDo).toBeTruthy();
    }
  });

  it("gives every beat a goal, a known move and a unique id", () => {
    for (const scene of SCENES) {
      const ids = scene.beats.map((b) => b.id);
      expect(new Set(ids).size, `${scene.id} repeats a beat id`).toBe(ids.length);
      for (const beat of scene.beats) {
        expect(beat.goal.length, `${scene.id}/${beat.id} has no goal`).toBeGreaterThan(0);
        expect(QUESTION_SHAPE[beat.move]).toBeDefined();
        expect(beat.topic.length, `${scene.id}/${beat.id} is about nothing`).toBeGreaterThan(0);
        expect(beat.needs.length, `${scene.id}/${beat.id} asks for nothing`).toBeGreaterThan(0);
        expect(beat.patience).toBeGreaterThan(0);
      }
    }
  });

  /*
    WHAT THE OTHER SIDE DOES IS WRITTEN FROM THEIR SIDE, IN ENGLISH. `they` is
    the stage direction printed where no Estonian line could be built, the
    translation a helpful persona offers, and what a model is told it is doing
    when it writes the line, so it has to be a sentence and it has to be about
    them: a beat whose `they` reads like its `goal` has been written from the
    learner's side twice.
  */
  it("says what the other side does on every beat, from their side", () => {
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        expect(beat.they, `${scene.id}/${beat.id} has no stage direction`).toMatch(/^[A-Z].*\.$/);
        expect(beat.they, `${scene.id}/${beat.id} repeats its goal`).not.toBe(beat.goal);
        expect(beat.they, `${scene.id}/${beat.id} is written from the learner's side`).not.toMatch(/^Say /);
        expect(beat.they, `${scene.id}/${beat.id} carries an Estonian letter`).not.toMatch(/[õäöüšž]/i);
      }
    }
  });

  /*
    A PINNED LINE IS A LEXICOGRAPHER'S SENTENCE, CHOSEN AND NEVER WRITTEN.
    Choosing is allowed (ADR-005 lets an attested sentence be hidden from or
    reordered, and picking one out is less than either); writing is not, and
    the difference is checkable: the text has to be a usage the harvest
    brought back under one of the beat's own topic words.
  */
  it("says a value off the card only through a slot the card deals", () => {
    for (const scene of SCENES) {
      const slots = new Set(scene.props.map((prop) => prop.slot));
      for (const beat of scene.beats) {
        for (const part of [...(beat.says ?? []), ...(beat.counter?.says ?? [])]) {
          if (!("slot" in part)) continue;
          expect(slots.has(part.slot), `${scene.id}/${beat.id} says a slot the card never deals`).toBe(true);
        }
        for (const [from, to] of beat.counter?.replaces ?? []) {
          expect(slots.has(from) && slots.has(to), `${scene.id}/${beat.id} counters with a slot the card never deals`).toBe(true);
        }
      }
    }
  });

  it("pins only recorded usages of its own topic words", () => {
    const usages = new Map<string, Set<string>>();
    for (const word of HARVESTED) {
      const seen = usages.get(word.lemma) ?? new Set<string>();
      for (const usage of word.usages) seen.add(usage);
      usages.set(word.lemma, seen);
    }
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        for (const line of beat.lines ?? []) {
          const under = beat.topic.some((lemma) => usages.get(lemma)?.has(line));
          expect(under, `${scene.id}/${beat.id} pins "${line}", which no topic word's entry records`).toBe(true);
        }
      }
    }
  });

  /*
    A scene that cannot be failed is not a simulation of anything, and one
    without a way in or out is not an encounter. Both ends are required.
  */
  it("opens, closes, and has something to get done", () => {
    for (const scene of SCENES) {
      const first = scene.beats[0];
      const last = scene.beats[scene.beats.length - 1];
      expect(first?.move, `${scene.id} does not open with a greeting`).toBe("greet");
      expect(last?.move, `${scene.id} does not end`).toBe("close");
      expect(scene.beats.filter((b) => b.required).length).toBeGreaterThan(2);
    }
  });

  /*
    THE OUTCOME LIST IS WHERE A SCENE STOPS BEING A DRILL.

    Three rules, and the middle one is the one worth having. Every `when` names
    beats the scene actually has, or an outcome is unreachable and nobody finds
    out. Every scene has at least one outcome that is **not the learner's
    fault**, because a real encounter has those and a module where trying hard
    enough always works has stopped simulating anything: the test for it is an
    outcome reachable without every required beat, which is exactly what "you
    did most of it and it still did not come off" is. And every scene lets
    somebody leave, because leaving is a real option in a real conversation.

    Fullest first, because `outcomeOf` takes the first that fits: a list in the
    other order would hand everybody the thinnest ending they qualified for.
  */
  it("can end well, can end badly through nobody's fault, and can be walked out of", () => {
    for (const scene of SCENES) {
      const beats = new Set(scene.beats.map((b) => b.id));
      const required = scene.beats.filter((b) => b.required).map((b) => b.id);

      for (const outcome of scene.outcomes) {
        for (const id of outcome.when) {
          expect(beats, `${scene.id}/${outcome.id} waits on a beat that is not there`)
            .toContain(id);
        }
        expect(outcome.says.length, `${scene.id}/${outcome.id} says nothing`).toBeGreaterThan(10);
      }

      const ids = scene.outcomes.map((o) => o.id);
      expect(new Set(ids).size, `${scene.id} repeats an outcome id`).toBe(ids.length);
      expect(ids, `${scene.id} cannot be walked out of`).toContain(LEFT_OUTCOME);

      const best = scene.outcomes.find((o) => required.every((id) => o.when.includes(id)));
      expect(best, `${scene.id} has no outcome for doing all of it`).toBeDefined();

      const short = scene.outcomes.filter(
        (o) => o.id !== LEFT_OUTCOME && !required.every((id) => o.when.includes(id)),
      );
      expect(short.length, `${scene.id} always works if you keep trying`).toBeGreaterThan(0);

      const sizes = scene.outcomes.map((o) => o.when.length);
      expect([...sizes].sort((a, b) => b - a), `${scene.id} lists its outcomes thinnest first`)
        .toEqual(sizes);
    }
  });

  /*
    THE CARD IS WHAT MAKES `datum` MARKABLE, so every slot a beat asks for has
    to be a slot the card carries. A beat waiting on a prop nobody drew is a
    beat that can never be met, and it would look exactly like a learner who
    kept getting it wrong.
  */
  it("has a way out every scene's own units teach", () => {
    /*
      The fallback is Estonian, so it is a lemma request like every other word
      in this file: a misspelled one would fail to arrive and the way out would
      be an empty string on somebody's screen. Every scene, because a scene
      that could not say it is a scene with no way out of a failed beat.
    */
    for (const scene of SCENES) {
      const taught = new Set(scene.units.flatMap((id) => unitById(id)?.lemmas ?? []));
      expect(taught, `${scene.id} has no way to say it did not catch that`)
        .toContain(FALLBACK_PHRASE);
    }
  });

  it("hands out a card that answers every datum its beats ask for", () => {
    for (const scene of SCENES) {
      const slots = new Set(scene.props.map((p) => p.slot));
      for (const beat of scene.beats) {
        for (const { need } of leafNeeds(beat.needs)) {
          if (need.kind !== "datum") continue;
          expect(slots, `${scene.id}/${beat.id} waits on a prop the card does not carry`)
            .toContain(need.slot);
        }
      }
      expect(new Set(scene.props.map((p) => p.slot)).size, `${scene.id} repeats a prop slot`)
        .toBe(scene.props.length);
      expect(scene.role.length, `${scene.id} hands out no role at all`).toBeGreaterThan(20);
    }
  });

  /*
    A CARD MAY NOT PRINT WHAT THE OTHER SIDE IS ABOUT TO SAY.

    `theirs` exists for this and was on the day a landlord offers and on
    nothing else, while three scenes drew a *time* the other side offers and
    printed it: the desk's appointment and the second one it offers when the
    first will not do, both on the card before a word was said, and the hour
    a shop opens on the card of the scene whose next beat is "say the time
    back, to check you heard it". Two beats answerable without listening, and
    a learner who could see the counter-offer coming.

    The rule is read off the beats rather than kept as a list: a slot whose
    value the other side utters, in a stage direction or in the line itself,
    is a fact the learner hears rather than one they are handed. The learner's
    own facts, the symptom and the day it started, are uttered by nobody and
    stay on the card, which is what makes this a test rather than a ban on
    printing anything.
  */
  it("keeps a fact the other side says off the learner's card", () => {
    for (const scene of SCENES) {
      const uttered = new Set<string>();
      for (const beat of scene.beats) {
        for (const side of [beat, beat.counter]) {
          if (!side) continue;
          for (const part of side.says ?? []) if ("slot" in part) uttered.add(part.slot);
          for (const found of (side.they ?? "").matchAll(/\{(\w+)\}/g)) uttered.add(found[1]!);
        }
      }
      // And a curveball the scene admits says its changed fact off the card too.
      for (const id of scene.curveballs) {
        const ball = curveballById(id);
        for (const part of ball?.line ?? []) if ("slot" in part) uttered.add(part.slot);
        for (const found of `${ball?.they ?? ""} ${ball?.answer ?? ""}`.matchAll(/\{(\w+)\}/g)) uttered.add(found[1]!);
      }
      for (const prop of scene.props) {
        expect(
          "theirs" in prop && Boolean(prop.theirs),
          `${scene.id}/${prop.slot} is said by the other side, so the card may not print it`,
        ).toBe(uttered.has(prop.slot));
      }
    }
  });

  /*
    A CURVEBALL WITH NO OUT IS A TRAP (§9), and the out has to be sayable
    *inside this scene*: a requirement naming a word the scene's units do not
    teach is difficulty a learner cannot answer, which is a bug in a costume.

    Every out in the catalog today is a question, a negation, a register or
    `any`, all of which the units in `COMMON` supply for every scene. That is
    why this check is worth writing now rather than when it first fires: it is
    the entry that names a lemma which would break it, and nobody adding one
    would think to look.
  */
  it("admits only curveballs whose way out its own words can say", () => {
    for (const scene of SCENES) {
      const taught = new Set(scene.units.flatMap((id) => unitById(id)?.lemmas ?? []));
      expect(new Set(scene.curveballs).size, `${scene.id} admits one twice`)
        .toBe(scene.curveballs.length);
      const slots = new Set(scene.props.map((p) => p.slot));

      for (const id of scene.curveballs) {
        const ball = curveballById(id);
        expect(ball, `${scene.id} admits ${id}, which is not in the catalog`).toBeDefined();
        /*
          AND WHOSE LINE IT CAN SAY. A curveball that names a fact off the
          card has to be admitted only by a scene that deals that fact and
          teaches the words the line is made of, or it announces a changed
          price and cannot say one, which is how "how much?" came to be
          answered "don't know" at a ticket window.
        */
        for (const part of ball?.line ?? []) {
          if ("lemma" in part) {
            expect(taught, `${scene.id} admits ${id}, whose line needs ${part.lemma}, which it does not teach`).toContain(part.lemma);
          } else {
            expect(slots.has(part.slot), `${scene.id} admits ${id}, whose line says {${part.slot}}, which its card never deals`).toBe(true);
          }
        }
        for (const [from, to] of ball?.replaces ?? []) {
          expect(slots.has(from) && slots.has(to), `${scene.id} admits ${id}, which stands ${to} in for ${from}, and the card deals neither`).toBe(true);
        }
        for (const { need } of leafNeeds(ball?.needs ?? [])) {
          if (need.kind === "lemma") {
            for (const lemma of need.oneOf) {
              expect(taught, `${scene.id} admits ${id}, whose out needs ${lemma}, which it does not teach`)
                .toContain(lemma);
            }
          }
          if (need.kind === "case") {
            expect(taught, `${scene.id} admits ${id}, whose out needs ${need.lemma}, which it does not teach`)
              .toContain(need.lemma);
          }
          if (need.kind === "datum") {
            expect(scene.props.map((p) => p.slot), `${scene.id} admits ${id}, whose out needs a prop it has not drawn`)
              .toContain(need.slot);
          }
        }
      }
    }
  });

  /*
    A CARD THAT POINTS AT SOMETHING HAS TO SHOW IT, and for a while none of
    them did. Six props across three scenes said "the word below" or "the day
    below" and printed nothing below, so a learner could not know whether they
    had been dealt a fever or a sore throat, and the beat that asks for it was
    unanswerable except by guessing. Two of the doctor scene's three props were
    in that state and the third only worked because a time prints itself.

    The fix was the briefing carrying the English of what was dealt, so what
    this holds is the copy that was covering for its absence: a card may not
    tell somebody to read a word off a place, because there is no "below" any
    more, there is the line and the meaning under it.
  */
  it("does not send a learner looking for a word somewhere else on the card", () => {
    for (const scene of SCENES) {
      for (const prop of scene.props) {
        const says = "says" in prop ? prop.says : "";
        expect(says, `${scene.id}'s ${prop.slot} points somewhere instead of saying what it is`)
          .not.toMatch(/\b(below|above|beside|opposite)\b/i);
      }
    }
  });

  /*
    And a word prop names words the scene teaches, which is what makes the
    gloss reachable at all: the briefing looks the drawn lemma up, and a lemma
    no unit of this scene declares comes back with nothing to print, which is
    the unanswerable card again wearing a different cause.
  */
  it("draws its words from the units it declares", () => {
    for (const scene of SCENES) {
      const taught = new Set(scene.units.flatMap((id) => unitById(id)?.lemmas ?? []));
      for (const prop of scene.props) {
        if (prop.kind !== "word" && prop.kind !== "weekday") continue;
        for (const lemma of prop.oneOf) {
          expect(taught, `${scene.id}'s ${prop.slot} can draw ${lemma}, which no unit of it teaches`)
            .toContain(lemma);
        }
      }
    }
  });

  /*
    A CARD HANDS OVER ONE FACT, AND A GLOSS IS NOT ALWAYS ONE.

    An Estonian word covers what it covers and the dictionary says so: `tee` is
    "road, tea" and `keel` is "language, tongue". That is right on an entry and
    wrong on a card, which is not teaching the word's range but handing
    somebody one thing to say. A learner at a café counter read "Tell them what
    you would like to drink." over "road, tea", and one of those is not a
    drink.

    So `means` narrows it, and these three keep the narrowing honest. It may
    only ever name a sense the harvest's own gloss already lists, word for
    word, so a card cannot quietly teach a meaning the dictionary would not
    stand behind. It may not name a lemma the prop cannot draw, or the entry is
    about nothing. And every lemma whose gloss carries more than one sense has
    one, which is what makes this a rule rather than a list of the ones
    somebody noticed: a word prop with no `means` is a card that prints
    whatever the dictionary happens to say.
  */
  describe("a card says which sense of a word it means", () => {
    const senses = (lemma: string) =>
      HARVESTED.filter((word) => word.lemma === lemma)
        .flatMap((word) => word.gloss.split(",").map((one) => one.trim()))
        .filter(Boolean);

    const wordProps = SCENES.flatMap((scene) =>
      scene.props.filter((prop) => prop.kind === "word").map((prop) => ({ scene, prop } as const)));

    it("names only a sense the dictionary already gives the word", () => {
      for (const { scene, prop } of wordProps) {
        for (const [lemma, sense] of Object.entries(prop.means ?? {})) {
          expect(
            senses(lemma),
            `${scene.id}'s ${prop.slot} says ${lemma} means "${sense}", which its gloss does not list`,
          ).toContain(sense);
        }
      }
    });

    it("and only about a word it can draw", () => {
      for (const { scene, prop } of wordProps) {
        for (const lemma of Object.keys(prop.means ?? {})) {
          expect(prop.oneOf, `${scene.id}'s ${prop.slot} narrows ${lemma}, which it never draws`)
            .toContain(lemma);
        }
      }
    });

    /*
      And the other kind that prints a gloss needs none, which is checked
      rather than assumed: a weekday is a weekday in both languages, so there
      is no sense to choose between and `means` is not on that spec at all.
      The day one of them grows a second sense this says so, rather than a card
      quietly printing it.
    */
    it("and a weekday has one sense, so it needs no such choice", () => {
      for (const scene of SCENES) {
        for (const prop of scene.props) {
          if (prop.kind !== "weekday") continue;
          for (const lemma of prop.oneOf) {
            expect(
              senses(lemma),
              `${scene.id}'s ${prop.slot} deals ${lemma}, whose gloss is not one sense`,
            ).toHaveLength(1);
          }
        }
      }
    });

    it("for every word whose gloss carries more than one, and no other", () => {
      for (const { scene, prop } of wordProps) {
        for (const lemma of prop.oneOf) {
          const many = senses(lemma).length > 1;
          const said = prop.means?.[lemma];
          if (many) {
            expect(
              said,
              `${scene.id}'s ${prop.slot} can deal ${lemma}, glossed "${senses(lemma).join(", ")}", `
              + "and does not say which of those the situation means",
            ).toBeDefined();
          } else {
            expect(
              said,
              `${scene.id}'s ${prop.slot} narrows ${lemma}, whose gloss carries one sense already`,
            ).toBeUndefined();
          }
        }
      }
    });
  });
});
