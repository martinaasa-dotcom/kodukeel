import { describe, expect, it } from "vitest";
import {
  ERRANDS, errandForDay, errandForScene, errandPlaces, HOW_IT_WENT, isConversation, outcomeFrom, OUTCOMES,
  OUTCOME_LABEL, sceneForErrand,
} from "./errands";
import { SCENES } from "@/lib/scenes/catalogue";
import { unitById } from "./syllabus";

function errand(id: string) {
  const found = ERRANDS.find((e) => e.id === id);
  if (!found) throw new Error(`no errand ${id}`);
  return found;
}

describe("errands", () => {
  it("name units of the course and never words", () => {
    for (const e of ERRANDS) {
      expect(unitById(e.unit), `${e.id} names unit ${e.unit}`).toBeDefined();
      expect(e.id).toMatch(/^[a-z]+$/);
      expect(e.says).not.toMatch(/[õäöüšž]/);
    }
    expect(new Set(ERRANDS.map((e) => e.id)).size).toBe(ERRANDS.length);
  });

  it("rehearses an errand only in a scene that teaches its words", () => {
    /*
      The scene is the join the purpose rests on, so a stale id or a scene
      that could not vouch for the errand's unit fails here rather than
      rendering a link to the wrong conversation. And every scene has an
      errand: a rehearsal with no door out of it is the thing the app is
      built against.
    */
    for (const e of ERRANDS) {
      if (e.scene === undefined) continue;
      const scene = sceneForErrand(e);
      expect(scene, `${e.id} names scene ${e.scene}`).toBeDefined();
      expect(scene!.units, `${e.scene} teaches ${e.unit}`).toContain(e.unit);
    }
    for (const s of SCENES) {
      expect(errandForScene(s.id), `${s.id} has an errand`).toBeDefined();
    }
    expect(errandForScene("not-a-scene")).toBeUndefined();
  });

  it("offers only what the learner has started, and always something", () => {
    const nothing = errandForDay("2026-09-04", new Set());
    expect(nothing.unit).toBe("tervitused");
    const some = new Set(["sook-ja-jook", "aeg"]);
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) seen.add(errandForDay(`2026-09-${String(d).padStart(2, "0")}`, some).id);
    expect(seen.size).toBeGreaterThan(3);
    for (const id of seen) {
      const e = ERRANDS.find((x) => x.id === id)!;
      expect(e.unit === "tervitused" || some.has(e.unit)).toBe(true);
    }
  });

  it("does not repeat an errand two days running", () => {
    const all = new Set(ERRANDS.map((e) => e.unit));
    let last = "";
    for (let d = 1; d <= 28; d++) {
      const id = errandForDay(`2026-10-${String(d).padStart(2, "0")}`, all).id;
      expect(id).not.toBe(last);
      last = id;
    }
  });

  it("counts a conversation as one that happened, and a day with none as neither", () => {
    /*
      The card takes "not yesterday" for an answer, so this is the difference
      between a run of days out there and a run of days somebody was honest
      about. Progress prints both off it.
    */
    expect(isConversation("UNDERSTOOD")).toBe(true);
    expect(isConversation("SWITCHED")).toBe(true);
    /*
      Getting stuck partway is a conversation, because they spoke. It is the
      answer the first three could not give, and reading it as anything else
      would delete from the count the one kind of conversation this app most
      wants somebody to keep having.
    */
    expect(isConversation("STUCK")).toBe(true);
    expect(isConversation("BAILED")).toBe(false);
    expect(OUTCOMES.filter(isConversation)).toHaveLength(3);
    // The card asks how it went off this list rather than off a typed one.
    expect(HOW_IT_WENT).toEqual(OUTCOMES.filter(isConversation));
    expect(HOW_IT_WENT).not.toContain("BAILED");
  });

  it("labels each as an answer to a question about yesterday", () => {
    // Not as reports on the errand: the errand is what the card offers when
    // the answer is no, and a label reading "I did not manage it" would be
    // about a task nobody was set.
    for (const o of OUTCOMES) expect(OUTCOME_LABEL[o]).not.toMatch(/errand/i);
    expect(OUTCOME_LABEL.BAILED).toBe("Not yesterday");
  });

  it("reads an outcome off the wire as one of the four, or nothing", () => {
    expect(outcomeFrom("SWITCHED")).toBe("SWITCHED");
    expect(outcomeFrom("won")).toBeNull();
    expect(outcomeFrom(3)).toBeNull();
  });

  it("reads `where` as alternatives rather than a stored list", () => {
    // A single place is unchanged.
    expect(errandPlaces(errand("hello"))).toBe("Anywhere");
    // Two are "or", never "and": either place would do, not both.
    expect(errandPlaces(errand("job"))).toBe("Work or a party");
    // Three keeps the comma between the first two.
    expect(errandPlaces(errand("complain"))).toBe("A shop, a landlord, or a helpdesk");
    // A `where` with no comma at all, and its own inline "or", is untouched.
    expect(errandPlaces(errand("bread"))).toBe("A shop or a market");
  });
});
