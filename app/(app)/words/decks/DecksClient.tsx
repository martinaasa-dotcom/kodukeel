"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, Empty, Stack } from "@/components/ui";
import { createMyDeck, deleteMyDeck, renameMyDeck } from "@/app/actions";
import type { DeckSummary } from "@/lib/progress/decks";

/**
 * CREATING, RENAMING AND REMOVING A SHELF.
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
    if (!name.trim()) return;
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

function DeckRow({ deck, onRenamed, onDeleted }: {
  deck: DeckSummary;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(deck.name);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const rename = () => {
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

  const remove = () => {
    start(async () => {
      const result = await deleteMyDeck(deck.id);
      if (!result.ok) { setError(result.error); return; }
      onDeleted();
      router.refresh();
    });
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); rename(); }} className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={rename}
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
        <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
          {deck.wordCount === 1 ? "1 word" : `${deck.wordCount} words`}
        </p>
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
    </Card>
  );
}
