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
import { sentenceTiles } from "@/lib/estonian/cloze";
import { isKnownForm } from "./forms";

/** The first tile of each sentence, where it is an ordinary word. */
export async function ordinaryOpeners(sentences: readonly string[]): Promise<Set<string>> {
  const openers = [...new Set(sentences.map((s) => sentenceTiles(s)[0] ?? "").filter(Boolean))];
  const known = await Promise.all(openers.map(async (w) => [w, await isKnownForm(w.toLowerCase())] as const));
  return new Set(known.filter(([, ok]) => ok).map(([w]) => w));
}
