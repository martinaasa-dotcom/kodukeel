import { describe, expect, it } from "vitest";
import { SCENES } from "@/lib/scenes/catalogue";
import { SITUATIONS } from "./situations";
import { sceneForEar, scenesRehearsing } from "./rehearsal";

describe("the conversation that can prove an ear", () => {
  it("answers for every situation with a scene that declares its unit, or with nothing where none does", () => {
    let withScene = 0;
    for (const situation of SITUATIONS) {
      const scene = sceneForEar(situation.id, new Map());
      const fits = SCENES.filter((s) => s.units.includes(situation.id));
      if (fits.length === 0) {
        expect(scene, situation.id).toBeNull();
        continue;
      }
      withScene += 1;
      expect(scene, situation.id).not.toBeNull();
      expect(scene!.units, situation.id).toContain(situation.id);
      expect(fits.map((s) => s.id)).toContain(scene!.id);
    }
    // The catalog reaches a fair share of the situations; a lookup that found none would pass the loop above.
    expect(withScene).toBeGreaterThan(10);
  });

  it("finds every live situation that a scene tests", () => {
    let asked = 0;
    for (const situation of SITUATIONS.filter((s) => s.live)) {
      if (!SCENES.some((s) => s.tests === situation.id)) continue;
      asked += 1;
      expect(sceneForEar(situation.id, new Map()), situation.id).not.toBeNull();
    }
    expect(asked).toBeGreaterThan(5);
  });

  it("prefers the one played least where several fit", () => {
    const many = SITUATIONS.map((s) => [s.id, scenesRehearsing(s.id)] as const).find(([, fits]) => fits.length >= 2);
    expect(many, "a situation with two scenes declaring its unit").toBeDefined();
    const [id, fits] = many!;
    const plays = new Map(fits.map((s, i) => [s.id, i === fits.length - 1 ? 0 : 5]));
    expect(sceneForEar(id, plays)?.id).toBe(fits[fits.length - 1]!.id);
    const playedLast = new Map(fits.map((s, i) => [s.id, i === 0 ? 7 : 1]));
    expect(sceneForEar(id, playedLast)?.id).not.toBe(fits[0]!.id);
  });

  it("breaks a tie toward the scene that tests the situation", () => {
    let asked = 0;
    for (const situation of SITUATIONS) {
      const fits = scenesRehearsing(situation.id);
      const tester = fits.find((s) => s.tests === situation.id);
      if (!tester || fits.length < 2) continue;
      asked += 1;
      expect(sceneForEar(situation.id, new Map())?.id, situation.id).toBe(tester.id);
    }
    expect(asked).toBeGreaterThan(0);
  });

  it("offers nothing for a unit no scene declares", () => {
    expect(sceneForEar("no-such-unit", new Map())).toBeNull();
  });
});
