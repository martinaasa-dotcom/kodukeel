"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { addToDeck } from "@/app/actions";
import { Button } from "@/components/Button";
import { KeepWordChoice, useKeepWord } from "@/components/KeepWord";

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
  const [result, setResult] = useState<string | null>(null);

  const keeper = useKeepWord(lexemeId, async (deckIds) => {
    const r = await addToDeck(lexemeId, ["RECOGNITION", "PRODUCTION"], source, deckIds);
    if (!r.ok) { setResult(r.error); return; }
    const named = keeper.choice.decks?.filter((d) => deckIds?.includes(d.id)).map((d) => d.name) ?? [];
    const where = named.length > 0 ? ` On ${named.join(", ")}.` : "";
    setResult(r.added === 0 ? `Already in your deck.${where}` : `Added ${r.added} cards.${where}`);
    router.refresh();
  });

  return (
    <div className={className}>
      <KeepWordChoice keeper={keeper} className="mb-3" />
      <div className="flex flex-wrap items-center gap-2">
        {keeper.asking && (
          <Button variant="ghost" onClick={keeper.cancel}>Cancel</Button>
        )}
        <Button
          variant={variant}
          onClick={keeper.press}
          disabled={keeper.pending || result !== null}
          className={keeper.asking ? "flex-1" : "w-full"}
        >
          {keeper.pending ? (
            <><Loader2 size={15} className="animate-spin" aria-hidden /> Adding…</>
          ) : result ? (
            <><Check size={15} aria-hidden /> {result}</>
          ) : (
            <><Plus size={15} aria-hidden /> {keeper.asking ? "Add it" : "Add it to my deck"}</>
          )}
        </Button>
      </div>
      <span className="sr-only" role="status">{result ? `${lemma}: ${result}` : ""}</span>
    </div>
  );
}
