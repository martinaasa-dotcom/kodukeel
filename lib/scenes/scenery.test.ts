import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ICONS } from "../../components/icons";
import { SCENES } from "./catalogue";
import { CURVEBALLS } from "./curveballs";
import { CUES, MOVES, SCENERY, cueFor, movesTo, sceneryFor, type Cue, type Setting } from "./scenery";

/*
  The drawing's `switch` statements are read by the checks below, and there are
  two of them in one file: one over the rooms and one over the cues. A check
  that did not know the difference would ask MARKS for a row called "paper".
*/
const CUE_KINDS: ReadonlySet<string> = new Set<Cue>(["behind", "another", "paper", "attention"]);

/*
  A table keyed on ids is a table that goes stale in one direction and lies in
  the other, and both are silent. A scene with no row opens as the blank screen
  this was written to replace; a row for a scene that no longer exists is a
  place nobody can go. `lib/collections/topical.ts` is checked exactly this way
  and for exactly this reason.
*/
describe("every conversation happens somewhere", () => {
  it("has a room for every scene", () => {
    for (const scene of SCENES) {
      expect(SCENERY[scene.id], `${scene.id} has no scenery`).toBeDefined();
    }
  });

  it("and no room for a scene that is not there", () => {
    const ids = new Set(SCENES.map((scene) => scene.id));
    for (const id of Object.keys(SCENERY)) {
      expect(ids.has(id), `${id} has scenery and is not a scene`).toBe(true);
    }
  });

  /*
    A name in this table is a promise that `components/icons.tsx` can resolve
    it, and the fallback there means a typo does not crash a page: it draws a
    sparkle over a health centre and nothing says so.
  */
  it("names an icon the app can actually draw", () => {
    for (const [id, room] of Object.entries(SCENERY)) {
      expect(ICONS[room.icon], `${id} names ${room.icon}, which components/icons.tsx cannot resolve`)
        .toBeDefined();
    }
  });

  /*
    Every room this table can name has to be one the drawing knows, or a scene
    added with a new setting falls through to a default and opens as the blank
    screen the table was written to replace. `switch` over a union is what makes
    that a type error rather than a silent one, and this is the other half:
    the source of the drawing has to actually name every value.
  */
  it("names only rooms the drawing has", () => {
    const drawn = readFileSync(join("components", "scene", "SceneVignette.tsx"), "utf8");
    for (const [id, room] of Object.entries(SCENERY)) {
      expect(drawn, `${id} is set in ${room.setting}, which SceneVignette does not draw`)
        .toContain(`case "${room.setting}":`);
    }
  });

  /*
    And a room nothing is set in is a drawing nobody sees. Two scenes share one
    only where the room really is the same, which is the pair that are somebody
    at home on the phone; a third sharer would be worth noticing.
  */
  it("draws no room nothing happens in", () => {
    /*
      A room reached only by a `meanwhile` is still a room somebody is in: the
      shop is drawn for half of `poodi-piima` and is the opening setting of
      nothing, so counting the openings alone would report it as dead.
    */
    const used = new Set<Setting>([
      ...Object.values(SCENERY).map((room) => room.setting),
      ...Object.values(MOVES).flatMap((beats) => Object.values(beats)),
    ]);
    const drawn = readFileSync(join("components", "scene", "SceneVignette.tsx"), "utf8");
    for (const [, setting] of drawn.matchAll(/case "(\w+)":/g)) {
      /* The file has a second `switch`, over what has just come up rather than
         over where it happened. Those are checked two blocks down. */
      if (CUE_KINDS.has(setting!)) continue;
      expect(used.has(setting as Setting), `${setting} is drawn and no scene is set in it`).toBe(true);
    }
  });

  /*
    A beat that moves you names a beat that exists, and moves you somewhere the
    drawing knows. Both halves fail silently otherwise: a typo in the beat id
    leaves the learner in the kitchen for a conversation held in a shop, and a
    room nothing draws falls through to the one the scene opened in.
  */
  it("moves a scene only to rooms and beats that are there", () => {
    const drawn = readFileSync(join("components", "scene", "SceneVignette.tsx"), "utf8");
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        const to = movesTo(scene.id, beat.id);
        if (!to) continue;
        expect(beat.meanwhile, `${scene.id}/${beat.id} moves the learner and says nothing about it`)
          .toBeTruthy();
        expect(drawn, `${scene.id}/${beat.id} moves to ${to}, which is not drawn`)
          .toContain(`case "${to}":`);
      }
    }
  });

  /*
    And read the other way, because the loop above can only check the entries a
    real beat reaches: a typo in a beat id is an entry nothing matches, which
    leaves the learner in the kitchen for a conversation held in a shop and
    fails no test at all.
  */
  it("names a beat that is really there", () => {
    for (const [sceneId, beats] of Object.entries(MOVES)) {
      const scene = SCENES.find((one) => one.id === sceneId);
      expect(scene, `${sceneId} moves somewhere and is not a scene`).toBeDefined();
      for (const beatId of Object.keys(beats)) {
        expect(
          scene?.beats.some((beat) => beat.id === beatId),
          `${sceneId} moves on ${beatId}, which is not one of its beats`,
        ).toBe(true);
      }
    }
  });

  /*
    WHAT COMES UP IN A CONVERSATION IS DRAWN, AND THE TABLE OF IT IS KEYED ON
    THE FOURTEEN CURVEBALLS RATHER THAN ON THE FOUR CUES.

    Read both ways, for the reason the scenery table is: a curveball with no row
    is the one that goes on arriving as a sentence of English above a question
    in Estonian, silently, and a row for a curveball nobody throws is a drawing
    nobody sees. The silent one is in it on purpose, because a queue forming
    behind you is the one of the fourteen that is entirely a picture.
  */
  it("has a cue for every curveball", () => {
    for (const one of CURVEBALLS) {
      expect(CUES[one.id], `${one.id} has no cue, so nothing in the room says it happened`)
        .toBeDefined();
    }
  });

  it("and no cue for a curveball that is not thrown", () => {
    const ids = new Set(CURVEBALLS.map((one) => one.id as string));
    for (const id of Object.keys(CUES)) {
      expect(ids.has(id), `${id} has a cue and is not a curveball`).toBe(true);
    }
  });

  /*
    And every kind this table can ask for is one the drawing has. A cue that
    falls through the `switch` draws nothing at all, which looks exactly like a
    conversation in which nothing has come up.
  */
  it("names only cues the drawing has", () => {
    const drawn = readFileSync(join("components", "scene", "SceneVignette.tsx"), "utf8");
    for (const [id, cue] of Object.entries(CUES)) {
      expect(drawn, `${id} is cued as ${cue}, which SceneVignette does not draw`)
        .toContain(`case "${cue}":`);
    }
  });

  /*
    The curveball is asked for by name, and nothing standing is most of a
    conversation. The first version read the id off the beat the screen was on,
    which is the scene's own beat and never the curveball's, so no cue was ever
    drawn: the tables were complete, read both ways, and pointed at a field that
    does not carry this.
  */
  it("answers for the curveball itself, and for nothing standing", () => {
    expect(cueFor("queue")).toBe("behind");
    expect(cueFor("interrupted")).toBe("another");
    expect(cueFor(null)).toBe(null);
    expect(cueFor(undefined)).toBe(null);
    expect(cueFor("a-curveball-nobody-has-written")).toBe(null);
    /* And never off a beat id, which is what it used to be handed. */
    expect(cueFor("hurdle:queue")).toBe(null);
  });

  /*
    WHO IS TALKING AND WHAT CAME UP ARE DRAWN OVER THE ROOM RATHER THAN INSIDE
    IT, so every room has to say where its people are. A room drawn with no
    marks is a room where the breath and the cue land at `undefined`, which is
    an SVG path that silently draws nothing: the band would go on saying whose
    floor it is everywhere except the one room somebody had just added.
  */
  it("knows where the people are in every room it draws", () => {
    const drawn = readFileSync(join("components", "scene", "SceneVignette.tsx"), "utf8");
    const marked = new Set([...drawn.matchAll(/^ {2}(\w+): \{ you:/gm)].map((m) => m[1]!));
    const rooms = new Set([...drawn.matchAll(/case "(\w+)":/g)].map((m) => m[1]!));
    for (const room of rooms) {
      if (!CUE_KINDS.has(room)) {
        expect(marked.has(room), `${room} is drawn and MARKS does not say where its people are`).toBe(true);
      }
    }
    for (const room of marked) {
      expect(rooms.has(room), `MARKS names ${room}, which is not a room the drawing has`).toBe(true);
    }
  });

  /*
    AND EVERY ONE OF THEM STANDS ON THE FLOOR, FAR ENOUGH APART TO BE TWO
    PEOPLE.

    `Person` is six lines about a centre: a head of radius 8, legs reaching
    nine either side and a pair of resting arms reaching eleven. Two marks
    closer together than that are not two people in a room, they are one
    scribble, and that is how this table shipped: the stairwell put a queue
    twenty-two units off the learner and their arms met exactly, the pharmacy
    stood its own waiting customer eighteen units off the one a curveball adds,
    and the interloper was put down beyond the counter in five rooms, where
    there is no floor at all and the furniture is drawn over the legs.

    Read off the drawing rather than typed here, floor included, because the
    numbers that have to agree are the drawing's own. A room too narrow for a
    fourth figure is a room where two of them would overlap, and this is what
    says so before anybody screenshots it.
  */
  it("stands every figure on the floor, far enough apart to be two people", () => {
    const drawn = readFileSync(join("components", "scene", "SceneVignette.tsx"), "utf8");
    const floor = drawn.match(/d="M (\d+) 101 H (\d+)"/);
    expect(floor, "the drawing has no floor to stand anybody on").toBeTruthy();
    const [from, to] = [Number(floor![1]), Number(floor![2])];

    /* Half a figure: the widest thing a resting one reaches is its arms. */
    const REACH = 11;
    /* Legs, which is what has to be over floor rather than over furniture. */
    const STANCE = 9;

    const rows = [...drawn.matchAll(
      /^ {2}(\w+): \{ you: (\d+), them: \{ x: (\d+), y: (\d+) \}, behind: (\d+), beside: (\d+),/gm,
    )];
    expect(rows.length, "no rooms read out of MARKS").toBeGreaterThan(10);

    for (const [, room, you, themX, themY, behind, beside] of rows) {
      /*
        A phone line is not a person: three rooms put `them` above the ringing
        rather than on a head, and nothing stands there.
      */
      const standing = [Number(behind), Number(you), Number(beside)];
      if (Number(themY) >= 40) standing.push(Number(themX));
      standing.sort((a, b) => a - b);

      expect(Number(behind), `${room} puts the queue in front of the learner`).toBeLessThan(Number(you));
      for (const at of standing) {
        expect(at - STANCE, `${room} stands somebody at ${at}, off the left end of the floor`)
          .toBeGreaterThanOrEqual(from);
        expect(at + STANCE, `${room} stands somebody at ${at}, off the right end of the floor`)
          .toBeLessThanOrEqual(to);
      }
      for (let at = 1; at < standing.length; at += 1) {
        expect(standing[at]! - standing[at - 1]!,
          `${room} stands two people ${standing[at]! - standing[at - 1]!} apart, which is one scribble`)
          .toBeGreaterThanOrEqual(REACH * 2);
      }
    }
  });

  it("answers for a scene it has never heard of rather than throwing", () => {
    const room = sceneryFor("a-scene-nobody-has-written");
    expect(room.icon).toBeTruthy();
    expect(room.setting).toBeTruthy();
  });
});
