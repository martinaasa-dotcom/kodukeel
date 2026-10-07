/**
 * Which sentences open on an ordinary word rather than on a name.
 *
 * `tileFaces` in `lib/estonian/cloze.ts` takes the capital off a word-ordering
 * round's first tile, because a capital left on it says which tile goes first.
 * Whether it may is a question about the word, and a name keeps its capital:
 * the forms list holds no capitalised spelling by construction, so an opener
 * whose lowercase spelling it knows is an ordinary word and one it does not is
 * treated as a name. Measured over the shipped dictionary, 9,096 of the 9,441
 * capitalised openers are ordinary words; the rest are mostly first names and
 * keep their capital, which is the side to err on.
 *
 * Accept side only (ADR-005): nothing here becomes an answer or a card, it
 * decides the case of one letter on a tile the marker compares without case.
 */
import { prisma } from "@/lib/db";
import { sentenceStarters } from "@/lib/estonian/orderTiles";
import { isKnownForm } from "./forms";

/**
 * Every word that opens a sentence of these, where it is an ordinary word.
 *
 * The round that builds a sentence out of tiles takes the capital off a word
 * that only has one for standing first, and a sentence can start more than
 * once: `Kas sa tahad ka kooki? – Muidugi!` opens twice, and the second
 * opener, `Muidugi`, was the one tile in the bank still wearing its capital.
 *
 * A spelling counts as ordinary where the forms list knows its lowercase
 * form, and **does not** where the dictionary holds the capitalised spelling
 * as an entry of its own: `Eesti` is the country and `eesti` is the adjective,
 * and the forms list, which has no capitals, would otherwise lowercase the
 * name of the place. Accept side only (ADR-005).
 */
export async function ordinaryStarters(sentences: readonly string[]): Promise<Set<string>> {
  const starters = [...new Set(sentences.flatMap((s) => sentenceStarters(s)))];
  const capitalised = starters.filter((w) => (w[0] ?? "") !== (w[0] ?? "").toLowerCase());
  const named = capitalised.length === 0
    ? new Set<string>()
    : new Set((await prisma.lexeme.findMany({
        where: { lemma: { in: capitalised } },
        select: { lemma: true },
      })).map((l) => l.lemma));
  const known = await Promise.all(
    capitalised.filter((w) => !named.has(w)).map(async (w) => [w, await isKnownForm(w.toLowerCase())] as const),
  );
  return new Set(known.filter(([, ok]) => ok).map(([w]) => w));
}
