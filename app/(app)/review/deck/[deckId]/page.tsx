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
import { BeforeYouStart } from "@/components/round/Briefing";
import { include, withChoices } from "../../cards";
import { meetingFirst } from "@/lib/srs/reviewQueue";

/**
 * Words in one round, which is every word on the shelf up to a ceiling nobody
 * reaches by filing words one at a time.
 *
 * It was twenty, the Flash cards figure, and a round also left out every word
 * not yet met on the Learn ladder, so a learner with 47 words on a shelf they
 * had built to practise was handed one card. Reported in those words. A shelf
 * is the learner saying "these, now", so the round is the shelf.
 */
const ROUND = 200;

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
 * Not filtered to unmastered or unmet words: a shelf is something a learner
 * comes back to, and every word on it is in the round. A word not yet met is
 * asked through `meetingFirst`, the scanned page's rule: its own recognition
 * card comes in and the session introduces it as a first meeting, and its
 * case and conjugation cards wait until it has left the ladder, so no word is
 * first seen as a form of itself. The deck round used to ask `notOnLadder`,
 * which withholds the word entirely, and a shelf filed straight from the
 * dictionary came back as one card out of forty-seven.
 *
 * The read has no `take`: it is one learner's cards for the words on one
 * shelf, bounded by the shelf, and a count cap over cards ordered by lapses
 * spent itself on the words with the most case cards and left others with no
 * representative at all.
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
      ownerId, suspended: false, lexemeId: { in: lexemeIds }, ...meetingFirst(ownerId),
    },
    orderBy: [{ lapses: "desc" }, { due: "asc" }, { id: "asc" }],
    include,
  });

  const picked = shuffle(leastPractisedSlot(cards, new Set(lexemeIds))).slice(0, ROUND);

  if (picked.length === 0) {
    /*
      Every word on the shelf is in the round now, met or not, so an empty
      round is a shelf with nothing on it or one whose every card was put on
      hold on My words. The second is not broken and says so.
    */
    return (
      <Page title={name} lead="Every word on this shelf, asked until it sticks.">
        <div className="flex flex-col gap-4">
          <Empty
            title={lexemeIds.length === 0 ? "Nothing on this shelf yet" : "Nothing to ask right now"}
            body={
              lexemeIds.length === 0
                ? "Add a word to this deck from its dictionary entry, or file one you already have."
                : "Every card for these words is on hold. Bring them back from My words."
            }
            action={<ButtonLink href="/words/decks" variant="primary">Open your decks</ButtonLink>}
          />
          {lexemeIds.length > 0 && (
            <SuggestFix category="BROKEN" trigger={`/review/deck/${deckId} had no cards to ask`} />
          )}
        </div>
      </Page>
    );
  }

  const gloss = glossLanguageFrom(glossSetting);
  const round = await withChoices(picked, gloss, ownerId);

  return (
    <BeforeYouStart id="deck" ready={round.length > 0} count={{ n: round.length, noun: "card" }}>
      <ReviewSession
        cards={round}
        totalCards={round.length}
        mode="type"
        title={name}
      />
    </BeforeYouStart>
  );
}
