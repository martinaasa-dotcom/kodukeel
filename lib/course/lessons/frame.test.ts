import { describe, expect, it } from "vitest";
import { frameOf, markGap, usesIn, wordCount } from "./frame";

const write = {
  model: [
    { et: "Tere! Ma parandasin kraani ära.", en: "Hi! I got the tap fixed." },
    { et: "Aga ma ei parandanud ust.", en: "But I didn't fix the door." },
  ],
  uses: [
    { et: "kraani ära", en: "the tap, done" },
    { et: "ust", en: "the door, not done" },
  ],
};

describe("the frame", () => {
  it("cuts the model at each use, once, and keeps the rest as written", () => {
    const frame = frameOf(write);
    expect(frame[0]!.parts).toEqual([
      { kind: "text", text: "Tere! Ma parandasin " },
      { kind: "gap", answer: "kraani ära", en: "the tap, done", n: 0 },
      { kind: "text", text: "." },
    ]);
    expect(frame[1]!.parts.filter((p) => p.kind === "gap")).toHaveLength(1);
    // The text put back together is the model.
    for (const [i, line] of frame.entries()) {
      expect(line.parts.map((p) => (p.kind === "text" ? p.text : p.answer)).join("")).toBe(write.model[i]!.et);
    }
  });

  it("takes the longer of two uses that start in the same place, whichever is listed first", () => {
    const frame = frameOf({
      model: [{ et: "Tule kui ka sina tahad.", en: "Come if you want to as well." }],
      uses: [{ et: "kui", en: "if" }, { et: "kui ka", en: "if, as well" }],
    });
    expect(frame[0]!.parts.filter((p) => p.kind === "gap").map((p) => (p.kind === "gap" ? p.answer : ""))).toEqual(["kui ka"]);
  });

  it("marks a gap right, nearly for a missing diacritic, or wrong", () => {
    expect(markGap(" Ust ", "ust")).toBe("right");
    expect(markGap("ara", "ära")).toBe("nearly");
    expect(markGap("kraani  ära", "kraani ära")).toBe("right");
    expect(markGap("ust.", "ust")).toBe("right");
    expect(markGap("uks", "ust")).toBe("wrong");
    expect(markGap("uks", "ust")).toBe("wrong");
    expect(markGap("", "ust")).toBe("wrong");
  });

  it("ticks the uses a draft holds as whole words, and counts its words", () => {
    expect(usesIn("Ma parandasin kraani ära. Ustav.", write.uses)).toEqual([true, false]);
    // A dropped mark, two spaces or a capital are still the use.
    expect(usesIn("Ma parandasin kraani ara.", write.uses)[0]).toBe(true);
    expect(usesIn("Ma parandasin Kraani  ära.", write.uses)[0]).toBe(true);
    expect(wordCount("Ma parandasin kraani ära.")).toBe(4);
  });
});
