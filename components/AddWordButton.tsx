"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { addToDeck } from "@/app/actions";
import { Button } from "@/components/Button";
import { KeepWordChoice, useKeepWord } from "@/components/KeepWord";
import { counted, NOT_REACHED } from "@/lib/copy/values";

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
  /*
    A FAILURE IS NOT A RESULT. It used to land in the same field, so a refused
    add was drawn with the tick and the button was held shut for good: the
    screen said it had worked and offered no second try. It is its own line,
    in the ink a miss is written in, and the button stays open to press again.
  */
  const [error, setError] = useState<string | null>(null);

  const keeper = useKeepWord(lexemeId, async (deckIds, named) => {
    const r = await addToDeck(lexemeId, ["RECOGNITION", "PRODUCTION"], source, deckIds).catch(() => null);
    if (!r || !r.ok) { setError(r ? r.error : NOT_REACHED); return; }
    setError(null);
    const where = named.length > 0 ? ` On ${named.join(", ")}.` : "";
    setResult(r.added === 0 ? `Already in your deck.${where}` : `Added ${counted(r.added, "card")}.${where}`);
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
          onClick={() => { if (!keeper.pending && result === null) keeper.press(); }}
          /* Not `disabled`: the press is what starts the add, and a control
             disabled under the caret drops focus onto the body. It says it is
             busy, or done, and ignores a second press. */
          aria-disabled={keeper.pending || result !== null || undefined}
          className={`${keeper.asking ? "flex-1" : "w-full"} aria-disabled:opacity-45`}
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
      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--again-ink)" }}>
          {lemma}: {error}
        </p>
      )}
      <span className="sr-only" role="status">{result ? `${lemma}: ${result}` : ""}</span>
    </div>
  );
}
