import { prisma } from "@/lib/db";
import { parseExamples } from "@/lib/dict/examples";
import type { Saying } from "@/lib/estonian/sayings";
import type { PlayableSaying, ResolvedSentence } from "@/lib/games/sayings";

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
    const sentences: ResolvedSentence[] = saying.sentences.flatMap((pin) => {
      const hit = found.get(pin.et);
      return hit ? [{ et: pin.et, en: hit.en, run: pin.run, lexemeId: hit.id }] : [];
    });
    const [first, ...rest] = sentences;
    if (first) out.push({ saying, sentences: [first, ...rest] });
  }
  return out;
}
