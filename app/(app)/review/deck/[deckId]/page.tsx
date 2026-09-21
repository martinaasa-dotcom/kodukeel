import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { shuffle } from "@/lib/random/shuffle";
import { leastPractisedSlot } from "@/lib/srs/mastery";
import { deckLexemeIds, deckName } from "@/lib/progress/decks";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { SuggestFix } from "@/components/SuggestFix";
import { ReviewSession } from "../../ReviewSession";
import { include, notOnLadder, withChoices } from "../../cards";

/** Cards in one round. The same twenty Flash cards asks, for the same reason. */
const ROUND = 20;

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }) {
  const ownerId = await requireUserId();
  const name = await deckName(ownerId, (await params).deckId);
  return { title: name ?? "Deck" };
}

export const dynamic = "force-dynamic";

/**
 * FLASH CARDS OVER ONE NAMED SHELF.
 *
 * A `Deck` is a label over the one review pool rather than a second one of it
 * (see `lib/progress/decks.ts`): FSRS still asks about every card through
 * `Card.ownerId` alone, so this round is `/review/common/[group]` with the
 * frequency list swapped for a learner's own shelf. Reported plainly: a
 * learner built a deck to make some words stick right away and the only
 * places it showed up were the Decks screen and a checkbox list, with no way
 * to ask a round about that shelf alone.
 *
 * `ReviewSession` renders it, `withChoices` fills it, `leastPractisedSlot`
 * decides which card of a word to ask, and every answer grades through
 * `gradeCard` like any other mode (ADR-016). Nothing here reads or writes
 * `Deck` or `DeckWord` beyond the one lookup of which lexemes are on the
 * shelf: adding a deck round does not add a second scheduler.
 *
 * Not filtered to unmastered or unmet words, the way the frequency rounds
 * are not: a shelf is something a learner comes back to, and a word already
 * mastered simply sorts to the back of a query ordered by lapses and by when
 * it is due, which is FSRS deciding rather than this file.
 */
export default async function DeckRoundPage({ params }: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const ownerId = await requireUserId();

  const name = await deckName(ownerId, deckId);
  if (!name) notFound();

  const [lexemeIds, glossSetting] = await Promise.all([
    deckLexemeIds(ownerId, deckId),
    readSetting(ownerId, SETTING_KEYS.glossLanguage),
  ]);

  const cards = lexemeIds.length === 0 ? [] : await prisma.card.findMany({
    where: {
      ownerId, suspended: false, lexemeId: { in: lexemeIds }, ...notOnLadder(ownerId),
    },
    orderBy: [{ lapses: "desc" }, { due: "asc" }, { id: "asc" }],
    take: ROUND * 8,
    include,
  });

  const picked = leastPractisedSlot(cards, new Set(lexemeIds)).slice(0, ROUND);

  if (picked.length === 0) {
    return (
      <Page title={name} lead="Asked in a different form each time, until they stick.">
        <div className="flex flex-col gap-4">
          <Empty
            title={lexemeIds.length === 0 ? "Nothing on this shelf yet" : "Nothing to ask right now"}
            body={
              lexemeIds.length === 0
                ? "Add a word to this deck from its dictionary entry, or file one you already have."
                : "Every word here is either still settling into your ladder or has no form left to ask for."
            }
            action={<ButtonLink href="/words/decks" variant="primary">Open your decks</ButtonLink>}
          />
          <SuggestFix category="BROKEN" trigger={`/review/deck/${deckId} had no cards to ask`} />
        </div>
      </Page>
    );
  }

  const gloss = glossLanguageFrom(glossSetting);
  const round = await withChoices(shuffle(picked), gloss, ownerId);

  return (
    <ReviewSession
      cards={round}
      totalCards={round.length}
      mode="type"
      title={name}
    />
  );
}
