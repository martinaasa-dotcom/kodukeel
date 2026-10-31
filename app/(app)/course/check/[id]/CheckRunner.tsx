"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { submitCheck } from "@/app/actions";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { ButtonLink } from "@/components/Button";
import { Card, Note } from "@/components/ui";
import { NextPart } from "@/components/course/NextPart";
import { Confetti } from "@/components/Confetti";
import { Mascot } from "@/components/brand";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";
import type { PracticeItem } from "@/lib/course/lessons/practice";
import { Quiz } from "../../lessons/[id]/Quiz";

/**
 * A CHECK, ONE QUESTION AT A TIME, MARKED BY THE SERVER AT THE END.
 *
 * The questions are the lesson's own (`Quiz`), so a check looks and works
 * like the practice step it follows from. What differs is the end: the
 * answers go to `submitCheck`, which rebuilds the paper and marks it, and the
 * screen says whether it passed, how close it was, and what to do next.
 */
/** A finished level, said back on the screen that finishes it. */
export interface LevelDone {
  readonly level: string;
  readonly arrival: string;
  readonly parts: readonly string[];
  readonly lessons: number;
  readonly next: { readonly level: string; readonly title: string; readonly summary: string; readonly lessons: boolean } | null;
}

export function CheckRunner({ checkId, attempt, items, needed, alreadyPassed, next, pastNext = false, level = null }: {
  checkId: string;
  attempt: number;
  items: readonly PracticeItem[];
  needed: number;
  alreadyPassed: boolean;
  next: { id: string; label: string } | null;
  /** The learner already stands on `next` or past it, so a pass offers the way back rather than a start that would move them back. */
  pastNext?: boolean;
  /** Set on the last check of a level: what the level was and what comes next. */
  level?: LevelDone | null;
}) {
  const t = useT();
  const locale = useLocale();
  const responses = useRef<(string | null)[]>(items.map(() => null));
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; marks: readonly string[] } | null>(null);
  const [failed, setFailed] = useState(false);
  /* The server's own refusal where it gave one (too many papers in an hour, a paper a deploy rebuilt); a press that never arrived reads as the connection. */
  const [failure, setFailure] = useState<string>(NOT_REACHED);
  const [pending, start] = useTransition();
  /*
    THE QUIZ GOES WHEN ITS DONE IS PRESSED, so the caret goes to what came in
    its place: the marking line, then the result or the way to send it again.
    The caret moving there is what reads them. The one region on the screen
    from the start carries only the failure, whose way out is a button that
    would not say what went wrong, and it is mounted empty because a region
    that arrives holding its words is often not read.
  */
  const markingRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pending) markingRef.current?.focus();
    // A level finished says so first, in its heading; anything else, in the result line.
    else if (result) (document.getElementById("level-done") ?? resultRef.current)?.focus();
    else if (failed) retryRef.current?.focus();
  }, [pending, result, failed]);

  const finish = () => {
    setFailed(false);
    start(async () => {
      const res = await submitCheck(checkId, attempt, responses.current).catch(() => null);
      if (!res || !res.ok) { setFailure(res && !res.ok ? res.error : NOT_REACHED); setFailed(true); return; }
      setResult({ score: res.score, total: res.total, passed: res.passed, marks: res.marks });
    });
  };

  if (items.length === 0) {
    return <Note tone="again">{t("This check has no questions to ask yet.")}</Note>;
  }

  return (
    <div className="flex flex-col gap-4" data-course-check={checkId}>
      {alreadyPassed && !result && (
        <Note tone="sky">{t("You've passed this one already. Taking it again is good practice and changes nothing.")}</Note>
      )}
      <Quiz
        items={items}
        summary={false}
        onAnswer={(at, response) => { responses.current[at] = response; }}
        onFinished={finish}
      />
      {/* Only the failure is announced: the marking and the result take the caret, which reads them, and a region saying the same thing reads them twice. */}
      <p role="status" className="sr-only">{failed ? t(failure) : ""}</p>
      {pending && <p ref={markingRef} tabIndex={-1} className="text-base outline-none" style={{ color: "var(--ink-2)" }}>{t("Marking it…")}</p>}
      {failed && (
        <div className="flex flex-col items-start gap-2">
          <Note tone="again">{t(failure)}</Note>
          <button ref={retryRef} type="button" className="tap-tint underline" onClick={finish}>{t("Try sending it again")}</button>
        </div>
      )}
      {result?.passed && level && <LevelFinished level={level} score={`${formatScore(result.score)} / ${result.total}`} />}
      {result && !(result.passed && level) && result.passed && <Confetti count={50} />}
      {result && (
        <Card tone={result.passed ? "sky" : "butter"} data-check-result={result.passed ? "passed" : "not-yet"}>
          <p ref={resultRef} tabIndex={-1} className="flex items-center gap-2 text-lg font-semibold outline-none" style={{ color: "var(--ink)" }}>
            {result.passed && <Check size={18} aria-hidden />}
            {result.passed
              ? fill(t("Passed: {score} of {total}."), { score: formatScore(result.score), total: result.total })
              : fill(t("{score} of {total}. You need {needed} to pass."), { score: formatScore(result.score), total: result.total, needed })}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {result.passed
              ? next ? fill(t("{next} is open."), { next: next.label }) : t("That's every part done.")
              : t("Go over the words that slipped, then try again. The next go asks a different mix.")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.passed ? (
              next && pastNext ? <ButtonLink href="/course/lessons" variant="primary">{t("Back to the lessons")}</ButtonLink>
              : next ? <NextPart programmeId={next.id} to="/course" label={level?.next ? fill(t("Start {level}"), { level: level.next.level }) : fill(t("Start {part}"), { part: next.label })} /> : null
            ) : (
              <>
                <ButtonLink href="/review">{t("Review your words")}</ButtonLink>
                <ButtonLink href={`/course/check/${checkId}?try=${attempt + 1}`} variant="primary">
                  <RotateCcw size={15} aria-hidden /> {t("Try again")}
                </ButtonLink>
              </>
            )}
          </div>
        </Card>
      )}
      {/*
        WHAT SLIPPED, TO GO OVER BEFORE THE NEXT GO: each question that was not
        right, with its answer, the way the quest's finish lists its answers.
      */}
      {result && result.marks.some((m) => m !== "right") && (
        <section aria-labelledby="check-slipped">
          <h2 id="check-slipped" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t("What to go over")}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {items.map((item, i) => result.marks[i] === "right" ? null : (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 rounded-[var(--r)] border px-4 py-2.5" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
                {item.kind === "match" ? null : item.kind === "fix" ? (
                  /* The line as it was shown, the line put right and why: the reason is what the next go is about. */
                  <>
                    {/* Struck through for the eye and said in words for a screen reader, which reads no strikethrough. */}
                    <span style={{ color: "var(--ink-3)" }}><span className="sr-only">{t("With the slip:")} </span><s lang="et">{item.shown}</s></span>
                    <span className="sr-only">{t("Put right:")}</span>
                    <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{item.answer}</span>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></span>
                    <span className="basis-full text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={item.why} locale={locale} /></span>
                  </>
                ) : item.kind === "rework" ? (
                  /* The sentence it started from, what to do to it, and what it became. */
                  <>
                    <span lang="et" style={{ color: "var(--ink)" }}>{item.from.et}</span>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.ask} locale={locale} /></span>
                    <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{item.answer}</span>
                  </>
                ) : item.kind === "type" ? (
                  <>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></span>
                    <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>{item.answer}</span>
                  </>
                ) : item.kind === "gap" ? (
                  <>
                    <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>
                      {item.before}<span style={{ color: "var(--accent-deep)" }}>{item.answer}</span>{item.after}
                    </span>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></span>
                  </>
                ) : item.kind === "reply" ? (
                  <>
                    <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{item.ask.et}</span>
                    <span lang="et" style={{ color: "var(--accent-deep)" }}>{item.answer}</span>
                  </>
                ) : (
                  <>
                    <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{item.et}</span>
                    <span style={{ color: "var(--ink-2)" }}><LessonText text={item.answer} locale={locale} /></span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A score with a half in it (a nearly) says so; a whole one does not print ".0". */
function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/**
 * THE END OF A LEVEL, SAID BACK: the mascot and the confetti a lesson gets,
 * more of both, the parts of the level ticked off by name, what somebody can
 * now do in one sentence (`LEVEL_INFO.arrival`), and what the next level is.
 *
 * WHERE THE NEXT LEVEL IS BUILT DIFFERENTLY, IT SAYS SO. A1, A2 and B1 are
 * lessons; from B2 an evening is a topic's words, a short page on one point
 * of grammar, a round or two and a review. A learner who walked the lessons
 * and arrived on a checklist with no word about why would read it as
 * something broken, so the change is named here, once, before it happens
 * (`level.next`, which says how the next level is built).
 */
function LevelFinished({ level, score }: { level: LevelDone; score: string }) {
  const t = useT();
  return (
    <section aria-labelledby="level-done" className="flex flex-col gap-4" data-level-done={level.level}>
      <Confetti count={120} />
      <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
        <Mascot size={76} mood="cheer" className="float mx-auto" />
        <h2 id="level-done" tabIndex={-1} className="font-display outline-none mt-5 text-3xl font-bold leading-tight tracking-tight md:text-4xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
          {fill(t("{level} is done"), { level: level.level })}
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-lg" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>{level.arrival}</p>
        <p className="mt-3 text-base font-semibold" style={{ color: "var(--ink-2)" }}>
          {fill(t("{lessons} lessons, {parts} parts, and the check passed at {score}."), { lessons: level.lessons, parts: level.parts.length, score })}
        </p>
      </div>
      <Card>
        <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>{fill(t("What {level} covered"), { level: level.level })}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {level.parts.map((part) => (
            <li key={part} className="flex items-center gap-2 text-base" style={{ color: "var(--ink)" }}>
              <Check size={16} aria-hidden style={{ color: "var(--accent-deep)" }} /> {part}
            </li>
          ))}
        </ul>
      </Card>
      {level.next && (
        <Card tone="accent" data-level-next={level.next.level}>
          <p className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>
            {fill(t("Next: {level}, {title}"), { level: level.next.level, title: level.next.title })}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{level.next.summary}</p>
          {!level.next.lessons && (
            <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
              {t("From here an evening is built a little differently: the words of one topic, a short page on one point of grammar, a round or two that use them, and a review. The conversations carry on, and everything the lessons taught comes with you.")}
            </p>
          )}
        </Card>
      )}
    </section>
  );
}
