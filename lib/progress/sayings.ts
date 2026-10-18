import { prisma } from "@/lib/db";
import { parseExamples } from "@/lib/dict/examples";
import { isVerifiedSayingUsage, sayingUsageEnglish } from "@/lib/dict/sayingUsages";
import { SAYINGS, type Saying } from "@/lib/estonian/sayings";
import { buildPlan, isPlayable, type PlayableSaying, type ResolvedSentence, type SayingsPlan } from "@/lib/games/sayings";
import { afterServing, dealSayings, servedFrom, servedValue } from "@/lib/games/sayingsDeal";
import { DICTIONARY, remember } from "@/lib/dict/facts";
import { readSetting, writeSetting, SETTING_KEYS } from "@/lib/settings/store";
import { rng, seedFrom } from "@/lib/random/seeded";

/**
 * THE SENTENCES OF ONE SITTING, READ OUT OF THE DICTIONARY.
 *
 * `lib/estonian/sayings.ts` names a sentence and the entry it is recorded
 * under; this turns that into something a screen can draw, and it is the same
 * join `lib/progress/grammarExamples.ts` makes for a grammar page and for the
 * same reasons. `en` and `lexemeId` come out of the row because a screen reads
 * `Example.en` and nothing else, and a saying whose sentence the live
 * dictionary no longer holds is dropped rather than drawn from the text in the
 * table: the file is a request against the dictionary and the dictionary is
 * the authority (ADR-005).
 *
 * A SENTENCE THE DICTIONARY NEVER KEPT is read from `prisma/data/saying-usages.json`
 * instead, where `npm run harvest:sayings` wrote down that Ekilex records it.
 * The dictionary wins when it holds the sentence, so the file's entry stops
 * mattering the day a reseed brings it in, and a screen reads the same
 * English table either way.
 *
 * ONE QUERY PER SITTING, whatever the set holds: the lemmas of every sentence
 * go into a single `findMany`. Ordered by id, because a lemma can carry two
 * entries and which of them holds the sentence is decided by looking, not by
 * what the planner returned first.
 */
export async function playableSayings(set: readonly Saying[]): Promise<PlayableSaying[]> {
  const lemmas = [...new Set(set.flatMap((s) => s.sentences.map((x) => x.lemma)))];
  if (lemmas.length === 0) return [];
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas } },
    select: { id: true, examples: true },
    orderBy: { id: "asc" },
  });
  return resolveSayings(set, rows);
}

/** The join, kept pure so it can be driven without a database. */
export function resolveSayings(
  set: readonly Saying[],
  rows: readonly { id: string; examples: string }[],
): PlayableSaying[] {
  const found = new Map<string, { id: string; en: string | null }>();
  for (const row of rows) {
    for (const ex of parseExamples(row.examples)) {
      if (!found.has(ex.et)) found.set(ex.et, { id: row.id, en: ex.en ?? null });
    }
  }
  const out: PlayableSaying[] = [];
  for (const saying of set) {
    const sentences: ResolvedSentence[] = saying.sentences.flatMap((pin): ResolvedSentence[] => {
      const hit = found.get(pin.et);
      if (hit) return [{ et: pin.et, en: hit.en, run: pin.run, lexemeId: hit.id }];
      if (isVerifiedSayingUsage(pin.lemma, pin.et)) {
        return [{ et: pin.et, en: sayingUsageEnglish(pin.et), run: pin.run, lexemeId: null }];
      }
      return [];
    });
    const [first, ...rest] = sentences;
    if (first) out.push({ saying, sentences: [first, ...rest] });
  }
  return out;
}

/**
 * Every saying this deployment can play, in teaching order.
 *
 * A fact about the shared dictionary rather than about the learner, so it is
 * held across requests like the others in `lib/dict/facts.ts` and read again
 * when the dictionary changes. It is the catalog a sitting is dealt from and
 * the one a served list is measured against, so the two cannot disagree about
 * when a pass is over.
 */
export function playableCatalogue(): Promise<PlayableSaying[]> {
  return remember("sayings-catalogue", DICTIONARY, async () =>
    (await playableSayings(SAYINGS)).filter(isPlayable));
}

/**
 * The sitting this learner is dealt now: sayings they have not been shown
 * this pass, from the front of the list, in a random five (`dealSayings`).
 *
 * The draw is seeded on the learner and on what they have been served, so a
 * reload before the round starts deals the same five, and the round that
 * follows a started one deals the next.
 */
export async function sayingsSitting(ownerId: string): Promise<SayingsPlan | null> {
  const [catalogue, stored] = await Promise.all([
    playableCatalogue(),
    readSetting(ownerId, SETTING_KEYS.sayingsServed),
  ]);
  const served = servedFrom(stored);
  const random = rng(seedFrom(`${ownerId}:${servedValue(served)}`));
  const ids = dealSayings(catalogue.map((p) => p.saying.id), served, random);
  const byId = new Map(catalogue.map((p) => [p.saying.id, p]));
  return buildPlan(ids.flatMap((id) => byId.get(id) ?? []), random);
}

/** Writes down that a sitting was shown. Ids the catalog does not hold are never stored. */
export async function markSayingsShown(ownerId: string, shown: readonly string[]): Promise<void> {
  const [catalogue, stored] = await Promise.all([
    playableCatalogue(),
    readSetting(ownerId, SETTING_KEYS.sayingsServed),
  ]);
  const next = afterServing(catalogue.map((p) => p.saying.id), servedFrom(stored), shown);
  const value = servedValue(next);
  if (value !== (stored ?? "")) await writeSetting(ownerId, SETTING_KEYS.sayingsServed, value);
}
