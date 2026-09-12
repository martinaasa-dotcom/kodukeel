import { describe, expect, it } from "vitest";
import { bankTopic, beatById, SHARED_BEATS } from "./scripted";
import { sceneById } from "./catalogue";
import { runGate } from "./gate";
import { topicForms } from "./retrieval";
import { keylessContext } from "../../scripts/lib/sceneDraft";

describe("a beat's banked lines are its subject", () => {
  const scene = sceneById("kohvikus")!;
  const bill = beatById(scene, "bill")!;

  it("counts the words the beat's own lines are made of, and not the scene's furniture", () => {
    /*
      "Kas see on kõik?" and "Kas soovite veel midagi?" are what the bill beat
      says, so `kõik`, `veel` and `midagi` are what it is about. `kas`, `see`,
      `te` and `on` are in most beats' lines and would let any question
      through, and they are told apart by counting rather than by a list of
      Estonian function words.
    */
    const topic = bankTopic(scene, bill);
    for (const word of ["kõik", "veel", "midagi"]) expect(topic.has(word), word).toBe(true);
    /*
      `see` was in this list, and it stopped being furniture the day the price
      curveball's banked rows went (§69): "See maksab nüüd rohkem." was where
      the café's other beats said it. Counting rather than listing is the rule,
      so what the count says is what the test asserts.
    */
    for (const word of ["kas", "te", "on"]) expect(topic.has(word), word).toBe(false);
    expect(SHARED_BEATS).toBeLessThan(scene.beats.length - 1);
  });

  it("lets a line answer the deviation and re-ask the beat's question in the bank's own words", () => {
    /*
      THE TURN THE MODEL EXISTS FOR. Asked "Kas see on kõik?", a learner wrote
      "ei, ma tahan ka ühe saiakese"; the model wrote this, which answers them
      and asks again; the gate refused it for not naming `arve`, `maksma`,
      `raha` or `hind`, and the learner read "Vabandust! Kas see on kõik?"
      from a model that had done exactly what it was told.
    */
    const ctx = keylessContext(scene);
    const line = "Palun, siin on teile hea sai. Kas te soovite veel midagi?";
    const lemmas = topicForms(bill, ctx.lexicon);
    const lemmasOnly = { ...ctx.gate, topic: lemmas };
    expect(runGate(line, bill, lemmasOnly).failed).toContain("topic");
    const widened = { ...ctx.gate, topic: new Set([...lemmas, ...bankTopic(scene, bill)]) };
    expect(runGate(line, bill, widened).failed).not.toContain("topic");
    // And a line about something else entirely is still off topic.
    expect(runGate("Kas teil on täna hea ilm?", bill, widened).failed).toContain("topic");
  });

  it("returns nothing for a beat the bank holds no line for", () => {
    expect(bankTopic(scene, { ...bill, id: "no-such-beat" }).size).toBe(0);
  });
});
