"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGrade } from "@/components/round/useGrade";
import { Blocks, Delete } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { VERDICT_CLASS, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { lettersOf, ratingFor, tileForKey, type Tile } from "@/lib/games/letters";

export interface LettersWord {
  cardId: string;
  /** The word whose letters are on the board. Never shown until it is built. */
  lemma: string;
  /** The English, which is the question. */
  meaning: string;
  /** The word's letters, scrambled on the server so the board is the same on arrival. */
  tiles: Tile[];
  lexemeId: string;
  starred: boolean;
}

/** How many misses a word gets before it is shown: the second go has its first letter placed. */
const TRIES = 2;

/** How long the row shakes before the tiles come back. Matches `emoji-shake`. */
const SHAKE_MS = 420;

/**
 * TÄHED, PLAYED. The meaning is up, the word is heard, and its letters sit
 * on tiles in the wrong order. A tap or a key moves a tile onto the row, a
 * placed tile taps back off, and the row is checked the moment the last tile
 * lands, since a full row is an answer and asking somebody to press Check on
 * it is a second press for nothing.
 *
 * A first miss shakes the row, hands it back, and places the first letter for
 * them: a beginner who has the letters and has lost the shape is shown the
 * shape without being shown the word. A second miss shows the word and grades
 * Again. Right first time is Good and right on the second go is Hard, since
 * the second go was helped (`ratingFor` in lib/games/letters.ts).
 *
 * The session keeps the score and which word is up; `Board` keeps one word's
 * tiles and is keyed on the card, so a new word is a new board rather than an
 * effect resetting six fields. The tiles wear `.letter-key`, which is the
 * same growing and wiggling the six keys that type õ, ä, ö and ü already do,
 * because these are the same letters in a different room.
 */
export function LettersSession({ words: initial }: { words: LettersWord[] }) {
  // Snapshotted once, for the reason every round gives: gradeCard refreshes
  // the route and the prop shrinks as words are graded away.
  const [words] = useState(initial);
  const [wasEmptyAtStart] = useState(initial.length === 0);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);

  const word = words[index];
  const look = useLookBack();

  const settled = useCallback((solved: boolean, misses: number) => {
    setAttempted((a) => a + 1);
    if (solved) {
      setCorrect((c) => c + 1);
      if (misses === 0) setFirstTry((f) => f + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }, []);

  /*
    The word just gone goes into the look back on the way past it, solved or
    not: a word the board had to show is the one somebody most wants to see
    again. The meaning is the question here and the word is the answer, which
    is the way round this round asks, and the label is the chip the board
    already wears. Nothing is graded by it (`lib/ux/lookBack.ts`).

    AND NO KEY OPENS IT HERE, which is why the button below says none. The
    review footer's cap stands down on a card being typed because `b` is the
    first letter of `buss`; this board is answered by pressing the letters
    themselves, so `b` is a tile on every word holding one and there is no
    text box to excuse a shortcut swallowing it.
  */
  const next = useCallback(() => {
    if (word) {
      look.record({
        of: word.cardId,
        label: "Tähed",
        question: word.meaning,
        answer: word.lemma,
        note: null,
        questionLang: "en",
        answerLang: "et",
        speak: word.lemma,
      });
    }
    setIndex((i) => i + 1);
  }, [look, word]);

  if (wasEmptyAtStart) {
    return (
      <Page title="Tähed" lead="The letters of a word you know, in the wrong order.">
        <Empty
          title="No words to spell yet"
          body="This plays with words you have already met, three letters or longer."
          action={<ButtonLink href="/learn" variant="primary">Meet some words</ButtonLink>}
        />
      </Page>
    );
  }

  if (!word) {
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="pop-in text-center">
          <Mascot size={68} mood="cheer" className="float mx-auto" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Every word spelled
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
            {firstTry === attempted && attempted > 0
              ? "Every one first time. The letters are yours."
              : "Tubli. The ones that took two goes are the ones worth hearing again."}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3">
          <StatTile value={firstTry} label="First time" tone="mint" />
          <StatTile value={`${accuracy}%`} label="Spelled" tone={accuracy >= 85 ? "mint" : "butter"} />
          <StatTile value={attempted} label="Words" tone="sky" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">Back to Today</ButtonLink>
          <ButtonLink href="/review/letters" variant="primary" size="lg">Play again</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const remaining = words.length - index;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Tähed</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="grad-accent h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max((index / words.length) * 100, 2)}%` }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={words.length}
            aria-label="Session progress"
          />
        </div>
        <span
          className="tnum label-xs rounded-full px-2.5 py-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          {remaining} left
        </span>
      </div>
      {look.panel && <LookBackCard {...look.panel} />}
      {/*
        HIDDEN RATHER THAN REPLACED, WHICH IS THIS ROUND AND NOT THE OTHERS.

        Every other round keeps the answer it is part way through in the
        session, above the subtree the panel stands in for, so unmounting that
        subtree costs nothing. This one keeps it in the board: the tiles a
        learner has placed are `Board`'s own state, keyed on the card, so a
        look back that unmounted it would hand them back a scrambled word and
        lose the half they had built. The board's keys cannot reach it either
        way, because the panel takes the keyboard in the capture phase, which
        is where `Backspace` had to be added: it is not a character and it is
        what this round takes a tile back with.
      */}
      <div hidden={look.looking}>
        <Board key={word.cardId} word={word} streak={streak} correct={correct} onSettled={settled} onNext={next} />
      </div>
      {look.seen.length > 0 && (
        <div className="mt-4 flex justify-center">
          <LookBackButton {...look.button} disabled={look.looking} />
        </div>
      )}
    </div>
  );
}

function Board({ word, streak, correct, onSettled, onNext }: {
  word: LettersWord;
  streak: number;
  correct: number;
  onSettled: (solved: boolean, misses: number) => void;
  onNext: () => void;
}) {
  const grade = useGrade();
  const letters = useMemo(() => lettersOf(word.lemma), [word.lemma]);
  const tiles = word.tiles;
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [misses, setMisses] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [shaking, setShaking] = useState(false);
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const shownAt = useRef<number | null>(null);
  const sound = useFeedbackSound();

  const answered = verdict !== null;
  const used = useMemo(() => new Set(placed.map((t) => t.id)), [placed]);

  const settle = useCallback(async (solved: boolean, missCount: number) => {
    setBusy(true);
    const rating = ratingFor(missCount, solved);
    setVerdict(rating === 3 ? "right" : rating === 2 ? "nearly" : "wrong");
    if (solved) {
      sound("right", streak + 1);
      setLive(`Right. ${word.lemma}, ${word.meaning}.`);
    } else {
      sound("wrong");
      setLive(`Not this time. The word is ${word.lemma}, ${word.meaning}.`);
    }
    onSettled(solved, missCount);
    const duration = shownAt.current === null ? 0 : Date.now() - shownAt.current;
    await grade(word.cardId, rating, duration, "PRODUCTION");
    setBusy(false);
  }, [word, sound, streak, onSettled, grade]);

  const check = useCallback((row: Tile[]) => {
    const built = row.map((t) => t.letter).join("");
    if (built === word.lemma) { void settle(true, misses); return; }
    const next = misses + 1;
    setMisses(next);
    if (next >= TRIES) { void settle(false, next); return; }
    // Shake, hand the tiles back, and place the first letter for them.
    sound("wrong");
    setShaking(true);
    setLive("Not that order. Try once more. The first letter is placed for you.");
    window.setTimeout(() => {
      setShaking(false);
      const first = tiles.find((t) => t.letter === letters[0]);
      setPlaced(first ? [first] : []);
    }, SHAKE_MS);
  }, [word.lemma, misses, settle, sound, tiles, letters]);

  const place = useCallback((tile: Tile) => {
    if (answered || shaking || busy || used.has(tile.id)) return;
    if (shownAt.current === null) shownAt.current = Date.now();
    const row = [...placed, tile];
    setPlaced(row);
    if (row.length === letters.length) check(row);
  }, [answered, shaking, busy, used, placed, letters.length, check]);

  const takeBack = useCallback(() => {
    if (answered || shaking || busy) return;
    // The letter placed for them after a miss stays where it is.
    const floor = misses > 0 ? 1 : 0;
    setPlaced((p) => (p.length > floor ? p.slice(0, -1) : p));
  }, [answered, shaking, busy, misses]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (answered) {
        if (isAdvanceKey(e)) { e.preventDefault(); onNext(); }
        return;
      }
      if (e.key === "Backspace") { e.preventDefault(); takeBack(); return; }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tile = tileForKey(tiles, used, e.key);
        if (tile) { e.preventDefault(); place(tile); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, onNext, takeBack, tiles, used, place]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent"><Blocks size={12} aria-hidden /> Tähed</Chip>
        {streak >= 2 && <Chip tone="good">{streak} in a row</Chip>}
        <span className="ml-auto text-xs" style={{ color: "var(--ink-3)" }}>{correct} spelled</span>
        {/* After the answer, since the label names the word the board is hiding. */}
        {answered && <StarWord lexemeId={word.lexemeId} starred={word.starred} label={word.lemma} />}
      </div>

      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <div className="flex items-center gap-3">
          <p className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>{word.meaning}</p>
          <Speak
            text={word.lemma}
            autoplay
            size={20}
            label="Hear the word"
            className="press flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
          />
        </div>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {answered ? "Here it is, letter by letter." : "Put the letters in order. Hear it as often as you like."}
        </p>

        {/* THE ROW. One slot per letter, filled as tiles land. Wearing the
            verdict once there is one, and shaking once on a miss. */}
        <div
          lang="et"
          className={`flex flex-wrap justify-center gap-1.5 rounded-[var(--r)] px-3 py-3 ${shaking ? "emoji-shake" : ""} ${answered ? VERDICT_CLASS[verdict] : ""}`}
          style={answered ? undefined : { background: "var(--raised)" }}
          aria-label="Your spelling"
        >
          {letters.map((letter, i) => {
            const tile = answered ? null : placed[i];
            const shown = answered ? letter : tile?.letter;
            const locked = !answered && misses > 0 && i === 0;
            return (
              <button
                key={i}
                type="button"
                disabled={answered || !tile || locked || i !== placed.length - 1}
                onClick={takeBack}
                aria-label={shown ? `${shown}, take it back` : `Empty slot ${i + 1}`}
                className="tap-tint flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] border text-xl font-bold disabled:cursor-default"
                /* An empty slot is drawn as a dashed box, so the row says how many
                   letters are still to come; a filled one is a card on the ground. */
                style={{
                  borderColor: shown ? "var(--rule)" : "var(--ink-3)",
                  borderStyle: shown ? "solid" : "dashed",
                  background: shown ? "var(--surface)" : "transparent",
                  color: answered ? "inherit" : "var(--ink)",
                }}
              >
                {shown ?? ""}
              </button>
            );
          })}
        </div>

        {!answered && (
          <div className="flex flex-wrap justify-center gap-2" aria-label="Letters to place">
            {tiles.map((tile) => {
              const spent = used.has(tile.id);
              return (
                <button
                  key={tile.id}
                  type="button"
                  lang="et"
                  disabled={spent || shaking || busy}
                  onClick={() => place(tile)}
                  aria-label={spent ? `${tile.letter}, placed` : tile.letter}
                  className="press letter-key flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold shadow-[var(--shadow)] disabled:cursor-default"
                  /* A placed tile keeps its room on the board and shows nothing, so the
                     row of tiles does not reflow under a finger mid-word. */
                  style={{ background: "var(--accent-soft)", color: "var(--accent-deep)", visibility: spent ? "hidden" : undefined }}
                >
                  {tile.letter}
                </button>
              );
            })}
          </div>
        )}

        <p className="sr-only" aria-live="polite">{live}</p>
      </div>

      <div className="flex items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        {answered ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onNext}>
            Continue
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        ) : (
          <>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              {misses > 0 ? "One more go." : "Tap or type the letters."}
            </span>
            <Button variant="secondary" className="ml-auto whitespace-nowrap" onClick={takeBack} disabled={placed.length === 0 || shaking || busy}>
              <Delete size={15} aria-hidden /> Take back
              <KeyCap className="ml-1">⌫</KeyCap>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
