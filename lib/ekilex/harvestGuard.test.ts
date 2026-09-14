import { describe, expect, it } from "vitest";

import { mergeHarvest, refusesKey, rowKey } from "./harvestGuard";

const row = (lemma: string, pos = "NOUN", tag = "old") => ({ lemma, pos, tag });

describe("refusesKey", () => {
  it("reads a withdrawn key off the two statuses that mean it", () => {
    expect(refusesKey(401)).toBe(true);
    expect(refusesKey(403)).toBe(true);
  });
  it("never reads a missing word or a bad minute as a refusal", () => {
    for (const status of [200, 404, 429, 500, 503]) expect(refusesKey(status)).toBe(false);
  });
});

describe("mergeHarvest", () => {
  const existing = [row("auto"), row("kool"), row("nõustuma", "VERB"), row("sobima", "VERB")];

  it("replaces the rows it asked for and keeps every other row as it was", () => {
    const requested = new Set(["nõustuma|VERB", "sobima|VERB", "nõus|ADVERB"]);
    const fresh = [row("sobima", "VERB", "new"), row("nõus", "ADVERB", "new"), row("nõustuma", "VERB", "new")];
    const merged = mergeHarvest(existing, fresh, requested);
    expect(merged.map(rowKey)).toEqual(["auto|NOUN", "kool|NOUN", "nõus|ADVERB", "nõustuma|VERB", "sobima|VERB"]);
    expect(merged.filter((r) => r.tag === "old").map((r) => r.lemma)).toEqual(["auto", "kool"]);
  });

  it("drops a requested word Ekilex no longer answers for, rather than keeping the stale row", () => {
    const merged = mergeHarvest(existing, [row("sobima", "VERB", "new")], new Set(["sobima|VERB", "nõustuma|VERB"]));
    expect(merged.map(rowKey)).toEqual(["auto|NOUN", "kool|NOUN", "sobima|VERB"]);
  });

  it("keeps the other part of speech of a lemma, since the key is lemma and pos", () => {
    const both = [row("hall", "NOUN"), row("hall", "ADJECTIVE")];
    const merged = mergeHarvest(both, [row("hall", "ADJECTIVE", "new")], new Set(["hall|ADJECTIVE"]));
    expect(merged.map((r) => `${r.pos}:${r.tag}`).sort()).toEqual(["ADJECTIVE:new", "NOUN:old"]);
  });

  it("leaves the file in the full run's own order", () => {
    const merged = mergeHarvest([row("õun"), row("aeg")], [row("maja", "NOUN", "new")], new Set(["maja|NOUN"]));
    expect(merged.map((r) => r.lemma)).toEqual(["aeg", "maja", "õun"]);
  });
});
