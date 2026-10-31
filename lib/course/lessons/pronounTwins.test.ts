import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pronounTwinsFrom, renderTwins } from "@/scripts/lib/pronounTwins";
import { shippedDictionary } from "@/scripts/lib/dictionary";
import { PRONOUN_TWINS } from "./pronounTwins";

describe("the pronoun twins", () => {
  it("are what `npx tsx scripts/build-pronoun-twins.ts` would write from the shipped dictionary", () => {
    const want = renderTwins(pronounTwinsFrom(shippedDictionary()));
    expect(readFileSync(join(process.cwd(), "lib/course/lessons/pronounTwins.ts"), "utf8")).toBe(want);
  });

  it("hold the pairs every lesson uses and never a short form that is a word of its own", () => {
    const pairs = new Set(PRONOUN_TWINS.map((t) => `${t.long}/${t.short}`));
    for (const pair of ["mina/ma", "sina/sa", "tema/ta", "meie/me", "teie/te", "nemad/nad", "minul/mul", "minule/mulle"]) {
      expect(pairs.has(pair), pair).toBe(true);
    }
    expect(PRONOUN_TWINS.some((t) => t.short === "must" || t.short === "taga")).toBe(false);
  });
});
