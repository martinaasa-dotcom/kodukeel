import { describe, expect, it } from "vitest";
import { shippedDictionary } from "../../scripts/lib/dictionary";
import {
  KIND_ORDER, TWIN_GROUPS, guessable, letterRuns, mayStandIn, twinGroup, twinLemmas, twinTyped,
} from "./twins";

const SHIPPED = new Set(shippedDictionary().map((e) => `${e.lemma}|${e.pos}`));

describe("the twins table", () => {
  it("names only words the shipped dictionary holds, under the part of speech it names", () => {
    const missing = twinLemmas().filter((w) => !SHIPPED.has(`${w.lemma}|${w.pos}`));
    expect(missing).toEqual([]);
    expect(twinLemmas().length).toBeGreaterThan(120);
  });

  it("gives every group at least two words and a unique slug", () => {
    const ids = TWIN_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of TWIN_GROUPS) {
      expect(g.words.length, g.id).toBeGreaterThanOrEqual(2);
      expect(new Set(g.words.map((w) => w.lemma)).size, g.id).toBe(g.words.length);
    }
  });

  it("writes no Estonian in any line of English", () => {
    for (const g of TWIN_GROUPS) {
      for (const line of [g.tell ?? "", ...g.words.map((w) => w.means)]) {
        expect(/[õäöüšž]/i.test(line), `${g.id}: ${line}`).toBe(false);
        for (const w of g.words) expect(line.includes(w.lemma), `${g.id} names ${w.lemma}`).toBe(false);
      }
    }
  });

  it("names an overlap only between two words of the same group", () => {
    let pairs = 0;
    for (const g of TWIN_GROUPS) {
      const inGroup = new Set(g.words.map((w) => w.lemma));
      for (const { words: [x, y] } of g.overlap ?? []) {
        pairs += 1;
        expect(inGroup.has(x) && inGroup.has(y), `${g.id}: ${x} ${y}`).toBe(true);
      }
    }
    expect(pairs).toBeGreaterThan(0);
    expect(mayStandIn("hakkama", "algama", "The concert starts at six.")).toBe(true);
    expect(mayStandIn("ostma", "otsima", "I bought a car.")).toBe(false);
    // Both are "to arrive", and only one is "to afford".
    expect(mayStandIn("jõudma", "saabuma", "The train arrived late.")).toBe(true);
    expect(mayStandIn("jõudma", "saabuma", "People cannot afford to pay the bill.")).toBe(false);
  });

  it("has every kind, in the order the page teaches them", () => {
    for (const kind of KIND_ORDER) expect(TWIN_GROUPS.some((g) => g.kind === kind), kind).toBe(true);
  });

  it("holds the pairs the learner who asked for this named", () => {
    for (const id of ["ostma-otsima", "algama-alustama-hakkama", "kuulma-kuulama", "kasvama-kasvatama", "muutma-muutuma"]) {
      expect(twinGroup(id), id).toBeDefined();
    }
  });

  it("asks the guessing question only of a pair the rule kept and that shares a root", () => {
    expect(guessable(twinGroup("muutma-muutuma")!)).toBe(true);
    expect(guessable(twinGroup("kuulma-kuulama")!)).toBe(true);
    expect(guessable(twinGroup("soovima-soovitama")!)).toBe(false);
    expect(guessable(twinGroup("nägema-vaatama")!)).toBe(false);
    expect(guessable(twinGroup("ostma-otsima")!)).toBe(false);
    expect(TWIN_GROUPS.filter(guessable).length).toBeGreaterThan(10);
  });
});

describe("naming a mix-up", () => {
  it("finds the twin somebody typed", () => {
    const hit = twinTyped("otsima", "ostma");
    expect(hit?.twin.lemma).toBe("ostma");
    expect(hit?.group.id).toBe("ostma-otsima");
    expect(twinTyped("Kuulama", " kuulma ")?.twin.lemma).toBe("kuulma");
  });

  it("says nothing for the word itself, a stranger, or a folded diacritic", () => {
    expect(twinTyped("ostma", "ostma")).toBeNull();
    expect(twinTyped("ostma", "kass")).toBeNull();
    expect(twinTyped("sööma", "looma")).toBeNull();
  });
});

describe("where two lookalikes part ways", () => {
  it("marks the letters one word does not share in place", () => {
    const runs = letterRuns("otsima", "ostma");
    expect(runs.map((r) => r.text).join("")).toBe("otsima");
    // Two letters of six part ways, and the i is one of them whichever way the
    // shared four are lined up.
    const differ = runs.filter((r) => r.differs).map((r) => r.text).join("");
    expect(differ).toHaveLength(2);
    expect(differ).toContain("i");
    expect(letterRuns("ostma", "otsima").some((r) => r.differs)).toBe(true);
  });

  it("marks nothing in a word against itself", () => {
    expect(letterRuns("kala", "kala")).toEqual([{ text: "kala", differs: false }]);
  });
});
