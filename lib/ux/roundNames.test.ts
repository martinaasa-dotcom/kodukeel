import { describe, expect, it } from "vitest";

import { PRACTICE_MODES } from "./modes";
import { inlineName, nameOf, roundPageTitle } from "./roundNames";
import { ACTIVITIES, activityTitle } from "@/lib/course/types";
import { featuredTitle } from "./weekGames";

/*
  Every round is called the same thing on its tile, its page and its step
  (docs/44-sixth-batch.md C-6). The tile reads `ROUND_NAMES`; these hold the
  other two readers to it.
*/
describe("a round's agreed name", () => {
  it("is the English half of every named mode's title", () => {
    let named = 0;
    for (const mode of PRACTICE_MODES) {
      const name = nameOf(mode.href);
      if (!name) continue;
      named += 1;
      expect(mode.title, mode.href).toBe(name.en);
    }
    expect(named).toBeGreaterThan(20);
  });

  it("heads a round's page in Estonian with the English under it", () => {
    expect(roundPageTitle("/review/match")).toEqual({ title: "Paarid", titleLang: "et", titleGloss: "Pairs" });
    expect(roundPageTitle("/review/match", (en) => (en === "Pairs" ? "Пары" : en)).titleGloss).toBe("Пары");
  });

  it("names a step that opens a round the way its tile does", () => {
    let named = 0;
    for (const [key, activity] of Object.entries(ACTIVITIES)) {
      const name = nameOf(activity.href);
      if (!name) continue;
      named += 1;
      expect(activityTitle(activity), key).toBe(inlineName(name));
    }
    expect(named).toBeGreaterThan(5);
  });

  it("names Today's featured round the same way", () => {
    expect(featuredTitle("/review/match")).toBe("Paarid (Pairs)");
  });
});
