import { prisma } from "@/lib/db";
import { generateCards, type LexemeForCards } from "@/lib/srs/cards";
import { lockDeck } from "@/lib/srs/deck";
import { courseAsksFor } from "@/lib/collections/syllabus";
import { emptyScheduling } from "@/lib/srs/scheduler";
import { deferredDues } from "@/lib/progress/deferrals";

/**
 * Adds gap-fill cards to a word already in the deck, once it has sentences.
 *
 * The order things happen in makes this necessary. A unit is added to the deck
 * from the seeded dictionary, which carries no example sentences; the sentences
 * arrive later, the first time that word is actually looked up and Ekilex is
 * consulted. Without this, a learner's oldest and most-used words would be the
 * only ones that never got the best exercise the app has.
 *
 * Deliberately narrow:
 * - only for a word the learner already has cards for — it never grows the deck
 *   behind their back;
 * - only for a gap-fill the course would have asked for. A unit's `cardTypes`
 *   is its author saying what the word is worth drilling, and no A1 unit asks
 *   for a gap at all, so without this a dictionary *render* wrote an exercise
 *   into a beginner's deck that every other door in the app had refused. See
 *   `courseAsksFor`, which is also why a word the course does not teach is let
 *   through: that one is the learner's own and the gap-fill is what the
 *   dictionary's own button would have given them;
 * - only when they have no gap-fill card for it yet, so re-reading an entry
 *   cannot pile them up, which is a promise the read and the write have to be
 *   under one lock to keep: this is "is it already there" followed by an
 *   insert, and it is reached from a dictionary page *render*, so two tabs on
 *   one entry, or a prefetch on a settled pointer followed by the click, both
 *   land in the gap. `lockDeck` is the same transaction advisory lock
 *   `addCardsFor` and `addPlanToDeck` take, keyed on the learner;
 * - existing cards are never touched, so no scheduling is disturbed;
 * - and a word the learner put aside stays aside. The new card is dated where
 *   the deferral put the word, which is what `addCardsFor` and
 *   `addPlanToDeck` already do inside the same lock: without it, opening the
 *   entry for a word somebody had just called too complicated handed them a
 *   gap-fill on it the same evening (`lib/progress/deferrals.ts`).
 */
export async function backfillClozeCards(
  ownerId: string,
  lexemeId: string,
  now = new Date(),
): Promise<number> {
  const lexeme = await prisma.lexeme.findUnique({
    where: { id: lexemeId },
    include: { forms: true, cards: { where: { ownerId }, select: { cardType: true, front: true, source: true } } },
  });
  if (!lexeme || lexeme.cards.length === 0) return 0;
  if (lexeme.cards.some((c) => c.cardType === "CLOZE")) return 0;
  /* AND THE COURSE HAS TO HAVE ASKED FOR ONE. Checked before the cards are
     generated rather than after, because the question is about the word rather
     than about what the dictionary can build from it: a word whose unit wants
     no gap wants none however many sentences arrive. */
  if (!courseAsksFor(lexeme.lemma, "CLOZE")) return 0;

  const generated = generateCards(lexeme as LexemeForCards, ["CLOZE"]);
  if (generated.length === 0) return 0;

  /*
    THE CARD INHERITS THE WORD, BECAUSE IT IS NOT A NEW WORD.

    `Card.source` says whose idea a word was, and `/review/lookups` reads it to
    ask about the ones the learner went and got themselves. A gap-fill added
    here is a card for a word already in the deck, so writing a source of its
    own would move a course word into that round, or a looked-up word out of
    it, on the strength of a sentence arriving from Ekilex. The existing cards
    are read in the same query already, and they were all written together, so
    the first of them is the answer.
  */
  const source = lexeme.cards[0]?.source ?? "MANUAL";
  const scheduling = emptyScheduling(now);
  /*
    The check and the write under one lock. Reading "has it a gap-fill card
    yet" and then inserting is check-then-act, and the gap is wide enough to
    matter here because this is reached from a dictionary page *render*: a
    prefetch on a settled pointer and the click behind it are two passes over
    the same entry, as are two tabs. `addCardsFor` and `addPlanToDeck` take
    the same transaction advisory lock, keyed on the learner.
  */
  return prisma.$transaction(async (tx) => {
    await lockDeck(tx, ownerId);
    const [already, held] = await Promise.all([
      tx.card.count({ where: { ownerId, lexemeId, cardType: "CLOZE" } }),
      deferredDues(tx, ownerId, [lexemeId], now),
    ]);
    if (already > 0) return 0;
    const due = held.get(lexemeId) ?? scheduling.due;
    await tx.card.createMany({
    data: generated.map((c) => ({
      ownerId,
      lexemeId,
      cardType: c.cardType,
      front: c.front,
      back: c.back,
      hint: c.hint,
      targetCase: c.targetCase,
      slot: c.slot,
      source,
      due,
      stability: scheduling.stability,
      difficulty: scheduling.difficulty,
      state: scheduling.state,
      learningSteps: scheduling.learningSteps,
      })),
    });
    return generated.length;
  });
}
