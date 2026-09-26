"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { gradeCard } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { EstonianInput } from "@/components/EstonianInput";
import { Chip, Empty, KeyCap, Meter, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { TooComplicated } from "@/components/TooComplicated";
import { SuggestFix } from "@/components/SuggestFix";
import { WordIntro } from "@/components/WordIntro";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { GapMeaning } from "@/components/GapMeaning";
import { gapCue, gapMeaning } from "@/lib/copy/gapMeaning";
import { useAudioPrefs, useFeedbackSound } from "@/components/AudioPrefs";
import { useOffline } from "@/components/OfflineProvider";
import { useResumeCard } from "@/components/useResumeCard";
import { prefetchClip } from "@/lib/audio/clip";
import { checkAnswer, countsAsRecalled, type AnswerCheck } from "@/lib/estonian/answer";
import { BLANK } from "@/lib/estonian/cloze";
import { splitOnForm } from "@/lib/dict/examples";
import { sameSpelling } from "@/lib/copy/values";
import { enqueueGrade } from "@/lib/offline/db";
import { LEARN_BATCH, ratingFor, rungOf, tally, type Outcome, type Rung } from "@/lib/learn/ladder";
import type { LearnScheduling, LearnWord } from "@/lib/progress/learn";
import { grade, type RatingValue } from "@/lib/srs/scheduler";
import { requeue } from "@/lib/srs/queue";
import { OPTION_CLASS, VERDICT_CLASS, VERDICT_PAUSE_MS, optionState } from "@/lib/ux/verdict";
import { hintLadder, narrowLadder, struckOptions } from "@/lib/questions/hints";
import { FIRST_TRY_NOTE, isFirstProduction } from "@/lib/copy/firstTry";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { useUiText } from "@/components/UiLanguage";
import { EndSession, FullEntry, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { type SeenCard } from "@/lib/ux/lookBack";

/**
 * THE LEARN LADDER, DRIVEN.
 *
 * Five words, three rungs each, in one loop. `lib/learn/ladder.ts` says what a
 * rung is and `lib/progress/learn.ts` reads the batch; this asks the questions
 * and sends the grades.
 *
 * WHY A LAP RATHER THAN A LIST. The queue is the batch, and a word that has
 * been answered goes back to the end of it rather than on to its next rung
 * immediately. So a learner meets five words, meets four others in between,
 * and is asked the first one back at the point where they have to retrieve it
 * rather than read it off the screen above. `requeue` is the same helper the
 * review session uses for a missed card and for a first meeting, and the gap
 * it asks for is the batch size, so one lap is one round.
 *
 * EVERY GRADE IS AN ANSWER. Meeting a word writes nothing, exactly as the
 * review screen decided: the card comes back a lap later and *that* retrieval
 * is what the scheduler hears about. Karpicke and Roediger measured the
 * difference at about 80 percent recalled a week later against 35 for learners
 * who only restudied, and the whole of it was whether retrieval happened while
 * the word was being learned.
 *
 * ONE CARD PER WORD, GRADED AT EVERY RUNG. The word's recognition card is what
 * a rung reads and what a rung writes, because each rung asks the same
 * question at a greater depth: what does this word mean, then produce it in a
 * sentence. The word's other cards are Practice's, which is what "moves to
 * practice" means on the screen at the end.
 */

/** How the current word is being asked, once its rung is known. */
type Phase = "ask" | "feedback";

/** What a word did on the rung it was just asked at. */
interface Result {
  outcome: Outcome;
  /** The answer, for a screen that has to show what was right. */
  expected: string;
  note: string;
}

const RUNG_LABEL: Record<Rung, string> = {
  meet: "New word",
  choice: "What does it mean?",
  gap: "Put it in the sentence",
  kept: "Off to practice",
};

/** How far up the ladder a word is, drawn as three steps. */
function Ladder({ rung }: { rung: Rung }) {
  const filled = rung === "meet" ? 1 : rung === "choice" ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-4 rounded-full"
          style={{ background: i < filled ? "var(--accent)" : "var(--raised)" }}
        />
      ))}
    </span>
  );
}

export function LearnSession({
  words: initial, waiting, started, kind = "word", back,
}: {
  words: LearnWord[];
  /** Words in the deck that have never been asked, this batch included. */
  waiting: number;
  /** Words part way up the ladder, this batch included. */
  started: number;
  /** Whether this round is words or the fixed phrases, for the copy alone. */
  kind?: "word" | "phrase";
  /**
   * Where a round that was opened from somewhere else sends the learner back
   * to, and what that place is called.
   *
   * The planned course is the one caller: its day is a checklist, and the
   * round it opens is a step in the middle of one, so ending on three
   * suggestions about what to do next is the evening losing its thread. Given
   * a way back, the session offers exactly that and says which words it was.
   * Undefined is the ordinary Learn round, which is unchanged: it ends where
   * it always did, since there is nothing behind it to return to.
   */
  back?: { href: string; label: string };
}) {
  const noun = kind === "phrase" ? "phrase" : "word";
  const nouns = kind === "phrase" ? "phrases" : "words";
  /*
    Snapshotted once. `gradeCard` is a Server Action and Next refreshes this
    route's server component after every one, which would hand down a batch
    that shrinks as words graduate: the last answer of a session would see an
    empty prop and render the empty state instead of the summary.
  */
  const [words] = useState(initial);
  /*
    WHICH WORD, IF ANY, GETS THE FIRST-EVER NOTE, DECIDED ONCE FOR THE WHOLE
    SESSION.

    The server stamps `firstCardEver` on every word of the batch alike,
    because it is one fact about the learner rather than about any one word.
    A batch is five words and `orderByRung` sorts every `meet`-rung one to
    the front, so a first-time learner's first session shows all five of
    them before anything is graded (meeting writes nothing): reading the
    server's flag straight off each word would print the note five times
    running, which is the exact thing `lib/copy/firstMeeting.ts` says it
    must not do. So the session itself picks the one word that gets it, once,
    on mount, and every other word's copy of the same flag is ignored.
  */
  const [firstMeetingCardId] = useState(
    () => initial.find((w) => w.firstCardEver && w.rung === "meet")?.cardId ?? null,
  );
  /*
    Which word to reopen the seat on after a detour to its dictionary entry,
    rather than the batch's own first word. See components/useResumeCard.ts.
  */
  const { initialIndex, remember: rememberWord } = useResumeCard(initial.map((w) => ({ id: w.cardId })));
  const uiText = useUiText();
  /*
    Rotated rather than left in the batch's own order, so the resumed word
    sits at the front: `advance` below always treats `queue[0]` as the word
    the seat just held, and a seat resumed out of step with the queue would
    have `advance` grade the wrong word on the very next answer.
  */
  const [queue, setQueue] = useState<string[]>(
    () => [...initial.slice(initialIndex), ...initial.slice(0, initialIndex)].map((w) => w.cardId),
  );
  const [rungs, setRungs] = useState<Record<string, Rung>>(
    () => Object.fromEntries(initial.map((w) => [w.cardId, w.rung])),
  );
  /*
    THE QUESTION ON SCREEN, WHICH IS NOT THE SAME AS WHERE THE WORD NOW STANDS.

    `rungs` is the ladder and it moves the instant a grade lands. The screen
    cannot: a wrong answer at the gap drops the word to the choice rung, and if
    the render read the ladder directly, the correction would be replaced by the
    next question in the same frame. Driven in a browser, that is exactly what
    happened, and the one moment worth stopping for went past without being
    drawn at all.

    So the seat holds the card and the rung it is being asked at, and only
    `advance` changes it. Null is the end of the round.
  */
  /*
    How many times this round has dealt a question, which is what the hint
    ladder is keyed on beside the card and the rung. The last word of a batch
    comes straight back after `requeue`, often on the rung it was asked at, and
    keyed on those two alone the rungs taken the first time were still taken:
    hinted once at the gap and then answered right, it was capped at Hard, Hard
    keeps it at the gap, and it came back capped again for as long as anybody
    answered it.
  */
  const [asking, setAsking] = useState(0);
  const [seat, setSeat] = useState<{ cardId: string; rung: Rung } | null>(() => {
    const first = initial[initialIndex] ?? initial[0];
    return first ? { cardId: first.cardId, rung: first.rung } : null;
  });
  /* What the "too complicated" button did, printed under the round: its whole
     effect is a word that stops arriving, which is invisible tonight. */
  const [aside, setAside] = useState<string | null>(null);
  /*
    TWO SCREENS RATHER THAN A FOOTER NOTE, SAID ONCE EACH PER ROUND.

    The rule of what happens next used to be one line under every card while
    a word was still being met: easy to miss under the word itself, and still
    there for the fifth word after it had already been read four times. And
    the ladder changes what it is asking partway through a round, from "what
    does this mean" to "use it", with nothing on screen marking the change:
    the first choice question just arrived, unannounced.

    So the rule is said once, on its own screen, at the moment it is true.
    `showMeetIntro` is that screen before the first word; `showAnswerIntro` is
    the second one, shown once a word comes back asking to be answered rather
    than met, which is this round's own "the objective changed". Both are
    per round rather than remembered across rounds, because the operator
    asked for a screen that prepares somebody for what is coming every time
    they open this, not a one-off explainer.

    NEITHER IS UNCONDITIONAL, THOUGH. `learnBatch` reads every word's rung
    live off its own scheduling, so a reload mid-round, or a batch resumed
    after a detour, can seat somebody on a word already past "meet". Opening
    on "First, just meet them" over a word that is about to ask a question is
    the wrong screen, worse than none: it promises something that is not
    about to happen. So the meet screen only shows where the seat it opens on
    really is "meet", read straight off the word's own rung rather than the
    remapped one below, since the remapping only ever moves "choice" to
    "gap" and never touches "meet". A round that opens past it goes straight
    to the answer screen instead, which is the true state of things.
  */
  const [showMeetIntro, setShowMeetIntro] = useState(
    () => (initial[initialIndex] ?? initial[0])?.rung === "meet",
  );
  const [showAnswerIntro, setShowAnswerIntro] = useState(true);
  const [phase, setPhase] = useState<Phase>("ask");
  const [result, setResult] = useState<Result | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<AnswerCheck | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  /*
    A miss at the gap is typed again before the round moves on, for the reason
    the review session gives: reading the right form is not producing it. The
    grade already went; this is rehearsal.
  */
  const [retyped, setRetyped] = useState("");
  const [retypeOk, setRetypeOk] = useState(false);
  const [retypeNote, setRetypeNote] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [right, setRight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pendingOffline, setPendingOffline] = useState(0);
  /*
    WHAT HAS BEEN ON THIS SCREEN, SO IT CAN BE READ BACK.

    The ladder asks one word at a time and the browser's back button leaves
    the whole batch, so somebody who wanted the word before this one had to
    lose their place to see it. Read only, written nowhere, dropped with the
    round: `lib/ux/lookBack.ts` is the rule. Nothing is un-graded by it, which
    is what makes it safe on a screen whose every answer is already in the log.
  */
  const look = useLookBack();
  const { pending: outboxPending, refresh: refreshOutbox, drainFirst } = useOffline();
  const { voice, pace } = useAudioPrefs();
  const sound = useFeedbackSound();

  /*
    What the server last wrote for a card, because a word can be graded more
    than once in a session and the rung after the second grade is computed from
    the state the first one left behind. The prop is a mount-time snapshot and
    is deliberately never refreshed.
  */
  const scheduled = useRef(new Map<string, LearnScheduling>());
  /*
    A right answer stays on the screen for `VERDICT_PAUSE_MS` and then moves
    on by itself. The timer is held so that Enter or the button during the
    pause moves on once rather than twice.
  */
  const autoNext = useRef<number | null>(null);
  // A round left mid-pause — closing the tab, navigating away, the queue
  // itself running out under the timer — must not let it fire `advance` on a
  // component that is no longer there to hold the state it updates.
  useEffect(() => {
    return () => { if (autoNext.current !== null) window.clearTimeout(autoNext.current); };
  }, []);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const run = useRef(0);

  const byId = useMemo(
    () => new Map(words.map((w) => [w.cardId, w])),
    [words],
  );
  const cardId = seat?.cardId;
  const word = cardId ? byId.get(cardId) : undefined;
  /*
    AND A WORD SPELLED THE SAME IN BOTH LANGUAGES IS NOT ASKED WHAT IT MEANS.

    Thirty entries in the shipped dictionary have an English gloss that is the
    very same string, twelve of them taught by the course: `film`, `park`,
    `sport`, `minister`, `risk`. Asking which of four meanings `film` has puts
    the answer at the top of the screen, and a question nobody can get wrong is
    worse than no question: the scheduler reads the pass as a recall and
    stretches the interval on a memory nothing tested.

    So such a word goes straight to the gap, which is a real question about it,
    and takes both its grades there. Exact rather than case-insensitive, which
    is the rule `sameSpelling` already carries: `august` is `August`, and the
    capital letter is the lesson.
  */
  const free = word !== undefined && word.gap !== null && sameSpelling(word.lemma, word.gloss);
  const rung: Rung = seat?.rung === "choice" && free ? "gap" : seat?.rung ?? "meet";
  const finished = !word;
  const total = words.length;
  const left = queue.length;

  /*
    THE WAY OUT OF BEING STUCK, ON THE TWO RUNGS THAT CAN BE STUCK ON.

    `meet` asks nothing, so there is nothing to be helped with. `choice` puts
    four meanings on the screen, where the help a teacher gives is crossing one
    out; `gap` asks for a form, where it is uncovering the letters of the one
    the dictionary holds. `lib/questions/hints.ts` builds both and prices both.

    The stems handed over are every form of the word the session is holding,
    nulls included: the module takes the longest that really is the front of the
    answer and ignores the rest, so nothing here has to decide which of them is
    "the stem". That is what stops twenty rounds each keeping their own opinion
    about Estonian morphology.
  */
  const ladder = useMemo(() => {
    if (!word) return [];
    if (rung === "choice") return narrowLadder(word.choices ?? [], word.gloss);
    if (rung !== "gap") return [];
    const answer = word.gap ? word.gap.answer : word.lemma;
    return hintLadder({ answer, stems: [word.gap?.stem, word.lemma] });
  }, [word, rung]);
  /*
    Keyed on the card and the rung together, because the two rungs that can be
    stuck on ask different questions about one word and hand over different
    kinds of help. A word that fell from the gap back to the choice should be
    offered the crossing-out from scratch rather than arriving with three of
    four already struck by the letters somebody uncovered a lap ago.
  */
  const hints = useHints({
    word: word?.cardId ?? null,
    // The rung as well as the word, because the two rungs that can be stuck on
    // ask different questions about it and hand over different kinds of help.
    question: word ? `${word.cardId}:${rung}:${asking}` : null,
    ladder,
    lapses: word?.scheduling.lapses ?? 0,
  });
  const struck = useMemo(
    () => (rung === "choice" ? struckOptions(word?.choices ?? [], word?.gloss ?? "", hints.taken) : []),
    [rung, word, hints.taken],
  );

  /*
    The one screen in the round that says being unable to answer is ordinary.

    Only on a first production: a word being asked for in writing for the first
    time, by somebody who has not already missed it today and whose card carries
    no lapses. A word carries this line once in its life, which is what keeps it
    from becoming the small print under every box (`lib/copy/firstTry.ts`).
  */
  const firstTry = word !== undefined && rung === "gap" && isFirstProduction({
    produced: hints.missed + word.scheduling.lapses,
    typed: true,
  });

  useEffect(() => { rememberWord(word ? { id: word.cardId } : undefined); }, [rememberWord, word]);

  useEffect(() => { setPendingOffline(outboxPending); }, [outboxPending]);

  /*
    The next word is fetched while this one is being answered, so its speaker
    button and its autoplay are instant rather than a round trip to a speech
    service on every screen.
  */
  useEffect(() => {
    const nextId = queue[1];
    const upcoming = nextId ? byId.get(nextId) : undefined;
    if (upcoming) prefetchClip({ text: upcoming.lemma, voice, pace });
  }, [queue, byId, voice, pace]);

  const cheer = useCallback((won: boolean) => {
    run.current = won ? run.current + 1 : 0;
    sound(won ? "right" : "wrong", run.current);
  }, [sound]);

  /**
   * Takes the seat, and puts the word that was in it back on the ladder.
   *
   * A word that has been kept leaves the round. Everything else goes to the
   * back of the queue rather than on to its next rung immediately: `requeue`
   * with the batch size is a full lap, so every other word is asked before
   * this one comes round again, which is the whole of what makes the second
   * sighting a retrieval rather than a re-read.
   */
  const advance = useCallback((updated: Record<string, Rung>) => {
    if (autoNext.current !== null) { window.clearTimeout(autoNext.current); autoNext.current = null; }
    /*
      One choke point, so the record cannot fall behind the ladder: every rung
      leaves the seat through here, and what is kept is what was on the screen
      at the rung it was asked at rather than the word's row.
    */
    if (word) {
      const gap = rung === "gap" ? word.gap : null;
      const entry: Omit<SeenCard, "key"> = {
        of: word.cardId,
        label: rung === "meet"
          ? (word.isPhrase ? "New phrase" : "New word")
          : gap ? "Fill the gap" : "What it means",
        question: gap ? gap.text : word.lemma,
        answer: gap ? gap.answer : word.gloss,
        note: gap ? gap.fullEn : null,
        questionLang: "et",
        answerLang: gap ? "et" : "en",
        speak: gap ? gap.answer : word.lemma,
      };
      look.record(entry);
    }
    const rest = [...queue];
    const [head] = rest.splice(0, 1);
    const next = head && updated[head] !== "kept" ? requeue(rest, head, 0, LEARN_BATCH) : rest;
    const nowId = next[0];

    setRungs(updated);
    setQueue(next);
    setSeat(nowId ? { cardId: nowId, rung: updated[nowId] ?? "meet" } : null);
    setAsking((n) => n + 1);
    setPhase("ask");
    setResult(null);
    setTyped("");
    setVerdict(null);
    setChosen(null);
    setRetyped("");
    setRetypeOk(false);
    setRetypeNote(null);
    shownAt.current = Date.now();
  }, [queue, word, rung, look]);

  /**
   * A word the learner has put aside, which is the mirror of the claim below.
   *
   * "I already know this one" and "too complicated" are the two things a
   * learner can say at a first meeting that are not answers, and the meet rung
   * is where both are said: one graduates the word and the other sends it away
   * for a few days or until its band. Neither is graded, and this one writes nothing at all
   * here, because `putWordAside` has already moved every card of the word.
   *
   * The seat always holds `queue[0]`, so dropping the head is the whole of it.
   */
  const putAside = useCallback((note: string) => {
    if (autoNext.current !== null) { window.clearTimeout(autoNext.current); autoNext.current = null; }
    const rest = queue.slice(1);
    const nowId = rest[0];
    setQueue(rest);
    setSeat(nowId ? { cardId: nowId, rung: rungs[nowId] ?? "meet" } : null);
    setAsking((n) => n + 1);
    setAside(note);
    setPhase("ask");
    setResult(null);
    setTyped("");
    setVerdict(null);
    setChosen(null);
    setRetyped("");
    setRetypeOk(false);
    setRetypeNote(null);
    shownAt.current = Date.now();
  }, [queue, rungs]);

  /**
   * Grades the word's recognition card and works out where that leaves it.
   *
   * The rung is read back off the scheduling the server returns rather than
   * assumed here, so the ladder and the scheduler cannot disagree about
   * whether a word graduated. With no connection the grade goes to the outbox
   * exactly as a review does, and the same scheduler runs locally to keep the
   * session moving: `state` and `learningSteps` are not fuzzed, so the replay
   * lands on the rung this screen already showed.
   */
  const send = useCallback(async (outcome: Outcome, shown: Result) => {
    if (!word || busy) return;
    setBusy(true);
    if (outcome !== "right" && outcome !== "known") hints.noteMiss();
    /*
      A HINT IS PAID FOR, AND THIS IS WHERE IT IS PAID.

      `hintCeiling` is 4 with nothing taken, which is no ceiling at all, so a
      round nobody asked for help in grades exactly as it always did. Once a
      rung has been taken the grade cannot rise above Hard, and once the answer
      itself has been shown it cannot rise above Again. Written as a floor under
      `Math.min` rather than as a branch, so a miss is still a miss: a hint can
      only ever lower what the answer earned. The argument for charging at all
      is in `lib/questions/hints.ts`, and it is the one `audit:decks` makes: a
      question whose answer is on the screen is a question nobody can fail, and
      the only thing that keeps this from being that is the log saying so.
    */
    const rating = Math.min(ratingFor(outcome), hints.ceiling) as RatingValue;
    const durationMs = Date.now() - shownAt.current;
    const answeredAt = new Date().toISOString();
    const before = scheduled.current.get(word.cardId) ?? word.scheduling;

    /*
      The flag comes back off whatever happens, for the reason the review
      session gives at length: every control here is disabled while a grade is
      in flight, and the offline branch below awaits a write to IndexedDB that
      a browser can refuse. An exception leaving this function would leave the
      round on screen with nothing that can be pressed.
    */
    let after: LearnScheduling;
    try {
    // Chosen before asking, and reused if the answer is lost: see `writeGrade`.
    const reviewId = crypto.randomUUID();
    try {
      await drainFirst();
      const res = await gradeCard(word.cardId, rating, durationMs, answeredAt, undefined, undefined, reviewId);
      if (!res.ok) throw new Error(res.error);
      after = res.scheduling;
    } catch {
      await enqueueGrade({
        id: reviewId,
        cardId: word.cardId,
        rating,
        durationMs,
        reviewedAt: Date.parse(answeredAt),
      });
      refreshOutbox();
      const local = grade(
        {
          ...before,
          due: new Date(before.due),
          lastReview: before.lastReview ? new Date(before.lastReview) : null,
        },
        rating,
      );
      after = {
        ...before,
        due: local.due.toISOString(),
        stability: local.stability,
        difficulty: local.difficulty,
        elapsedDays: local.elapsedDays,
        scheduledDays: local.scheduledDays,
        reps: local.reps,
        lapses: local.lapses,
        state: local.state,
        lastReview: local.lastReview?.toISOString() ?? null,
        learningSteps: local.learningSteps,
      };
    }

    scheduled.current.set(word.cardId, after);
    const moved = { ...rungs, [word.cardId]: rungOf(after.state, after.learningSteps) };
    setAnswered((n) => n + 1);
    if (rating >= 3) setRight((n) => n + 1);

    // A claim moves on at once. A clean hit shows itself first, green, for
    // long enough to be seen, then moves on by itself. A miss keeps its
    // screen, because the correction is the one moment in a round worth
    // stopping for, and at the gap it waits to be typed again.
    if (outcome === "known") advance(moved);
    else {
      setRungs(moved); setResult(shown); setPhase("feedback");
      if (outcome === "right") {
        autoNext.current = window.setTimeout(() => { autoNext.current = null; advance(moved); }, VERDICT_PAUSE_MS);
      }
    }
    } finally {
      setBusy(false);
    }
  }, [word, busy, rungs, advance, refreshOutbox, drainFirst, hints]);

  /** The meeting writes nothing. The word comes back a lap later as a question. */
  const met = useCallback(() => {
    if (!word || busy) return;
    advance({ ...rungs, [word.cardId]: "choice" });
  }, [word, busy, rungs, advance]);

  const pick = useCallback((option: string) => {
    if (!word || busy || phase === "feedback") return;
    setChosen(option);
    const won = option === word.gloss;
    cheer(won);
    void send(won ? "right" : "wrong", {
      outcome: won ? "right" : "wrong",
      expected: word.gloss,
      note: won ? "" : `You chose ${option}.`,
    });
  }, [word, busy, phase, cheer, send]);

  const answerGap = useCallback(() => {
    if (!word || busy || phase === "feedback") return;
    const expected = word.gap ? word.gap.answer : word.lemma;
    const check = checkAnswer(typed, expected, "et", word.gap?.rivals ?? []);
    setVerdict(check);
    const won = check.verdict === "correct";
    cheer(countsAsRecalled(check.verdict));
    void send(
      won ? "right" : countsAsRecalled(check.verdict) ? "near" : "wrong",
      { outcome: won ? "right" : "wrong", expected: check.expected, note: check.note },
    );
  }, [word, busy, phase, typed, cheer, send]);

  /** Whether the gap is waiting for the miss to be typed again. */
  const needsRetype = phase === "feedback" && rung === "gap" && result?.outcome === "wrong" && !retypeOk;

  /**
   * The marker's note with the answer marked inside it, or nothing.
   *
   * `checkAnswer` writes a note that names the form on three of its four
   * readings (`Not quite, it's "X".`, `So close, the word is "X".`, `That is
   * another form of the word. This one wanted "X".`), and on the fourth it
   * names the letters instead. The panel below prints the answer on its own
   * line only where the note leaves it unsaid, so `splitOnForm` is asked the
   * question rather than the panel guessing from the verdict: a note that
   * grows or loses the form is answered correctly the day it changes.
   *
   * The gap rung only. The choice rung's answer is an English gloss and its
   * note is `You chose X`, so the two are never the same claim, and marking a
   * gloss `lang="et"` would tell a screen reader to say an English word with
   * Estonian phonology.
   */
  const saidOnce = useMemo(() => {
    if (!result || result.outcome === "right" || rung !== "gap" || !result.note) return null;
    const parts = splitOnForm(result.note, result.expected);
    if (!parts.some((part) => part.match)) return null;
    return parts.map((part, i) => (
      part.match
        ? <span key={i} lang="et" data-answer className="font-semibold">{part.text}</span>
        : <span key={i}>{part.text}</span>
    ));
  }, [result, rung]);

  const carryOn = useCallback(() => {
    if (!word || needsRetype) return;
    advance(rungs);
  }, [word, rungs, advance, needsRetype]);

  const checkRetype = useCallback(() => {
    if (!word || !result || retypeOk) return;
    const again = checkAnswer(retyped, result.expected, "et");
    if (again.verdict === "correct") {
      setRetypeOk(true);
      setRetypeNote(null);
      autoNext.current = window.setTimeout(() => { autoNext.current = null; advance(rungs); }, VERDICT_PAUSE_MS);
    } else {
      setRetypeNote("Not yet. Copy the word above exactly, letter for letter.");
    }
  }, [word, result, retyped, retypeOk, advance, rungs]);

  /*
    The digits pick an option, exactly as they do in review, and Enter carries
    on from a correction. One handler rather than one per rung: a shortcut that
    knows about only some of the screens it is mounted on is the fault this app
    has already fixed once, on the first meeting.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      /*
        Neither screen below is the round: nothing on it grades, so a stray
        digit must not reach the card underneath. The advance key still
        dismisses it, exactly as it advances every other single-button screen
        in this ladder, so a keyboard user is not made to reach for the mouse
        just because the button says "Show me" rather than "Got it".
      */
      if (showMeetIntro) { if (isAdvanceKey(e)) { e.preventDefault(); setShowMeetIntro(false); } return; }
      if (showAnswerIntro && rung !== "meet") {
        if (isAdvanceKey(e)) { e.preventDefault(); setShowAnswerIntro(false); }
        return;
      }
      /*
        A look back stands in the ladder's place, so the rung underneath is not
        answerable and its keys are not either: a stray Enter over an older
        word would otherwise grade the one the learner cannot see.
      */
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      // Safe as a letter here because this handler has already returned above
      // if focus is in a text box, which is where `b` is the first letter of
      // `buss`. The review screen had to be corrected for exactly that.
      if (e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      if (phase === "feedback") {
        if (isAdvanceKey(e)) { e.preventDefault(); carryOn(); }
        return;
      }
      if (rung === "meet" && isAdvanceKey(e)) { e.preventDefault(); met(); }
      if (rung === "choice" && word?.choices) {
        const at = Number(e.key) - 1;
        const option = word.choices[at];
        if (option) { e.preventDefault(); pick(option); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, rung, word, met, pick, carryOn, look, showMeetIntro, showAnswerIntro]);

  if (total === 0) {
    return (
      <Page title="Learn">
        <Empty
          title={back ? "Nothing left to meet here" : `No new ${nouns} waiting`}
          body={
            back
              ? "You have already met these. The rest of the module is waiting."
              : kind === "phrase"
                ? "Phrases arrive here as you open the units that teach them."
                : "Add a unit from the course and its words arrive here."
          }
          action={
            back
              ? <ButtonLink href={back.href} variant="primary">{back.label}</ButtonLink>
              : <ButtonLink href="/learn" variant="primary">Open the course</ButtonLink>
          }
        />
      </Page>
    );
  }

  if (showMeetIntro) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <Mascot size={72} className="mx-auto" />
          <h1 className="font-display mt-5 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: "var(--ink)" }}>
            First, just meet them
          </h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-base" style={{ color: "var(--ink-2)" }}>
            You&rsquo;ll see {total} {total === 1 ? noun : nouns} in this round, one at a time.
            Nothing is written down until you answer them back.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="primary" size="lg" onClick={() => setShowMeetIntro(false)}>
            Show me <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      </div>
    );
  }

  /*
    What the "too complicated" button did, drawn once. Putting the last word of
    a batch aside ends the round, so the note has to reach the summary too, and
    two copies of a sentence is how the wording of one of them rots.
  */
  const asideNote = aside ? (
    <p className="mt-5 text-center text-sm" role="status" style={{ color: "var(--ink-2)" }}>
      {aside}{" "}
      <Link href="/words/mastery" className="underline" style={{ color: "var(--accent-deep)" }}>
        Bring it back
      </Link>
    </p>
  ) : null;

  if (finished) {
    const counts = tally(words.map((w) => rungs[w.cardId] ?? "meet"));
    const more = Math.max(0, waiting + started - total);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <Mascot size={72} mood="cheer" className="float mx-auto" />
          <h1 className="font-display mt-5 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: "var(--ink)" }}>
            Round done
          </h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-base" style={{ color: "var(--ink-2)" }}>
            {counts.kept > 0
              ? <>{uiText("Tubli töö.", "Good work.")} {counts.kept} {counts.kept === 1 ? `${noun} has` : `${nouns} have`} moved over to practice, where they come back on a schedule.</>
              : <>{uiText("Tubli töö.", "Good work.")} These stay here until you can produce them in a sentence, which is the point at which they stick.</>}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile value={counts.kept} label="To practice" tone="mint" />
          <StatTile value={counts.staying} label="Still learning" tone="butter" />
          <StatTile value={`${minutes}m`} label="Time" tone="sky" />
        </div>

        <ul className="mt-6 flex flex-col gap-2">
          {words.map((w) => {
            const where = rungs[w.cardId] ?? "meet";
            return (
              <li
                key={w.cardId}
                className="flex flex-wrap items-center gap-3 rounded-[var(--r)] border px-4 py-3"
                style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
              >
                <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{w.lemma}</span>
                <span className="text-sm" style={{ color: "var(--ink-3)" }}>{w.gloss}</span>
                <span className="ml-auto flex items-center gap-2">
                  <Ladder rung={where} />
                  <Chip tone={where === "kept" ? "good" : "neutral"}>
                    {where === "kept"
                      ? "Practice"
                      : where === "meet" && w.isPhrase ? "New phrase" : RUNG_LABEL[where]}
                  </Chip>
                </span>
              </li>
            );
          })}
        </ul>

        {asideNote}

        {pendingOffline > 0 && (
          <p
            className="mt-4 rounded-[var(--r)] px-4 py-3 text-sm"
            style={{ background: "var(--hard-soft)", color: "var(--hard-ink)" }}
          >
            {pendingOffline} answer{pendingOffline === 1 ? "" : "s"} saved here while you were offline.
            They&rsquo;ll be sent the moment you&rsquo;re back online. You can close the tab.
          </p>
        )}

        {/*
          ONE WAY ON, WHERE SOMETHING SENT THE LEARNER HERE. A round opened
          from a checklist ends by going back to it: three suggestions at the
          end of step one of five is the evening losing its thread, and the
          module screen is the thing that knows what comes next.
        */}
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          {back ? (
            <ButtonLink href={back.href} variant="primary" size="lg">
              {back.label} <ArrowRight size={15} aria-hidden />
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/review" size="lg">Practice what is due</ButtonLink>
              <ButtonLink href="/" size="lg">Back to Today</ButtonLink>
              {more > 0 && (
                <ButtonLink href="/learn/new" variant="primary" size="lg">
                  <Sparkles size={15} aria-hidden /> Learn {Math.min(more, LEARN_BATCH)} more
                </ButtonLink>
              )}
            </>
          )}
        </WayOut>
      </div>
    );
  }

  /*
    THE OBJECTIVE CHANGING, SAID ONCE.

    Every word in a fresh batch starts on the meet rung, so the first lap is
    silent about what comes next; the moment any word comes back on `choice`
    or `gap` is the first time this round is asking to be answered rather than
    looked at, and that is the one screen worth stopping the round for.
    `rung !== "meet"` is read off the seat that is about to be drawn, so this
    fires exactly once, on the turn where the question actually changes.
  */
  if (showAnswerIntro && rung !== "meet") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <Mascot size={72} className="mx-auto" />
          <h1 className="font-display mt-5 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: "var(--ink)" }}>
            Now answer them back
          </h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-base" style={{ color: "var(--ink-2)" }}>
            Same {nouns}. Now you&rsquo;ll be asked to say what one means, or use it in the
            sentence it came from.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="primary" size="lg" onClick={() => setShowAnswerIntro(false)}>
            Ready <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      </div>
    );
  }

  /*
    The English of this gap's own sentence, with the asked word marked in it,
    and what the cue still has to say once that line has said it. Both are one
    rule (`lib/copy/gapMeaning.ts`): the mark is the gloss printed in context,
    so the gloss goes and the Estonian headword stays, which is what keeps this
    rung a question about the form rather than about the vocabulary.

    `gap.en` is already withheld upstream where the English carries the answer,
    and `gapMeaning` applies that same `mentions` guard again rather than
    trusting the caller.
  */
  const gapLine = word?.gap
    ? gapMeaning({ en: word.gap.en, answer: word.gap.answer, cue: word.gap.hint, lemma: word.lemma })
    : null;
  const gapMarked = gapLine?.marked ?? false;
  /*
    Read once rather than at each of its two uses, which is the guard and the
    body of one expression: `gapCue` reads a stored hint through `readableHint`
    and splits it, so calling it twice is the same string built twice on every
    render of the rung, and the pair can only ever drift the day one of them is
    edited and the other is not.
  */
  const gapWord = word?.gap
    ? gapCue({ hint: word.gap.hint, lemma: word.lemma, marked: gapMarked })
    : null;

  const progress = total > 0 ? ((total - left) / total) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      {/* The heading a session screen has no room to draw. */}
      <h1 className="sr-only">Learn</h1>
      <div className="mb-7 flex items-center gap-4">
        <EndSession href="/learn" />
        <div className="flex-1">
          <Meter pct={progress} label={`${left} of ${total} ${nouns} still on the ladder`} height={10} />
        </div>
        <span
          className="tnum label-xs rounded-full px-2.5 py-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          {left} left
        </span>
      </div>

      {/* The look back stands in the ladder's place rather than over it: one
          screen at a time, and the rung underneath cannot be answered by
          accident while an older word is being read. */}
      {look.panel ? (
        <LookBackCard {...look.panel} />
      ) : (
      <div
        className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent">
            {rung === "meet" && word.isPhrase ? "New phrase" : RUNG_LABEL[rung]}
          </Chip>
          <Ladder rung={rung} />
          <div className="ml-auto flex items-center gap-1">
            <FullEntry lemma={word.lemma} />
            {/* The corner of the card, which is where somebody looks for this
                the moment a word turns out to be worth keeping. */}
            <StarWord lexemeId={word.lexemeId} starred={word.starred} label={word.lemma} />
            {/* And its opposite number. A word met for the first time is the
                likeliest one in the app to be beyond somebody, and the only
                answers the ladder offers are about how well they recalled it. */}
            <TooComplicated
              key={word.lexemeId}
              lexemeId={word.lexemeId}
              label={word.lemma}
              context="/learn/new"
              onDone={putAside}
            />
          </div>
        </div>

        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          {rung === "meet" && (
            /* Keyed on the card. The intro holds an open word panel and the
               sentence's English, and a learner reported the last word's
               sentence still standing under the next word: a fresh subtree
               per word is what makes that impossible. */
            <WordIntro
              key={word.cardId}
              lemma={word.lemma}
              gloss={word.gloss}
              alsoSaid={word.alsoSaid}
              equivalent={word.equivalent}
              sentence={word.sentence}
              tokens={word.tokens}
              lexemeId={word.lexemeId}
              canTranslate={word.canTranslate}
              isPhrase={word.isPhrase}
              cefr={word.cefr}
              firstCardEver={word.firstCardEver && word.cardId === firstMeetingCardId}
            />
          )}

          {rung === "choice" && (
            <>
              <div className="flex items-center gap-2">
                <p lang="et" className="text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--ink)" }}>
                  {word.lemma}
                </p>
                <Speak text={word.lemma} />
              </div>
              {word.choices ? (
                <div className="mt-2 grid w-full max-w-md gap-2">
                  {word.choices.map((option, i) => {
                    const isAnswer = option === word.gloss;
                    const marked = phase === "feedback";
                    /* The option the learner pressed is marked as well as the
                       answer. It used to look exactly like the two nobody
                       chose, on a screen only ever reached by pressing the
                       wrong one. */
                    const state = marked ? optionState(isAnswer, option === chosen) : null;
                    /*
                      A HINT HERE CROSSES ONE OUT, WHICH IS WHAT A TEACHER DOES.

                      Struck rather than removed: an option that vanishes takes
                      the row under it up the screen while somebody is reading,
                      and a learner who has just pressed for help should be able
                      to see what the help ruled out. It is left pressable and
                      graded exactly as it would have been, because refusing the
                      press would be the app telling them they are wrong before
                      they have answered. The ranking is `struckOptions`': the
                      option nobody would confuse with the answer goes first, so
                      the rivals worth telling apart are the ones left standing.
                    */
                    const out = !marked && struck.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => pick(option)}
                        disabled={busy || marked}
                        aria-describedby={out ? "hint-struck" : undefined}
                        className={`choice-btn ${state ? OPTION_CLASS[state] : ""} ${out ? "line-through" : ""} flex items-center gap-3 rounded-[var(--r)] border px-4 py-3.5 text-left text-base`}
                        style={out ? { color: "var(--ink-3)" } : undefined}
                      >
                        <KeyCap>{i + 1}</KeyCap>
                        <span className="min-w-0 flex-1">{option}</span>
                        {out && <span className="sr-only"> (ruled out by a hint)</span>}
                        {state === "right" && <Check size={16} aria-label="Right" />}
                        {state === "wrong" && <X size={16} aria-label="Your pick" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* No four options the dictionary could rank honestly, so the
                   word is asked the way the gap rung asks it. `pickOptions`
                   returns nothing rather than padding a question out with a
                   second right answer. */
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>{word.gloss}</p>
              )}
              {phase === "ask" && (
                <HintLadder
                  ladder={ladder}
                  taken={hints.taken}
                  onTake={hints.take}
                  open={hints.open}
                  label={word.lemma}
                />
              )}
            </>
          )}

          {rung === "gap" && (
            <>
              {word.gap ? (
                /*
                  THE WORD FIRST, THEN WHAT TO DO WITH IT, THEN THE SENTENCE.

                  This read the other way round: a sentence with a hole in it,
                  its translation, the word, and the question, four blocks of
                  the same weight in four different colors. A learner reported
                  that they could not tell at a glance what was being asked,
                  which is exactly what that order produces. You read the
                  sentence, work out that something is missing, read on to find
                  out which word, and then go back.

                  So it is put the way somebody would say it out loud: here is
                  the word, put it in this sentence. The word leads because it
                  is the one thing on the screen that does not change what it
                  is asking; the instruction is one line under it; and the
                  sentence is the thing to look at while typing, so it sits
                  closest to the box.

                  The gap itself is what the eye should land on inside the
                  sentence, so it keeps the accent and everything else in the
                  line is the ordinary ink. `max-w-md` on both blocks and the
                  spacing carried by one wrapper rather than by whatever margin
                  each element happened to have.
                */
                <div className="flex w-full max-w-md flex-col items-center gap-5">
                  {/*
                    AND NO FALLBACK TO THE LEMMA HERE, WHICH IS THE ONE WAY
                    THIS REORDERING COULD HAVE GONE WRONG. `hint` is already a
                    ladder: the lemma and the meaning, then the meaning alone,
                    then nothing, because wherever the gap wants the dictionary
                    form the lemma is the answer printed a line above the box.
                    Thirteen cards in the shipped dictionary end up with no
                    hint at all, and "which word goes in this gap" is still a
                    question worth asking, so those lead with the instruction
                    and nothing else. Writing `hint ?? lemma` to fill the space
                    would put the answer back on the screen for exactly those
                    cards.

                    `gapCue` is the last rung of that same ladder rather than a
                    second one: where the sentence below is marked, the mark is
                    this gloss printed in context, so what is left to say is
                    the headword alone. It can never print what the hint did
                    not, and a hint with no headword in it leaves nothing.
                  */}
                  <div>
                    {gapWord ? (
                      <>
                        <p className="label-xs" style={{ color: "var(--ink-3)" }}>The word</p>
                        <p className="mt-1 text-2xl font-bold leading-tight" style={{ color: "var(--accent-deep)" }}>
                          {gapWord}
                        </p>
                        <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                          Put it in the sentence, in the form it needs.
                        </p>
                      </>
                    ) : (
                      <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                        Which word goes in the gap?
                      </p>
                    )}
                  </div>

                  <div>
                    <p lang="et" className="text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }}>
                      {word.gap.text.split(BLANK).map((part, i, all) => (
                        <span key={i}>
                          {part}
                          {i < all.length - 1 && (
                            <span
                              className="mx-1 inline-block rounded px-3 align-baseline"
                              style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                            >
                              ?
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                    {/*
                      AND WHICH WORD OF IT THE GAP WANTS.

                      This screen has had the line since it was written and
                      drew it flat, so a learner read `Let's meet at four.`
                      under a sentence with a hole in it and still had to work
                      out which of its words the hole was. It is marked now,
                      by the same rule and the same drawing as the five other
                      gap screens (`lib/copy/gapMeaning.ts`).

                      Resolved at the top of this component beside the cue,
                      because the two are one decision: the mark is the gloss
                      printed in context, so the cue above drops the gloss and
                      keeps the word.
                    */}
                    {gapLine && <GapMeaning meaning={gapLine} className="mt-1.5 text-sm leading-snug" />}
                  </div>
                </div>
              ) : (
                <p className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>{word.gloss}</p>
              )}
              {/*
                THE ONE LINE THAT SAYS NOT KNOWING IT IS THE ORDINARY STATE.

                Above the box rather than under it, because it is read while
                somebody is deciding whether to type anything and a sentence
                under the box is a sentence they meet after they have decided.
                Only on a first production, so a word carries it once: see
                `lib/copy/firstTry.ts` for why it is not the small print under
                every box for ever.
              */}
              {firstTry && phase === "ask" && (
                <p className="max-w-sm text-sm" style={{ color: "var(--ink-2)" }}>{FIRST_TRY_NOTE}</p>
              )}
              <div className="w-full max-w-sm text-left">
                <EstonianInput
                  value={typed}
                  onChange={setTyped}
                  onEnter={answerGap}
                  autoFocus
                  ariaLabel={word.gap ? "The word that goes in the gap" : "The Estonian word"}
                  placeholder="Type in Estonian"
                  large
                />
              </div>
              {phase === "ask" && (
                <HintLadder
                  ladder={ladder}
                  taken={hints.taken}
                  onTake={hints.take}
                  open={hints.open}
                  label={word.lemma}
                />
              )}
              {/*
                Not disabled on an empty box, which is the review screen's own
                answer and is the way out of a word you cannot produce: an empty
                answer is marked "nothing typed", the correction is shown, and
                the word drops to the rung below rather than holding the round
                up. A learner stuck on one word with nothing to press would have
                only the cross in the corner.
              */}
              {phase === "ask" && (
                <Button variant="primary" onClick={answerGap} disabled={busy}>
                  Check
                  <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
              )}
            </>
          )}

          {phase === "feedback" && result && (
            /* The panel that says how it went, in a live region like every
               other round's. The ladder is where a word is met for the first
               time, so this is the one panel a learner most needs read back. */
            <div
              role="status"
              className={`${result.outcome === "right" ? "pop-in" : ""} ${VERDICT_CLASS[result.outcome === "right" ? "right" : verdict && countsAsRecalled(verdict.verdict) ? "nearly" : "wrong"]} verdict-panel mt-2 w-full max-w-md text-left`}
            >
              {/*
                THE ANSWER, SAID ONCE.

                The panel used to open with the answer and then print the
                marker's note under it, and the note names the answer itself:
                a learner who typed `kalujust` read `The word is kuidas läheb?`
                over `Not quite, it's "kuidas läheb?"`, which is the same
                sentence twice in one box with a line break in the middle. The
                near miss said it twice as well, in butter rather than peach:
                `The word is toas` over `So close, the word is "toas"`.

                So where the note already names the form, the note *is* the
                line, and the form inside it carries the markup the headline
                used to: `lang="et"` because it is Estonian inside an English
                sentence, and `data-answer` because `scripts/lib/review.mjs`
                reads the answer off the screen to type it into the box below.
                Dropping the headline without moving those would have left the
                retype driver with nothing to read and no check would have
                said so.

                The headline stays wherever the note does not name the form,
                which is not a leftover branch: `Almost, it's õ, not o.` names
                the letters and `Nothing typed.` names nothing at all, and on
                both of those the answer is the only thing the learner is
                waiting for.
              */}
              {/*
                And the weight goes on the form rather than on the sentence.
                Every other verdict panel in the app bolds the lead word and
                leaves the note in the body weight (`Nearly.` then the note),
                and this one used to carry a four-word headline, so the whole
                paragraph being semibold was right. Merging the note into it
                made that a whole sentence set bold, at `--text-md`, which is
                the heaviest thing on the screen and is not what the learner
                is reading for: the form is. So the merged line takes the
                body weight and the form inside it is the bold part, which is
                the same decision `FlashSession` makes one card over.
              */}
              <p className={saidOnce ? undefined : "font-semibold"}>
                {result.outcome === "right"
                  ? uiText("Õige!", "Correct!")
                  : saidOnce
                    ? saidOnce
                    : rung === "gap" ? <>The word is <span lang="et" data-answer>{result.expected}</span></> : result.expected}
              </p>
              {result.note && !saidOnce && <p className="mt-1">{result.note}</p>}
              {rung === "gap" && word.gap && (
                <>
                  <p lang="et" className="mt-2" style={{ color: "var(--ink-2)" }}>
                    {splitOnForm(word.gap.full, word.gap.answer).map((part, i) => (
                      part.match
                        ? <mark key={i} className="bg-transparent font-bold" style={{ color: "var(--ink)" }}>{part.text}</mark>
                        : <span key={i}>{part.text}</span>
                    ))}
                  </p>
                  {/* And what it says. Withheld on the question, where it
                      would be the answer, and owed here: the whole point of
                      the rung is that the sentence needed this form. */}
                  <SentenceTranslation
                    key={word.gap.full}
                    lexemeId={word.lexemeId}
                    et={word.gap.full}
                    en={word.gap.fullEn}
                    canTranslate={word.canTranslate}
                  />
                </>
              )}
              {/*
                Why the form changed, not only what it is. A learner who has
                just met the word is being asked to retype a form they saw
                once, seconds ago, with no reason given for why it isn't the
                lemma; without this it reads as arbitrary and marks the app's
                whole first unit as a guessing game rather than a pattern.
                Absent on a form that matches the lemma unchanged, where
                there is nothing to explain.
              */}
              {rung === "gap" && word.gap?.explanation && (
                <p className="mt-1" style={{ color: "var(--ink-3)" }}>
                  {word.gap.explanation}
                </p>
              )}
            </div>
          )}

          {phase === "feedback" && rung === "gap" && result?.outcome === "wrong" && (
            <div className="w-full max-w-sm text-left">
              {retypeOk ? (
                <p className={`pop-in ${VERDICT_CLASS.right} verdict-panel`}>
                  {uiText("Õige!", "Correct!")} That is the one.
                </p>
              ) : (
                <>
                  <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>Now type it again</p>
                  <EstonianInput
                    value={retyped}
                    onChange={(v) => { setRetyped(v); setRetypeNote(null); }}
                    onEnter={checkRetype}
                    autoFocus
                    ariaLabel="Type the word again"
                    placeholder="Type in Estonian"
                    large
                  />
                  {retypeNote && (
                    <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{retypeNote}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t px-5 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          {phase === "feedback" ? (
            <>
              <Button
                variant="primary"
                onClick={needsRetype ? checkRetype : carryOn}
                disabled={busy || retypeOk || result?.outcome === "right"}
              >
                {needsRetype ? "Check it again" : result?.outcome === "right" ? uiText("Õige!", "Correct!") : "Got it"}
              </Button>
              {rung === "gap" && result?.outcome !== "right" && (
                <SuggestFix
                  category="MARKED_WRONG"
                  categories={["MARKED_WRONG", "WRONG_FORM", "WRONG_EXAMPLE"]}
                  lemma={word.lemma}
                  lexemeId={word.lexemeId}
                  trigger={
                    `Learn, gap rung. Expected: ${result?.expected ?? ""}. ` +
                    `Typed: ${typed.trim() || "nothing"}.`
                  }
                  label="I think that was right"
                />
              )}
            </>
          ) : rung === "meet" ? (
            <>
              {/*
                THE ONE BUTTON HERE THAT IS A CLAIM RATHER THAN AN ANSWER.

                Plenty of people arrive at this app already speaking some
                Estonian, and being walked up three rungs for `kohv` is how a
                learner decides an app is beneath them. Easy from a new card
                graduates it outright, so the word goes straight into the
                review rotation at about a week rather than out of the app: if
                the claim was optimistic, the schedule is what finds out.
              */}
              <Button
                onClick={() => { cheer(true); void send("known", { outcome: "known", expected: word.gloss, note: "" }); }}
                disabled={busy}
              >
                I already know this one
              </Button>
              {/* The primary action sits on the right of the pair, where the
                  sprint already puts "Got it" and where a thumb and a reading
                  eye both end up. The claim is the quieter button beside it. */}
              <Button variant="primary" size="lg" onClick={met} disabled={busy}>Got it</Button>
            </>
          ) : null}
        </div>
      </div>
      )}

      {asideNote}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs" style={{ color: "var(--ink-3)" }}>
        <LookBackButton {...look.button} disabled={busy || look.looking} />
      </div>

      {/*
        Only the running score now: the rule of what happens next is said once,
        on its own screen, before the round starts and again when it changes
        (`showMeetIntro`, `showAnswerIntro` above), rather than repeated here
        under every card until it stops being read.
      */}
      {answered > 0 && (
        <p className="mt-3 text-center text-xs" style={{ color: "var(--ink-3)" }}>
          {right} of {answered} right this round.
        </p>
      )}
    </div>
  );
}
