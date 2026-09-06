import { describe, expect, it } from "vitest";

import { ICONS } from "../../components/icons";
import { SCENES } from "./catalogue";
import { SCENERY, sceneryFor, type Ambience } from "./scenery";

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
    Five ambiences, and each one earning its place by being used. A sixth added
    for one scene is a movement written once and read by nobody, and an
    ambience nothing names is a branch in the component that cannot be reached.
  */
  it("uses every movement it declares", () => {
    const all: Ambience[] = ["queue", "ring", "travel", "steam", "attend"];
    for (const one of all) {
      expect(
        Object.values(SCENERY).some((room) => room.ambience === one),
        `no scene moves like ${one}, so that branch is unreachable`,
      ).toBe(true);
    }
  });

  it("answers for a scene it has never heard of rather than throwing", () => {
    const room = sceneryFor("a-scene-nobody-has-written");
    expect(room.icon).toBeTruthy();
    expect(room.ambience).toBeTruthy();
  });
});
