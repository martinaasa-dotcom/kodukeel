"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button } from "@/components/Button";
import { Card, Empty, Stack } from "@/components/ui";
import {
  createMyDeck, deleteMyDeck, listMyDeckWords, removeMyDeckWord, renameMyDeck,
} from "@/app/actions";
import type { DeckSummary, DeckWordRow } from "@/lib/progress/decks";

/**
 * CREATING, RENAMING, REMOVING A SHELF, AND SEEING WHAT IS ON IT.
 *
 * Every write here touches `Deck` and `DeckWord` alone, so nothing on this
 * screen can move a card's schedule, its history or its mastery: a deck is a
 * name a learner puts on some of their words, never a second pool of them.
 */
export function DecksClient({ decks: initial }: { decks: DeckSummary[] }) {
  const [decks, setDecks] = useState(initial);

  return (
    <Stack>
      <NewDeck onCreated={(deck) => setDecks((d) => [...d, deck])} />
      {decks.length === 0 ? (
        <Empty
          title="No decks yet"
          body="One shelf holds everything until you name a second one."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {decks.map((deck) => (
            <DeckRow
              key={deck.id}
              deck={deck}
              onRenamed={(name) => setDecks((d) => d.map((x) => (x.id === deck.id ? { ...x, name } : x)))}
              onDeleted={() => setDecks((d) => d.filter((x) => x.id !== deck.id))}
              onWordRemoved={() =>
                setDecks((d) => d.map((x) => (x.id === deck.id ? { ...x, wordCount: Math.max(0, x.wordCount - 1) } : x)))
              }
            />
          ))}
        </div>
      )}
    </Stack>
  );
}

function NewDeck({ onCreated }: { onCreated: (deck: DeckSummary) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () => {
    if (!name.trim() || pending) return;
    start(async () => {
      const result = await createMyDeck(name);
      if (!result.ok) { setError(result.error); return; }
      setError(null);
      setName("");
      onCreated(result.deck);
      router.refresh();
    });
  };

  return (
    <Card>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="new-deck-name" className="label-xs mb-1 block" style={{ color: "var(--ink-3)" }}>
            New deck
          </label>
          <input
            id="new-deck-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Work Estonian, Grandma's recipes, ..."
            className="field w-full text-sm"
          />
        </div>
        <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
          <Plus size={15} aria-hidden /> Create
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{error}</p>}
    </Card>
  );
}

function DeckRow({ deck, onRenamed, onDeleted, onWordRemoved }: {
  deck: DeckSummary;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
  onWordRemoved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(deck.name);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const rename = () => {
    if (pending) return; // a blur chasing an Enter submit must not fire this twice
    if (!name.trim() || name === deck.name) { setEditing(false); setName(deck.name); return; }
    start(async () => {
      const result = await renameMyDeck(deck.id, name);
      if (!result.ok) { setError(result.error); return; }
      setError(null);
      setEditing(false);
      onRenamed(name.trim());
      router.refresh();
    });
  };

  const cancelRename = () => {
    setName(deck.name);
    setEditing(false);
  };

  const remove = () => {
    start(async () => {
      const result = await deleteMyDeck(deck.id);
      if (!result.ok) { setError(result.error); return; }
      onDeleted();
      router.refresh();
    });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); rename(); }} className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={rename}
                onKeyDown={(e) => { if (e.key === "Escape") cancelRename(); }}
                className="field text-sm"
                aria-label={`Rename ${deck.name}`}
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="tap-tint truncate rounded-md px-1.5 py-0.5 text-left text-md font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {deck.name}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="tap-tint mt-0.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs"
            style={{ color: "var(--ink-3)" }}
            aria-expanded={expanded}
          >
            {deck.wordCount === 1 ? "1 word" : `${deck.wordCount} words`}
            {deck.wordCount > 0 && (expanded ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />)}
          </button>
        </div>
        {confirming ? (
          <span className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
            The words stay in your deck.
            <Button variant="danger" size="sm" disabled={pending} onClick={remove}>Remove</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="tap-tint inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs"
            style={{ color: "var(--ink-3)" }}
          >
            <Trash2 size={13} aria-hidden /> Remove
          </button>
        )}
        {error && <p role="alert" className="w-full text-xs" style={{ color: "var(--again-ink)" }}>{error}</p>}
      </div>
      {expanded && deck.wordCount > 0 && (
        <DeckWordList deckId={deck.id} onWordRemoved={onWordRemoved} />
      )}
    </Card>
  );
}

/**
 * WHAT IS ON ONE SHELF, FETCHED ONLY ONCE SOMEBODY ASKS TO SEE IT.
 *
 * A deck's own management page is not a reason for every one of a learner's
 * decks to read its full word list on every visit, so this is behind the
 * disclosure above rather than passed down from the server render.
 */
function DeckWordList({ deckId, onWordRemoved }: { deckId: string; onWordRemoved: () => void }) {
  const [words, setWords] = useState<DeckWordRow[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyDeckWords(deckId).then((w) => { if (!cancelled) setWords(w); }).catch(() => { if (!cancelled) setWords([]); });
    return () => { cancelled = true; };
  }, [deckId]);

  const remove = (lexemeId: string) => {
    setPendingId(lexemeId);
    removeMyDeckWord(deckId, lexemeId)
      .then(() => {
        setWords((w) => (w ? w.filter((x) => x.lexemeId !== lexemeId) : w));
        onWordRemoved();
      })
      .finally(() => setPendingId(null));
  };

  if (words === null) {
    return <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>Loading…</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--rule)" }}>
      {words.map((word) => (
        <li key={word.lexemeId} className="flex items-center justify-between gap-2 text-sm">
          <Link href={`/dictionary?q=${encodeURIComponent(word.lemma)}`} lang="et" className="truncate underline" style={{ color: "var(--ink)" }}>
            {word.lemma}
          </Link>
          <button
            type="button"
            onClick={() => remove(word.lexemeId)}
            disabled={pendingId === word.lexemeId}
            aria-label={`Take ${word.lemma} off this shelf`}
            className="tap-tint shrink-0 rounded-md p-1"
            style={{ color: "var(--ink-3)" }}
          >
            <X size={13} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
