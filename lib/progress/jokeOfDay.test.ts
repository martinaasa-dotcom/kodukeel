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

const { jokesToday, JOKES_ON_THE_CARD } = await import("./jokeOfDay");

describe("the joke of the day", () => {
  it("is drawn with plain words when the dictionary will not answer, and asks again next time", async () => {
    annotate.mockRejectedValueOnce(new Error("the database is having a bad minute"));
    const plain = await jokesToday("2026-10-14");
    expect(plain).toHaveLength(JOKES_ON_THE_CARD);
    const tokens = plain.flat().flatMap((line) => line.tokens);
    expect(tokens.filter((t) => t.word).length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.lemma === null)).toBe(true);

    annotate.mockImplementationOnce(async (texts: string[]) =>
      texts.map((text) => ({ tokens: [{ text, word: true, lemma: "nali" }], covered: 1 })));
    const linked = await jokesToday("2026-10-14");
    expect(annotate).toHaveBeenCalledTimes(2);
    expect(linked.flat().every((line) => line.tokens[0]!.lemma === "nali")).toBe(true);

    // Once it has answered, the day is remembered and not asked again.
    await jokesToday("2026-10-14");
    expect(annotate).toHaveBeenCalledTimes(2);
  });

  it("carries who says each line, in both languages, and the voice it is read in", async () => {
    annotate.mockImplementation(async (texts: string[]) =>
      texts.map((text) => ({ tokens: [{ text, word: true, lemma: null }], covered: 0 })));
    const jokes = await jokesToday("2026-10-15");
    const lines = jokes.flat();
    const juku = lines.find((line) => line.by === "Juku");
    expect(juku?.voice).toBe("tambet");
    for (const line of lines) {
      expect(line.by === null).toBe(line.byEn === null);
      if (line.by === null) expect(line.voice).toBeNull();
    }
  });
});
