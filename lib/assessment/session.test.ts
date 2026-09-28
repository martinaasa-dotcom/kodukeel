import { describe, expect, it } from "vitest";
import { bandOutcome, ladderStopped, nextCursor, progress } from "./session";
import { levelFrom } from "./score";
import type { Band, ChoiceItem, Item, Response, Skill } from "./types";

const item = (id: string, skill: Skill, band: Band): ChoiceItem => ({
  id, kind: "choice", skill, band, lemma: id,
  question: "?", et: "tuba", heard: false,
  options: ["a", "b", "c", "d"], estonianOptions: false, answer: 0, because: "",
});

const PAPER: Item[] = [
  item("r-a1-1", "reading", "A1"), item("r-a1-2", "reading", "A1"),
  item("r-a2-1", "reading", "A2"), item("r-a2-2", "reading", "A2"),
  item("r-b1-1", "reading", "B1"), item("r-b1-2", "reading", "B1"),
  item("l-a1-1", "listening", "A1"),
];

/** The same paper with a fourth band, for the rules that need two rungs. */
const TALL: Item[] = [
  ...PAPER.filter((i) => i.skill === "reading"),
  item("r-b2-1", "reading", "B2"), item("r-b2-2", "reading", "B2"),
];

const toldTall = (id: string, credit: number): Response => {
  const found = TALL.find((i) => i.id === id)!;
  return { itemId: id, skill: found.skill, band: found.band, credit, ms: 500 };
};

const said = (id: string, credit: number): Response => {
  const found = PAPER.find((i) => i.id === id)!;
  return { itemId: id, skill: found.skill, band: found.band, credit, ms: 500 };
};

describe("the ladder", () => {
  it("asks the easiest unanswered question first", () => {
    expect(nextCursor(PAPER, []).index).toBe(0);
    expect(nextCursor(PAPER, [said("r-a1-1", 1)]).index).toBe(1);
  });

  it("stops climbing once a whole band came in under half", () => {
    const answers = [said("r-a1-1", 1), said("r-a1-2", 1), said("r-a2-1", 0), said("r-a2-2", 0)];
    expect(ladderStopped(PAPER, answers, "reading", "B1")).toBe(true);
    // It moves on to the next skill rather than to harder reading.
    expect(PAPER[nextCursor(PAPER, answers).index!]?.id).toBe("l-a1-1");
    expect(nextCursor(PAPER, answers).skipped).toBe(2);
  });

  it("keeps climbing on a band that was only half missed", () => {
    const answers = [said("r-a1-1", 1), said("r-a1-2", 1), said("r-a2-1", 1), said("r-a2-2", 0)];
    expect(ladderStopped(PAPER, answers, "reading", "B1")).toBe(false);
    expect(PAPER[nextCursor(PAPER, answers).index!]?.id).toBe("r-b1-1");
  });

  it("asks one band past a near miss, and then stops", () => {
    /*
      `levelFrom` ends the climb at the first band under two thirds, so nothing
      above that point can raise the level. What one more band can still do is
      show that the near miss was a bad ten questions rather than a ceiling,
      which is worth several minutes. Two more bands is not.
    */
    const near = [
      toldTall("r-a1-1", 1), toldTall("r-a1-2", 1),
      toldTall("r-a2-1", 1), toldTall("r-a2-2", 0),
    ];
    expect(ladderStopped(TALL, near, "reading", "B1")).toBe(false);
    expect(ladderStopped(TALL, near, "reading", "B2")).toBe(true);
  });

  it("keeps climbing once the band above a near miss has confirmed it", () => {
    // The near miss is read as passed by `levelFrom`, so the learner is at
    // least B1 and the next band is the open question again.
    const confirmed = [
      toldTall("r-a1-1", 1), toldTall("r-a1-2", 1),
      toldTall("r-a2-1", 1), toldTall("r-a2-2", 0),
      toldTall("r-b1-1", 1), toldTall("r-b1-2", 1),
    ];
    expect(ladderStopped(TALL, confirmed, "reading", "B2")).toBe(false);
    expect(TALL[nextCursor(TALL, confirmed).index!]?.id).toBe("r-b2-1");
    // And not once the band above only half confirmed it.
    const unconfirmed = [
      toldTall("r-a1-1", 1), toldTall("r-a1-2", 1),
      toldTall("r-a2-1", 1), toldTall("r-a2-2", 0),
      toldTall("r-b1-1", 1), toldTall("r-b1-2", 0),
    ];
    expect(ladderStopped(TALL, unconfirmed, "reading", "B2")).toBe(true);
  });

  it("stops outright above a band that collapsed, confirming nothing", () => {
    // Under half is not a near miss, and being walked further up a ladder you
    // have fallen off is the thing this rule was written for.
    const gone = [
      toldTall("r-a1-1", 1), toldTall("r-a1-2", 1),
      toldTall("r-a2-1", 0), toldTall("r-a2-2", 0),
    ];
    expect(ladderStopped(TALL, gone, "reading", "B1")).toBe(true);
  });

  it("does not stop a skill on another skill's failure", () => {
    const answers = [said("r-a1-1", 0), said("r-a1-2", 0)];
    expect(ladderStopped(PAPER, answers, "listening", "A1")).toBe(false);
  });

  it("finishes", () => {
    const all = PAPER.map((i) => said(i.id, 1));
    expect(nextCursor(PAPER, all).index).toBeNull();
    expect(progress(PAPER, all)).toBe(100);
  });

  it("counts a skipped band out of the progress meter, not into it", () => {
    const answers = [said("r-a1-1", 0), said("r-a1-2", 0)];
    // Two answered, one listening question left, four reading ones abandoned.
    expect(progress(PAPER, answers)).toBe(67);
  });
});

/** A reading paper of six questions a band, the size the blueprint sets. */
const SIX: Item[] = (["A1", "A2", "B1", "B2", "C1"] as const).flatMap((band) =>
  Array.from({ length: 6 }, (_, n) => item(`r-${band}-${n}`, "reading", band)),
);

/** Sits the six-a-band paper, answering each question with `credit(band, n)`. */
function sitSix(credit: (band: Band, n: number) => number): Response[] {
  const responses: Response[] = [];
  const seen = new Map<Band, number>();
  for (;;) {
    const at = nextCursor(SIX, responses).index;
    if (at === null) return responses;
    const next = SIX[at]!;
    const n = seen.get(next.band) ?? 0;
    seen.set(next.band, n + 1);
    responses.push({ itemId: next.id, skill: next.skill, band: next.band, credit: credit(next.band, n), ms: 500 });
  }
}

function levelOf(responses: readonly Response[]) {
  const bands = (["A1", "A2", "B1", "B2", "C1"] as const).flatMap((band) => {
    const own = responses.filter((r) => r.band === band);
    if (own.length === 0) return [];
    const credit = own.reduce((sum, r) => sum + r.credit, 0);
    return [{ band, items: own.length, credit, ratio: credit / own.length }];
  });
  return levelFrom(bands);
}

describe("a band ends the moment it is decided", () => {
  it("stops a band at four right, because the last two cannot undo a pass", () => {
    const four = ["r-A1-0", "r-A1-1", "r-A1-2", "r-A1-3"].map((id) => ({ itemId: id, skill: "reading" as const, band: "A1" as const, credit: 1, ms: 5 }));
    expect(bandOutcome(SIX, four.slice(0, 3), "reading", "A1")).toBeNull();
    expect(bandOutcome(SIX, four, "reading", "A1")).toBe("pass");
    expect(SIX[nextCursor(SIX, four).index!]?.band).toBe("A2");
  });

  it("stops a band at four \"I don't know\"s, because the last two cannot reach half", () => {
    const idk = sitSix((band) => (band === "A1" ? 1 : 0));
    // A1 decided on four, A2 on four, and nothing above a failed band is asked.
    expect(idk).toHaveLength(8);
    expect(levelOf(idk)).toBe("A1");
  });

  it("never lands a learner who mostly says \"I don't know\" at B1", () => {
    /*
      The worry this was built for: somebody who knows a few words at every
      band and says "I don't know" to the rest must not climb on the few. Walk
      every pattern of knowing up to two of each six: the level is never
      higher than the bands they genuinely passed, which is none above A1.
    */
    for (let known = 0; known <= 2; known++) {
      for (let a1 = 4; a1 <= 6; a1++) {
        const responses = sitSix((band, n) => (band === "A1" ? (n < a1 ? 1 : 0) : n < known ? 1 : 0));
        expect(levelOf(responses)).toBe("A1");
        // And it is over quickly: the band above A1 is decided on at most six.
        expect(responses.filter((r) => r.band !== "A1")).not.toHaveLength(0);
        expect(responses.filter((r) => r.band === "B1").length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("reads a decided band the same way the finished band would have been read", () => {
    // Exhaustive over every order of right and wrong in a six-question band:
    // the early outcome always agrees with the full band's class.
    let decided = 0;
    for (let mask = 0; mask < 64; mask++) {
      const full = Array.from({ length: 6 }, (_, n) => ({ itemId: `r-A1-${n}`, skill: "reading" as const, band: "A1" as const, credit: (mask >> n) & 1, ms: 5 }));
      const ratio = full.reduce((s, r) => s + r.credit, 0) / 6;
      const truth = ratio >= 2 / 3 ? "pass" : ratio >= 0.5 ? "near" : "fail";
      for (let k = 1; k <= 6; k++) {
        const early = bandOutcome(SIX, full.slice(0, k), "reading", "A1");
        if (early === null) continue;
        decided++;
        expect(early).toBe(truth);
        const partRatio = full.slice(0, k).reduce((s, r) => s + r.credit, 0) / k;
        expect(partRatio >= 2 / 3 ? "pass" : partRatio >= 0.5 ? "near" : "fail").toBe(truth);
        break;
      }
    }
    expect(decided).toBe(64);
  });
});
