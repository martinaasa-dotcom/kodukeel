"use client";

import { useEffect, useState } from "react";

import { listMyDecks, myDeckMembership } from "@/app/actions";
import type { DeckSummary } from "@/lib/progress/decks";

/**
 * WHICH SHELF A WORD GOES ON, ASKED THE SAME WAY WHEREVER IT IS ASKED.
 *
 * The dictionary's add panel grew this list first and was, for a while, the
 * only screen in the app that asked at all. Every other way of keeping a word
 * called `addToDeck` with three arguments and filed it under nothing, so a
 * learner who had named shelves pressed "Add it to my deck" on the home page
 * and watched the word go nowhere in particular, silently. That was reported,
 * and the report is the whole argument for this file: a second copy of the
 * question is how one door comes to ask it and the next does not.
 *
 * `argument` is the part worth reading. `addToDeck` distinguishes an omitted
 * `deckIds` from an empty one: omitted leaves every shelf as it is, `[]` means
 * take it off all of them. A learner with no deck of their own was never shown
 * this list and has asked for neither, so they send nothing; one who was shown
 * it and ticked no box has asked for the second, and it has to reach the
 * database.
 */
export function useDeckChoice(lexemeId: string, open: boolean) {
  const [decks, setDecks] = useState<DeckSummary[] | null>(null);
  const [deckIds, setDeckIds] = useState<string[]>([]);

  /*
    The same read, asked for rather than waited on, for a caller with no panel
    to open: a button that has to decide whether there is a question before it
    can draw one cannot use the effect below, because "not fetched yet" and "no
    shelves" are the same `null` to it. Pressing once and having nothing happen
    is what that confusion looks like on the screen, and it is what the learner
    with no shelves of their own would have got, which is most of them.
  */
  const ensure = async (): Promise<DeckSummary[]> => {
    if (decks !== null) return decks;
    try {
      const [available, current] = await Promise.all([listMyDecks(), myDeckMembership(lexemeId)]);
      setDecks(available);
      setDeckIds(current);
      return available;
    } catch {
      // A shelf nobody could fetch is one nobody is asked about: the word still
      // goes into the deck, which is the thing the learner actually pressed for.
      setDecks([]);
      return [];
    }
  };

  /*
    Fetched on open rather than carried by every card that could be added, and
    fetched again on each open rather than once per word: `staleTimes` holds a
    rendered page in the router cache for thirty seconds, so a learner who goes
    and names their first shelf and comes straight back is looking at the very
    component that cached the empty answer.
  */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([listMyDecks(), myDeckMembership(lexemeId)])
      .then(([available, current]) => {
        if (cancelled) return;
        setDecks(available);
        setDeckIds(current);
      })
      .catch(() => { if (!cancelled) setDecks([]); });
    return () => { cancelled = true; };
  }, [open, lexemeId]);

  return {
    decks,
    deckIds,
    ensure,
    /** Whether there is anything to ask about, which is any shelf at all. */
    asks: decks !== null && decks.length > 0,
    toggle: (id: string, on: boolean) =>
      setDeckIds((d) => (on ? [...d, id] : d.filter((x) => x !== id))),
    /** What to hand `addToDeck`: see the note above on omitted against empty. */
    argument: decks && decks.length > 0 ? deckIds : undefined,
  };
}

/** The list itself, so two screens cannot draw the same question two ways. */
export function DeckChoiceList({ decks, deckIds, toggle }: {
  decks: DeckSummary[];
  deckIds: string[];
  toggle: (id: string, on: boolean) => void;
}) {
  return (
    <div>
      <p className="label-xs mb-3" style={{ color: "var(--ink-3)" }}>Which deck?</p>
      <div className="flex flex-col gap-2">
        {decks.map((deck) => (
          <label
            key={deck.id}
            className="flex cursor-pointer items-center gap-2.5 text-sm"
            style={{ color: "var(--ink-2)" }}
          >
            <input
              type="checkbox"
              checked={deckIds.includes(deck.id)}
              onChange={(e) => toggle(deck.id, e.target.checked)}
            />
            <span style={{ color: "var(--ink)" }}>{deck.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
