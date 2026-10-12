"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Flame, MessageCircle, TriangleAlert, X } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { EstonianSentence } from "@/components/EstonianSentence";
import { GapMeaning } from "@/components/GapMeaning";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { WayOut } from "@/components/round/RoundExit";
import { RoundProgress } from "@/components/round/RoundProgress";
import { gapMeaning } from "@/lib/copy/gapMeaning";
import { OPTION_CLASS, VERDICT_CLASS, VERDICT_INK, optionState } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import {
  isFit, isGuessRight, isMatch, isRight,
  type FillQuestion, type FitQuestion, type SayingsPlan, type SeeStep,
} from "@/lib/games/sayings";

/** How long a wrong pair stays marked before the board hands it back. Matches `shake`. */
const SHAKE_MS = 420;

/** From how many right answers in a row the flame shows. */
const STREAK_FROM = 2;

type Phase = "see" | "match" | "fit" | "fill" | "done";

/**
 * SAYINGS, PLAYED. Four steps, each one thing to do, and as little to read as
 * the step allows.
 *
 * UNPACK: one saying at a time, on one card that changes as it is played. Its
 * words are tiles that turn over to what each says on its own, so the literal
 * reading is built by the learner's own taps and lands as a quote with a
 * wobble. Then they guess what it really means. Then the literal reading is
 * crossed out and the real meaning stamps in over it, with the situation it
 * is said in and the recorded sentence underneath. MATCH: the five phrases
 * against their five meanings. FIT: each situation put as a question, with
 * the sayings of the sitting to pick from. FILL: each saying again in a real
 * sentence with its second word missing.
 *
 * Every answer is told in one line, the same line everywhere: the saying,
 * what it says word for word crossed out, and what it means. The verdict a
 * screen reader hears is a sentence, read out in a live region.
 *
 * The guess is not marked against anyone and not asked twice. A wrong
 * situation or blank goes to the back of the queue and is asked again before
 * the sitting ends, so a saying is only done once it has been got right.
 *
 * Nothing is written to the review log: a saying is not a card (see the page).
 */
export function SayingsSession({ plan: initial, nextSet, canTranslate }: {
  plan: SayingsPlan | null;
  /** The sitting "another set" opens. */
  nextSet: number;
  canTranslate: boolean;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  // Snapshotted once: the plan is shuffled on the server and a refresh must not reshuffle it under the learner.
  const [plan] = useState(initial);
  const [phase, setPhase] = useState<Phase>("see");

  const [seeAt, setSeeAt] = useState(0);
  const [tapped, setTapped] = useState<Set<number>>(() => new Set());
  const [guess, setGuess] = useState<string | null>(null);
  const [guessedFirst, setGuessedFirst] = useState<Set<string>>(() => new Set());

  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [pickedPhrase, setPickedPhrase] = useState<string | null>(null);
  const [pickedMeaning, setPickedMeaning] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{ phrase: string; meaning: string } | null>(null);
  const [said, setSaid] = useState("");
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fitQueue, setFitQueue] = useState<FitQuestion[]>(() => (initial ? [...initial.fit] : []));
  const [fitPicked, setFitPicked] = useState<string | null>(null);
  const [fitMissed, setFitMissed] = useState<Set<string>>(() => new Set());

  const [queue, setQueue] = useState<FillQuestion[]>(() => (initial ? [...initial.fill] : []));
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<Set<string>>(() => new Set());
  const revealed = picked !== null;

  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const counted = useCallback((right: boolean) => {
    setStreak((s) => {
      const next = right ? s + 1 : 0;
      setBest((b) => Math.max(b, next));
      return next;
    });
  }, []);

  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); }, []);

  const step: SeeStep | undefined = plan?.see[seeAt];
  const allTapped = step ? tapped.size >= step.words.length : false;

  const tapWord = useCallback((i: number) => {
    if (!step) return;
    setTapped((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
    setSaid(`${step.words[i]?.word ?? ""}: ${t(step.words[i]?.gloss ?? "", "saying")}`);
  }, [step, t]);

  const tapAll = useCallback(() => {
    if (!step) return;
    setTapped(new Set(step.words.map((_, i) => i)));
    setSaid(t(step.literal));
  }, [step, t]);

  const pickGuess = useCallback((option: string) => {
    if (!step || guess !== null) return;
    const right = isGuessRight(step, option);
    sound(right ? "right" : "wrong");
    if (right) setGuessedFirst((g) => new Set(g).add(step.id));
    setGuess(option);
  }, [step, guess, sound]);

  const nextSaying = useCallback(() => {
    if (!plan) return;
    if (seeAt + 1 < plan.see.length) {
      setSeeAt(seeAt + 1);
      setTapped(new Set());
      setGuess(null);
    } else {
      setPhase("match");
    }
  }, [plan, seeAt]);

  const tapPair = useCallback((phraseId: string | null, meaningId: string | null) => {
    if (!plan || phraseId === null || meaningId === null) return;
    if (isMatch(phraseId, meaningId)) {
      sound("right");
      setMatched((m) => new Set(m).add(phraseId));
      setSaid(t("Matched."));
      setPickedPhrase(null);
      setPickedMeaning(null);
      return;
    }
    sound("wrong");
    setSaid(t("Not those two."));
    setWrongPair({ phrase: phraseId, meaning: meaningId });
    setPickedPhrase(null);
    setPickedMeaning(null);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => setWrongPair(null), SHAKE_MS);
  }, [plan, sound, t]);

  const choosePhrase = (id: string) => {
    if (matched.has(id)) return;
    const next = pickedPhrase === id ? null : id;
    setPickedPhrase(next);
    if (next) tapPair(next, pickedMeaning);
  };
  const chooseMeaning = (id: string) => {
    if (matched.has(id)) return;
    const next = pickedMeaning === id ? null : id;
    setPickedMeaning(next);
    if (next) tapPair(pickedPhrase, next);
  };

  const fitQuestion = fitQueue[0];
  const fitRevealed = fitPicked !== null;
  const chooseFit = useCallback((id: string) => {
    if (!fitQuestion || fitRevealed) return;
    const right = isFit(fitQuestion, id);
    sound(right ? "right" : "wrong");
    counted(right);
    if (!right) setFitMissed((m) => new Set(m).add(fitQuestion.id));
    setFitPicked(id);
  }, [fitQuestion, fitRevealed, sound, counted]);

  const nextFit = useCallback(() => {
    if (!fitQuestion || fitPicked === null) return;
    const right = isFit(fitQuestion, fitPicked);
    setFitPicked(null);
    setFitQueue((q) => (right ? q.slice(1) : [...q.slice(1), q[0]!]));
  }, [fitQuestion, fitPicked]);

  const question = queue[0];
  const choose = useCallback((option: string) => {
    if (!question || revealed) return;
    const right = isRight(question, option);
    sound(right ? "right" : "wrong");
    counted(right);
    if (!right) setMissed((m) => new Set(m).add(question.id));
    setPicked(option);
  }, [question, revealed, sound, counted]);

  const next = useCallback(() => {
    if (!question || picked === null) return;
    const right = isRight(question, picked);
    setPicked(null);
    setQueue((q) => (right ? q.slice(1) : [...q.slice(1), q[0]!]));
  }, [question, picked]);

  useEffect(() => {
    if (phase === "fit" && fitQueue.length === 0) setPhase("fill");
  }, [phase, fitQueue.length]);

  useEffect(() => {
    if (phase === "fill" && queue.length === 0) setPhase("done");
  }, [phase, queue.length]);

  const allMatched = plan ? matched.size === plan.match.phrases.length : false;

  useEffect(() => {
    if (!plan) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (phase === "see" && step) {
        if (!allTapped) {
          // A tile that has the keyboard answers its own Enter; this is for everywhere else.
          if (target?.closest?.("[data-saying-word]")) return;
          // One key, one word, so a keyboard turns them in order the way a finger would.
          if (isAdvanceKey(e)) {
            e.preventDefault();
            const next = step.words.findIndex((_, i) => !tapped.has(i));
            if (next >= 0) tapWord(next);
          }
          return;
        }
        if (guess === null) {
          const option = step.guesses[Number(e.key) - 1];
          if (option) { e.preventDefault(); pickGuess(option); }
          return;
        }
        if (isAdvanceKey(e)) { e.preventDefault(); nextSaying(); }
        return;
      }
      if (phase === "match" && allMatched && isAdvanceKey(e)) { e.preventDefault(); setPhase("fit"); return; }
      if (phase === "fit" && fitQuestion) {
        if (fitRevealed && isAdvanceKey(e)) { e.preventDefault(); nextFit(); return; }
        if (fitRevealed) return;
        const option = fitQuestion.options[Number(e.key) - 1];
        if (option) { e.preventDefault(); chooseFit(option.id); }
        return;
      }
      if (phase === "fill" && question) {
        if (revealed && isAdvanceKey(e)) { e.preventDefault(); next(); return; }
        if (revealed) return;
        const option = question.options[Number(e.key) - 1];
        if (option) { e.preventDefault(); choose(option); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    plan, phase, step, tapped, allTapped, guess, allMatched, fitQuestion, fitRevealed, question, revealed,
    tapWord, pickGuess, nextSaying, chooseFit, nextFit, choose, next,
  ]);

  if (!plan) {
    return (
      <Page title="Väljendid" lead={t("Verb pairs that don't mean what they say.")}>
        <Empty
          title={t("No sayings to show yet")}
          body={t("They need the full dictionary.")}
          action={<ButtonLink href="/practice" variant="primary">{t("Back to practice")}</ButtonLink>}
        />
      </Page>
    );
  }

  const total = plan.see.length;
  const doneCount = phase === "see"
    ? seeAt + (guess !== null ? 1 : 0)
    : phase === "match" ? total + matched.size
      : phase === "fit" ? 2 * total + (total - fitQueue.length)
        : 3 * total + (total - queue.length);
  const steps = total * 4;

  if (phase === "done") {
    const slipped = new Set([...missed, ...fitMissed]);
    return (
      <DoneScreen
        plan={plan}
        guessed={guessedFirst.size}
        firstTime={total - slipped.size}
        best={best}
        nextSet={nextSet}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Väljendid</h1>
      <RoundProgress done={doneCount} total={steps} left={steps - doneCount} label={t("Session progress")} />
      <span className="sr-only" role="status">{said}</span>

      {phase === "see" && step && (
        <UnpackCard
          key={step.id}
          step={step}
          index={seeAt}
          total={total}
          tapped={tapped}
          allTapped={allTapped}
          guess={guess}
          canTranslate={canTranslate}
          isLast={seeAt + 1 >= total}
          onTap={tapWord}
          onTapAll={tapAll}
          onGuess={pickGuess}
          onNext={nextSaying}
        />
      )}

      {phase === "match" && (
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
        >
          <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
            <Chip tone="accent">{t("Match")}</Chip>
            <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
              {fill(t("{n} of {total} matched"), { n: matched.size, total })}
            </span>
          </div>
          <div className="px-6 pt-6 text-center">
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("Which means which?")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6">
            <div className="flex flex-col gap-2.5">
              {plan.match.phrases.map((p) => {
                const isDone = matched.has(p.id);
                const isPicked = pickedPhrase === p.id;
                const isWrong = wrongPair?.phrase === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    lang="et"
                    disabled={isDone}
                    aria-pressed={isPicked}
                    onClick={() => choosePhrase(p.id)}
                    className={`choice-btn ${isDone ? `pop-in ${OPTION_CLASS.right}` : isWrong ? `shake ${OPTION_CLASS.wrong}` : ""} flex min-h-[64px] items-center justify-center rounded-md border px-3 py-3 text-center text-md font-semibold disabled:cursor-default`}
                    style={isDone || isWrong ? undefined : {
                      "--choice-bg": isPicked ? "var(--accent-deep)" : "var(--accent-soft)",
                      color: isPicked ? "var(--accent-ink)" : "var(--accent-deep)",
                    } as React.CSSProperties}
                  >
                    {p.phrase}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2.5">
              {plan.match.meanings.map((m) => {
                const isDone = matched.has(m.id);
                const isPicked = pickedMeaning === m.id;
                const isWrong = wrongPair?.meaning === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isDone}
                    aria-pressed={isPicked}
                    onClick={() => chooseMeaning(m.id)}
                    className={`choice-btn ${isDone ? `pop-in ${OPTION_CLASS.right}` : isWrong ? `shake ${OPTION_CLASS.wrong}` : ""} flex min-h-[64px] items-center justify-center rounded-md border px-3 py-3 text-center text-base disabled:cursor-default`}
                    style={isDone || isWrong ? undefined : {
                      "--choice-bg": isPicked ? "var(--accent-deep)" : "var(--raised)",
                      color: isPicked ? "var(--accent-ink)" : "var(--ink)",
                    } as React.CSSProperties}
                  >
                    {t(m.means)}
                  </button>
                );
              })}
            </div>
          </div>

          {allMatched && (
            <div className="flex items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <p className="pop-in flex items-center gap-2 text-md font-semibold" style={{ color: VERDICT_INK.right }}>
                <Check size={18} aria-hidden /> {t("All matched!")}
              </p>
              <Button variant="primary" onClick={() => setPhase("fit")} autoFocus>
                {t("Continue")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === "fit" && fitQuestion && (
        <FitCard
          question={fitQuestion}
          picked={fitPicked}
          revealed={fitRevealed}
          streak={streak}
          isLast={fitQueue.length === 1 && (fitPicked === null || isFit(fitQuestion, fitPicked))}
          onChoose={chooseFit}
          onNext={nextFit}
        />
      )}

      {phase === "fill" && question && (
        <FillCard
          question={question}
          picked={picked}
          revealed={revealed}
          streak={streak}
          isLast={queue.length === 1 && (picked === null || isRight(question, picked))}
          canTranslate={canTranslate}
          onChoose={choose}
          onNext={next}
        />
      )}
    </div>
  );
}

/**
 * One line that says a saying all three ways: the Estonian, what it says word
 * for word crossed out, and what it means. It is how every answer in the round
 * is told, so the learner meets the same shape on every screen.
 */
function MeaningLine({ phrase, literal, means, className = "" }: {
  phrase: string;
  literal: string;
  means: string;
  className?: string;
}) {
  const t = useT();
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${className}`}>
      <span lang="et" className="font-bold">{phrase}</span>
      <span className="sr-only">{t("word for word")}</span>
      <s className="text-base" style={{ color: "var(--ink-3)" }}>{t(literal)}</s>
      <ArrowRight size={16} className="self-center" aria-hidden />
      <span className="sr-only">{t("really")}</span>
      <span className="font-semibold">{t(means)}</span>
    </p>
  );
}

/** A small flame and a count, from the second right answer in a row. */
function Streak({ n }: { n: number }) {
  const t = useT();
  if (n < STREAK_FROM) return null;
  return (
    <span key={n} className="pop-in ml-auto inline-flex items-center gap-1 text-sm font-semibold tnum" style={{ color: "var(--hard-ink)" }}>
      <Flame size={16} aria-hidden /> {fill(t("{n} in a row"), { n })}
    </span>
  );
}

/**
 * One saying, unpacked on one card. The words are tiles that turn over to what
 * each says on its own; with all of them turned, the literal reading lands as a
 * quote and the guess is asked under it. Once the guess is in, the literal is
 * crossed out and the real meaning stamps in on top, with the situation it is
 * said in and the sentence it was met in.
 */
function UnpackCard({
  step, index, total, tapped, allTapped, guess, canTranslate, isLast,
  onTap, onTapAll, onGuess, onNext,
}: {
  step: SeeStep;
  index: number;
  total: number;
  tapped: ReadonlySet<number>;
  allTapped: boolean;
  guess: string | null;
  canTranslate: boolean;
  isLast: boolean;
  onTap: (i: number) => void;
  onTapAll: () => void;
  onGuess: (option: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const answered = guess !== null;
  const right = answered && isGuessRight(step, guess);
  const verdict = right
    ? fill(t("Yes. It really means “{means}”."), { means: t(step.means) })
    : fill(t("Not that one. It really means “{means}”."), { means: t(step.means) });

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
    >
      <p className="sr-only" aria-live="polite">{answered ? verdict : ""}</p>
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{t("Saying")}</Chip>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("{n} of {total}"), { n: index + 1, total })}
        </span>
      </div>

      <div className="px-5 py-6 text-center sm:px-6">
        {!allTapped && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Tap each word. What does it say?")}</p>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {step.words.map((w, i) => {
            const turned = tapped.has(i);
            const gloss = t(w.gloss, "saying");
            return (
              <button
                key={i}
                type="button"
                data-saying-word
                disabled={turned}
                aria-pressed={turned}
                aria-label={turned ? `${w.word}: ${gloss}` : fill(t("{word}: tap to see what it says on its own"), { word: w.word })}
                onClick={() => onTap(i)}
                className="say-flip rounded-lg disabled:cursor-default"
              >
                <span className="say-flip-inner" data-flipped={turned}>
                  <span
                    aria-hidden
                    className="flex min-h-[5.5rem] min-w-[6rem] flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-3"
                    style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                  >
                    <span lang="et" className="text-2xl font-bold">{w.word}</span>
                  </span>
                  <span
                    aria-hidden
                    className="say-flip-back flex min-h-[5.5rem] min-w-[6rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-4 py-3"
                    style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
                  >
                    <span lang="et" className="text-sm" style={{ color: "var(--ink-3)" }}>{w.word}</span>
                    <span className="text-lg font-bold">{gloss}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {allTapped && (
          <div className="mt-6">
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Word for word")}</p>
            <p className={`mt-1 inline-block text-xl font-bold ${answered ? "" : "say-wobble"}`} style={{ color: answered ? "var(--ink-3)" : "var(--ink)" }}>
              <span className="say-strike" data-struck={answered}>“{t(step.literal)}”</span>
              {!answered && <span style={{ color: "var(--accent-deep)" }}> ?!</span>}
            </p>
          </div>
        )}

        {answered && (
          <div className="mt-3">
            <p className="label-xs" style={{ color: "var(--accent-deep)" }}>{t("Really")}</p>
            <p className="say-stamp mt-1 inline-block rounded-md border-2 px-4 py-1.5 text-2xl font-bold" style={{ borderColor: "var(--accent-deep)", color: "var(--accent-deep)", background: "var(--accent-soft)" }}>
              {t(step.means)}
            </p>
            <p className="pop-in mt-3 inline-flex items-center gap-1.5 text-md font-semibold" style={{ color: right ? VERDICT_INK.right : "var(--ink-2)" }}>
              {right ? <Check size={16} aria-hidden /> : null}
              {right ? t("You guessed it!") : t("Tricky one. Most people read it word for word.")}
            </p>
          </div>
        )}

        {allTapped && !answered && (
          <div className="mt-6 text-left">
            <p className="mb-3 text-center text-md font-semibold" style={{ color: "var(--ink)" }}>{t("So what does it really mean?")}</p>
            <div className="choice-grid">
              {step.guesses.map((option, i) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onGuess(option)}
                  className="choice-btn flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left"
                  style={{ "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
                >
                  <KeyCap>{i + 1}</KeyCap>
                  <span className="min-w-0 text-base font-semibold">{t(option)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!allTapped && (
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onTapAll}>
              {t("Turn them all")}
            </Button>
          </div>
        )}
      </div>

      {answered && (
        <div className="border-t px-5 py-5 sm:px-6" style={{ borderColor: "var(--rule-soft)" }}>
          <p className="flex items-start gap-2.5 text-base" style={{ color: "var(--ink-2)" }}>
            <MessageCircle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} aria-hidden />
            <span><span className="sr-only">{t("When you'd say it")}: </span>{t(step.when)}</span>
          </p>
          {step.note && (
            <p className="mt-2 flex items-start gap-2.5 text-sm" style={{ color: "var(--ink-2)" }}>
              <TriangleAlert size={16} className="mt-0.5 shrink-0" style={{ color: "var(--hard-ink)" }} aria-hidden />
              <span>{t(step.note)}</span>
            </p>
          )}
          <div className="mt-4 rounded-lg px-4 py-3" style={{ background: "var(--raised)" }}>
            <EstonianSentence
              et={step.sentence.et}
              en={step.sentence.en}
              lexemeId={step.sentence.lexemeId}
              canTranslate={canTranslate}
              form={step.sentence.run}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={onNext} autoFocus>
              {isLast ? t("Match them") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A situation put to the learner, who picks the saying a person would reach
 * for. Wrong ones come round again. The answer is told in one line.
 */
function FitCard({ question, picked, revealed, streak, isLast, onChoose, onNext }: {
  question: FitQuestion;
  picked: string | null;
  revealed: boolean;
  streak: number;
  isLast: boolean;
  onChoose: (id: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const right = picked !== null && isFit(question, picked);
  const verdict = right
    ? fill(t("Right. “{phrase}” means “{means}”."), { phrase: question.phrase, means: t(question.means) })
    : fill(t("Not quite. It's “{phrase}”, which means “{means}”."), { phrase: question.phrase, means: t(question.means) });
  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
    >
      <p className="sr-only" aria-live="polite">{revealed ? verdict : ""}</p>
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{t("What would you say?")}</Chip>
        <Streak n={streak} />
      </div>

      <div className="px-5 pt-6 sm:px-6">
        <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl rounded-bl-sm px-4 py-4" style={{ background: "var(--accent-soft)" }}>
          <MessageCircle size={22} className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} aria-hidden />
          <p className="text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}>{t(question.when)}</p>
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="choice-grid">
          {question.options.map((option, i) => {
            const isAnswer = option.id === question.id;
            const state = revealed ? OPTION_CLASS[optionState(isAnswer, option.id === picked)] : "";
            return (
              <button
                key={option.id}
                type="button"
                lang="et"
                disabled={revealed}
                onClick={() => onChoose(option.id)}
                className={`choice-btn ${state} flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left disabled:cursor-default`}
                style={revealed ? undefined : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
              >
                <KeyCap>{i + 1}</KeyCap>
                <span className="min-w-0 text-md font-semibold">{option.phrase}</span>
                {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label={t("Right")} />}
                {revealed && option.id === picked && !isAnswer && <X size={16} className="ml-auto shrink-0" aria-label={t("Wrong")} />}
              </button>
            );
          })}
        </div>
      </div>

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          <MeaningLine
            phrase={question.phrase}
            literal={question.literal}
            means={question.means}
            className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel min-w-0 flex-1`}
          />
          <Button variant="primary" onClick={onNext} autoFocus>
            {isLast ? t("Finish") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * A saying in a real sentence with its second word missing. After the answer,
 * the sentence whole with its English, and the saying told in one line.
 */
function FillCard({ question, picked, revealed, streak, isLast, canTranslate, onChoose, onNext }: {
  question: FillQuestion;
  picked: string | null;
  revealed: boolean;
  streak: number;
  isLast: boolean;
  canTranslate: boolean;
  onChoose: (option: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const right = picked !== null && isRight(question, picked);
  const meaning = gapMeaning({ en: question.sentence.en, answer: question.answer, cue: null });
  const verdict = right
    ? fill(t("Right. “{phrase}” means “{means}”."), { phrase: question.phrase, means: t(question.means) })
    : fill(t("Not quite. It's “{phrase}”, which means “{means}”."), { phrase: question.phrase, means: t(question.means) });
  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
    >
      {/* Mounted with the card and filled when the answer is in, so the verdict is read out. */}
      <p className="sr-only" aria-live="polite">{revealed ? verdict : ""}</p>
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{t("Fill the gap")}</Chip>
        <Streak n={streak} />
      </div>

      <div className="px-6 py-6 text-center">
        {revealed ? (
          <div className="text-left">
            <EstonianSentence
              et={question.sentence.et}
              en={question.sentence.en}
              lexemeId={question.sentence.lexemeId}
              canTranslate={canTranslate}
              form={question.sentence.run}
            />
          </div>
        ) : (
          <>
            <p lang="et" className="text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }}>
              {question.before}
              <span
                aria-label={t("blank")}
                className="mx-1 inline-block min-w-[4.5rem] border-b-2 align-baseline"
                style={{ borderColor: "var(--accent-deep)" }}
              >
                &nbsp;
              </span>
              {question.after}
            </p>
            {!revealed && meaning && <GapMeaning meaning={meaning} className="mt-3 text-base leading-snug" />}
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="choice-grid">
          {question.options.map((option, i) => {
            const isAnswer = option === question.answer;
            const state = revealed ? OPTION_CLASS[optionState(isAnswer, option === picked)] : "";
            return (
              <button
                key={option}
                type="button"
                lang="et"
                disabled={revealed}
                onClick={() => onChoose(option)}
                className={`choice-btn ${state} flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left disabled:cursor-default`}
                style={revealed ? undefined : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
              >
                <KeyCap>{i + 1}</KeyCap>
                <span className="min-w-0 text-base font-semibold">{option}</span>
                {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label={t("Right")} />}
                {revealed && option === picked && !isAnswer && <X size={16} className="ml-auto shrink-0" aria-label={t("Wrong")} />}
              </button>
            );
          })}
        </div>
      </div>

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          <MeaningLine
            phrase={question.phrase}
            literal={question.literal}
            means={question.means}
            className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel min-w-0 flex-1`}
          />
          <Button variant="primary" onClick={onNext} autoFocus>
            {isLast ? t("Finish") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The end of a sitting: the five as cards that turn over, Estonian on the
 * front and the crossed-out literal with the real meaning on the back, so
 * the last thing done is one more recall rather than a list to read.
 */
function DoneScreen({ plan, guessed, firstTime, best, nextSet }: {
  plan: SayingsPlan;
  guessed: number;
  firstTime: number;
  best: number;
  nextSet: number;
}) {
  const t = useT();
  const total = plan.see.length;
  const [turned, setTurned] = useState<Set<string>>(() => new Set());
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
      <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
        <Mascot size={68} mood="cheer" className="float mx-auto" />
        <h1 className="font-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={{ color: "var(--ink)" }}>
          {t("That's the set done")}
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>{t("Turn each card. Do you still know it?")}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plan.see.map((s) => {
          const on = turned.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              aria-label={on ? `${s.phrase}: ${t(s.means)}` : s.phrase}
              onClick={() => setTurned((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
              className="say-flip text-left"
            >
              <span className="say-flip-inner" data-flipped={on}>
                <span
                  aria-hidden
                  className="flex min-h-[6.5rem] items-center justify-center rounded-lg border-2 px-4 py-4 text-center"
                  style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                >
                  <span lang="et" className="text-xl font-bold">{s.phrase}</span>
                </span>
                <span
                  aria-hidden
                  className="say-flip-back flex min-h-[6.5rem] flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-4 text-center"
                  style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
                >
                  <s className="text-sm" style={{ color: "var(--ink-3)" }}>{t(s.literal)}</s>
                  <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t(s.means)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile value={`${guessed} / ${total}`} label={t("Guessed before reading")} tone="sky" />
        <StatTile value={`${firstTime} / ${total}`} label={t("First time")} tone="sky" />
        <StatTile value={best} label={t("Best streak")} tone="sky" />
      </div>
      <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">{t("Back to Today")}</ButtonLink>
        <ButtonLink href={`/review/sayings?set=${nextSet}`} variant="primary" size="lg">{t("Another set")}</ButtonLink>
      </WayOut>
    </div>
  );
}
