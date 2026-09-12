"use client";

import { useState, useTransition } from "react";

import { DeckChoiceList, useDeckChoice } from "@/components/DeckChoice";

/**
 * KEEPING A WORD, AND ASKING WHICH SHELF, IN ONE PLACE.
 *
 * Seven screens keep a single word and every one of them wrote the press by
 * hand. That is why the deck question reached exactly one of them: the
 * dictionary learned to ask, and the home page, the glossed sentence, Sonad's
 * finish screen, both drills and Anu's vocabulary list went on filing under
 * nothing. It was reported from the home page and was true of six.
 *
 * So the asking lives here and the writing stays with the caller, because the
 * writing is the part that genuinely differs: the drills ask for their own card
 * types, Anu has to create the entry before there is anything to file, and the
 * glossed sentence deliberately does not refresh the route, since what is
 * behind it is a review session holding its own queue. A shared press that
 * owned the write would have to grow a flag for each of those, and the one it
 * forgot would be silent.
 *
 * ONE PRESS WHERE THERE IS NOTHING TO ASK. Whether there is a question is a
 * fact about the learner no button can know without asking the server, and
 * "not fetched yet" and "no shelves at all" are the same empty answer until it
 * comes back. Reading that as "no shelves" is how the first draft of this
 * behaved: press once, no panel, and nothing else happens either, which is
 * every learner until they name a shelf. So the press resolves it and then
 * decides, inside the transition it was going to show a spinner for anyway.
 *
 * `lexemeId` is nullable for Anu alone, whose word does not exist until the
 * press creates it. A word with no id has no shelves it already sits on, which
 * is the only thing the id is read for.
 */
export function useKeepWord(
  lexemeId: string | null,
  keep: (deckIds: string[] | undefined) => Promise<void>,
) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const choice = useDeckChoice(lexemeId ?? "", asking);

  /*
    RESET BY THE WORD, NOT BY A KEY, which is the rule `StarWord` states about
    itself and for the same reason: the drills render one component over a
    queue of questions, so React keeps this state while the word underneath it
    changes. Without this, opening the shelf question and pressing Next would
    draw the next word with the panel already open, offering to file a word
    nobody had asked about. A `key` at each call site fixes it and is the thing
    a seventh caller forgets.
  */
  const [asked, setAsked] = useState(lexemeId);
  if (asked !== lexemeId) {
    setAsked(lexemeId);
    setAsking(false);
  }

  const press = () => {
    if (asking) {
      start(async () => {
        await keep(choice.argument);
        setAsking(false);
      });
      return;
    }
    start(async () => {
      const available = await choice.ensure();
      if (available.length === 0) { await keep(undefined); return; }
      setAsking(true);
    });
  };

  return {
    press,
    pending,
    /** Whether the shelf question is on screen and waiting to be answered. */
    asking: asking && choice.asks,
    cancel: () => setAsking(false),
    choice,
  };
}

/** The question, drawn where the caller has room for it. */
export function KeepWordChoice({ keeper, className }: {
  keeper: ReturnType<typeof useKeepWord>;
  className?: string;
}) {
  if (!keeper.asking || !keeper.choice.decks) return null;
  return (
    <div
      className={`rounded-[var(--r)] p-3 ${className ?? ""}`}
      style={{ background: "var(--raised)" }}
    >
      <DeckChoiceList
        decks={keeper.choice.decks}
        deckIds={keeper.choice.deckIds}
        toggle={keeper.choice.toggle}
      />
    </div>
  );
}
