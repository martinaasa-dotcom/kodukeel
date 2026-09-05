/**
 * The substitution relation, over the dictionary this app actually ships.
 *
 * A unit test with three invented entries would say the grouping works and
 * nothing about whether it is any good, and "exhaustively and correctly" is
 * the whole requirement here. So this reads `prisma/data/expanded.json` and
 * the course harvest, which is what the seed loads, and checks the shape of
 * the answer as well as the mechanism.
 */
import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import expanded from "@/prisma/data/expanded.json";
import { sensesOf, substitutesFrom, type Glossed } from "./synonyms";

const SHIPPED: Glossed[] = [
  ...(expanded as { lemma: string; pos: string; translation: string }[])
    .filter((e) => e.translation)
    .map((e) => ({ lemma: e.lemma, pos: e.pos, gloss: e.translation })),
  ...HARVESTED.map((h) => ({ lemma: h.lemma, pos: h.pos, gloss: h.gloss })),
];

const RELATION = substitutesFrom(SHIPPED);

describe("the senses of a gloss", () => {
  it("splits a list and drops what qualifies a sense rather than being one", () => {
    expect(sensesOf("shop, store").map((s) => s.of)).toEqual(["shop", "store"]);
    expect(sensesOf("character (a person's)")).toEqual([{ of: "character", narrowedTo: "a person's" }]);
  });

  /*
    A verb's gloss is written with the infinitive marker and a noun's is not,
    so leaving it on would file "to help" and "help" as two senses and never
    match a verb against a verb.
  */
  it("reads a verb by what it means rather than by its marker", () => {
    expect(sensesOf("to greet")).toEqual([{ of: "greet" }]);
  });
});

describe("which words stand in for which", () => {
  it("is symmetric, and never makes a word its own substitute", () => {
    for (const [lemma, others] of RELATION) {
      expect(others, lemma).not.toContain(lemma);
      for (const other of others) {
        expect(RELATION.get(other), `${lemma} stands in for ${other}, but not the other way`)
          .toContain(lemma);
      }
    }
  });

  /*
    THE PART OF SPEECH IS PART OF THE SENSE. A noun meaning "help" and a verb
    meaning "to help" are the pair `lib/collections/senses.ts` measured and
    refused, and the same reasoning holds here: they are not two ways of
    saying one thing, they are two things.
  */
  it("never matches a noun against a verb", () => {
    const pos = new Map<string, Set<string>>();
    for (const entry of SHIPPED) {
      let held = pos.get(entry.lemma);
      if (!held) {
        held = new Set<string>();
        pos.set(entry.lemma, held);
      }
      held.add(entry.pos);
    }
    for (const [lemma, others] of RELATION) {
      const mine = pos.get(lemma)!;
      for (const other of others) {
        const theirs = pos.get(other)!;
        expect([...theirs].some((p) => mine.has(p)), `${lemma} and ${other}`).toBe(true);
      }
    }
  });

  /*
    And it actually reaches the words the scenes are built out of. The
    relation existing is not the claim; the claim is that a learner who knows
    a second word for a shop, a doctor or a room is understood, and those are
    the words a beginner's scene names.
  */
  it("reaches the everyday words a scene is built out of", () => {
    for (const lemma of ["pood", "arst", "tuba"]) {
      expect(RELATION.get(lemma)?.length ?? 0, lemma).toBeGreaterThan(0);
    }
  });

  /*
    A FLOOR ON HOW MUCH OF THE COURSE IT REACHES, because a relation that
    quietly stopped grouping would pass every check above by being empty. The
    figure when this was written was 508 of the course's 1,448 words; the
    floor is under it, so an ordinary edit to a gloss does not fail the suite
    and a derivation that broke does.
  */
  it("covers a large share of the course rather than a handful of words", () => {
    const course = new Set(HARVESTED.map((h) => h.lemma));
    const reached = [...RELATION.keys()].filter((lemma) => course.has(lemma));
    expect(reached.length).toBeGreaterThan(400);
  });

  /*
    A QUALIFIER IS A DISTINCTION SOMEBODY DREW ON PURPOSE. The course writes
    "bread (dark)" against "bread (white)" precisely because one English word
    covers two Estonian ones, and grouping on the bare sense would hand a
    scene back the pair its author had separated.
  */
  it("keeps apart the words the course went to the trouble of telling apart", () => {
    const pairs = substitutesFrom([
      { lemma: "leib", pos: "NOUN", gloss: "bread (dark)" },
      { lemma: "sai", pos: "NOUN", gloss: "bread (white)" },
      { lemma: "pood", pos: "NOUN", gloss: "shop" },
      { lemma: "kauplus", pos: "NOUN", gloss: "shop (any size)" },
    ]);
    expect(pairs.get("leib") ?? []).not.toContain("sai");
    // One qualifier and none is a note on one word, not a line drawn between two.
    expect(pairs.get("pood") ?? []).toContain("kauplus");
  });

  it("holds no Estonian of its own: every word in it is one the dictionary has", () => {
    const known = new Set(SHIPPED.map((e) => e.lemma));
    for (const [lemma, others] of RELATION) {
      expect(known.has(lemma)).toBe(true);
      for (const other of others) expect(known.has(other), other).toBe(true);
    }
  });
});
