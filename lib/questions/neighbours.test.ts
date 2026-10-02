import { describe, expect, it } from "vitest";
import {
  MAX_NEIGHBOURS, neighbourIndex, neighboursOf, typedNeighbour, type NeighbourEntry,
} from "./neighbours";

const entry = (id: string, lemma: string, pos: string, gloss: string, graded = true): NeighbourEntry =>
  ({ id, lemma, pos, gloss, graded });

// Glosses as the course harvest ships them (prisma/data/harvested.ts).
const ALUSTAMA = entry("a", "alustama", "VERB", "to begin (something)");
const HAKKAMA = entry("h", "hakkama", "VERB", "to begin, to start (doing)");

describe("neighboursOf", () => {
  it("finds hakkama as a second word for alustama's prompt, and the other way round", () => {
    const index = neighbourIndex([ALUSTAMA, HAKKAMA]);
    const forAlustama = neighboursOf(ALUSTAMA, index);
    expect(forAlustama.map((n) => n.lemma)).toEqual(["hakkama"]);
    const forHakkama = neighboursOf(HAKKAMA, index);
    expect(forHakkama.map((n) => n.lemma)).toEqual(["alustama"]);
  });

  it("keeps two words apart where the course drew a line between them", () => {
    const leib = entry("l", "leib", "NOUN", "bread (dark)");
    const sai = entry("s", "sai", "NOUN", "bread (white)");
    const found = neighboursOf(leib, neighbourIndex([leib, sai]));
    expect(found).toHaveLength(0);
  });

  it("never matches a noun to a verb", () => {
    const abi = entry("n", "abi", "NOUN", "help");
    const aitama = entry("v", "aitama", "VERB", "to help");
    const found = neighboursOf(aitama, neighbourIndex([abi, aitama]));
    expect(found).toHaveLength(0);
  });

  it("leaves out the card's own answers, which are not neighbours", () => {
    const index = neighbourIndex([ALUSTAMA, HAKKAMA]);
    const found = neighboursOf(ALUSTAMA, index, ["alustama", "hakkama"]);
    expect(found).toHaveLength(0);
  });

  it("puts graded words first and stops at the cap", () => {
    const many = Array.from({ length: MAX_NEIGHBOURS + 3 }, (_, i) =>
      entry(`x${i}`, `sõna${i}`, "VERB", "to begin", i === 5));
    const found = neighboursOf(ALUSTAMA, neighbourIndex([ALUSTAMA, ...many]));
    expect(found).toHaveLength(MAX_NEIGHBOURS);
    expect(found[0]!.lemma).toBe("sõna5");
  });
});

describe("typedNeighbour", () => {
  const near = [{ lemma: "hakkama" }, { lemma: "Tere hommikust!" }];

  it("recognises the word as typed, and without its punctuation or a diacritic", () => {
    expect(typedNeighbour("hakkama", near)?.lemma).toBe("hakkama");
    expect(typedNeighbour(" Hakkama ", near)?.lemma).toBe("hakkama");
    expect(typedNeighbour("tere hommikust", near)?.lemma).toBe("Tere hommikust!");
  });

  it("does not stretch to another word or to nothing", () => {
    expect(typedNeighbour("hakkan", near)).toBeNull();
    expect(typedNeighbour("", near)).toBeNull();
  });
});
