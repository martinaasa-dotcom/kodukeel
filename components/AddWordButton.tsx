"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { addToDeck } from "@/app/actions";
import { Button } from "@/components/Button";
import { DeckChoiceList, useDeckChoice } from "@/components/DeckChoice";

/**
 * Puts one dictionary word into the deck, and asks which shelf where there is
 * one to ask about.
 *
 * The same job `AddUnitButton` does for a whole unit, and the same argument for
 * saying what actually happened rather than flashing a tick: "already in your
 * deck" and "added 2 cards" are different outcomes, and somebody who clicks
 * twice has earned the right to know which one they got.
 *
 * Recognition and production both, which is what the dictionary's own add
 * button offers by default: a word you can read and cannot say is half learned.
 *
 * THE SHELF IS ASKED ABOUT HERE BECAUSE THIS IS WHERE SOMEBODY IS BROWSING.
 *
 * This button is the word of the day on the home page and the words a
 * conversation showed the learner they were missing. Both are moments of
 * reading rather than moments inside a round, so a second press costs nothing
 * and the alternative costs the choice: with shelves named and no question
 * asked, the word landed on none of them and the screen said so nowhere. That
 * was reported on the home page, and it had been true of this button since the
 * shelves existed. A learner with no shelf of their own sees no extra step at
 * all, which is every learner until they name one.
 */
export function AddWordButton({ lexemeId, lemma, source = "LOOKUP", className, variant = "secondary" }: {
  lexemeId: string;
  /** Named in the live region, so a screen reader hears which word landed. */
  lemma: string;
  source?: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const choice = useDeckChoice(lexemeId, asking);

  /*
    The write itself, with no transition of its own: `press` already opened one
    and a second inside it would leave `pending` false while this is in flight,
    so the button would offer itself to be pressed again mid-write.
  */
  const write = async () => {
    const r = await addToDeck(lexemeId, ["RECOGNITION", "PRODUCTION"], source, choice.argument);
    if (!r.ok) {
      setResult(r.error);
      return;
    }
    setAsking(false);
    const landed = choice.decks?.filter((d) => choice.deckIds.includes(d.id)).map((d) => d.name) ?? [];
    const where = landed.length > 0 ? ` On ${landed.join(", ")}.` : "";
    setResult(r.added === 0 ? `Already in your deck.${where}` : `Added ${r.added} cards.${where}`);
    router.refresh();
  };

  const add = () => { start(write); };

  /*
    ONE PRESS WHERE THERE IS NOTHING TO ASK, TWO WHERE THERE IS.

    Whether there is a question is a fact about the learner that this button
    cannot know without asking the server, and "not fetched yet" and "no
    shelves at all" are the same empty answer until it comes back. Reading that
    as "no shelves" is how the first draft of this behaved: a learner with none
    pressed once, the panel correctly did not appear, and nothing else happened
    either, which is every learner until they name a shelf.

    So the press resolves it and then decides. With no shelf it adds, and the
    spinner it shows in the meantime is the one it was going to show anyway.
    With shelves it opens the question, and the next press answers it.
  */
  const press = () => {
    if (asking || result !== null) { add(); return; }
    start(async () => {
      const available = await choice.ensure();
      if (available.length === 0) { await write(); return; }
      setAsking(true);
    });
  };

  return (
    <div className={className}>
      {asking && choice.asks && choice.decks && (
        <div className="mb-3 rounded-[var(--r)] p-3" style={{ background: "var(--raised)" }}>
          <DeckChoiceList decks={choice.decks} deckIds={choice.deckIds} toggle={choice.toggle} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {asking && choice.asks && (
          <Button variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
        )}
        <Button
          variant={variant}
          onClick={press}
          disabled={pending || result !== null}
          className={asking && choice.asks ? "flex-1" : "w-full"}
        >
          {pending ? (
            <><Loader2 size={15} className="animate-spin" aria-hidden /> Adding…</>
          ) : result ? (
            <><Check size={15} aria-hidden /> {result}</>
          ) : (
            <><Plus size={15} aria-hidden /> {asking && choice.asks ? "Add it" : "Add it to my deck"}</>
          )}
        </Button>
      </div>
      <span className="sr-only" role="status">{result ? `${lemma}: ${result}` : ""}</span>
    </div>
  );
}
