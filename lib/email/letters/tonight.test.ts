import { describe, expect, it } from "vitest";
import { tonightLetter, type TonightInput } from "./tonight";

const base = (over: Partial<TonightInput> = {}): TonightInput => ({
  name: null,
  origin: "https://example.test",
  day: {
    title: "Kodus",
    subtitle: "At home",
    part: { n: 1, of: 1 },
    canDo: "You can say where you live.",
    newWords: 5,
    steps: [
      { title: "Meet the words", minutes: 6, done: true },
      { title: "Match", minutes: 3, done: false },
    ],
  },
  theirWords: null,
  streak: 0,
  word: null,
  ...over,
});

const texts = (input: TonightInput) =>
  tonightLetter(input).blocks.flatMap((b) => ("text" in b ? [b.text] : []));

describe("the evening letter's second line", () => {
  it("says the name they asked to be called, where a person would", () => {
    expect(texts(base({ name: "Mari" }))).toContain("Mari, you are one step into Kodus. The rest is waiting where you left it.");
  });

  it("reads as it did without a name", () => {
    expect(texts(base())).toContain("You are one step into Kodus. The rest is waiting where you left it.");
  });

  it("counts steps in the plural past one", () => {
    const steps = [
      { title: "a", minutes: 1, done: true },
      { title: "b", minutes: 1, done: true },
      { title: "c", minutes: 1, done: false },
    ];
    expect(texts(base({ day: { ...base().day, steps } })).join(" ")).toContain("two steps into");
  });

  it("names them on an evening not yet started too", () => {
    const steps = [{ title: "a", minutes: 6, done: false }];
    expect(texts(base({ name: "Mari", day: { ...base().day, steps } })).join(" ")).toContain("Mari, this is Kodus, at home.");
  });
});
