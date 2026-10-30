import { prisma } from "@/lib/db";
import { isShared, mayRemove, type EntryOwnership } from "@/lib/dict/shared";
import { wordAwaitingReview } from "@/lib/suggestions/shareWord";

/**
 * TAKING A WORD SOMEBODY TYPED BACK OUT OF THE DICTIONARY.
 *
 * The add-a-word form writes a row, and a row with a typo in its headword had
 * no way out: correcting the spelling is an edit, but a word that should never
 * have been added at all (a misspelling of a word the dictionary already
 * holds, a form typed as though it were a headword) could only be corrected
 * into something else. So there is a removal, and it is drawn narrowly.
 *
 * **Never a word a source supplied.** A `SEED` or `EKILEX` row is the
 * Institute's or the built dictionary's, and a reseed would put it straight
 * back; a fault in one of those is a report, which is what the entry's own
 * "something wrong here?" is for.
 *
 * **A reviewer may take out any word somebody typed**, passed or not, because
 * a word in front of every learner that is not a word is exactly the thing the
 * review queue exists to stop, and the queue cannot stop what it already let
 * through.
 *
 * **A learner may take out their own word while it is still theirs alone**:
 * nobody has passed it, and nobody else holds a card for it. Once either is
 * true it is other people's too, and a press on one account may not empty a
 * stranger's deck.
 *
 * What goes with the row is what the schema cascades: its forms, every card
 * built from it in every deck, its stars and its place in any named deck, and
 * the deferrals pointing at it by a plain column. **What stays is the review
 * log**, which has no foreign key to `Card` precisely so that removing a card
 * cannot take its history with it (`Review` is append-only), and the reports
 * about the word, which outlive it for the reason `Suggestion.lexemeId` says.
 * And what is not touched at all is any other entry: `kogunud` typed in as a
 * headword is a row of its own, while the participle of `koguma` spelled the
 * same way is a form under `koguma` that a lexicographer recorded, and a
 * removal by id cannot reach it.
 */


async function othersHold(lexemeId: string, ownerId: string): Promise<boolean> {
  const card = await prisma.card.findFirst({
    where: { lexemeId, ownerId: { not: ownerId } },
    select: { id: true },
  });
  return card !== null;
}

/** What the entry page says about who a word belongs to, for the one learner looking. */
export async function entryOwnership(ownerId: string, reviewer: boolean, lexemeId: string): Promise<EntryOwnership | null> {
  const row = await prisma.lexeme.findUnique({
    where: { id: lexemeId },
    select: { lemma: true, pos: true, provenance: true, approvedAt: true, editedBy: true },
  });
  if (!row) return null;
  const shared = isShared(row);
  const typed = row.provenance !== "SEED" && row.provenance !== "EKILEX";
  const mine = typed && row.editedBy === ownerId;
  // Only a typed word can be removed or waiting, so a seeded entry, which is
  // nearly every entry anybody opens, costs nothing past the read above.
  if (!typed) return { mine: false, shared, awaiting: false, removable: false };
  const [held, awaiting] = await Promise.all([
    reviewer ? Promise.resolve(false) : othersHold(lexemeId, ownerId),
    mine && !shared ? wordAwaitingReview(ownerId, row.lemma, row.pos) : Promise.resolve(false),
  ]);
  return { mine, shared, awaiting, removable: mayRemove(row, ownerId, reviewer, held) };
}

export type RemoveOutcome =
  | { ok: true; lemma: string; cards: number; learners: number }
  | { ok: false; error: string };

/** Takes the word out, if `mayRemove` lets this learner. The owner is resolved by the caller. */
export async function removeWord(ownerId: string, reviewer: boolean, lexemeId: string): Promise<RemoveOutcome> {
  const row = lexemeId
    ? await prisma.lexeme.findUnique({
        where: { id: lexemeId },
        select: { id: true, lemma: true, provenance: true, approvedAt: true, editedBy: true },
      })
    : null;
  if (!row) return { ok: false, error: "That word isn't in the dictionary any more." };
  if (row.provenance === "SEED" || row.provenance === "EKILEX") {
    return { ok: false, error: "That word comes from the dictionary's own sources, so it can't be removed here. Report what's wrong with it instead." };
  }
  const held = reviewer ? false : await othersHold(row.id, ownerId);
  if (!mayRemove(row, ownerId, reviewer, held)) {
    return { ok: false, error: "Only a reviewer can remove that word, because other learners have it too." };
  }

  return prisma.$transaction(async (tx) => {
    const holders = await tx.card.groupBy({ by: ["ownerId"], where: { lexemeId: row.id }, _count: { _all: true } });
    // The one table that points at a word by a plain column and means it as
    // the word's own state rather than as history.
    await tx.deferral.deleteMany({ where: { lexemeId: row.id } });
    // Forms, cards, stars and named-deck places cascade. Reviews and reports do not.
    await tx.lexeme.delete({ where: { id: row.id } });
    return {
      ok: true as const,
      lemma: row.lemma,
      cards: holders.reduce((sum, h) => sum + h._count._all, 0),
      learners: holders.length,
    };
  });
}
