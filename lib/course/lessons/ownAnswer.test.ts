import { describe, expect, it } from "vitest";

import { personal, sayableName } from "./ownAnswer";
import { markOwnAnswer } from "./practice";

describe("an answer about yourself", () => {
  it("takes the first word of a display name, capitalized", () => {
    expect(sayableName("amanda lucas")).toBe("Amanda");
    expect(sayableName("  ")).toBeNull();
    expect(sayableName(null)).toBeNull();
    expect(sayableName("Märt")).toBe("Märt");
  });

  it("shows the model with the learner's own name in it", () => {
    expect(personal("Minu nimi on Tom.", "Amanda")).toBe("Minu nimi on Amanda.");
    expect(personal("Tom, mis su nimi on?", null)).toBe("Tom, mis su nimi on?");
    expect(personal("Меня зовут Том.", "Amanda")).toBe("Меня зовут Amanda.");
    expect(personal("Tomas is here.", "Amanda")).toBe("Tomas is here.");
  });

  it("calls any name in the stand-in's place right", () => {
    expect(markOwnAnswer("Minu nimi on Amanda", "Minu nimi on Tom.", null).verdict).toBe("right");
    expect(markOwnAnswer("minu nimi on Kristjan.", "Minu nimi on Tom.", "Amanda").verdict).toBe("right");
    expect(markOwnAnswer("Minu nimi on Amanda", "Minu nimi on Tom.", "Amanda").verdict).toBe("right");
  });

  it("still notices a missing mark elsewhere in the line", () => {
    expect(markOwnAnswer("Tere! Vaga meeldiv! Mina olen Amanda.", "Tere! Väga meeldiv! Mina olen Tom.", null).verdict).toBe("nearly");
  });

  it("does not open a slot the model has no stand-in in", () => {
    expect(markOwnAnswer("Ei, ma olen ameeriklane", "Ei, ma olen inglane.", "Amanda").verdict).toBe("wrong");
  });
});
