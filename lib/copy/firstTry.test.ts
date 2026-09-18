import { describe, expect, it } from "vitest";
import { FIRST_TRY_NOTE, isFirstProduction } from "./firstTry";

describe("when the app says it is fine not to know a word", () => {
  it("says it the first time somebody is asked to write one", () => {
    expect(isFirstProduction({ produced: 0, typed: true })).toBe(true);
  });

  it("says nothing on a word they have already written", () => {
    expect(isFirstProduction({ produced: 1, typed: true })).toBe(false);
  });

  it("says nothing over four options, which is not producing a word", () => {
    expect(isFirstProduction({ produced: 0, typed: false })).toBe(false);
  });
});

describe("the line itself", () => {
  it("stays short enough to be read without stopping", () => {
    /*
      Tighter than the 110 `lib/copy/readerCopy.test.ts` holds every small
      caption to, and not a second copy of that number: this one sits over a box
      somebody is about to type into, and a sentence they have to finish reading
      before they can start is a sentence in the way. A line of a phone.
    */
    expect(FIRST_TRY_NOTE.length).toBeLessThanOrEqual(90);
  });

  it("is not praise, and does not expect them to fail", () => {
    // The claim is about what a guess is worth, which is the app's own cited
    // finding. It is not "you will get this wrong and that is fine".
    expect(FIRST_TRY_NOTE).toMatch(/miss teaches you more than a skip/);
  });
});
