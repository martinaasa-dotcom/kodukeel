import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { soundKey } from "@/lib/estonian/sounds";
import { nearbyEntries, type NearbyEntry } from "./nearby";

/**
 * A WORD SAID INTO THE DICTIONARY FINDS ITS ENTRY (docs/41-fifth-batch.md, VB-9).
 *
 * The dictionary's microphone sends what was heard into the search exactly as
 * typed text, so a spoken search and a typed one of the same spelling are one
 * search. What a listener gets wrong is what `soundKey` folds: a lenis stop
 * written as a fortis one and a long sound written short. These tests take the
 * course's own headwords, write each the way somebody who only heard it might
 * (the folds applied mechanically, never a spelling typed here), and ask the
 * dead end whether the intended entry is what it offers.
 */

const ENTRIES: NearbyEntry[] = HARVESTED.map((w) => ({ lemma: w.lemma, translation: w.gloss, pos: w.pos, cefr: w.cefr ?? null }));
const LEMMAS = new Set(ENTRIES.map((e) => e.lemma.toLocaleLowerCase("et")));

/** The spelling of somebody who heard the word and did not see it: devoiced stops, no long sounds. */
function asAListenerWrites(lemma: string): string {
  let out = "";
  for (const ch of lemma.toLocaleLowerCase("et")) {
    const plain = ({ b: "p", d: "t", g: "k" } as Record<string, string>)[ch] ?? ch;
    if (out.endsWith(plain)) continue;
    out += plain;
  }
  return out;
}

/** Course headwords a listener could misspell: one word, long enough, and the misspelling is not itself a word. */
const MISHEARD = ENTRIES
  .map((e) => ({ lemma: e.lemma, heard: asAListenerWrites(e.lemma) }))
  .filter(({ lemma, heard }) => /^[a-zõäöüšž]{4,}$/.test(lemma) && heard !== lemma && !LEMMAS.has(heard));

describe("a spelling heard rather than read", () => {
  it("has misheard spellings to try", () => {
    expect(MISHEARD.length).toBeGreaterThan(100);
  });

  it("offers the intended entry for every one, or answers it as the English word it also spells", () => {
    const missed = MISHEARD.filter(({ lemma, heard }) => {
      const offered = nearbyEntries(heard, ENTRIES);
      if (offered.some((n) => n.lemma === lemma)) return false;
      // `home`, `like` and `sit` are English words before they are anything misheard,
      // and the dictionary answers them as English, spoken or typed alike.
      return !offered.some((n) => n.why === "english");
    });
    expect(missed.map((m) => `${m.heard} for ${m.lemma}`)).toEqual([]);
  });

  it("offers it first wherever no other entry sounds the same", () => {
    let asked = 0;
    for (const { lemma, heard } of MISHEARD) {
      const alike = ENTRIES.filter((e) => soundKey(e.lemma) === soundKey(lemma)).length;
      if (alike > 1) continue;
      if (nearbyEntries(heard, ENTRIES).some((n) => n.why === "english")) continue;
      asked++;
      expect(nearbyEntries(heard, ENTRIES)[0]?.lemma).toBe(lemma);
    }
    expect(asked).toBeGreaterThan(100);
  });
});
