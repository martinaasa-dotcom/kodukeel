import { describe, expect, it } from "vitest";

import { findTells } from "@/lib/copy/voice";
import { LEVELS } from "@/lib/collections/syllabus";
import {
  FLYING_ACCURACY, FLYING_EVIDENCE, ADAPT_MIN_EVIDENCE, STRUGGLING_ACCURACY, STRUGGLING_MISSES,
  adaptOffer, adaptReading, leanSentence, moveLabel, offerBody, offerParts, offerTitle, tiltFor, tiltedLevel,
  type AdaptPosition, type AdaptReading, type PartRef,
} from "./adapt";
import { PROGRAMMES } from "./index";

const ladder: PartRef[] = PROGRAMMES.map((p) => ({ id: p.id, level: p.level }));
const part = (id: string) => ladder.find((p) => p.id === id)!;
const firstOf = (level: string) => ladder.find((p) => p.level === level)!;

const at = (over: Partial<AdaptPosition> & { part: PartRef }): AdaptPosition => ({
  ladder, touched: new Set([over.part.id]), held: null, kind: null, ...over,
});

const both = { pace: true, talk: true };

const struggling: AdaptReading = { kind: "struggling", accuracy: 0.5, because: "accuracy" };
const flying: AdaptReading = { kind: "flying", accuracy: 0.95 };

describe("what the recent answers say", () => {
  it("says nothing on thin evidence", () => {
    expect(adaptReading({ answers: ADAPT_MIN_EVIDENCE - 1, right: 0, missed: ADAPT_MIN_EVIDENCE - 1 }).kind)
      .toBe("unmeasured");
  });

  it("reads consistently wrong as struggling, at the line and not above it", () => {
    const under = adaptReading({ answers: 100, right: STRUGGLING_ACCURACY * 100 - 1, missed: 0 });
    expect(under.kind).toBe("struggling");
    const at = adaptReading({ answers: 100, right: STRUGGLING_ACCURACY * 100, missed: 0 });
    expect(at.kind).toBe("steady");
  });

  it("reads a run of outright misses as struggling even when the rest look fine", () => {
    const reading = adaptReading({ answers: 100, right: 65, missed: STRUGGLING_MISSES * 100 });
    expect(reading).toMatchObject({ kind: "struggling", because: "misses" });
  });

  it("needs a lot of answers, nearly all right and almost none missed, to call it flying", () => {
    const right = Math.ceil(FLYING_ACCURACY * FLYING_EVIDENCE);
    expect(adaptReading({ answers: FLYING_EVIDENCE, right, missed: 0 }).kind).toBe("flying");
    // The same share over too few answers is only steady.
    expect(adaptReading({ answers: ADAPT_MIN_EVIDENCE, right: ADAPT_MIN_EVIDENCE, missed: 0 }).kind).toBe("steady");
    // And nearly all right with a few outright misses is not flying.
    expect(adaptReading({ answers: 100, right: 93, missed: 5 }).kind).toBe("steady");
  });
});

describe("how far the delivery leans", () => {
  it("leans one band, and only off the reading", () => {
    expect(tiltFor(struggling)).toBe(-1);
    expect(tiltFor(flying)).toBe(1);
    expect(tiltFor({ kind: "steady", accuracy: 0.8 })).toBe(0);
    expect(tiltFor({ kind: "unmeasured" })).toBe(0);
  });

  it("stays on the ladder at both ends", () => {
    expect(tiltedLevel("A1", -1)).toBe("A1");
    expect(tiltedLevel("C1", 1)).toBe("C1");
    expect(tiltedLevel("B1", -1)).toBe("A2");
    expect(tiltedLevel("B1", 1)).toBe("B2");
    for (const level of LEVELS) expect(tiltedLevel(level, 0)).toBe(level);
  });
});

/*
  THE CASE THIS WAS ASKED FOR.

  Somebody told first run they were B1, was opened on B2.1, and keeps getting
  it wrong. The app offers B1 again as a refresher, says that the level they
  named was a first guess, and afterwards they hold A2, so the course, the
  climb and the recordings all agree about the step they took.
*/
describe("somebody placed above where their answers are", () => {
  const placed = at({ part: firstOf("B2"), held: "B1", kind: "declared" });

  it("is offered the level below to go over, onto its first part", () => {
    const offer = adaptOffer(struggling, placed)!;
    expect(offer.move).toMatchObject({ kind: "down", to: firstOf("B1"), held: "A2" });
    expect(offer.placed).toBe(true);
    expect(moveLabel(offer.move!)).toBe("Refresh B1 first");
  });

  it("is told what the move is for, and that the level was a first guess", () => {
    const body = offerBody(adaptOffer(struggling, placed)!, both);
    expect(body).toMatch(/refresher/);
    expect(body).toMatch(/first guess/);
    expect(body).toMatch(/waits for you/);
  });

  it("is never offered a part they have already walked", () => {
    const walked = at({ part: firstOf("B2"), held: "B1", touched: new Set([firstOf("B1").id, firstOf("B2").id]) });
    const move = adaptOffer(struggling, walked)!.move;
    expect(move?.to.id).not.toBe(firstOf("B1").id);
  });
});

describe("somebody who walked up from the first evening", () => {
  it("is offered no part to redo, since every earlier one is theirs already", () => {
    const earlier = ladder.slice(0, ladder.findIndex((p) => p.level === "A2") + 2).map((p) => p.id);
    const walked = at({ part: part(earlier[earlier.length - 1]!), held: null, touched: new Set(earlier) });
    const offer = adaptOffer(struggling, walked)!;
    expect(offer.move).toBeNull();
    expect(offer.placed).toBe(false);
    // And the card still says what is being done about it.
    expect(offerBody(offer, both)).toMatch(/slower/);
  });
});

describe("somebody flying", () => {
  it("is offered the next part", () => {
    const here = ladder[3]!;
    const offer = adaptOffer(flying, at({ part: here }))!;
    expect(offer.move).toMatchObject({ kind: "ahead", to: ladder[4] });
  });

  it("holds the level they skip out of", () => {
    const lastOfB1 = [...ladder].reverse().find((p) => p.level === "B1")!;
    const offer = adaptOffer(flying, at({ part: lastOfB1, held: "A2" }))!;
    expect(offer.move).toMatchObject({ kind: "ahead", held: "B1" });
    expect(offer.move!.to.level).toBe("B2");
  });

  it("is offered nothing past the top, and told the harder delivery is the stretch", () => {
    const top = ladder[ladder.length - 1]!;
    const offer = adaptOffer(flying, at({ part: top }))!;
    expect(offer.move).toBeNull();
    expect(offerBody(offer, both)).toMatch(/no part above/);
  });
});

describe("a steady learner", () => {
  it("is offered nothing at all", () => {
    expect(adaptOffer({ kind: "steady", accuracy: 0.8 }, at({ part: ladder[0]! }))).toBeNull();
    expect(adaptOffer({ kind: "unmeasured" }, at({ part: ladder[0]! }))).toBeNull();
  });
});

describe("what the card says", () => {
  it("never says anything a machine would", () => {
    const positions = [
      at({ part: firstOf("B2"), held: "B1", kind: "declared" }),
      at({ part: ladder[0]! }),
      at({ part: ladder[ladder.length - 1]! }),
      at({ part: ladder[5]!, touched: new Set([ladder[5]!.id]) }),
    ];
    let said = 0;
    for (const reading of [struggling, flying, { ...struggling, because: "misses" as const }]) {
      for (const position of positions) {
        const offer = adaptOffer(reading, position);
        if (!offer) continue;
        const text = `${offerTitle(offer)} ${offerBody(offer, both)} ${offer.move ? moveLabel(offer.move) : ""}`;
        expect(findTells(text)).toEqual([]);
        // About the fit, never about the person.
        expect(text).not.toMatch(/\b(bad at|failing|failed|struggle with)\b/i);
        said += 1;
      }
    }
    expect(said).toBe(12);
  });
});

describe("what the lean is said to be doing", () => {
  it("names only the levers that moved", () => {
    expect(leanSentence(-1, { pace: true, talk: false })).toMatch(/slower/);
    expect(leanSentence(-1, { pace: true, talk: false })).not.toMatch(/conversations/);
    expect(leanSentence(1, { pace: false, talk: true })).toMatch(/conversations start a little harder/);
  });

  it("says nothing where nothing moved, or nothing leans", () => {
    // Somebody at A1 who chose their own pace: neither lever can move.
    expect(leanSentence(-1, { pace: false, talk: false })).toBe("");
    expect(leanSentence(0, { pace: true, talk: true })).toBe("");
  });

  it("keeps a card honest about a lean that moved nothing", () => {
    const offer = adaptOffer(struggling, at({ part: ladder[0]! }))!;
    expect(offerBody(offer, { pace: false, talk: false })).not.toMatch(/slower|simpler/);
  });
});

describe("the flying card's figure", () => {
  it("says every answer rather than a hundred out of a hundred", () => {
    const offer = adaptOffer({ kind: "flying", accuracy: 1 }, at({ part: firstOf("B1") }))!;
    expect(offerParts(offer, both).lead).toBe("Lately you've been getting every answer right.");
    const nearly = adaptOffer(flying, at({ part: firstOf("B1") }))!;
    expect(offerParts(nearly, both).lead).toContain("95 out of a hundred");
  });
});
