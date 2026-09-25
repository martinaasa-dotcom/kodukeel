import { describe, expect, it } from "vitest";
import {
  MIN_EVIDENCE, READY_ACCURACY, READY_KNOWN_SHARE, holdAdvice, holdReason, ladderVerdict,
} from "./gate";

/**
 * The reading taken at the hand-off between two parts.
 *
 * What it is for is the learner who ticked every evening and retained none of
 * it: handing that person the next level is the false confidence this app is
 * built against. What it may never be is a wall, and the thing worth testing
 * hardest is the third answer, that thin evidence is not a verdict.
 */
const evidence = (over: Partial<Parameters<typeof ladderVerdict>[0]> = {}) => ({
  taught: 80, known: 60, answers: 200, right: 180, ...over,
});

describe("whether the log supports the next part", () => {
  it("says nothing at all on thin evidence", () => {
    /* Terrible on both readings, and still unmeasured: nobody has watched. */
    const thin = ladderVerdict(evidence({ known: 0, right: 0, answers: MIN_EVIDENCE - 1 }));
    expect(thin.kind).toBe("unmeasured");
    // And exactly the floor is evidence: "under" is the word that decides it.
    expect(ladderVerdict(evidence({ known: 0, right: 0, answers: MIN_EVIDENCE })).kind).not.toBe("unmeasured");
  });

  it("lets somebody on when both readings hold", () => {
    expect(ladderVerdict(evidence()).kind).toBe("ready");
  });

  it("holds on retention, which is the reading that predicts the next part", () => {
    const verdict = ladderVerdict(evidence({ taught: 80, known: 20 }));
    expect(verdict.kind).toBe("hold");
    if (verdict.kind !== "hold") return;
    expect(verdict.because).toBe("retention");
    expect(verdict.seen).toBeCloseTo(0.25);
    expect(verdict.bar).toBe(READY_KNOWN_SHARE);
  });

  it("holds on accuracy, for somebody getting through and getting it wrong", () => {
    const verdict = ladderVerdict(evidence({ right: 80, answers: 200 }));
    expect(verdict.kind).toBe("hold");
    if (verdict.kind !== "hold") return;
    expect(verdict.because).toBe("accuracy");
    expect(verdict.bar).toBe(READY_ACCURACY);
  });

  /*
    A part whose words the dictionary could supply none of is a gap in Ekilex
    rather than a learner failing, so it is not counted against anybody.
  */
  it("does not hold somebody for words that were never in their deck", () => {
    expect(ladderVerdict(evidence({ taught: 0, known: 0 })).kind).toBe("ready");
  });

  it("is exactly at the bar rather than a hair under it", () => {
    const atBar = ladderVerdict(evidence({ taught: 100, known: READY_KNOWN_SHARE * 100 }));
    expect(atBar.kind).toBe("ready");
    const under = ladderVerdict(evidence({ taught: 100, known: READY_KNOWN_SHARE * 100 - 1 }));
    expect(under.kind).toBe("hold");
  });
});

describe("what it says", () => {
  const hold = (over: Parameters<typeof evidence>[0]) => {
    const verdict = ladderVerdict(evidence(over));
    if (verdict.kind !== "hold") throw new Error("expected a hold");
    return verdict;
  };

  it("prints a share somebody can check, and never a bare percentage of nothing", () => {
    expect(holdReason(hold({ taught: 80, known: 20 }))).toContain("25 in a hundred");
    expect(holdReason(hold({ right: 80, answers: 200 }))).toContain("40 in a hundred");
  });

  /*
    The advice may never be "start the part again". Nothing in this app repeats
    a fortnight, the words are already in the queue, and telling somebody to
    redo two weeks is how they stop opening it.
  */
  it("never tells anybody to start again", () => {
    for (const verdict of [hold({ taught: 80, known: 20 }), hold({ right: 80, answers: 200 })]) {
      const said = `${holdReason(verdict)} ${holdAdvice(verdict)}`.toLowerCase();
      /*
        The meaning rather than three spellings of it. This forbade "start
        again", "repeat" and "redo", and "Start the part again from its first
        evening", "Go back to the first evening of this part" and "Begin this
        part over" all passed: none of them is one of those strings, and every
        one of them is the advice this exists to refuse.
      */
      expect(said).not.toMatch(
        /\b(again|once more|over|back to|restart|repeat|redo|from the (first|start|beginning))\b/,
      );
      expect(said.length).toBeGreaterThan(40);
    }
  });
});
