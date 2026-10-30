import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { headwordsOfExactForm } from "@/lib/dict/forms";
import { PARALLEL_REVIEW, parallelCandidates, parallelTable, sameTexts, tableSource, textsHolding } from "@/scripts/lib/parallelForms";
import { LESSONS } from "./index";
import { estonianOf, wordsOf } from "./ledger";

/*
  THE PARALLEL FORMS THE MARKER READS AS ONE, HELD TO THE DATA THEY CAME FROM.
  `parallelForms.ts` is generated and the marker runs in the browser, so it
  cannot read the dictionary to check itself: this works the table out again
  from the harvest, the forms list and the lessons, and fails where a lesson
  now uses a word with a parallel nobody has decided about, where a decision
  names a word no lesson uses, where a kept word stands in a lesson text it
  was not read against, or where the file is not what the decisions write.
  `npx tsx scripts/build-parallel-forms.ts` says which, and `--write` writes it.
*/

describe("the parallel forms", async () => {
  const texts = LESSONS.flatMap((l) => estonianOf(l).map((e) => e.et));
  const used = new Set(texts.flatMap((t) => wordsOf(t).map((w) => w.low)));
  const candidates = await parallelCandidates(HARVESTED, used, headwordsOfExactForm);

  it("finds the ones the lessons use", () => {
    expect(candidates.map((c) => `${c.stored}/${c.parallel}`)).toContain("mune/munasid");
    expect(candidates.length).toBeGreaterThanOrEqual(8);
  });

  it("has a decision for every one, and none for a word no lesson uses", () => {
    expect(candidates.filter((c) => !PARALLEL_REVIEW[c.stored]).map((c) => c.stored)).toEqual([]);
    expect(Object.keys(PARALLEL_REVIEW).filter((stored) => !candidates.some((c) => c.stored === stored))).toEqual([]);
  });

  it("was read against every lesson text that holds a kept one", () => {
    const unread = candidates.filter((c) => PARALLEL_REVIEW[c.stored]?.keep).filter((c) => {
      const holding = [...textsHolding(texts, c.stored), ...textsHolding(texts, c.parallel)];
      return !sameTexts(PARALLEL_REVIEW[c.stored]!.read ?? [], holding);
    });
    expect(unread.map((c) => c.stored)).toEqual([]);
  });

  it("is the file the decisions write", () => {
    const file = readFileSync(path.join(process.cwd(), "lib", "course", "lessons", "parallelForms.ts"), "utf8");
    expect(file).toBe(tableSource(parallelTable(candidates, PARALLEL_REVIEW)));
  });

  it("keeps no word a lesson means as something else", () => {
    const table = parallelTable(candidates, PARALLEL_REVIEW);
    // `teid` is "you" in every lesson that says it, and `teesid` is roads.
    expect(Object.values(table)).not.toContain("teid");
    expect(Object.values(table)).not.toContain("otsi");
  });
});
