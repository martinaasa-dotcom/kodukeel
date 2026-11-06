import { describe, expect, it } from "vitest";
import { LESSONS } from "./index";
import { finishScreens, screensOf } from "./screens";

/*
  ONE SCREEN, ONE THING TO DO. These are the checks a list of screens can fail:
  a page with two tasks on it is two screen ids where there should be one,
  and the reported fault (the text to read under the conversation on Listen)
  is a lesson with both whose Listen step is not two pages.
*/
const facts = { news: false, heard: false, forms: false };

describe("a lesson step is a page at a time", () => {
  it("puts the text to read on a page of its own, after the conversation", () => {
    const withText = LESSONS.filter((l) => l.read && l.conversation.some((line) => line.et));
    expect(withText.length).toBeGreaterThan(0);
    for (const lesson of withText) {
      const screens = screensOf("listen", lesson, { ...facts, heard: true });
      expect(screens.indexOf("read")).toBeGreaterThan(screens.indexOf("conversation"));
      expect(screens.indexOf("conversation")).toBeGreaterThanOrEqual(0);
    }
  });

  it("hears a conversation first, on a page before the one that shows its words, and drops it once heard", () => {
    const heardFirst = LESSONS.filter((l) => (l.listenFor?.length ?? 0) > 0);
    expect(heardFirst.length).toBeGreaterThan(0);
    for (const lesson of heardFirst) {
      const before = screensOf("listen", lesson, facts);
      expect(before[0]).toBe("hear");
      const after = screensOf("listen", lesson, { ...facts, heard: true });
      expect(after).not.toContain("hear");
      // The page after hearing sits at the index hearing had, so pressing "Read it" lands on it.
      expect(after[before.indexOf("hear")]).toBe(before[before.indexOf("hear") + 1]);
    }
  });

  it("says what is new at a level on its own first page", () => {
    const lesson = LESSONS[0]!;
    expect(screensOf("listen", lesson, { ...facts, news: true })[0]).toBe("news");
  });

  it("never repeats a page and never leaves a step without one", () => {
    let walked = 0;
    for (const lesson of LESSONS) {
      for (const step of ["listen", "words", "how", "practise", "write", "say", "review"] as const) {
        for (const f of [facts, { news: true, heard: true, forms: true }]) {
          const screens = screensOf(step, lesson, f);
          walked += 1;
          expect(screens.length).toBeGreaterThan(0);
          expect(new Set(screens).size).toBe(screens.length);
        }
      }
    }
    expect(walked).toBeGreaterThan(LESSONS.length * 10);
  });

  it("gives How it works a page per part, the idea first", () => {
    const spelled = LESSONS.filter((l) => l.how.spell || (l.how.listen?.length ?? 0) > 0 || (l.how.sounds?.length ?? 0) > 0);
    expect(spelled.length).toBeGreaterThan(0);
    for (const lesson of spelled) {
      const screens = screensOf("how", lesson, facts);
      expect(screens[0]).toBe("idea");
      expect(screens.length).toBeGreaterThan(1);
    }
  });

  it("ends a lesson one page at a time, with the way on last", () => {
    const all = finishScreens({ taught: 5, conversation: true, check: true, worksheet: true, situation: true, due: 3 });
    expect(all[0]).toBe("done");
    expect(all[all.length - 1]).toBe("next");
    expect(all).toEqual(["done", "again", "conversation", "check", "worksheet", "situation", "review", "next"]);
    expect(finishScreens({ taught: 0, conversation: false, check: false, worksheet: false, situation: false, due: 0 })).toEqual(["done", "next"]);
  });
});
