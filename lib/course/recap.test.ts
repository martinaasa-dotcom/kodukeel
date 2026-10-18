import { describe, expect, it } from "vitest";
import { recapWord, recapWords } from "./recap";

describe("recapWords", () => {
  it("spells a phrase the way a card does", () => {
    expect(recapWord("Tere hommikust!")).toBe("tere hommikust");
    expect(recapWord("Head aega!")).toBe("head aega");
    expect(recapWord("Palun")).toBe("palun");
  });

  it("leaves a word and a question alone", () => {
    expect(recapWord("tere")).toBe("tere");
    expect(recapWord("aitäh")).toBe("aitäh");
    expect(recapWord("Kuidas läheb?")).toBe("kuidas läheb?");
  });

  it("says a word once when a phrase cleans down to it", () => {
    expect(recapWords(["aitäh", "Aitäh!", "Palun"])).toEqual(["aitäh", "palun"]);
  });
});
