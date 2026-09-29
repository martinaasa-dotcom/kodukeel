import { describe, expect, it } from "vitest";

import { SCENES } from "./catalogue";
import { KINDS, SCENE_KINDS, kindOf } from "./kinds";

describe("the kinds of place the chooser filters by", () => {
  it("gives every scene in the catalogue a kind", () => {
    const missing = SCENES.map((s) => s.id).filter((id) => !(id in SCENE_KINDS));
    expect(missing).toEqual([]);
  });

  it("names no scene the catalogue does not have", () => {
    const ids = new Set(SCENES.map((s) => s.id));
    const stale = Object.keys(SCENE_KINDS).filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });

  it("leaves no kind empty, since an empty filter is a dead end", () => {
    const empty = KINDS.filter((k) => !SCENES.some((s) => kindOf(s.id).id === k.id)).map((k) => k.id);
    expect(empty).toEqual([]);
  });

  it("gives each kind its own hue, so a dot and a tile cannot disagree", () => {
    expect(new Set(KINDS.map((k) => k.hue)).size).toBe(KINDS.length);
  });
});
