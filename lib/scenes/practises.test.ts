import { describe, expect, it } from "vitest";
import { SCENES } from "./catalogue";
import { BEAT_TAGS, distinctive, practises } from "./practises";
import { CASES } from "@/lib/estonian/cases";

describe("what a scene practises", () => {
  it("names every beat but the hello and the goodbye by what the learner does, case or no case", () => {
    const missing: string[] = [];
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        if (beat.move === "greet" || beat.move === "close") continue;
        if (!BEAT_TAGS[`${scene.id}:${beat.id}`]) missing.push(`${scene.id}:${beat.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("tells a tile what needs doing, never only which endings it asks for", () => {
    const caseNames = new Set(CASES.map((c) => c.et));
    for (const scene of SCENES) {
      const chips = distinctive(scene, SCENES);
      expect(chips.filter((c) => caseNames.has(c.split(" (")[0]!)), scene.id).toEqual([]);
    }
  });

  it("never names a beat no scene has", () => {
    const real = new Set(SCENES.flatMap((s) => s.beats.map((b) => `${s.id}:${b.id}`)));
    expect(Object.keys(BEAT_TAGS).filter((k) => !real.has(k))).toEqual([]);
  });

  it("does not tag the formal you, which nearly every scene is held in", () => {
    const tagged = SCENES.filter((s) => practises(s).some((t) => /polite you|formal you/.test(t)));
    expect(tagged).toEqual([]);
  });

  it("puts no tag on a tile that every scene would carry", () => {
    const tiles = SCENES.map((s) => distinctive(s, SCENES));
    let walked = 0;
    for (const tags of tiles) {
      for (const tag of tags) {
        walked += 1;
        expect(tiles.filter((t) => t.includes(tag)).length).toBeLessThan(SCENES.length);
      }
    }
    expect(walked).toBeGreaterThan(SCENES.length);
  });

  it("gives no two tiles the same row of tags", () => {
    const rows = SCENES.map((s) => distinctive(s, SCENES).join(" | "));
    expect(new Set(rows).size).toBe(rows.length);
  });
});
