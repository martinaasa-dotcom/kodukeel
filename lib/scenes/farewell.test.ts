import { describe, expect, it } from "vitest";
import { onlyFarewell, saysFarewell, withoutGoodbye } from "./farewell";

describe("what counts as a goodbye", () => {
  it("calls a goodbye with nothing but thanks beside it bare", () => {
    for (const line of ["Nägemist!", "Head aega!", "Aitäh, head aega!", "Head aega ja aitäh teile!", "Head päeva!"]) {
      expect(onlyFarewell(line), line).toBe(true);
    }
  });

  it("does not call a goodbye with a reason, an answer or a wrap bare", () => {
    for (const line of ["Mul on kiire, ma pean tööle minema. Nägemist!", "Siin on teie pilet. Head aega!", "Palun! Head aega!", "Saage terveks! Head aega!"]) {
      expect(onlyFarewell(line), line).toBe(false);
    }
  });

  it("is not a goodbye at all where nobody is leaving", () => {
    for (const line of ["Tere!", "Mul on kiire, ma pean tööle minema.", "Aitäh."]) {
      expect(onlyFarewell(line), line).toBe(false);
      expect(saysFarewell(line), line).toBe(false);
    }
  });

  it("takes the goodbye off a closing line and keeps the reason", () => {
    expect(withoutGoodbye("Mul on kiire, ma pean tööle minema. Nägemist!")).toBe("Mul on kiire, ma pean tööle minema.");
    expect(withoutGoodbye("Väga tore, aitäh! Me anname teada. Head aega!")).toBe("Väga tore, aitäh! Me anname teada.");
    expect(withoutGoodbye("Aitäh, head aega!")).toBeNull();
    expect(withoutGoodbye("Nägemist!")).toBeNull();
  });
});
