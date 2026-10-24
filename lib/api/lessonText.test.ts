import { describe, expect, it } from "vitest";

import { translationsOf } from "./lessonText";

describe("translationsOf", () => {
  const table: Record<string, string> = { "Thank you!": "Спасибо!", "yes": "да" };
  const translate = (s: string) => table[s] ?? s;

  it("names every line a translation exists for, however deep, and nothing else", () => {
    const lesson = { title: "Thank you!", conversation: [{ who: "Mari", et: "Aitäh!", en: "Thank you!" }], teaches: [{ et: "jah", en: "yes" }] };
    expect(translationsOf([lesson], translate)).toEqual({ "Thank you!": "Спасибо!", "yes": "да" });
  });

  it("leaves the lesson as it was handed in", () => {
    const lesson = { title: "Thank you!" };
    translationsOf([lesson], translate);
    expect(lesson).toEqual({ title: "Thank you!" });
  });

  it("is empty where nothing translates, which is English", () => {
    expect(translationsOf([{ title: "Thank you!" }], (s) => s)).toEqual({});
  });
});
