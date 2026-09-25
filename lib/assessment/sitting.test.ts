import { describe, expect, it } from "vitest";
import { placement, responseFor, responsesFrom } from "./score";
import type { ChoiceItem, Item, SpeakItem, WriteItem } from "./types";

/*
  What the server marks a sitting with. The browser sends what was done with
  each question and nothing about the mark, so these are the rules a forged
  request meets: the item says what it tests, a question answered twice counts
  once, and an answer to a question the paper does not hold is not a sitting.
*/

const choice = (id: string, band: ChoiceItem["band"]): ChoiceItem => ({
  id, kind: "choice", skill: "reading", band, lemma: id,
  question: "What does this word mean?", et: id, heard: false,
  options: ["room", "book", "window", "door"], estonianOptions: false, answer: 0, because: "",
});

const write: WriteItem = {
  id: "w1", kind: "write", skill: "writing", band: "A2", lemma: "tuba",
  question: "", translation: "room", sentence: "Ma olen ____.", full: "Ma olen toas.",
  targetForm: "toas", otherForms: ["toa", "tuppa"], because: "",
};

const speak: SpeakItem = {
  id: "s1", kind: "speak", skill: "speaking", band: "A1", lemma: "tere",
  question: "", et: "tere", translation: "hello", isSentence: false,
};

const paper: Item[] = [choice("c1", "A1"), choice("c2", "A1"), choice("c3", "A2"), write, speak];

describe("marking a sitting on the server", () => {
  it("takes the skill and the band from the item, never from the answer", () => {
    const [r] = responsesFrom(paper, [{ itemId: "c3", given: { kind: "picked", option: "room" }, ms: 5 }])!;
    expect(r).toMatchObject({ itemId: "c3", skill: "reading", band: "A2", credit: 1 });
  });

  it("marks the option by its text, so a wrong pick earns nothing", () => {
    const [right, wrong] = responsesFrom(paper, [
      { itemId: "c1", given: { kind: "picked", option: "room" }, ms: 5 },
      { itemId: "c2", given: { kind: "picked", option: "door" }, ms: 5 },
    ])!;
    expect(right!.credit).toBe(1);
    expect(wrong!.credit).toBe(0);
  });

  it("counts a question answered twice once, the first time", () => {
    const out = responsesFrom(paper, [
      { itemId: "c1", given: { kind: "picked", option: "door" }, ms: 5 },
      { itemId: "c1", given: { kind: "picked", option: "room" }, ms: 5 },
      { itemId: "c1", given: { kind: "picked", option: "room" }, ms: 5 },
    ])!;
    expect(out).toHaveLength(1);
    expect(out[0]!.credit).toBe(0);
  });

  it("refuses an answer to a question the paper does not hold", () => {
    expect(responsesFrom(paper, [
      { itemId: "c1", given: { kind: "picked", option: "room" }, ms: 5 },
      { itemId: "c9-invented", given: { kind: "picked", option: "room" }, ms: 5 },
    ])).toBeNull();
  });

  it("marks a typed gap with the same marker the screen uses", () => {
    expect(responseFor(write, { itemId: "w1", given: { kind: "typed", text: "toas" }, ms: 5 }).credit).toBe(1);
    expect(responseFor(write, { itemId: "w1", given: { kind: "typed", text: "tuppa" }, ms: 5 }).credit).toBe(0.4);
    // A choice-shaped answer to a typed question is a blank, not a free mark.
    expect(responseFor(write, { itemId: "w1", given: { kind: "picked", option: "toas" }, ms: 5 }).credit).toBe(0);
  });

  it("honours a skip on listening alone, so a skill cannot be left out to lift the level", () => {
    const skipped = responseFor(write, { itemId: "w1", given: { kind: "skipped" }, ms: 0 });
    expect(skipped.skipped).toBeUndefined();
    expect(skipped.credit).toBe(0);
  });

  it("gives speaking its rating and no credit, whatever the answer says", () => {
    const r = responseFor(speak, { itemId: "s1", given: { kind: "rated", rating: 4 }, ms: 5 });
    expect(r).toMatchObject({ credit: 0, selfRating: 4 });
    expect(placement(paper, [r]).overall).toBeNull();
  });
});
