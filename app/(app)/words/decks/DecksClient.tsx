"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button } from "@/components/Button";
import { Card, Empty, Stack } from "@/components/ui";
import {
  createMyDeck, deleteMyDeck, fileMyWord, listMyDeckWords, myWordsToFile,
  removeMyDeckWord, renameMyDeck,
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
          body="Your words are one deck until you name a shelf. Then the dictionary asks which."
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
              onWordFiled={() =>
                setDecks((d) => d.map((x) => (x.id === deck.id ? { ...x, wordCount: x.wordCount + 1 } : x)))
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

function DeckRow({ deck, onRenamed, onDeleted, onWordRemoved, onWordFiled }: {
  deck: DeckSummary;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
  onWordRemoved: () => void;
  onWordFiled: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [filing, setFiling] = useState(false);
  /*
    What is on the shelf is fetched by the disclosure below and what is not on
    it by the panel beside it, so filing a word makes both lists wrong at once.
    Bumping this re-runs the fetch rather than splicing the row in by hand: the
    two lists are answers to opposite questions and a client-side splice would
    have to keep both, which is two copies of a rule the server already holds.
  */
  const [version, setVersion] = useState(0);
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
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="tap-tint flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs"
              style={{ color: "var(--ink-3)" }}
              aria-expanded={expanded}
            >
              {deck.wordCount === 1 ? "1 word" : `${deck.wordCount} words`}
              {deck.wordCount > 0 && (expanded ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />)}
            </button>
            <button
              type="button"
              onClick={() => setFiling((f) => !f)}
              className="tap-tint flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs"
              style={{ color: "var(--ink-3)" }}
              aria-expanded={filing}
            >
              <Plus size={12} aria-hidden /> Add words
            </button>
          </div>
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
      {filing && (
        <FileWords
          deckId={deck.id}
          deckName={deck.name}
          onFiled={() => { setVersion((v) => v + 1); onWordFiled(); }}
        />
      )}
      {expanded && deck.wordCount > 0 && (
        <DeckWordList deckId={deck.id} version={version} onWordRemoved={onWordRemoved} />
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
function DeckWordList({ deckId, version, onWordRemoved }: {
  deckId: string; version: number; onWordRemoved: () => void;
}) {
  const [words, setWords] = useState<DeckWordRow[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyDeckWords(deckId).then((w) => { if (!cancelled) setWords(w); }).catch(() => { if (!cancelled) setWords([]); });
    return () => { cancelled = true; };
  }, [deckId, version]);

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

/**
 * FILING A WORD THE LEARNER ALREADY HAS, AFTER THE FACT.
 *
 * The dictionary's own panel asks which shelf at the moment a word is added,
 * and it is the only screen that ever did: a word kept from Sonad, from the
 * word of the day, from a glossed sentence, from a scene debrief or from the
 * government and conjugation drills is added with no deck argument at all and
 * lands unfiled. Before this there was nothing anywhere that could file it
 * afterwards, so this screen could take a word off a shelf and never put one
 * on, and every word kept mid-round was stranded.
 *
 * NEWEST FIRST AND THE BOX EMPTY, because the word somebody opened this for
 * is nearly always the one they just kept. Typing is the fallback rather than
 * the way in, which is why the list is fetched with no query at all.
 *
 * ONE PRESS PER WORD, with no submit under it. The checkbox shape next door
 * in the dictionary is a replace, and has to be, since it states the whole of
 * where one word lives; this states the opposite, what is not here yet, so a
 * press is an addition and the row simply leaves. Nothing is destructive
 * enough to confirm, and the word is one press from coming back off the shelf
 * in the list above.
 */
function FileWords({ deckId, deckName, onFiled }: {
  deckId: string; deckName: string; onFiled: () => void;
}) {
  const [query, setQuery] = useState("");
  const [words, setWords] = useState<DeckWordRow[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [error, setError] = useState<string | null>(null);

  /*
    Debounced, because this is a keystroke against a query that groups every
    card the learner holds. 200ms is under what anybody reads as a wait and
    over the gap between two letters of one word.
  */
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      myWordsToFile(deckId, query)
        .then((w) => { if (!cancelled) setWords(w); })
        .catch(() => { if (!cancelled) setWords([]); });
    }, query ? 200 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [deckId, query]);

  const file = (word: DeckWordRow) => {
    setPendingId(word.lexemeId);
    fileMyWord(deckId, word.lexemeId)
      .then((result) => {
        if (!result.ok) { setError(result.error); return; }
        setError(null);
        /*
          Spliced out here as well as re-fetched by the row above, because the
          press and the answer are the same gesture: waiting a round trip to
          see the word go would read as a button that did nothing.
        */
        setWords((w) => (w ? w.filter((x) => x.lexemeId !== word.lexemeId) : w));
        setSaid(`${word.lemma} is on ${deckName}.`);
        onFiled();
      })
      .catch(() => setError("That did not save. Try again in a moment."))
      .finally(() => setPendingId(null));
  };

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--rule)" }}>
      <label htmlFor={`file-${deckId}`} className="label-xs mb-1 block" style={{ color: "var(--ink-3)" }}>
        Add a word you already have
      </label>
      <input
        id={`file-${deckId}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Newest first, or search"
        className="field w-full text-sm"
      />
      <p aria-live="polite" className="sr-only">{said}</p>
      {error && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{error}</p>}
      {words === null ? (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>Loading…</p>
      ) : words.length === 0 ? (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
          {query
            ? "No word of yours matches that."
            : "Every word you have is on this shelf already."}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {words.map((word) => (
            <li key={word.lexemeId}>
              <button
                type="button"
                onClick={() => file(word)}
                disabled={pendingId === word.lexemeId}
                className="tap-tint flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm"
              >
                <Plus size={13} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
                <span className="truncate" lang="et" style={{ color: "var(--ink)" }}>{word.lemma}</span>
                <span className="truncate text-xs" style={{ color: "var(--ink-3)" }}>{word.translation}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
