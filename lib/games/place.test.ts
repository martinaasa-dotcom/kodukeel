import { describe, expect, it } from "vitest";
import { BALL } from "./map";
import { PLACE_LEMMAS, PLACE_WORDS, pickWrongPlaces, placeScene } from "./place";

describe("place words", () => {
  it("name six place words, each with a different picture", () => {
    expect(PLACE_LEMMAS).toEqual(["peal", "all", "ees", "taga", "kõrval", "kohal"]);
    const pictures = PLACE_WORDS.map((w) => JSON.stringify(w.layout("🪑")));
    expect(new Set(pictures).size).toBe(PLACE_WORDS.length);
  });

  it("draws the host's own emoji and a ball, and says so for a reader who cannot see", () => {
    let drawn = 0;
    for (const w of PLACE_WORDS) {
      const scene = placeScene(w, "🪑");
      expect(scene).not.toBeNull();
      const l = scene!.layout;
      const glyphs = l.kind === "row" ? l.parts.map((p) => p.glyph) : [l.host, l.guest];
      expect(glyphs).toContain("🪑");
      expect(glyphs).toContain(BALL);
      expect(scene!.alt.length).toBeGreaterThan(6);
      drawn += 1;
    }
    expect(drawn).toBe(PLACE_WORDS.length);
  });

  it("draws nothing for a word with no emoji, or whose emoji is the ball", () => {
    expect(placeScene(PLACE_WORDS[0]!, null)).toBeNull();
    expect(placeScene(PLACE_WORDS[0]!, BALL)).toBeNull();
  });

  it("never asks the question in a way that spells the answer", () => {
    for (const w of PLACE_WORDS) {
      expect(w.ask.toLowerCase().split(/\W+/)).not.toContain(w.lemma);
    }
  });
});

describe("the wrong place words", () => {
  const all = PLACE_LEMMAS;
  it("are two others, never the answer", () => {
    let asked = 0;
    for (const answer of all) {
      const wrong = pickWrongPlaces(answer, all);
      expect(wrong).not.toBeNull();
      expect(wrong!.length).toBe(2);
      expect(wrong).not.toContain(answer);
      asked += 1;
    }
    expect(asked).toBe(all.length);
  });

  it("never put together two pictures that differ by a few pixels", () => {
    const pairs = [["peal", "kohal"], ["ees", "kõrval"], ["taga", "kõrval"]] as const;
    let checked = 0;
    for (const answer of all) {
      const wrong = pickWrongPlaces(answer, all)!;
      const options = [answer, ...wrong];
      for (const [a, b] of pairs) {
        expect(options.includes(a) && options.includes(b)).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBe(all.length * pairs.length);
  });

  it("gives up rather than offering a pair that cannot be told apart", () => {
    expect(pickWrongPlaces("peal", ["peal", "kohal", "kõrval"])).toBeNull();
  });
});
