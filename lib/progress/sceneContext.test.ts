import { describe, expect, it } from "vitest";
import { contextFromRows, type Row } from "./scene";
import { sceneById } from "@/lib/scenes/catalogue";

/*
  A GOVERNMENT NAMING A PLACE QUESTION GOVERNS THE CASES THAT ANSWER IT.
  Ekilex records `sõitma` as "kuhu (direction) · millega", and the gate held
  it to the comitative alone, withholding `Buss sõidab jaama` three times on
  the one beat that had to say where the bus goes (§70).
*/
describe("the governed words a scene's gate can see", () => {
  const row = (lemma: string, government: string): Row => ({
    id: lemma, lemma, pos: "VERB", cefr: "A1",
    parts: { INF_MA: lemma, INF_DA: lemma.replace(/ma$/, "ta"), PRES_1SG: lemma.replace(/ma$/, "n"), PAST_1SG: lemma.replace(/ma$/, "sin") },
    extraForms: [], usages: [], government, gloss: "to go",
  });

  it("add the cases a place question is answered by", () => {
    const scene = sceneById("bussipilet")!;
    const ctx = contextFromRows(scene, [
      row("sõitma", "kuhu (direction) · millega (comitative)"),
      row("elama", "kus (place)"),
      row("tulema", "kust (origin) · millega (comitative)"),
    ]);
    const cases = (lemma: string) => [...(ctx.gate.governed.find((g) => g.lemma === lemma)?.cases ?? [])].sort();
    expect(cases("sõitma")).toEqual(["ALLATIVE", "COMITATIVE", "ILLATIVE"]);
    expect(cases("tulema")).toEqual(["ABLATIVE", "COMITATIVE", "ELATIVE"]);
    /*
      A government that names a place question and no case at all is not a
      governed word to this check: `parseGovernment` has nothing to name, and
      holding `elama` to the inside pair would refuse `Ma elan koos perega`.
      The place cases widen a verb the check already reads; they never add one.
    */
    expect(cases("elama")).toEqual([]);
  });
});

/*
  "NOT MILK BUT COFFEE" IS NOT MILK. `negatedIn` refuses a word a clause says
  no about, and it knew one negator: `mitte piima, vaid kohvi` met a beat
  wanting milk, and the other side took the milk the learner had just turned
  down. `ega` is deliberately not a negator here, because `Ega sa tea, kus pood
  on?` opens a question with it and reading that as a no would refuse a turn
  that asked exactly what the beat wanted.
*/
describe("what a scene reads as a no", () => {
  const word = (lemma: string): Row => ({
    id: lemma, lemma, pos: "ADVERB", cefr: "A1", parts: {}, extraForms: [], usages: [], government: null, gloss: "not",
  });

  it("reads mitte beside ei and leaves ega alone", () => {
    const ctx = contextFromRows(sceneById("kohvikus")!, [word("ei"), word("mitte"), word("ega")]);
    expect(ctx.marker.negators.has("ei")).toBe(true);
    expect(ctx.marker.negators.has("mitte")).toBe(true);
    expect(ctx.marker.negators.has("ega")).toBe(false);
  });
});
