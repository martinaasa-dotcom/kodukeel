import { describe, expect, it } from "vitest";
import { clipKey, nativeTake, rateFor } from "./clip";
import { paceFrom } from "./pace";

const A1 = paceFrom("auto", "A1");

describe("a native recording standing in for the synthesizer", () => {
  it("stands in only where the screen left the voice to the learner", () => {
    expect(nativeTake({ text: "Aitäh!", voice: "mari", native: true })?.id).toBe("word-aitaeh");
    expect(nativeTake({ text: "Aitäh!", voice: "mari" })).toBeNull();
    expect(nativeTake({ text: "koer", voice: "mari", native: true })).toBeNull();
  });

  it("is cached as the recording, whatever voice the learner picked", () => {
    expect(clipKey({ text: "Aitäh!", voice: "mari", native: true })).toBe(clipKey({ text: "aitäh", voice: "kalev", native: true }));
    expect(clipKey({ text: "Aitäh!", voice: "mari" })).not.toBe(clipKey({ text: "Aitäh!", voice: "mari", native: true }));
  });

  it("plays a take at speed at the learner's pace, like every clip", () => {
    expect(rateFor({ text: "Palun", native: true, pace: A1 })).toBe(rateFor({ text: "Palun", pace: A1 }));
    expect(rateFor({ text: "Palun", native: true, pace: A1 })).toBeLessThan(1);
  });

  it("plays a slow take as it was said, rather than slowing it twice", () => {
    expect(rateFor({ text: "aitäh", native: true, slow: true, pace: A1 })).toBe(1);
    expect(rateFor({ text: "Palun", native: true, slow: true, pace: A1 })).toBeLessThan(1);
  });

  it("plays a clip asked for by id as it was said", () => {
    expect(rateFor({ text: "", nativeId: "sound-ae", pace: A1 })).toBe(1);
    expect(nativeTake({ text: "", nativeId: "sound-ae" })?.text).toBe("ä");
  });
});
