import { prisma } from "@/lib/db";
import { FACTS_TTL_MS, remember } from "@/lib/dict/facts";
import { neighbourIndex, type NeighbourIndex } from "@/lib/questions/neighbours";

/**
 * Which entries share a sense, for a production card answered with a second
 * right word rather than the one it asked for.
 *
 * A fact about the shared dictionary, cached through `facts.ts` like the rest,
 * and kept in a file of its own rather than inside that one: the card builder
 * and the deck read `facts.ts`, and the sense relation underneath this may
 * only ever be read to accept, never on the side that builds a card. See
 * `lib/questions/neighbours.ts` and `lib/dict/synonyms.ts`.
 */
export function neighbours(): Promise<NeighbourIndex> {
  return remember("neighbours", FACTS_TTL_MS, async () => {
    const rows = await prisma.lexeme.findMany({
      select: { id: true, lemma: true, pos: true, translation: true, cefr: true },
    });
    return neighbourIndex(rows.map((r) => ({
      id: r.id, lemma: r.lemma, pos: r.pos, gloss: r.translation, graded: r.cefr !== null,
    })));
  });
}
