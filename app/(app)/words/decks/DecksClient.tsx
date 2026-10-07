"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Library, Play, Plus, Trash2, X } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button, ButtonLink } from "@/components/Button";
import { Card, Empty, Stack } from "@/components/ui";
import {
  createMyDeck, deleteMyDeck, fileMyWord, listMyDeckWords, myWordsToFile,
  removeMyDeckWord, renameMyDeck,
} from "@/app/actions";
import type { DeckSummary, DeckWordRow } from "@/lib/progress/decks";
import { NOT_REACHED } from "@/lib/copy/values";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";

/**
 * CREATING, RENAMING, REMOVING A SHELF, AND SEEING WHAT IS ON IT.
 *
 * Every write here touches `Deck` and `DeckWord` alone, so nothing on this
 * screen can move a card's schedule, its history or its mastery: a deck is a
 * name a learner puts on some of their words, never a second pool of them.
 */
export function DecksClient({ decks: initial }: { decks: DeckSummary[] }) {
  const [decks, setDecks] = useState(initial);
  const t = useT();

  return (
    <Stack>
      <NewDeck onCreated={(deck) => setDecks((d) => [...d, deck])} />
      {decks.length === 0 ? (
        <Empty
          title={t("No decks yet")}
          body={t("All your words are in one pile for now. Make a deck and the dictionary asks where new words go.")}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {decks.map((deck) => (
            <DeckRow
              key={deck.id}
              deck={deck}
              onRenamed={(name) => setDecks((d) => d.map((x) => (x.id === deck.id ? { ...x, name } : x)))}
              onDeleted={() => setDecks((d) => d.filter((x) => x.id !== deck.id))}
              onWordRemoved={(lemma) =>
                setDecks((d) => d.map((x) => (x.id === deck.id
                  ? { ...x, wordCount: Math.max(0, x.wordCount - 1), preview: x.preview.filter((w) => w !== lemma) }
                  : x)))
              }
              onWordFiled={(lemma) =>
                setDecks((d) => d.map((x) => (x.id === deck.id
                  ? { ...x, wordCount: x.wordCount + 1, preview: [lemma, ...x.preview.filter((w) => w !== lemma)].slice(0, 5) }
                  : x)))
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
  const t = useT();

  const submit = () => {
    if (!name.trim() || pending) return;
    start(async () => {
      const result = await createMyDeck(name).catch(() => null);
      if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }
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
            {t("New deck")}
          </label>
          <input
            id="new-deck-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Work Estonian, Grandma's recipes, ...")}
            className="field w-full text-sm"
          />
        </div>
        <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
          <Plus size={15} aria-hidden /> {t("Create")}
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{t(error)}</p>}
    </Card>
  );
}

const SHELF_HUES = ["cta", "sky", "blush"] as const;

function hueIndex(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % SHELF_HUES.length;
}

function DeckRow({ deck, onRenamed, onDeleted, onWordRemoved, onWordFiled }: {
  deck: DeckSummary;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
  onWordRemoved: (lemma: string) => void;
  onWordFiled: (lemma: string) => void;
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
  const t = useT();
  const locale = useLocale();

  const rename = () => {
    if (pending) return; // a blur chasing an Enter submit must not fire this twice
    if (!name.trim() || name === deck.name) { setEditing(false); setName(deck.name); return; }
    start(async () => {
      const result = await renameMyDeck(deck.id, name).catch(() => null);
      if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }
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
      const result = await deleteMyDeck(deck.id).catch(() => null);
      if (!result || !result.ok) { setError(t(result ? result.error : NOT_REACHED)); return; }
      onDeleted();
      router.refresh();
    });
  };

  return (
    <Card>
      {/* The name and its two small controls take a line of their own on a
          phone, with Practice and Remove under them: sharing one row, the
          name was squeezed and "Add words" broke over two lines. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* A shelf wears one of the four night colours, chosen by its id so it
            keeps the same one every visit. */}
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r)]"
          style={{ background: `var(--${SHELF_HUES[hueIndex(deck.id)]})`, color: "var(--on-hue)", boxShadow: "var(--depth-sm)" }}
        >
          <Library size={20} />
        </span>
        <div className="min-w-0 flex-1 basis-[12rem]">
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); rename(); }} className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={rename}
                onKeyDown={(e) => { if (e.key === "Escape") cancelRename(); }}
                className="field text-sm"
                aria-label={fill(t("Rename {deck}"), { deck: deck.name })}
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="tap-tint font-display rounded-md px-1.5 py-0.5 text-left text-xl font-bold"
              style={{ color: "var(--ink)" }}
            >
              {deck.name}
            </button>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="tap-tint flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs"
              style={{ color: "var(--ink-3)" }}
              aria-expanded={expanded}
            >
              {countOf(locale, deck.wordCount, "word")}
              {deck.wordCount > 0 && (expanded ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />)}
            </button>
            <button
              type="button"
              onClick={() => setFiling((f) => !f)}
              className="tap-tint flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs"
              style={{ color: "var(--ink-3)" }}
              aria-expanded={filing}
            >
              <Plus size={12} aria-hidden /> {t("Add words")}
            </button>
          </div>
        </div>
        {confirming ? (
          <span className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
            {t("The words themselves won't be deleted.")}
            <Button variant="danger" size="sm" disabled={pending} onClick={remove}>{t("Remove")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>{t("Cancel")}</Button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="tap-tint inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs"
              style={{ color: "var(--ink-3)" }}
            >
              <Trash2 size={13} aria-hidden /> {t("Remove")}
            </button>
            {deck.wordCount > 0 && (
              // `size="sm"` alone leaves this under the 44px floor: the
              // coarse-pointer rule in app/globals.css reaches `button` and
              // `a.pill`, not a bare `ButtonLink` anchor, so a thumb-sized
              // minimum has to be asked for explicitly here.
              <ButtonLink href={`/review/deck/${deck.id}`} variant="primary" size="sm" className="min-h-11">
                <Play size={13} aria-hidden /> {t("Practice")}
              </ButtonLink>
            )}
          </span>
        )}
        {error && <p role="alert" className="w-full text-xs" style={{ color: "var(--again-ink)" }}>{t(error)}</p>}
      </div>
      {/* What is on the shelf, newest first, so a deck reads as its words
          rather than as a count. Hidden while the full list is open, which
          says the same thing at length. */}
      {!expanded && deck.preview.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={fill(t("Newest on {deck}"), { deck: deck.name })}>
          {deck.preview.map((lemma) => (
            <li
              key={lemma}
              lang="et"
              className="rounded-full border px-2.5 py-1 text-sm font-medium"
              style={{ borderColor: "var(--rule-soft)", background: "var(--raised)", color: "var(--ink)" }}
            >
              {lemma}
            </li>
          ))}
          {deck.wordCount > deck.preview.length && (
            <li className="px-1.5 py-1 text-sm" style={{ color: "var(--ink-3)" }}>
              {fill(t("and {n} more"), { n: deck.wordCount - deck.preview.length })}
            </li>
          )}
        </ul>
      )}
      {filing && (
        <FileWords
          deckId={deck.id}
          deckName={deck.name}
          onFiled={(lemma) => { setVersion((v) => v + 1); onWordFiled(lemma); }}
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
  deckId: string; version: number; onWordRemoved: (lemma: string) => void;
}) {
  /*
    Three states rather than two. A read that failed used to be written as an
    empty list, which drew nothing at all and reads as a shelf with no words on
    it: the one wrong answer a learner would believe. "failed" is its own state
    and says so.
  */
  const [words, setWords] = useState<DeckWordRow[] | null | "failed">(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    listMyDeckWords(deckId)
      .then((w) => { if (!cancelled) setWords(w); })
      .catch(() => { if (!cancelled) setWords("failed"); });
    return () => { cancelled = true; };
  }, [deckId, version]);

  const remove = (lexemeId: string) => {
    setPendingId(lexemeId);
    removeMyDeckWord(deckId, lexemeId)
      .then(() => {
        const lemma = Array.isArray(words) ? words.find((x) => x.lexemeId === lexemeId)?.lemma : undefined;
        setWords((w) => (Array.isArray(w) ? w.filter((x) => x.lexemeId !== lexemeId) : w));
        if (lemma) onWordRemoved(lemma);
      })
      // A press that never reached the server leaves the word where it was,
      // which is the truth, rather than an unhandled rejection.
      .catch(() => null)
      .finally(() => setPendingId(null));
  };

  if (words === null) {
    return <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>{t("Loading…")}</p>;
  }
  if (words === "failed") {
    return (
      <p role="status" className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {t("The words in this deck didn't load. Close it and open it again to try once more.")}
      </p>
    );
  }
  if (words.length === 0) {
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {t("No words in this deck yet.")}
      </p>
    );
  }

  return (
    <ul className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--rule)" }}>
      {words.map((word) => (
        <li key={word.lexemeId} className="flex items-center justify-between gap-2 text-sm">
          <Link href={`/dictionary?q=${encodeURIComponent(word.lemma)}`} lang="et" className="underline" style={{ color: "var(--ink)" }}>
            {word.lemma}
          </Link>
          <button
            type="button"
            onClick={() => remove(word.lexemeId)}
            disabled={pendingId === word.lexemeId}
            aria-label={fill(t("Take {word} out of this deck"), { word: word.lemma })}
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
  deckId: string; deckName: string; onFiled: (lemma: string) => void;
}) {
  const [query, setQuery] = useState("");
  // "failed" rather than an empty list, which read as "every word you have is
  // on this shelf already" about a query that never came back.
  const [words, setWords] = useState<DeckWordRow[] | null | "failed">(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = useT();

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
        .catch(() => { if (!cancelled) setWords("failed"); });
    }, query ? 200 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [deckId, query]);

  const file = (word: DeckWordRow) => {
    setPendingId(word.lexemeId);
    fileMyWord(deckId, word.lexemeId)
      .then((result) => {
        if (!result.ok) { setError(t(result.error)); return; }
        setError(null);
        /*
          Spliced out here as well as re-fetched by the row above, because the
          press and the answer are the same gesture: waiting a round trip to
          see the word go would read as a button that did nothing.
        */
        setWords((w) => (Array.isArray(w) ? w.filter((x) => x.lexemeId !== word.lexemeId) : w));
        setSaid(fill(t("{word} is on {deck}."), { word: word.lemma, deck: deckName }));
        onFiled(word.lemma);
      })
      .catch(() => setError(t("That didn't save. Try again in a moment.")))
      .finally(() => setPendingId(null));
  };

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--rule)" }}>
      <label htmlFor={`file-${deckId}`} className="label-xs mb-1 block" style={{ color: "var(--ink-3)" }}>
        {t("Add a word you already have")}
      </label>
      <input
        id={`file-${deckId}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("Newest first, or search")}
        className="field w-full text-sm"
      />
      <p aria-live="polite" className="sr-only">{said}</p>
      {error && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{error}</p>}
      {words === null ? (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>{t("Loading…")}</p>
      ) : words === "failed" ? (
        <p role="status" className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
          {t("Your words didn't load. Change the search to try again.")}
        </p>
      ) : words.length === 0 ? (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
          {query
            ? t("None of your words match that.")
            : t("Every word you have is already in this deck.")}
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
                <span className="" lang="et" style={{ color: "var(--ink)" }}>{word.lemma}</span>
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>{word.translation}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
