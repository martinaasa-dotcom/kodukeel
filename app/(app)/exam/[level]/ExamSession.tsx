"use client";

import { openingConversation } from "@/lib/exam/warmUp";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { questionInEnglish } from "@/lib/estonian/cases";
import { useRouter } from "next/navigation";
import {
  Check, CircleAlert, Clock, Coffee, Ear, FileWarning, Headphones, Loader2, Mic, PenLine, RotateCcw, Save,
  Send, TriangleAlert, VolumeX, WifiOff,
} from "lucide-react";
import { submitExam } from "@/app/actions";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { EstonianInput } from "@/components/EstonianInput";
import { Recorder } from "@/components/Recorder";
import { Speak, SpeakPair } from "@/components/Speak";
import { Card, Chip, Meter, Note, SectionTitle } from "@/components/ui";
import { partOf } from "@/lib/exam/paper";
import type { ExamItem, ExamTask, Exhibit, MustUseWord, Paper, SpeakCard } from "@/lib/exam/paper";
import type { Response } from "@/lib/exam/score";
import { usesRequiredWord, wordsOf } from "@/lib/exam/written";
import {
  BREAK_MINUTES, LISTEN_PLAYS, PASS_PCT, READ_QUESTIONS_SECONDS, speakingCriteria, writtenMinutes,
} from "@/lib/exam/spec";
import { SKILL_ET, SKILL_LABEL } from "@/lib/exam/types";
import { VOICES } from "@/lib/audio/voice";
import { answeredIn, clearSitting, hasAnswer, loadSitting, saveSitting, type SavedSitting } from "./resume";
import { Explain } from "@/components/Explain";
import { CaseLabel } from "@/components/CaseLabel";

/**
 * Sitting the paper.
 *
 * Four parts, in the order the real examination sets them, each on its own
 * clock. The clock is not decoration: the thing that fails most candidates is
 * the reading part at fifty minutes rather than the reading part, and a mock
 * without a timer teaches somebody they are ready when they are only capable.
 *
 * NOTHING IS MARKED HERE. The answers go to `submitExam`, which rebuilds this
 * exact paper from its seed on the server and marks it there. A client that
 * marked its own paper would be a client that could award itself a pass, and a
 * result nobody can trust is worse than no result.
 */
export function ExamSession({ paper: initialPaper, fillRate }: {
  paper: Paper;
  fillRate: number;
}) {
  /*
    Snapshotted once. Submitting is a Server Action and Next refreshes this
    route's Server Component afterwards, which would hand down a freshly built
    paper; the questions must not change under somebody halfway through
    answering them. The same freeze every review session makes, and it matters
    more here because a changed question mid-paper invalidates the sitting
    rather than one card.
  */
  const [paper] = useState(initialPaper);
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [partIndex, setPartIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  /** Epoch ms each part's clock runs out at, so a resumed part keeps its own. */
  const [deadlines, setDeadlines] = useState<Record<number, number>>({});
  /** Epoch ms the break between the written half and the spoken part ends. */
  const [breakUntil, setBreakUntil] = useState<number | null>(null);
  const [resumable, setResumable] = useState<SavedSitting | null>(null);
  const startedAt = useRef(Date.now());

  const part = paper.parts[partIndex];
  const last = partIndex === paper.parts.length - 1;

  const setResponse = useCallback((itemId: string, response: Response) => {
    setResponses((current) => ({ ...current, [itemId]: response }));
  }, []);

  // ── Not losing three hours of work ─────────────────────────────────────────

  /*
    Looked for once, on mount, and offered rather than restored. Dropping
    somebody straight back into a half finished paper they had forgotten about
    is a worse surprise than the loss it prevents, and the resume card can say
    how much time is left before they choose.
  */
  useEffect(() => {
    const saved = loadSitting(initialPaper.level, initialPaper.seed);
    if (saved && answeredIn(saved) > 0) setResumable(saved);
  }, [initialPaper.level, initialPaper.seed]);

  useEffect(() => {
    if (!started) return;
    saveSitting({
      level: paper.level,
      seed: paper.seed,
      partIndex,
      responses,
      deadlines,
      startedAt: startedAt.current,
      breakUntil,
    });
  }, [started, paper.level, paper.seed, partIndex, responses, deadlines, breakUntil]);

  // ── The clock ──────────────────────────────────────────────────────────────
  const minutes = part?.spec.minutes ?? 0;
  const [now, setNow] = useState(() => Date.now());

  /*
    Set once per part, when the part is first opened, and never reset. It used to
    be recomputed from `Date.now()` in an effect keyed on the part, which is the
    same thing right up until the paper is resumed: a restored sitting would have
    quietly handed back the fifty minutes of reading somebody had already spent.
  */
  useEffect(() => {
    if (!started || breakUntil !== null || !part) return;
    setDeadlines((current) => (
      current[partIndex] !== undefined
        ? current
        : { ...current, [partIndex]: Date.now() + part.spec.minutes * 60_000 }
    ));
  }, [started, breakUntil, part, partIndex]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => window.clearInterval(timer);
  }, [started]);

  const deadline = deadlines[partIndex];
  const remaining = deadline === undefined
    ? minutes * 60
    : Math.max(0, Math.round((deadline - now) / 1000));
  const expired = deadline !== undefined && remaining === 0;

  /**
   * What the invigilator would be saying.
   *
   * A clock in the corner is something you have to remember to look at, and the
   * part of a real examination people describe afterwards is the announcement
   * at five minutes. Three states, so the live region below changes three times
   * rather than sixty times a minute.
   */
  const warning: "none" | "soon" | "last" | "gone" =
    deadline === undefined ? "none"
      : remaining === 0 ? "gone"
        : remaining <= 60 ? "last"
          : remaining <= 300 ? "soon"
            : "none";

  const answered = useMemo(() => {
    if (!part) return 0;
    return part.tasks.reduce(
      (sum, task) => sum + task.items.filter((item) => hasAnswer(responses[item.id])).length,
      0,
    );
  }, [part, responses]);
  const questions = part?.tasks.reduce((sum, task) => sum + task.items.length, 0) ?? 0;

  async function hand() {
    setSubmitting(true);
    setError(null);
    const result = await submitExam({
      level: paper.level,
      seed: paper.seed,
      format: paper.format,
      startedAt: startedAt.current,
      responses,
    }).catch(() => null);

    if (!result?.ok) {
      setSubmitting(false);
      setError(
        result?.error ??
        "You need a connection to hand this in, and you don't have one right now. Your answers are still here on the page.",
      );
      return;
    }
    // Only once the paper is safely marked. Clearing it before the round trip
    // would throw the answers away on exactly the failure the note above is for.
    clearSitting(paper.level, paper.seed);
    router.push(`/exam/result/${result.id}`);
  }

  /** Leaving a part, which on the real paper you cannot undo. */
  function advance() {
    setConfirming(false);
    const next = paper.parts[partIndex + 1];
    // The written parts are sat first and the spoken part follows a short break,
    // which is how the day is actually run. Straight from ninety minutes of
    // writing into a microphone is not the same test.
    if (next?.spec.skill === "speaking") setBreakUntil(Date.now() + BREAK_MINUTES * 60_000);
    setPartIndex((i) => i + 1);
  }

  if (!started) {
    return (
      <Brief
        paper={paper}
        fillRate={fillRate}
        resumable={resumable}
        onResume={() => {
          if (!resumable) return;
          setResponses(resumable.responses);
          setPartIndex(resumable.partIndex);
          setDeadlines(resumable.deadlines ?? {});
          setBreakUntil(resumable.breakUntil);
          startedAt.current = resumable.startedAt;
          setStarted(true);
        }}
        onDiscard={() => {
          clearSitting(paper.level, paper.seed);
          setResumable(null);
        }}
        onStart={() => { startedAt.current = Date.now(); setStarted(true); }}
      />
    );
  }

  if (!part) return null;

  if (breakUntil !== null) {
    return (
      <Break
        level={paper.level}
        until={breakUntil}
        now={now}
        nextLabel={part.spec.label}
        onResume={() => setBreakUntil(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 md:px-10 md:py-10">
      <header
        className="sticky top-0 z-10 -mx-5 mb-6 border-b px-5 py-3 md:-mx-10 md:px-10"
        style={{ background: "var(--ground)", borderColor: "var(--rule)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>
              {paper.level}, part {partIndex + 1} of {paper.parts.length}, {SKILL_ET[part.spec.skill]}
            </p>
            <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              {part.spec.label}
            </h1>
          </div>
          <div className="text-right">
            {/*
              No `aria-live` on the clock itself. It had one, and a region that
              changes every second announces every second: a screen reader user
              sitting a fifty minute part was read three thousand numbers over
              whatever they were trying to answer. The warnings below are the
              live region, and they change three times in the whole part.
            */}
            <p
              className="tnum text-2xl font-bold leading-none"
              style={{ color: warning === "gone" || warning === "last" ? "var(--blush-ink)" : "var(--ink)" }}
              role="timer"
            >
              <Clock size={16} className="mr-1.5 inline" aria-hidden />
              {formatRemaining(remaining)}
            </p>
            <p className="text-2xs mt-1" style={{ color: "var(--ink-3)" }}>
              {answered} of {questions} answered
            </p>
          </div>
        </div>
        <div className="mt-2">
          <Meter
            pct={questions === 0 ? 0 : (answered / questions) * 100}
            label={`${answered} of ${questions} questions answered`}
            height={4}
          />
        </div>
      </header>

      {/*
        One live region for the whole part, announcing at the two thresholds an
        invigilator calls and again when the time goes. It is the clock's
        accessible half: `role="timer"` above says what it is, this says when it
        matters.
      */}
      <p className="sr-only" aria-live="polite">
        {warning === "gone"
          ? "Time is up on this part."
          : warning === "last"
            ? "One minute left."
            : warning === "soon"
              ? "Five minutes left."
              : ""}
      </p>

      {expired ? (
        <div className="mb-5">
          <Note tone="again">
            <TriangleAlert size={14} className="mr-1.5 inline" aria-hidden />
            Time&apos;s up. This part is closed now, the way it would be in a real exam hall. Anything
            you left blank scores nothing.{" "}
            {last ? "Hand in below." : "Move on when you're ready."}
          </Note>
        </div>
      ) : warning === "last" ? (
        <div className="mb-5">
          <Note tone="hard">
            <TriangleAlert size={14} className="mr-1.5 inline" aria-hidden />
            One minute left on this part.
          </Note>
        </div>
      ) : warning === "soon" ? (
        <div className="mb-5">
          <Note tone="neutral">
            <Clock size={14} className="mr-1.5 inline" aria-hidden />
            Five minutes left on this part.
          </Note>
        </div>
      ) : null}

      {/*
        One `fieldset` rather than a `disabled` prop threaded through every
        question shape. It closes radios, text boxes, the composition, the word
        tiles, the play buttons and the microphone in one, which is the point:
        the thing that must not happen when the time goes is that one shape of
        question stays answerable because somebody forgot to pass a flag down to
        it.
      */}
      <fieldset disabled={expired} className="min-w-0">
        {part.tasks.map((task, index) => (
          <TaskBlock
            key={task.spec.id}
            task={task}
            number={index + 1}
            responses={responses}
            onAnswer={setResponse}
            frozen={expired}
          />
        ))}
      </fieldset>

      {error && (
        <div className="mb-4">
          <Note tone="again">
            <CircleAlert size={14} className="mr-1.5 inline" aria-hidden />
            {error}
          </Note>
        </div>
      )}

      {confirming && (
        <div className="mb-4">
          <Note tone="hard">
            <TriangleAlert size={14} className="mr-1.5 inline" aria-hidden />
            {questions - answered === 1
              ? "One question on this part is still blank."
              : `${questions - answered} questions on this part are still blank.`}{" "}
            {last
              ? "Handing in now means they score nothing."
              : "You can't come back to this part once you leave it."}{" "}
            A wrong answer costs you nothing here, so a guess beats a blank.
            <span className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Go back and fill them in
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setConfirming(false); if (last) void hand(); else advance(); }}
              >
                {last ? "Hand in anyway" : "Leave them blank and move on"}
              </Button>
            </span>
          </Note>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5" style={{ borderColor: "var(--rule)" }}>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {last
            ? `Handing in marks the whole paper. You need ${PASS_PCT} percent to pass, and no part can be a zero.`
            : paper.parts[partIndex + 1]?.spec.skill === "speaking"
              ? `Moving on ends the written half. There's a ${BREAK_MINUTES} minute break, then the spoken part.`
              : "Moving on ends this part. You can't come back to it, just like the real exam."}
        </p>
        {last ? (
          <Button
            variant="primary"
            onClick={() => {
              if (answered < questions && !confirming) { setConfirming(true); return; }
              void hand();
            }}
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Marking</>
              : <><Send size={15} aria-hidden /> Hand in</>}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              if (answered < questions && !confirming) { setConfirming(true); return; }
              advance();
            }}
          >
            Next part: {paper.parts[partIndex + 1]?.spec.label}
          </Button>
        )}
      </div>
    </div>
  );
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── The break ────────────────────────────────────────────────────────────────

/**
 * The gap between the written half and the spoken part.
 *
 * The Board's own description of an examination day is the written parts first,
 * two to three hours of them depending on the level, and the spoken part after a
 * short break. This app ran the four parts back to back, which quietly made the
 * spoken part a test of stamina rather than of speaking: nobody is at their best
 * talking into a microphone straight off the end of ninety minutes of writing,
 * and nobody has to be.
 *
 * Ten minutes is ours, because the Board publishes "a short break" and no
 * number, and the screen says so. It can be ended early, and the clock on the
 * spoken part does not start until it is.
 */
function Break({ level, until, now, nextLabel, onResume }: {
  level: Paper["level"]; until: number; now: number; nextLabel: string; onResume: () => void;
}) {
  const prompts = openingConversation(level);
  const left = Math.max(0, Math.round((until - now) / 1000));
  const over = left === 0;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-10 md:py-16">
      <p className="label-xs mb-2" style={{ color: "var(--accent-deep)" }}>
        Between the halves
      </p>
      <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
        <Coffee size={26} className="mr-2 inline" aria-hidden />
        Break
      </h1>
      <p className="mt-3 max-w-[56ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
        The written half is done and its clock has stopped. On the real day there&apos;s a short break
        before the spoken part, and this is yours. Stand up, get some water, and come back for{" "}
        {nextLabel.toLowerCase()}.
      </p>

      <p
        className="tnum mt-8 text-5xl font-bold"
        style={{ color: over ? "var(--sky-ink)" : "var(--ink)" }}
        role="timer"
      >
        {formatRemaining(left)}
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
        {over
          ? "The break is over whenever you are."
          : `${BREAK_MINUTES} minutes. The real exam board just says "a short break" with no number, so we picked one. Go early if you're ready.`}
      </p>

      <p className="sr-only" aria-live="polite">{over ? "The break is over." : ""}</p>

      {/*
        The real spoken part opens with a short conversation with the examiner,
        which the Board describes and this paper otherwise skips. The break is
        the moment to rehearse it: out loud, in Estonian, marked by nobody.
      */}
      <div className="mt-8 rounded-[var(--r-lg)] border px-5 py-4" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          The real spoken part opens with a short conversation
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          The examiner talks to you the way people do when they first meet. Say these out loud in
          Estonian now. Nobody&apos;s listening and nothing&apos;s marked.
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm" style={{ color: "var(--ink-2)" }}>
          {prompts.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <div className="mt-8">
        <Button variant="primary" size="lg" onClick={onResume}>
          Start the spoken part
        </Button>
      </div>
    </div>
  );
}

// ── The briefing ─────────────────────────────────────────────────────────────

/** The four night colours, one per part, in the order the paper is sat. */
const PART_HUES = ["cta", "blush", "accent", "sky"] as const;

/** One thing worth knowing before the clock starts, beside a mark saying what about. */
function Fact({ icon, hue, title, children }: { icon: ReactNode; hue: "butter" | "blush" | "sky" | "accent"; title: string; children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[var(--r-lg)] border p-4"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
    >
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r)]" style={{ background: `var(--${hue === "butter" ? "cta" : hue})`, color: "var(--on-hue)" }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-md font-bold" style={{ color: "var(--ink)" }}>{title}</p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{children}</p>
      </div>
    </div>
  );
}

/**
 * What a task stands in for, as a sentence.
 *
 * Most tasks name the official task they imitate; the two drills and the word
 * order task say they are not a task the real paper sets, and "stands for not
 * a task the real paper sets" is what the old list printed.
 */
function onTheRealPaper(standsFor: string): string {
  return /^not a task/.test(standsFor)
    ? `${standsFor.charAt(0).toUpperCase()}${standsFor.slice(1)}.`
    : `On the real paper: ${standsFor}.`;
}

/** How many listening tasks play their recordings only once. */
function heardOnce(paper: Paper): number {
  return paper.parts.flatMap((p) => p.tasks).filter((t) => t.spec.plays === 1).length;
}

/**
 * What the paper is, before the clock starts.
 *
 * The honest disclosures are here rather than buried at the end, because the
 * moment they matter is the moment somebody decides how much weight to give the
 * result they are about to get.
 */
function Brief({ paper, fillRate, resumable, onResume, onDiscard, onStart }: {
  paper: Paper;
  fillRate: number;
  resumable: SavedSitting | null;
  onResume: () => void;
  onDiscard: () => void;
  onStart: () => void;
}) {
  const speaking = partOf(paper, "speaking");
  const resumePart = resumable ? paper.parts[resumable.partIndex] : undefined;
  const resumeLeft = resumable && resumePart
    ? Math.max(0, Math.round(((resumable.deadlines?.[resumable.partIndex] ?? 0) - Date.now()) / 1000))
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12">
      {resumable && resumePart && (
        <div className="mb-6">
          <Card tone="accent">
            <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>
              <RotateCcw size={16} className="mr-2 inline" aria-hidden />
              You left this paper part way through
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {answeredIn(resumable)} answered so far. You were on {resumePart.spec.label.toLowerCase()}.{" "}
              {resumeLeft > 0
                ? `${formatRemaining(resumeLeft)} is left on that part. The clock kept running while you were away, just as it would in a real exam hall.`
                : "That part's time ran out while you were away. It'll open already closed, just as it would in a real exam hall."}
            </p>
            <span className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={onDiscard}>
                Throw it away and start fresh
              </Button>
              <Button variant="primary" size="sm" onClick={onResume}>Carry on</Button>
            </span>
          </Card>
        </div>
      )}
      {/*
        The paper as one night panel: which examination, what it is, and the
        whole day drawn as a line, each part as long as its clock, so the shape
        of the sitting is seen before a word of it is read.
      */}
      <section className="night rounded-[var(--r-xl)] border px-5 py-8 sm:px-8 md:px-10 md:py-11">
        <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "rgb(255 255 255 / 0.08)", border: "1px solid rgb(255 255 255 / 0.14)", color: "var(--ink)" }}>
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: paper.spec.official ? "var(--cta)" : "var(--blush)" }} />
          {paper.spec.official ? "Mock state examination" : "Not a state examination"}
        </p>
        <h1 className="font-display mt-5 text-6xl font-bold leading-[0.95] tracking-tight md:text-7xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
          {paper.level}
          <span className="text-3xl md:text-4xl" style={{ color: "var(--ink-2)" }}>
            {paper.number ? `, paper ${paper.number}` : ""}
            {paper.part ? `, ${SKILL_LABEL[paper.part].toLowerCase()} only` : ""}
          </span>
        </h1>
        <p className="mt-4 max-w-[60ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {paper.spec.summary}
        </p>
        <div aria-hidden className="mt-8 flex h-3 gap-1">
          {paper.parts.map((part, index) => (
            <Fragment key={part.spec.skill}>
              {!paper.part && part.spec.skill === "speaking" && (
                <span className="rounded-full" style={{ flexGrow: BREAK_MINUTES, background: "rgb(255 255 255 / 0.14)" }} />
              )}
              <span className="rounded-full" style={{ flexGrow: part.spec.minutes, background: `var(--${PART_HUES[index % PART_HUES.length]})` }} />
            </Fragment>
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {paper.parts.map((part, index) => (
            <li key={part.spec.skill} className="flex items-center gap-2 whitespace-nowrap text-sm">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--${PART_HUES[index % PART_HUES.length]})` }} />
              <span className="font-semibold" style={{ color: "var(--ink)" }}>{part.spec.label}</span>
              <span className="tnum" style={{ color: "var(--ink-3)" }}>{part.spec.minutes} min</span>
            </li>
          ))}
        </ul>
      </section>

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {paper.parts.map((part, index) => (
          <li
            key={part.spec.skill}
            className="relative overflow-hidden rounded-[var(--r-xl)] border px-5 pb-5 pt-6"
            style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth)" }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: `var(--${PART_HUES[index % PART_HUES.length]})` }} />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="label-xs block" style={{ color: "var(--ink-3)" }}>
                  Part {index + 1}
                </span>
                <span className="font-display mt-1 block text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {part.spec.label}
                </span>
                <span lang="et" className="text-sm" style={{ color: "var(--ink-3)" }}>
                  {SKILL_ET[part.spec.skill]}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Chip>{part.spec.minutes} min</Chip>
                <Chip tone="accent">{part.spec.points} points</Chip>
              </span>
            </div>
            <ul className="mt-4 grid gap-2.5">
              {/* Two tasks with one title and one official counterpart are one
                  line with a count, not the same line printed twice. */}
              {part.tasks.filter((task, i, all) =>
                all.findIndex((t) => t.spec.title === task.spec.title && t.spec.standsFor === task.spec.standsFor) === i,
              ).map((task) => {
                const times = part.tasks.filter((t) => t.spec.title === task.spec.title && t.spec.standsFor === task.spec.standsFor).length;
                return (
                <li key={task.spec.id} className="border-t pt-2.5 text-sm leading-relaxed" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-2)" }}>
                  <span className="block font-semibold" style={{ color: "var(--ink)" }}>
                    {task.spec.title}
                    {times > 1 && <span className="tnum">{` × ${times}`}</span>}
                    {task.spec.plays === 1 && <span style={{ color: "var(--ink-3)" }}>, heard once</span>}
                  </span>
                  <span className="block" style={{ color: "var(--ink-3)" }}>{onTheRealPaper(task.spec.standsFor)}</span>
                  {task.fallbackFrom && (
                    <span className="block" style={{ color: "var(--butter-ink)" }}>
                      Set in a simpler shape this time, because the dictionary didn&apos;t have the
                      sentences the real task needs.
                    </span>
                  )}
                  {task.shortfall > 0 && (
                    <span className="block" style={{ color: "var(--blush-ink)" }}>{task.shortfallReason}</span>
                  )}
                </li>
                );
              })}
            </ul>
            {part.spec.notSet && (
              <p className="mt-3 border-t pt-2.5 text-sm leading-relaxed" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-3)" }}>
                {part.spec.notSet}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3">
        {paper.part ? (
          <Note tone="sky">
            You&apos;re sitting just this one part, with {paper.parts[0]?.spec.minutes ?? 0} minutes
            on the clock. The real exam marks all four parts together, so you&apos;ll get a mark for
            this part, not a pass or a fail. When the time&apos;s up, it closes. Your answers are
            saved on this device as you go.
          </Note>
        ) : (
        /*
          The day as three steps rather than a paragraph, since the order is
          the thing to hold in your head, and then the three rules that come
          with it as a list a candidate can check off.
        */
        <section className="rounded-[var(--r-xl)] border p-5 sm:p-6" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>How the day runs</h2>
          <ol className="mt-4 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))" }}>
            {[
              { label: "Written paper", minutes: writtenMinutes(paper.spec), hue: "accent" },
              { label: "A break", minutes: BREAK_MINUTES, hue: "raised" },
              { label: "Speaking", minutes: speaking?.spec.minutes ?? 15, hue: "sky" },
            ].map((step, i) => (
              <li
                key={step.label}
                className="flex items-center gap-3 rounded-[var(--r-lg)] px-4 py-3"
                style={{ background: step.hue === "raised" ? "var(--raised)" : `var(--${step.hue}-soft)` }}
              >
                <span aria-hidden className="font-display tnum text-2xl font-bold" style={{ color: "var(--ink-3)" }}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold" style={{ color: "var(--ink)" }}>{step.label}</span>
                  <span className="tnum block text-sm" style={{ color: "var(--ink-2)" }}>{step.minutes} minutes</span>
                </span>
              </li>
            ))}
          </ol>
          <ul className="mt-4 grid gap-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            <li className="flex gap-2.5"><Clock size={15} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} />Each part runs on its own clock and closes when its time runs out. Once you leave a part you can&apos;t go back to it.</li>
            <li className="flex gap-2.5"><Save size={15} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} />Your answers are saved on this device as you go, so a reload loses nothing. The clock keeps running while the tab is closed.</li>
          </ul>
        </section>
        )}
        <div className="grid gap-3 md:grid-cols-2">
        {partOf(paper, "writing") && (
        <Fact icon={<PenLine size={18} />} hue="butter" title="The writing clock is for two texts">
          On the real exam the writing part is two texts, and the clock is only for those two. The
          grammar questions after them are our own extra, because nothing here can check your
          grammar the way an examiner does. They come last, so give them whatever time is left.
        </Fact>
        )}
        {partOf(paper, "listening") && (
        <Fact icon={<Headphones size={18} />} hue="blush" title={heardOnce(paper) > 0 ? "Some recordings play once" : "Two plays per recording"}>
          {heardOnce(paper) > 0
            ? `Most recordings play twice, but one task plays each recording only once, as the real ${paper.level} paper does. `
            : `Each recording plays ${LISTEN_PLAYS === 2 ? "twice" : `${LISTEN_PLAYS} times`} and no more, as on the real exam. `}
          Every listening task gives you time to read its questions before the audio unlocks, and
          the recordings are read by different voices, as the real ones are.
        </Fact>
        )}
        <Fact icon={<WifiOff size={18} />} hue="sky" title="Sit it with a connection">
          The recordings load as you play them and the paper is marked on our server. If handing in
          fails, your answers stay on the page and you can press the button again.
        </Fact>
        {speaking && (
        <Fact icon={<Mic size={18} />} hue="accent" title="Speaking is marked by you">
          You mark the spoken part yourself: record, listen back, and tick off what you managed. We
          tested speech recognizers and none was accurate enough for Estonian. In the break before
          it, you&apos;ll rehearse the small talk a real examiner opens with.
        </Fact>
        )}
        </div>
        {paper.substituted && (
          <Note tone="hard">
            <FileWarning size={14} className="mr-1.5 inline" aria-hidden />
            Some tasks use single words instead of full sentences, because we don&apos;t have a
            recorded sentence for every word yet. Each one says so above. It makes this paper a
            little easier than the real one, which is worth knowing before you look at your score.
          </Note>
        )}
        {paper.thin && (
          <Note tone="again">
            <FileWarning size={14} className="mr-1.5 inline" aria-hidden />
            We could only fill {fillRate} percent of this paper from the dictionary, so some tasks
            are shorter than usual. Each part is marked on what was actually set, and your result
            will say what was missing. Add more words to your deck and the paper fills in over
            time. Running your own copy of Kodukeel? Turning on live dictionary lookups fills it
            straight away.
          </Note>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="primary" size="lg" onClick={onStart}>
          Start the clock
        </Button>
      </div>
    </div>
  );
}

// ── One task ─────────────────────────────────────────────────────────────────

/** Item shapes that are a recording, and so have plays to count and a pause before them. */
type HeardItem = Extract<ExamItem, { kind: "dictation" | "listen-choose" | "listen-gap" | "listen-truefalse" }>;

function isHeard(item: ExamItem): item is HeardItem {
  return item.kind === "dictation" || item.kind === "listen-choose"
    || item.kind === "listen-gap" || item.kind === "listen-truefalse";
}

/**
 * The voice a recording is read in.
 *
 * The real listening part is read by several people, men and women, and a
 * learner who has only heard one voice say a word has learned that voice. So
 * each question has a voice of its own, the same one for both plays, and the
 * walk through the list is offset per task so two tasks do not open on the
 * same speaker.
 */
function voiceFor(task: number, item: number): string {
  return VOICES[(task * 3 + item) % VOICES.length]!.id;
}

function TaskBlock({ task, number, responses, onAnswer, frozen }: {
  task: ExamTask;
  number: number;
  responses: Record<string, Response>;
  onAnswer: (itemId: string, response: Response) => void;
  /** The part's time has gone, so nothing here should still be counting down. */
  frozen: boolean;
}) {
  const audible = task.items.some(isHeard);
  const pause = task.spec.readSeconds ?? READ_QUESTIONS_SECONDS;
  const plays = task.spec.plays ?? LISTEN_PLAYS;
  /*
    The pause before a listening task, which every specification describes and
    which this app did not have: the recordings used to be playable the instant
    the part opened, so the first one arrived while the learner was still finding
    out what they were being asked. Skippable, because the point is to teach the
    shape of the part rather than to make somebody sit out time they have
    already used. Its length is the level's own where the specification gives
    one: a minute at B2, ten seconds a question on the clips heard once.
  */
  const [reading, setReading] = useState(audible);
  const [left, setLeft] = useState(pause);

  useEffect(() => {
    if (!reading || frozen) return;
    const ends = Date.now() + pause * 1000;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.round((ends - Date.now()) / 1000));
      setLeft(seconds);
      if (seconds === 0) setReading(false);
    }, 250);
    return () => window.clearInterval(timer);
  }, [reading, frozen, pause]);

  /*
    A matching task and a word bank share one list of answers, so it is
    printed once, above the questions, with a letter beside each entry, which is
    how the real paper lays both out. It used to be printed again under every
    sentence, eight copies of one list down a screen.
  */
  const lettered = task.items.length > 0 && (task.spec.kind === "match-usage" || task.spec.kind === "gap-bank")
    && (task.choices?.length ?? 0) > 0;
  const bank = lettered ? task.choices! : [];
  const chosenElsewhere = (itemId: string) => new Set(
    task.items
      .filter((other) => other.id !== itemId)
      .map((other) => responses[other.id])
      .flatMap((r) => (r?.kind === "chosen" ? [r.value] : [])),
  );

  return (
    <section className="mb-10">
      <SectionTitle hint={`${task.spec.raw} ${task.spec.raw === 1 ? "mark" : "marks"}`}>
        Task {number}: {task.spec.title}
      </SectionTitle>
      <p className="mb-4 max-w-[62ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {task.spec.instruction}
      </p>

      {audible && reading && task.items.length > 0 && (
        <div className="mb-4">
          <Note tone="hard">
            <Ear size={14} className="mr-1.5 inline" aria-hidden />
            Read the questions first. The recordings unlock in{" "}
            <span className="tnum font-semibold">{left}</span> seconds, as on the real exam.{" "}
            {plays === 1 ? "Each one plays once." : `Each one plays ${plays === 2 ? "twice" : `${plays} times`}.`}
            <span className="mt-3 flex">
              <Button variant="ghost" size="sm" onClick={() => setReading(false)}>
                I&apos;ve read them, unlock the recordings
              </Button>
            </span>
          </Note>
        </div>
      )}

      {task.shortfall > 0 && (
        <div className="mb-4">
          <Note tone="neutral">{task.shortfallReason}</Note>
        </div>
      )}

      {lettered && <Bank entries={bank} glossed={task.spec.kind === "match-usage"} />}

      {task.items.length === 0 ? (
        <Note tone="neutral">
          We couldn&apos;t set anything for this task, so it carries no marks. The part is marked
          on what&apos;s left.
        </Note>
      ) : (
        <ol className="grid gap-4">
          {task.items.map((item, index) => (
            <li key={item.id}>
              <Card className="!py-4">
                <ItemView
                  item={item}
                  number={index + 1}
                  marks={task.spec.raw}
                  bank={lettered ? { entries: bank, taken: chosenElsewhere(item.id) } : undefined}
                  response={responses[item.id]}
                  canPlay={!reading}
                  plays={plays}
                  voice={voiceFor(number, index)}
                  onAnswer={(next) => onAnswer(item.id, next)}
                />
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** A, B, C, and on past Z if a bank ever ran that long. */
function letterOf(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

/** The shared list of a matching task or a word bank, printed once with its letters. */
function Bank({ entries, glossed }: { entries: { id: string; label: string; gloss: string }[]; glossed: boolean }) {
  return (
    <div
      className="mb-4 rounded-[var(--r-lg)] border px-4 py-3"
      style={{ borderColor: "var(--edge)", background: "var(--raised)" }}
    >
      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
        {glossed ? "The words" : "The word bank"}
      </p>
      <ul className="grid gap-x-6 gap-y-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 11rem), 1fr))" }}>
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex items-baseline gap-2 text-md">
            <span className="tnum w-5 shrink-0 font-bold" style={{ color: "var(--accent-deep)" }}>{letterOf(index)}</span>
            <span className="min-w-0">
              <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{entry.label}</span>
              {glossed && entry.gloss && (
                <span className="ml-2 text-sm" style={{ color: "var(--ink-3)" }}>{entry.gloss}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── One question ─────────────────────────────────────────────────────────────

function ItemView({ item, number, marks, bank, response, canPlay, plays, voice, onAnswer }: {
  item: ExamItem;
  number: number;
  /** The marks this task carries, which is how many criteria the spoken task offers. */
  marks: number;
  /** The shared bank, and the letters other questions have already taken. */
  bank?: { entries: { id: string; label: string; gloss: string }[]; taken: Set<string> };
  response: Response | undefined;
  /** False while the task's reading pause is still running. */
  canPlay: boolean;
  plays: number;
  voice: string;
  onAnswer: (response: Response) => void;
}) {
  const stem = (
    <span className="label-xs mr-2 shrink-0" style={{ color: "var(--ink-3)" }}>{number}</span>
  );
  const chosen = response?.kind === "chosen" ? response.value : null;

  switch (item.kind) {
    case "match-usage":
    case "gap-bank":
      return (
        <div>
          <p className="mb-3 text-md leading-relaxed" style={{ color: "var(--ink)" }} lang="et">
            {stem}{item.sentence}
          </p>
          <LetterPick
            name={item.id}
            question={number}
            entries={bank?.entries ?? []}
            taken={bank?.taken ?? new Set()}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
          />
        </div>
      );

    case "gap-choice":
      return (
        <div>
          <p className="mb-3 text-md leading-relaxed" style={{ color: "var(--ink)" }} lang="et">
            {stem}{item.sentence}
          </p>
          <Options
            name={item.id}
            options={item.options.map((value) => ({ value, label: value }))}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
          />
        </div>
      );

    case "listen-choose":
      return (
        <Audible text={item.answer} number={number} response={response} canPlay={canPlay} plays={plays} voice={voice} onAnswer={onAnswer}
          lead={item.unit === "word" ? "One word. Play it, then choose what you heard." : "Play it, then choose what you heard."}>
          <Options
            name={item.id}
            options={item.options.map((value) => ({ value, label: value }))}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
          />
        </Audible>
      );

    case "listen-gap":
      return (
        <Audible text={item.full} number={number} response={response} canPlay={canPlay} plays={plays} voice={voice} onAnswer={onAnswer}
          lead="Play it, and write the missing word.">
          <p className="mb-3 text-md leading-relaxed" style={{ color: "var(--ink)" }} lang="et">{item.sentence}</p>
          <EstonianInput
            value={response?.kind === "typed" ? response.value : ""}
            onChange={(value) => onAnswer({ kind: "typed", value })}
            ariaLabel={`Recording ${number}, the missing word`}
            placeholder="The missing word"
          />
        </Audible>
      );

    case "listen-truefalse":
      return (
        <Audible text={item.audio} number={number} response={response} canPlay={canPlay} plays={plays} voice={voice} onAnswer={onAnswer}
          lead="Play it, then say whether the line below is what it said.">
          <blockquote
            className="mb-3 rounded-[var(--r)] border-l-4 px-4 py-2.5 text-md leading-relaxed"
            style={{ borderColor: "var(--accent)", background: "var(--raised)", color: "var(--ink)" }}
            lang="et"
          >
            {item.statement}
          </blockquote>
          <Options
            name={item.id}
            options={[
              { value: "true", label: "True, that's what it said" },
              { value: "false", label: "False, it said something else" },
            ]}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
            english
          />
        </Audible>
      );

    case "gloss-choice":
      return (
        <div>
          <p className="mb-3 text-md" style={{ color: "var(--ink)" }}>
            {stem}
            <span className="font-semibold" lang="et">{item.word}</span>
          </p>
          <Options
            name={item.id}
            options={item.options.map((value) => ({ value, label: value }))}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
            english
          />
        </div>
      );

    case "form-choice":
      return (
        <div>
          <p className="mb-3 text-md" style={{ color: "var(--ink)" }}>
            {stem}
            <span className="font-semibold" lang="et">{item.lemma}</span>
            <span style={{ color: "var(--ink-3)" }}> {item.translation}</span>
            <span className="ml-2">
              in the{" "}
              {/* The name, the question and what that asks, as one label, with
                  the reading always on rather than the Latin name. The paper is
                  marked on the form the candidate writes, so saying which form
                  is wanted in words they have met gives nothing away; being
                  unable to read the instruction is not the thing being
                  measured. See `lib/estonian/cases.ts`. */}
              <CaseLabel label={{ et: item.caseEt, question: item.caseQuestion }} reading="always" />
            </span>
          </p>
          <Options
            name={item.id}
            options={item.options.map((value) => ({ value, label: value }))}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
          />
        </div>
      );

    case "government":
      return (
        <div>
          <p className="mb-1 text-md" style={{ color: "var(--ink)" }}>
            {stem}
            <span className="font-semibold" lang="et">{item.lemma}</span>
            <span style={{ color: "var(--ink-3)" }}> {item.translation}</span>
          </p>
          {item.cue && (
            <p className="mb-3 text-sm" style={{ color: "var(--ink-3)" }} lang="et">{item.cue}</p>
          )}
          <Options
            name={item.id}
            /* The hint under each option is the question that case answers,
               and what it is asking: a list of Estonian question words is a
               list of Estonian to a candidate, and which case a verb pairs
               with is the one thing in this language nobody can reason out. */
            options={item.options.map((o) => ({
              value: o.key,
              label: o.et,
              caseLabel: o.question ? { et: o.et, question: o.question } : undefined,
            }))}
            selected={chosen}
            onSelect={(value) => onAnswer({ kind: "chosen", value })}
            stacked
          />
        </div>
      );

    case "case-form":
      return (
        <div>
          <p className="mb-3 text-md" style={{ color: "var(--ink)" }}>
            {stem}
            <span className="font-semibold" lang="et">{item.lemma}</span>
            <span style={{ color: "var(--ink-3)" }}> {item.translation}</span>
            <span className="ml-2">
              in the{" "}
              {/* The name, the question and what that asks, as one label, with
                  the reading always on rather than the Latin name. The paper is
                  marked on the form the candidate writes, so saying which form
                  is wanted in words they have met gives nothing away; being
                  unable to read the instruction is not the thing being
                  measured. See `lib/estonian/cases.ts`. */}
              <CaseLabel label={{ et: item.caseEt, question: item.caseQuestion }} reading="always" />
            </span>
          </p>
          <EstonianInput
            value={response?.kind === "typed" ? response.value : ""}
            onChange={(value) => onAnswer({ kind: "typed", value })}
            ariaLabel={`${item.caseEt} of ${item.lemma}, ${questionInEnglish(item.caseQuestion)}`}
            placeholder="Write the form"
          />
        </div>
      );

    case "dictation":
      return (
        <Audible text={item.answer} number={number} response={response} canPlay={canPlay} plays={plays} voice={voice} onAnswer={onAnswer} slow
          lead={item.unit === "word" ? "One word. Write it down." : `${item.words} words. Write them down.`}>
          <EstonianInput
            value={response?.kind === "typed" ? response.value : ""}
            onChange={(value) => onAnswer({ kind: "typed", value })}
            ariaLabel={`Recording ${number}, written down`}
            placeholder="Write what you hear"
          />
        </Audible>
      );

    case "order":
      return (
        <OrderQuestion
          item={item}
          number={number}
          built={response?.kind === "ordered" ? response.value : []}
          onBuild={(value) => onAnswer({ kind: "ordered", value })}
        />
      );

    case "message":
    case "compose":
      return (
        <WrittenQuestion
          item={item}
          response={response?.kind === "composed" ? response : null}
          onWrite={(value, variant) => onAnswer({ kind: "composed", value, variant })}
        />
      );

    case "speak":
      return (
        <SpeakQuestion
          item={item}
          marks={marks}
          response={response?.kind === "spoken" ? response : null}
          onMark={(next) => onAnswer(next)}
        />
      );
  }
}

/**
 * A listening question, and what to do when the recording will not play.
 *
 * `Speak` removes itself when the speech proxy cannot produce audio, which on
 * every other screen loses a pronunciation button and here would leave a
 * question with no way to answer it. Marking that wrong would charge the
 * learner for an outage of ours, so the item reports itself unheard and the
 * server leaves it out of the marks entirely. The learner is told, in the same
 * words the result will use.
 */
function Audible({ text, number, response, canPlay, plays, voice, onAnswer, slow, lead, children }: {
  /** What is played, which is not always what is answered. */
  text: string;
  number: number;
  response: Response | undefined;
  canPlay: boolean;
  plays: number;
  voice: string;
  onAnswer: (response: Response) => void;
  slow?: boolean;
  lead: string;
  children: ReactNode;
}) {
  const [gone, setGone] = useState(false);
  /*
    Counted here rather than in `Speak`, because the budget belongs to the
    question and not to a button: the dictation offers a slow play as well, and
    two buttons each keeping their own count would quietly hand out four plays.
    Incremented only when a play actually happened, so a clip that would not load
    costs nothing and takes the unheard path below instead.
  */
  const [played, setPlayed] = useState(0);
  const spent = played >= plays;
  const unheard = gone || response?.kind === "unheard";

  const lose = () => {
    setGone(true);
    onAnswer({ kind: "unheard" });
  };

  if (unheard) {
    return (
      <div>
        <p className="mb-2 text-sm" style={{ color: "var(--ink-2)" }}>
          <span className="label-xs mr-2" style={{ color: "var(--ink-3)" }}>{number}</span>
          <VolumeX size={14} className="mr-1.5 inline" aria-hidden />
          The recording wouldn&apos;t play, so this question is left out of the marks rather than
          counted against you.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
        <span className="label-xs" style={{ color: "var(--ink-3)" }}>{number}</span>
        {slow ? (
          <SpeakPair
            text={text}
            label={`Play recording ${number}`}
            slowLabel={`Play recording ${number} slowly`}
            disabled={!canPlay || spent}
            voice={voice}
            onPlay={() => setPlayed((n) => n + 1)}
            onUnavailable={lose}
          />
        ) : (
          <Speak
            text={text}
            label={`Play recording ${number}`}
            disabled={!canPlay || spent}
            voice={voice}
            onPlay={() => setPlayed((n) => n + 1)}
            onUnavailable={lose}
          />
        )}
        <span className="min-w-0">{lead}</span>
        {/*
          Nothing per question while the pause is running: the task says once,
          at the top, that the recordings are shut, and repeating it on every
          question of a listening part is noise where the options need to be
          readable.
        */}
        {canPlay && (
          <span
            className="tnum whitespace-nowrap"
            style={{ color: spent ? "var(--blush-ink)" : "var(--ink-3)" }}
          >
            {spent
              ? plays === 1 ? "Played. Answer with what you heard." : "Plays used up. Answer with what you heard."
              : plays === 1 ? "Plays once." : `${plays - played} of ${plays} plays left.`}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * How a set of options is laid out, from how many there are and how long.
 *
 * Three short forms in a row and four in a square, because that is how a
 * printed paper sets them and a column of four one-word buttons down a desktop
 * screen reads as a form rather than a question. Anything long enough to wrap
 * goes one to a line, so no option is the odd one out by being the only one on
 * two lines. Measured against the room the list has (`@container`), not the
 * window, since at 768 the rail leaves this list about 340px.
 */
function optionLayout(labels: readonly string[], stacked?: boolean): string {
  const longest = Math.max(0, ...labels.map((l) => l.length));
  if (labels.length === 2 && longest <= 32 && !stacked) return "grid gap-2 @md:grid-cols-2";
  if (stacked || longest > 24) return "grid gap-2";
  if (labels.length === 3 && longest <= 14) return "grid gap-2 @md:grid-cols-3";
  if (labels.length === 4 && longest <= 14) return "grid gap-2 @xs:grid-cols-2 @2xl:grid-cols-4";
  if (labels.length === 2) return "grid gap-2 @md:grid-cols-2";
  return "grid gap-2 @lg:grid-cols-2";
}

/** A radio group that looks like a set of cards and behaves like a radio group. */
function Options({ name, options, selected, onSelect, english, stacked }: {
  name: string;
  options: {
    value: string;
    label: string;
    /** A case named beside its question, drawn as one label rather than a label and a hint. */
    caseLabel?: { et: string; question: string };
  }[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** The options are English rather than Estonian, so do not tag them. */
  english?: boolean;
  /** One to a line whatever their length, for options that carry a second line. */
  stacked?: boolean;
}) {
  return (
    <div className="@container">
      <div className={optionLayout(options.map((o) => o.label), stacked)} role="radiogroup">
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <label
              key={option.value}
              className="choice-btn flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[var(--r)] border px-3 py-2.5 text-md"
              style={active ? {
                borderColor: "var(--accent)",
                "--choice-bg": "var(--accent-soft)",
                color: "var(--accent-deep)",
              } as React.CSSProperties : { color: "var(--ink)" }}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onSelect(option.value)}
                /* Level with the first line of the label, however many lines it
                   runs to, so a two-line option puts its radio where a one-line
                   neighbour does rather than halfway down its own text. */
                className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                {option.caseLabel ? (
                  <CaseLabel label={option.caseLabel} reading="always" />
                ) : (
                  <span lang={english ? undefined : "et"}>{option.label}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A letter for one gap or one sentence, out of the shared list above it.
 *
 * Letters, as the real paper uses, because a list of eight words printed under
 * each of eight sentences is a wall. A letter another question already took is
 * drawn as taken, dashed and quiet, and stays pressable: the real paper lets
 * you change your mind, and so does this.
 */
function LetterPick({ name, question, entries, taken, selected, onSelect }: {
  name: string;
  question: number;
  entries: { id: string; label: string }[];
  taken: Set<string>;
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  const picked = entries.find((e) => e.id === selected);
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={`Answer for ${question}`}>
      {entries.map((entry, index) => {
        const active = selected === entry.id;
        const elsewhere = !active && taken.has(entry.id);
        return (
          <label
            key={entry.id}
            className="choice-btn grid size-11 shrink-0 cursor-pointer place-items-center rounded-[var(--r)] border text-md font-bold"
            style={active ? {
              borderColor: "var(--accent)",
              "--choice-bg": "var(--accent-soft)",
              color: "var(--accent-deep)",
            } as React.CSSProperties : elsewhere ? {
              borderStyle: "dashed",
              color: "var(--ink-3)",
            } : { color: "var(--ink)" }}
          >
            <input
              type="radio"
              name={name}
              value={entry.id}
              checked={active}
              onChange={() => onSelect(entry.id)}
              className="sr-only"
            />
            <span aria-hidden>{letterOf(index)}</span>
            <span className="sr-only" lang="et">{`${letterOf(index)}, ${entry.label}${elsewhere ? ", already used" : ""}`}</span>
          </label>
        );
      })}
      {picked && (
        <span className="ml-1 text-md font-semibold" style={{ color: "var(--accent-deep)" }} lang="et" aria-hidden>
          {picked.label}
        </span>
      )}
    </div>
  );
}

/** Tap the words in order. Tapping a placed word takes it back. */
function OrderQuestion({ item, number, built, onBuild }: {
  item: Extract<ExamItem, { kind: "order" }>;
  number: number;
  built: string[];
  onBuild: (next: string[]) => void;
}) {
  const remaining = useMemo(() => {
    const pool = [...item.tiles];
    for (const word of built) {
      const at = pool.indexOf(word);
      if (at !== -1) pool.splice(at, 1);
    }
    return pool;
  }, [item.tiles, built]);

  return (
    <div>
      <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
        <span className="label-xs mr-2" style={{ color: "var(--ink-3)" }}>{number}</span>
        Tap the words in order. Tap one you&apos;ve placed to take it back.
      </p>
      <div
        className="mb-3 flex min-h-[52px] flex-wrap items-center gap-2 rounded-[var(--r)] border border-dashed p-3"
        style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
        lang="et"
      >
        {built.length === 0
          ? <span className="text-sm" style={{ color: "var(--ink-3)" }}>Your sentence goes here.</span>
          : built.map((word, index) => (
            <button
              key={`${word}-${index}`}
              type="button"
              onClick={() => onBuild(built.filter((_, i) => i !== index))}
              className="press min-h-[44px] rounded-[var(--r-sm)] px-3 py-2 text-md transition-ui hover:scale-[1.02]"
              style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
            >
              {word}
            </button>
          ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => onBuild([...built, word])}
            className="choice-btn min-h-[44px] rounded-[var(--r-sm)] border px-3 py-2 text-md"
            style={{ color: "var(--ink)" }}
            lang="et"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The words a written task has to use, ticked off as they are used.
 *
 * `usesRequiredWord` is imported from the marking rather than reimplemented,
 * which is the whole point of it being exported: a chip that lit up on a rule of
 * its own would be telling somebody they had a mark the server was not going to
 * give them. Estonian inflects, so `raamatust` lights `raamat`, exactly as it
 * scores it, and `kirjutan` lights nothing, exactly as it scores that.
 */
function RequiredWords({ words, text }: { words: MustUseWord[]; text: string }) {
  if (words.length === 0) return null;
  const used = words.filter((word) => usesRequiredWord(word, text)).length;

  return (
    <div className="mt-3">
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Use every one of these, in whatever form your sentence needs.{" "}
        <span className="tnum font-semibold" style={{ color: used === words.length ? "var(--sky-ink)" : "var(--ink-3)" }}>
          {used} of {words.length} used
        </span>
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        {words.map((word) => {
          const done = usesRequiredWord(word, text);
          return (
            <Chip key={word.lexemeId} tone={done ? "good" : "neutral"} caseSensitive>
              {done && <Check size={12} aria-hidden />}
              <span lang="et">{word.lemma}</span>
              <span>{word.translation}</span>
            </Chip>
          );
        })}
      </p>
    </div>
  );
}

/** How far a written answer is through the length that carries its marks. */
function LengthMeter({ text, minWords, maxWords }: { text: string; minWords: number; maxWords: number | null }) {
  const words = wordsOf(text).length;
  const there = words >= minWords;
  const over = maxWords !== null && words > maxWords;
  const target = maxWords ? `${minWords} to ${maxWords}` : `${minWords}`;
  return (
    <>
      <div className="mt-2">
        <Meter
          pct={minWords === 0 ? 100 : Math.min(100, (words / minWords) * 100)}
          label={`${words} of ${target} words written`}
          tone={over ? "var(--blush)" : there ? "var(--sky)" : "var(--accent)"}
          height={4}
        />
      </div>
      <p className="mt-2 text-sm" style={{ color: over ? "var(--blush-ink)" : there ? "var(--sky-ink)" : "var(--ink-3)" }}>
        <span className="tnum">{words}</span> of {target} words.{" "}
        {over
          ? `That's over the limit, which costs length marks, as on the real paper. Cut it back to ${maxWords}.`
          : there ? "That's long enough." : "Half the length still earns about half the length marks."}
      </p>
    </>
  );
}

/** A business card, for the A2 information transfer. */
function BusinessCard({ card }: { card: Extract<Exhibit, { layout: "card" }> }) {
  return (
    <figure
      aria-label="The business card"
      className="mt-3 max-w-sm rounded-[var(--r-lg)] border px-5 py-4"
      style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth)" }}
    >
      <p className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>{card.name}</p>
      <p className="mt-0.5 text-md font-semibold" style={{ color: "var(--accent-deep)" }}>
        <span lang="et">{card.job.lemma}</span>
        <span className="ml-2 text-sm font-normal" style={{ color: "var(--ink-3)" }}>{card.job.translation}</span>
      </p>
      <dl className="mt-3 grid gap-1 text-sm" style={{ gridTemplateColumns: "auto 1fr", columnGap: "0.75rem", color: "var(--ink-2)" }}>
        <dt style={{ color: "var(--ink-3)" }}>Works at</dt>
        <dd>
          <span lang="et" style={{ color: "var(--ink)" }}>{card.workplace.lemma}</span>
          <span className="ml-2" style={{ color: "var(--ink-3)" }}>{card.workplace.translation}</span>
        </dd>
        <dt style={{ color: "var(--ink-3)" }}>Town</dt>
        <dd style={{ color: "var(--ink)" }}>{card.city}</dd>
        <dt style={{ color: "var(--ink-3)" }}>Open</dt>
        <dd style={{ color: "var(--ink)" }}>{card.hours}</dd>
        <dt style={{ color: "var(--ink-3)" }}>E-mail</dt>
        <dd className="min-w-0" style={{ color: "var(--ink)" }}>{card.email}</dd>
      </dl>
    </figure>
  );
}

/** Two columns of figures, for the summaries at B2 and C1. */
function FigureTable({ table }: { table: Extract<Exhibit, { layout: "table" }> }) {
  return (
    <figure className="mt-3">
      <figcaption className="mb-2">
        <span className="block text-md font-semibold" style={{ color: "var(--ink)" }}>{table.title}</span>
        <span className="text-sm" style={{ color: "var(--ink-3)" }}>
          In {table.unit}. These figures are made up for practice, so don&apos;t quote them as facts.
        </span>
      </figcaption>
      <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr style={{ background: "var(--raised)" }}>
              <th scope="col" className="px-3 py-2 text-left font-semibold" style={{ color: "var(--ink-2)" }}><span className="sr-only">Group</span></th>
              {table.columns.map((column) => (
                <th key={column} scope="col" className="tnum whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color: "var(--ink-2)" }}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.label} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-normal" style={{ color: "var(--ink)" }}>{row.label}</th>
                {row.values.map((value, i) => (
                  <td key={i} className="tnum px-3 py-2 text-right" style={{ color: "var(--ink)" }}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Either written task: a brief, or a choice of briefs, and a text to write.
 *
 * Where the real paper offers a choice ("kas a) jutt etteantud teemal, või b)
 * isiklik kiri"), so does this. Each brief carries its own words, and switching
 * keeps the text: somebody who has written eighty words and then decides it is
 * really a letter should not lose them.
 */
function WrittenQuestion({ item, response, onWrite }: {
  item: Extract<ExamItem, { kind: "message" | "compose" }>;
  response: Extract<Response, { kind: "composed" }> | null;
  onWrite: (next: string, variant: number) => void;
}) {
  const text = response?.value ?? "";
  const chosen = Math.min(response?.variant ?? 0, item.variants.length - 1);
  const brief = item.variants[chosen];
  if (!brief) return null;

  return (
    <div>
      {item.variants.length > 1 && (
        <div className="mb-4">
          <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>Choose one to write</p>
          <div className="@container">
            <div className="grid gap-2 @md:grid-cols-2" role="radiogroup" aria-label="Which to write">
              {item.variants.map((variant, index) => (
                <label
                  key={variant.label}
                  className="choice-btn flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--r)] border px-3 py-2.5 text-md font-semibold"
                  style={chosen === index ? {
                    borderColor: "var(--accent)",
                    "--choice-bg": "var(--accent-soft)",
                    color: "var(--accent-deep)",
                  } as React.CSSProperties : { color: "var(--ink)" }}
                >
                  <input
                    type="radio"
                    name={`${item.id}-variant`}
                    checked={chosen === index}
                    onChange={() => onWrite(text, index)}
                    className="size-4 shrink-0 accent-[var(--accent)]"
                  />
                  {variant.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-md leading-relaxed" style={{ color: "var(--ink)" }}>{brief.prompt}</p>
      {brief.exhibit?.layout === "card" && <BusinessCard card={brief.exhibit} />}
      {brief.exhibit?.layout === "table" && <FigureTable table={brief.exhibit} />}

      <p className="label-xs mt-4" style={{ color: "var(--ink-3)" }}>Cover every point</p>
      <ul className="mt-1.5 grid gap-1 text-md" style={{ color: "var(--ink-2)" }}>
        {brief.cover.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <Check size={15} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--accent-deep)" }} />
            {point}
          </li>
        ))}
      </ul>
      <RequiredWords words={brief.mustUse} text={text} />

      <textarea
        value={text}
        onChange={(event) => onWrite(event.target.value, chosen)}
        rows={item.kind === "compose" || item.minWords >= 100 ? 10 : 6}
        aria-label={`${brief.label}: ${brief.prompt}`}
        placeholder="Write in Estonian."
        className="field-lg mt-3 w-full text-md leading-relaxed"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
        lang="et"
      />
      <div className="under-field">
        <DiacriticBar />
      </div>
      <LengthMeter text={text} minWords={item.minWords} maxWords={item.maxWords} />
      <Explain label="How this is marked">
        Six marks in ten are for the length, and four for using the words listed. Read it back and
        check you&apos;ve covered every point yourself: we&apos;d have to judge your Estonian to
        check it for you, and nothing here does that. On the real paper an examiner marks how well
        you wrote, which these marks can&apos;t see.
      </Explain>
    </div>
  );
}

/** What the card in front of a speaking task says, by shape. */
function SpeakCardView({ name, card, topic, onTopic, swapped, onSwap }: {
  /** Unique to the item, for the presentation's radio group. */
  name: string;
  card: SpeakCard;
  /** The presentation topic chosen, of the two. */
  topic: number;
  onTopic: (index: number) => void;
  swapped: boolean;
  onSwap: () => void;
}) {
  const box = "mt-3 rounded-[var(--r-lg)] border px-4 py-3";
  const boxStyle = { borderColor: "var(--edge)", background: "var(--raised)" };
  const heading = (text: string) => <p className="label-xs mb-1.5" style={{ color: "var(--ink-3)" }}>{text}</p>;
  const list = (items: readonly string[], numbered = false) => {
    const List = numbered ? "ol" : "ul";
    return (
      <List className={`${numbered ? "list-decimal" : "list-disc"} grid gap-1 pl-5 text-md`} style={{ color: "var(--ink)" }}>
        {items.map((line) => <li key={line}>{line}</li>)}
      </List>
    );
  };

  switch (card.shape) {
    case "picture":
      return (
        <div className={box} style={boxStyle}>
          {heading(card.situation)}
          <p className="flex flex-wrap gap-4 text-5xl leading-none" role="img" aria-label={card.situation}>
            {card.emoji.map((e) => <span key={e} aria-hidden>{e}</span>)}
          </p>
        </div>
      );
    case "idea-card":
      return (
        <div className={box} style={boxStyle}>
          {heading(`Idea card: ${card.about}`)}
          <p className="mb-1.5 text-sm" style={{ color: "var(--ink-2)" }}>Ask about</p>
          {list(card.ask)}
        </div>
      );
    case "agree":
      return (
        <>
          <div className={box} style={boxStyle}>
            {heading("The examiner asks")}
            {list(card.questions, true)}
          </div>
          <div className={box} style={boxStyle}>
            {heading("Then decide together")}
            <p className="text-md" style={{ color: "var(--ink)" }}>{card.situation}</p>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>The choices: {card.alternatives.join(", ")}.</p>
          </div>
        </>
      );
    case "phone":
      return (
        <div className="grid gap-3 @container">
          <div className={box} style={boxStyle}>
            {heading(`Your call: you ring ${card.call}`)}
            <p className="mb-1.5 text-sm" style={{ color: "var(--ink-2)" }}>Find out</p>
            {list(card.find)}
          </div>
          <div className={box} style={boxStyle}>
            {heading(`Their call: you're ${card.answerAs}`)}
            <p className="mb-1.5 text-sm" style={{ color: "var(--ink-2)" }}>Answer with these facts</p>
            {list(card.facts)}
          </div>
        </div>
      );
    case "talk": {
      const showing = swapped && card.swap ? card.swap : card;
      return (
        <div className={box} style={boxStyle}>
          {heading("Your topic card")}
          <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>{showing.task}</p>
          {card.swap && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
              {swapped
                ? "You've swapped your card. The real paper lets you do that once."
                : "The real paper lets you swap your card once, if the topic doesn't suit you."}{" "}
              {!swapped && (
                <button type="button" onClick={onSwap} className="tap-tint font-semibold underline" style={{ color: "var(--accent-deep)" }}>
                  Swap it
                </button>
              )}
            </p>
          )}
        </div>
      );
    }
    case "debate":
      return (
        <>
          <div className={box} style={boxStyle}>
            {heading("The examiner asks")}
            {list(card.questions, true)}
          </div>
          <div className={box} style={boxStyle}>
            {heading("Then debate this")}
            <p className="text-md" style={{ color: "var(--ink)" }}>{card.situation}</p>
            <div className="@container mt-3">
              <div className="grid gap-3 @md:grid-cols-2">
                {card.sides.map((side) => (
                  <div key={side.label} className="rounded-[var(--r)] border px-3 py-2.5" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
                    <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>{side.label}</p>
                    {list(side.points)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      );
    case "presentation":
      return (
        <div className={box} style={boxStyle}>
          {heading("Choose one topic")}
          <div className="grid gap-2" role="radiogroup" aria-label="Your topic">
            {card.topics.map((option, index) => (
              <label
                key={option}
                className="choice-btn flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[var(--r)] border px-3 py-2.5 text-md"
                style={topic === index ? {
                  borderColor: "var(--accent)",
                  "--choice-bg": "var(--accent-soft)",
                  color: "var(--accent-deep)",
                } as React.CSSProperties : { color: "var(--ink)" }}
              >
                <input type="radio" name={name} checked={topic === index} onChange={() => onTopic(index)} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
                <span className="min-w-0">{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    case "discussion":
      return (
        <div className={box} style={boxStyle}>
          {heading("The question")}
          <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>{card.question}</p>
          <p className="mb-1.5 mt-3 text-sm" style={{ color: "var(--ink-2)" }}>Thoughts on the card</p>
          {list(card.thoughts)}
        </div>
      );
  }
}

/** The questions an examiner asks once a candidate has spoken, by shape. */
function followUpsOf(card: SpeakCard, swapped: boolean): string[] {
  switch (card.shape) {
    case "picture": return card.questions;
    case "talk": return [swapped && card.swap ? card.swap.followUp : card.followUp];
    case "presentation": return card.followUps;
    default: return [];
  }
}

function formatSeconds(seconds: number): string {
  if (seconds === 60) return "a minute";
  if (seconds === 90) return "a minute and a half";
  return seconds > 60 && seconds % 60 === 0 ? `${seconds / 60} minutes` : `${seconds} seconds`;
}

/** Record, listen back, mark yourself. Nothing here scores a recording. */
function SpeakQuestion({ item, marks, response, onMark }: {
  item: Extract<ExamItem, { kind: "speak" }>;
  marks: number;
  response: Extract<Response, { kind: "spoken" }> | null;
  onMark: (next: Response) => void;
}) {
  // One criterion per mark, so ticking six of eight really is six marks of eight.
  const criteria = speakingCriteria(item.shape, marks);
  const ticked = response?.criteria ?? criteria.map(() => false);
  const recorded = response?.recorded ?? false;
  const [topic, setTopic] = useState(0);
  const [swapped, setSwapped] = useState(false);
  const [notes, setNotes] = useState("");
  /** Epoch ms the preparation ends, once it has been started. */
  const [prepEnds, setPrepEnds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const preparing = prepEnds !== null && now < prepEnds;
  const followUps = followUpsOf(item.card, swapped);

  useEffect(() => {
    if (prepEnds === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [prepEnds]);

  const update = (next: Partial<{ recorded: boolean; criteria: boolean[] }>) => {
    onMark({
      kind: "spoken",
      recorded: next.recorded ?? recorded,
      criteria: next.criteria ?? ticked,
    });
  };

  return (
    <div>
      <p className="text-md leading-relaxed" style={{ color: "var(--ink)" }}>{item.prompt}</p>
      <SpeakCardView name={`${item.id}-topic`} card={item.card} topic={topic} onTopic={setTopic} swapped={swapped} onSwap={() => setSwapped(true)} />

      {item.ideas.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-sm" style={{ color: "var(--ink-2)" }}>Words you might use</p>
          <p className="flex flex-wrap items-center gap-2">
            {item.ideas.map((idea) => (
              <Chip key={idea.lexemeId} caseSensitive>
                <span lang="et">{idea.lemma}</span>
                <span>{idea.translation}</span>
              </Chip>
            ))}
          </p>
        </div>
      )}

      {/*
        The preparation the B2 and C1 papers give, with notes allowed, as they
        are on the day. The notes stay on this screen and go nowhere: nothing
        stores them and nothing reads them.
      */}
      {item.prepSeconds > 0 && (
        <div className="mt-4 rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>
              {prepEnds === null
                ? `${formatSeconds(item.prepSeconds)} to prepare`
                : preparing
                  ? <span role="timer" className="tnum">{formatRemaining(Math.max(0, Math.round((prepEnds - now) / 1000)))} to prepare</span>
                  : "Time to speak"}
            </p>
            {prepEnds === null && (
              <Button variant="secondary" size="sm" onClick={() => { setNow(Date.now()); setPrepEnds(Date.now() + item.prepSeconds * 1000); }}>
                <Clock size={14} aria-hidden /> Start preparing
              </Button>
            )}
          </div>
          <label className="mt-3 block">
            <span className="text-sm" style={{ color: "var(--ink-2)" }}>
              Notes, if you want them. You may use notes on the real day too. These aren&apos;t kept.
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="field mt-1.5 w-full text-md"
              style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
              lang="et"
            />
          </label>
          <p className="sr-only" aria-live="polite">{prepEnds !== null && !preparing ? "Preparation time is over. Time to speak." : ""}</p>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-sm" style={{ color: "var(--ink-2)" }}>
          Speak for about {formatSeconds(item.seconds)}.
        </p>
        <Recorder targetSeconds={item.seconds} onRecorded={() => update({ recorded: true })} />
      </div>

      {recorded && followUps.length > 0 && (
        <div className="mt-4 rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--edge)", background: "var(--raised)" }}>
          <p className="label-xs mb-1.5" style={{ color: "var(--ink-3)" }}>
            Then the examiner asks
          </p>
          <ol className="grid list-decimal gap-1 pl-5 text-md" style={{ color: "var(--ink)" }}>
            {followUps.map((q) => <li key={q}>{q}</li>)}
          </ol>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>Answer out loud. You can record your answer too.</p>
          <div className="mt-3">
            <Recorder targetSeconds={30} />
          </div>
        </div>
      )}

      <fieldset className="mt-5">
        <legend className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
          Listen back and tick what you managed. Each one is a mark.
        </legend>
        <div className="grid gap-1.5">
          {criteria.map((criterion, index) => (
            <label
              key={criterion}
              className="choice-btn flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--r)] px-3 py-2 text-md"
              /* Chosen is accent here as it is on every other option in this
                 paper: a tick is a selection, and sky is what a marked answer
                 wears, which nothing on the spoken part can be (ADR-018). */
              style={ticked[index]
                ? { "--choice-bg": "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent-deep)" } as React.CSSProperties
                : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
            >
              <input
                type="checkbox"
                checked={Boolean(ticked[index])}
                disabled={!recorded}
                onChange={(event) => {
                  const next = [...ticked];
                  next[index] = event.target.checked;
                  update({ criteria: next });
                }}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
              <span>{criterion}</span>
            </label>
          ))}
        </div>
        {!recorded && (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            Record something first, then tick what you managed. There&apos;s nothing to judge
            until you&apos;ve spoken.
          </p>
        )}
      </fieldset>
    </div>
  );
}
