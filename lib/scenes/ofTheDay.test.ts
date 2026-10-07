import { describe, expect, it } from "vitest";
import { SCENES } from "./catalogue";
import { sceneOfDay } from "./ofTheDay";

describe("sceneOfDay", () => {
  it("is the same scene all day and a different one tomorrow", () => {
    const a = sceneOfDay("2026-10-07", SCENES, null);
    expect(a).not.toBeNull();
    expect(sceneOfDay("2026-10-07", SCENES, null)?.id).toBe(a?.id);
    expect(sceneOfDay("2026-10-08", SCENES, null)?.id).not.toBe(a?.id);
  });

  it("walks every scene before it repeats one", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= SCENES.length; d++) {
      seen.add(sceneOfDay(`2026-11-${String(d).padStart(2, "0")}`, SCENES, null)!.id);
    }
    expect(seen.size).toBe(SCENES.length);
  });

  it("offers only a scene whose units the course has taught", () => {
    const first = SCENES[0]!;
    const met = new Set(first.units);
    for (let d = 1; d <= 20; d++) {
      const day = `2026-12-${String(d).padStart(2, "0")}`;
      const scene = sceneOfDay(day, SCENES, met);
      expect(scene).not.toBeNull();
      expect(scene!.units.every((u) => met.has(u))).toBe(true);
    }
  });

  it("offers nothing where nothing has been reached", () => {
    expect(sceneOfDay("2026-10-07", SCENES, new Set())).toBeNull();
  });
});
