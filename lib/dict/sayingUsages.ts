import USAGES from "@/prisma/data/saying-usages.json";
import { englishFor } from "@/lib/dict/exampleEnglish";

/**
 * THE SENTENCES A SAYING NEEDS THAT THE DICTIONARY NEVER KEPT.
 *
 * The harvest keeps four usages per word, chosen for teaching that word, and
 * that is the right rule for a card and the wrong one for `mine metsa`. Ekilex
 * files "go away, I don't believe you" under the fourteenth sense of `minema`,
 * and the four a headword like that keeps are `Poisid läksid kinno.` and its
 * neighbors, so the two sentences that are the whole reason the Väljendid
 * round exists were on Ekilex's page and in nobody's dictionary.
 *
 * So `prisma/data/saying-usages.json` holds the few that are missing, and it
 * is built the way nothing else here is: by checking, never by collecting.
 * `npm run harvest:sayings` takes each sentence `lib/estonian/sayings.ts`
 * pins, asks Ekilex whether the entry it names records exactly that sentence,
 * and writes down the ones it does. Nothing is written for a sentence Ekilex
 * does not return, nothing is written when Ekilex does not answer, and the
 * file is rebuilt from the pins on every run, so it cannot hold a sentence
 * that no saying uses. It is a statement that somebody checked, not a second
 * dictionary, and `sayingUsages.test.ts` fails on any entry that is also in
 * the real one, which is the day it should be deleted.
 *
 * ADR-005 is untouched. Every character here is a lexicographer's, named by
 * the entry it is recorded under; the English beside it is the same
 * sentence-keyed table every other screen reads, built by
 * `npm run translate:examples`.
 *
 * Pure: no React, no Prisma, no network.
 */
const TABLE: Readonly<Record<string, readonly string[]>> = USAGES;

/** The verified sentences recorded under one entry. */
export function sayingUsagesFor(lemma: string): readonly string[] {
  return TABLE[lemma] ?? [];
}

/** Every one, with the entry it is recorded under. */
export function allSayingUsages(): { lemma: string; et: string }[] {
  return Object.entries(TABLE).flatMap(([lemma, list]) => list.map((et) => ({ lemma, et })));
}

/** Whether Ekilex was seen to record this sentence under this entry. */
export function isVerifiedSayingUsage(lemma: string, et: string): boolean {
  return sayingUsagesFor(lemma).includes(et);
}

/** What the sentence means, from the same table every other screen reads. */
export function sayingUsageEnglish(et: string): string | null {
  return englishFor(et);
}
