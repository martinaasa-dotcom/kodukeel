import { describe, expect, it, vi } from "vitest";

/*
  The dictionary is the one thing the joke asks a database for, so it is the
  one thing stood in for here: first it will not answer, then it does.
*/
const annotate = vi.fn();
vi.mock("@/lib/dict/headlines", async () => {
  const real = await vi.importActual<typeof import("@/lib/dict/headlines")>("@/lib/dict/headlines");
  return { ...real, annotateTexts: annotate };
});

const { jokesForThisVisit, JOKES_ON_THE_CARD } = await import("./jokeOfDay");

/** A fixed draw, so two calls can be made to land on the same jokes. */
const fixed = () => {
  let seed = 7;
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
};

describe("the joke on Today", () => {
  it("is drawn with plain words when the dictionary will not answer, and asks again next time", async () => {
    annotate.mockRejectedValueOnce(new Error("the database is having a bad minute"));
    const plain = await jokesForThisVisit({ linked: true, random: fixed() });
    expect(plain).toHaveLength(JOKES_ON_THE_CARD);
    const tokens = plain.flat().flatMap((line) => line.tokens);
    expect(tokens.filter((t) => t.word).length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.lemma === null)).toBe(true);

    annotate.mockImplementationOnce(async (texts: string[]) =>
      texts.map((text) => ({ tokens: [{ text, word: true, lemma: "nali" }], covered: 1 })));
    const linked = await jokesForThisVisit({ linked: true, random: fixed() });
    expect(annotate).toHaveBeenCalledTimes(2);
    expect(linked.flat().every((line) => line.tokens[0]!.lemma === "nali")).toBe(true);

    // Once it has answered, those jokes are remembered and not asked about again.
    await jokesForThisVisit({ linked: true, random: fixed() });
    expect(annotate).toHaveBeenCalledTimes(2);
  });

  it("does not ask the dictionary at all where the learner turned the underlines off", async () => {
    annotate.mockClear();
    const plain = await jokesForThisVisit({ linked: false });
    expect(annotate).not.toHaveBeenCalled();
    const tokens = plain.flat().flatMap((line) => line.tokens);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.lemma === null)).toBe(true);
  });

  it("is a different handful on another visit", async () => {
    const opened = new Set<string>();
    for (let visit = 0; visit < 20; visit++) {
      const [first] = await jokesForThisVisit({ linked: false });
      opened.add(first!.map((line) => line.said).join(" "));
    }
    expect(opened.size).toBeGreaterThan(1);
  });

  it("carries who says each line, in both languages, and the voice it is read in", async () => {
    annotate.mockImplementation(async (texts: string[]) =>
      texts.map((text) => ({ tokens: [{ text, word: true, lemma: null }], covered: 0 })));
    const lines: { by: string | null; byEn: string | null; voice: string | null }[] = [];
    for (let visit = 0; visit < 10; visit++) lines.push(...(await jokesForThisVisit({ linked: true })).flat());
    const juku = lines.find((line) => line.by === "Juku");
    expect(juku?.voice).toBe("tambet");
    for (const line of lines) {
      expect(line.by === null).toBe(line.byEn === null);
      if (line.by === null) expect(line.voice).toBeNull();
    }
  });
});
