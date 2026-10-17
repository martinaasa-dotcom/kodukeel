import { describe, expect, it } from "vitest";
import { SCENES, sceneById } from "./catalogue";
import { BANK } from "./bank";
import { pickSpecsFor, slotsOf } from "./picks";
import { errandRehearsal, openingLines, OPENING_LINES } from "./rehearse";
import { isCall } from "./scenery";
import { matchPick } from "@/lib/speech/matchPick";
import { openingAnswer, sceneAnswerFrom } from "@/lib/ux/sceneAnswer";
import { ERRANDS, sceneForErrand } from "@/lib/collections/errands";

/*
  A CONVERSATION SAID ALOUD (docs/41-fifth-batch.md, VB-4): the pure halves of
  hearing them first, the errand's rehearsal, which way a learner answers, which
  conversations are a call, and where a heard line goes when there are lines on
  offer.
*/
describe("hearing them first", () => {
  it("plays lines the bank already holds and nothing else (D10)", () => {
    const banked = new Set(BANK.map((row) => row.text));
    for (const scene of SCENES) {
      const lines = openingLines(scene, "A2");
      expect(lines.length).toBeLessThanOrEqual(OPENING_LINES);
      for (const line of lines) expect(banked.has(line), `${scene.id}: ${line}`).toBe(true);
    }
  });

  it("has something to play for nearly every scene", () => {
    const empty = SCENES.filter((scene) => openingLines(scene, "A1").length === 0).map((scene) => scene.id);
    expect(empty.length, empty.join(", ")).toBeLessThan(SCENES.length / 4);
  });
});

describe("say it once before you go", () => {
  it("is the scene's first line from the bank and a pick that needs nothing off a card", () => {
    const banked = new Set(BANK.map((row) => row.text));
    let offered = 0;
    for (const errand of ERRANDS) {
      const scene = sceneForErrand(errand);
      if (!scene) continue;
      const rehearsal = errandRehearsal(scene, "A1");
      if (!rehearsal) continue;
      offered += 1;
      expect(banked.has(rehearsal.theirs)).toBe(true);
      expect(slotsOf(rehearsal.yours.et)).toEqual([]);
      const first = scene.beats.find((beat) => pickSpecsFor(scene, beat.id).some((spec) => spec.et === rehearsal.yours.et));
      expect(first, `${scene.id}: ${rehearsal.yours.et} is a pick of this scene`).toBeDefined();
    }
    expect(offered, "no errand offered a rehearsal, so nothing here was checked").toBeGreaterThan(3);
  });
});

describe("how a learner answers", () => {
  it("opens the way they answered last, where it can", () => {
    expect(openingAnswer("say", "B1", true)).toBe("say");
    expect(openingAnswer("type", "A1", true)).toBe("type");
  });

  it("falls back to the band's default where nothing is stored, or speech cannot be offered", () => {
    expect(openingAnswer(null, "A1", true)).toBe("pick");
    expect(openingAnswer(null, "B2", true)).toBe("type");
    expect(openingAnswer("say", "A1", false)).toBe("pick");
    expect(openingAnswer("say", "B1", false)).toBe("type");
  });

  it("reads only the three answers off the wire", () => {
    expect(sceneAnswerFrom("say")).toBe("say");
    expect(sceneAnswerFrom("shout")).toBeNull();
    expect(sceneAnswerFrom(3)).toBeNull();
  });
});

describe("a conversation that is a call", () => {
  it("is one that opens on the telephone, and stays one when its room moves", () => {
    expect(isCall("helistamine")).toBe(true);
    expect(isCall("poodi-piima")).toBe(true);
    expect(isCall("kohvikus")).toBe(false);
    expect(isCall("riidepood")).toBe(false);
  });
});

/*
  WHERE A HEARD LINE GOES WITH LINES ON OFFER (D8, D20). A clear match lights
  that line, which is sent as the pick it is. Anything that matches none is
  never a pick: it goes to the box to change and send.
*/
describe("a line said where lines are on offer", () => {
  const kohvikus = sceneById("kohvikus")!;
  const greet = pickSpecsFor(kohvikus, "greet").map((spec) => spec.et);
  const bill = pickSpecsFor(kohvikus, "bill").map((spec) => spec.et);

  it("lights the pick that was said", () => {
    expect(matchPick(greet, "Tere").index).toBe(0);
    expect(matchPick(bill, "jah see on kõik").index).toBe(bill.indexOf("Jah, see on kõik."));
  });

  it("lights nothing for an utterance that matches no pick, so it is never sent as one", () => {
    expect(matchPick(bill, "Ma tahan kohvi").index).toBeNull();
    expect(matchPick(greet, "Head aega").index).toBeNull();
    expect(matchPick(greet, "").index).toBeNull();
  });
});
