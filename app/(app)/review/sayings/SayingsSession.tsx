"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Lightbulb, X } from "lucide-react";
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
import { OPTION_CLASS, VERDICT_CLASS, optionState } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import {
  isFit, isGuessRight, isMatch, isRight,
  type FillQuestion, type FitQuestion, type SayingsPlan, type SeeStep,
} from "@/lib/games/sayings";

/** How long a wrong pair stays marked before the board hands it back. Matches `shake`. */
const SHAKE_MS = 420;

type Phase = "see" | "match" | "fit" | "fill" | "done";
/** Within unpacking a saying: tap its words, then guess what it means. The truth shows once the guess is in. */
type SeeStage = "words" | "guess";

/**
 * SAYINGS, PLAYED. Four steps and one thing to do on each.
 *
 * UNPACK: one saying at a time. Its words are tapped one by one and each says
 * what it means on its own, so the literal reading builds up in front of the
 * learner (the trap). Then they guess what it really means, from the meanings
 * of the five in the sitting, and only then are told: the real meaning beside
 * the word-for-word one, the situation it is said in, anything to mind about
 * it and the recorded sentence it was met in. MATCH: the five phrases against
 * their five meanings. FIT: each situation put as a question, with the
 * sayings of the sitting to pick from. FILL: each saying again in a real
 * sentence with its second word missing, a different sentence from the one it
 * was met in wherever the dictionary has two.
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
  const [stage, setStage] = useState<SeeStage>("words");
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
      setStage("words");
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
    if (!right) setFitMissed((m) => new Set(m).add(fitQuestion.id));
    setFitPicked(id);
  }, [fitQuestion, fitRevealed, sound]);

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
    if (!right) setMissed((m) => new Set(m).add(question.id));
    setPicked(option);
  }, [question, revealed, sound]);

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
        if (stage === "words") {
          // A word that has the keyboard answers its own Enter; this is for everywhere else.
          if (target?.closest?.("[data-saying-word]")) return;
          const n = Number(e.key);
          if (Number.isInteger(n) && n >= 1 && n <= step.words.length) { e.preventDefault(); tapWord(n - 1); return; }
          if (isAdvanceKey(e)) {
            e.preventDefault();
            if (allTapped) setStage("guess"); else tapAll();
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
    plan, phase, step, stage, tapped, allTapped, guess, allMatched, fitQuestion, fitRevealed, question, revealed,
    tapWord, tapAll, pickGuess, nextSaying, chooseFit, nextFit, choose, next,
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
    ? seeAt + (stage === "guess" && guess !== null ? 1 : 0)
    : phase === "match" ? total + matched.size
      : phase === "fit" ? 2 * total + (total - fitQueue.length)
        : 3 * total + (total - queue.length);
  const steps = total * 4;

  if (phase === "done") {
    const slipped = new Set([...missed, ...fitMissed]);
    const firstTime = total - slipped.size;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <Mascot size={68} mood="cheer" className="float mx-auto" />
          <h1 className="font-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={{ color: "var(--ink)" }}>
            {t("That's the set done")}
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
            {slipped.size === 0
              ? t("Every one on the first try.")
              : fill(t("{n} of {total} on the first try. The rest came round again until they stuck."), { n: firstTime, total })}
          </p>
        </div>

        <ul className="mt-8 flex flex-col gap-3">
          {plan.see.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span lang="et" className="text-md font-semibold" style={{ color: "var(--ink)" }}>{s.phrase}</span>
                <span className="text-base" style={{ color: "var(--ink-2)" }}>{t(s.means)}</span>
              </div>
              <span className="text-sm" style={{ color: "var(--ink-3)" }}>
                {fill(t("Word for word: {literal}."), { literal: t(s.literal) })}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile value={`${guessedFirst.size} / ${total}`} label={t("Guessed before reading")} tone="sky" />
          <StatTile value={firstTime} label={t("First time")} tone="sky" />
          <StatTile value={total} label={t("Sayings")} tone="sky" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">{t("Back to Today")}</ButtonLink>
          <ButtonLink href={`/review/sayings?set=${nextSet}`} variant="primary" size="lg">{t("Another set")}</ButtonLink>
        </WayOut>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Väljendid</h1>
      <RoundProgress done={doneCount} total={steps} left={steps - doneCount} label={t("Session progress")} />
      <span className="sr-only" role="status">{said}</span>

      {phase === "see" && step && (
        <UnpackCard
          step={step}
          index={seeAt}
          total={total}
          stage={stage}
          tapped={tapped}
          allTapped={allTapped}
          guess={guess}
          canTranslate={canTranslate}
          onTap={tapWord}
          onTapAll={tapAll}
          onToGuess={() => setStage("guess")}
          onGuess={pickGuess}
          onNext={nextSaying}
          isLast={seeAt + 1 >= total}
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
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{t("Tap a saying, then its meaning.")}</p>
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
            <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <div className={`${VERDICT_CLASS.right} verdict-panel flex items-start gap-2.5`}>
                <Check size={18} className="mt-0.5 shrink-0" aria-hidden />
                <p>{t("All matched. Next, which one would you say?")}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={() => setPhase("fit")} autoFocus>
                  {t("Continue")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "fit" && fitQuestion && (
        <FitCard
          question={fitQuestion}
          picked={fitPicked}
          revealed={fitRevealed}
          isLast={fitQueue.length === 1 && (fitPicked === null || isFit(fitQuestion, fitPicked))}
          canTranslate={canTranslate}
          onChoose={chooseFit}
          onNext={nextFit}
        />
      )}

      {phase === "fill" && question && (
        <FillCard
          question={question}
          picked={picked}
          revealed={revealed}
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
 * One saying, unpacked. First its words: each is a button that says what that
 * word means on its own when it is pressed, and the literal reading builds up
 * underneath as they are. Then the guess, with the sitting's meanings to pick
 * from. Once the guess is in, the truth is drawn under it in place: what it
 * really means beside what it said, where a person says it, anything to mind,
 * and the sentence it was met in with its English.
 */
function UnpackCard({
  step, index, total, stage, tapped, allTapped, guess, canTranslate, isLast,
  onTap, onTapAll, onToGuess, onGuess, onNext,
}: {
  step: SeeStep;
  index: number;
  total: number;
  stage: SeeStage;
  tapped: ReadonlySet<number>;
  allTapped: boolean;
  guess: string | null;
  canTranslate: boolean;
  isLast: boolean;
  onTap: (i: number) => void;
  onTapAll: () => void;
  onToGuess: () => void;
  onGuess: (option: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const answered = guess !== null;
  const right = answered && isGuessRight(step, guess);
  const verdict = right
    ? fill(t("Yes. It really means “{means}”."), { means: t(step.means) })
    : fill(t("Not that one. It really means “{means}”."), { means: t(step.means) });
  const building = step.words.map((w, i) => (tapped.has(i) ? t(w.gloss, "saying") : "…")).join(" ");

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

      {stage === "words" && (
        <div className="px-6 py-6 text-center">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Tap each word to see what it says on its own.")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {step.words.map((w, i) => {
              const isTapped = tapped.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  data-saying-word
                  aria-pressed={isTapped}
                  aria-label={isTapped ? `${w.word}: ${t(w.gloss, "saying")}` : fill(t("{word}: tap to see what it says on its own"), { word: w.word })}
                  onClick={() => onTap(i)}
                  className={`choice-btn ${isTapped ? "pop-in" : ""} flex min-w-[5.5rem] flex-col items-center gap-1 rounded-md border px-4 py-3`}
                  style={{
                    "--choice-bg": isTapped ? "var(--accent-soft)" : "var(--raised)",
                    color: isTapped ? "var(--accent-deep)" : "var(--ink)",
                  } as React.CSSProperties}
                >
                  <span lang="et" className="text-xl font-bold">{w.word}</span>
                  <span className="min-h-[1.5rem] text-base font-semibold" aria-hidden>
                    {isTapped ? t(w.gloss, "saying") : "?"}
                  </span>
                  {step.words.length > 1 && <KeyCap>{i + 1}</KeyCap>}
                </button>
              );
            })}
          </div>

          <div className="mt-6 min-h-[4.5rem]">
            {tapped.size > 0 && !allTapped && (
              <p className="text-md font-semibold" style={{ color: "var(--ink-2)" }}>{building}</p>
            )}
            {allTapped && (
              <div className="pop-in mx-auto max-w-sm rounded-md border border-dashed px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
                <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Word for word")}</p>
                <p className="mt-1 text-lg font-semibold" style={{ color: "var(--ink)" }}>{t(step.literal)}</p>
              </div>
            )}
          </div>

          {allTapped && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>{t("Does that sound right? Take a guess.")}</p>
          )}

          <div className="mt-6 flex justify-end">
            {allTapped ? (
              <Button variant="primary" onClick={onToGuess} autoFocus>
                {t("Guess what it means")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            ) : (
              <Button variant="ghost" onClick={onTapAll}>
                {t("Show all the words")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            )}
          </div>
        </div>
      )}

      {stage === "guess" && (
        <div>
          <div className="px-6 pt-6 text-center">
            <p lang="et" className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{step.phrase}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
              {fill(t("Word for word: {literal}."), { literal: t(step.literal) })}
            </p>
            <p className="mt-4 text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("So what does it really mean?")}</p>
          </div>

          <div className="px-4 pb-4 pt-4">
            <div className="choice-grid">
              {step.guesses.map((option, i) => {
                const isAnswer = option === step.means;
                const state = answered ? OPTION_CLASS[optionState(isAnswer, option === guess)] : "";
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={answered}
                    onClick={() => onGuess(option)}
                    className={`choice-btn ${state} flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left disabled:cursor-default`}
                    style={answered ? undefined : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
                  >
                    <KeyCap>{i + 1}</KeyCap>
                    <span className="min-w-0 text-base font-semibold">{t(option)}</span>
                    {answered && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label={t("Right")} />}
                    {answered && option === guess && !isAnswer && <X size={16} className="ml-auto shrink-0" aria-label={t("Wrong")} />}
                  </button>
                );
              })}
            </div>
          </div>

          {answered && (
            <div className="border-t px-6 py-5" style={{ borderColor: "var(--rule-soft)" }}>
              <div className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel flex items-start gap-2.5`}>
                {right ? <Check size={18} className="mt-0.5 shrink-0" aria-hidden /> : <X size={18} className="mt-0.5 shrink-0" aria-hidden />}
                <p>{verdict}</p>
              </div>

              <div className="pop-in mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-dashed p-3" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
                  <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Word for word")}</p>
                  <p className="mt-1 text-md font-semibold" style={{ color: "var(--ink-2)" }}>{t(step.literal)}</p>
                </div>
                <div className="rounded-md border p-3" style={{ borderColor: "var(--rule)", background: "var(--accent-soft)" }}>
                  <p className="label-xs" style={{ color: "var(--accent-deep)" }}>{t("What it really means")}</p>
                  <p className="mt-1 text-md font-semibold" style={{ color: "var(--ink)" }}>{t(step.means)}</p>
                </div>
              </div>

              <div className="mt-3 rounded-md border p-3" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
                <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("When you'd say it")}</p>
                <p className="mt-1 text-base" style={{ color: "var(--ink)" }}>{t(step.when)}</p>
              </div>

              {step.note && (
                <div className="mt-3 flex items-start gap-2.5 rounded-md border p-3" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
                  <Lightbulb size={16} className="mt-1 shrink-0" style={{ color: "var(--ink-3)" }} aria-hidden />
                  <div>
                    <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Good to know")}</p>
                    <p className="mt-1 text-base" style={{ color: "var(--ink)" }}>{t(step.note)}</p>
                  </div>
                </div>
              )}

              <div className="mt-4">
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
      )}
    </div>
  );
}

/**
 * A situation put to the learner, who picks the saying a person would reach
 * for. Wrong ones come round again. After the answer it shows what the saying
 * means and the sentence it was met in.
 */
function FitCard({ question, picked, revealed, isLast, canTranslate, onChoose, onNext }: {
  question: FitQuestion;
  picked: string | null;
  revealed: boolean;
  isLast: boolean;
  canTranslate: boolean;
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
        <Chip tone="accent">{t("Which one fits?")}</Chip>
      </div>

      <div className="px-6 py-6 text-center">
        <div className="mx-auto max-w-md rounded-md border px-4 py-4" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
          <p className="text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}>{t(question.when)}</p>
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>{t("What would you say?")}</p>
      </div>

      <div className="px-4 pb-4">
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
                <span className="min-w-0 text-base font-semibold">{option.phrase}</span>
                {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label={t("Right")} />}
                {revealed && option.id === picked && !isAnswer && <X size={16} className="ml-auto shrink-0" aria-label={t("Wrong")} />}
              </button>
            );
          })}
        </div>
      </div>

      {revealed && (
        <div className="border-t px-6 py-5" style={{ borderColor: "var(--rule-soft)" }}>
          <div className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel flex items-start gap-2.5`}>
            {right ? <Check size={18} className="mt-0.5 shrink-0" aria-hidden /> : <X size={18} className="mt-0.5 shrink-0" aria-hidden />}
            <p>{verdict}</p>
          </div>
          <div className="mt-4">
            <EstonianSentence
              et={question.sentence.et}
              en={question.sentence.en}
              lexemeId={question.sentence.lexemeId}
              canTranslate={canTranslate}
              form={question.sentence.run}
            />
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("Word for word: {literal}."), { literal: t(question.literal) })}
          </p>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={onNext} autoFocus>
              {isLast ? t("Finish") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FillCard({ question, picked, revealed, isLast, canTranslate, onChoose, onNext }: {
  question: FillQuestion;
  picked: string | null;
  revealed: boolean;
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
      </div>

      <div className="px-6 py-6 text-center">
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Which word is missing?")}</p>
        {revealed ? null : (
          <p lang="et" className="mt-3 text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }}>
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
        )}
        {!revealed && meaning && <GapMeaning meaning={meaning} className="mt-3 text-base leading-snug" />}
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
        <div className="border-t px-6 py-5" style={{ borderColor: "var(--rule-soft)" }}>
          <div className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel flex items-start gap-2.5`}>
            {right ? <Check size={18} className="mt-0.5 shrink-0" aria-hidden /> : <X size={18} className="mt-0.5 shrink-0" aria-hidden />}
            <p>{verdict}</p>
          </div>
          <div className="mt-4">
            <EstonianSentence
              et={question.sentence.et}
              en={question.sentence.en}
              lexemeId={question.sentence.lexemeId}
              canTranslate={canTranslate}
              form={question.sentence.run}
            />
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("Word for word: {literal}."), { literal: t(question.literal) })}
          </p>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={onNext} autoFocus>
              {isLast ? t("Finish") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
