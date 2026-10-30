import { prisma } from "@/lib/db";
import { isShared } from "@/lib/dict/shared";
import { deferWord, undoDeferral } from "@/lib/progress/deferrals";
import { courseLevelFor } from "@/lib/progress/level";
import { setDecksForWord } from "@/lib/progress/decks";
import { CARD_TYPES, type CardType } from "@/lib/srs/cards";
import { addCardsFor } from "@/lib/srs/deck";
import { CARD_SOURCES, DEFAULT_SOURCE } from "@/lib/srs/sources";

/**
 * KEEPING A WORD, STARRING IT, PUTTING IT ASIDE AND BRINGING IT BACK, FOR
 * EITHER DOOR.
 *
 * The bodies of `addToDeck`, `toggleStar`, `putWordAside` and `bringWordBack`
 * in app/actions.ts, which `POST` and `DELETE /api/v1/deck` call too (D2 in
 * docs/44-sixth-batch.md). Each takes the owner as a parameter, which is why
 * it lives here rather than in the `"use server"` file. What stays in the
 * actions is what only a browser needs: refreshing the pages that count the
 * deck, and the allowance a press is charged against.
 *
 * Every other argument arrives off the wire on both doors, so each is read as
 * `unknown` and checked here once.
 */

const KNOWN_TYPES = new Set<string>(CARD_TYPES.map((t) => t.type));
const KNOWN_SOURCES = new Set<string>(CARD_SOURCES);

function idOf(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 64) : "";
}

/**
 * Whether this learner may act on a dictionary entry at all.
 *
 * A seeded or Ekilex word is everybody's. A word a learner typed is theirs
 * until a reviewer passes it, and a stranger's only once it is in the
 * stranger's own deck, which is the rule the entry page reads
 * (`lib/progress/dictionaryEntry.ts`). Building cards, starring or putting a
 * word aside by id was a way round it: a card built that way made the entry
 * show it, so a typed word reached a learner it was hidden from.
 */
export async function wordReaches(ownerId: string, id: string): Promise<boolean> {
  if (!id) return false;
  const lex = await prisma.lexeme.findUnique({
    where: { id },
    select: { provenance: true, approvedAt: true, editedBy: true, cards: { where: { ownerId }, select: { id: true }, take: 1 } },
  });
  if (!lex) return false;
  return isShared(lex) || lex.editedBy === ownerId || lex.cards.length > 0;
}

/**
 * Add a word to the deck.
 *
 * `types` is filtered against the table that defines what a card type is and
 * deduplicated: an unbounded array of the same key was a way to make the
 * generator run a thousand times for one word.
 */
export async function keepWord(
  ownerId: string, lexemeId: unknown, types: unknown, source: unknown = "LOOKUP", deckIds?: unknown,
) {
  const id = idOf(lexemeId);
  if (!await wordReaches(ownerId, id)) return { ok: false as const, error: "That word isn't in the dictionary any more." };
  const wanted = [...new Set(Array.isArray(types) ? types : [])]
    .filter((t): t is CardType => typeof t === "string" && KNOWN_TYPES.has(t));
  const result = await addCardsFor(
    ownerId,
    id,
    wanted,
    typeof source === "string" && KNOWN_SOURCES.has(source) ? source : DEFAULT_SOURCE,
  );
  /*
    Filed under a shelf only where the caller actually offered one to choose,
    and `deckIds` says which by being present at all rather than by being
    non-empty. A screen with nothing to choose between (zero or one deck)
    never sends the argument, and a word going into a deck-less learner's
    collection stays exactly what it was before this feature existed:
    unfiled, and still fully theirs. A screen that *did* offer a choice and
    got back an empty list is a different fact, since every box was
    unticked, and `setDecksForWord` already means that as "take it off every shelf",
    which has to reach the database rather than being read as "nothing to
    do" the way the length-0 case above is.
  */
  if (result.ok && Array.isArray(deckIds)) {
    await setDecksForWord(ownerId, id, deckIds.filter((d): d is string => typeof d === "string"));
  }
  return result;
}

/**
 * Sets a star to the state the learner pressed for, rather than flipping it.
 *
 * A flip is a guess about what the button showed. A word met twice in one
 * session, recognition then production, was starred on the first card and
 * then drawn unstarred on the second from the page's own snapshot, so the
 * press meaning "keep this" deleted it. `starred` is what the press asked
 * for; a caller that sends none gets the old flip.
 */
export async function setStar(ownerId: string, lexemeId: unknown, starred?: unknown) {
  const id = idOf(lexemeId);
  if (!id) return { ok: false as const, error: "We couldn't tell which word you meant." };
  if (!await wordReaches(ownerId, id)) return { ok: false as const, error: "That word isn't in the dictionary." };

  const key = { ownerId_lexemeId: { ownerId, lexemeId: id } };
  const existing = await prisma.starredWord.findUnique({ where: key });
  const want = typeof starred === "boolean" ? starred : !existing;
  if (want && !existing) {
    // A second tab pressing at the same moment has already written it.
    await prisma.starredWord.createMany({ data: [{ ownerId, lexemeId: id }], skipDuplicates: true });
  } else if (!want && existing) {
    await prisma.starredWord.deleteMany({ where: { ownerId, lexemeId: id } });
  }
  return { ok: true as const, starred: want };
}

/**
 * "This is too complicated", from wherever the word is. `lib/srs/defer.ts`
 * decides how long and on what grounds and `lib/progress/deferrals.ts` writes
 * it. NOTHING IS GRADED: the card moves and the review log is untouched,
 * because putting a word aside is not an answer to it (ADR-016).
 */
export async function putAside(ownerId: string, lexemeId: unknown, context: unknown) {
  const id = idOf(lexemeId);
  if (!id) return { ok: false as const, error: "We couldn't tell which word you meant." };
  if (!await wordReaches(ownerId, id)) return { ok: false as const, error: "That word isn't in the dictionary." };

  // The level is read here rather than inside, so `lib/progress/deferrals.ts`
  // and `lib/progress/level.ts` stay one-way: the second calls the first when
  // a learner moves up.
  const level = await courseLevelFor(ownerId);
  const note = typeof context === "string" ? context.slice(0, 200) : "";
  const result = await deferWord(ownerId, id, level, note || null);
  if (!result.ok) return result;
  /* The span and the band ride along, so a Russian or Ukrainian screen can
     say the sentence in its own words rather than print the English note. */
  return {
    ok: true as const,
    note: result.note,
    deferral: { reason: result.deferral.reason, days: result.deferral.days, untilLevel: result.deferral.untilLevel },
  };
}

/**
 * And giving it back. What comes back is what was pushed and nothing else: a
 * card the scheduler had honestly put further out stays where the scheduler
 * put it (`lib/progress/deferrals.ts`).
 */
export async function bringBack(ownerId: string, lexemeId: unknown) {
  const id = idOf(lexemeId);
  if (!id) return { ok: false as const, error: "We couldn't tell which word you meant." };
  const done = await undoDeferral(ownerId, id);
  if (!done) return { ok: false as const, error: "That word wasn't put aside, so there's nothing to bring back." };
  return { ok: true as const };
}
