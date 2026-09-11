import { requireUserId } from "@/lib/auth/session";
import { listDecks } from "@/lib/progress/decks";
import { Page } from "@/components/ui";
import { DecksClient } from "./DecksClient";

export const metadata = { title: "Decks" };

export const dynamic = "force-dynamic";

/**
 * A LEARNER'S OWN SHELVES.
 *
 * `Deck` and `DeckWord` are a label over the one review pool, not a second
 * one of it: FSRS still asks about every card through `Card.ownerId` alone,
 * so nothing here can change what is due or how a word is scored. See
 * lib/progress/decks.ts.
 *
 * Reached from `/words`, which is where "add words" already lives, and no
 * `within` of its own in `lib/ux/nav.ts` for the reason `/words/mastery`
 * gives about itself: `/words` is one level in already, so a second `within`
 * on top of it is a signpost nothing lists.
 */
export default async function DecksPage() {
  const ownerId = await requireUserId();
  const decks = await listDecks(ownerId);

  return (
    <Page
      title="Decks"
      lead="Name a shelf, and choose it when you add a word that belongs there."
    >
      <DecksClient decks={decks} />
    </Page>
  );
}
