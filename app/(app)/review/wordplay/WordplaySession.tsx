"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Laugh, X } from "lucide-react";
import { AnotherRound } from "@/components/round/AnotherRound";
import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { quoted } from "@/lib/copy/values";
import { shuffle } from "@/lib/random/shuffle";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { Speak } from "@/components/Speak";
import { FitText } from "@/components/FitText";
import { lookalike } from "@/components/WordFun";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { WayOut } from "@/components/round/RoundExit";
import { RoundProgress } from "@/components/round/RoundProgress";
import { OPTION_CLASS, VERDICT_CLASS, VERDICT_INK, optionState } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import {
  fellFor, isGuessRight, isNamed, isSeenThrough,
  type ApartStep, type FriendQuestion, type NameQuestion, type WordplayPlan,
} from "@/lib/games/wordplay";

type Phase = "apart" | "name" | "friends" | "done";

/**
 * The context every line of `lib/estonian/literally.ts` is translated under, so
 * "date" the fruit of a compound and "date" on a calendar can never meet.
 */
const W = "wordplay";

/** From how many right answers in a row the little laugh shows. */
const STREAK_FROM = 2;

/**
 * SÕNAMÄNG, PLAYED. Three steps, each one thing to do.
 *
 * TAKE IT APART: one compound at a time, its pieces as tiles that turn over to
 * what each says on its own, so the funny word-for-word reading is built by the
 * learner's own taps. Then a guess at what it really means, then the reading
 * crossed out and the meaning stamped over it, with one line about the word.
 * NAME IT: the same five asked the other way round, by their literal reading.
 * DON'T BE FOOLED: three words that only look English.
 *
 * The guess is not marked against anybody: nobody can know a word before they
 * have met it, and the point of it is the surprise. A wrong name goes to the
 * back of the queue and comes round again, so a word is done once it is got
 * right. Every verdict is a sentence in a live region as well as a colour.
 *
 * The humour is in the words and the one line under each, never in the
 * feedback: a wrong answer is told plainly, and the trap a false friend sets
 * is blamed on the word rather than on the learner (`docs/18-voice.md` §3c).
 *
 * Nothing is written to the review log (see the page).
 */
export function WordplaySession({ plan: initial }: { plan: WordplayPlan | null }) {
  const t = useT();
  const sound = useFeedbackSound();
  // Snapshotted once: the plan is shuffled on the server and a re-render must not reshuffle it.
  const [plan] = useState(initial);
  const [phase, setPhase] = useState<Phase>("apart");

  const [apartAt, setApartAt] = useState(0);
  const [turned, setTurned] = useState<Set<number>>(() => new Set());
  const [guess, setGuess] = useState<string | null>(null);
  const [guessed, setGuessed] = useState<Set<string>>(() => new Set());

  const [nameQueue, setNameQueue] = useState<NameQuestion[]>(() => (initial ? [...initial.name] : []));
  const [namePicked, setNamePicked] = useState<string | null>(null);
  const [nameMissed, setNameMissed] = useState<Set<string>>(() => new Set());

  const [friendAt, setFriendAt] = useState(0);
  const [friendPicked, setFriendPicked] = useState<string | null>(null);
  const [notFooled, setNotFooled] = useState(0);

  const [said, setSaid] = useState("");
  const [streak, setStreak] = useState(0);
  const counted = useCallback((right: boolean) => setStreak((s) => (right ? s + 1 : 0)), []);

  const step: ApartStep | undefined = plan?.apart[apartAt];
  const allTurned = step ? turned.size >= step.parts.length : false;

  const turn = useCallback((i: number) => {
    if (!step) return;
    setTurned((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
    setSaid(`${step.parts[i]?.text ?? ""}: ${t(step.parts[i]?.en ?? "", W)}`);
  }, [step, t]);

  const turnAll = useCallback(() => {
    if (!step) return;
    setTurned(new Set(step.parts.map((_, i) => i)));
    setSaid(t(step.literal, W));
  }, [step, t]);

  const pickGuess = useCallback((option: string) => {
    if (!step || guess !== null) return;
    const right = isGuessRight(step, option);
    // A guess before the word is known is never wrong in the buzzer's sense: a right one chimes, a miss is quiet.
    if (right) sound("right");
    if (right) setGuessed((g) => new Set(g).add(step.id));
    setGuess(option);
  }, [step, guess, sound]);

  const nextApart = useCallback(() => {
    if (!plan) return;
    if (apartAt + 1 < plan.apart.length) {
      setApartAt(apartAt + 1);
      setTurned(new Set());
      setGuess(null);
    } else {
      setPhase("name");
    }
  }, [plan, apartAt]);

  const nameQuestion = nameQueue[0];
  const nameRevealed = namePicked !== null;
  const chooseName = useCallback((id: string) => {
    if (!nameQuestion || nameRevealed) return;
    const right = isNamed(nameQuestion, id);
    sound(right ? "right" : "wrong");
    counted(right);
    if (!right) setNameMissed((m) => new Set(m).add(nameQuestion.id));
    setNamePicked(id);
  }, [nameQuestion, nameRevealed, sound, counted]);

  const nextName = useCallback(() => {
    if (!nameQuestion || namePicked === null) return;
    const right = isNamed(nameQuestion, namePicked);
    setNamePicked(null);
    // A miss comes back with its options in a new order, so it is asked again rather than read off the last screen.
    setNameQueue((q) => (right ? q.slice(1) : [...q.slice(1), { ...q[0]!, options: shuffle(q[0]!.options) }]));
  }, [nameQuestion, namePicked]);

  const friend: FriendQuestion | undefined = plan?.friends[friendAt];
  const friendRevealed = friendPicked !== null;
  const chooseFriend = useCallback((option: string) => {
    if (!friend || friendRevealed) return;
    const right = isSeenThrough(friend, option);
    sound(right ? "right" : "wrong");
    counted(right);
    if (right) setNotFooled((n) => n + 1);
    setFriendPicked(option);
  }, [friend, friendRevealed, sound, counted]);

  const nextFriend = useCallback(() => {
    if (!plan) return;
    setFriendPicked(null);
    if (friendAt + 1 < plan.friends.length) setFriendAt(friendAt + 1);
    else setPhase("done");
  }, [plan, friendAt]);

  useEffect(() => {
    if (phase !== "name" || nameQueue.length > 0 || !plan) return;
    setPhase(plan.friends.length > 0 ? "friends" : "done");
  }, [phase, nameQueue.length, plan]);

  useEffect(() => {
    if (!plan) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      /*
        A digit typed into the command palette or Anu's box is a letter of
        somebody's question, and Ctrl+1 is the browser's own tab switch, so
        neither may answer the card behind them.
      */
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || inEditable(target)) return;
      /*
        A button or a link with the keyboard answers its own Enter and Space:
        "Turn them all", the speaker and an option are each pressed for what
        they say, and the window must not turn a tile or move on instead.
      */
      if (isAdvanceKey(e) && target?.closest?.("button, a, [role=button]")) return;
      if (phase === "apart" && step) {
        if (!allTurned) {
          // A tile that has the keyboard answers its own Enter; this is for everywhere else.
          if (target?.closest?.("[data-wordplay-piece]")) return;
          if (isAdvanceKey(e)) {
            e.preventDefault();
            const next = step.parts.findIndex((_, i) => !turned.has(i));
            if (next >= 0) turn(next);
          }
          return;
        }
        if (guess === null) {
          const option = step.guesses[Number(e.key) - 1];
          if (option) { e.preventDefault(); pickGuess(option); }
          return;
        }
        if (isAdvanceKey(e)) { e.preventDefault(); nextApart(); }
        return;
      }
      if (phase === "name" && nameQuestion) {
        if (nameRevealed && isAdvanceKey(e)) { e.preventDefault(); nextName(); return; }
        if (nameRevealed) return;
        const option = nameQuestion.options[Number(e.key) - 1];
        if (option) { e.preventDefault(); chooseName(option.id); }
        return;
      }
      if (phase === "friends" && friend) {
        if (friendRevealed && isAdvanceKey(e)) { e.preventDefault(); nextFriend(); return; }
        if (friendRevealed) return;
        const option = friend.options[Number(e.key) - 1];
        if (option) { e.preventDefault(); chooseFriend(option); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    plan, phase, step, turned, allTurned, guess, nameQuestion, nameRevealed, friend, friendRevealed,
    turn, pickGuess, nextApart, chooseName, nextName, chooseFriend, nextFriend,
  ]);

  if (!plan) {
    return (
      <Page title="Sõnamäng" lead={t("Words that say exactly what they are, and a few that only look English.")}>
        <Empty
          title={t("No words to play with today")}
          action={<ButtonLink href="/practice" variant="primary">{t("Back to practice")}</ButtonLink>}
        />
      </Page>
    );
  }

  const total = plan.apart.length;
  const steps = 2 * total + plan.friends.length;
  const doneCount = phase === "apart"
    ? apartAt + (guess !== null ? 1 : 0)
    : phase === "name" ? total + (total - nameQueue.length)
      : phase === "friends" ? 2 * total + friendAt + (friendRevealed ? 1 : 0)
        : steps;

  if (phase === "done") {
    return (
      <DoneScreen
        plan={plan}
        guessed={guessed.size}
        firstTime={total - nameMissed.size}
        notFooled={notFooled}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Sõnamäng</h1>
      <RoundProgress done={doneCount} total={steps} left={steps - doneCount} label={t("Session progress")} />
      <span className="sr-only" role="status">{said}</span>

      {phase === "apart" && step && (
        <ApartCard
          key={step.id}
          step={step}
          index={apartAt}
          total={total}
          turned={turned}
          allTurned={allTurned}
          guess={guess}
          isLast={apartAt + 1 >= total}
          onTurn={turn}
          onTurnAll={turnAll}
          onGuess={pickGuess}
          onNext={nextApart}
        />
      )}

      {phase === "name" && nameQuestion && (
        <NameCard
          question={nameQuestion}
          picked={namePicked}
          revealed={nameRevealed}
          streak={streak}
          onChoose={chooseName}
          onNext={nextName}
        />
      )}

      {phase === "friends" && friend && (
        <FriendCard
          key={friend.id}
          question={friend}
          index={friendAt}
          total={plan.friends.length}
          picked={friendPicked}
          revealed={friendRevealed}
          streak={streak}
          isLast={friendAt + 1 >= plan.friends.length}
          onChoose={chooseFriend}
          onNext={nextFriend}
        />
      )}
    </div>
  );
}

/** A small laugh and a count, from the second right answer in a row. */
function Streak({ n }: { n: number }) {
  const t = useT();
  if (n < STREAK_FROM) return null;
  return (
    <span key={n} className="pop-in ml-auto inline-flex items-center gap-1 text-sm font-semibold tnum" style={{ color: "var(--hard-ink)" }}>
      <Laugh size={16} aria-hidden /> {fill(t("{n} in a row"), { n })}
    </span>
  );
}

/** The one line about a word, set apart so it reads as the reward rather than as small print. */
function Quip({ text }: { text: string }) {
  const t = useT();
  return (
    <p data-wordplay-quip className="pop-in flex items-start gap-2.5 text-base" style={{ color: "var(--ink-2)" }}>
      <Laugh size={18} className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} aria-hidden />
      <span>{t(text, W)}</span>
    </p>
  );
}

const CARD_STYLE = { borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" } as const;

/**
 * One compound, taken apart on one card. The pieces are tiles that turn over to
 * what each says on its own; with all of them turned, the word-for-word reading
 * lands as a quote and the guess is asked under it. Once the guess is in, the
 * reading is crossed out, the real meaning stamps in, and the line about it
 * follows.
 */
function ApartCard({
  step, index, total, turned, allTurned, guess, isLast, onTurn, onTurnAll, onGuess, onNext,
}: {
  step: ApartStep;
  index: number;
  total: number;
  turned: ReadonlySet<number>;
  allTurned: boolean;
  guess: string | null;
  isLast: boolean;
  onTurn: (i: number) => void;
  onTurnAll: () => void;
  onGuess: (option: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const answered = guess !== null;
  const right = answered && isGuessRight(step, guess);

  /*
    A turned tile is disabled and "Turn them all" goes once everything is
    turned, and a control that disables itself hands its focus to nobody. So
    the caret follows the round: to the next tile still face down, and to the
    first guess once there is none, but only when it had nowhere else to be,
    so a learner who has moved it on their own keeps it there.
  */
  const card = useRef<HTMLDivElement | null>(null);
  const pieces = useRef<(HTMLButtonElement | null)[]>([]);
  const firstGuess = useRef<HTMLButtonElement | null>(null);
  const seenTurned = useRef(-1);
  useEffect(() => {
    if (turned.size === seenTurned.current) return;
    const first = seenTurned.current === -1;
    seenTurned.current = turned.size;
    const active = document.activeElement;
    const adrift = !active || active === document.body || (!first && card.current?.contains(active) && (active as HTMLButtonElement).disabled);
    if (!adrift) return;
    if (allTurned) firstGuess.current?.focus();
    else pieces.current[step.parts.findIndex((_, i) => !turned.has(i))]?.focus();
  }, [turned, allTurned, step]);
  const verdict = right
    ? fill(t("Yes. {word} means “{means}”."), { word: step.word, means: t(step.means, W) })
    : fill(t("Not that one. {word} means “{means}”."), { word: step.word, means: t(step.means, W) });

  return (
    <div ref={card} className="rounded-xl border" style={CARD_STYLE}>
      <p className="sr-only" aria-live="polite">{answered ? verdict : ""}</p>
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{t("Take it apart")}</Chip>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("{n} of {total}"), { n: index + 1, total })}
        </span>
      </div>

      <div className="px-5 py-6 text-center sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <FitText as="p" text={step.word} lang="et" className="round-word font-bold tracking-tight" style={{ color: "var(--ink)" }} />
          <Speak text={step.word} />
        </div>

        {!allTurned && (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>{t("Tap each piece. What does it say on its own?")}</p>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {step.parts.map((part, i) => {
            const on = turned.has(i);
            const en = t(part.en, W);
            return (
              <button
                key={i}
                ref={(el) => { pieces.current[i] = el; }}
                type="button"
                data-wordplay-piece
                disabled={on}
                aria-pressed={on}
                aria-label={on ? `${part.text}: ${en}` : fill(t("{word}: tap to see what it says on its own"), { word: part.text })}
                onClick={() => onTurn(i)}
                className="say-flip rounded-lg disabled:cursor-default"
              >
                <span className="say-flip-inner" data-flipped={on}>
                  <span
                    aria-hidden
                    className="flex min-h-[5.5rem] min-w-[6rem] flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-3"
                    style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                  >
                    <span lang="et" className="text-2xl font-bold">{part.text}</span>
                  </span>
                  <span
                    aria-hidden
                    className="say-flip-back flex min-h-[5.5rem] min-w-[6rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-4 py-3"
                    style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
                  >
                    <span lang="et" className="text-sm" style={{ color: "var(--ink-3)" }}>{part.text}</span>
                    <span className="text-lg font-bold">{en}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {allTurned && (
          <div className="mt-6">
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Word for word")}</p>
            <p className={`mt-1 inline-block text-xl font-bold ${answered ? "" : "say-wobble"}`} style={{ color: answered ? "var(--ink-3)" : "var(--ink)" }}>
              <span className="say-strike" data-struck={answered}>{quoted(t(step.literal, W), locale)}</span>
            </p>
          </div>
        )}

        {answered && (
          <div className="mt-3">
            <p className="label-xs" style={{ color: "var(--accent-deep)" }}>{t("Really")}</p>
            <p className="say-stamp mt-1 inline-block rounded-md border-2 px-4 py-1.5 text-2xl font-bold" style={{ borderColor: "var(--accent-deep)", color: "var(--accent-deep)", background: "var(--accent-soft)" }}>
              {t(step.means, W)}
            </p>
            <p className="pop-in mt-3 flex items-center justify-center gap-1.5 text-md font-semibold" style={{ color: right ? VERDICT_INK.right : "var(--ink-2)" }}>
              {right ? <Check size={16} aria-hidden /> : null}
              {right ? t("You guessed it.") : t("Not that one, but now you know.")}
            </p>
          </div>
        )}

        {allTurned && !answered && (
          <div className="mt-6 text-left">
            <p className="mb-3 text-center text-md font-semibold" style={{ color: "var(--ink)" }}>{t("So what does it really mean?")}</p>
            <div className="choice-grid">
              {step.guesses.map((option, i) => (
                <button
                  key={option}
                  ref={i === 0 ? firstGuess : undefined}
                  type="button"
                  onClick={() => onGuess(option)}
                  className="choice-btn flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left"
                  style={{ "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
                >
                  <KeyCap>{i + 1}</KeyCap>
                  <span className="min-w-0 text-base font-semibold">{t(option, W)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!allTurned && (
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onTurnAll}>{t("Turn them all")}</Button>
          </div>
        )}
      </div>

      {answered && (
        <div className="border-t px-5 py-5 sm:px-6" style={{ borderColor: "var(--rule-soft)" }}>
          <Quip text={step.quip} />
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={onNext} autoFocus>
              {isLast ? t("Name them") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A literal reading put to the learner, who picks the word it belongs to. Wrong ones come round again. */
function NameCard({ question, picked, revealed, streak, onChoose, onNext }: {
  question: NameQuestion;
  picked: string | null;
  revealed: boolean;
  streak: number;
  onChoose: (id: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const right = picked !== null && isNamed(question, picked);
  const line = fill(t("{word} is literally “{literal}”, and means “{means}”."), {
    word: question.word, literal: t(question.literal, W), means: t(question.means, W),
  });
  return (
    <div className="rounded-xl border" style={CARD_STYLE}>
      <p className="sr-only" aria-live="polite">{revealed ? `${right ? t("Right.") : t("Not quite.")} ${line}` : ""}</p>
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{t("Name it")}</Chip>
        <Streak n={streak} />
      </div>

      <div className="px-6 pt-6 text-center">
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("Which word is literally")}</p>
        <p className="mt-1 text-2xl font-bold" style={{ color: "var(--ink)" }}>
          {quoted(t(question.literal, W), locale)}
        </p>
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
                <span className="min-w-0 text-md font-semibold">{option.word}</span>
                {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label={t("Right")} />}
                {revealed && option.id === picked && !isAnswer && <X size={16} className="ml-auto shrink-0" aria-label={t("Wrong")} />}
              </button>
            );
          })}
        </div>
      </div>

      {revealed && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          <p className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel min-w-0 flex-1`}>{line}</p>
          <Button variant="primary" onClick={onNext} autoFocus>
            {t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * A word spelled like an English one, asked as "what does it mean". The trap
 * is among the options on purpose, and taking it is told as the word's doing:
 * that is the whole joke of a false friend.
 */
function FriendCard({ question, index, total, picked, revealed, streak, isLast, onChoose, onNext }: {
  question: FriendQuestion;
  index: number;
  total: number;
  picked: string | null;
  revealed: boolean;
  streak: number;
  isLast: boolean;
  onChoose: (option: string) => void;
  onNext: () => void;
}) {
  const t = useT();
  const right = picked !== null && isSeenThrough(question, picked);
  const trapped = picked !== null && fellFor(question, picked);
  const verdict = right
    ? fill(t("Not fooled. It means “{means}”."), { means: t(question.means, W) })
    : trapped
      ? fill(t("That's the trap. It means “{means}”, not “{english}”."), { means: t(question.means, W), english: lookalike(question.looksLike, t) })
      : fill(t("Not quite. It means “{means}”."), { means: t(question.means, W) });
  return (
    <div className="rounded-xl border" style={CARD_STYLE}>
      <p className="sr-only" aria-live="polite">{revealed ? verdict : ""}</p>
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{t("Looks English, isn't")}</Chip>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("{n} of {total}"), { n: index + 1, total })}
        </span>
        <Streak n={streak} />
      </div>

      <div className="px-6 pt-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <FitText as="p" text={question.word} lang="et" className="round-word font-bold tracking-tight" style={{ color: "var(--ink)" }} />
          <Speak text={question.word} />
        </div>
        <p className="mt-2 text-md font-semibold" style={{ color: "var(--ink)" }}>{t("It's an Estonian word. What does it mean?")}</p>
      </div>

      <div className="px-4 py-5">
        <div className="choice-grid">
          {question.options.map((option, i) => {
            const isAnswer = option === question.means;
            const state = revealed ? OPTION_CLASS[optionState(isAnswer, option === picked)] : "";
            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                onClick={() => onChoose(option)}
                className={`choice-btn ${state} flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left disabled:cursor-default`}
                style={revealed ? undefined : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
              >
                <KeyCap>{i + 1}</KeyCap>
                {/* The trap is its English spelling, so it keeps it in every language: «pea (горошина)». */}
                <span className="min-w-0 text-base font-semibold">{option === question.looksLike ? lookalike(option, t) : t(option, W)}</span>
                {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label={t("Right")} />}
                {revealed && option === picked && !isAnswer && <X size={16} className="ml-auto shrink-0" aria-label={t("Wrong")} />}
              </button>
            );
          })}
        </div>
      </div>

      {revealed && (
        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          <p className={`${VERDICT_CLASS[right ? "right" : "wrong"]} verdict-panel`}>{verdict}</p>
          <div className="mt-4">
            <Quip text={question.quip} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={onNext} autoFocus>
              {isLast ? t("Finish") : t("Next")} <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The end of a sitting: the five compounds as cards that turn over, the word on
 * the front and the crossed-out literal with the real meaning on the back, so
 * the last thing done is one more recall rather than a list to read.
 */
function DoneScreen({ plan, guessed, firstTime, notFooled }: {
  plan: WordplayPlan;
  guessed: number;
  firstTime: number;
  notFooled: number;
}) {
  const t = useT();
  const total = plan.apart.length;
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
        {plan.apart.map((s) => {
          const on = turned.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              aria-label={on ? `${s.word}: ${t(s.means, W)}` : s.word}
              onClick={() => setTurned((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
              className="say-flip text-left"
            >
              <span className="say-flip-inner" data-flipped={on}>
                <span
                  aria-hidden
                  className="flex min-h-[6.5rem] items-center justify-center rounded-lg border-2 px-4 py-4 text-center"
                  style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                >
                  <span lang="et" className="text-xl font-bold">{s.word}</span>
                </span>
                <span
                  aria-hidden
                  className="say-flip-back flex min-h-[6.5rem] flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-4 text-center"
                  style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
                >
                  <s className="text-sm" style={{ color: "var(--ink-3)" }}>{t(s.literal, W)}</s>
                  <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t(s.means, W)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile value={`${guessed} / ${total}`} label={t("Guessed right")} tone="sky" />
        <StatTile value={`${firstTime} / ${total}`} label={t("Named first time")} tone="sky" />
        <StatTile value={`${notFooled} / ${plan.friends.length}`} label={t("Not fooled")} tone="sky" />
      </div>
      <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">{t("Back to Today")}</ButtonLink>
        <AnotherRound variant="primary" size="lg">{t("Another round")}</AnotherRound>
      </WayOut>
    </div>
  );
}
