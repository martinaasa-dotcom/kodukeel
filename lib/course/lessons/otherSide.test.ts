import { describe, expect, it } from "vitest";

import { LESSONS } from "./index";
import { otherSideOf } from "./otherSide";

const byId = (id: string) => {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

describe("who the learner talks to on Say it", () => {
  it("is the partner in each B1 role-play, never the learner's own stand-in", () => {
    const partners = Object.fromEntries(LESSONS.filter((l) => l.id.startsWith("b1") && l.roleplay).map((l) => [l.id, otherSideOf(l).partner]));
    expect(partners).toEqual({
      "b1-07-repair": "Rein",
      "b1-14-colleague": "Kadri",
      "b1-21-pay": "Kristi",
      "b1-28-deposit": "Peeter",
      "b1-35-residents": "Helgi",
      "b1-42-disagree": "Kristi",
      "b1-49-end": "Merike",
    });
  });

  it("voices an ask written as a conversation line in its speaker's voice", () => {
    const pay = byId("b1-21-pay");
    const traced = pay.roleplay!.turns.map((p) => p.ask?.et).filter((et): et is string => !!et && pay.conversation.some((c) => c.et === et));
    expect(traced.length).toBeGreaterThan(0);
    for (const et of traced) expect(otherSideOf(pay).askerOf(et)).toBe("Kristi");
  });

  it("changes nothing where somebody other than the stand-in opens", () => {
    let checked = 0;
    for (const l of LESSONS) {
      const opener = l.conversation[0]?.who;
      if (!opener || opener === "Tom") continue;
      checked++;
      expect(otherSideOf(l).partner).toBe(opener);
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("never names Tom while anybody else is in the conversation", () => {
    for (const l of LESSONS) if (l.conversation.some((c) => c.who !== "Tom")) expect(otherSideOf(l).partner).not.toBe("Tom");
  });
});
