"use client";

import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { answerNote } from "@/lib/copy/answerNote";
import { rich } from "@/components/round/rich";
import { useCallback, useEffect, useRef, useState } from "react";
import { CaseLabel } from "@/components/CaseLabel";
import { caseLabelOf } from "@/lib/copy/caseLabel";
import { Check, Flame, Pause, Target, Timer, X } from "lucide-react";
import { gradeCard } from "@/app/actions";
import { useOffline } from "@/components/OfflineProvider";
import { enqueueGrade } from "@/lib/offline/db";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { GapMeaning } from "@/components/GapMeaning";
import { gapCue, gapMeaning } from "@/lib/copy/gapMeaning";
import { useFeedbackSound } from "@/components/AudioPrefs";
import type { QuestCard } from "@/lib/progress/quest";
import { acceptedAnswers, checkAnswer, type AnswerCheck } from "@/lib/estonian/answer";
import { EstonianInput } from "@/components/EstonianInput";
import { RetypeBox, useRetype } from "@/components/round/Retype";
import { caseByKey, plainNameForEt } from "@/lib/estonian/cases";
import { BLANK, filledSentence, primaryAnswer } from "@/lib/estonian/cloze";
import { OPTION_CLASS, VERDICT_CLASS, VERDICT_INK, optionState, verdictOfCheck, verdictOfRating } from "@/lib/ux/verdict";
import { arrowFront } from "@/lib/copy/caseHint";
import { estonianSide } from "@/lib/srs/estonianSide";
import { sayLineIn } from "@/lib/estonian/plainAsk";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { hintLadder, narrowLadder, struckOptions } from "@/lib/questions/hints";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { EnterKeyCap, SpaceKeyCap } from "@/components/KeyCaps";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey, isGotItKey, isNotYetKey } from "@/lib/ux/advanceKey";
import { roundLength } from "@/lib/ux/roundClock";
import { WayOut } from "@/components/round/RoundExit";
import { BriefingSteps } from "@/components/round/Briefing";
import { RoundStart } from "@/components/round/RoundStart";
import { FitText } from "@/components/FitText";

export interface AimedCase {
  key: string;
  accuracy: number;
  et: string;
  question: string | null;
}

/**
 * A front that is a sentence with the form taken out.
 *
 * A `CASE_FORM` or `CONJUGATION` card carries one of these here exactly as it
 * does in review: not every one of them gets four forms to pick between
 * (`optionsFor` in `lib/progress/quest.ts` can come back with nothing to
 * offer), and where it does not, the reveal below used to leave the raw front
 * on screen with its blank never filled in, the answer sitting underneath it
 * with nothing to connect the two. See `ReviewSession`'s own `isGap`.
 */
const isGap = (front: string) => front.includes(BLANK);

/**
 * One answer as the round took it, kept for the list at the end. The October
 * feedback asked for exactly this: a timed round moves on, so the moment to
 * study what came back is afterwards, every answer, right and wrong.
 */
interface QuestAnswer {
  key: string;
  /** The word asked about, or the sentence with its gap. */
  word: string;
  /** The plain instruction it was asked with, where it had one. */
  ask: string | null;
  /** A gap card's sentence with the answer put back, to read it whole. */
  sentence: string | null;
  sentenceEn: string | null;
  /** What the learner picked or typed; null on a card they marked themselves. */
  given: string | null;
  answer: string;
  rating: 1 | 2 | 3;
  /** How the answer was given, which decides how the row words it. */
  how: "picked" | "typed" | "flip";
  /** Which of the two sides is Estonian, for `lang` and for the speaker. */
  wordEt: boolean;
  answerEt: boolean;
}

/** How long a right pick stays on the screen before the next card. */
const RIGHT_PAUSE_MS = 1200;

/**
 * THE DAILY QUEST.
 *
 * Two minutes by default, self-graded by comparison, on the cards behind the
 * cases this learner is worst at. It is the one round that opens by saying what
 * it is about: "your seesütlev is at 54%" is the reason to press it, and a round
 * that hid that would be another timer. How long the clock runs is the
 * learner's, resolved on the server from `lib/ux/roundClock.ts`: a fixed limit
 * is WCAG 2.2.1 failed, and somebody who reads slowly was shut out of this
 * round rather than playing a harder one.
 *
 * A PICK RATHER THAN A TYPED ANSWER, deliberately. Two minutes at a typed
 * answer is about eight cards, and the point of this round is volume across a
 * weakness rather than depth on one card; the same argument the Case Sprint
 * makes.
 *
 * WHAT IS NOT DELIBERATE IS THE LEARNER MARKING THEIR OWN PAPER, and this
 * round used to. It showed the answer and asked "Had it?" or "Missed it?", and
 * that verdict went into `Review`, which is append-only and is what
 * `caseAccuracy` reads back to decide which cases are weak. This round chooses
 * its cards *by* that reading, so the panel picking the cards was being fed by
 * the round claiming to fix them, on the learner's own say-so, and every
 * figure downstream of it — the weakest-case panel, the mastery counter, the
 * readiness rungs, the exam confidence percentage — was presented as measured.
 *
 * The volume argument never required that. Picking one of four forms of the
 * same word is a tap, exactly as "Had it" was a tap, and it is a measurement:
 * the wrong answers are `toast`, `toasse` and `toale` against `toas`, which is
 * the confusion this round exists for. A wrong pick also says which case the
 * learner reached for, which goes into `Review.reachedSlot` and which no flip
 * could ever have known (`lib/questions/caseChoices.ts`).
 *
 * A card that cannot be given options is still a flip, because there is then
 * genuinely nothing to compare, and `SELF_GRADES` is what makes that honest
 * (`lib/srs/scheduler.ts`).
 *
 * THE CLOCK TIMES THE DECIDING, NOT THE READING. From the moment an answer is
 * in, the clock stands still and the answer stays up: a right pick moves on
 * by itself after a moment, a wrong one waits for "Next". And the finish
 * screen lists every answer, misses first, so the studying a timed round has
 * no room for happens afterwards. Both were the October feedback's ask.
 *
 * Every answer grades through `gradeCard`, so a round played for the timer
 * still moves the schedule and the log records what happened (ADR-016). An
 * abandoned round writes only the cards actually answered, which is what the
 * log should say.
 */
export function QuestSession({
  cards: initialCards, aimed, seconds,
}: { cards: QuestCard[]; aimed: AimedCase[]; seconds: number }) {
  const t = useT();
  const locale = useLocale();
  const lead = fill(t("{length} on the endings that keep tripping you up."), { length: roundLength(seconds, locale) });
  // Snapshotted once on mount and never updated from later props: `gradeCard`
  // refreshes this route's Server Component on every call, which would hand
  // down a shrinking pool mid-round. See ReviewSession for the same reasoning.
  const [cards] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  /*
    Which card's answer has gone to the scheduler. A grade is sent in the
    background while the answer stays on the screen, so the next card can be
    up before the last one has reached the server; a flag for the whole round
    would block that card on a slow network. One grade per card is the guard.
  */
  const gradedAt = useRef(-1);
  /*
    THE CLOCK STOPS WHILE AN ANSWER IS ON THE SCREEN.

    The October feedback: a pick said "right" for half a second and the next
    card was already up, which is a clock timing the reading of the answer
    rather than the deciding. The clock runs while a card is being answered
    and stands still from the moment an answer is in until the next card is
    up, so the time is the learner's thinking and nothing else.
  */
  const [held, setHeld] = useState(false);
  const [log, setLog] = useState<QuestAnswer[]>([]);
  const onward = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(Date.now());
  // When the answer went in, so a typed card's time is the thinking and not
  // the reading of the verdict after it.
  const decidedAt = useRef<number | null>(null);
  const sound = useFeedbackSound();

  const card = cards.length > 0 ? cards[index % cards.length]! : null;
  /*
    The English of a gap's own sentence with the missing word marked inside it,
    off what the dictionary already holds and withheld where that line carries
    the answer (`lib/copy/gapMeaning.ts`). Null on anything that is not a gap.
  */
  const meaning = card && isGap(card.front)
    ? gapMeaning({ en: card.sentenceEn, answer: card.back, cue: card.hint, lemma: card.lemma })
    : null;
  /*
    And what the cue still has to say once that line has said it: the headword
    where the cue carries one, never the gloss a second time (`gapCue`).
  */
  const cue = card ? gapCue({ hint: card.hint, lemma: card.lemma, marked: meaning?.marked ?? false }) : null;
  const cueCase = caseLabelOf(cue);
  // Every card asked and moved past, rather than every card graded: the last
  // one's answer is still on the screen until the learner moves on.
  const exhausted = cards.length > 0 && index >= cards.length;
  // A bare form card leads with its word and asks in a plain sentence; the
  // grammar name is never the whole question (`sayFor` in the quest's pool).
  const split = card && !isGap(card.front) ? arrowFront(card.front) : null;
  const say = card?.say ? sayLineIn(locale, card.say.slot, card.say.line) : null;
  const frontEt = !!card && (isGap(card.front) || estonianSide(card.cardType, "front"));
  const backEt = !!card && estonianSide(card.cardType, "back");

  /*
    THE WAY OUT OF BEING STUCK, ON THE ROUND BUILT OUT OF WHAT SOMEBODY IS
    WORST AT.

    This is the round with the strongest claim on one: it picks the learner's
    weakest cases by name and then asks them, so everybody here is by
    construction at the thing they keep getting wrong. Crossing an option out
    rather than uncovering letters, because the four options are four forms of
    the word and every letter is already on the screen.

    The clock is not an argument against it. A round that runs to two minutes
    already moves somebody on from a question they cannot answer, and a hint
    they press costs them seconds they control (`lib/ux/roundClock.ts` is
    adjustable up to ten times the standard). What it buys is that the pass,
    when it comes, is graded as the helped one it was.
  */
  const options = card?.choices?.map((c) => c.text) ?? [];
  const answerText = card
    ? options.find((text) => acceptedAnswers(card.back, "et")
      .some((f) => f.toLocaleLowerCase("et") === text.toLocaleLowerCase("et"))) ?? card.back
    : "";
  /*
    A typed card uncovers letters, the ladder the review card uses on the same
    card, since there are no options to cross out.
  */
  const ladder = card?.choices
    ? narrowLadder(options, answerText)
    : card?.typed
      ? hintLadder({
        answer: primaryAnswer(card.back),
        stems: [...card.rivals, card.lemma],
        suffix: card.targetCase ? caseByKey(card.targetCase)?.suffix : null,
      })
      : [];
  const { refresh: refreshOutbox, drainFirst } = useOffline();
  const hints = useHints({
    word: card?.lemma ?? card?.id ?? null,
    question: card?.id ?? null,
    ladder,
  });
  const struck = card?.choices ? struckOptions(options, answerText, hints.taken) : [];

  useEffect(() => {
    if (phase !== "running" || held) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, held]);

  useEffect(() => () => { if (onward.current) clearTimeout(onward.current); }, []);

  const finish = useCallback(() => setPhase("done"), []);

  useEffect(() => {
    if (phase === "running" && (secondsLeft === 0 || exhausted)) finish();
  }, [phase, secondsLeft, exhausted, finish]);

  // What a typed card has in its box, and the mark it got (`markTyped` below).
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<AnswerCheck | null>(null);
  /* A typed miss, or a near one, is typed again before the card is graded and
     lets go. The grade is what the marker said, so this is rehearsal only. */
  const retype = useRetype(card?.back ?? "", index);
  const needsRetype = !!card?.typed && !!check && check.verdict !== "correct" && !retype.ok;
  /*
    The next card, once the learner has looked at the answer. Separate from the
    grade, which is written the moment the answer is in: what used to be one
    step is two, so the answer can stay on the screen with the clock stopped.
  */
  const advance = useCallback(() => {
    if (onward.current) { clearTimeout(onward.current); onward.current = null; }
    setPicked(null);
    setRevealed(false);
    setTyped("");
    setCheck(null);
    setHeld(false);
    setIndex((i) => i + 1);
    shownAt.current = Date.now();
    decidedAt.current = null;
  }, []);

  const grade = useCallback(async (
    got: boolean, reached: string | null, rating: 1 | 2 | 3 | undefined,
    given: string | null, how: QuestAnswer["how"],
  ) => {
    if (!card || gradedAt.current === index) return;
    gradedAt.current = index;
    sound(got ? "right" : "wrong");
    setAttempted((a) => a + 1);
    if (got) {
      setCorrect((c) => c + 1);
      setStreak((s) => { const next = s + 1; setBestStreak((b) => Math.max(b, next)); return next; });
    } else {
      setStreak(0);
    }
    /*
      The case asked and the case reached for, where the round can name both.
      `writeGrade` checks each against its own closed list rather than trusting
      them, and keeps the second only where both sides are forms, so a round
      cannot file "asked what it meant, got a case" as a confusion between two
      cases.
    */
    if (!got) hints.noteMiss();
    // A hint is paid for: see `lib/questions/hints.ts`.
    const score = Math.min(rating ?? (got ? 3 : 1), hints.ceiling) as 1 | 2 | 3;
    setLog((l) => [...l, {
      key: `${card.id}:${l.length}`,
      word: split ? split.word : card.front,
      ask: say,
      sentence: isGap(card.front) ? filledSentence(card.front, card.back) : null,
      sentenceEn: isGap(card.front) ? card.sentenceEn : null,
      given,
      answer: primaryAnswer(card.back),
      rating: score,
      how,
      wordEt: isGap(card.front) || estonianSide(card.cardType, "front"),
      answerEt: estonianSide(card.cardType, "back"),
    }]);
    const duration = (decidedAt.current ?? Date.now()) - shownAt.current;
    const answeredAt = new Date().toISOString();
    // Chosen before asking, and reused if the answer is lost: see `writeGrade`.
    const reviewId = crypto.randomUUID();
    /*
      A GRADE THAT CANNOT REACH THE SERVER IS QUEUED, AND THE ROUND GOES ON.

      With the network gone the answer used to be lost: the round moved on and
      the scheduler never heard it. It goes to the same outbox the review path
      uses, with the time it was answered, which is what ADR-015 promises the
      daily path.
    */
    try {
      // Anything queued earlier goes first, so the scheduler hears the answers in order.
      await drainFirst();
      const res = await gradeCard(
        card.id, score, duration, answeredAt,
        card.targetCase ?? undefined, reached ?? undefined, reviewId,
      );
      if (!res.ok) throw new Error(res.error);
    } catch {
      try {
        await enqueueGrade({
          id: reviewId,
          cardId: card.id,
          rating: score,
          durationMs: duration,
          reviewedAt: Date.parse(answeredAt),
          slot: card.targetCase ?? undefined,
          reachedSlot: reached ?? undefined,
        });
        refreshOutbox();
      } catch {
        // No IndexedDB either: the answer is lost, and the round still goes on.
      }
    }
  }, [card, index, sound, hints, refreshOutbox, drainFirst, split, say]);

  // Turning a self-marked card over is the decision; the clock stops there.
  const flip = useCallback(() => {
    setRevealed(true);
    setHeld(true);
    decidedAt.current = Date.now();
  }, []);

  // A card the learner marks themselves: the grade and the next card are one press.
  const answer = useCallback((got: boolean) => {
    void grade(got, null, undefined, null, "flip");
    advance();
  }, [grade, advance]);

  /*
    A pick marks itself. The option carries what it would mean, so a wrong one
    is written down as the case the learner reached for; the right one is
    whichever spelling the card accepts, which is `acceptedAnswers` and not a
    string comparison against the whole back, since a card's back can be
    `tuppa / toasse` and both are right.
  */
  const choose = useCallback((option: { text: string; slot: string | null }) => {
    if (!card || picked) return;
    const right = acceptedAnswers(card.back, "et")
      .some((f) => f.toLocaleLowerCase("et") === option.text.toLocaleLowerCase("et"));
    setPicked(option.text);
    setRevealed(true);
    setHeld(true);
    void grade(right, right ? null : option.slot, undefined, option.text, "picked");
    /* A right pick moves on by itself after a moment; a wrong one waits for
       the learner, because the correction is the one thing worth stopping for. */
    if (right) onward.current = setTimeout(advance, RIGHT_PAUSE_MS);
  }, [card, picked, grade, advance]);

  /*
    A TYPED CARD IS MARKED, NOT CLAIMED. `checkAnswer` against what the card
    accepts, with the word's other forms as rivals so another ending typed is
    the wrong form rather than a forgiven slip. The verdict is shown with the
    answer, and the next press grades what it said.
  */
  const markTyped = useCallback(() => {
    if (!card?.typed || revealed) return;
    const result = checkAnswer(typed, card.back, "et", card.rivals);
    setCheck(result);
    setRevealed(true);
    setHeld(true);
    decidedAt.current = Date.now();
  }, [card, revealed, typed]);
  const nextTyped = useCallback(() => {
    if (!check || needsRetype) return;
    void grade(check.suggestedRating > 1, null, check.suggestedRating, typed.trim() || null, "typed");
    advance();
  }, [check, grade, advance, needsRetype, typed]);

  /* Keys, because a two-minute round is one a keyboard should be able to play:
     space or enter turns the card, then space says missed and enter says had it. Same two answers as a flip
     card in review, for the same reason. */
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      // A key typed into the answer box is the box's: its Enter marks the card.
      if (inEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /*
        1 to 4 pick an option where there are options, which is the same key
        row the multiple-choice cards in review use. A card with none keeps the
        flip it always had: space, then 1 and 2.
      */
      if (card?.typed) {
        /*
          The box takes Enter while it is being typed into; after the mark,
          the advance key moves on. Never the same Enter: the mark's render
          and its effects are flushed inside that keydown, so this listener is
          already the one that sees `revealed`, and without the target check
          one press marked the card and moved past it before the verdict drew.
        */
        const target = e.target as HTMLElement | null;
        // A focused button answers its own Enter, which would be two grades.
        if (target?.closest("input, textarea, button")) return;
        if (revealed && !needsRetype && isAdvanceKey(e)) { e.preventDefault(); nextTyped(); }
        return;
      }
      const options = card?.choices;
      if (options) {
        // After a pick, the advance key moves on, right away rather than
        // waiting out a right answer's pause.
        if (revealed) {
          const target = e.target as HTMLElement | null;
          if (!target?.closest("button") && isAdvanceKey(e)) { e.preventDefault(); advance(); }
          return;
        }
        const at = Number(e.key) - 1;
        if (Number.isInteger(at) && at >= 0 && at < options.length) {
          e.preventDefault();
          choose(options[at]!);
        }
        return;
      }
      if (isAdvanceKey(e) && !revealed) { e.preventDefault(); flip(); return; }
      if (!revealed) return;
      // The two answers have a key each: Space is "Missed it" and Enter is
      // "Had it", as on every other card that asks the learner to judge. The
      // digits stay for anybody who has them under their fingers.
      if (isNotYetKey(e) || e.key === "1") { e.preventDefault(); answer(false); }
      else if (isGotItKey(e) || e.key === "2") { e.preventDefault(); answer(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, answer, card, choose, nextTyped, needsRetype, flip, advance]);

  if (cards.length === 0) {
    return (
      <Page title={t("Daily quest")} lead={lead}>
        <Empty
          title={t("Nothing to work on yet")}
          body={t("It picks the endings you miss most, so it needs a few of your answers first.")}
          action={<ButtonLink href="/review" variant="primary">{t("Open review")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (phase === "ready") {
    return (
      <RoundStart
        icon={<Timer size={26} aria-hidden />}
        title={t("Daily quest")}
        lead={lead}
        hue="blush"
        actions={<>
          <ButtonLink href="/" variant="ghost">{t("Not now")}</ButtonLink>
          <Button variant="primary" size="lg" onClick={() => { setPhase("running"); shownAt.current = Date.now(); }}>
            {t("Start the clock")}
          </Button>
        </>}
        footnote={<>
          {/* Where the clock is set, said on the screen somebody is standing
              on when they find the round too fast. */}
          {rich(t("Need longer? {more}, up to ten times this."), {
            more: (
              <Link href="/settings#round-pace" className="underline underline-offset-2">
                {t("Give yourself more time")}
              </Link>
            ),
          })}
        </>}
      >
        <BriefingSteps id="quest" />
        {/*
          The chart is why the round is worth pressing: this learner's own
          weakest endings, each a bar as long as how often it comes out right.
          The name and the question it answers lead, drawn as one label.
        */}
        {aimed.length > 0 && (
          <section
            aria-label={t("What this round is aimed at")}
            className="mt-2 rounded-[var(--r-lg)] p-5 text-left"
            style={{ background: "rgb(255 255 255 / 0.06)", border: "1px solid rgb(255 255 255 / 0.12)" }}
          >
            <h2 className="flex items-center gap-2 text-md font-bold" style={{ color: "var(--ink)" }}>
              <Target size={17} aria-hidden style={{ color: "var(--cta)" }} />
              {t("The endings you find hardest")}
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {aimed.map((c) => (
                <li key={c.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    {c.question ? (
                      <CaseLabel label={{ et: c.et, question: c.question }} className="text-md" />
                    ) : (
                      <span className="font-display text-lg font-bold" style={{ color: "var(--ink)" }}>{plainNameForEt(c.et, locale) ?? c.et}</span>
                    )}
                    <span className="tnum whitespace-nowrap text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {fill(t("{pct}% right"), { pct: c.accuracy })}
                    </span>
                  </div>
                  <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full" style={{ background: "rgb(255 255 255 / 0.1)" }}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.max(3, c.accuracy)}%`, background: "var(--accent)" }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </RoundStart>
    );
  }

  if (phase === "done") {
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    return (
      <Page title={t("Daily quest")} lead={t("That's today's quest done.")}>
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
          <div className="grid w-full grid-cols-3 gap-2 sm:gap-3">
            <StatTile value={correct} label={t("Right")} tone="sky" />
            <StatTile value={`${accuracy}%`} label={t("Accuracy")} tone="accent" />
            <StatTile value={bestStreak} label={t("Best run")} tone="blush" />
          </div>
          <p className="max-w-[40ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {attempted === 0
              ? t("You didn't answer any, so nothing was saved. Come back whenever you're ready.")
              : t("Every answer counted. The ones you missed will come back a bit sooner.")}
          </p>
          <WayOut className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/practice" size="lg">{t("Play a round")}</ButtonLink>
            <ButtonLink href="/" variant="primary" size="lg">{t("Back to Today")}</ButtonLink>
          </WayOut>
        </div>
        {/*
          EVERY ANSWER, RIGHT AND WRONG, WITH NO CLOCK ON IT.

          A timed round moves on, so the time to study what came back is
          afterwards. The October feedback asked for exactly this list: each
          card as it was asked, the answer it wanted, and what the learner gave,
          misses first so the ones worth a second look are at the top.
        */}
        {log.length > 0 && (
          <section aria-labelledby="quest-answers" className="mx-auto mt-10 w-full max-w-xl">
            <h2 id="quest-answers" className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>
              {t("Your answers")}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {t("Take your time with these. The ones you missed are at the top.")}
            </p>
            <ol className="mt-4 flex flex-col gap-3">
              {[...log].sort((x, y) => x.rating - y.rating).map((row) => {
                const verdict = verdictOfRating(row.rating);
                const right = row.rating === 3;
                return (
                  <li
                    key={row.key}
                    data-quest-answer={verdict}
                    className="flex items-start gap-3 rounded-[var(--r)] border p-4"
                    style={{ borderColor: "var(--edge)", background: "var(--surface)" }}
                  >
                    <span aria-hidden className="mt-1" style={{ color: VERDICT_INK[verdict] }}>
                      {right ? <Check size={18} /> : <X size={18} />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="sr-only">{right ? t("Right.") : verdict === "nearly" ? t("Nearly.") : t("Missed.")}</p>
                      {row.sentence ? (
                        <p lang="et" className="text-md leading-snug" style={{ color: "var(--ink)" }}>{row.sentence}</p>
                      ) : (
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span lang={row.wordEt ? "et" : undefined} className="text-md font-bold" style={{ color: "var(--ink)" }}>{row.word}</span>
                          {row.ask && <span className="text-sm" style={{ color: "var(--ink-2)" }}>{row.ask}</span>}
                        </p>
                      )}
                      {row.sentenceEn && (
                        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{row.sentenceEn}</p>
                      )}
                      <p className="text-base" style={{ color: "var(--ink)" }}>
                        <span className="mr-2">{t("The answer:")}</span>
                        <span lang={row.answerEt ? "et" : undefined} className="font-semibold" style={{ color: "var(--accent-deep)" }}>{row.answer}</span>
                        {/* Heard only where the answer is Estonian: an English
                            gloss read by an Estonian voice teaches nothing. */}
                        {row.answerEt && (
                          <Speak
                            text={row.answer}
                            label={fill(t("Hear {word}"), { word: row.answer })}
                            className="press ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full align-middle transition-colors hover:bg-[var(--raised)]"
                          />
                        )}
                      </p>
                      {!right && row.given && (
                        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                          {rich(t(row.how === "typed" ? "You typed {given}." : "You picked {given}."), {
                            given: <span lang={row.answerEt ? "et" : undefined} className="font-semibold">{row.given}</span>,
                          })}
                        </p>
                      )}
                      {!right && row.how === "flip" && (
                        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("You said you missed this one.")}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </Page>
    );
  }

  const pct = seconds > 0 ? (secondsLeft / seconds) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">{t("Daily quest")}</h1>

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold tabular-nums"
          style={{ color: secondsLeft <= 15 ? "var(--again-ink)" : "var(--ink-2)" }}>
          {held ? <Pause size={15} aria-hidden /> : <Timer size={15} aria-hidden />}
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          {held && <span className="font-normal" style={{ color: "var(--ink-3)" }}>{t("paused")}</span>}
        </span>
        <span className="flex items-center gap-3">
          {streak >= 3 && (
            <span className="flex items-center gap-1 text-sm font-bold quest-pop"
              style={{ color: "var(--blush-ink)" }}>
              <Flame size={15} aria-hidden /> {streak}
            </span>
          )}
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--ink-2)" }}>
            {correct}/{attempted}
          </span>
          <ButtonLink href="/" aria-label={t("Leave the quest")}><X size={15} aria-hidden /></ButtonLink>
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: secondsLeft <= 15 ? "var(--again-ink)" : "var(--accent)",
            transition: "width 1s linear",
          }}
        />
      </div>

      {card && (
        <div
          key={card.id}
          className="quest-card mt-6 flex min-h-[19rem] flex-col items-center justify-center gap-4 rounded-[var(--r-lg)] border p-6 text-center"
          style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
        >
          {card.targetsWeakCase && (
            <Chip tone="hard">{t("One you often miss")}</Chip>
          )}
          <FitText as="p" text={split ? split.word : card.front} lang={frontEt ? "et" : undefined} className="round-word font-bold" style={{ color: "var(--ink)" }} />
          {/*
            WHAT TO DO WITH THE WORD, SAID THE WAY A PERSON WOULD ASK IT.

            The quest drew `juhtuma → lihtminevik, ma` whole, so the only
            instruction on the card was the name of a form, which the October
            feedback called out: it tells a learner nothing. The card asks the
            way review asks the same card, `Say “it happened to me”`, and where
            no such line can be built the form is a small label under the word
            rather than half of the headline.
          */}
          {say && (
            <p
              data-say
              className="rounded-full px-4 py-1.5 text-lg font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
            >
              {say}
            </p>
          )}
          {!say && split && !revealed && (() => {
            const asked = cueCase ?? caseLabelOf(split.tail);
            return asked ? (
              <CaseLabel label={asked} className="text-sm" />
            ) : (
              <span lang="et" className="rounded-full px-3 py-1 text-sm font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
                {split.tail}
              </span>
            );
          })()}
          {/*
            WHAT THE SENTENCE AROUND THE GAP SAYS, AND THE CUE ONLY WHERE IT
            DID NOT SAY IT.

            The quest picks the cases a learner is worst at, so its cards are
            the ones they have least to go on with, and the English under them
            was the missing word's gloss alone. One drawing and one rule for
            all six gap screens: `lib/copy/gapMeaning.ts`, off the English the
            dictionary already holds, so this costs the quest no call.
          */}
          {meaning && !revealed && <GapMeaning meaning={meaning} className="text-sm leading-snug" />}
          {cue && !revealed && !say && !(cueCase && split) && (
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              {/* A stored hint naming a case is drawn as one label, the way
                  the review card draws it, never as the string it was stored as. */}
              {cueCase ? (
                <>
                  {cueCase.rest && <>{cueCase.rest} </>}
                  <CaseLabel label={cueCase} />
                </>
              ) : cue}
            </p>
          )}

          {card.choices ? (
            /*
              FOUR FORMS OF THE WORD, and the answer is marked rather than
              claimed. Each option keeps its place once picked, with the right
              one shown in mint and a wrong pick in peach beside it, because
              the correction is the one moment in a round worth stopping for
              and a board that cleared itself would take it away. The hues
              carry a border and the answer carries a word, since a hue is half
              a signal (docs/14-design-system.md).
            */
            <div className="mt-2 grid w-full max-w-sm gap-2">
              {card.choices.map((option, at) => {
                const chosen = picked === option.text;
                const isAnswer = revealed && acceptedAnswers(card.back, "et")
                  .some((f) => f.toLocaleLowerCase("et") === option.text.toLocaleLowerCase("et"));
                const state = revealed ? OPTION_CLASS[optionState(isAnswer, chosen)] : "";
                return (
                  <button
                    key={option.text}
                    type="button"
                    lang="et"
                    onClick={() => choose(option)}
                    disabled={picked !== null}
                    className={`choice-btn ${state} flex items-center justify-between gap-2 rounded-[var(--r)] border px-4 py-3 text-left text-lg font-semibold`}
                  >
                    <span className={!revealed && struck.includes(option.text) ? "line-through" : ""}>
                      {option.text}
                      {!revealed && struck.includes(option.text) && (
                        <span className="sr-only"> {t("(ruled out by a hint)")}</span>
                      )}
                    </span>
                    {revealed && isAnswer
                      ? <span className="text-xs font-semibold uppercase tracking-wide">{t("Right")}</span>
                      : (
                        <KeyCap>{at + 1}</KeyCap>
                      )}
                  </button>
                );
              })}
              {/* The pick is marked in a tint and in one word inside the
                  option's own button, neither of which a screen reader
                  announces on its own. One line, once, in the shape the
                  review card already uses for its near-miss note. */}
              {revealed && (
                <p className="sr-only" role="status">
                  {picked && acceptedAnswers(card.back, "et")
                    .some((f) => f.toLocaleLowerCase("et") === picked.toLocaleLowerCase("et"))
                    ? t("Right.")
                    : fill(t("Not this time. It's {answer}."), { answer: card.back })}
                </p>
              )}
              {!revealed && (
                <HintLadder
                  ladder={ladder}
                  taken={hints.taken}
                  onTake={hints.take}
                  open={hints.open}
                  label={card.lemma ?? card.front}
                />
              )}
              {/* A gap card's sentence read whole once the answer is in, with
                  what it means: the gap was the question, the sentence is what
                  the answer is an answer to. */}
              {revealed && isGap(card.front) && (
                <div className="mt-1 flex flex-col items-center gap-1.5 text-center">
                  <div className="flex items-start justify-center gap-2">
                    <p lang="et" className="text-md leading-snug" style={{ color: "var(--ink)" }}>
                      {card.front.split(BLANK)[0]}
                      <span style={{ color: "var(--accent-deep)", fontWeight: 600 }}>{primaryAnswer(card.back)}</span>
                      {card.front.split(BLANK)[1]}
                    </p>
                    <Speak
                      text={filledSentence(card.front, card.back)}
                      label={t("Hear the whole sentence")}
                      className="press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--raised)]"
                    />
                  </div>
                  <SentenceTranslation
                    key={card.front}
                    lexemeId={card.lexemeId}
                    et={filledSentence(card.front, card.back)}
                    en={card.sentenceEn}
                    canTranslate={card.canTranslate}
                  />
                </div>
              )}
              {/* The clock is stopped while this is up; the learner says when
                  to go on. A right pick also goes on by itself in a moment. */}
              {revealed && (
                <Button variant="primary" size="lg" autoFocus onClick={advance} className="mt-1">
                  {t("Next")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
              )}
            </div>
          ) : revealed ? (
            <>
              {/* The reveal is the answer, and it arrived in silence: nothing
                  here was in a live region, so pressing "Show answer" put the
                  word on the screen and said nothing to a screen reader, on
                  the one round the app features a day. Every other round
                  announces its own feedback panel. */}
              {isGap(card.front) ? (
                /* Same treatment as ReviewSession's own gap reveal: the raw
                   front above still carries the blank, so a card with no
                   options left the underscore on screen forever with a bare
                   word underneath it and nothing to say the two belong
                   together. The sentence is what the answer is an answer to. */
                <div className="flex flex-col items-center gap-2" role="status">
                  {/* Speaker beside the sentence rather than under it, and
                      `lang="et"` on the sentence rather than on the row, for
                      the two reasons `ReviewSession`'s own gap reveal gives. */}
                  <div className="flex w-full items-start justify-center gap-2">
                    <p lang="et" className="text-xl leading-snug md:text-2xl" style={{ color: "var(--ink)" }}>
                      {card.front.split(BLANK)[0]}
                      <span style={{ color: "var(--accent-deep)", fontWeight: 600 }}>
                        {primaryAnswer(card.back)}
                      </span>
                      {card.front.split(BLANK)[1]}
                    </p>
                    <Speak
                      text={filledSentence(card.front, card.back)}
                      label={t("Hear the whole sentence")}
                      autoplay
                      className="press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--raised)]"
                    />
                  </div>
                  {/* And what the whole line says. The review card has done
                      this since a gap card became a sentence; this round drew
                      the sentence and left a beginner to work it out. */}
                  <SentenceTranslation
                    key={card.front}
                    lexemeId={card.lexemeId}
                    et={filledSentence(card.front, card.back)}
                    en={card.sentenceEn}
                    canTranslate={card.canTranslate}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2" role="status">
                  <p lang={backEt ? "et" : undefined} className="text-2xl font-semibold" style={{ color: "var(--accent-deep)" }}>
                    {card.back}
                  </p>
                  {/* The answer, read aloud as it appears, the same rule
                      ReviewSession's own flip reveal states for itself: the
                      word you were trying to recall, said properly. */}
                  <Speak text={backEt ? primaryAnswer(card.back) : (split ? split.word : card.front)} autoplay />
                </div>
              )}
              {card.typed && check ? (
                <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
                  <p
                    role="status"
                    className={`${check.verdict === "correct" ? "pop-in" : "shake"} ${VERDICT_CLASS[verdictOfCheck(check)]} verdict-panel`}
                  >
                    {check.verdict === "correct" ? t("Right.") : answerNote(check.note, locale) || fill(t("It's {answer}."), { answer: primaryAnswer(card.back) })}
                  </p>
                  {check.verdict !== "correct" && <RetypeBox retype={retype} />}
                  <Button variant="primary" size="lg" autoFocus onClick={needsRetype ? retype.check : nextTyped}>
                    {needsRetype ? t("Check it again") : t("Next")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                  </Button>
                </div>
              ) : (
              <div className="mt-2 grid w-full max-w-sm grid-cols-2 gap-2">
                {/* The two self-grades in the palette's own words, as the
                    review card draws them. Only where there is nothing
                    to compare, which is the flip review keeps too. */}
                <button
                  type="button"
                  onClick={() => answer(false)}
                  className={`${VERDICT_CLASS.wrong} press rounded-[var(--r)] px-3 py-3 text-base font-bold transition-ui hover:scale-[1.02] disabled:opacity-40`}
                >
                  {t("Missed it")} <SpaceKeyCap className="ml-1" />
                </button>
                <button
                  type="button"
                  onClick={() => answer(true)}
                  className={`${VERDICT_CLASS.right} press rounded-[var(--r)] px-3 py-3 text-base font-bold transition-ui hover:scale-[1.02] disabled:opacity-40`}
                >
                  {t("Had it")} <EnterKeyCap className="ml-1" />
                </button>
              </div>
              )}
            </>
          ) : card.typed ? (
            <div className="mt-2 flex w-full max-w-sm flex-col gap-3 text-left">
              <label htmlFor="quest-answer" className="label-xs block" style={{ color: "var(--ink-3)" }}>
                {t("Type the answer")}
              </label>
              <EstonianInput
                id="quest-answer"
                value={typed}
                onChange={setTyped}
                onEnter={markTyped}
                ariaLabel={t("Type your answer")}
                autoFocus
                large
              />
              <Button variant="primary" size="lg" onClick={markTyped}>
                {t("Check it")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
              <HintLadder
                ladder={ladder}
                taken={hints.taken}
                onTake={hints.take}
                open={hints.open}
                label={card.lemma ?? card.front}
              />
            </div>
          ) : (
            <Button variant="primary" size="lg" onClick={flip}>
              {t("Show answer")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
