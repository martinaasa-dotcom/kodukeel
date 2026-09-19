import { describe, expect, it } from "vitest";
import { LEECH_LAPSES } from "@/lib/analysis/leeches";
import {
  COVER, HINT_AFTER_MISSES, hintCeiling, hintLadder, hintsOpen, narrowLadder, struckOptions,
} from "./hints";

/** Every rung's covered spelling, which is what a learner actually reads. */
const shown = (ask: Parameters<typeof hintLadder>[0]) => hintLadder(ask).map((h) => h.shown);

describe("when the hint is offered", () => {
  it("is shut on the first ask", () => {
    expect(hintsOpen(0)).toBe(false);
  });

  it("opens on the second go around the same word", () => {
    expect(hintsOpen(HINT_AFTER_MISSES)).toBe(true);
  });

  it("opens straight away for a word the learner keeps failing", () => {
    expect(hintsOpen(0, LEECH_LAPSES)).toBe(true);
    expect(hintsOpen(0, LEECH_LAPSES - 1)).toBe(false);
  });
});

describe("the ladder over a form built on a stem", () => {
  it("uncovers the ending before the stem, because the ending is the half a rule gives", () => {
    expect(shown({ answer: "toas", stems: ["toa"] })).toEqual(["____", "___s", "to_s", "toas"]);
  });

  it("ends on the answer and never repeats a rung", () => {
    const ladder = hintLadder({ answer: "raamatust", stems: ["raamatu"] });
    expect(ladder[ladder.length - 1]?.shown).toBe("raamatust");
    expect(new Set(ladder.map((h) => h.shown)).size).toBe(ladder.length);
  });

  it("takes the longest of the forms offered that really is the front of the answer", () => {
    // What a caller hands over is whatever it holds: a lemma, a stem, a null.
    expect(shown({ answer: "raamatust", stems: [null, "raamat", "raamatu", "kohv"] }))
      .toEqual(["_________", "_______st", "raam___st", "raamatust"]);
  });

  it("ignores a form that is the whole answer, which would be the answer rung early", () => {
    expect(hintLadder({ answer: "kohv", stems: ["kohv"] }).map((h) => h.kind))
      .toEqual(["shape", "start", "more", "answer"]);
  });

  it("says nothing about an ending where the stem is not the answer's own", () => {
    // `tuba` goes to `tuppa`, which is stored rather than built on `toa`.
    expect(hintLadder({ answer: "tuppa", stems: ["toa"] }).map((h) => h.kind))
      .toEqual(["shape", "start", "more", "answer"]);
  });
});

describe("the ladder over an answer with no stem behind it", () => {
  it("uncovers from the front, in two steps", () => {
    expect(shown({ answer: "morning" })).toEqual(["_______", "mo_____", "morni__", "morning"]);
  });

  it("never covers a space or a mark, so a phrase's shape is its own", () => {
    const [shape] = shown({ answer: "Head aega!" });
    expect(shape).toBe("____ ____!");
  });

  it("counts letters rather than characters when it says how long", () => {
    expect(hintLadder({ answer: "Head aega!" })[0]?.label).toBe("2 words, 8 letters");
    expect(hintLadder({ answer: "kohv" })[0]?.label).toBe("4 letters");
  });
});

describe("the ladder's edges", () => {
  it("has nothing to say about an empty answer", () => {
    expect(hintLadder({ answer: "   " })).toEqual([]);
  });

  it("never hands the answer over under a label promising less", () => {
    for (const answer of ["a", "on", "sse", "kohv", "raamatutega", "Tere hommikust!"]) {
      for (const stems of [[], ["kohv"], ["raamatute"], [null, "raamatute", "raamatu"]]) {
        const ladder = hintLadder({ answer, stems });
        const giveaways = ladder.filter((h) => h.shown === answer);
        expect(giveaways).toHaveLength(1);
        expect(giveaways[0]?.kind).toBe("answer");
      }
    }
  });

  it("uncovers strictly more at every press", () => {
    const ladder = hintLadder({ answer: "raamatust", stems: ["raamatu"] });
    const covered = ladder.map((h) => [...h.shown].filter((c) => c === COVER).length);
    for (let i = 1; i < covered.length; i += 1) {
      expect(covered[i]).toBeLessThan(covered[i - 1] as number);
    }
  });
});

describe("what a hint costs", () => {
  it("costs nothing at all until one is taken, Easy included", () => {
    // 4 rather than 3: a flip card is self-graded and Easy is one of its four,
    // so a ceiling on an untouched ladder would take Easy off those screens.
    expect(hintCeiling(hintLadder({ answer: "toas", stems: ["toa"] }), 0)).toBe(4);
    expect(hintCeiling([], 5)).toBe(4);
  });

  it("caps a narrowing hint at Hard", () => {
    expect(hintCeiling(hintLadder({ answer: "toas", stems: ["toa"] }), 1)).toBe(2);
    expect(hintCeiling(hintLadder({ answer: "toas", stems: ["toa"] }), 3)).toBe(2);
  });

  it("caps the rung that spells it out at Again", () => {
    const ladder = hintLadder({ answer: "toas", stems: ["toa"] });
    expect(hintCeiling(ladder, ladder.length)).toBe(1);
  });

  it("never rises again once a rung has been taken", () => {
    const ladder = hintLadder({ answer: "toas", stems: ["toa"] });
    const ceilings = ladder.map((_, i) => hintCeiling(ladder, i + 1));
    for (let i = 1; i < ceilings.length; i += 1) {
      expect(ceilings[i]).toBeLessThanOrEqual(ceilings[i - 1] as number);
    }
  });
});

describe("narrowing, where the options are already on the screen", () => {
  const options = ["toas", "toast", "toale", "raamatuga"];

  it("strikes the option nobody would confuse with the answer first", () => {
    expect(struckOptions(options, "toas", 1)).toEqual(["raamatuga"]);
  });

  it("leaves the rivals worth telling apart standing longest", () => {
    expect(struckOptions(options, "toas", 2)).toContain("raamatuga");
    expect(struckOptions(options, "toas", 2)).not.toContain("toast");
  });

  it("never strikes the answer, however many presses it is given", () => {
    expect(struckOptions(options, "toas", 99)).not.toContain("toas");
  });

  it("never strikes a second option spelled like the answer, which is also right", () => {
    expect(struckOptions(["tuppa", "toasse", "tuppa"], "tuppa", 99)).toEqual(["toasse"]);
  });

  it("gives one rung per wrong option, and the last of them is the answer", () => {
    const ladder = narrowLadder(options, "toas");
    expect(ladder).toHaveLength(3);
    expect(ladder[2]?.ceiling).toBe(1);
    expect(ladder.slice(0, 2).every((h) => h.ceiling === 2)).toBe(true);
  });
});

describe("the ending read off the case's own suffix", () => {
  it("names it where the round knows the case but not the word's stem", () => {
    expect(shown({ answer: "toas", suffix: "s" })).toEqual(["____", "___s", "to_s", "toas"]);
  });

  it("claims nothing about a form the suffix did not build", () => {
    // `tuba` goes to `tuppa`, which is stored. The illative's suffix is `sse`.
    expect(hintLadder({ answer: "tuppa", suffix: "sse" }).map((h) => h.kind))
      .toEqual(["shape", "start", "more", "answer"]);
  });

  it("says nothing for a principal part, whose suffix is empty", () => {
    expect(hintLadder({ answer: "toa", suffix: "" }).map((h) => h.kind))
      .toEqual(["shape", "start", "more", "answer"]);
  });

  it("believes the word's own stem over the case's suffix where they differ", () => {
    // A stored parallel form that happens to end in the suffix's letters.
    expect(shown({ answer: "raamatus", stems: ["raamatu"], suffix: "us" }))
      .toEqual(["________", "_______s", "raam___s", "raamatus"]);
  });
});
