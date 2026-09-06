import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ICONS } from "../../components/icons";
import { SCENES } from "./catalogue";
import { MOVES, SCENERY, movesTo, sceneryFor, type Setting } from "./scenery";

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

  it("answers for a scene it has never heard of rather than throwing", () => {
    const room = sceneryFor("a-scene-nobody-has-written");
    expect(room.icon).toBeTruthy();
    expect(room.setting).toBeTruthy();
  });
});
