import { describe, expect, it } from "vitest";
import {
  buildIsRight, isMark, isOrderable, joinTokens, markName, orderFaces, orderTokens, readBuiltOrder, sentenceStarters,
} from "./orderTiles";

const CAKE = "Kas sa tahad ka kooki? – Muidugi!";
const PHONE = "Pean uue telefoni ostma, kuna vana läks katki.";

describe("orderTokens", () => {
  it("makes the marks tiles of their own, in place", () => {
    expect(orderTokens(CAKE)).toEqual(["Kas", "sa", "tahad", "ka", "kooki", "?", "–", "Muidugi", "!"]);
    expect(orderTokens(PHONE)).toEqual(["Pean", "uue", "telefoni", "ostma", ",", "kuna", "vana", "läks", "katki", "."]);
  });

  it("keeps a hyphen inside a word and reads a standing hyphen as a dash", () => {
    expect(orderTokens("Ta on Eesti-Soome tõlk - jah.")).toEqual(["Ta", "on", "Eesti-Soome", "tõlk", "–", "jah", "."]);
  });

  it("joins them back the way they were written", () => {
    expect(joinTokens(orderTokens(CAKE))).toBe(CAKE);
    expect(joinTokens(orderTokens(PHONE))).toBe(PHONE);
  });

  it("names a mark for the button that places it", () => {
    for (const t of [",", ".", "!", "?", ":", ";", "–"]) {
      expect(isMark(t)).toBe(true);
      expect(markName(t)).not.toBe(t);
    }
    expect(isMark("kas")).toBe(false);
  });
});

describe("isOrderable", () => {
  it("takes a sentence made of words and the marks", () => {
    expect(isOrderable(CAKE)).toBe(true);
    expect(isOrderable(PHONE)).toBe(true);
  });

  it("refuses what the tiles could not give back", () => {
    expect(isOrderable("Kontsert algab kell 18.00 õhtul sees.")).toBe(false);
    expect(isOrderable("Ta ütles „tere“ ja läks ära kohe.")).toBe(false);
    expect(isOrderable("Ta ütles... jah ja läks ära.")).toBe(false);
    expect(isOrderable("Mis see on?! Ma ei tea sellest.")).toBe(false);
  });

  it("keeps the old limits on the words, and a repeated word still refuses", () => {
    expect(isOrderable("Ma lähen kohe.")).toBe(false);
    expect(isOrderable("Ma ei tea, et ma ei tea.")).toBe(false);
  });
});

describe("orderFaces", () => {
  const ordinary = new Set(["Kas", "Muidugi", "Pean"]);

  it("takes the capital off every word that only opens a sentence", () => {
    expect(orderFaces(orderTokens(CAKE), ordinary)).toEqual(["kas", "sa", "tahad", "ka", "kooki", "?", "–", "muidugi", "!"]);
  });

  it("leaves a name alone, at the start and in the middle", () => {
    const tokens = orderTokens("Kaisa tuleb Tartust täna õhtul.");
    expect(orderFaces(tokens, new Set(["Kaisa", "Tartust"]))).toEqual(["kaisa", "tuleb", "Tartust", "täna", "õhtul", "."]);
    expect(orderFaces(tokens, new Set())).toEqual(tokens);
  });

  it("lists the words that open sentences", () => {
    expect(sentenceStarters(CAKE)).toEqual(["Kas", "Muidugi"]);
    expect(sentenceStarters("Tere. Mis sul viga on? Ei tea.")).toEqual(["Tere", "Mis", "Ei"]);
  });
});

describe("readBuiltOrder", () => {
  it("is right when the words and the marks are where the writer had them", () => {
    expect(buildIsRight(readBuiltOrder(orderTokens(PHONE), PHONE, []))).toBe(true);
    expect(buildIsRight(readBuiltOrder(orderTokens(CAKE).map((t) => t.toLowerCase()), CAKE, []))).toBe(true);
  });

  it("is not right when a mark is missing or in the wrong place, though the words are", () => {
    const noComma = orderTokens(PHONE).filter((t) => t !== ",");
    const verdict = readBuiltOrder(noComma, PHONE, []);
    expect(verdict.reading).toBe("exact");
    expect(verdict.punctuationRight).toBe(false);
    expect(buildIsRight(verdict)).toBe(false);

    const early = ["Pean", ",", "uue", "telefoni", "ostma", "kuna", "vana", "läks", "katki", "."];
    expect(buildIsRight(readBuiltOrder(early, PHONE, []))).toBe(false);
  });

  it("is not right when the words are in another order", () => {
    const swapped = ["Pean", "ostma", "uue", "telefoni", ",", "kuna", "vana", "läks", "katki", "."];
    const verdict = readBuiltOrder(swapped, PHONE, []);
    expect(verdict.reading).toBe("wrong");
    expect(buildIsRight(verdict)).toBe(false);
  });

  it("holds the marks where they fall when the order is an allowed alternative", () => {
    const original = "Ta pani raamatu ära.";
    const also = ["Ta pani ära raamatu"];
    const built = ["Ta", "pani", "ära", "raamatu", "."];
    const verdict = readBuiltOrder(built, original, also);
    expect(verdict.reading).toBe("variant");
    expect(buildIsRight(verdict)).toBe(true);
    expect(buildIsRight(readBuiltOrder(["Ta", ".", "pani", "ära", "raamatu"], original, also))).toBe(false);
  });
});
