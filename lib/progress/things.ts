import { prisma } from "@/lib/db";
import { searchLexemes, vouchable } from "@/lib/dict/search";
import { englishMatch } from "@/lib/dict/english";
import { emojiFor } from "@/lib/collections/emoji";
import { orderEntries, type Thing, type ThingEntry } from "@/lib/scan/things";

/** How many entries one English name may offer: the leading one and a few to choose between. */
const ENTRIES_PER_THING = 4;

/**
 * Each English name a photo was read as, looked up on the dictionary's English
 * side (docs/41-fifth-batch.md, VB-13).
 *
 * The lookup is the search box's own (`searchLexemes`), which is what answers
 * an English query today, narrowed to the entries whose gloss names the thing
 * as one of its senses (`englishMatch`) and that the dictionary vouches for
 * (`vouchable`: never a model's suggestion, never a formless stub). What
 * comes back is the dictionary's headword and English, so nothing the model
 * wrote reaches the screen as Estonian, and a name with no such entry comes
 * back with none, to be shown in English with nothing offered.
 *
 * AN ENTRY SPELLED LIKE ANOTHER ENTRY IS NOT OFFERED. A ticked thing is saved
 * the way every scanned word is, by its spelling, and the save asks the
 * dictionary again which entry that spelling is (`vouchScanItems`, which by
 * rule believes nothing else the browser says). For `hall`, which is grey and
 * also frost, that answer could be the other word, so offering it would be
 * picking silently between two meanings at the moment the card is made. The
 * other entries of a thing stay on the screen to be chosen.
 */
export async function resolveThings(names: readonly string[]): Promise<Thing[]> {
  const found = await Promise.all(names.map((name) => searchLexemes(name, 24)));
  const ids = [...new Set(found.flat().map((hit) => hit.id))];
  const lemmas = [...new Set(found.flat().map((hit) => hit.lemma))];
  const [rows, spelled] = ids.length
    ? await Promise.all([
      prisma.lexeme.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          provenance: true,
          forms: { select: { formType: true, value: true, morphCode: true, morphName: true }, orderBy: { id: "asc" }, take: 1 },
        },
      }),
      prisma.lexeme.groupBy({ by: ["lemma"], where: { lemma: { in: lemmas }, provenance: { not: "AI" } }, _count: { _all: true } }),
    ])
    : [[], []];
  const vouched = new Set(
    rows
      .filter((row) => vouchable({ ...row, lemma: "", translation: "", pos: "", cefr: null, gradationNote: null }))
      .map((row) => row.id),
  );
  const homographs = new Set(spelled.filter((g) => g._count._all > 1).map((g) => g.lemma));

  return names.map((english, n) => {
    const seen = new Set<string>();
    const candidates: (ThingEntry & { sense: "first" | "later" })[] = [];
    for (const hit of found[n] ?? []) {
      if (!vouched.has(hit.id) || homographs.has(hit.lemma)) continue;
      const sense = englishMatch(english, hit.translation);
      if (!sense) continue;
      if (seen.has(hit.lemma)) continue;
      seen.add(hit.lemma);
      candidates.push({ lexemeId: hit.id, lemma: hit.lemma, translation: hit.translation, pos: hit.pos, cefr: hit.cefr, sense });
    }
    const entries = orderEntries(candidates).slice(0, ENTRIES_PER_THING);
    const picture = entries.map((e) => emojiFor(e.lemma)).find(Boolean) ?? null;
    return { english, picture, entries };
  });
}
