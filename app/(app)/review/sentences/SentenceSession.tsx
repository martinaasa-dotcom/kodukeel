"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGrade } from "@/components/round/useGrade";
import { shuffle } from "@/lib/random/shuffle";
import { ArrowRight, Check, Eye, RotateCcw } from "lucide-react";
import { translateExample } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { Speak } from "@/components/Speak";
import { useUiText } from "@/components/UiLanguage";
import { useResumeCard } from "@/components/useResumeCard";
import { sentenceTiles, tileFaces } from "@/lib/estonian/cloze";
import { orderIsRight, readOrder, type OrderVerdict } from "@/lib/estonian/wordOrder";
import { ORDER_EXACT, orderVariantNote, ORDER_WRONG } from "@/lib/copy/values";
import { OPTION_CLASS, VERDICT_CLASS } from "@/lib/ux/verdict";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { hintLadder } from "@/lib/questions/hints";
import { isAdvanceKey } from "@/lib/ux/advanceKey";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { WordLink } from "@/components/course/WordLink";

export interface SentenceTask {
  /** The card this counts against — every mode grades through the same log. */
  cardId: string;
  lexemeId: string;
  lemma: string;
  /** The attested Estonian sentence, exactly as Ekilex recorded it. */
  et: string;
  /** English, when it has been resolved. Null means the preview mode is used. */
  en: string | null;
  /**
   * The other orders of this sentence Estonian allows, off the dictionary.
   *
   * The round marks in the browser, so the judgment travels with the task
   * rather than being made here: what counts as Estonian is one answer, in
   * `lib/estonian/wordOrder.ts`, for this round, the lesson and the paper.
   */
  alsoRight: readonly string[];
  /**
   * Whether the sentence opens on an ordinary word, so its first tile loses
   * the capital that would say which tile goes first. See `tileFaces`.
   */
  openerIsWord: boolean;
}

/** How long the sentence is shown before it is scrambled, when there is no English. */
const PREVIEW_MS = 4500;

/**
 * Sentence building — Duolingo's word bank, over attested Estonian.
 *
 * Word order is the thing a case language quietly demands and a flashcard never
 * tests: you can know every form of `raamat` and still not know where it goes.
 * Tapping real words into order drills exactly that, and because the sentence
 * came from Ekilex the exercise never asks anyone to reproduce invented Estonian.
 *
 * Two ways of asking, depending on what is known:
 *
 * - **With an English translation** — the real exercise: read the meaning, build
 *   the Estonian. Translations are fetched one sentence ahead in the background,
 *   so the mode gets better the more it is used and never blocks on the model.
 * - **Without one** — the sentence is shown for a few seconds, then scrambled.
 *   Weaker, and honest about being a recall drill rather than a translation.
 */
export function SentenceSession(
  { tasks: initialTasks, opensAt }: {
    tasks: SentenceTask[];
    /**
     * The band this round opens at, where the learner has not reached it.
     *
     * A failure may not misname its cause: an empty round for somebody below
     * `BUILD_FROM` is not a thin deck, and sending them to the dictionary to
     * add words would have them fixing something that is not broken.
     */
    opensAt?: string;
  },
) {
  const grade = useGrade();
  const uiText = useUiText();
  const [tasks, setTasks] = useState(initialTasks);
  // Which task to reopen on after a detour to its dictionary entry. See
  // components/useResumeCard.ts.
  const { initialIndex, remember: rememberTask } = useResumeCard(initialTasks.map((t) => ({ id: t.cardId })));
  const [index, setIndex] = useState(initialIndex);
  const [built, setBuilt] = useState<number[]>([]);
  /*
    The verdict paints the panel and is one of `lib/ux/verdict.ts`'s three
    words; `variant` says whether a right answer was the writer's own order or
    another one Estonian allows. Two fields rather than a third verdict,
    because another order is not a near miss and may not wear butter.
  */
  const [checked, setChecked] = useState<null | "right" | "wrong">(null);
  const [variant, setVariant] = useState<OrderVerdict | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());
  const shownAt = useRef(Date.now());

  const task = tasks[index];
  /* The way back to the sentence before this one. See `lib/ux/lookBack.ts`. */
  const look = useLookBack();
  const finished = !task;

  /*
    THE WAY OUT OF BEING STUCK, WHERE THE WORDS ARE ALL ON THE SCREEN ALREADY.

    Uncovering the writer's own sentence from the front, which on a round about
    order is exactly the right shape: the first rung says how many words there
    are and how long each one is, and the next says which word opens it. That
    is the question a learner stuck on a shuffle of six tiles is asking, and
    nothing about it says which of two orders Estonian allows, since both are
    marked right (`readOrder`).
  */
  const ladder = task ? hintLadder({ answer: task.et }) : [];
  const hints = useHints({ word: task?.cardId ?? null, question: task?.cardId ?? null, ladder });

  useEffect(() => { rememberTask(task ? { id: task.cardId } : undefined); }, [rememberTask, task]);

  // Shuffling happens after mount, never during the server render: the server
  // and the browser would draw different orders from Math.random and React
  // would report a hydration mismatch (the same trap as the interval previews
  // in ReviewSession).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The tiles are shuffled once per sentence, not on every render — a re-shuffle
  // mid-exercise would move the tile under the learner's finger.
  const tiles = useMemo(() => {
    if (!task || !mounted) return [];
    const recorded = sentenceTiles(task.et);
    const words = tileFaces(recorded, recorded[0] ?? "", task.openerIsWord);
    const order = shuffle(words.map((_, i) => i));
    // A shuffle that happens to be the right order is not an exercise.
    if (order.every((v, i) => v === i) && order.length > 1) order.reverse();
    return order.map((i) => ({ index: i, word: words[i]! }));
  }, [task, mounted]);

  /** Translate the next couple of sentences while this one is being answered. */
  useEffect(() => {
    const upcoming = tasks.slice(index, index + 3).filter((t) => t.en === null);
    for (const next of upcoming) {
      void translateExample(next.lexemeId, next.et).catch(() => null).then((result) => {
        if (!result?.ok) return;
        setTasks((list) => list.map((t) => (t.et === next.et ? { ...t, en: result.en } : t)));
      });
    }
    // Only when the position changes: re-running per keystroke would hammer the model.
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setBuilt([]);
    setChecked(null);
    setVariant(null);
    shownAt.current = Date.now();
    if (task && task.en === null) {
      setPreviewing(true);
      const t = setTimeout(() => setPreviewing(false), PREVIEW_MS);
      return () => clearTimeout(t);
    }
    setPreviewing(false);
    return undefined;
  }, [index, task]);

  const answer = built.map((i) => tiles.find((t) => t.index === i)?.word ?? "");

  const check = useCallback(async () => {
    if (!task || busy || checked) return;
    setBusy(true);
    const verdict = readOrder(answer, task.et, task.alsoRight);
    const right = orderIsRight(verdict.reading);
    setChecked(right ? "right" : "wrong");
    setVariant(verdict.reading === "variant" ? verdict : null);
    setAttempts((a) => a + 1);
    if (right) setCorrect((c) => c + 1);
    if (!right && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(60);

    if (!right) hints.noteMiss();
    // A hint is paid for: see `lib/questions/hints.ts`.
    const rating = Math.min(right ? 3 : 1, hints.ceiling) as 1 | 2 | 3;
    await grade(task.cardId, rating, Date.now() - shownAt.current);
    setBusy(false);
  }, [task, busy, checked, answer, hints, grade]);

  const next = useCallback(() => {
    /* The sentence the writer wrote, which is the answer this round is
       about, with its English where the dictionary holds one. */
    if (task) {
      look.record({
        of: task.cardId,
        label: "Word order",
        question: task.lemma,
        answer: task.et,
        note: task.en,
        questionLang: "et",
        answerLang: "et",
        speak: task.et,
      });
    }
    setIndex((i) => i + 1);
  }, [task, look]);

  /* Once the sentence is marked, Enter or Space is "next", as on every other
     round. The tiles are buttons, so before the mark a Space on a focused tile
     is the browser pressing that tile and is left to it. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      if (e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      if (!checked) return;
      if (isAdvanceKey(e)) { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checked, look, next]);

  if (initialTasks.length === 0) {
    return (
      <Page title="Sentences" lead="Put real Estonian sentences back in order.">
        {opensAt ? (
          <Empty
            title={`This one opens at ${opensAt}`}
            body="Word order comes after the words themselves. Keep learning and it will be here."
            action={<ButtonLink href="/learn" variant="primary">Carry on learning</ButtonLink>}
          />
        ) : (
          <Empty
            title="No sentences to build yet"
            body="Sentences are linked to words already in your deck."
            action={<ButtonLink href="/dictionary" variant="primary">Open the dictionary</ButtonLink>}
          />
        )}
      </Page>
    );
  }

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="pop-in text-center">
          <Mascot size={68} mood="cheer" className="float mx-auto" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Sentences done
          </h1>
          {/* The provenance disclaimer is off every round in the app; see the
              level check. The sentence in front of it was this app telling
              somebody who has just finished why the round was worth doing. */}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile value={attempts} label="Built" tone="accent" />
          <StatTile value={`${accuracy}%`} label="First time" tone={accuracy >= 70 ? "mint" : "butter"} />
          <StatTile value={`${minutes}m`} label="Time" tone="sky" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/practice" size="lg">Other modes</ButtonLink>
          <ButtonLink href="/" size="lg">Back to Today</ButtonLink>
          <ButtonLink href="/review/sentences" variant="primary" size="lg">Another round</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const progress = (index / tasks.length) * 100;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      {/* The heading a session screen has no room to draw.

          These five screens are a progress bar, a card and four rating buttons,
          and there is nothing on them a title could be added to without taking
          space from the card. So they had no heading at all: somebody working
          down a page by its headings, or asking what this screen is, got
          nothing back, while the four modes that happen to have a title bar
          answered fine. The `Empty` and finished states of these same files
          already carry one, which is how the gap survived a sweep. */}
      <h1 className="sr-only">Sentences</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="grad-accent h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max(progress, 2)}%` }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={tasks.length}
            aria-label={`Sentence ${index + 1} of ${tasks.length}`}
          />
        </div>
        <span
          className="tnum label-xs rounded-full px-2.5 py-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          {tasks.length - index} left
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent">Build the sentence</Chip>
          <WordLink lemma={task.lemma} className="ml-auto text-xs" style={{ color: "var(--ink-3)" }}>
            {task.lemma}
          </WordLink>
        </div>

        <div className="flex min-h-[300px] flex-col gap-5 px-6 py-8" aria-live="polite">
          <div className="text-center">
            {task.en ? (
              <>
                <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>Say this in Estonian</p>
                <p className="text-lg leading-snug" style={{ color: "var(--ink)" }}>{task.en}</p>
              </>
            ) : previewing ? (
              <>
                <p className="label-xs mb-2 flex items-center justify-center gap-1.5" style={{ color: "var(--ink-3)" }}>
                  <Eye size={12} aria-hidden /> Read it. The words scramble in a moment
                </p>
                <p lang="et" className="text-xl leading-snug" style={{ color: "var(--ink)" }}>
                  {task.et}
                </p>
              </>
            ) : (
              <p className="label-xs" style={{ color: "var(--ink-3)" }}>
                Now put it back together
              </p>
            )}
          </div>

          {/* What has been built so far. */}
          <div
            className={`${checked ? OPTION_CLASS[checked] : ""} flex min-h-[68px] flex-wrap content-start items-start gap-2 rounded-[var(--r)] border border-dashed p-3 transition-colors`}
            style={checked ? undefined : { borderColor: "var(--rule)", background: "transparent" }}
          >
            {built.length === 0 && (
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>Tap the words in order…</span>
            )}
            {built.map((tileIndex) => {
              const tile = tiles.find((t) => t.index === tileIndex)!;
              return (
                <button
                  key={tileIndex}
                  type="button"
                  disabled={checked !== null}
                  onClick={() => setBuilt((b) => b.filter((i) => i !== tileIndex))}
                  lang="et"
                  aria-label={`Remove ${tile.word}`}
                  className="press rounded-[var(--r-sm)] border px-3 py-1.5 text-md transition-ui hover:-translate-y-px"
                  style={{
                    borderColor: "var(--rule)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {tile.word}
                </button>
              );
            })}
          </div>

          {/* The bank of remaining words. */}
          <div className="flex flex-wrap gap-2">
            {tiles.map((tile) => {
              const used = built.includes(tile.index);
              return (
                <button
                  key={tile.index}
                  type="button"
                  disabled={used || checked !== null || previewing}
                  onClick={() => setBuilt((b) => [...b, tile.index])}
                  lang="et"
                  aria-label={`Add ${tile.word}`}
                  className="press rounded-[var(--r-sm)] border px-3 py-1.5 text-md transition-ui hover:-translate-y-px disabled:opacity-25 disabled:hover:translate-y-0"
                  style={{ borderColor: "transparent", background: "var(--raised)", color: "var(--ink)" }}
                >
                  {tile.word}
                </button>
              );
            })}
          </div>

          {checked && (
            <div className={`${VERDICT_CLASS[checked]} verdict-panel pop-in text-center`}>
              {/*
                This was `label-xs` with the transform switched off, which was
                half of a fix: the uppercase had to go because the line names
                an Estonian word and `ette` reached the screen as `ETTE`, the
                fault `Chip`'s own `caseSensitive` exists for. What stayed was
                a 12px tracked micro-label carrying a whole sentence, which is
                the caption it had just stopped being. The panel's own step is
                what it wants, and the weight is what makes it the line rather
                than the label.
              */}
              <p className="font-semibold">
                {checked === "wrong" ? ORDER_WRONG
                  : <>{uiText("Õige!", "Correct!")} {variant === null ? ORDER_EXACT : orderVariantNote(variant.moved, variant.writerPut)}</>}
              </p>
              <p className="mt-1 flex items-center justify-center gap-2">
                <span lang="et" className="text-md" style={{ color: "var(--ink)" }}>{task.et}</span>
                <Speak text={task.et} />
              </p>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          {checked ? (
            <Button variant="primary" size="lg" className="w-full" onClick={next}>
              Next sentence <ArrowRight size={15} aria-hidden />
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <HintLadder
                ladder={ladder}
                taken={hints.taken}
                onTake={hints.take}
                open={hints.open}
                label="this sentence"
              />
              <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setBuilt([])} disabled={built.length === 0}>
                <RotateCcw size={14} aria-hidden /> Clear
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => void check()}
                disabled={built.length !== tiles.length || busy}
              >
                <Check size={15} aria-hidden /> Check
              </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs" style={{ color: "var(--ink-3)" }}>
        <span>{correct} of {attempts} first time</span>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}
