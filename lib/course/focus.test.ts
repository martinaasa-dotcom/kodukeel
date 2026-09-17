import { describe, expect, it } from "vitest";
import { PROGRAMMES } from "./index";
import {
  MODULE_HOME, MODULE_PARAM, continueHref, focusHref, focusValue, focusedSteps, readFocus,
  stepAfter,
} from "./focus";

const programme = PROGRAMMES[0]!;
const day = programme.days[0]!;
const focus = {
  programmeId: programme.id, dayId: day.id, stepId: day.steps[0]!.id,
  n: 1, of: 5, derived: true,
};

describe("the marker a focused step carries", () => {
  it("goes out and comes back the same", () => {
    expect(readFocus(focusValue(focus))).toEqual(focus);
  });

  it("survives the ids the programmes actually use", () => {
    /* A programme id is `a1.1` and a day id carries dashes, which is why the
       separator is neither a dot nor a dash. Asked of every day there is
       rather than of one, because the day a part is renamed is the day a
       separator chosen by eye stops round-tripping. */
    for (const p of PROGRAMMES) {
      for (const d of p.days) {
        for (const { step, href, n, of } of focusedSteps(p.id, d.id, d.steps)) {
          const url = new URL(href, "https://example.test");
          expect(readFocus(url.searchParams.get(MODULE_PARAM))).toEqual({
            programmeId: p.id, dayId: d.id, stepId: step.id, n, of, derived: step.derived,
          });
        }
      }
    }
  });

  it("keeps a query the step's own href already carried", () => {
    const href = focusHref("/review?case=INESSIVE", focus);
    const url = new URL(href, "https://example.test");
    expect(url.searchParams.get("case")).toBe("INESSIVE");
    expect(readFocus(url.searchParams.get(MODULE_PARAM))).toEqual(focus);
  });

  /*
    IT ARRIVES OFF THE WIRE, WHATEVER THE TYPE SAYS. A hand-typed address, a
    stale bookmark and a shared link all reach `readFocus`, and the honest
    answer to anything that is not five fields with two numbers in them is that
    there is no module in play: a frame drawn off a half-read marker would
    print a caption nobody can act on and hide the rail behind it.
  */
  it.each([
    ["nothing", undefined],
    ["a number", 3],
    ["too few fields", "a1.1~day-1~read~1~5"],
    ["too many", "a1.1~day-1~read~1~5~0~x"],
    ["a step out of range", "a1.1~day-1~read~9~5~0"],
    ["a position that is not a number", "a1.1~day-1~read~one~5~0"],
    ["an empty programme", "~day-1~read~1~5~0"],
    ["a derived flag that is neither", "a1.1~day-1~read~1~5~maybe"],
  ])("refuses %s", (_what, value) => {
    expect(readFocus(value)).toBeNull();
  });

  it("takes the first of a repeated parameter rather than throwing", () => {
    expect(readFocus([focusValue(focus), "junk"])).toEqual(focus);
  });
});

describe("the way on from a step", () => {
  it("is the next step of the day, still inside the module", () => {
    for (const p of PROGRAMMES) {
      for (const d of p.days) {
        d.steps.forEach((step, at) => {
          const next = d.steps[at + 1];
          expect(stepAfter(d, step.id)?.id ?? null).toBe(next?.id ?? null);
          const href = continueHref(p.id, d, step.id);
          if (!next) {
            expect(href).toBe(MODULE_HOME);
            return;
          }
          const url = new URL(href, "https://example.test");
          expect(url.pathname).toBe(next.href.split("?")[0]);
          expect(readFocus(url.searchParams.get(MODULE_PARAM))).toEqual({
            programmeId: p.id, dayId: d.id, stepId: next.id, n: at + 2, of: d.steps.length,
            derived: next.derived,
          });
        });
      }
    }
  });

  /* The evening ends on the module's own list rather than rolling out into the
     app, which is the same argument that screen makes about tomorrow. */
  it("ends on the module screen and never on Today", () => {
    const last = day.steps[day.steps.length - 1]!;
    expect(continueHref(programme.id, day, last.id)).toBe(MODULE_HOME);
  });

  it("says nothing about a step the day does not have", () => {
    expect(stepAfter(day, "no-such-step")).toBeNull();
    expect(continueHref(programme.id, day, "no-such-step")).toBe(MODULE_HOME);
  });
});
